/**
 * 고급 AI 에이전트 시스템
 * 컨텍스트 인식, 학습 기능, 다중 에이전트 협업을 지원합니다.
 */

import type { AIAgentRequest, AIAgentResponse, Stock, PortfolioHolding } from '@/types';

// 고급 에이전트 설정 타입
export interface EnhancedAgentConfig {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  systemPrompt: string;
  contextWindow: number;
  temperature: number;
  maxTokens: number;
  examples: Array<{ input: string; output: string; context?: any }>;
  learningEnabled: boolean;
  collaborationAgents?: string[];
  specializations: string[];
}

// 컨텍스트 관리자
export class ContextManager {
  private contexts: Map<string, ContextSession> = new Map();
  private readonly maxContextAge = 3600000; // 1시간

  addContext(sessionId: string, context: ContextData): void {
    const existingSession = this.contexts.get(sessionId);
    
    if (existingSession) {
      existingSession.history.push({
        timestamp: Date.now(),
        data: context,
        type: context.type,
      });
      existingSession.lastUpdated = Date.now();
    } else {
      this.contexts.set(sessionId, {
        sessionId,
        history: [{
          timestamp: Date.now(),
          data: context,
          type: context.type,
        }],
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        metadata: {},
      });
    }
  }

  getContext(sessionId: string): ContextSession | null {
    const session = this.contexts.get(sessionId);
    if (!session) return null;

    // 세션이 만료되었는지 확인
    if (Date.now() - session.lastUpdated > this.maxContextAge) {
      this.contexts.delete(sessionId);
      return null;
    }

    return session;
  }

  getRelevantContext(sessionId: string, contextType?: string): ContextHistory[] {
    const session = this.getContext(sessionId);
    if (!session) return [];

    let relevantHistory = session.history;
    
    if (contextType) {
      relevantHistory = relevantHistory.filter(h => h.type === contextType);
    }

    // 최근 10개 항목만 반환
    return relevantHistory.slice(-10);
  }

  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }

  // 컨텍스트 기반 추천
  generateContextualPrompt(sessionId: string, basePrompt: string): string {
    const context = this.getRelevantContext(sessionId);
    if (context.length === 0) return basePrompt;

    const contextSummary = context
      .map(c => `${c.type}: ${JSON.stringify(c.data).slice(0, 200)}`)
      .join('\n');

    return `${basePrompt}\n\n이전 컨텍스트:\n${contextSummary}`;
  }
}

// 학습 관리자
export class LearningManager {
  private feedbackHistory: Map<string, FeedbackEntry[]> = new Map();
  private performanceMetrics: Map<string, AgentPerformance> = new Map();

  recordFeedback(agentType: string, requestId: string, feedback: UserFeedback): void {
    const agentFeedback = this.feedbackHistory.get(agentType) || [];
    
    agentFeedback.push({
      requestId,
      feedback,
      timestamp: Date.now(),
    });

    this.feedbackHistory.set(agentType, agentFeedback);
    this.updatePerformanceMetrics(agentType, feedback);
  }

  private updatePerformanceMetrics(agentType: string, feedback: UserFeedback): void {
    const existing = this.performanceMetrics.get(agentType) || {
      totalRequests: 0,
      positiveRatings: 0,
      negativeRatings: 0,
      averageRating: 0,
      commonIssues: new Map(),
      improvements: [],
    };

    existing.totalRequests++;
    
    if (feedback.rating >= 4) {
      existing.positiveRatings++;
    } else if (feedback.rating <= 2) {
      existing.negativeRatings++;
    }

    // 평균 평점 계산
    const totalRatings = existing.positiveRatings + existing.negativeRatings;
    if (totalRatings > 0) {
      existing.averageRating = (existing.positiveRatings * 5 + existing.negativeRatings * 1) / totalRatings;
    }

    // 공통 이슈 추적
    if (feedback.issues) {
      feedback.issues.forEach(issue => {
        const count = existing.commonIssues.get(issue) || 0;
        existing.commonIssues.set(issue, count + 1);
      });
    }

    this.performanceMetrics.set(agentType, existing);
  }

  getAgentPerformance(agentType: string): AgentPerformance | null {
    return this.performanceMetrics.get(agentType) || null;
  }

