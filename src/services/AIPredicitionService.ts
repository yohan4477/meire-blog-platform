/**
 * 🤖 AI 예측 모델 - 메르's Pick 패턴 분석 및 주가 예측
 * 머신러닝 기반 투자 성과 예측 및 최적 진입/청산 시점 제안
 */

import { cacheService } from './CacheService';
import { sentimentAnalyzer } from './SentimentAnalysisService';
import { StockPriceService } from './StockPriceService';

interface PredictionInput {
  ticker: string;
  historicalPrices: number[];
  sentimentScores: number[];
  mentionCounts: number[];
  marketContext: {
    vix: number;
    sp500Change: number;
    sectorPerformance: number;
  };
  mereData: {
    totalMentions: number;
    avgSentiment: number;
    mentionTrend: 'increasing' | 'stable' | 'decreasing';
    daysSinceFirstMention: number;
  };
}

interface PredictionResult {
  ticker: string;
  timeframe: '1d' | '7d' | '30d';
  prediction: {
    priceTarget: number;
    probability: number;
    direction: 'up' | 'down' | 'sideways';
    confidence: number;
  };
  factors: Array<{
    name: string;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }>;
  riskAssessment: {
    volatility: number;
    maxDrawdown: number;
    sharpeRatio: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  entryPoints: Array<{
    price: number;
    confidence: number;
    reasoning: string;
  }>;
  exitPoints: Array<{
    price: number;
    type: 'take_profit' | 'stop_loss';
    confidence: number;
  }>;
  timestamp: number;
}

interface MerePattern {
  ticker: string;
  pattern: 'early_discovery' | 'momentum_build' | 'peak_hype' | 'decline';
  characteristics: {
    mentionVelocity: number;
    sentimentEvolution: number[];
    priceCorrelation: number;
    timeInCycle: number; // days
  };
  historicalOutcomes: {
    avgReturn7d: number;
    avgReturn30d: number;
    successRate: number;
    volatility: number;
  };
}

interface PortfolioOptimization {
  allocations: Record<string, number>; // ticker -> weight (0-1)
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  diversificationScore: number;
  rebalanceFrequency: 'weekly' | 'monthly' | 'quarterly';
}

export class AIPredictionService {
  private stockPriceService: StockPriceService;
  private modelCache = new Map<string, any>();
  
  // 메르's Pick 패턴 가중치
  private readonly PATTERN_WEIGHTS = {
    early_discovery: {
      sentiment_weight: 0.4,
      momentum_weight: 0.3,
      volume_weight: 0.2,
      time_decay: 0.1
    },
    momentum_build: {
      sentiment_weight: 0.3,
      momentum_weight: 0.4,
      volume_weight: 0.2,
      time_decay: 0.1
    },
    peak_hype: {
      sentiment_weight: 0.2,
      momentum_weight: 0.2,
      volume_weight: 0.3,
      time_decay: 0.3
    },
    decline: {
      sentiment_weight: 0.1,
      momentum_weight: 0.1,
      volume_weight: 0.2,
      time_decay: 0.6
    }
  };

  constructor() {
    this.stockPriceService = new StockPriceService();
  }

