import { NextRequest, NextResponse } from 'next/server';
import BlogCrawler from '@/lib/blog-crawler';
import { ApiResponse, CrawlerStats } from '@/types';

/**
 * 메르 블로그 크롤링 API
 * POST /api/merry/crawler - 전체 크롤링 실행
 * GET /api/merry/crawler?logNo=123 - 단일 포스트 크롤링
 */

export async function POST(request: NextRequest) {
  try {
    const { maxPages = 10, delayRange = [1, 2] } = await request.json();

    console.log(`메르 블로그 크롤링 시작 - maxPages: ${maxPages}`);

    const crawler = new BlogCrawler({
      blogId: 'ranto28',
      maxPages,
      delayRange: delayRange as [number, number],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const stats = await crawler.crawlRecentPosts();

    const response: ApiResponse<CrawlerStats> = {
      success: true,
      data: stats,
      message: `메르 블로그 크롤링 완료 - 새 포스트: ${stats.newPosts}개, 업데이트: ${stats.updatedPosts}개`,
      meta: {
        totalCount: stats.totalFound,
        processingTime: Date.now(),
        requestId: crypto.randomUUID()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('메르 블로그 크롤링 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MERRY_CRAWLER_ERROR',
        message: error instanceof Error ? error.message : '메르 블로그 크롤링 중 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logNo = searchParams.get('logNo');
    const action = searchParams.get('action') || 'single';

    if (action === 'single') {
      if (!logNo) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'MISSING_LOG_NO',
            message: 'logNo 매개변수가 필요합니다',
            timestamp: new Date().toISOString()
          }
        }, { status: 400 });
      }

      const crawler = new BlogCrawler({
        blogId: 'ranto28'
      });
      
      const postData = await crawler.crawlSinglePost(logNo);

      if (!postData) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: `logNo ${logNo}에 해당하는 포스트를 찾을 수 없습니다`,
            timestamp: new Date().toISOString()
          }
        }, { status: 404 });
      }

      const response: ApiResponse = {
        success: true,
        data: postData,
        message: '메르 블로그 포스트 크롤링 성공'
      };

      return NextResponse.json(response);
    }

    // 크롤러 상태 조회
    if (action === 'status') {
      const crawler = new BlogCrawler();
      const stats = crawler.getStats();

      return NextResponse.json({
        success: true,
        data: {
          stats,
          blogId: 'ranto28',
          lastCrawl: new Date().toISOString()
        },
        message: '크롤러 상태 조회 성공'
      });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_ACTION',
        message: '지원하지 않는 작업입니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 400 });

  } catch (error) {
    console.error('메르 블로그 크롤링 GET 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MERRY_CRAWLER_GET_ERROR',
        message: error instanceof Error ? error.message : '메르 블로그 크롤링 조회 중 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status: 500 });
  }
}