import { NextRequest, NextResponse } from 'next/server';
import { BlogCrawler } from '@/lib/blog-crawler';

/**
 * 연도별 백그라운드 크롤링 API
 * 특정 연도의 블로그 글들을 크롤링
 */

interface CrawlByYearRequest {
  year: number;
  background?: boolean;
}

interface CrawlByYearResult {
  success: boolean;
  year: number;
  stats: any;
  message: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CrawlByYearResult>> {
  try {
    const body: CrawlByYearRequest = await request.json();
    const { year, background = true } = body;

    if (!year || year < 2020 || year > new Date().getFullYear()) {
      return NextResponse.json({
        success: false,
        year: year || 0,
        stats: null,
        message: '유효하지 않은 연도입니다. 2020년부터 현재 연도까지 지원됩니다.',
        startedAt: new Date().toISOString(),
        error: 'Invalid year'
      }, { status: 400 });
    }

    const startedAt = new Date().toISOString();
    console.log(`🚀 ${year}년도 크롤링 시작 (백그라운드: ${background})`);

    if (background) {
      // 백그라운드에서 크롤링 실행
      setImmediate(async () => {
        try {
          const crawler = new BlogCrawler();
          const stats = await crawler.crawlByYear(year, [0.3, 0.8]); // 더 빠른 크롤링
          console.log(`🎉 ${year}년도 백그라운드 크롤링 완료:`, stats);
        } catch (error) {
          console.error(`❌ ${year}년도 백그라운드 크롤링 실패:`, error);
        }
      });

      // 즉시 응답 반환
      return NextResponse.json({
        success: true,
        year,
        stats: { status: 'started' },
        message: `${year}년도 크롤링이 백그라운드에서 시작되었습니다.`,
        startedAt
      });

    } else {
      // 동기적으로 크롤링 실행
      const crawler = new BlogCrawler();
      const stats = await crawler.crawlByYear(year, [0.5, 1.0]);
      const completedAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        year,
        stats,
        message: `${year}년도 크롤링이 완료되었습니다. 새로운 포스트 ${stats.newPosts}개 추가.`,
        startedAt,
        completedAt
      });
    }

  } catch (error) {
    console.error('연도별 크롤링 API 오류:', error);
    return NextResponse.json({
      success: false,
      year: 0,
      stats: null,
      message: '크롤링 처리 중 오류가 발생했습니다.',
      startedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

/**
 * 크롤링 상태 확인 (GET)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (!year) {
      return NextResponse.json({
        success: false,
        message: 'year 파라미터가 필요합니다.'
      }, { status: 400 });
    }

    // 해당 연도의 포스트 개수 확인
    const { query } = await import('@/lib/database');
    
    const posts = await query<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND strftime('%Y', created_date) = ?
    `, [year]);

    const postCount = posts[0]?.count || 0;

    // 최근 크롤링 시간 확인
    const recentPosts = await query<{ crawled_at: string }>(`
      SELECT crawled_at 
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND strftime('%Y', created_date) = ?
      ORDER BY crawled_at DESC 
      LIMIT 1
    `, [year]);

    const lastCrawled = recentPosts[0]?.crawled_at || null;

    return NextResponse.json({
      success: true,
      year: parseInt(year),
      postCount,
      lastCrawled,
      message: `${year}년도 포스트 ${postCount}개 저장됨`
    });

  } catch (error) {
    console.error('크롤링 상태 확인 오류:', error);
    return NextResponse.json({
      success: false,
      message: '상태 확인 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}