  /**
   * 🤖 메인 예측 함수
   */
  async predictStock(ticker: string, timeframe: '1d' | '7d' | '30d' = '7d'): Promise<PredictionResult> {
    const cacheKey = `prediction_${ticker}_${timeframe}`;
    const cached = cacheService.get<PredictionResult>(cacheKey);
    
    if (cached) {
      return cached;
    }

    console.log(`🤖 Generating AI prediction for ${ticker} (${timeframe})`);
    const startTime = Date.now();

    try {
      // 1. 입력 데이터 수집
      const input = await this.collectPredictionInput(ticker);
      
      // 2. 메르 패턴 분석
      const merePattern = await this.analyzeMerePattern(ticker, input);
      
      // 3. 기술적 분석
      const technicalSignals = this.analyzeTechnicalIndicators(input.historicalPrices);
      
      // 4. 감정 트렌드 분석
      const sentimentTrend = this.analyzeSentimentTrend(input.sentimentScores);
      
      // 5. 시장 컨텍스트 분석
      const marketImpact = this.analyzeMarketContext(input.marketContext);
      
      // 6. 예측 모델 실행
      const prediction = this.runPredictionModel(
        input, 
        merePattern, 
        technicalSignals, 
        sentimentTrend, 
        marketImpact,
        timeframe
      );
      
      const result: PredictionResult = {
        ticker,
        timeframe,
        prediction,
        factors: this.generateFactors(merePattern, technicalSignals, sentimentTrend, marketImpact),
        riskAssessment: this.assessRisk(input, prediction),
        entryPoints: this.findOptimalEntryPoints(input, prediction),
        exitPoints: this.calculateExitPoints(input, prediction),
        timestamp: Date.now()
      };

      // 캐시 저장
      cacheService.set(cacheKey, result, 'SENTIMENT');
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ AI prediction completed in ${processingTime}ms`);
      
      return result;

    } catch (error) {
      console.error(`❌ Prediction failed for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * 예측 입력 데이터 수집
   */
  private async collectPredictionInput(ticker: string): Promise<PredictionInput> {
    const [historicalData, sentimentTrend] = await Promise.all([
      this.stockPriceService.getHistoricalData(ticker, 6),
      sentimentAnalyzer.analyzeTrend(ticker, 30)
    ]);

    const historicalPrices = historicalData.map(d => d.price);
    const sentimentScores = sentimentTrend.timeline.map(t => t.sentiment);
    const mentionCounts = sentimentTrend.timeline.map(t => t.volume);

    return {
      ticker,
      historicalPrices,
      sentimentScores,
      mentionCounts,
      marketContext: {
        vix: Math.random() * 30 + 10, // Mock VIX
        sp500Change: (Math.random() - 0.5) * 4, // -2% to +2%
        sectorPerformance: (Math.random() - 0.5) * 6 // -3% to +3%
      },
      mereData: {
        totalMentions: mentionCounts.reduce((sum, count) => sum + count, 0),
        avgSentiment: sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length,
        mentionTrend: this.calculateMentionTrend(mentionCounts),
        daysSinceFirstMention: sentimentTrend.timeline.length
      }
    };
  }

  /**
   * 메르's Pick 패턴 분석
   */
  private async analyzeMerePattern(ticker: string, input: PredictionInput): Promise<MerePattern> {
    const { mereData, mentionCounts, sentimentScores, historicalPrices } = input;

    // 패턴 분류
    let pattern: MerePattern['pattern'];
    
    if (mereData.daysSinceFirstMention < 30 && mereData.mentionTrend === 'increasing') {
      pattern = 'early_discovery';
    } else if (mereData.mentionTrend === 'increasing' && mereData.avgSentiment > 0.3) {
      pattern = 'momentum_build';
    } else if (mereData.totalMentions > 100 && mereData.avgSentiment > 0.5) {
      pattern = 'peak_hype';
    } else {
      pattern = 'decline';
    }

    // 특성 계산
    const mentionVelocity = this.calculateVelocity(mentionCounts);
    const sentimentEvolution = this.calculateMovingAverage(sentimentScores, 7);
    const priceCorrelation = this.calculateCorrelation(sentimentScores, historicalPrices);

    // 과거 결과 (시뮬레이션)
    const historicalOutcomes = this.simulateHistoricalOutcomes(pattern);

    return {
      ticker,
      pattern,
      characteristics: {
        mentionVelocity,
        sentimentEvolution,
        priceCorrelation,
        timeInCycle: mereData.daysSinceFirstMention
      },
      historicalOutcomes
    };
  }

  /**
   * 기술적 지표 분석
   */
  private analyzeTechnicalIndicators(prices: number[]): any {
    if (prices.length < 20) {
      return { sma20: null, rsi: null, macd: null, momentum: 0 };
    }

    const sma20 = this.calculateSMA(prices, 20);
    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    const momentum = this.calculateMomentum(prices, 10);

    return {
      sma20: sma20[sma20.length - 1],
      rsi: rsi[rsi.length - 1],
      macd,
      momentum,
      currentPrice: prices[prices.length - 1],
      support: Math.min(...prices.slice(-20)),
      resistance: Math.max(...prices.slice(-20))
    };
  }

  /**
   * 예측 모델 실행
   */
  private runPredictionModel(
    input: PredictionInput,
    merePattern: MerePattern,
    technicalSignals: any,
    sentimentTrend: any,
    marketImpact: any,
    timeframe: string
  ): PredictionResult['prediction'] {
    const weights = this.PATTERN_WEIGHTS[merePattern.pattern];
    
    // 각 팩터별 점수 계산
    const sentimentScore = this.calculateSentimentScore(input.sentimentScores) * weights.sentiment_weight;
    const momentumScore = this.calculateMomentumScore(technicalSignals) * weights.momentum_weight;
    const volumeScore = this.calculateVolumeScore(input.mentionCounts) * weights.volume_weight;
    const timeDecay = this.calculateTimeDecay(merePattern.characteristics.timeInCycle) * weights.time_decay;
    
    // 종합 점수
    const compositeScore = sentimentScore + momentumScore + volumeScore - timeDecay;
    
    // 시장 조정
    const marketAdjustment = marketImpact * 0.1;
    const finalScore = Math.max(-1, Math.min(1, compositeScore + marketAdjustment));
    
    // 가격 예측
    const currentPrice = input.historicalPrices[input.historicalPrices.length - 1];
    const expectedReturn = this.scoreToReturnPrediction(finalScore, timeframe);
    const priceTarget = currentPrice * (1 + expectedReturn);
    
    // 방향 및 확률
    const direction = finalScore > 0.1 ? 'up' : finalScore < -0.1 ? 'down' : 'sideways';
    const probability = Math.min(0.95, Math.abs(finalScore) * 0.8 + 0.5);
    const confidence = probability * merePattern.historicalOutcomes.successRate;

    return {
      priceTarget,
      probability,
      direction,
      confidence
    };
  }

  /**
   * 위험도 평가
   */
  private assessRisk(input: PredictionInput, prediction: any): PredictionResult['riskAssessment'] {
    const prices = input.historicalPrices;
    const volatility = this.calculateVolatility(prices);
    const maxDrawdown = this.calculateMaxDrawdown(prices);
    const returns = this.calculateReturns(prices);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    
    const riskLevel = volatility > 0.3 ? 'high' : volatility > 0.15 ? 'medium' : 'low';

    return {
      volatility,
      maxDrawdown,
      sharpeRatio,
      riskLevel
    };
  }

  /**
   * 최적 진입점 계산
   */
  private findOptimalEntryPoints(input: PredictionInput, prediction: any): PredictionResult['entryPoints'] {
    const currentPrice = input.historicalPrices[input.historicalPrices.length - 1];
    const volatility = this.calculateVolatility(input.historicalPrices);
    
    return [
      {
        price: currentPrice * 0.98, // 2% 하락시 진입
        confidence: 0.8,
        reasoning: '단기 조정 후 진입'
      },
      {
        price: currentPrice, // 현재가 진입
        confidence: 0.6,
        reasoning: '즉시 진입'
      },
      {
        price: currentPrice * (1 + volatility * 0.5), // 상승 브레이크아웃
        confidence: 0.7,
        reasoning: '상승 브레이크아웃 확인 후 진입'
      }
    ];
  }

  /**
   * 청산점 계산
   */
  private calculateExitPoints(input: PredictionInput, prediction: any): PredictionResult['exitPoints'] {
    const currentPrice = input.historicalPrices[input.historicalPrices.length - 1];
    const targetPrice = prediction.priceTarget;
    
    return [
      {
        price: targetPrice,
        type: 'take_profit',
        confidence: prediction.confidence
      },
      {
        price: currentPrice * 0.9, // 10% 손절
        type: 'stop_loss',
        confidence: 0.9
      },
      {
        price: targetPrice * 0.8, // 부분 익절
        type: 'take_profit',
        confidence: 0.7
      }
    ];
  }

  /**
   * 배치 예측
   */
  async predictMultiple(
    tickers: string[], 
    timeframe: '1d' | '7d' | '30d' = '7d'
  ): Promise<Record<string, PredictionResult>> {
    const results: Record<string, PredictionResult> = {};
    
    // 병렬 처리로 성능 최적화
    const promises = tickers.map(async ticker => {
      try {
        const prediction = await this.predictStock(ticker, timeframe);
        return { ticker, prediction };
      } catch (error) {
        console.error(`Failed to predict ${ticker}:`, error);
        return { ticker, prediction: null };
      }
    });

    const responses = await Promise.all(promises);
    
    responses.forEach(({ ticker, prediction }) => {
      if (prediction) {
        results[ticker] = prediction;
      }
    });

    return results;
  }

  /**
   * 포트폴리오 최적화
   */
  async optimizePortfolio(tickers: string[], capital: number = 100000): Promise<PortfolioOptimization> {
    console.log(`🎯 Optimizing portfolio for ${tickers.length} stocks`);
    
    // 각 종목 예측
    const predictions = await this.predictMultiple(tickers);
    
    // 기대수익률과 위험도 계산
    const expectedReturns: Record<string, number> = {};
    const risks: Record<string, number> = {};
    
    Object.entries(predictions).forEach(([ticker, pred]) => {
      const currentPrice = pred.prediction.priceTarget / (1 + (Math.random() - 0.5) * 0.1); // Mock current price
      expectedReturns[ticker] = (pred.prediction.priceTarget - currentPrice) / currentPrice;
      risks[ticker] = pred.riskAssessment.volatility;
    });
    
    // 간단한 마코위츠 최적화 (실제로는 더 복잡한 알고리즘 필요)
    const allocations = this.calculateOptimalAllocations(expectedReturns, risks);
    
    // 포트폴리오 메트릭 계산
    const portfolioReturn = Object.entries(allocations).reduce(
      (sum, [ticker, weight]) => sum + weight * expectedReturns[ticker], 0
    );
    
    const portfolioVolatility = Math.sqrt(
      Object.entries(allocations).reduce(
        (sum, [ticker, weight]) => sum + Math.pow(weight * risks[ticker], 2), 0
      )
    );
    
    const sharpeRatio = portfolioReturn / portfolioVolatility;
    const maxDrawdown = Math.max(...Object.values(risks)) * 0.6; // Simplified
    const diversificationScore = 1 - this.calculateConcentration(allocations);

    return {
      allocations,
      expectedReturn: portfolioReturn,
      expectedVolatility: portfolioVolatility,
      sharpeRatio,
      maxDrawdown,
      diversificationScore,
      rebalanceFrequency: portfolioVolatility > 0.2 ? 'weekly' : 'monthly'
    };
  }

  // === 유틸리티 함수들 ===

  private calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateRSI(prices: number[], period: number): number[] {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? -change : 0);
    
    const rsi: number[] = [];
    for (let i = period; i < changes.length; i++) {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }

  private calculateMACD(prices: number[]): any {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12.map((val, i) => val - ema26[i]);
    const signalLine = this.calculateEMA(macdLine, 9);
    const histogram = macdLine.map((val, i) => val - signalLine[i]);
    
    return {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram: histogram[histogram.length - 1]
    };
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
      ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    
    return ema;
  }

  private calculateVolatility(prices: number[]): number {
    const returns = this.calculateReturns(prices);
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateReturns(prices: number[]): number[] {
    return prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length);
    return (mean * 252 - riskFreeRate) / (std * Math.sqrt(252));
  }

  private calculateMaxDrawdown(prices: number[]): number {
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > peak) {
        peak = prices[i];
      } else {
        const drawdown = (peak - prices[i]) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
    
    return maxDrawdown;
  }

  private calculateOptimalAllocations(
    expectedReturns: Record<string, number>,
    risks: Record<string, number>
  ): Record<string, number> {
    const tickers = Object.keys(expectedReturns);
    const allocations: Record<string, number> = {};
    
    // 간단한 위험조정수익률 기반 할당
    const scores = tickers.map(ticker => expectedReturns[ticker] / risks[ticker]);
    const totalScore = scores.reduce((sum, score) => sum + Math.max(0, score), 0);
    
    tickers.forEach((ticker, i) => {
      allocations[ticker] = Math.max(0, scores[i]) / totalScore;
    });
    
    return allocations;
  }

  private calculateConcentration(allocations: Record<string, number>): number {
    const weights = Object.values(allocations);
    return weights.reduce((sum, weight) => sum + Math.pow(weight, 2), 0);
  }

  // Mock implementations for various calculations
  private calculateMentionTrend(counts: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (counts.length < 7) return 'stable';
    const recent = counts.slice(-7).reduce((a, b) => a + b, 0);
    const previous = counts.slice(-14, -7).reduce((a, b) => a + b, 0);
    return recent > previous * 1.2 ? 'increasing' : recent < previous * 0.8 ? 'decreasing' : 'stable';
  }

  private calculateVelocity(values: number[]): number {
    if (values.length < 2) return 0;
    const recent = values.slice(-7);
    const previous = values.slice(-14, -7);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    return (recentAvg - previousAvg) / previousAvg;
  }

  private calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = window - 1; i < values.length; i++) {
      const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
    return result;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    
    return numerator / Math.sqrt(denomX * denomY);
  }

  private simulateHistoricalOutcomes(pattern: string): MerePattern['historicalOutcomes'] {
    // Mock historical data - 실제로는 DB에서 조회
    const outcomes = {
      early_discovery: { avgReturn7d: 0.15, avgReturn30d: 0.35, successRate: 0.75, volatility: 0.25 },
      momentum_build: { avgReturn7d: 0.08, avgReturn30d: 0.20, successRate: 0.65, volatility: 0.20 },
      peak_hype: { avgReturn7d: -0.05, avgReturn30d: -0.10, successRate: 0.35, volatility: 0.30 },
      decline: { avgReturn7d: -0.12, avgReturn30d: -0.25, successRate: 0.25, volatility: 0.35 }
    };
    
    return outcomes[pattern as keyof typeof outcomes];
  }

  private calculateSentimentScore(scores: number[]): number {
    return scores.slice(-7).reduce((a, b) => a + b, 0) / 7;
  }

  private calculateMomentumScore(signals: any): number {
    let score = 0;
    if (signals.rsi) {
      score += signals.rsi > 50 ? 0.3 : -0.3;
    }
    if (signals.macd) {
      score += signals.macd.macd > signals.macd.signal ? 0.3 : -0.3;
    }
    if (signals.momentum) {
      score += signals.momentum > 0 ? 0.4 : -0.4;
    }
    return Math.max(-1, Math.min(1, score));
  }

  private calculateVolumeScore(counts: number[]): number {
    const recent = counts.slice(-7).reduce((a, b) => a + b, 0);
    const previous = counts.slice(-14, -7).reduce((a, b) => a + b, 0);
    return previous > 0 ? Math.min(1, (recent - previous) / previous) : 0;
  }

  private calculateTimeDecay(days: number): number {
    return Math.min(1, days / 180); // 6개월 후 완전 감소
  }

  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];
    return (current - past) / past;
  }

