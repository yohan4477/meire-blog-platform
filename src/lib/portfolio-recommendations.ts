import { query } from './database';
import { 
  PortfolioRecommendation, 
  PortfolioHolding,
  Portfolio,
  NPSPerformance 
} from '@/types';
import { getPortfolioHoldings, getPortfolio } from './portfolio-db';
import { optimizePortfolioWithAI, analyzeStockWithAI } from './ai-agents';

// 포트폴리오 추천 엔진
export class PortfolioRecommendationEngine {
  private static instance: PortfolioRecommendationEngine;

  static getInstance(): PortfolioRecommendationEngine {
    if (!PortfolioRecommendationEngine.instance) {
      PortfolioRecommendationEngine.instance = new PortfolioRecommendationEngine();
    }
    return PortfolioRecommendationEngine.instance;
  }

  // 포트폴리오 종합 분석 및 추천 생성
  async generateAllRecommendations(portfolioId: number): Promise<PortfolioRecommendation[]> {
    try {
      const portfolio = await getPortfolio(portfolioId);
      const holdings = await getPortfolioHoldings(portfolioId);
      
      const recommendations: PortfolioRecommendation[] = [];

      // 1. 리밸런싱 추천 (BlackRock 에이전트)
      const rebalancingRecs = await this.generateRebalancingRecommendations(portfolio, holdings);
      recommendations.push(...rebalancingRecs);

      // 2. 다각화 추천 (BlackRock 에이전트)
      const diversificationRecs = await this.generateDiversificationRecommendations(portfolio, holdings);
      recommendations.push(...diversificationRecs);

      // 3. 리스크 관리 추천 (BlackRock 에이전트)
      const riskRecs = await this.generateRiskManagementRecommendations(portfolio, holdings);
      recommendations.push(...riskRecs);

      // 4. 종목 추천 (Goldman Sachs 에이전트)
      const stockRecs = await this.generateStockPickRecommendations(portfolio, holdings);
      recommendations.push(...stockRecs);

      // 데이터베이스에 저장
      for (const rec of recommendations) {
        await this.saveRecommendation(rec);
      }

      return recommendations;

    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      throw error;
    }
  }

  // 리밸런싱 추천 생성
  private async generateRebalancingRecommendations(
    portfolio: Portfolio, 
    holdings: PortfolioHolding[]
  ): Promise<PortfolioRecommendation[]> {
    const recommendations: PortfolioRecommendation[] = [];

    try {
      // BlackRock AI 에이전트를 통한 포트폴리오 최적화
      const aiResponse = await optimizePortfolioWithAI(holdings, portfolio.investment_goal);
      
      if (aiResponse.success && aiResponse.data) {
        const optimizationData = aiResponse.data;
        
        // 리밸런싱이 필요한지 확인
        const rebalancingNeeded = optimizationData.rebalancing_trades?.length > 0;
        
        if (rebalancingNeeded) {
          recommendations.push({
            id: 0, // 임시 ID
            portfolio_id: portfolio.id,
            recommendation_type: 'rebalancing',
            agent_type: 'blackrock',
            title: '포트폴리오 리밸런싱 추천',
            description: `현재 포트폴리오가 목표 자산 배분에서 벗어났습니다. 리밸런싱을 통해 ${optimizationData.expected_benefit?.return_improvement || 1.2}%의 수익률 개선이 예상됩니다.`,
            action_required: true,
            priority: this.calculatePriority(optimizationData.optimization_score || 0),
            expected_impact: optimizationData.expected_benefit?.return_improvement || 0,
            suggested_actions: {
              trades: optimizationData.rebalancing_trades,
              expected_benefit: optimizationData.expected_benefit,
              optimization_score: optimizationData.optimization_score
            },
            status: 'pending',
            created_at: new Date().toISOString(),
            expires_at: this.getExpirationDate(7) // 7일 후 만료
          });
        }
      }

    } catch (error) {
      console.error('Failed to generate rebalancing recommendations:', error);
    }

    return recommendations;
  }

