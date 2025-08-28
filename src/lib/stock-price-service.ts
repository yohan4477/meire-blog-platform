import { Stock, StockPrice, StockQuote } from '@/types';
import { query } from './database';

// 주가 데이터 제공자 인터페이스
interface StockDataProvider {
  name: string;
  getQuote(symbol: string): Promise<StockQuote | null>;
  getMultipleQuotes(symbols: string[]): Promise<StockQuote[]>;
  isAvailable(): boolean;
}

// Alpha Vantage API 제공자
class AlphaVantageProvider implements StockDataProvider {
  name = 'Alpha Vantage';
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private rateLimitDelay = 12000; // 12초 (API 제한: 5 calls per minute)
  private lastCallTime = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env['ALPHA_VANTAGE_API_KEY'] || 'demo';
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      await this.respectRateLimit();
      
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data['Error Message']) {
        console.error('Alpha Vantage API error:', data['Error Message']);
        return null;
      }

      const quote = data['Global Quote'];
      if (!quote) {
        console.warn('No quote data received for symbol:', symbol);
        return null;
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        previousClose: parseFloat(quote['08. previous close']),
        volume: parseInt(quote['06. volume']),
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Alpha Vantage fetch error:', error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    const quotes: StockQuote[] = [];
    
    // Rate limiting으로 인해 순차적으로 처리
    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol);
      if (quote) {
        quotes.push(quote);
      }
    }
    
    return quotes;
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastCallTime = Date.now();
  }

  isAvailable(): boolean {
    return this.apiKey !== 'demo' && this.apiKey.length > 0;
  }
}

