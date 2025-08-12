/**
 * 공공데이터 API 클라이언트
 * 국민연금, 한국거래소, 금융감독원 등의 공공데이터 API 통합 클라이언트
 */

import { z } from 'zod';

// API 응답 타입 정의
export interface NPSInvestmentData {
  dataDate: string;
  fundCode: string;
  fundName: string;
  stockCode?: string;
  stockName?: string;
  shares?: number;
  marketValue?: number;
  ratio?: number;
  changeFromPrev?: number;
  sector?: string;
  industry?: string;
}

export interface KRXMarketData {
  dataDate: string;
  marketType: 'KOSPI' | 'KOSDAQ' | 'KONEX';
  stockCode: string;
  stockName: string;
  closingPrice?: number;
  openingPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
  transactionAmount?: number;
  marketCap?: number;
  listedShares?: number;
  foreignOwnershipRatio?: number;
  institutionalOwnershipRatio?: number;
  individualOwnershipRatio?: number;
}

export interface FSSDisclosureData {
  disclosureId: string;
  companyCode: string;
  companyName: string;
  disclosureType: string;
  disclosureTitle: string;
  disclosureContent?: string;
  disclosureDate: string;
  submissionDate?: string;
  keywords?: string[];
  materialityScore?: number;
  sentimentScore?: number;
  marketImpactExpected?: boolean;
  documentUrl?: string;
}

// 요청 파라미터 스키마
const NPSInvestmentParamsSchema = z.object({
  serviceKey: z.string(),
  pageNo: z.number().optional().default(1),
  numOfRows: z.number().optional().default(100),
  resultType: z.literal('json').optional().default('json'),
  basDt: z.string().optional(), // 기준일자 (YYYYMMDD)
  fundNm: z.string().optional(), // 펀드명
});

const KRXMarketParamsSchema = z.object({
  serviceKey: z.string(),
  pageNo: z.number().optional().default(1),
  numOfRows: z.number().optional().default(100),
  resultType: z.literal('json').optional().default('json'),
  basDt: z.string().optional(), // 기준일자 (YYYYMMDD)
  mrktCls: z.enum(['KOSPI', 'KOSDAQ', 'KONEX']).optional(),
});

const FSSDisclosureParamsSchema = z.object({
  crtfc_key: z.string(),
  corp_code: z.string().optional(),
  bgn_de: z.string().optional(), // 시작일자 (YYYYMMDD)
  end_de: z.string().optional(), // 종료일자 (YYYYMMDD)
  page_no: z.number().optional().default(1),
  page_count: z.number().optional().default(100),
});

type NPSInvestmentParams = z.infer<typeof NPSInvestmentParamsSchema>;
type KRXMarketParams = z.infer<typeof KRXMarketParamsSchema>;
type FSSDisclosureParams = z.infer<typeof FSSDisclosureParamsSchema>;

// API 클라이언트 설정
interface APIConfig {
  baseUrl: string;
  defaultParams?: Record<string, any>;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  timeout: number;
}

// 에러 타입 정의
export class PublicDataAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public apiName?: string,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'PublicDataAPIError';
  }
}

// Rate Limiter 클래스
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(apiName: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(apiName) || [];
    
    // 윈도우 시간 내의 요청만 유지
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(apiName, validRequests);
    return true;
  }

  getNextAvailableTime(apiName: string, limit: number, windowMs: number): number {
    const requests = this.requests.get(apiName) || [];
    if (requests.length < limit) return 0;
    
    const oldestRequest = Math.min(...requests);
    return Math.max(0, windowMs - (Date.now() - oldestRequest));
  }
}

// 메인 공공데이터 API 클라이언트
export class PublicDataAPIClient {
  private rateLimiter = new RateLimiter();
  
  private configs: Map<string, APIConfig> = new Map([
    ['nps', {
      baseUrl: 'https://apis.data.go.kr/1160100/service/GetNpsPblicFundInvstDtlsService',
      rateLimit: { requestsPerMinute: 300, requestsPerDay: 10000 },
      timeout: 30000
    }],
    ['krx', {
      baseUrl: 'https://apis.data.go.kr/1160100/service/GetKrxListedInfoService',
      rateLimit: { requestsPerMinute: 600, requestsPerDay: 20000 },
      timeout: 30000
    }],
    ['fss', {
      baseUrl: 'https://opendart.fss.or.kr/api',
      rateLimit: { requestsPerMinute: 1000, requestsPerDay: 30000 },
      timeout: 30000
    }]
  ]);