  // 다각화 추천 생성
  private async generateDiversificationRecommendations(
    portfolio: Portfolio, 
    holdings: PortfolioHolding[]
  ): Promise<PortfolioRecommendation[]> {
    const recommendations: PortfolioRecommendation[] = [];

    try {
      // 섹터 분산도 분석
      const sectorAllocation = this.analyzeSectorAllocation(holdings);
      const concentrationRisk = this.analyzeConcentrationRisk(holdings);

      // 섹터 집중도가 높은 경우
      if (concentrationRisk.maxSectorWeight > 50) {
        recommendations.push({
          id: 0,
          portfolio_id: portfolio.id,
          recommendation_type: 'diversification',
          agent_type: 'blackrock',
          title: '섹터 다각화 필요',
          description: `${concentrationRisk.dominantSector} 섹터 비중이 ${concentrationRisk.maxSectorWeight.toFixed(1)}%로 과도하게 높습니다. 다른 섹터로의 분산 투자를 권장합니다.`,
          action_required: true,
          priority: concentrationRisk.maxSectorWeight > 70 ? 'high' : 'medium',
          expected_impact: 2.5,
          suggested_actions: {
            reduce_sector: concentrationRisk.dominantSector,
            current_weight: concentrationRisk.maxSectorWeight,
            target_weight: 25,
            suggested_sectors: this.getSuggestedSectors(sectorAllocation)
          },
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: this.getExpirationDate(14)
        });
      }

      // 종목 집중도가 높은 경우
      if (concentrationRisk.maxStockWeight > 30) {
        recommendations.push({
          id: 0,
          portfolio_id: portfolio.id,
          recommendation_type: 'diversification',
          agent_type: 'blackrock',
          title: '개별 종목 집중도 위험',
          description: `단일 종목(${concentrationRisk.dominantStock})의 비중이 ${concentrationRisk.maxStockWeight.toFixed(1)}%로 높습니다. 포트폴리오 리스크 분산을 위해 비중 조정을 권장합니다.`,
          action_required: true,
          priority: concentrationRisk.maxStockWeight > 40 ? 'high' : 'medium',
          expected_impact: 1.8,
          suggested_actions: {
            reduce_stock: concentrationRisk.dominantStock,
            current_weight: concentrationRisk.maxStockWeight,
            target_weight: 15,
            reason: 'risk_diversification'
          },
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: this.getExpirationDate(10)
        });
      }

    } catch (error) {
      console.error('Failed to generate diversification recommendations:', error);
    }

    return recommendations;
  }

  // 리스크 관리 추천 생성
  private async generateRiskManagementRecommendations(
    portfolio: Portfolio, 
    holdings: PortfolioHolding[]
  ): Promise<PortfolioRecommendation[]> {
    const recommendations: PortfolioRecommendation[] = [];

    try {
      const riskMetrics = this.calculateRiskMetrics(holdings, portfolio.investment_goal);

      // 포트폴리오 변동성이 너무 높은 경우
      if (riskMetrics.portfolioVolatility > riskMetrics.targetVolatility * 1.2) {
        recommendations.push({
          id: 0,
          portfolio_id: portfolio.id,
          recommendation_type: 'risk_management',
          agent_type: 'blackrock',
          title: '포트폴리오 변동성 관리',
          description: `현재 포트폴리오 변동성(${riskMetrics.portfolioVolatility.toFixed(1)}%)이 목표 수준(${riskMetrics.targetVolatility.toFixed(1)}%)을 초과합니다. 안정적인 자산 추가를 권장합니다.`,
          action_required: true,
          priority: 'medium',
          expected_impact: 1.5,
          suggested_actions: {
            current_volatility: riskMetrics.portfolioVolatility,
            target_volatility: riskMetrics.targetVolatility,
            suggested_assets: ['채권 ETF', '배당주', '유틸리티 섹터'],
            allocation_suggestion: {
              reduce_high_vol: 10,
              add_low_vol: 10
            }
          },
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: this.getExpirationDate(30)
        });
      }

      // 베타가 너무 높은 경우
      if (riskMetrics.portfolioBeta > 1.3) {
        recommendations.push({
          id: 0,
          portfolio_id: portfolio.id,
          recommendation_type: 'risk_management',
          agent_type: 'blackrock',
          title: '시장 민감도 조정',
          description: `포트폴리오 베타(${riskMetrics.portfolioBeta.toFixed(2)})가 높아 시장 하락 시 큰 영향을 받을 수 있습니다. 방어적 자산 비중 확대를 권장합니다.`,
          action_required: false,
          priority: 'low',
          expected_impact: 1.0,
          suggested_actions: {
            current_beta: riskMetrics.portfolioBeta,
            target_beta: 1.0,
            defensive_sectors: ['Consumer Staples', 'Healthcare', 'Utilities']
          },
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: this.getExpirationDate(21)
        });
      }

    } catch (error) {
      console.error('Failed to generate risk management recommendations:', error);
    }

    return recommendations;
  }

