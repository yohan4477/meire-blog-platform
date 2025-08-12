/**
 * 주식 데이터 API 클라이언트
 * Yahoo Finance, Alpha Vantage, Finnhub 등의 주식 데이터 API 통합 클라이언트
 */

import { z } from 'zod';

// 주식 데이터 타입 정의
export interface StockPrice {
  symbol: string;
  price: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  marketCap?: number;
  timestamp: string;
  currency: string;
}

export interface StockQuote {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  peRatio?: number;
  eps?: number;
  dividend?: number;
  dividendYield?: number;
  currency: string;
  exchange: string;
  timestamp: string;
}

export interface FinancialStatement {
  symbol: string;
  companyName: string;
  reportType: 'annual' | 'quarterly';
  fiscalYear: number;
  fiscalQuarter?: number;
  reportDate: string;
  currency: string;
  
  // 손익계산서
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  ebitda?: number;
  
  // 재무상태표
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  cashAndEquivalents?: number;
  
  // 현금흐름표
  operatingCashFlow?: number;
  investingCashFlow?: number;
  financingCashFlow?: number;
  
  // 주요 비율
  peRatio?: number;
  pbRatio?: number;
  roe?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
}

export interface StockNews {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  source: string;
  author?: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  relatedSymbols: string[];
  sentiment?: number; // -1 to 1
  importance?: number; // 0 to 1
}

// API 클라이언트 에러
export class StockDataAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public provider?: string,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'StockDataAPIError';
  }
}

// Yahoo Finance API 클라이언트
class YahooFinanceClient {
  private baseUrl = 'https://query1.finance.yahoo.com';

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v8/finance/chart/${symbol}?interval=1d&range=1d`,
        { 
          headers: { 'User-Agent': 'MeireBlogPlatform/1.0' },
          signal: AbortSignal.timeout(15000)
        }
      );

      if (!response.ok) {
        throw new StockDataAPIError(
          `Yahoo Finance API error: ${response.status}`,
          response.status,
          'yahoo_finance'
        );
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        throw new StockDataAPIError('No data found for symbol', 404, 'yahoo_finance');
      }

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      const adjclose = result.indicators?.adjclose?.[0]?.adjclose;
      
      const currentPrice = adjclose?.[adjclose.length - 1] || meta.regularMarketPrice;
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        symbol: meta.symbol,
        companyName: meta.longName || meta.shortName || meta.symbol,
        price: currentPrice,
        change,
        changePercent,
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow,
        volume: meta.regularMarketVolume,
        marketCap: meta.marketCap || 0,
        peRatio: meta.trailingPE,
        eps: meta.epsTrailingTwelveMonths,
        dividend: meta.dividendRate,
        dividendYield: meta.dividendYield,
        currency: meta.currency,
        exchange: meta.exchangeName,
        timestamp: new Date(meta.regularMarketTime * 1000).toISOString()
      };
    } catch (error) {
      if (error instanceof StockDataAPIError) throw error;
      throw new StockDataAPIError(
        `Failed to fetch Yahoo Finance quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'yahoo_finance'
      );
    }
  }

  async getHistoricalPrices(symbol: string, period: string = '1y'): Promise<StockPrice[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v8/finance/chart/${symbol}?interval=1d&range=${period}`,
        { 
          headers: { 'User-Agent': 'MeireBlogPlatform/1.0' },
          signal: AbortSignal.timeout(30000)
        }
      );

      if (!response.ok) {
        throw new StockDataAPIError(
          `Yahoo Finance API error: ${response.status}`,
          response.status,
          'yahoo_finance'
        );
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        throw new StockDataAPIError('No historical data found', 404, 'yahoo_finance');
      }

      const timestamps = result.timestamp;
      const quotes = result.indicators?.quote?.[0];
      const adjclose = result.indicators?.adjclose?.[0]?.adjclose;

      return timestamps.map((timestamp: number, index: number) => ({
        symbol,
        price: adjclose?.[index] || quotes?.close?.[index] || 0,
        openPrice: quotes?.open?.[index],
        highPrice: quotes?.high?.[index],
        lowPrice: quotes?.low?.[index],
        volume: quotes?.volume?.[index],
        timestamp: new Date(timestamp * 1000).toISOString(),
        currency: result.meta.currency
      }));
    } catch (error) {
      if (error instanceof StockDataAPIError) throw error;
      throw new StockDataAPIError(
        `Failed to fetch historical prices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'yahoo_finance'
      );
    }
  }
}

