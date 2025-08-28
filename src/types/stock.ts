export interface StockPrice {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  currency: 'KRW' | 'USD' | 'JPY';
  market: 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE' | 'TSE';
  timestamp: number;
  source: 'KIS' | 'YAHOO' | 'PYKRX';
}

export interface HistoricalPrice {
  date: string; // YYYY-MM-DD format
  timestamp: number;
  price: number;
  currency: 'KRW' | 'USD' | 'JPY';
}

export interface StockMention {
  date: string;
  timestamp: number;
  price: number | null;
  postTitle: string;
  logNo: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence?: number;
  context?: string;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  sources: string[];
  discrepancy?: number;
  warnings: string[];
}

export interface StockApiResponse {
  price: StockPrice;
  validation?: ValidationResult | undefined;
  cached: boolean;
  responseTime: number;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  rateLimit: number; // requests per second
  timeout: number; // milliseconds
}

export interface MarketHours {
  open: string; // HH:MM format
  close: string;
  timezone: string;
}

export const MARKET_CONFIGS = {
  KRX: {
    open: '09:00',
    close: '15:30',
    timezone: 'Asia/Seoul'
  },
  NASDAQ: {
    open: '09:30',
    close: '16:00',
    timezone: 'America/New_York'
  }
} as const;