  // 종목 추천 생성 (Goldman Sachs)
  private async generateStockPickRecommendations(
    portfolio: Portfolio, 
    holdings: PortfolioHolding[]
  ): Promise<PortfolioRecommendation[]> {
    const recommendations: PortfolioRecommendation[] = [];

    try {
      // 기존 보유 종목 분석
      const underweightSectors = this.getUnderweightSectors(holdings);
      
      for (const sector of underweightSectors) {
        // 해당 섹터의 추천 종목을 AI 에이전트를 통해 분석
        const suggestedStocks = await this.getSectorRecommendations(sector);
        
        if (suggestedStocks.length > 0) {
          recommendations.push({
            id: 0,
            portfolio_id: portfolio.id,
            recommendation_type: 'stock_pick',
            agent_type: 'goldman_sachs',
            title: `${sector} 섹터 투자 기회`,
            description: `${sector} 섹터의 비중이 낮습니다. 현재 시장 상황에서 매력적인 투자 기회를 제공하는 종목들이 있습니다.`,
            action_required: false,
            priority: 'medium',
            expected_impact: 3.0,
            suggested_actions: {
              sector,
              recommended_stocks: suggestedStocks,
              allocation_suggestion: '포트폴리오의 5-10%',
              investment_thesis: `${sector} 섹터의 성장 잠재력과 밸류에이션 매력도`
            },
            status: 'pending',
            created_at: new Date().toISOString(),
            expires_at: this.getExpirationDate(30)
          });
        }
      }

    } catch (error) {
      console.error('Failed to generate stock pick recommendations:', error);
    }

    return recommendations;
  }

  // 유틸리티 메서드들