// Alpha Vantage API 클라이언트
class AlphaVantageClient {
  private baseUrl = 'https://www.alphavantage.co/query';

  constructor(private apiKey: string) {}

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await fetch(
        `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        throw new StockDataAPIError(
          `Alpha Vantage API error: ${response.status}`,
          response.status,
          'alpha_vantage'
        );
      }

      const data = await response.json();
      
      if (data['Error Message']) {
        throw new StockDataAPIError(data['Error Message'], 400, 'alpha_vantage');
      }

      if (data['Note']) {
        throw new StockDataAPIError('API call frequency limit reached', 429, 'alpha_vantage');
      }

      const quote = data['Global Quote'];
      if (!quote) {
        throw new StockDataAPIError('No quote data found', 404, 'alpha_vantage');
      }

      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

      return {
        symbol: quote['01. symbol'],
        companyName: quote['01. symbol'], // Alpha Vantage doesn't provide company name in quote
        price,
        change,
        changePercent,
        dayHigh: parseFloat(quote['03. high']),
        dayLow: parseFloat(quote['04. low']),
        volume: parseInt(quote['06. volume']),
        marketCap: 0, // Not provided in this endpoint
        currency: 'USD',
        exchange: 'US',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof StockDataAPIError) throw error;
      throw new StockDataAPIError(
        `Failed to fetch Alpha Vantage quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'alpha_vantage'
      );
    }
  }

  async getFinancials(symbol: string, reportType: 'annual' | 'quarterly' = 'annual'): Promise<FinancialStatement[]> {
    try {
      const functions = {
        income: `INCOME_STATEMENT`,
        balance: `BALANCE_SHEET`,
        cash: `CASH_FLOW`
      };

      const [incomeData, balanceData, cashData] = await Promise.all([
        this.fetchFinancialData(symbol, functions.income),
        this.fetchFinancialData(symbol, functions.balance),
        this.fetchFinancialData(symbol, functions.cash)
      ]);

      const reportKey = reportType === 'annual' ? 'annualReports' : 'quarterlyReports';
      
      const incomeReports = incomeData[reportKey] || [];
      const balanceReports = balanceData[reportKey] || [];
      const cashReports = cashData[reportKey] || [];

      // 보고서들을 날짜별로 매칭
      const financials: FinancialStatement[] = [];
      
      for (const income of incomeReports.slice(0, 5)) { // 최근 5개 보고서
        const reportDate = income.fiscalDateEnding;
        const balance = balanceReports.find(b => b.fiscalDateEnding === reportDate);
        const cash = cashReports.find(c => c.fiscalDateEnding === reportDate);

        financials.push({
          symbol,
          companyName: symbol,
          reportType,
          fiscalYear: new Date(reportDate).getFullYear(),
          fiscalQuarter: reportType === 'quarterly' ? Math.ceil((new Date(reportDate).getMonth() + 1) / 3) : undefined,
          reportDate,
          currency: income.reportedCurrency || 'USD',
          
          // 손익계산서
          revenue: this.parseNumber(income.totalRevenue),
          grossProfit: this.parseNumber(income.grossProfit),
          operatingIncome: this.parseNumber(income.operatingIncome),
          netIncome: this.parseNumber(income.netIncome),
          ebitda: this.parseNumber(income.ebitda),
          
          // 재무상태표
          totalAssets: balance ? this.parseNumber(balance.totalAssets) : undefined,
          totalLiabilities: balance ? this.parseNumber(balance.totalLiabilities) : undefined,
          totalEquity: balance ? this.parseNumber(balance.totalShareholderEquity) : undefined,
          cashAndEquivalents: balance ? this.parseNumber(balance.cashAndCashEquivalentsAtCarryingValue) : undefined,
          
          // 현금흐름표
          operatingCashFlow: cash ? this.parseNumber(cash.operatingCashflow) : undefined,
          investingCashFlow: cash ? this.parseNumber(cash.cashflowFromInvestment) : undefined,
          financingCashFlow: cash ? this.parseNumber(cash.cashflowFromFinancing) : undefined
        });
      }

      return financials;
    } catch (error) {
      if (error instanceof StockDataAPIError) throw error;
      throw new StockDataAPIError(
        `Failed to fetch financial statements: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'alpha_vantage'
      );
    }
  }

  private async fetchFinancialData(symbol: string, functionName: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}?function=${functionName}&symbol=${symbol}&apikey=${this.apiKey}`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
      throw new StockDataAPIError(
        `Alpha Vantage API error: ${response.status}`,
        response.status,
        'alpha_vantage'
      );
    }

    const data = await response.json();
    
    if (data['Error Message']) {
      throw new StockDataAPIError(data['Error Message'], 400, 'alpha_vantage');
    }

    if (data['Note']) {
      throw new StockDataAPIError('API call frequency limit reached', 429, 'alpha_vantage');
    }

    return data;
  }

  private parseNumber(value: string | undefined): number | undefined {
    if (!value || value === 'None') return undefined;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }

  async getNews(symbol: string): Promise<StockNews[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${this.apiKey}`,
        { signal: AbortSignal.timeout(30000) }
      );

      if (!response.ok) {
        throw new StockDataAPIError(
          `Alpha Vantage API error: ${response.status}`,
          response.status,
          'alpha_vantage'
        );
      }

      const data = await response.json();
      
      if (data['Error Message']) {
        throw new StockDataAPIError(data['Error Message'], 400, 'alpha_vantage');
      }

      const feed = data.feed || [];
      
      return feed.slice(0, 20).map((article: any) => ({
        id: article.url,
        title: article.title,
        summary: article.summary,
        source: article.source,
        publishedAt: article.time_published,
        url: article.url,
        imageUrl: article.banner_image,
        relatedSymbols: article.ticker_sentiment?.map((t: any) => t.ticker) || [symbol],
        sentiment: article.overall_sentiment_score,
        importance: article.relevance_score
      }));
    } catch (error) {
      if (error instanceof StockDataAPIError) throw error;
      throw new StockDataAPIError(
        `Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'alpha_vantage'
      );
    }
  }
}

