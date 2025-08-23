import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

interface MerryBlogPost {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  stockTickers: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
  featured: boolean;
  readingTime: number;
  relatedStocks: string[];
  publishedAt: string;
}

let dbCache: sqlite3.Database | null = null;

function getDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (dbCache && dbCache.open) {
      resolve(dbCache);
      return;
    }
    
    const dbPath = path.join(process.cwd(), 'database.db');
    dbCache = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err);
        reject(err);
      } else {
        console.log('✅ Database connected');
        // 성능 최적화 설정
        dbCache!.run('PRAGMA journal_mode = WAL;');
        dbCache!.run('PRAGMA synchronous = NORMAL;');
        dbCache!.run('PRAGMA cache_size = 10000;');
        dbCache!.run('PRAGMA temp_store = MEMORY;');
        resolve(dbCache!);
      }
    });
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    // log_no는 TEXT 타입으로 저장되므로 문자열로 처리
    const postId = id.trim();
    
    if (!postId || !/^\d+$/.test(postId)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_POST_ID', message: '유효하지 않은 포스트 ID입니다' }
      }, { status: 400 });
    }

    const startTime = Date.now();
    console.log(`⚡ Loading post ${postId} from database...`);

    // 데이터베이스에서 포스트 가져오기
    const db = await getDatabase();
    
    // log_no를 사용하여 포스트와 분석 결과를 함께 조회
    const post = await new Promise<any>((resolve, reject) => {
      console.log(`🔍 Querying database for post with log_no: ${postId}`);
      db.get(`
        SELECT 
          bp.*,
          pa.summary,
          pa.explanation,
          pa.investment_insight,
          pa.analyzed_at
        FROM blog_posts bp 
        LEFT JOIN post_analysis pa ON bp.log_no = pa.log_no 
        WHERE bp.log_no = ?
      `, [postId], (err, row) => {
        if (err) {
          console.error(`❌ Database query error:`, err);
          reject(err);
        } else {
          console.log(`✅ Query result:`, row ? 'Found' : 'Not found');
          resolve(row);
        }
      });
    });
    
    if (!post) {
      return NextResponse.json({
        success: false,
        error: { code: 'POST_NOT_FOUND', message: '포스트를 찾을 수 없습니다' }
      }, { status: 404 });
    }

    // 포스트 데이터 변환 (mentioned_stocks는 쉼표로 구분된 문자열)
    const mentionedStocks = post.mentioned_stocks ? 
      (typeof post.mentioned_stocks === 'string' ? 
        post.mentioned_stocks.split(',').map(s => s.trim()).filter(s => s) : 
        post.mentioned_stocks) : [];
    
    const formattedPost: MerryBlogPost = {
      id: post.log_no,  // log_no를 id로 사용
      slug: post.slug || `${post.title.toLowerCase().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '-')}-${post.log_no}`,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || post.content.substring(0, 200) + '...',
      category: post.category || '일반',
      author: post.author || '메르',
      createdAt: new Date(post.created_date).toISOString(),  // Unix timestamp 변환
      views: post.views || 0,
      likes: post.likes || 0,
      comments: post.comments_count || 0,
      tags: [],
      stockTickers: mentionedStocks,
      sentiment: post.sentiment_tone || 'neutral',
      confidence: 0.8,
      keywords: [],
      featured: post.featured || false,
      readingTime: Math.max(1, Math.ceil(post.content.length / 500)),
      relatedStocks: mentionedStocks,
      publishedAt: new Date(post.created_date).toISOString()
    };

    // 병렬로 관련 데이터 가져오기 (성능 최적화)
    const [relatedPosts, prevPost, nextPost] = await Promise.all([
      // 관련 포스트 가져오기 (같은 카테고리 또는 비슷한 종목)
      new Promise<any[]>((resolve, reject) => {
        db.all(`
          SELECT log_no, title, excerpt, category, sentiment_tone, created_date, views 
          FROM blog_posts 
          WHERE log_no != ? AND (category = ? OR mentioned_stocks LIKE ?) 
          ORDER BY created_date DESC 
          LIMIT 3
        `, [postId, formattedPost.category, `%${formattedPost.stockTickers[0] || ''}%`], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      }),
      
      // 이전 포스트 찾기 (log_no 기준)
      new Promise<any>((resolve, reject) => {
        db.get('SELECT log_no, title FROM blog_posts WHERE log_no < ? ORDER BY log_no DESC LIMIT 1', [postId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      
      // 다음 포스트 찾기 (log_no 기준)
      new Promise<any>((resolve, reject) => {
        db.get('SELECT log_no, title FROM blog_posts WHERE log_no > ? ORDER BY log_no ASC LIMIT 1', [postId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    ]);

    // 조회수 증가 (비동기 처리로 응답 속도 영향 최소화)
    setImmediate(() => {
      db.run('UPDATE blog_posts SET views = views + 1 WHERE log_no = ?', [postId]);
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ Post ${postId} loaded in ${responseTime}ms`);

    // Claude 직접 분석 결과 구성
    const analysis = (post.summary || post.explanation || post.investment_insight) ? {
      summary: post.summary || null,
      explanation: post.explanation || null,
      investment_insight: post.investment_insight || null,
      analyzed_at: post.analyzed_at || null
    } : null;

    return NextResponse.json({
      success: true,
      data: {
        log_no: formattedPost.id,  // log_no 명시적 포함
        title: formattedPost.title,
        content: formattedPost.content,
        excerpt: formattedPost.excerpt,
        author: formattedPost.author,
        created_date: post.created_date,  // 원본 timestamp
        views: formattedPost.views,
        likes: formattedPost.likes,
        comments: formattedPost.comments,
        tags: formattedPost.tags,
        mentionedStocks: formattedPost.stockTickers,
        investmentTheme: post.investment_theme,
        sentimentTone: post.sentiment_tone,
        
        // 🆕 Claude 직접 분석 결과
        analysis: analysis,
        
        // 기존 데이터 유지 (호환성)
        post: formattedPost,
        relatedPosts,
        navigation: {
          prev: prevPost ? {
            id: prevPost.log_no,
            title: prevPost.title,
            slug: `post-${prevPost.log_no}`
          } : null,
          next: nextPost ? {
            id: nextPost.log_no,
            title: nextPost.title,
            slug: `post-${nextPost.log_no}`
          } : null
        }
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5분 캐시
      }
    });

  } catch (error) {
    console.error('❌ Individual post API error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'POST_FETCH_ERROR',
        message: '포스트를 가져오는데 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}