  private analyzeSectorAllocation(holdings: PortfolioHolding[]): Record<string, number> {
    const sectorWeights: Record<string, number> = {};
    const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || h.total_cost), 0);

    holdings.forEach(holding => {
      const sector = holding.stock.sector || 'Unknown';
      const value = holding.current_value || holding.total_cost;
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      
      sectorWeights[sector] = (sectorWeights[sector] || 0) + weight;
    });

    return sectorWeights;
  }

  private analyzeConcentrationRisk(holdings: PortfolioHolding[]) {
    const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || h.total_cost), 0);
    
    // 섹터 집중도
    const sectorWeights = this.analyzeSectorAllocation(holdings);
    const maxSectorWeight = Math.max(...Object.values(sectorWeights));
    const dominantSector = Object.keys(sectorWeights).find(
      sector => sectorWeights[sector] === maxSectorWeight
    ) || '';

    // 개별 종목 집중도
    let maxStockWeight = 0;
    let dominantStock = '';
    
    holdings.forEach(holding => {
      const value = holding.current_value || holding.total_cost;
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      
      if (weight > maxStockWeight) {
        maxStockWeight = weight;
        dominantStock = holding.stock.symbol;
      }
    });

    return {
      maxSectorWeight,
      dominantSector,
      maxStockWeight,
      dominantStock
    };
  }

  private calculateRiskMetrics(holdings: PortfolioHolding[], investmentGoal: string) {
    // 목표 변동성 설정
    const targetVolatilityMap = {
      conservative: 8,
      balanced: 12,
      aggressive: 18,
      custom: 15
    };

    const targetVolatility = targetVolatilityMap[investmentGoal as keyof typeof targetVolatilityMap] || 12;
    
    // 포트폴리오 변동성 추정 (실제로는 더 복잡한 계산 필요)
    const portfolioVolatility = this.estimatePortfolioVolatility(holdings);
    const portfolioBeta = this.estimatePortfolioBeta(holdings);

    return {
      targetVolatility,
      portfolioVolatility,
      portfolioBeta
    };
  }

  private estimatePortfolioVolatility(holdings: PortfolioHolding[]): number {
    // 간단한 변동성 추정 (실제로는 역사적 데이터 기반 계산 필요)
    const sectorVolatility: Record<string, number> = {
      'Technology': 25,
      'Healthcare': 18,
      'Finance': 22,
      'Energy': 30,
      'Consumer Cyclical': 20,
      'Consumer Defensive': 12,
      'Utilities': 10,
      'Real Estate': 16,
      'Materials': 24,
      'Industrials': 19,
      'Communication': 23
    };

    const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || h.total_cost), 0);
    let weightedVolatility = 0;

    holdings.forEach(holding => {
      const sector = holding.stock.sector || 'Technology';
      const weight = totalValue > 0 ? (holding.current_value || holding.total_cost) / totalValue : 0;
      const vol = sectorVolatility[sector] || 20;
      
      weightedVolatility += weight * vol;
    });

    return weightedVolatility;
  }

  private estimatePortfolioBeta(holdings: PortfolioHolding[]): number {
    // 간단한 베타 추정
    const sectorBeta: Record<string, number> = {
      'Technology': 1.3,
      'Healthcare': 0.9,
      'Finance': 1.2,
      'Energy': 1.1,
      'Consumer Cyclical': 1.1,
      'Consumer Defensive': 0.7,
      'Utilities': 0.6,
      'Real Estate': 0.8,
      'Materials': 1.2,
      'Industrials': 1.0,
      'Communication': 1.1
    };

    const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || h.total_cost), 0);
    let weightedBeta = 0;

    holdings.forEach(holding => {
      const sector = holding.stock.sector || 'Technology';
      const weight = totalValue > 0 ? (holding.current_value || holding.total_cost) / totalValue : 0;
      const beta = sectorBeta[sector] || 1.0;
      
      weightedBeta += weight * beta;
    });

    return weightedBeta;
  }

  private getSuggestedSectors(currentAllocation: Record<string, number>): string[] {
    const idealAllocation = {
      'Technology': 20,
      'Healthcare': 15,
      'Finance': 12,
      'Consumer Cyclical': 10,
      'Industrials': 10,
      'Communication': 8,
      'Consumer Defensive': 8,
      'Energy': 7,
      'Materials': 5,
      'Utilities': 3,
      'Real Estate': 2
    };

    const underweightSectors = Object.keys(idealAllocation).filter(sector => {
      const current = currentAllocation[sector] || 0;
      const ideal = idealAllocation[sector as keyof typeof idealAllocation];
      return current < ideal * 0.7; // 30% 이상 부족한 섹터
    });

    return underweightSectors.slice(0, 3); // 상위 3개 섹터만 추천
  }

  private getUnderweightSectors(holdings: PortfolioHolding[]): string[] {
    const sectorAllocation = this.analyzeSectorAllocation(holdings);
    return this.getSuggestedSectors(sectorAllocation);
  }

  private async getSectorRecommendations(sector: string): Promise<string[]> {
    // 섹터별 추천 종목 (실제로는 AI 에이전트나 외부 API를 통해 가져와야 함)
    const sectorStocks: Record<string, string[]> = {
      'Technology': ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
      'Healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV'],
      'Finance': ['JPM', 'BAC', 'WFC', 'C'],
      'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD'],
      'Energy': ['XOM', 'CVX', 'COP', 'EOG'],
      'Industrials': ['BA', 'CAT', 'GE', 'MMM']
    };

    return sectorStocks[sector] || [];
  }

  private calculatePriority(score: number): 'low' | 'medium' | 'high' | 'urgent' {
    if (score >= 90) return 'urgent';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private getExpirationDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  private async saveRecommendation(recommendation: PortfolioRecommendation): Promise<void> {
    const sql = `
      INSERT INTO portfolio_recommendations 
      (portfolio_id, recommendation_type, agent_type, title, description, action_required, priority, expected_impact, suggested_actions, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      recommendation.portfolio_id,
      recommendation.recommendation_type,
      recommendation.agent_type,
      recommendation.title,
      recommendation.description,
      recommendation.action_required,
      recommendation.priority,
      recommendation.expected_impact,
      JSON.stringify(recommendation.suggested_actions),
      recommendation.status,
      recommendation.expires_at
    ]);
  }

  // 추천 조회
  async getPortfolioRecommendations(portfolioId: number, status?: string): Promise<PortfolioRecommendation[]> {
    let sql = `
      SELECT * FROM portfolio_recommendations 
      WHERE portfolio_id = ?
    `;
    const params = [portfolioId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY priority DESC, created_at DESC';

    const results = await query<any>(sql, params);

    return results.map(row => ({
      ...row,
      suggested_actions: row.suggested_actions ? JSON.parse(row.suggested_actions) : null
    }));
  }

  // 추천 상태 업데이트
  async updateRecommendationStatus(
    recommendationId: number, 
    status: 'pending' | 'applied' | 'ignored' | 'expired'
  ): Promise<void> {
    const sql = `
      UPDATE portfolio_recommendations 
      SET status = ?, applied_at = CASE WHEN ? = 'applied' THEN CURRENT_TIMESTAMP ELSE applied_at END
      WHERE id = ?
    `;

    await query(sql, [status, status, recommendationId]);
  }
}

// 편의 함수들
export async function generatePortfolioRecommendations(portfolioId: number): Promise<PortfolioRecommendation[]> {
  const engine = PortfolioRecommendationEngine.getInstance();
  return engine.generateAllRecommendations(portfolioId);
}

export async function getRecommendations(portfolioId: number, status?: string): Promise<PortfolioRecommendation[]> {
  const engine = PortfolioRecommendationEngine.getInstance();
  return engine.getPortfolioRecommendations(portfolioId, status);
}

export async function applyRecommendation(recommendationId: number): Promise<void> {
  const engine = PortfolioRecommendationEngine.getInstance();
  return engine.updateRecommendationStatus(recommendationId, 'applied');
}

export async function ignoreRecommendation(recommendationId: number): Promise<void> {
  const engine = PortfolioRecommendationEngine.getInstance();
  return engine.updateRecommendationStatus(recommendationId, 'ignored');
}