  generateImprovementSuggestions(agentType: string): string[] {
    const performance = this.getAgentPerformance(agentType);
    if (!performance) return [];

    const suggestions: string[] = [];

    // 평점이 낮은 경우
    if (performance.averageRating < 3.5) {
      suggestions.push('응답 품질 개선 필요');
    }

    // 공통 이슈 기반 제안
    const topIssues = Array.from(performance.commonIssues.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    topIssues.forEach(([issue, count]) => {
      if (count > 5) {
        switch (issue) {
          case 'INACCURATE':
            suggestions.push('데이터 정확성 향상을 위한 검증 로직 강화');
            break;
          case 'TOO_GENERIC':
            suggestions.push('더 구체적이고 개인화된 응답 생성');
            break;
          case 'SLOW_RESPONSE':
            suggestions.push('응답 시간 최적화');
            break;
        }
      }
    });

    return suggestions;
  }
}

// 협업 관리자
export class CollaborationManager {
  async orchestrateMultiAgentTask(
    task: MultiAgentTask,
    sessionId: string
  ): Promise<MultiAgentResponse> {
    const results: AgentResult[] = [];
    const startTime = Date.now();

    try {
      // 순차 실행 vs 병렬 실행 결정
      if (task.executionMode === 'sequential') {
        for (const agentTask of task.agentTasks) {
          const result = await this.executeAgentTask(agentTask, sessionId, results);
          results.push(result);
          
          // 이전 결과를 다음 에이전트의 컨텍스트로 전달
          if (task.shareContext) {
            contextManager.addContext(sessionId, {
              type: 'agent_result',
              data: result,
              agentType: agentTask.agentType,
            });
          }
        }
      } else {
        // 병렬 실행
        const promises = task.agentTasks.map(agentTask => 
          this.executeAgentTask(agentTask, sessionId, results)
        );
        
        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
      }

      // 결과 통합 및 분석
      const synthesizedResult = await this.synthesizeResults(results, task.synthesisStrategy);

      return {
        success: true,
        results,
        synthesizedResult,
        metadata: {
          executionTime: Date.now() - startTime,
          agentsUsed: task.agentTasks.map(t => t.agentType),
          executionMode: task.executionMode,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Multi-agent task failed',
        results,
        metadata: {
          executionTime: Date.now() - startTime,
          agentsUsed: task.agentTasks.map(t => t.agentType),
          executionMode: task.executionMode,
        },
      };
    }
  }

  private async executeAgentTask(
    agentTask: AgentTask,
    sessionId: string,
    previousResults: AgentResult[]
  ): Promise<AgentResult> {
    const executor = EnhancedAIAgentExecutor.getInstance();
    const startTime = Date.now();

    // 이전 결과를 파라미터에 추가
    const enhancedParameters = {
      ...agentTask.parameters,
      sessionId,
      previousResults: agentTask.usePreviousResults ? previousResults : undefined,
    };

    const response = await executor.executeAgent({
      agent_type: agentTask.agentType,
      action: agentTask.action,
      parameters: enhancedParameters,
    });

    return {
      agentType: agentTask.agentType,
      action: agentTask.action,
      response,
      executionTime: Date.now() - startTime,
      success: response.success,
    };
  }

  private async synthesizeResults(
    results: AgentResult[],
    strategy: SynthesisStrategy
  ): Promise<any> {
    switch (strategy) {
      case 'consensus':
        return this.buildConsensus(results);
      case 'weighted_average':
        return this.calculateWeightedAverage(results);
      case 'best_confidence':
        return this.selectBestConfidence(results);
      case 'comprehensive':
        return this.buildComprehensiveResponse(results);
      default:
        return this.buildComprehensiveResponse(results);
    }
  }

  private buildConsensus(results: AgentResult[]): any {
    const agreements: Record<string, number> = {};
    const recommendations: Record<string, number> = {};

    results.forEach(result => {
      if (result.response.data?.recommendation) {
        const rec = result.response.data.recommendation;
        recommendations[rec] = (recommendations[rec] || 0) + 1;
      }
    });

    const consensusRecommendation = Object.entries(recommendations)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      type: 'consensus',
      consensusRecommendation: consensusRecommendation?.[0],
      agreement_level: consensusRecommendation ? consensusRecommendation[1] / results.length : 0,
      detailed_results: results.map(r => r.response.data),
    };
  }