// IEX Cloud API 제공자
class IEXCloudProvider implements StockDataProvider {
  name = 'IEX Cloud';
  private apiKey: string;
  private baseUrl = 'https://cloud.iexapis.com/stable';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env['IEX_CLOUD_API_KEY'] || '';
  }

  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `${this.baseUrl}/stock/${symbol}/quote?token=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('IEX Cloud API error:', response.statusText);
        return null;
      }

      const data = await response.json();

      return {
        symbol: data.symbol,
        price: data.latestPrice,
        change: data.change,
        changePercent: data.changePercent * 100,
        previousClose: data.previousClose,
        marketCap: data.marketCap,
        volume: data.volume,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('IEX Cloud fetch error:', error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      const symbolList = symbols.join(',');
      const url = `${this.baseUrl}/stock/market/batch?symbols=${symbolList}&types=quote&token=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('IEX Cloud batch API error:', response.statusText);
        return [];
      }

      const data = await response.json();
      const quotes: StockQuote[] = [];

      for (const symbol of symbols) {
        const stockData = data[symbol];
        if (stockData && stockData.quote) {
          const quote = stockData.quote;
          quotes.push({
            symbol: quote.symbol,
            price: quote.latestPrice,
            change: quote.change,
            changePercent: quote.changePercent * 100,
            previousClose: quote.previousClose,
            marketCap: quote.marketCap,
            volume: quote.volume,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      return quotes;

    } catch (error) {
      console.error('IEX Cloud batch fetch error:', error);
      return [];
    }
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }
}

// Yahoo Finance 대안 제공자 (무료)
class YahooFinanceProvider implements StockDataProvider {
  name = 'Yahoo Finance';
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';

  async getQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `${this.baseUrl}/${symbol}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Yahoo Finance API error:', response.statusText);
        return null;
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        console.warn('No quote data received for symbol:', symbol);
        return null;
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        symbol: meta.symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        previousClose: previousClose,
        marketCap: meta.marketCap,
        volume: meta.regularMarketVolume,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Yahoo Finance fetch error:', error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    const quotes: StockQuote[] = [];
    
    // Yahoo Finance는 단일 요청으로 여러 심볼을 지원하지 않으므로 순차적으로 처리
    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol);
      if (quote) {
        quotes.push(quote);
      }
      // Yahoo Finance는 rate limiting이 있으므로 약간의 지연 추가
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return quotes;
  }

  isAvailable(): boolean {
    return true; // Yahoo Finance는 무료로 사용 가능
  }
}

// 주가 서비스 메인 클래스
export class StockPriceService {
  private providers: StockDataProvider[];
  private cache: Map<string, { data: StockQuote; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1분 캐시

  constructor() {
    this.providers = [
      new IEXCloudProvider(),
      new AlphaVantageProvider(),
      new YahooFinanceProvider()
    ];
  }

  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    // 캐시 확인
    const cached = this.getCachedQuote(symbol);
    if (cached) {
      return cached;
    }

    // 사용 가능한 제공자를 순차적으로 시도
    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        continue;
      }

      try {
        const quote = await provider.getQuote(symbol);
        if (quote) {
          this.setCachedQuote(symbol, quote);
          
          // 데이터베이스에 주가 정보 저장
          await this.saveQuoteToDatabase(symbol, quote);
          
          return quote;
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} failed for ${symbol}:`, error);
        continue;
      }
    }

    console.error(`Failed to fetch quote for ${symbol} from all providers`);
    return null;
  }

  async getMultipleStockQuotes(symbols: string[]): Promise<StockQuote[]> {
    // 캐시에서 먼저 확인
    const quotes: StockQuote[] = [];
    const symbolsToFetch: string[] = [];

    for (const symbol of symbols) {
      const cached = this.getCachedQuote(symbol);
      if (cached) {
        quotes.push(cached);
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    if (symbolsToFetch.length === 0) {
      return quotes;
    }

    // 사용 가능한 제공자를 순차적으로 시도
    for (const provider of this.providers) {
      if (!provider.isAvailable() || symbolsToFetch.length === 0) {
        continue;
      }

      try {
        const fetchedQuotes = await provider.getMultipleQuotes(symbolsToFetch);
        
        for (const quote of fetchedQuotes) {
          quotes.push(quote);
          this.setCachedQuote(quote.symbol, quote);
          
          // 데이터베이스에 주가 정보 저장
          await this.saveQuoteToDatabase(quote.symbol, quote);
          
          // 성공적으로 가져온 심볼은 목록에서 제거
          const index = symbolsToFetch.indexOf(quote.symbol);
          if (index > -1) {
            symbolsToFetch.splice(index, 1);
          }
        }

        // 모든 심볼을 가져왔으면 중단
        if (symbolsToFetch.length === 0) {
          break;
        }

      } catch (error) {
        console.warn(`Provider ${provider.name} failed for batch request:`, error);
        continue;
      }
    }

    return quotes;
  }

  async updatePortfolioStockPrices(portfolioId: number): Promise<void> {
    try {
      // 포트폴리오의 모든 주식 심볼 가져오기
      const sql = `
        SELECT DISTINCT s.id, s.symbol 
        FROM portfolio_holdings h
        JOIN stocks s ON h.stock_id = s.id
        WHERE h.portfolio_id = ?
      `;
      
      const stocks = await query<{ id: number; symbol: string }>(sql, [portfolioId]);
      const symbols = stocks.map(s => s.symbol);

      if (symbols.length === 0) {
        return;
      }

      // 주가 데이터 가져오기
      const quotes = await this.getMultipleStockQuotes(symbols);

      // 데이터베이스 업데이트
      for (const quote of quotes) {
        const stock = stocks.find(s => s.symbol === quote.symbol);
        if (stock) {
          await this.updateStockPriceInDatabase(stock.id, quote);
        }
      }

      console.log(`Updated prices for ${quotes.length} stocks in portfolio ${portfolioId}`);

    } catch (error) {
      console.error('Failed to update portfolio stock prices:', error);
      throw error;
    }
  }

  private getCachedQuote(symbol: string): StockQuote | null {
    const cached = this.cache.get(symbol);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(symbol);
      return null;
    }

    return cached.data;
  }

  private setCachedQuote(symbol: string, quote: StockQuote): void {
    this.cache.set(symbol, {
      data: quote,
      timestamp: Date.now()
    });
  }

  private async saveQuoteToDatabase(symbol: string, quote: StockQuote): Promise<void> {
    try {
      // 주식 ID 가져오기
      const stocks = await query<{ id: number }>('SELECT id FROM stocks WHERE symbol = ?', [symbol]);
      
      if (stocks.length === 0 || !stocks[0]) {
        console.warn(`Stock not found in database: ${symbol}`);
        return;
      }

      const stockId = stocks[0].id;
      await this.updateStockPriceInDatabase(stockId, quote);

    } catch (error) {
      console.error(`Failed to save quote to database for ${symbol}:`, error);
    }
  }

  private async updateStockPriceInDatabase(stockId: number, quote: StockQuote): Promise<void> {
    try {
      const sql = `
        INSERT OR REPLACE INTO stock_prices (
          stock_id, price, change_amount, change_percent, 
          volume, market_cap, price_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      await query(sql, [
        stockId,
        quote.price,
        quote.change,
        quote.changePercent,
        quote.volume || null,
        quote.marketCap || null,
        new Date().toISOString().split('T')[0]
      ]);
    } catch (error) {
      console.error(`Failed to update stock price in database for stock ID ${stockId}:`, error);
      throw error;
    }
  }

  // 캐시 관리
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // 제공자 상태 확인
  getProviderStatus(): Array<{ name: string; available: boolean }> {
    return this.providers.map(provider => ({
      name: provider.name,
      available: provider.isAvailable()
    }));
  }
}

// 싱글톤 인스턴스
let stockPriceServiceInstance: StockPriceService | null = null;

export function getStockPriceService(): StockPriceService {
  if (!stockPriceServiceInstance) {
    stockPriceServiceInstance = new StockPriceService();
  }
  return stockPriceServiceInstance;
}

// 편의 함수들
export async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  const service = getStockPriceService();
  return service.getStockQuote(symbol);
}

export async function fetchMultipleStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  const service = getStockPriceService();
  return service.getMultipleStockQuotes(symbols);
}

export async function updatePortfolioPrices(portfolioId: number): Promise<void> {
  const service = getStockPriceService();
  return service.updatePortfolioStockPrices(portfolioId);
}

// 정기적 가격 업데이트를 위한 스케줄러
export class StockPriceScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private service: StockPriceService;

  constructor() {
    this.service = getStockPriceService();
  }

  start(intervalMinutes: number = 5): void {
    if (this.intervalId) {
      this.stop();
    }

    console.log(`Starting stock price scheduler with ${intervalMinutes} minute intervals`);
    
    this.intervalId = setInterval(async () => {
      await this.updateAllPortfolioPrices();
    }, intervalMinutes * 60 * 1000);

    // 즉시 한 번 실행
    this.updateAllPortfolioPrices();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stock price scheduler stopped');
    }
  }

  private async updateAllPortfolioPrices(): Promise<void> {
    try {
      // 활성 포트폴리오 목록 가져오기
      const portfolios = await query<{ id: number }>('SELECT id FROM portfolios WHERE is_active = TRUE');
      
      console.log(`Updating prices for ${portfolios.length} active portfolios`);
      
      for (const portfolio of portfolios) {
        try {
          await this.service.updatePortfolioStockPrices(portfolio.id);
        } catch (error) {
          console.error(`Failed to update prices for portfolio ${portfolio.id}:`, error);
        }
      }

      console.log('Stock price update completed');

    } catch (error) {
      console.error('Failed to update portfolio prices:', error);
    }
  }
}

// 글로벌 스케줄러 인스턴스
let schedulerInstance: StockPriceScheduler | null = null;

export function getStockPriceScheduler(): StockPriceScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new StockPriceScheduler();
  }
  return schedulerInstance;
}