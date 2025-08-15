import { NextRequest, NextResponse } from 'next/server';
import BlogCrawler from '@/lib/blog-crawler';
import { getMerryInsightAI } from '@/lib/merry-insight-ai';
import { query } from '@/lib/database';

/**
 * 최신 메르 블로그 글 크롤링 및 메르's Pick 자동 업데이트 API
 * 
 * 기능:
 * 1. 최신 블로그 글 크롤링 (최대 20개)
 * 2. 새로운 글에 대해 논리체인 분석 실행
 * 3. 메르's Pick 자동 업데이트
 * 4. 종목 언급 자동 추출 및 DB 업데이트
 */

interface CrawlResult {
  success: boolean;
  stats: {
    crawledPosts: number;
    newPosts: number;
    updatedPosts: number;
    analyzedChains: number;
    updatedStocks: number;
    errors: number;
  };
  message: string;
  newPosts?: Array<{
    id: number;
    title: string;
    logNo: string;
    created_date: string;
  }>;
}

export async function POST(request: NextRequest): Promise<NextResponse<CrawlResult>> {
  try {
    console.log('🚀 최신 메르 블로그 글 크롤링 시작...');
    
    // 1. 크롤링 실행 - DB에 없는 최신 페이지만 크롤링
    const crawler = new BlogCrawler();
    const crawlStats = await crawler.crawlNewPostsOnly([0.5, 1.0]); // DB에 없는 새로운 포스트만 크롤링
    
    console.log('📊 크롤링 완료:', crawlStats);

    // 2. 새로 추가된 포스트 조회
    const newPosts = await query<{
      id: number;
      title: string;
      log_no: string;
      created_date: string;
    }>(`
      SELECT id, title, log_no, created_date 
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND crawled_at > datetime('now', '-1 hour')
      ORDER BY created_date DESC
      LIMIT 10
    `);

    console.log(`📝 새로운 포스트 ${newPosts.length}개 발견`);

    // 3. 새 포스트에 대해 논리체인 분석 실행
    let analyzedChains = 0;
    const merryAI = getMerryInsightAI();
    
    for (const post of newPosts) {
      try {
        console.log(`🧠 포스트 ${post.id} 논리체인 분석 시작: ${post.title}`);
        
        const chain = await merryAI.extractCausalChain(
          post.id,
          await getPostContent(post.id),
          post.title
        );
        
        if (chain) {
          analyzedChains++;
          console.log(`✅ 논리체인 분석 완료: ${chain.chain_title}`);
        } else {
          console.log(`❌ 논리체인 분석 실패 또는 품질 미달`);
        }
      } catch (error) {
        console.error(`논리체인 분석 오류 (포스트 ${post.id}):`, error);
      }
    }

    // 4. 메르's Pick 자동 업데이트
    const updatedStocks = await updateMerrysPick();
    
    console.log(`📈 메르's Pick 업데이트 완료: ${updatedStocks}개 종목`);

    const result: CrawlResult = {
      success: true,
      stats: {
        crawledPosts: crawlStats.totalFound,
        newPosts: crawlStats.newPosts,
        updatedPosts: crawlStats.updatedPosts,
        analyzedChains,
        updatedStocks,
        errors: crawlStats.errors
      },
      message: `크롤링 완료: 새 포스트 ${crawlStats.newPosts}개, 논리체인 분석 ${analyzedChains}개, 메르's Pick 업데이트 ${updatedStocks}개 종목`,
      newPosts: newPosts.map(p => ({
        id: p.id,
        title: p.title,
        logNo: p.log_no,
        created_date: p.created_date
      }))
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('크롤링 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      stats: {
        crawledPosts: 0,
        newPosts: 0,
        updatedPosts: 0,
        analyzedChains: 0,
        updatedStocks: 0,
        errors: 1
      },
      message: `크롤링 실패: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}

/**
 * 포스트 내용 조회
 */
async function getPostContent(postId: number): Promise<string> {
  try {
    const posts = await query<{ content: string }>(
      'SELECT content FROM blog_posts WHERE id = ?',
      [postId]
    );
    
    return posts.length > 0 ? posts[0].content : '';
  } catch (error) {
    console.error('포스트 내용 조회 오류:', error);
    return '';
  }
}

/**
 * 메르's Pick 자동 업데이트
 * 
 * 로직:
 * 1. 모든 블로그 포스트에서 종목 언급 검색
 * 2. 언급 횟수와 최근 언급일 업데이트
 * 3. merry_mentioned_stocks 테이블 갱신
 */
async function updateMerrysPick(): Promise<number> {
  try {
    console.log('📈 메르\'s Pick 자동 업데이트 시작...');

    // 1. 알려진 종목 목록 가져오기
    const knownStocks = await query<{
      ticker: string;
      company_name: string;
    }>(`
      SELECT DISTINCT ticker, company_name 
      FROM stocks 
      WHERE ticker IS NOT NULL AND company_name IS NOT NULL
    `);

    let updatedCount = 0;

    // 2. 각 종목별로 블로그 포스트에서 언급 검색
    for (const stock of knownStocks) {
      try {
        // 해당 종목이 언급된 포스트 검색
        const mentionedPosts = await query<{
          id: number;
          created_date: string;
        }>(`
          SELECT id, created_date
          FROM blog_posts 
          WHERE blog_type = 'merry' 
            AND (
              title LIKE ? OR title LIKE ? OR 
              content LIKE ? OR content LIKE ?
            )
          ORDER BY created_date DESC
        `, [
          `%${stock.ticker}%`,
          `%${stock.company_name}%`,
          `%${stock.ticker}%`,
          `%${stock.company_name}%`
        ]);

        if (mentionedPosts.length > 0) {
          // 최근 언급일과 언급 횟수 계산
          const lastMentioned = mentionedPosts[0].created_date;
          const mentionCount = mentionedPosts.length;

          // merry_mentioned_stocks 테이블 업데이트 또는 삽입
          const existing = await query(
            'SELECT id FROM merry_mentioned_stocks WHERE ticker = ?',
            [stock.ticker]
          );

          if (existing.length > 0) {
            // 업데이트
            await query(`
              UPDATE merry_mentioned_stocks 
              SET mention_count = ?, last_mentioned_at = ?, updated_at = datetime('now')
              WHERE ticker = ?
            `, [mentionCount, lastMentioned, stock.ticker]);
          } else {
            // 새로 삽입
            await query(`
              INSERT INTO merry_mentioned_stocks (
                ticker, company_name, mention_count, last_mentioned_at, 
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `, [stock.ticker, stock.company_name, mentionCount, lastMentioned]);
          }

          updatedCount++;
          console.log(`✅ ${stock.ticker}(${stock.company_name}): ${mentionCount}회 언급, 최근 ${lastMentioned}`);
        }

      } catch (error) {
        console.error(`종목 ${stock.ticker} 업데이트 오류:`, error);
      }
    }

    console.log(`📊 메르's Pick 업데이트 완료: ${updatedCount}개 종목`);
    return updatedCount;

  } catch (error) {
    console.error('메르\'s Pick 업데이트 오류:', error);
    return 0;
  }
}

// GET 요청: 크롤링 상태 확인
export async function GET(): Promise<NextResponse> {
  try {
    // 최근 크롤링 정보 조회
    const recentPosts = await query<{
      count: number;
      latest_crawl: string;
    }>(`
      SELECT 
        COUNT(*) as count,
        MAX(crawled_at) as latest_crawl
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND crawled_at > datetime('now', '-24 hours')
    `);

    // 메르's Pick 종목 수 조회
    const merryPickCount = await query<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM merry_mentioned_stocks 
      WHERE mention_count > 0
    `);

    return NextResponse.json({
      success: true,
      status: {
        recentPosts: recentPosts[0]?.count || 0,
        latestCrawl: recentPosts[0]?.latest_crawl || null,
        merryPickStocks: merryPickCount[0]?.count || 0
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}