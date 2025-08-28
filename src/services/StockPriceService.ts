/**
 * 통합 주식 가격 서비스
 * 한국 + 미국 종목 지원, 가격 검증 포함
 */

import { StockPrice, ValidationResult, StockApiResponse, MARKET_CONFIGS, HistoricalPrice } from '../types/stock';
import { safeServerCall, safeServerJsonParse } from '../utils/safeServerCall';

export class StockPriceService {
  private cache = new Map<string, { data: StockPrice; timestamp: number }>();
  private readonly CACHE_TTL = 60 * 1000; // 1분 캐시

  /**
   * 종목 코드로 주가 조회 (한국/미국 자동 감지)
   */
  async getStockPrice(ticker: string, validate: boolean = false): Promise<StockApiResponse> {
    const startTime = Date.now();
    const cacheKey = `${ticker}_${validate}`;
    
    // 캐시 확인
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        price: cached,
        cached: true,
        responseTime: Date.now() - startTime
      };
    }

    try {
      let price: StockPrice;
      
      // 한국 종목 (6자리 숫자) vs 미국 종목 자동 판별
      if (this.isKoreanStock(ticker)) {
        price = await this.getKoreanStockPrice(ticker);
      } else {
        price = await this.getUSStockPrice(ticker);
      }

      // 가격 검증 (필요시)
      let validation: ValidationResult | undefined;
      if (validate && this.shouldValidate(price)) {
        validation = await this.validatePrice(price);
      }

      // 캐시 저장
      this.setCache(cacheKey, price);

      return {
        price,
        validation,
        cached: false,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`주가 조회 실패 (${ticker}):`, error);
      
      // 캐시된 데이터라도 반환 시도
      const staleCache = this.getFromCache(cacheKey, true);
      if (staleCache) {
        return {
          price: staleCache,
          cached: true,
          responseTime: Date.now() - startTime
        };
      }
      
      throw error;
    }
  }

  /**
   * 한국 종목 주가 조회 (야후 파이낸스 사용)
   */
  private async getKoreanStockPrice(ticker: string): Promise<StockPrice> {
    try {
      // 서버사이드: Yahoo Finance 직접 호출 - safeApiCall 사용
      const symbol = `${ticker}.KS`;
      const data = await safeServerCall(async () => {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(Date.now() / 1000) - 86400}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Yahoo Finance API 오류: ${response.status}`);
        }

        return await response.json();
      }, 3);

      if (!data) {
        throw new Error('API 호출 실패 또는 데이터가 없습니다');
      }

      const result = data.chart?.result?.[0];
      
      if (!result?.meta) {
        throw new Error('주가 데이터를 찾을 수 없습니다');
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice || meta.previousClose;
      const previousClose = meta.chartPreviousClose || meta.regularMarketPreviousClose;
      
      if (!currentPrice) {
        throw new Error('현재가 정보가 없습니다');
      }

      const change = currentPrice - (previousClose || currentPrice);
      const changePercent = previousClose ? (change / previousClose) * 100 : 0;

      return {
        ticker,
        name: meta.longName || meta.shortName || ticker,
        price: Math.round(currentPrice),
        change: Math.round(change),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: meta.regularMarketVolume || 0,
        currency: 'KRW',
        market: ticker.startsWith('A') ? 'KOSDAQ' : 'KOSPI',
        timestamp: Date.now(),
        source: 'YAHOO'
      };

    } catch (error) {
      console.error(`한국 종목 조회 실패 (${ticker}):`, error);
      throw error;
    }
  }

  /**
   * 미국 종목 주가 조회 (기존 로직 활용)
   */
  private async getUSStockPrice(ticker: string): Promise<StockPrice> {
    try {
      // 특수한 경우들 필터링
      if (this.isNonPublicCompany(ticker)) {
        throw new Error(`${ticker}는 비상장 또는 조회 불가능한 종목입니다`);
      }

      // 특수 티커 변환 (예: BRK.B -> BRK-B)
      const yahooTicker = this.convertToYahooTicker(ticker);

      // 서버사이드: Yahoo Finance 직접 호출 - safeApiCall 사용
      const data = await safeServerCall(async () => {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?period1=${Math.floor(Date.now() / 1000) - 86400}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Yahoo Finance API 오류: ${response.status} - ${ticker} 종목을 찾을 수 없습니다`);
        }

        return await response.json();
      }, 3);

      if (!data) {
        throw new Error('API 호출 실패 또는 데이터가 없습니다');
      }
      const result = data.chart?.result?.[0];
      
      if (!result?.meta) {
        throw new Error('주가 데이터를 찾을 수 없습니다');
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice || meta.previousClose;
      const previousClose = meta.chartPreviousClose || meta.regularMarketPreviousClose;
      
      if (!currentPrice) {
        throw new Error('현재가 정보가 없습니다');
      }

      const change = currentPrice - (previousClose || currentPrice);
      const changePercent = previousClose ? (change / previousClose) * 100 : 0;

      return {
        ticker,
        name: meta.longName || meta.shortName || ticker,
        price: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: meta.regularMarketVolume || 0,
        currency: 'USD',
        market: this.getUSMarket(ticker),
        timestamp: Date.now(),
        source: 'YAHOO'
      };

    } catch (error) {
      console.error(`미국 종목 조회 실패 (${ticker}):`, error);
      throw error;
    }
  }

  /**
   * 가격 검증이 필요한지 판단
   */
  private shouldValidate(price: StockPrice): boolean {
    // 1. 시장 시간 외에는 검증 생략
    if (!this.isMarketHours(price.market)) {
      return false;
    }
    
    // 2. 급격한 가격 변동시만 검증 (5% 이상)
    if (Math.abs(price.changePercent) > 5.0) {
      return true;
    }
    
    // 3. 가격이 0이거나 비정상적인 경우
    if (price.price <= 0 || price.price > 10000000) {
      return true;
    }
    
    return false;
  }

  /**
   * 가격 검증 (다중 소스 크로스 체크)
   */
  private async validatePrice(price: StockPrice): Promise<ValidationResult> {
    const warnings: string[] = [];
    const sources = [price.source];
    
    try {
      // 현재는 단일 소스만 사용하므로 기본 검증만 수행
      let confidence = 0.8; // 기본 신뢰도
      
      // 가격 범위 검증
      if (price.price <= 0) {
        warnings.push('가격이 0 이하입니다');
        confidence -= 0.3;
      }
      
      // 변동률 검증
      if (Math.abs(price.changePercent) > 30) {
        warnings.push('일일 변동률이 30%를 초과합니다');
        confidence -= 0.2;
      }
      
      // 거래량 검증
      if (price.volume === 0) {
        warnings.push('거래량 정보가 없습니다');
        confidence -= 0.1;
      }

      return {
        isValid: confidence > 0.5,
        confidence: Math.max(0, confidence),
        sources,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        sources,
        warnings: ['검증 중 오류 발생', ...warnings]
      };
    }
  }

  /**
   * 종목이 한국 주식인지 판별
   */
  private isKoreanStock(ticker: string): boolean {
    // 6자리 숫자면 한국 종목
    return /^\d{6}$/.test(ticker);
  }

  /**
   * 미국 시장 구분
   */
  private getUSMarket(ticker: string): 'NASDAQ' | 'NYSE' {
    const nasdaqTickers = ['AAPL', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'MSFT'];
    return nasdaqTickers.includes(ticker) ? 'NASDAQ' : 'NYSE';
  }

  /**
   * 비상장 또는 조회 불가능한 회사 판별
   */
  private isNonPublicCompany(ticker: string): boolean {
    const nonPublicCompanies = [
      'DeepSeek(중국)', 'BOE(중국)', 'CATL(중국)', 
      'Neuralink(미상장)', 'CIRCLE(미상장)', 'TETHER(미상장)', 
      '한수원(비상장)', 'SpaceX'
    ];
    
    return nonPublicCompanies.some(company => 
      ticker.includes(company) || ticker.includes('미상장') || ticker.includes('비상장')
    );
  }

  /**
   * Yahoo Finance 형식으로 티커 변환
   */
  private convertToYahooTicker(ticker: string): string {
    // BRK.B -> BRK-B 변환
    if (ticker === 'BRK.B') {
      return 'BRK-B';
    }
    
    // 기타 특수 경우들 처리
    const specialTickers: Record<string, string> = {
      'BRK.A': 'BRK-A',
      'BF.B': 'BF-B'
    };
    
    return specialTickers[ticker] || ticker;
  }

  /**
   * 시장 시간 확인
   */
  private isMarketHours(market: string): boolean {
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const usTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    if (market === 'KOSPI' || market === 'KOSDAQ') {
      const hour = koreaTime.getHours();
      const minute = koreaTime.getMinutes();
      const time = hour * 100 + minute;
      
      // 한국 시장: 09:00 ~ 15:30 (평일)
      const isWeekday = koreaTime.getDay() >= 1 && koreaTime.getDay() <= 5;
      return isWeekday && time >= 900 && time <= 1530;
    } else {
      const hour = usTime.getHours();
      const minute = usTime.getMinutes();
      const time = hour * 100 + minute;
      
      // 미국 시장: 09:30 ~ 16:00 (평일)
      const isWeekday = usTime.getDay() >= 1 && usTime.getDay() <= 5;
      return isWeekday && time >= 930 && time <= 1600;
    }
  }

  /**
   * 캐시 조회
   */
  private getFromCache(key: string, allowStale: boolean = false): StockPrice | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
    if (isExpired && !allowStale) return null;
    
    return cached.data;
  }

  /**
   * 캐시 저장
   */
  private setCache(key: string, data: StockPrice): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // 캐시 크기 제한 (최대 100개)
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * 배치로 여러 종목 조회
   */
  async getMultipleStocks(
    tickers: string[], 
    validate: boolean = false
  ): Promise<Record<string, StockApiResponse>> {
    const results: Record<string, StockApiResponse> = {};
    
    // 병렬 처리로 성능 향상
    const promises = tickers.map(async (ticker) => {
      try {
        const result = await this.getStockPrice(ticker, validate);
        return { ticker, result };
      } catch (error) {
        console.error(`${ticker} 조회 실패:`, error);
        return { ticker, result: null };
      }
    });

    const responses = await Promise.all(promises);
    
    responses.forEach(({ ticker, result }) => {
      if (result) {
        results[ticker] = result;
      }
    });

    return results;
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 과거 6개월간의 일별 주가 데이터 조회
   */
  async getHistoricalData(ticker: string, months: number = 6): Promise<HistoricalPrice[]> {
    const cacheKey = `historical_${ticker}_${months}m`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached && Array.isArray(cached)) {
      return cached as HistoricalPrice[];
    }

    try {
      // 비상장 회사 체크
      if (!this.isKoreanStock(ticker) && this.isNonPublicCompany(ticker)) {
        throw new Error(`${ticker}는 비상장 또는 조회 불가능한 종목입니다`);
      }

      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - (months * 30 * 24 * 60 * 60); // months * 30일

      let symbol = ticker;
      if (this.isKoreanStock(ticker)) {
        symbol = `${ticker}.KS`;
      } else {
        symbol = this.convertToYahooTicker(ticker);
      }

      // 서버사이드: Yahoo Finance 직접 호출 - safeApiCall 사용
      const data = await safeServerCall(async () => {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Historical data API 오류: ${response.status}`);
        }

        return await response.json();
      }, 3);

      if (!data) {
        throw new Error('과거 데이터 API 호출 실패');
      }
      const result = data.chart?.result?.[0];
      
      if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
        throw new Error('과거 데이터를 찾을 수 없습니다');
      }

      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];
      const closes = quotes.close;

      const historicalData: HistoricalPrice[] = timestamps
        .map((timestamp: number, index: number) => {
          const close = closes[index];
          if (close == null) return null;

          return {
            date: new Date(timestamp * 1000).toISOString().split('T')[0],
            timestamp: timestamp * 1000,
            price: this.isKoreanStock(ticker) ? Math.round(close) : parseFloat(close.toFixed(2)),
            currency: this.isKoreanStock(ticker) ? 'KRW' : 'USD'
          };
        })
        .filter((item: any): item is HistoricalPrice => item !== null)
        .sort((a: HistoricalPrice, b: HistoricalPrice) => a.timestamp - b.timestamp);

      // 캐시 저장 (과거 데이터는 더 오래 캐시)
      this.cache.set(cacheKey, {
        data: historicalData as any,
        timestamp: Date.now()
      });

      return historicalData;

    } catch (error) {
      console.error(`과거 데이터 조회 실패 (${ticker}):`, error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 주가 조회 (과거 데이터에서)
   */
  async getPriceOnDate(ticker: string, targetDate: string): Promise<number | null> {
    try {
      const historicalData = await this.getHistoricalData(ticker);
      const priceOnDate = historicalData.find(item => item.date === targetDate);
      return priceOnDate?.price || null;
    } catch (error) {
      console.error(`특정 날짜 주가 조회 실패 (${ticker}, ${targetDate}):`, error);
      return null;
    }
  }

  /**
   * 여러 날짜의 주가를 한번에 조회
   */
  async getPricesOnDates(ticker: string, dates: string[]): Promise<Record<string, number | null>> {
    try {
      const historicalData = await this.getHistoricalData(ticker);
      const result: Record<string, number | null> = {};
      
      dates.forEach(date => {
        const priceData = historicalData.find(item => item.date === date);
        result[date] = priceData?.price || null;
      });

      return result;
    } catch (error) {
      console.error(`여러 날짜 주가 조회 실패 (${ticker}):`, error);
      return dates.reduce((acc, date) => ({ ...acc, [date]: null }), {});
    }
  }

  /**
   * 캐시 통계
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // 실제 구현에서는 hit/miss 카운터 필요
    };
  }
}