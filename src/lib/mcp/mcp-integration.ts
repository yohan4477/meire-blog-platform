/**
 * MCP (Model Context Protocol) 서버 통합
 * fetch, memory, time 서버를 활용한 고급 데이터 처리 및 메모리 관리
 */

import { z } from 'zod';

// MCP 메시지 타입 정의
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// MCP 툴 타입 정의
interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

// Fetch 서버 타입
interface FetchRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  follow_redirects?: boolean;
}

// Memory 서버 타입
interface MemoryEntity {
  name: string;
  entityType: string;
  observations: string[];
}

interface MemoryRelation {
  from: string;
  to: string;
  relationType: string;
}

// Time 서버 타입
interface TimeQuery {
  timezone?: string;
  format?: string;
  locale?: string;
}

// MCP 클라이언트 베이스 클래스
abstract class MCPClient {
  protected baseUrl: string;
  protected timeout: number;

  constructor(baseUrl: string, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  protected async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`MCP communication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected generateId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async listTools(): Promise<MCPTool[]> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/list'
    };

    const response = await this.sendRequest(request);
    if (response.error) {
      throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    return response.result?.tools || [];
  }

  async callTool(name: string, arguments_: any): Promise<any> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/call',
      params: {
        name,
        arguments: arguments_
      }
    };

    const response = await this.sendRequest(request);
    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return response.result;
  }
}

// Fetch MCP 클라이언트
export class FetchMCPClient extends MCPClient {
  constructor(baseUrl: string = 'http://localhost:3001') {
    super(baseUrl);
  }

  async fetch(options: FetchRequest): Promise<any> {
    return this.callTool('fetch', options);
  }

  async fetchJSON(url: string, options?: Partial<FetchRequest>): Promise<any> {
    const result = await this.fetch({
      url,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      ...options
    });

    try {
      return JSON.parse(result.content);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fetchWithRetry(
    options: FetchRequest, 
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.fetch(options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          console.warn(`Fetch attempt ${attempt} failed, retrying in ${retryDelay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    throw lastError || new Error('Fetch failed after all retries');
  }

  // 공공데이터 API 호출 래퍼
  async fetchPublicData(apiUrl: string, apiKey: string, params: Record<string, any>): Promise<any> {
    const url = new URL(apiUrl);
    url.searchParams.append('serviceKey', apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return this.fetchJSON(url.toString(), {
      timeout: 30000,
      headers: {
        'User-Agent': 'MeireBlogPlatform/1.0'
      }
    });
  }

  // 주식 API 호출 래퍼
  async fetchStockData(provider: 'yahoo' | 'alphavantage', endpoint: string, params: Record<string, any>): Promise<any> {
    const baseUrls = {
      yahoo: 'https://query1.finance.yahoo.com',
      alphavantage: 'https://www.alphavantage.co/query'
    };

    const url = new URL(`${baseUrls[provider]}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    return this.fetchJSON(url.toString(), {
      timeout: 15000,
      headers: {
        'User-Agent': 'MeireBlogPlatform/1.0'
      }
    });
  }
}

// Memory MCP 클라이언트
export class MemoryMCPClient extends MCPClient {
  constructor(baseUrl: string = 'http://localhost:3002') {
    super(baseUrl);
  }

  async createEntities(entities: MemoryEntity[]): Promise<any> {
    return this.callTool('create_entities', { entities });
  }

  async createEntity(name: string, entityType: string, observations: string[]): Promise<any> {
    return this.createEntities([{ name, entityType, observations }]);
  }

  async createRelations(relations: MemoryRelation[]): Promise<any> {
    return this.callTool('create_relations', { relations });
  }

  async createRelation(from: string, to: string, relationType: string): Promise<any> {
    return this.createRelations([{ from, to, relationType }]);
  }

  async addObservations(observations: Array<{ entityName: string; contents: string[] }>): Promise<any> {
    return this.callTool('add_observations', { observations });
  }

  async addObservation(entityName: string, content: string): Promise<any> {
    return this.addObservations([{ entityName, contents: [content] }]);
  }

  async searchNodes(query: string): Promise<any> {
    return this.callTool('search_nodes', { query });
  }

  async openNodes(names: string[]): Promise<any> {
    return this.callTool('open_nodes', { names });
  }

  async readGraph(): Promise<any> {
    return this.callTool('read_graph', {});
  }

  async deleteEntities(entityNames: string[]): Promise<any> {
    return this.callTool('delete_entities', { entityNames });
  }

  async deleteRelations(relations: MemoryRelation[]): Promise<any> {
    return this.callTool('delete_relations', { relations });
  }

  // 포트폴리오 지식 그래프 구축
  async buildPortfolioKnowledgeGraph(portfolioData: any): Promise<void> {
    try {
      // 포트폴리오 엔티티 생성
      await this.createEntity(
        portfolioData.name || 'UserPortfolio',
        'Portfolio',
        [
          `Created at ${portfolioData.createdAt || new Date().toISOString()}`,
          `Total value: ${portfolioData.totalValue || 'Unknown'}`,
          `Holdings count: ${portfolioData.holdings?.length || 0}`
        ]
      );

      // 주식 엔티티들 생성
      if (portfolioData.holdings) {
        const stockEntities = portfolioData.holdings.map((holding: any) => ({
          name: holding.symbol,
          entityType: 'Stock',
          observations: [
            `Company: ${holding.companyName || 'Unknown'}`,
            `Shares: ${holding.shares}`,
            `Current price: ${holding.currentPrice || 'Unknown'}`,
            `Sector: ${holding.sector || 'Unknown'}`
          ]
        }));

        await this.createEntities(stockEntities);

        // 포트폴리오-주식 관계 생성
        const relations = portfolioData.holdings.map((holding: any) => ({
          from: portfolioData.name || 'UserPortfolio',
          to: holding.symbol,
          relationType: 'holds'
        }));

        await this.createRelations(relations);
      }

      // 시장 데이터와의 관계 생성 (NPS 비교 등)
      if (portfolioData.npsComparison) {
        await this.createEntity('NPS', 'InstitutionalInvestor', [
          'National Pension Service of Korea',
          'Large institutional investor',
          'Benchmark for comparison'
        ]);

        // 공통 보유 종목 관계
        if (portfolioData.npsComparison.commonHoldings) {
          const npsRelations = portfolioData.npsComparison.commonHoldings.map((holding: any) => ({
            from: 'NPS',
            to: holding.symbol,
            relationType: 'also_holds'
          }));

          await this.createRelations(npsRelations);
        }
      }

    } catch (error) {
      console.error('Failed to build portfolio knowledge graph:', error);
      throw error;
    }
  }

  // 투자 인사이트 검색
  async searchInvestmentInsights(query: string): Promise<any> {
    const results = await this.searchNodes(query);
    
    // 결과를 분석하여 투자 관련 인사이트 추출
    const insights = {
      relevantStocks: [],
      marketTrends: [],
      riskFactors: [],
      opportunities: []
    };

    // 간단한 키워드 기반 분류
    if (results.nodes) {
      results.nodes.forEach((node: any) => {
        const content = node.observations?.join(' ').toLowerCase() || '';
        
        if (node.entityType === 'Stock') {
          insights.relevantStocks.push(node);
        }
        
        if (content.includes('risk') || content.includes('volatility')) {
          insights.riskFactors.push(node);
        }
        
        if (content.includes('growth') || content.includes('opportunity')) {
          insights.opportunities.push(node);
        }
        
        if (content.includes('trend') || content.includes('market')) {
          insights.marketTrends.push(node);
        }
      });
    }

    return insights;
  }
}

// Time MCP 클라이언트
export class TimeMCPClient extends MCPClient {
  constructor(baseUrl: string = 'http://localhost:3003') {
    super(baseUrl);
  }

  async getCurrentTime(options?: TimeQuery): Promise<any> {
    return this.callTool('get_current_time', options || {});
  }

  async getTimezone(timezone: string): Promise<any> {
    return this.callTool('get_timezone_info', { timezone });
  }

  async formatTime(timestamp: string, format: string, timezone?: string): Promise<any> {
    return this.callTool('format_time', { timestamp, format, timezone });
  }

  async getMarketHours(market: string, date?: string): Promise<any> {
    // 주요 시장 영업시간 조회
    const marketTimezones = {
      'NYSE': 'America/New_York',
      'NASDAQ': 'America/New_York',
      'LSE': 'Europe/London',
      'TSE': 'Asia/Tokyo',
      'KRX': 'Asia/Seoul',
      'SSE': 'Asia/Shanghai'
    };

    const timezone = marketTimezones[market as keyof typeof marketTimezones] || 'UTC';
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const timeInfo = await this.getTimezone(timezone);
      
      // 간단한 시장 시간 계산 (실제로는 더 복잡한 로직 필요)
      const marketHours = {
        'NYSE': { open: '09:30', close: '16:00' },
        'NASDAQ': { open: '09:30', close: '16:00' },
        'LSE': { open: '08:00', close: '16:30' },
        'TSE': { open: '09:00', close: '15:00' },
        'KRX': { open: '09:00', close: '15:30' },
        'SSE': { open: '09:30', close: '15:00' }
      };

      const hours = marketHours[market as keyof typeof marketHours];
      
      return {
        market,
        date: targetDate,
        timezone,
        marketOpen: hours?.open,
        marketClose: hours?.close,
        currentTime: timeInfo.current_time,
        isMarketOpen: this.isMarketCurrentlyOpen(market, timeInfo.current_time)
      };
    } catch (error) {
      throw new Error(`Failed to get market hours: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private isMarketCurrentlyOpen(market: string, currentTime: string): boolean {
    // 간단한 시장 개장 여부 확인 (실제로는 휴일, 특별 거래일 등 고려 필요)
    const now = new Date(currentTime);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // 주말 제외
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    
    // 시장별 개장 시간 (분 단위)
    const marketHours = {
      'NYSE': { open: 9 * 60 + 30, close: 16 * 60 }, // 9:30 - 16:00
      'NASDAQ': { open: 9 * 60 + 30, close: 16 * 60 },
      'KRX': { open: 9 * 60, close: 15 * 60 + 30 }, // 9:00 - 15:30
      'TSE': { open: 9 * 60, close: 15 * 60 }
    };
    
    const hours_info = marketHours[market as keyof typeof marketHours];
    if (!hours_info) return false;
    
    return currentMinutes >= hours_info.open && currentMinutes <= hours_info.close;
  }

  // 거래 일정 관리
  async getNextTradingDay(market: string, fromDate?: string): Promise<any> {
    const startDate = fromDate ? new Date(fromDate) : new Date();
    
    // 다음 거래일 찾기 (간단한 구현 - 실제로는 휴일 캘린더 필요)
    let nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) { // 주말 건너뛰기
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    const marketHours = await this.getMarketHours(market, nextDay.toISOString().split('T')[0]);
    
    return {
      market,
      nextTradingDay: nextDay.toISOString().split('T')[0],
      marketHours
    };
  }
}

// 통합 MCP 매니저 클래스
export class MCPManager {
  private fetchClient: FetchMCPClient;
  private memoryClient: MemoryMCPClient;
  private timeClient: TimeMCPClient;

  constructor(
    fetchUrl?: string,
    memoryUrl?: string,
    timeUrl?: string
  ) {
    this.fetchClient = new FetchMCPClient(fetchUrl);
    this.memoryClient = new MemoryMCPClient(memoryUrl);
    this.timeClient = new TimeMCPClient(timeUrl);
  }

  // 모든 서버 상태 확인
  async healthCheck(): Promise<{ fetch: boolean; memory: boolean; time: boolean }> {
    const results = await Promise.allSettled([
      this.fetchClient.listTools(),
      this.memoryClient.listTools(),
      this.timeClient.listTools()
    ]);

    return {
      fetch: results[0].status === 'fulfilled',
      memory: results[1].status === 'fulfilled',
      time: results[2].status === 'fulfilled'
    };
  }

  // 통합 포트폴리오 분석 워크플로우
  async analyzePortfolioWithMCP(
    portfolioData: any,
    includeExternalData: boolean = true
  ): Promise<any> {
    try {
      // 1. 시간 정보 수집
      const currentTime = await this.timeClient.getCurrentTime({ timezone: 'Asia/Seoul' });
      
      // 2. 메모리에 포트폴리오 지식 그래프 구축
      await this.memoryClient.buildPortfolioKnowledgeGraph(portfolioData);
      
      // 3. 외부 데이터 수집 (옵션)
      let externalData = {};
      if (includeExternalData && portfolioData.holdings) {
        const fetchPromises = portfolioData.holdings.slice(0, 5).map(async (holding: any) => {
          try {
            // Yahoo Finance에서 추가 정보 수집
            const stockData = await this.fetchClient.fetchStockData('yahoo', '/v8/finance/chart/' + holding.symbol, {
              interval: '1d',
              range: '5d'
            });
            return { symbol: holding.symbol, data: stockData };
          } catch (error) {
            console.warn(`Failed to fetch data for ${holding.symbol}:`, error);
            return null;
          }
        });

        const results = await Promise.allSettled(fetchPromises);
        const successfulFetches = results
          .filter(result => result.status === 'fulfilled' && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<any>).value);

        externalData = { stockData: successfulFetches };
      }

      // 4. 지식 그래프에서 인사이트 검색
      const insights = await this.memoryClient.searchInvestmentInsights(
        `portfolio risk diversification ${portfolioData.holdings?.map((h: any) => h.symbol).join(' ')}`
      );

      // 5. 시장 시간 정보
      const marketStatus = await Promise.allSettled(
        ['NYSE', 'KRX'].map(market => this.timeClient.getMarketHours(market))
      );

      // 6. 결과 조합
      return {
        analysisTimestamp: currentTime.current_time,
        portfolio: portfolioData,
        externalData,
        insights,
        marketStatus: marketStatus.map((result, index) => ({
          market: ['NYSE', 'KRX'][index],
          status: result.status,
          data: result.status === 'fulfilled' ? result.value : null
        })),
        recommendations: this.generateMCPRecommendations(insights, externalData)
      };

    } catch (error) {
      console.error('MCP portfolio analysis failed:', error);
      throw error;
    }
  }

  // 정기적 데이터 수집 및 메모리 업데이트
  async scheduledDataUpdate(portfolioData: any): Promise<void> {
    try {
      // 1. 현재 시간 확인
      const currentTime = await this.timeClient.getCurrentTime();
      
      // 2. 각 보유 종목에 대한 최신 관찰 데이터 수집
      if (portfolioData.holdings) {
        for (const holding of portfolioData.holdings) {
          try {
            // 최신 주가 데이터 가져오기
            const stockData = await this.fetchClient.fetchStockData('yahoo', '/v8/finance/chart/' + holding.symbol, {
              interval: '1d',
              range: '1d'
            });

            // 메모리에 새로운 관찰 데이터 추가
            const observations = [
              `Price update at ${currentTime.current_time}: ${stockData.chart?.result?.[0]?.meta?.regularMarketPrice || 'N/A'}`,
              `Volume: ${stockData.chart?.result?.[0]?.meta?.regularMarketVolume || 'N/A'}`,
              `Daily change: ${stockData.chart?.result?.[0]?.meta?.regularMarketPrice - stockData.chart?.result?.[0]?.meta?.previousClose || 'N/A'}`
            ];

            await this.memoryClient.addObservation(holding.symbol, observations.join('; '));

          } catch (error) {
            console.warn(`Failed to update data for ${holding.symbol}:`, error);
          }
        }
      }

      console.log(`Scheduled data update completed at ${currentTime.current_time}`);
    } catch (error) {
      console.error('Scheduled data update failed:', error);
    }
  }

  private generateMCPRecommendations(insights: any, externalData: any): string[] {
    const recommendations = [];

    // 인사이트 기반 추천
    if (insights.riskFactors?.length > 0) {
      recommendations.push('Consider reviewing high-risk positions identified in your portfolio');
    }

    if (insights.opportunities?.length > 0) {
      recommendations.push('Explore growth opportunities found in market analysis');
    }

    // 외부 데이터 기반 추천
    if (externalData.stockData?.length > 0) {
      const volatileStocks = externalData.stockData.filter((stock: any) => {
        const change = Math.abs(stock.data?.chart?.result?.[0]?.meta?.regularMarketPrice - 
                               stock.data?.chart?.result?.[0]?.meta?.previousClose || 0);
        return change > 5; // 5달러 이상 변동
      });

      if (volatileStocks.length > 0) {
        recommendations.push(`Monitor volatile positions: ${volatileStocks.map((s: any) => s.symbol).join(', ')}`);
      }
    }

    return recommendations;
  }

  // 클라이언트 접근자
  get fetch(): FetchMCPClient { return this.fetchClient; }
  get memory(): MemoryMCPClient { return this.memoryClient; }
  get time(): TimeMCPClient { return this.timeClient; }
}

// 싱글톤 MCP 매니저 인스턴스
let mcpManagerInstance: MCPManager | null = null;

export function getMCPManager(): MCPManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new MCPManager(
      process.env.MCP_FETCH_URL,
      process.env.MCP_MEMORY_URL,
      process.env.MCP_TIME_URL
    );
  }
  return mcpManagerInstance;
}

// 환경 변수 검증
export function validateMCPConfig(): { valid: boolean; missing: string[] } {
  const optional = ['MCP_FETCH_URL', 'MCP_MEMORY_URL', 'MCP_TIME_URL'];
  const missing = optional.filter(key => !process.env[key]);
  
  // MCP는 선택사항이므로 경고만 출력
  if (missing.length > 0) {
    console.warn('MCP servers not configured:', missing);
  }
  
  return {
    valid: true, // MCP는 선택사항
    missing
  };
}