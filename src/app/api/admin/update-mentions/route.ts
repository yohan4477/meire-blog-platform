import { NextRequest, NextResponse } from 'next/server';
import StockMentionExtractor from '@/lib/stock-mention-extractor';
import CompanyDescriptionGenerator from '@/lib/company-description-generator';

/**
 * 관리자용 종목 언급 및 설명 자동 업데이트 API
 * POST /api/admin/update-mentions
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'recent'; // 'recent', 'all', 'single'
    const ticker = searchParams.get('ticker');
    const postId = searchParams.get('postId');

    console.log(`🚀 자동 업데이트 시작 - 모드: ${mode}`);

    const extractor = new StockMentionExtractor();
    const descriptionGenerator = new CompanyDescriptionGenerator();

    let result: any = {
      success: true,
      mode: mode,
      processedPosts: 0,
      foundMentions: 0,
      updatedDescriptions: 0,
      errors: []
    };

    switch (mode) {
      case 'single':
        if (postId) {
          // 특정 포스트만 처리
          result = await processSinglePost(extractor, postId);
        } else if (ticker) {
          // 특정 종목 설명만 업데이트
          result = await updateSingleStockDescription(descriptionGenerator, ticker);
        } else {
          throw new Error('single 모드에서는 postId 또는 ticker가 필요합니다');
        }
        break;

      case 'recent':
        // 최근 10개 포스트 처리
        result = await processRecentPosts(extractor, descriptionGenerator);
        break;

      case 'all':
        // 모든 미처리 포스트 처리
        result = await processAllPosts(extractor, descriptionGenerator);
        break;

      default:
        throw new Error(`알 수 없는 모드: ${mode}`);
    }

    console.log(`✅ 자동 업데이트 완료:`, result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ 자동 업데이트 실패:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

/**
 * 특정 포스트 처리
 */
async function processSinglePost(extractor: StockMentionExtractor, postId: string) {
  const { query } = await import('@/lib/database');
  
  const posts = await query(
    'SELECT id, title, content, created_date FROM blog_posts WHERE id = ?',
    [parseInt(postId)]
  );

  if (posts.length === 0) {
    throw new Error(`포스트 ID ${postId}를 찾을 수 없습니다`);
  }

  const post = posts[0];
  const mentionCount = await extractor.processPost(
    post.id,
    post.title,
    post.content,
    post.created_date
  );

  return {
    success: true,
    mode: 'single',
    processedPosts: 1,
    foundMentions: mentionCount,
    postId: post.id,
    postTitle: post.title
  };
}

/**
 * 특정 종목 설명 업데이트
 */
async function updateSingleStockDescription(generator: CompanyDescriptionGenerator, ticker: string) {
  const description = await generator.updateSingleStock(ticker);
  
  return {
    success: true,
    mode: 'single',
    ticker: ticker,
    updatedDescriptions: description ? 1 : 0,
    description: description?.description
  };
}

/**
 * 최근 포스트 처리
 */
async function processRecentPosts(extractor: StockMentionExtractor, generator: CompanyDescriptionGenerator) {
  const { query } = await import('@/lib/database');

  // 최근 10개 포스트 중 미처리된 것들
  const recentPosts = await query(`
    SELECT bp.id, bp.title, bp.content, bp.created_date
    FROM blog_posts bp
    LEFT JOIN merry_mentioned_stocks mms ON bp.id = mms.post_id
    WHERE mms.post_id IS NULL
    ORDER BY bp.created_date DESC
    LIMIT 10
  `);

  let totalMentions = 0;
  const processedPosts = [];

  for (const post of recentPosts) {
    try {
      const mentionCount = await extractor.processPost(
        post.id,
        post.title,
        post.content,
        post.created_date
      );
      
      totalMentions += mentionCount;
      processedPosts.push({
        id: post.id,
        title: post.title,
        mentions: mentionCount
      });

      // 처리 간격
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`포스트 ${post.id} 처리 실패:`, error);
    }
  }

  // 영향받은 종목들의 설명 업데이트
  const affectedStocks = await query(`
    SELECT DISTINCT ticker 
    FROM merry_mentioned_stocks 
    WHERE post_id IN (${recentPosts.map(p => p.id).join(',')})
  `);

  let updatedDescriptions = 0;
  for (const stock of affectedStocks) {
    try {
      await generator.updateSingleStock(stock.ticker);
      updatedDescriptions++;
    } catch (error) {
      console.error(`${stock.ticker} 설명 업데이트 실패:`, error);
    }
  }

  return {
    success: true,
    mode: 'recent',
    processedPosts: processedPosts.length,
    foundMentions: totalMentions,
    updatedDescriptions: updatedDescriptions,
    details: processedPosts
  };
}

/**
 * 모든 미처리 포스트 처리
 */
async function processAllPosts(extractor: StockMentionExtractor, generator: CompanyDescriptionGenerator) {
  // 모든 미처리 포스트 처리
  await extractor.processAllUnprocessedPosts();
  
  // 모든 종목 설명 업데이트
  await generator.updateAllDescriptions();

  const { query } = await import('@/lib/database');

  // 통계 조회
  const stats = await query(`
    SELECT 
      COUNT(DISTINCT post_id) as processed_posts,
      COUNT(*) as total_mentions,
      COUNT(DISTINCT ticker) as unique_stocks
    FROM merry_mentioned_stocks
  `);

  return {
    success: true,
    mode: 'all',
    processedPosts: stats[0]?.processed_posts || 0,
    foundMentions: stats[0]?.total_mentions || 0,
    updatedDescriptions: stats[0]?.unique_stocks || 0
  };
}

/**
 * GET 요청 - 현재 상태 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { query } = await import('@/lib/database');

    // 현재 통계 조회
    const stats = await query(`
      SELECT 
        COUNT(DISTINCT mms.post_id) as processed_posts,
        COUNT(*) as total_mentions,
        COUNT(DISTINCT mms.ticker) as mentioned_stocks,
        COUNT(DISTINCT bp.id) as total_posts
      FROM blog_posts bp
      LEFT JOIN merry_mentioned_stocks mms ON bp.id = mms.post_id
    `);

    // 최근 처리된 포스트들
    const recentProcessed = await query(`
      SELECT 
        bp.id,
        bp.title,
        bp.created_date,
        COUNT(mms.id) as mention_count
      FROM blog_posts bp
      JOIN merry_mentioned_stocks mms ON bp.id = mms.post_id
      GROUP BY bp.id, bp.title, bp.created_date
      ORDER BY bp.created_date DESC
      LIMIT 5
    `);

    // 미처리 포스트 수
    const unprocessedCount = await query(`
      SELECT COUNT(*) as count
      FROM blog_posts bp
      LEFT JOIN merry_mentioned_stocks mms ON bp.id = mms.post_id
      WHERE mms.post_id IS NULL
    `);

    return NextResponse.json({
      success: true,
      stats: stats[0],
      unprocessedPosts: unprocessedCount[0]?.count || 0,
      recentProcessed: recentProcessed,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('상태 조회 실패:', error);
    return NextResponse.json({
      success: false,
      error: '상태 조회 실패'
    }, { status: 500 });
  }
}