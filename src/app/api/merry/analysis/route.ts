import { NextRequest, NextResponse } from 'next/server';

/**
 * 메르 논리체인 분석 API
 * GET: 기존 분석 결과 조회
 * POST: 새로운 포스트 분석
 * 
 * 현재 상태: AI 인사이트 시스템 재구축 예정
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logNo = searchParams.get('logNo');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 임시 스텁: AI 인사이트 시스템 재구축 예정
    const chains: any[] = [];

    return NextResponse.json({
      success: true,
      data: {
        chains,
        total: chains.length,
        message: `AI 인사이트 시스템이 재구축 예정입니다.`
      }
    });

  } catch (error) {
    console.error('논리체인 조회 실패:', error);
    return NextResponse.json({
      success: false,
      error: '논리체인 조회에 실패했습니다.'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logNo, forceReAnalysis = false } = body;

    if (!logNo) {
      return NextResponse.json({
        success: false,
        error: 'logNo가 필요합니다.'
      }, { status: 400 });
    }

    // 임시 스텁: AI 인사이트 시스템 재구축 예정
    return NextResponse.json({
      success: false,
      error: 'AI 인사이트 분석 시스템이 재구축 예정입니다.',
      data: { message: '새로운 크롤링 시스템 구축 후 지원 예정' }
    }, { status: 501 }); // Not Implemented

  } catch (error) {
    console.error('논리체인 분석 실패:', error);
    return NextResponse.json({
      success: false,
      error: '논리체인 분석에 실패했습니다.'
    }, { status: 500 });
  }
}