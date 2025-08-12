export interface BlogPost {
  id: number;
  log_no?: string;
  title: string;
  content: string;
  excerpt?: string; // 메르 블로그용 요약
  category: string | null;
  created_date: string;
  crawled_at?: string;
  updated_at?: string;
  author?: string;
  views?: number;
  likes?: number; // 메르 블로그용 좋아요
  comments?: number; // 메르 블로그용 댓글 수
  tags?: string[]; // 메르 블로그용 태그
  featured?: boolean; // 메르 블로그용 추천 포스트
  blog_type?: 'main' | 'merry'; // 블로그 타입 구분
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

// Portfolio performance calculation removed - 13F filings don't include purchase prices
// Only market value at filing date is available

// ===== 개인 포트폴리오 관리 시스템 타입 정의 =====

export interface PortfolioUser {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
  portfolio_public: boolean;
}

export interface Portfolio {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  investment_goal: 'conservative' | 'balanced' | 'aggressive' | 'custom';
  target_amount?: number;
  currency: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Stock {
  id: number;
  symbol: string;
  name: string;
  market?: string;
  country: string;
  currency: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
  description?: string;
  logo_url?: string;
  is_active: boolean;
}

export interface PortfolioHolding {
  id: number;
  portfolio_id: number;
  stock_id: number;
  stock: Stock;
  shares: number;
  avg_purchase_price: number;
  total_cost: number;
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_percent?: number;
  first_purchase_date: string;
  last_purchase_date?: string;
  weight?: number;
}

export interface Transaction {
  id: number;
  portfolio_id: number;
  stock_id: number;
  stock: Stock;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price: number;
  total_amount: number;
  commission: number;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export interface StockPrice {
  id: number;
  stock_id: number;
  price: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  volume?: number;
  change_amount?: number;
  change_percent?: number;
  market_cap?: number;
  price_date: string;
  updated_at: string;
}

export interface PortfolioPerformance {
  id: number;
  portfolio_id: number;
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
  total_return_percent: number;
  daily_change?: number;
  daily_change_percent?: number;
  cash_balance: number;
  snapshot_date: string;
  created_at: string;
}

export interface AIAnalysisReport {
  id: number;
  stock_id: number;
  stock: Stock;
  agent_type: 'goldman_sachs' | 'bloomberg' | 'blackrock' | 'robinhood';
  analysis_type: 'stock_analysis' | 'market_outlook' | 'portfolio_optimization' | 'ux_recommendation';
  title: string;
  summary: string;
  content: string;
  recommendation?: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  target_price?: number;
  confidence_score?: number;
  key_metrics?: Record<string, any>;
  created_at: string;
  expires_at?: string;
}

export interface PortfolioRecommendation {
  id: number;
  portfolio_id: number;
  recommendation_type: 'rebalancing' | 'stock_pick' | 'risk_management' | 'diversification';
  agent_type: 'goldman_sachs' | 'bloomberg' | 'blackrock';
  title: string;
  description: string;
  action_required: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expected_impact?: number;
  suggested_actions?: Record<string, any>;
  status: 'pending' | 'applied' | 'ignored' | 'expired';
  created_at: string;
  expires_at?: string;
  applied_at?: string;
}

export interface UserNotification {
  id: number;
  user_id: number;
  type: 'price_alert' | 'portfolio_update' | 'ai_recommendation' | 'system_notice';
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

export interface NPSPerformance {
  id: number;
  fund_type: string;
  return_1m?: number;
  return_3m?: number;
  return_6m?: number;
  return_1y?: number;
  return_3y?: number;
  return_5y?: number;
  return_since_inception?: number;
  aum?: number;
  data_date: string;
}

// ===== API 요청/응답 타입 =====

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  investment_goal: 'conservative' | 'balanced' | 'aggressive' | 'custom';
  target_amount?: number;
  currency?: string;
}

export interface AddHoldingRequest {
  stock_symbol: string;
  shares: number;
  purchase_price: number;
  purchase_date: string;
  notes?: string;
}

export interface AddTransactionRequest {
  stock_symbol: string;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price: number;
  transaction_date: string;
  commission?: number;
  notes?: string;
}

export interface PortfolioSummary {
  portfolio: Portfolio;
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
  total_return_percent: number;
  daily_change: number;
  daily_change_percent: number;
  cash_balance: number;
  holdings_count: number;
  last_updated: string;
}

export interface PortfolioDashboard {
  summary: PortfolioSummary;
  holdings: PortfolioHolding[];
  recent_transactions: Transaction[];
  performance_chart: PerformanceData[];
  sector_allocation: { sector: string; percentage: number; value: number }[];
  ai_recommendations: PortfolioRecommendation[];
  nps_comparison: NPSPerformance[];
}

export interface PerformanceData {
  date: string;
  value: number;
}

// ===== AI 에이전트 통합 타입 =====

export interface AIAgentRequest {
  agent_type: 'goldman_sachs' | 'bloomberg' | 'blackrock' | 'robinhood';
  action: string;
  parameters: Record<string, any>;
}

export interface AIAgentResponse {
  success: boolean;
  agent_type: string;
  data: any;
  metadata?: {
    confidence_score?: number;
    processing_time?: number;
    data_sources?: string[];
  };
  error?: string;
}