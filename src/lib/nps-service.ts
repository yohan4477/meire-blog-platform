import { query } from './database';
import { NPSPerformance, ApiResponse } from '@/types';

// 국민연금 성과 데이터 관리 서비스
export class NPSService {
  private static instance: NPSService;

  static getInstance(): NPSService {
    if (!NPSService.instance) {
      NPSService.instance = new NPSService();
    }
    return NPSService.instance;
  }

  // 최신 NPS 성과 데이터 조회
  async getLatestNPSPerformance(): Promise<NPSPerformance[]> {
    const sql = `
      SELECT * FROM nps_performance 
      WHERE record_date = (
        SELECT MAX(record_date) FROM nps_performance
      )
      ORDER BY fund_type
    `;

    const results = await query<NPSPerformance>(sql);
    return results;
  }

  // 특정 기간의 NPS 성과 데이터 조회
  async getNPSPerformanceByPeriod(
    startDate: string, 
    endDate: string
  ): Promise<NPSPerformance[]> {
    const sql = `
      SELECT * FROM nps_performance 
      WHERE record_date BETWEEN ? AND ?
      ORDER BY record_date DESC, fund_type
    `;

    const results = await query<NPSPerformance>(sql, [startDate, endDate]);
    return results;
  }

  // NPS 성과 데이터 업데이트 (외부 API에서 가져온 데이터 저장)
  async updateNPSPerformance(performanceData: Omit<NPSPerformance, 'id'>[]): Promise<void> {
    for (const data of performanceData) {
      const sql = `
        INSERT INTO nps_performance 
        (fund_type, return_1m, return_3m, return_6m, return_1y, return_3y, return_5y, return_inception, record_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        return_1m = VALUES(return_1m),
        return_3m = VALUES(return_3m),
        return_6m = VALUES(return_6m),
        return_1y = VALUES(return_1y),
        return_3y = VALUES(return_3y),
        return_5y = VALUES(return_5y),
        return_inception = VALUES(return_inception),
        updated_at = CURRENT_TIMESTAMP
      `;

      await query(sql, [
        data.fund_type,
        data.return_1m,
        data.return_3m,
        data.return_6m,
        data.return_1y,
        data.return_3y,
        data.return_5y,
        data.return_inception,
        data.record_date
      ]);
    }
  }

  // 포트폴리오 vs NPS 상대 성과 분석
  async comparePortfolioWithNPS(
    portfolioId: number, 
    portfolioReturn: number, 
    timeframe: '1m' | '3m' | '6m' | '1y' | '3y' | '5y' = '1y'
  ) {
    const npsData = await this.getLatestNPSPerformance();
    
    const returnKey = `return_${timeframe}` as keyof NPSPerformance;
    
    const comparison = npsData.map(nps => {
      const npsReturn = nps[returnKey] as number || 0;
      const outperformance = portfolioReturn - npsReturn;
      
      return {
        fund_type: nps.fund_type,
        nps_return: npsReturn,
        portfolio_return: portfolioReturn,
        outperformance,
        outperformance_percent: npsReturn !== 0 ? (outperformance / Math.abs(npsReturn)) * 100 : 0,
        is_outperforming: outperformance > 0,
        timeframe
      };
    });

    // 성과 비교 결과를 데이터베이스에 저장
    await this.savePortfolioComparison(portfolioId, comparison);

    return comparison;
  }

  // 포트폴리오 성과 비교 결과 저장
  private async savePortfolioComparison(
    portfolioId: number, 
    comparison: any[]
  ): Promise<void> {
    for (const comp of comparison) {
      const sql = `
        INSERT INTO portfolio_performance 
        (portfolio_id, comparison_type, benchmark_name, portfolio_return, benchmark_return, outperformance, timeframe, analysis_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE)
        ON DUPLICATE KEY UPDATE
        portfolio_return = VALUES(portfolio_return),
        benchmark_return = VALUES(benchmark_return),
        outperformance = VALUES(outperformance),
        updated_at = CURRENT_TIMESTAMP
      `;

      await query(sql, [
        portfolioId,
        'nps_fund',
        comp.fund_type,
        comp.portfolio_return,
        comp.nps_return,
        comp.outperformance,
        comp.timeframe
      ]);
    }
  }

  // 모든 펀드 유형에 대한 아웃퍼포먼스 요약
  async getOutperformanceSummary(portfolioId: number) {
    const sql = `
      SELECT 
        pp.*,
        nps.return_1m as nps_1m,
        nps.return_3m as nps_3m,
        nps.return_6m as nps_6m,
        nps.return_1y as nps_1y,
        nps.return_3y as nps_3y,
        nps.return_5y as nps_5y
      FROM portfolio_performance pp
      LEFT JOIN nps_performance nps ON pp.benchmark_name = nps.fund_type
      WHERE pp.portfolio_id = ? 
        AND pp.comparison_type = 'nps_fund'
        AND nps.record_date = (SELECT MAX(record_date) FROM nps_performance)
      ORDER BY pp.timeframe, pp.benchmark_name
    `;

    return await query<any>(sql, [portfolioId]);
  }

