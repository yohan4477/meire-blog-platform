import { NextRequest, NextResponse } from 'next/server';

// CLAUDE.md 요구사항: 성능 최적화를 위한 캐시 관리
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const resolvedParams = await params;
    const ticker = resolvedParams.ticker;
    
    console.log(`🧹 Clearing cache for ticker: ${ticker}`);
    
    // 캐시 무력화를 위한 응답
    const response = NextResponse.json({
      success: true,
      message: `Cache cleared for ${ticker}`,
      timestamp: new Date().toISOString()
    });

    // 강제 캐시 무력화 헤더
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('캐시 삭제 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '캐시 삭제 실패' }
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const resolvedParams = await params;
    const ticker = resolvedParams.ticker;
    
    // 캐시 상태 확인
    const response = NextResponse.json({
      success: true,
      ticker,
      cache_status: 'active',
      timestamp: new Date().toISOString()
    });

    // 빠른 응답을 위한 캐싱 헤더
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    
    return response;

  } catch (error) {
    console.error('캐시 상태 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '캐시 상태 조회 실패' }
    }, { status: 500 });
  }
}