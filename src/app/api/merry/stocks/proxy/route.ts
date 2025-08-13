/**
 * 🔄 Yahoo Finance API 프록시 라우트
 * CORS 문제 해결을 위한 서버사이드 프록시
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const range = searchParams.get('range') || '1mo';
    const interval = searchParams.get('interval') || '1d';

    if (!ticker) {
      return NextResponse.json(
        { error: '티커 심볼이 필요합니다' },
        { status: 400 }
      );
    }

    // 한국 종목인지 확인 (6자리 숫자)
    const isKoreanStock = /^\d{6}$/.test(ticker);
    const finalTicker = isKoreanStock ? `${ticker}.KS` : ticker;

    // Yahoo Finance API 호출
    const now = Math.floor(Date.now() / 1000);
    
    // range 파라미터에 따라 기간 설정
    let period1;
    switch (range) {
      case '1d':
        period1 = now - (1 * 24 * 60 * 60);
        break;
      case '5d':
        period1 = now - (5 * 24 * 60 * 60);
        break;
      case '1mo':
        period1 = now - (30 * 24 * 60 * 60);
        break;
      case '3mo':
        period1 = now - (90 * 24 * 60 * 60);
        break;
      case '6mo':
        period1 = now - (180 * 24 * 60 * 60); // 6개월
        break;
      case '1y':
        period1 = now - (365 * 24 * 60 * 60);
        break;
      case '2y':
        period1 = now - (730 * 24 * 60 * 60);
        break;
      default:
        period1 = now - (30 * 24 * 60 * 60);
    }
    
    const period2 = now;

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${finalTicker}?period1=${period1}&period2=${period2}&interval=${interval}`;

    console.log(`🔄 Fetching: ${yahooUrl}`);

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    // CORS 헤더 추가
    const corsResponse = NextResponse.json(data);
    corsResponse.headers.set('Access-Control-Allow-Origin', '*');
    corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return corsResponse;

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { error: 'API 호출 실패', details: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}