// 통합 주식 데이터 클라이언트
export class StockDataAPIClient {
  private yahooClient: YahooFinanceClient;
  private alphaVantageClient: AlphaVantageClient;

  constructor(alphaVantageApiKey: string) {
    this.yahooClient = new YahooFinanceClient();
    this.alphaVantageClient = new AlphaVantageClient(alphaVantageApiKey);
  }

  /**
   * 주식 시세 조회 (Yahoo Finance 우선, 실패시 Alpha Vantage)
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      return await this.yahooClient.getQuote(symbol);
    } catch (yahooError) {
      console.warn(`Yahoo Finance failed for ${symbol}, trying Alpha Vantage:`, yahooError);
      try {
        return await this.alphaVantageClient.getQuote(symbol);
      } catch (alphaError) {
        throw new StockDataAPIError(
          `All stock data providers failed: Yahoo: ${yahooError instanceof Error ? yahooError.message : 'Unknown'}, Alpha Vantage: ${alphaError instanceof Error ? alphaError.message : 'Unknown'}`,
          undefined,
          'multiple_providers'
        );
      }
    }
  }

  /**
   * 여러 종목 시세 일괄 조회
   */
  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    const results = await Promise.allSettled(
      symbols.map(symbol => this.getQuote(symbol))
    );

    const quotes: StockQuote[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        quotes.push(result.value);
      } else {
        errors.push(`${symbols[index]}: ${result.reason.message}`);
      }
    });

    if (errors.length > 0) {
      console.warn('Some quotes failed to fetch:', errors);
    }

    return quotes;
  }

  /**
   * 과거 가격 데이터 조회
   */
  async getHistoricalPrices(symbol: string, period: string = '1y'): Promise<StockPrice[]> {
    return this.yahooClient.getHistoricalPrices(symbol, period);
  }

  /**
   * 기업 재무제표 조회
   */
  async getFinancials(symbol: string, reportType: 'annual' | 'quarterly' = 'annual'): Promise<FinancialStatement[]> {
    return this.alphaVantageClient.getFinancials(symbol, reportType);
  }

  /**
   * 주식 관련 뉴스 조회
   */
  async getNews(symbol: string): Promise<StockNews[]> {
    return this.alphaVantageClient.getNews(symbol);
  }

  /**
   * 여러 데이터 소스 상태 확인
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    try {
      await this.yahooClient.getQuote('AAPL');
      results.yahoo_finance = true;
    } catch {
      results.yahoo_finance = false;
    }

    try {
      await this.alphaVantageClient.getQuote('AAPL');
      results.alpha_vantage = true;
    } catch {
      results.alpha_vantage = false;
    }

    return results;
  }
}

// 싱글톤 인스턴스 생성 함수
export function createStockDataAPIClient(): StockDataAPIClient {
  const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  
  if (!alphaVantageApiKey) {
    console.warn('Warning: ALPHA_VANTAGE_API_KEY environment variable is not set');
  }

  return new StockDataAPIClient(alphaVantageApiKey);
}