  private calculateWeightedAverage(results: AgentResult[]): any {
    const weights = {
      goldman_sachs: 0.3,
      bloomberg: 0.3,
      blackrock: 0.25,
      robinhood: 0.15,
    };

    let weightedScore = 0;
    let totalWeight = 0;

    results.forEach(result => {
      const weight = weights[result.agentType as keyof typeof weights] || 0.1;
      const confidence = result.response.metadata?.confidence_score || 0.5;
      
      weightedScore += confidence * weight;
      totalWeight += weight;
    });

    return {
      type: 'weighted_average',
      weighted_confidence: totalWeight > 0 ? weightedScore / totalWeight : 0,
      individual_results: results.map(r => ({
        agent: r.agentType,
        confidence: r.response.metadata?.confidence_score,
        weight: weights[r.agentType as keyof typeof weights],
      })),
    };
  }

  private selectBestConfidence(results: AgentResult[]): any {
    const bestResult = results.reduce((best, current) => {
      const bestConf = best.response.metadata?.confidence_score || 0;
      const currentConf = current.response.metadata?.confidence_score || 0;
      return currentConf > bestConf ? current : best;
    });

    return {
      type: 'best_confidence',
      selected_agent: bestResult.agentType,
      confidence_score: bestResult.response.metadata?.confidence_score,
      result: bestResult.response.data,
      alternatives: results
        .filter(r => r.agentType !== bestResult.agentType)
        .map(r => ({
          agent: r.agentType,
          confidence: r.response.metadata?.confidence_score,
          summary: r.response.data,
        })),
    };
  }

  private buildComprehensiveResponse(results: AgentResult[]): any {
    return {
      type: 'comprehensive',
      summary: '다중 에이전트 분석 결과',
      agent_perspectives: results.reduce((acc, result) => {
        acc[result.agentType] = {
          analysis: result.response.data,
          confidence: result.response.metadata?.confidence_score,
          processing_time: result.executionTime,
        };
        return acc;
      }, {} as Record<string, any>),
      key_insights: this.extractKeyInsights(results),
      recommendations: this.consolidateRecommendations(results),
    };
  }

  private extractKeyInsights(results: AgentResult[]): string[] {
    const insights: string[] = [];
    
    results.forEach(result => {
      const data = result.response.data;
      if (data?.key_factors) insights.push(...data.key_factors);
      if (data?.insights) insights.push(...data.insights);
      if (data?.analysis) insights.push(data.analysis);
    });

    // 중복 제거 및 정리
    return [...new Set(insights)].filter(insight => 
      insight && typeof insight === 'string' && insight.length > 10
    ).slice(0, 10);
  }

  private consolidateRecommendations(results: AgentResult[]): any[] {
    const recommendations: any[] = [];

    results.forEach(result => {
      const data = result.response.data;
      if (data?.recommendation || data?.recommendations) {
        recommendations.push({
          source: result.agentType,
          recommendation: data.recommendation || data.recommendations,
          confidence: result.response.metadata?.confidence_score,
        });
      }
    });

    return recommendations;
  }
}

// 고급 AI 에이전트 실행기
export class EnhancedAIAgentExecutor {
  private static instance: EnhancedAIAgentExecutor;

  static getInstance(): EnhancedAIAgentExecutor {
    if (!EnhancedAIAgentExecutor.instance) {
      EnhancedAIAgentExecutor.instance = new EnhancedAIAgentExecutor();
    }
    return EnhancedAIAgentExecutor.instance;
  }

