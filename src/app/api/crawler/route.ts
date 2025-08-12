import { NextRequest, NextResponse } from 'next/server';
import BlogCrawler from '@/lib/blog-crawler';
import { ApiResponse, CrawlerStats } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { maxPages = 5, blogId = 'ranto28', delayRange = [1, 2] } = body;

    console.log(`크롤링 시작 - blogId: ${blogId}, maxPages: ${maxPages}`);

    const crawler = new BlogCrawler({
      blogId,
      maxPages,
      delayRange: delayRange as [number, number]
    });

    const stats = await crawler.crawlRecentPosts();

    const response: ApiResponse<CrawlerStats> = {
      success: true,
      data: stats,
      message: `크롤링 완료 - 새 포스트: ${stats.newPosts}개, 업데이트: ${stats.updatedPosts}개`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('크롤링 API 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CRAWLER_ERROR',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
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

    if (!logNo) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'logNo 매개변수가 필요합니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const crawler = new BlogCrawler();
    const postData = await crawler.crawlSinglePost(logNo);

    if (!postData) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: '포스트를 찾을 수 없습니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      data: postData,
      message: '포스트 크롤링 성공'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('단일 포스트 크롤링 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'SINGLE_CRAWLER_ERROR',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status: 500 });
  }
}