  constructor(private apiKeys: Record<string, string>) {}

  /**
   * 국민연금 투자현황 데이터 조회
   */
  async getNPSInvestmentData(params: Partial<NPSInvestmentParams>): Promise<NPSInvestmentData[]> {
    const apiName = 'nps';
    const config = this.configs.get(apiName)!;
    
    // Rate limiting 확인
    if (!this.rateLimiter.canMakeRequest(apiName, config.rateLimit.requestsPerMinute, 60000)) {
      const waitTime = this.rateLimiter.getNextAvailableTime(apiName, config.rateLimit.requestsPerMinute, 60000);
      throw new PublicDataAPIError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        429,
        apiName
      );
    }

    // 파라미터 검증
    const validatedParams = NPSInvestmentParamsSchema.parse({
      serviceKey: this.apiKeys.nps,
      ...params
    });

    try {
      const url = new URL(`${config.baseUrl}/getNpsPblicFundInvstDtls`);
      Object.entries(validatedParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MeireBlogPlatform/1.0'
        },
        signal: AbortSignal.timeout(config.timeout)
      });

      if (!response.ok) {
        throw new PublicDataAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          apiName,
          url.pathname
        );
      }

      const data = await response.json();
      
      // API 응답 구조에 따라 데이터 파싱
      if (data.response?.header?.resultCode !== '00') {
        throw new PublicDataAPIError(
          `API Error: ${data.response?.header?.resultMsg || 'Unknown error'}`,
          undefined,
          apiName
        );
      }

      const items = data.response?.body?.items?.item || [];
      return this.transformNPSData(Array.isArray(items) ? items : [items]);

    } catch (error) {
      if (error instanceof PublicDataAPIError) {
        throw error;
      }
      throw new PublicDataAPIError(
        `Failed to fetch NPS investment data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        apiName
      );
    }
  }

  /**
   * 한국거래소 시장 데이터 조회
   */
  async getKRXMarketData(params: Partial<KRXMarketParams>): Promise<KRXMarketData[]> {
    const apiName = 'krx';
    const config = this.configs.get(apiName)!;
    
    if (!this.rateLimiter.canMakeRequest(apiName, config.rateLimit.requestsPerMinute, 60000)) {
      const waitTime = this.rateLimiter.getNextAvailableTime(apiName, config.rateLimit.requestsPerMinute, 60000);
      throw new PublicDataAPIError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        429,
        apiName
      );
    }

    const validatedParams = KRXMarketParamsSchema.parse({
      serviceKey: this.apiKeys.krx,
      ...params
    });

    try {
      const url = new URL(`${config.baseUrl}/getKrxListedInfo`);
      Object.entries(validatedParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MeireBlogPlatform/1.0'
        },
        signal: AbortSignal.timeout(config.timeout)
      });

      if (!response.ok) {
        throw new PublicDataAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          apiName,
          url.pathname
        );
      }

      const data = await response.json();
      
      if (data.response?.header?.resultCode !== '00') {
        throw new PublicDataAPIError(
          `API Error: ${data.response?.header?.resultMsg || 'Unknown error'}`,
          undefined,
          apiName
        );
      }

      const items = data.response?.body?.items?.item || [];
      return this.transformKRXData(Array.isArray(items) ? items : [items]);

    } catch (error) {
      if (error instanceof PublicDataAPIError) {
        throw error;
      }
      throw new PublicDataAPIError(
        `Failed to fetch KRX market data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        apiName
      );
    }
  }

  /**
   * 금융감독원 공시 데이터 조회
   */
  async getFSSDisclosureData(params: Partial<FSSDisclosureParams>): Promise<FSSDisclosureData[]> {
    const apiName = 'fss';
    const config = this.configs.get(apiName)!;
    
    if (!this.rateLimiter.canMakeRequest(apiName, config.rateLimit.requestsPerMinute, 60000)) {
      const waitTime = this.rateLimiter.getNextAvailableTime(apiName, config.rateLimit.requestsPerMinute, 60000);
      throw new PublicDataAPIError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        429,
        apiName
      );
    }

    const validatedParams = FSSDisclosureParamsSchema.parse({
      crtfc_key: this.apiKeys.fss,
      ...params
    });

    try {
      const url = new URL(`${config.baseUrl}/list.json`);
      Object.entries(validatedParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MeireBlogPlatform/1.0'
        },
        signal: AbortSignal.timeout(config.timeout)
      });

      if (!response.ok) {
        throw new PublicDataAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          apiName,
          url.pathname
        );
      }

      const data = await response.json();
      
      if (data.status !== '000') {
        throw new PublicDataAPIError(
          `API Error: ${data.message || 'Unknown error'}`,
          undefined,
          apiName
        );
      }

      return this.transformFSSData(data.list || []);

    } catch (error) {
      if (error instanceof PublicDataAPIError) {
        throw error;
      }
      throw new PublicDataAPIError(
        `Failed to fetch FSS disclosure data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        apiName
      );
    }
  }

  /**
   * 국민연금 데이터 변환
   */
  private transformNPSData(items: any[]): NPSInvestmentData[] {
    return items.map(item => ({
      dataDate: item.basDt || '',
      fundCode: item.fundCd || '',
      fundName: item.fundNm || '',
      stockCode: item.isu_cd || undefined,
      stockName: item.isu_nm || undefined,
      shares: item.hldg_qty ? parseInt(item.hldg_qty) : undefined,
      marketValue: item.evlu_amt ? parseFloat(item.evlu_amt) : undefined,
      ratio: item.hldg_wt ? parseFloat(item.hldg_wt) : undefined,
      changeFromPrev: item.prv_evlu_amt_cha ? parseFloat(item.prv_evlu_amt_cha) : undefined,
      sector: item.sector || undefined,
      industry: item.industry || undefined
    }));
  }

  /**
   * 한국거래소 데이터 변환
   */
  private transformKRXData(items: any[]): KRXMarketData[] {
    return items.map(item => ({
      dataDate: item.basDt || '',
      marketType: item.mrktCtg || 'KOSPI',
      stockCode: item.srtnCd || '',
      stockName: item.itmsNm || '',
      closingPrice: item.clpr ? parseFloat(item.clpr) : undefined,
      openingPrice: item.mkp ? parseFloat(item.mkp) : undefined,
      highPrice: item.hipr ? parseFloat(item.hipr) : undefined,
      lowPrice: item.lopr ? parseFloat(item.lopr) : undefined,
      volume: item.trqu ? parseInt(item.trqu) : undefined,
      transactionAmount: item.trPrc ? parseFloat(item.trPrc) : undefined,
      marketCap: item.mrktTotAmt ? parseFloat(item.mrktTotAmt) : undefined,
      listedShares: item.lstgStCnt ? parseInt(item.lstgStCnt) : undefined
    }));
  }

  /**
   * 금융감독원 데이터 변환
   */
  private transformFSSData(items: any[]): FSSDisclosureData[] {
    return items.map(item => ({
      disclosureId: item.rcept_no || '',
      companyCode: item.corp_code || '',
      companyName: item.corp_name || '',
      disclosureType: item.report_nm || '',
      disclosureTitle: item.rpt_nm || '',
      disclosureDate: item.rcept_dt || '',
      submissionDate: item.flr_nm || undefined,
      documentUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`
    }));
  }

  /**
   * API 상태 확인
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [apiName] of this.configs) {
      try {
        switch (apiName) {
          case 'nps':
            await this.getNPSInvestmentData({ numOfRows: 1 });
            results[apiName] = true;
            break;
          case 'krx':
            await this.getKRXMarketData({ numOfRows: 1 });
            results[apiName] = true;
            break;
          case 'fss':
            await this.getFSSDisclosureData({ page_count: 1 });
            results[apiName] = true;
            break;
          default:
            results[apiName] = false;
        }
      } catch (error) {
        results[apiName] = false;
      }
    }
    
    return results;
  }
}

// 싱글톤 인스턴스 생성 함수
export function createPublicDataAPIClient(): PublicDataAPIClient {
  const apiKeys = {
    nps: process.env.NPS_API_KEY || '',
    krx: process.env.KRX_API_KEY || '',
    fss: process.env.FSS_API_KEY || ''
  };

  // API 키 검증
  for (const [key, value] of Object.entries(apiKeys)) {
    if (!value) {
      console.warn(`Warning: ${key.toUpperCase()}_API_KEY environment variable is not set`);
    }
  }

  return new PublicDataAPIClient(apiKeys);
}