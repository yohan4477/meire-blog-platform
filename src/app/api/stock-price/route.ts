import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
const { getStockDB } = require('../../../lib/stock-db-sqlite3.js');

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

    // 데이터 품질 분석 (하이브리드 방식: 주말/휴일 제외 + 평일 누락시 전날 가격)
    const totalDays = priceData?.length || 0;
    const actualDataDays = priceData?.filter((item: any) => item.isActualData !== false).length || 0;
    const filledDataDays = priceData?.filter((item: any) => item.isActualData === false).length || 0;
    
    const response = NextResponse.json({
      success: true,
      ticker,
      period,
      prices: priceData,
      dataQuality: {
        totalDays,
        actualDataDays,
        filledDataDays,
        hasCurrentDayData: priceData?.length > 0 && priceData[priceData.length - 1]?.isActualData !== false,
        lastActualDate: priceData?.reverse().find((item: any) => item.isActualData !== false)?.date,
        dataMethod: '하이브리드 방식: 주말/휴일 제외, 평일 누락시 전날 가격 사용'
      },
      fetchedAt: new Date().toISOString()
    });

    // 캐시 활성화 헤더 추가 (성능 향상)
    response.headers.set('Cache-Control', 'public, max-age=1800, s-maxage=1800'); // 30분 캐시
    response.headers.set('CDN-Cache-Control', 'public, max-age=1800');

    return response;

  } catch (error) {
    console.error('주식 가격 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '주식 가격 조회 실패' }
    }, { status: 500 });
  }
}

// SQLite3 DB에서 주식 가격 데이터 조회 (메르 언급 종목만) - 글로벌 인스턴스 사용
async function fetchStockPriceData(ticker: string, period: string) {
  const stockDB = getStockDB();
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      await stockDB.connect();
      
      // 🔥 4개 DB 최적화: stock_prices 테이블에서 직접 조회
      const periodDays = period === '1M' ? 30 : period === '3M' ? 90 : period === '6M' ? 180 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      // 🔥 4개 DB 최적화: stock_prices 테이블에서 직접 조회 (날짜 오름차순 정렬 강제)
      const priceRecords = await new Promise((resolve, reject) => {
        stockDB.db.all(`
          SELECT date, close_price, volume
          FROM stock_prices 
          WHERE ticker = ? AND date >= ?
          ORDER BY date ASC
        `, [ticker, startDateStr], (err: any, rows: any) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      const records = priceRecords as any[];
      if (records.length === 0) {
        console.warn(`⚠️ No price data found in DB for ${ticker}, falling back to Yahoo Finance`);
        return await fetchFromYahooFinance(ticker, period);
      }
      
      console.log(`📊 Found ${records.length} DB records for ${ticker}`);
      console.log(`🔍 First record date: ${records[0]?.date}, Last record date: ${records[records.length-1]?.date}`);
      
      // DB 데이터를 차트 형식으로 변환 (한국 종목은 원화로 처리)
      const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
      
      // 🆕 누락된 날짜 채우기 및 전날 가격으로 보완
      const processedData = fillMissingDates(records, startDateStr, isKoreanStock, ticker);
      
      return processedData;
      
    } catch (error) {
      console.error(`DB에서 주식 데이터 조회 실패 (시도 ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`⏳ 500ms 후 재시도... (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // 모든 재시도 실패 시 Yahoo Finance fallback
      console.warn(`🔄 DB 연결 ${maxRetries + 1}회 실패, Yahoo Finance로 fallback`);
      return await fetchFromYahooFinance(ticker, period);
    } finally {
      // 글로벌 인스턴스는 종료하지 않고 재사용
      try {
        stockDB.close();
      } catch (closeError) {
        console.warn('DB 연결 종료 중 오류 (무시):', closeError);
      }
    }
  }
}

// 🆕 하이브리드 방식: 주말/휴일 건너뛰기 + 평일 누락시 전날 가격 사용
function fillMissingDates(records: any[], startDateStr: string, isKoreanStock: boolean, ticker: string) {
  if (records.length === 0) return [];
  
  // 날짜순 정렬 (오름차순: 오래된 날짜 → 최신 날짜)
  const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const result = [];
  let lastKnownPrice = null;
  
  for (let i = 0; i < sortedRecords.length; i++) {
    const record = sortedRecords[i];
    const currentDate = new Date(record.date);
    const dayOfWeek = currentDate.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    
    // 주말 (토요일=6, 일요일=0) 건너뛰기 - 토스 방식 적용
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    
    let price = record.close_price;
    let isActualData = true;
    
    // 평일인데 가격이 없거나 0인 경우 전날 가격 사용
    if (!price || price === 0) {
      if (lastKnownPrice !== null) {
        price = lastKnownPrice;
        isActualData = false; // 실제 데이터가 아님을 표시
        console.log(`📊 ${ticker} ${record.date}: 종가 없음, 전날 가격 사용 (${price})`);
      } else {
        // 첫 데이터부터 가격이 없으면 건너뛰기
        console.warn(`⚠️ ${ticker} ${record.date}: 첫 데이터부터 가격 없음, 건너뛰기`);
        continue;
      }
    }
    
    const finalPrice = isKoreanStock ? Math.round(price) : parseFloat(price.toFixed(2));
    
    result.push({
      date: record.date,
      price: finalPrice,
      isActualData: isActualData
    });
    
    // 실제 데이터인 경우에만 마지막 가격으로 저장
    if (isActualData) {
      lastKnownPrice = finalPrice;
    }
  }
  
  const actualDataCount = result.filter(item => item.isActualData).length;
  const filledDataCount = result.filter(item => !item.isActualData).length;
  
  console.log(`📊 ${ticker}: 총 ${result.length}개 거래일 데이터 (실제: ${actualDataCount}개, 전날가격: ${filledDataCount}개, 주말/휴일 제외)`);
  
  // 최종 결과도 날짜 오름차순으로 정렬 보장
  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  return now - (periods[period] || periods['1y']!);
}

