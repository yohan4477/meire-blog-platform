export interface BlogPost {
  id: number;
  log_no: string;
  title: string;
  content: string;
  category: string | null;
  created_date: string;
  crawled_at: string;
  updated_at: string;
}

export interface PostFilters {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PostMetadata {
  totalCount: number;
  categories: { name: string; count: number }[];
  recentPosts: BlogPost[];
}

// National Pension Service & SEC EDGAR Types
export interface ScionHolding {
  ticker: string;
  name: string;
  securityType: string;
  shares: number;
  marketValue: number;
  portfolioPercent: number;
  rank: number;
  change?: {
    shares?: number;
    marketValue?: number;
    type: 'new' | 'increased' | 'decreased' | 'sold' | 'unchanged';
    quarterlyTrend?: {
      Q2_2025?: { shares: number; marketValue: number };
      Q1_2025?: { shares: number; marketValue: number };
      Q4_2024?: { shares: number; marketValue: number };
      Q3_2024?: { shares: number; marketValue: number };
    };
  };
}

export interface ScionPortfolio {
  filerName: string;
  filerId: number;
  quarter: string;
  reportDate: string;
  totalValue: number;
  totalPositions: number;
  holdings: ScionHolding[];
  lastUpdated: string;
}

export interface WhaleWisdomApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface WhaleWisdomConfig {
  apiUrl: string;
  accessKey: string;
  secretKey: string;
  rateLimit: number;
  rateWindow: number;
}

// ===== STANDARDIZED API RESPONSE TYPES =====

// Generic API Response wrapper for all endpoints
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  meta?: ApiMeta;
}

// Standardized error structure
export interface ApiError {
  code: string;
  message: string;
  details?: string;
  statusCode?: number;
  timestamp: string;
  field?: string; // For validation errors
}

// Metadata for pagination and additional info
export interface ApiMeta {
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  limit?: number;
  offset?: number;
  requestId?: string;
  processingTime?: number;
}

// Specific response types
export interface PostsApiResponse extends ApiResponse<BlogPost[]> {
  meta: ApiMeta & {
    totalCount: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface PostApiResponse extends ApiResponse<BlogPost> {}
export interface CategoriesApiResponse extends ApiResponse<Array<{ name: string; count: number }>> {}
export interface ScionApiResponse extends ApiResponse<ScionPortfolio> {}

// ===== VALIDATION TYPES =====

// Input validation schemas
export interface PostFiltersValidated {
  category?: string;
  search?: string;
  limit: number;
  offset: number;
}

export interface CreatePostValidated {
  title: string;
  content: string;
  category?: string;
}

export interface UpdatePostValidated {
  title?: string;
  content?: string;
  category?: string;
}

// ===== COMPONENT PROP TYPES =====

// Loading states
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
}

// Error states
export interface ErrorState {
  hasError: boolean;
  error?: ApiError | Error | string;
  retry?: () => void;
  isRetrying?: boolean;
}

// Combined state for data fetching
export interface DataState<T> extends LoadingState, ErrorState {
  data?: T;
  lastUpdated?: Date;
}

// ===== STOCK PRICE API TYPES =====

// Real-time stock quote data
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketCap?: number;
  volume?: number;
  lastUpdated: string;
}

// Stock API response wrapper
export interface StockApiResponse {
  success: boolean;
  data?: StockQuote[];
  error?: string;
  cached?: boolean;
}

// Portfolio performance metrics with profit/loss calculation
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

// Enhanced holding with real-time price data
export interface EnhancedHolding extends ScionHolding {
  currentPrice?: number;
  actualAveragePrice?: number; // 실제 평단가
  profitLoss?: number;
  profitLossPercent?: number;
  lastUpdated?: string;
}