  // 가상의 NPS 데이터 생성 (실제로는 한국투자공사 또는 국민연금 API에서 가져와야 함)
  async seedSampleNPSData(): Promise<void> {
    const sampleData: Omit<NPSPerformance, 'id'>[] = [
      {
        fund_type: '국내주식',
        return_1m: 2.3,
        return_3m: 5.8,
        return_6m: 12.4,
        return_1y: 18.7,
        return_3y: 8.2,
        return_5y: 6.9,
        return_inception: 7.1,
        record_date: new Date().toISOString().split('T')[0]
      },
      {
        fund_type: '해외주식',
        return_1m: 1.8,
        return_3m: 7.2,
        return_6m: 15.1,
        return_1y: 22.4,
        return_3y: 11.5,
        return_5y: 9.8,
        return_inception: 8.7,
        record_date: new Date().toISOString().split('T')[0]
      },
      {
        fund_type: '국내채권',
        return_1m: 0.3,
        return_3m: 1.1,
        return_6m: 2.8,
        return_1y: 4.2,
        return_3y: 3.1,
        return_5y: 2.9,
        return_inception: 3.4,
        record_date: new Date().toISOString().split('T')[0]
      },
      {
        fund_type: '해외채권',
        return_1m: 0.5,
        return_3m: 1.4,
        return_6m: 3.2,
        return_1y: 5.1,
        return_3y: 3.8,
        return_5y: 3.5,
        return_inception: 4.1,
        record_date: new Date().toISOString().split('T')[0]
      },
      {
        fund_type: '대안투자',
        return_1m: 1.2,
        return_3m: 3.8,
        return_6m: 8.9,
        return_1y: 13.6,
        return_3y: 7.4,
        return_5y: 6.2,
        return_inception: 6.8,
        record_date: new Date().toISOString().split('T')[0]
      }
    ];

    await this.updateNPSPerformance(sampleData);
  }

  // 리스크 조정 수익률 계산 (샤프 비율 등)
  calculateRiskAdjustedReturns(
    portfolioReturn: number,
    portfolioVolatility: number,
    npsReturn: number,
    npsVolatility: number = 12, // 가정값
    riskFreeRate: number = 2.5 // 한국 국고채 3년물 기준
  ) {
    const portfolioSharpe = (portfolioReturn - riskFreeRate) / portfolioVolatility;
    const npsSharpe = (npsReturn - riskFreeRate) / npsVolatility;

    return {
      portfolio_sharpe: portfolioSharpe,
      nps_sharpe: npsSharpe,
      sharpe_difference: portfolioSharpe - npsSharpe,
      is_better_risk_adjusted: portfolioSharpe > npsSharpe
    };
  }

  // 성과 기여도 분석
  async analyzePerformanceAttribution(
    portfolioId: number,
    timeframe: '1y' | '3y' | '5y' = '1y'
  ) {
    // 포트폴리오의 섹터별 배분과 성과를 NPS와 비교
    const sql = `
      SELECT 
        ph.stock_id,
        s.symbol,
        s.sector,
        ph.shares,
        ph.avg_purchase_price,
        ph.current_value,
        ph.gain_loss_percent,
        (ph.current_value / 
          (SELECT SUM(current_value) FROM portfolio_holdings WHERE portfolio_id = ?)
        ) * 100 as weight_percent
      FROM portfolio_holdings ph
      JOIN stocks s ON ph.stock_id = s.id
      WHERE ph.portfolio_id = ?
      ORDER BY ph.current_value DESC
    `;

    const holdings = await query<any>(sql, [portfolioId, portfolioId]);
    
    // 섹터별 성과 분석
    const sectorPerformance: Record<string, {
      weight: number;
      return: number;
      contribution: number;
    }> = {};

    holdings.forEach((holding: any) => {
      const sector = holding.sector || 'Other';
      if (!sectorPerformance[sector]) {
        sectorPerformance[sector] = { weight: 0, return: 0, contribution: 0 };
      }
      
      sectorPerformance[sector].weight += holding.weight_percent;
      sectorPerformance[sector].return += (holding.gain_loss_percent || 0) * (holding.weight_percent / 100);
      sectorPerformance[sector].contribution += (holding.gain_loss_percent || 0) * (holding.weight_percent / 100);
    });

    return {
      sector_performance: sectorPerformance,
      top_contributors: Object.entries(sectorPerformance)
        .sort(([,a], [,b]) => b.contribution - a.contribution)
        .slice(0, 5),
      bottom_contributors: Object.entries(sectorPerformance)
        .sort(([,a], [,b]) => a.contribution - b.contribution)
        .slice(0, 3)
    };
  }
}

// 편의 함수들
export async function getNPSComparison(portfolioId: number, portfolioReturn: number, timeframe?: '1m' | '3m' | '6m' | '1y' | '3y' | '5y') {
  const service = NPSService.getInstance();
  return service.comparePortfolioWithNPS(portfolioId, portfolioReturn, timeframe);
}

export async function getLatestNPSData() {
  const service = NPSService.getInstance();
  return service.getLatestNPSPerformance();
}

export async function initializeNPSSampleData() {
  const service = NPSService.getInstance();
  return service.seedSampleNPSData();
}

export async function getPortfolioOutperformance(portfolioId: number) {
  const service = NPSService.getInstance();
  return service.getOutperformanceSummary(portfolioId);
}