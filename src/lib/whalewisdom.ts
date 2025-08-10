import crypto from 'crypto';
import { WhaleWisdomConfig, WhaleWisdomApiResponse, ScionPortfolio, ScionHolding } from '@/types';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';
import { 
  WhaleWisdomError, 
  RateLimitError, 
  AuthenticationError, 
  DataNotFoundError,
  APIError,
  handleApiError,
  withRetry,
  logError
} from './errors';

export class WhaleWisdomClient {
  private config: WhaleWisdomConfig;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private resetTime: number = 0;

  constructor() {
    this.config = {
      apiUrl: process.env.WHALEWISDOM_API_URL || 'https://whalewisdom.com/shell/command',
      accessKey: process.env.WHALEWISDOM_ACCESS_KEY || '',
      secretKey: process.env.WHALEWISDOM_SECRET_KEY || '',
      rateLimit: parseInt(process.env.WHALEWISDOM_RATE_LIMIT || '20'),
      rateWindow: parseInt(process.env.WHALEWISDOM_RATE_WINDOW || '60000'),
    };
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset rate limit counter if window has passed
    if (now - this.resetTime >= this.config.rateWindow) {
      this.requestCount = 0;
      this.resetTime = now;
    }

    // Check if we've hit the rate limit
    if (this.requestCount >= this.config.rateLimit) {
      const waitTime = this.config.rateWindow - (now - this.resetTime);
      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.resetTime = Date.now();
      }
    }

    // Ensure minimum delay between requests (3 seconds)
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 3000) {
      await new Promise(resolve => setTimeout(resolve, 3000 - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(payload)
      .digest('hex');
  }

  private async makeApiRequest(command: any): Promise<WhaleWisdomApiResponse> {
    if (!this.config.accessKey || !this.config.secretKey) {
      throw new AuthenticationError('WhaleWisdom API credentials not configured');
    }

    await this.rateLimit();

    const payload = JSON.stringify(command);
    const signature = this.generateSignature(payload);

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': this.config.accessKey,
          'X-Signature': signature,
        },
        body: payload,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          throw new RateLimitError(
            'Rate limit exceeded', 
            retryAfter ? parseInt(retryAfter) * 1000 : undefined
          );
        }
        
        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError(`Authentication failed: ${response.status}`);
        }
        
        if (response.status === 404) {
          throw new DataNotFoundError('Requested data not found');
        }
        
        throw new APIError(`HTTP error! status: ${response.status}`, response.status);
      }

      const data = await response.json();
      
      if (!data || data.error) {
        throw new APIError(data?.error || 'API returned error response');
      }
      
      return { success: true, data };
    } catch (error) {
      const whaleWisdomError = handleApiError(error);
      logError(whaleWisdomError, `API request for command: ${command.command}`);
      throw whaleWisdomError;
    }
  }

  async findScionFilerId(): Promise<number | null> {
    const command = {
      command: 'filer_lookup',
      name: 'scion',
    };

    const response = await this.makeApiRequest(command);
    
    if (!response.success || !response.data) {
      console.error('Failed to find Scion filer ID:', response.error);
      return null;
    }

    // Look for Scion Asset Management LLC in the results
    const filers = response.data.filers || [];
    const scionFiler = filers.find((filer: any) => 
      filer.name?.toLowerCase().includes('scion asset management')
    );

    return scionFiler?.id || null;
  }

  async getScionHoldings(filerId?: number): Promise<ScionPortfolio | null> {
    let targetFilerId = filerId;
    
    if (!targetFilerId) {
      targetFilerId = await this.findScionFilerId();
      if (!targetFilerId) {
        throw new Error('Could not find Scion Asset Management filer ID');
      }
    }

    const command = {
      command: 'holdings',
      filer_ids: [targetFilerId],
      limit: 50, // Get top 50 holdings
    };

    const response = await this.makeApiRequest(command);
    
    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch Scion holdings: ${response.error}`);
    }

    return this.transformApiResponse(response.data, targetFilerId);
  }

  private transformApiResponse(data: any, filerId: number): ScionPortfolio {
    const holdings: ScionHolding[] = (data.holdings || []).map((holding: any) => ({
      ticker: holding.ticker || '',
      name: holding.name || '',
      securityType: holding.security_type || 'Stock',
      shares: parseInt(holding.shares) || 0,
      marketValue: parseFloat(holding.market_value) || 0,
      portfolioPercent: parseFloat(holding.portfolio_percent) || 0,
      rank: parseInt(holding.rank) || 0,
      change: holding.change ? {
        shares: parseInt(holding.change.shares) || 0,
        marketValue: parseFloat(holding.change.market_value) || 0,
        type: holding.change.type || 'unchanged',
      } : undefined,
    }));

    // Calculate total portfolio value
    const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);

    return {
      filerName: 'Scion Asset Management LLC',
      filerId: filerId,
      quarter: data.quarter || 'Q1 2025',
      reportDate: data.report_date || new Date().toISOString().split('T')[0],
      totalValue: totalValue,
      totalPositions: holdings.length,
      holdings: holdings.sort((a, b) => b.portfolioPercent - a.portfolioPercent),
      lastUpdated: new Date().toISOString(),
    };
  }

  async getScionHoldingsComparison(quarters?: string[]): Promise<any> {
    const filerId = await this.findScionFilerId();
    if (!filerId) {
      throw new Error('Could not find Scion Asset Management filer ID');
    }

    const command = {
      command: 'holdings_comparison',
      filer_id: filerId,
      quarters: quarters || ['latest', 'previous'], // Compare latest vs previous quarter
    };

    const response = await this.makeApiRequest(command);
    
    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch Scion holdings comparison: ${response.error}`);
    }

    return response.data;
  }
}

// Singleton instance
let whaleWisdomClient: WhaleWisdomClient | null = null;

export function getWhaleWisdomClient(): WhaleWisdomClient {
  if (!whaleWisdomClient) {
    whaleWisdomClient = new WhaleWisdomClient();
  }
  return whaleWisdomClient;
}

export async function getCachedScionHoldings(): Promise<ScionPortfolio | null> {
  // Check cache first
  const cached = cache.get<ScionPortfolio>(CACHE_KEYS.SCION_HOLDINGS);
  if (cached) {
    console.log('Returning cached Scion holdings');
    return cached;
  }

  try {
    const client = getWhaleWisdomClient();
    
    // Use retry mechanism for robustness
    const holdings = await withRetry(
      () => client.getScionHoldings(),
      3, // max retries
      2000 // base delay: 2 seconds
    );
    
    if (holdings) {
      // Cache the result
      cache.set(CACHE_KEYS.SCION_HOLDINGS, holdings, CACHE_TTL.SCION_HOLDINGS);
      console.log('Scion holdings fetched and cached successfully');
    }
    
    return holdings;
  } catch (error) {
    const whaleWisdomError = handleApiError(error);
    logError(whaleWisdomError, 'getCachedScionHoldings');
    
    // Return stale cached data if available
    const staleData = cache.getStale<ScionPortfolio>(CACHE_KEYS.SCION_HOLDINGS);
    if (staleData) {
      console.log('Returning stale cached data due to API error');
      return staleData;
    }
    
    return null;
  }
}