  async executeAgent(request: AIAgentRequest & { sessionId?: string }): Promise<AIAgentResponse> {
    const startTime = Date.now();
    const sessionId = request.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 컨텍스트 정보 수집
      const contextualPrompt = contextManager.generateContextualPrompt(
        sessionId,
        `Execute ${request.action} with agent ${request.agent_type}`
      );

      // 에이전트별 전문화된 처리
      const result = await this.processEnhancedAgentAction(request, sessionId);

      // 결과를 컨텍스트에 추가
      contextManager.addContext(sessionId, {
        type: 'agent_request',
        data: { request, result },
        agentType: request.agent_type,
      });

      const response: AIAgentResponse = {
        success: true,
        agent_type: request.agent_type,
        data: result,
        metadata: {
          confidence_score: this.calculateEnhancedConfidenceScore(request, result),
          processing_time: Date.now() - startTime,
          data_sources: this.getDataSources(request.agent_type),
          sessionId,
          contextUsed: contextManager.getRelevantContext(sessionId).length > 0,
        },
      };

      return response;

    } catch (error) {
      console.error(`Enhanced AI Agent execution error (${request.agent_type}):`, error);
      
      return {
        success: false,
        agent_type: request.agent_type,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          processing_time: Date.now() - startTime,
          sessionId,
        },
      };
    }
  }

  private async processEnhancedAgentAction(
    request: AIAgentRequest & { sessionId?: string },
    sessionId: string
  ): Promise<any> {
    // 기본 에이전트 로직을 확장
    const baseExecutor = new (await import('./ai-agents')).AIAgentExecutor();
    const baseResult = await baseExecutor.executeAgent(request);

    if (!baseResult.success) {
      throw new Error(baseResult.error || 'Base agent execution failed');
    }

    // 컨텍스트와 학습 데이터를 활용한 결과 향상
    return this.enhanceResultWithContext(baseResult.data, request, sessionId);
  }

  private enhanceResultWithContext(baseResult: any, request: AIAgentRequest, sessionId: string): any {
    const context = contextManager.getRelevantContext(sessionId);
    const performance = learningManager.getAgentPerformance(request.agent_type);
    
    // 성과 기반 조정
    if (performance && performance.averageRating < 3.5) {
      const improvements = learningManager.generateImprovementSuggestions(request.agent_type);
      baseResult.quality_improvements = improvements;
    }

    // 컨텍스트 기반 개인화
    if (context.length > 0) {
      const userPreferences = this.extractUserPreferences(context);
      baseResult.personalized_insights = this.generatePersonalizedInsights(baseResult, userPreferences);
    }

    return {
      ...baseResult,
      enhanced: true,
      context_applied: context.length > 0,
      personalization_level: this.calculatePersonalizationLevel(context),
    };
  }

  private extractUserPreferences(context: ContextHistory[]): UserPreferences {
    const preferences: UserPreferences = {
      riskTolerance: 'medium',
      investmentHorizon: '1-3 years',
      preferredSectors: [],
      analysisDepth: 'standard',
    };

    context.forEach(item => {
      if (item.type === 'agent_request' && item.data?.request?.parameters) {
        const params = item.data.request.parameters;
        if (params.riskProfile) preferences.riskTolerance = params.riskProfile;
        if (params.timeHorizon) preferences.investmentHorizon = params.timeHorizon;
        if (params.sectors) preferences.preferredSectors.push(...params.sectors);
      }
    });

    return preferences;
  }

  private generatePersonalizedInsights(result: any, preferences: UserPreferences): string[] {
    const insights: string[] = [];

    // 위험 성향에 따른 맞춤 인사이트
    if (preferences.riskTolerance === 'conservative') {
      insights.push('보수적 투자 성향을 고려한 안정성 중심 분석');
      if (result.risks) {
        insights.push(`위험 요소 ${result.risks.length}개 식별됨 - 신중한 검토 필요`);
      }
    } else if (preferences.riskTolerance === 'aggressive') {
      insights.push('공격적 투자 성향을 고려한 성장 잠재력 중심 분석');
      if (result.upside_potential) {
        insights.push(`상승 잠재력 ${result.upside_potential}% - 적극적 투자 검토 권장`);
      }
    }

    // 선호 섹터 기반 인사이트
    if (preferences.preferredSectors.length > 0) {
      const matchingSectors = preferences.preferredSectors.filter(sector => 
        result.sector && result.sector.toLowerCase().includes(sector.toLowerCase())
      );
      
      if (matchingSectors.length > 0) {
        insights.push(`선호 섹터(${matchingSectors.join(', ')})와 일치하는 투자 기회`);
      }
    }

    return insights;
  }

  private calculatePersonalizationLevel(context: ContextHistory[]): number {
    if (context.length === 0) return 0;
    if (context.length < 3) return 0.3;
    if (context.length < 10) return 0.6;
    return 1.0;
  }

  private calculateEnhancedConfidenceScore(request: AIAgentRequest, result: any): number {
    let baseScore = 0.7;

    // 컨텍스트 사용에 따른 점수 증가
    const sessionId = (request as any).sessionId;
    if (sessionId) {
      const contextCount = contextManager.getRelevantContext(sessionId).length;
      baseScore += Math.min(0.1, contextCount * 0.02);
    }

    // 학습 데이터 기반 조정
    const performance = learningManager.getAgentPerformance(request.agent_type);
    if (performance) {
      const performanceAdjustment = (performance.averageRating - 3) * 0.05;
      baseScore += performanceAdjustment;
    }

    // 결과의 구체성에 따른 조정
    if (result && typeof result === 'object') {
      const keyCount = Object.keys(result).length;
      baseScore += Math.min(0.1, keyCount * 0.01);
    }

    return Math.min(0.95, Math.max(0.1, baseScore));
  }

  private getDataSources(agentType: string): string[] {
    const dataSources = {
      goldman_sachs: ['SEC_FILINGS', 'EARNINGS_DATA', 'ANALYST_REPORTS', 'MARKET_DATA', 'CONTEXT_HISTORY'],
      bloomberg: ['REAL_TIME_MARKET_DATA', 'NEWS_FEEDS', 'ECONOMIC_INDICATORS', 'TECHNICAL_INDICATORS'],
      blackrock: ['PORTFOLIO_DATA', 'RISK_MODELS', 'MARKET_INDICES', 'HISTORICAL_PERFORMANCE'],
      robinhood: ['USER_BEHAVIOR_DATA', 'UX_ANALYTICS', 'ENGAGEMENT_METRICS', 'DESIGN_PATTERNS'],
    };
    
    return dataSources[agentType as keyof typeof dataSources] || ['GENERAL_MARKET_DATA'];
  }
}