  private scoreToReturnPrediction(score: number, timeframe: string): number {
    const baseReturn = score * 0.2; // 최대 ±20%
    const timeMultiplier = timeframe === '1d' ? 0.2 : timeframe === '7d' ? 1 : 2;
    return baseReturn * timeMultiplier;
  }

  private generateFactors(merePattern: any, technical: any, sentiment: any, market: any): PredictionResult['factors'] {
    return [
      {
        name: 'Mere Pattern',
        weight: 0.3,
        impact: merePattern.historicalOutcomes.avgReturn7d > 0 ? 'positive' : 'negative',
        description: `Pattern: ${merePattern.pattern}, Success Rate: ${(merePattern.historicalOutcomes.successRate * 100).toFixed(1)}%`
      },
      {
        name: 'Technical Indicators',
        weight: 0.25,
        impact: technical.momentum > 0 ? 'positive' : 'negative',
        description: `RSI: ${technical.rsi?.toFixed(1) || 'N/A'}, Momentum: ${(technical.momentum * 100).toFixed(1)}%`
      },
      {
        name: 'Sentiment Trend',
        weight: 0.25,
        impact: sentiment > 0 ? 'positive' : 'negative',
        description: `Average sentiment: ${(sentiment * 100).toFixed(1)}%`
      },
      {
        name: 'Market Context',
        weight: 0.2,
        impact: market > 0 ? 'positive' : 'negative',
        description: `Market conditions: ${market > 0 ? 'favorable' : 'challenging'}`
      }
    ];
  }
}

// 싱글톤 인스턴스
export const aiPredictor = new AIPredictionService();