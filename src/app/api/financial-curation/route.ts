import { NextRequest, NextResponse } from 'next/server';

// CLAUDE.md 요구사항: 누락된 API 구현
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'curated';
    const limit = parseInt(searchParams.get('limit') || '3');

    console.log(`📰 Fetching financial curation (action: ${action}, limit: ${limit})`);

    // 임시로 빈 배열 반환 (향후 실제 큐레이션 로직 추가)
    const curatedContent = [];

    const response = NextResponse.json({
      success: true,
      data: {
        content: curatedContent,
        total: curatedContent.length,
        action,
        fetchedAt: new Date().toISOString()
      }
    });

    // 5분 캐시
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');

    return response;

  } catch (error) {
    console.error('Financial curation 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Financial curation 조회 실패' }
    }, { status: 500 });
  }
}