// 전역 인스턴스들
export const contextManager = new ContextManager();
export const learningManager = new LearningManager();
export const collaborationManager = new CollaborationManager();

// 타입 정의들
interface ContextData {
  type: string;
  data: any;
  agentType?: string;
}

interface ContextHistory {
  timestamp: number;
  data: ContextData;
  type: string;
}

interface ContextSession {
  sessionId: string;
  history: ContextHistory[];
  createdAt: number;
  lastUpdated: number;
  metadata: Record<string, any>;
}

interface UserFeedback {
  rating: number; // 1-5
  comment?: string;
  issues?: string[];
  suggestions?: string[];
}

interface FeedbackEntry {
  requestId: string;
  feedback: UserFeedback;
  timestamp: number;
}

interface AgentPerformance {
  totalRequests: number;
  positiveRatings: number;
  negativeRatings: number;
  averageRating: number;
  commonIssues: Map<string, number>;
  improvements: string[];
}

interface UserPreferences {
  riskTolerance: 'conservative' | 'medium' | 'aggressive';
  investmentHorizon: string;
  preferredSectors: string[];
  analysisDepth: 'basic' | 'standard' | 'detailed';
}

interface AgentTask {
  agentType: string;
  action: string;
  parameters: any;
  usePreviousResults?: boolean;
}

interface MultiAgentTask {
  agentTasks: AgentTask[];
  executionMode: 'sequential' | 'parallel';
  shareContext: boolean;
  synthesisStrategy: SynthesisStrategy;
}

interface AgentResult {
  agentType: string;
  action: string;
  response: AIAgentResponse;
  executionTime: number;
  success: boolean;
}

interface MultiAgentResponse {
  success: boolean;
  results: AgentResult[];
  synthesizedResult?: any;
  error?: string;
  metadata: {
    executionTime: number;
    agentsUsed: string[];
    executionMode: string;
  };
}

type SynthesisStrategy = 'consensus' | 'weighted_average' | 'best_confidence' | 'comprehensive';

// 편의 함수들
export async function createEnhancedAnalysis(
  symbol: string,
  sessionId?: string
): Promise<MultiAgentResponse> {
  const task: MultiAgentTask = {
    agentTasks: [
      {
        agentType: 'goldman_sachs',
        action: 'analyze_stock',
        parameters: { symbol, analysisType: 'comprehensive' },
      },
      {
        agentType: 'bloomberg',
        action: 'technical_analysis',
        parameters: { symbol, timeframe: '3M' },
      },
      {
        agentType: 'bloomberg',
        action: 'news_sentiment',
        parameters: { symbol },
        usePreviousResults: true,
      },
    ],
    executionMode: 'sequential',
    shareContext: true,
    synthesisStrategy: 'comprehensive',
  };

  return collaborationManager.orchestrateMultiAgentTask(task, sessionId || `analysis_${Date.now()}`);
}

export async function recordAgentFeedback(
  agentType: string,
  requestId: string,
  feedback: UserFeedback
): Promise<void> {
  learningManager.recordFeedback(agentType, requestId, feedback);
}

export function getAgentInsights(agentType: string): {
  performance: AgentPerformance | null;
  suggestions: string[];
} {
  const performance = learningManager.getAgentPerformance(agentType);
  const suggestions = learningManager.generateImprovementSuggestions(agentType);
  
  return { performance, suggestions };
}