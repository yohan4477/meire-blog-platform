import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
const StockDB = require('../../../lib/stock-db-sqlite3.js');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const period = searchParams.get('period') || '1y';

    if (!ticker) {
      return NextResponse.json({
        success: false,
        error: { message: '티커 심볼이 필요합니다' }
      }, { status: 400 });
    }

    console.log(`📈 Fetching fresh stock price for: ${ticker} (${period}) at ${new Date().toISOString()}`);

    // 실제 주식 가격 데이터 조회
    const priceData = await fetchStockPriceData(ticker, period);

    const response = NextResponse.json({
      success: true,
      ticker,
      period,
      prices: priceData,
      fetchedAt: new Date().toISOString()
    });

    // 캐시 비활성화 헤더 추가
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');

    return response;

  } catch (error) {
    console.error('주식 가격 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '주식 가격 조회 실패' }
    }, { status: 500 });
  }
}

// SQLite3 DB에서 주식 가격 데이터 조회 (메르 언급 종목만)
async function fetchStockPriceData(ticker: string, period: string) {
  const stockDB = new StockDB();
  
  try {
    await stockDB.connect();
    
    // 메르 언급 종목인지 확인
    const stockInfo = await stockDB.getStockInfo(ticker);
    
    if (!stockInfo) {
      console.warn(`⚠️ ${ticker} not found in database`);
      return await fetchFromYahooFinance(ticker, period);
    }
    
    if (!stockInfo.is_merry_mentioned) {
      console.warn(`⚠️ ${ticker} is not a Merry-mentioned stock`);
      return null; // CLAUDE.md 원칙: 메르 언급 종목만 데이터 제공
    }
    
    // DB에서 종가 데이터 조회
    const priceRecords = await stockDB.getStockPrices(ticker, period);
    
    if (priceRecords.length === 0) {
      console.warn(`⚠️ No price data found in DB for ${ticker}, falling back to Yahoo Finance`);
      return await fetchFromYahooFinance(ticker, period);
    }
    
    console.log(`📊 Found ${priceRecords.length} DB records for ${ticker} (${stockInfo.company_name_kr})`);
    
    // DB 데이터를 차트 형식으로 변환
    const isKoreanStock = stockInfo.market === 'KRX';
    
    return priceRecords.map(record => ({
      date: record.date,
      price: isKoreanStock ? Math.round(record.close_price) : parseFloat(record.close_price.toFixed(2))
    }));
    
  } catch (error) {
    console.error('DB에서 주식 데이터 조회 실패:', error);
    // DB 실패 시 Yahoo Finance fallback
    return await fetchFromYahooFinance(ticker, period);
  } finally {
    stockDB.close();
  }
}

// Yahoo Finance fallback (DB에 데이터가 없을 때만 사용)
async function fetchFromYahooFinance(ticker: string, period: string) {
  try {
    const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
    const symbol = isKoreanStock ? `${ticker}.KS` : ticker;
    
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${getPeriodTimestamp(period)}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const prices = result.indicators?.quote?.[0]?.close;

      if (timestamps && prices) {
        return timestamps.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          price: isKoreanStock ? Math.round(prices[index] || 0) : parseFloat((prices[index] || 0).toFixed(2))
        })).filter((item: any) => item.price > 0);
      }
    }

    return null;
  } catch (error) {
    console.error('Yahoo Finance fallback 실패:', error);
    return null;
  }
}

// 한국 주식 데이터 조회 (Yahoo Finance 또는 KIS API) - DEPRECATED
async function fetchKoreanStockDataDeprecated(ticker: string, period: string) {
  try {
    // Yahoo Finance API 사용 (무료)
    const symbol = ticker.includes('.KS') ? ticker : `${ticker}.KS`;
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${getPeriodTimestamp(period)}&period2=${Math.floor(Date.now() / 1000)}&interval=1d&includePrePost=true`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const prices = result.indicators?.quote?.[0]?.close;

      if (timestamps && prices) {
        return timestamps.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          price: Math.round(prices[index] || 0)
        })).filter((item: any) => item.price > 0);
      }
    }

    throw new Error('Yahoo Finance 데이터 파싱 실패');
  } catch (error) {
    console.error('한국 주식 데이터 조회 실패:', error);
    return null;
  }
}

// 미국 주식 데이터 조회
async function fetchUSStockData(ticker: string, period: string) {
  try {
    // Yahoo Finance API 사용
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${getPeriodTimestamp(period)}&period2=${Math.floor(Date.now() / 1000)}&interval=1d&includePrePost=true`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const prices = result.indicators?.quote?.[0]?.close;

      if (timestamps && prices) {
        return timestamps.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          price: parseFloat((prices[index] || 0).toFixed(2))
        })).filter((item: any) => item.price > 0);
      }
    }

    throw new Error('Yahoo Finance 데이터 파싱 실패');
  } catch (error) {
    console.error('미국 주식 데이터 조회 실패:', error);
    return null;
  }
}

// 기간에 따른 타임스탬프 계산
function getPeriodTimestamp(period: string): number {
  const now = Math.floor(Date.now() / 1000);
  const periods: Record<string, number> = {
    '1d': 24 * 60 * 60,
    '1w': 7 * 24 * 60 * 60,
    '1m': 30 * 24 * 60 * 60,
    '3m': 90 * 24 * 60 * 60,
    '6m': 180 * 24 * 60 * 60,
    '1y': 365 * 24 * 60 * 60,
    '5y': 5 * 365 * 24 * 60 * 60
  };

  return now - (periods[period] || periods['1y']);
}

