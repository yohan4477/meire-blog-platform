import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.db');

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const slug = searchParams.get('slug');
    const dateFilter = searchParams.get('date'); // 'week', 'month', 'quarter', 'year'
    const stockFilter = searchParams.get('stocks'); // '1' for stock-related posts
    const macroFilter = searchParams.get('macro'); // '1' for macro-related posts
    const tickerFilter = searchParams.get('ticker'); // specific ticker for filtering

    console.log('🚀 Loading Merry posts from database...');

    const db = new Database(dbPath);
    
    return new Promise((resolve) => {
      let query = `
        SELECT 
          bp.id, 
          bp.log_no,
          bp.title, 
          bp.content, 
          bp.excerpt, 
          bp.category, 
          bp.author,
          bp.created_date as createdAt,
          bp.views,
          bp.likes,
          bp.comments_count as comments,
          bp.featured,
          bp.mentioned_stocks,
          bp.investment_theme,
          bp.sentiment_tone,
          pa.summary as claudeSummary
        FROM blog_posts bp
        LEFT JOIN post_analysis pa ON bp.log_no = pa.log_no
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];

      // 카테고리 필터링
      if (category && category !== 'all') {
        conditions.push('category = ?');
        params.push(category);
      }

      // featured 필터링
      if (featured === 'true') {
        conditions.push('featured = 1');
      }

      // 날짜 필터링
      if (dateFilter) {
        const now = new Date();
        let dateCondition = '';
        
        switch (dateFilter) {
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateCondition = `created_date >= '${weekAgo.toISOString().split('T')[0]}'`;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateCondition = `created_date >= '${monthAgo.toISOString().split('T')[0]}'`;
            break;
          case 'quarter':
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            dateCondition = `created_date >= '${quarterAgo.toISOString().split('T')[0]}'`;
            break;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            dateCondition = `created_date >= '${yearAgo.toISOString().split('T')[0]}'`;
            break;
        }
        
        if (dateCondition) {
          conditions.push(dateCondition);
        }
      }

      // 종목 관련 포스트 필터링
      if (stockFilter === '1') {
        conditions.push(`(
          title LIKE '%주식%' OR title LIKE '%종목%' OR title LIKE '%투자%' OR 
          title LIKE '%매수%' OR title LIKE '%매도%' OR title LIKE '%상장%' OR
          title LIKE '%TSLA%' OR title LIKE '%AAPL%' OR title LIKE '%NVDA%' OR
          title LIKE '%테슬라%' OR title LIKE '%애플%' OR title LIKE '%엔비디아%' OR
          title LIKE '%삼성전자%' OR title LIKE '%005930%' OR
          content LIKE '%주식%' OR content LIKE '%종목%' OR content LIKE '%투자%'
        )`);
      }

      // 매크로 경제 관련 포스트 필터링
      if (macroFilter === '1') {
        conditions.push(`(
          title LIKE '%경제%' OR title LIKE '%인플레이션%' OR title LIKE '%금리%' OR
          title LIKE '%연준%' OR title LIKE '%Fed%' OR title LIKE '%GDP%' OR
          title LIKE '%달러%' OR title LIKE '%환율%' OR title LIKE '%무역%' OR
          title LIKE '%정책%' OR title LIKE '%정치%' OR title LIKE '%선거%' OR
          title LIKE '%트럼프%' OR title LIKE '%바이든%' OR 
          content LIKE '%경제%' OR content LIKE '%인플레이션%' OR content LIKE '%금리%'
        )`);
      }

      // 특정 종목 필터링 (merry_mentioned_stocks 테이블 활용)
      if (tickerFilter) {
        conditions.push(`id IN (
          SELECT DISTINCT log_no 
          FROM merry_mentioned_stocks 
          WHERE ticker = ?
        )`);
        params.push(tickerFilter);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_date DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      db.all(query, params, (err, rows: any[]) => {
        if (err) {
          console.error('❌ Database error:', err);
          db.close();
          resolve(NextResponse.json({
            success: false,
            error: {
              code: 'DATABASE_ERROR',
              message: '데이터베이스 오류가 발생했습니다',
              timestamp: new Date().toISOString()
            }
          }, { status: 500 }));
          return;
        }

        // 단일 포스트 요청
        if (slug) {
          const post = rows.find(p => p.title.replace(/\s+/g, '-').toLowerCase() === slug);
          if (!post) {
            db.close();
            resolve(NextResponse.json({
              success: false,
              error: { code: 'POST_NOT_FOUND', message: '포스트를 찾을 수 없습니다' }
            }, { status: 404 }));
            return;
          }
          
          // 단일 포스트에도 새로운 컬럼 적용
          const mentionedStocks = post.mentioned_stocks ? post.mentioned_stocks.split(',') : [];
          const investmentTheme = post.investment_theme || '';
          const sentimentTone = post.sentiment_tone || '';
          
          const dynamicTags = [];
          if (mentionedStocks.length > 0) {
            dynamicTags.push(...mentionedStocks.slice(0, 2));
          }
          if (investmentTheme) {
            dynamicTags.push(investmentTheme);
          }
          if (sentimentTone) {
            const sentimentEmoji = sentimentTone === '긍정적' ? '😊' : 
                                 sentimentTone === '부정적' ? '😰' : 
                                 sentimentTone === '중립적' ? '😐' : '';
            if (sentimentEmoji) dynamicTags.push(`${sentimentEmoji}${sentimentTone}`);
          }
          
          const finalTags = dynamicTags.length > 0 ? dynamicTags : ['투자', '분석'];

          db.close();
          resolve(NextResponse.json({
            success: true,
            data: {
              ...post,
              tags: finalTags,
              excerpt: post.excerpt || post.content?.substring(0, 200) + '...',
              mentionedStocks,
              investmentTheme,
              sentimentTone
            }
          }));
          return;
        }

        // 전체 카운트 조회
        let countQuery = 'SELECT COUNT(*) as total FROM blog_posts';
        let countConditions = conditions.filter(condition => 
          !condition.includes('LIMIT') && !condition.includes('OFFSET')
        );

        if (countConditions.length > 0) {
          countQuery += ' WHERE ' + countConditions.join(' AND ');
        }

        db.get(countQuery, [], (countErr, countResult: any) => {
          db.close();
          
          if (countErr) {
            console.error('❌ Count query error:', countErr);
            resolve(NextResponse.json({
              success: false,
              error: {
                code: 'COUNT_ERROR',
                message: '총 개수 조회 실패',
                timestamp: new Date().toISOString()
              }
            }, { status: 500 }));
            return;
          }

          const total = countResult?.total || 0;
          
          // 실제 크롤링 데이터 그대로 사용
          const enrichedPosts = rows.map(post => {
            // 새로운 컬럼 데이터 활용
            const mentionedStocks = post.mentioned_stocks ? post.mentioned_stocks.split(',') : [];
            const investmentTheme = post.investment_theme || '';
            const sentimentTone = post.sentiment_tone || '';
            
            // 동적 태그 생성 (하드코딩 제거)
            const dynamicTags = [];
            if (mentionedStocks.length > 0) {
              dynamicTags.push(...mentionedStocks.slice(0, 2)); // 최대 2개 종목
            }
            if (investmentTheme) {
              dynamicTags.push(investmentTheme);
            }
            if (sentimentTone) {
              const sentimentEmoji = sentimentTone === '긍정적' ? '😊' : 
                                   sentimentTone === '부정적' ? '😰' : 
                                   sentimentTone === '중립적' ? '😐' : '';
              if (sentimentEmoji) dynamicTags.push(`${sentimentEmoji}${sentimentTone}`);
            }
            
            // 태그가 없으면 기본 태그 사용
            const finalTags = dynamicTags.length > 0 ? dynamicTags : ['투자', '분석'];

            return {
              id: post.id,
              title: post.title,
              content: post.content,
              excerpt: post.excerpt || post.content?.substring(0, 200) + '...',
              category: post.category || '일반',
              author: post.author || '메르',
              createdAt: post.createdAt,
              views: post.views || 0,
              likes: post.likes || 0,
              comments: post.comments || 0,
              tags: finalTags,
              featured: post.featured === 1,
              // 새로운 필드들 추가
              mentionedStocks,
              investmentTheme,
              sentimentTone
            };
          });

          console.log(`✅ Loaded ${enrichedPosts.length} posts from database`);

          resolve(NextResponse.json({
            success: true,
            data: enrichedPosts,
            meta: {
              total,
              limit,
              offset,
              hasNext: offset + limit < total,
              hasPrev: offset > 0,
              categories: ['경제/주식/국제정세/사회', '주절주절', '건강/의학/맛집/일상/기타'],
              featuredCount: enrichedPosts.filter(p => p.featured).length
            }
          }));
        });
      });
    });

  } catch (error) {
    console.error('❌ Merry posts API error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'MERRY_POSTS_ERROR',
        message: '메르 포스트를 가져오는데 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}