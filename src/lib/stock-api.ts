/**
 * Stock Price API Integration
 * Provides real-time stock price data for portfolio analysis
 */

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketCap?: number;
  volume?: number;
  lastUpdated: string;
}

interface StockApiResponse {
  success: boolean;
  data?: StockQuote[];
  error?: string;
  cached?: boolean;
}

// Stock price cache (in-memory for now)
const priceCache = new Map<string, { data: StockQuote; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get stock quote from Yahoo Finance (free tier)
 * Uses Yahoo Finance API through RapidAPI or direct scraping
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    // Check cache first
    const cacheKey = symbol.toUpperCase();
    const cached = priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📈 Cache hit for ${symbol}`);
      return cached.data;
    }

    console.log(`🔍 Fetching live price for ${symbol}...`);

    // Try Yahoo Finance query API (public endpoint)
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response format from Yahoo Finance');
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    
    if (!meta || !quote) {
      throw new Error('Missing price data in Yahoo Finance response');
    }

    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    const stockQuote: StockQuote = {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      previousClose: previousClose,
      marketCap: meta.marketCap,
      volume: meta.regularMarketVolume,
      lastUpdated: new Date().toISOString()
    };

    // Cache the result
    priceCache.set(cacheKey, {
      data: stockQuote,
      timestamp: Date.now()
    });

    return stockQuote;

  } catch (error) {
    console.error(`❌ Error fetching stock price for ${symbol}:`, error);
    
    // Return cached data if available, even if expired
    const cached = priceCache.get(symbol.toUpperCase());
    if (cached) {
      console.log(`⚠️ Using stale cache for ${symbol}`);
      return { ...cached.data, lastUpdated: cached.data.lastUpdated + ' (stale)' };
    }
    
    return null;
  }
}

/**
 * Get multiple stock quotes in batch
 */
export async function getMultipleStockQuotes(symbols: string[]): Promise<StockApiResponse> {
  try {
    const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];
    console.log(`📊 Fetching quotes for ${uniqueSymbols.length} symbols...`);

    // Fetch quotes with delay to avoid rate limiting
    const quotes: StockQuote[] = [];
    const errors: string[] = [];

    for (let i = 0; i < uniqueSymbols.length; i++) {
      const symbol = uniqueSymbols[i];
      
      try {
        const quote = await getStockQuote(symbol);
        if (quote) {
          quotes.push(quote);
        } else {
          errors.push(`No data for ${symbol}`);
        }
      } catch (error) {
        errors.push(`Error fetching ${symbol}: ${error}`);
      }

      // Add delay between requests to avoid rate limiting
      if (i < uniqueSymbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: true,
      data: quotes,
      error: errors.length > 0 ? `Some symbols failed: ${errors.join(', ')}` : undefined
    };

  } catch (error) {
    console.error('❌ Batch stock quote error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calculate portfolio performance metrics
 */
export interface PortfolioPerformance {
  symbol: string;
  shares: number;
  averageCost: number; // 평단가
  currentPrice: number; // 현재가
  marketValue: number; // 현재 시가총액
  totalCost: number; // 총 매수금액
  unrealizedPnL: number; // 미실현 손익
  returnPercent: number; // 수익률 %
  returnDollar: number; // 수익 금액
}

export function calculatePortfolioPerformance(
  holdings: Array<{
    name: string;
    shares: number;
    marketValue: number;
    averageCost?: number;
  }>,
  stockQuotes: StockQuote[]
): PortfolioPerformance[] {
  const results: PortfolioPerformance[] = [];

  for (const holding of holdings) {
    // Find matching stock quote
    const quote = stockQuotes.find(q => 
      holding.name.includes(q.symbol) || 
      q.symbol.includes(holding.name.split(' ')[0])
    );

    if (!quote) {
      console.warn(`⚠️ No price data found for ${holding.name}`);
      continue;
    }

    const currentPrice = quote.price;
    const averageCost = holding.averageCost || (holding.marketValue / holding.shares);
    const marketValue = holding.shares * currentPrice;
    const totalCost = holding.shares * averageCost;
    const unrealizedPnL = marketValue - totalCost;
    const returnPercent = ((currentPrice - averageCost) / averageCost) * 100;
    const returnDollar = unrealizedPnL;

    results.push({
      symbol: quote.symbol,
      shares: holding.shares,
      averageCost,
      currentPrice,
      marketValue,
      totalCost,
      unrealizedPnL,
      returnPercent,
      returnDollar
    });
  }

  return results;
}

/**
 * Get cached stock quotes (for displaying last known prices)
 */
export function getCachedQuotes(): StockQuote[] {
  const cached: StockQuote[] = [];
  
  for (const [symbol, { data, timestamp }] of priceCache.entries()) {
    const age = Date.now() - timestamp;
    const isStale = age > CACHE_DURATION;
    
    cached.push({
      ...data,
      lastUpdated: isStale ? data.lastUpdated + ' (stale)' : data.lastUpdated
    });
  }
  
  return cached;
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
  console.log('🧹 Price cache cleared');
}

// Export types
export type { StockQuote, StockApiResponse, PortfolioPerformance };