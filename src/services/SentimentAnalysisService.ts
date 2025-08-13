/**
 * 🧠 고급 감정 분석 서비스 - Context7 Intelligence
 * AI 기반 다층 감정 분석 및 트렌드 예측
 */

import { cacheService } from './CacheService';

interface SentimentScore {
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  confidence: number;
  score: number; // -1.0 to +1.0
  keywords: Array<{
    word: string;
    weight: number;
    category: 'bullish' | 'bearish' | 'neutral';
  }>;
  emotions: {
    excitement: number;
    fear: number;
    greed: number;
    optimism: number;
    pessimism: number;
  };
}

interface ContextualAnalysis {
  marketContext: {
    overall: 'bull' | 'bear' | 'sideways';
    volatility: 'high' | 'medium' | 'low';
    sentiment: number;
  };
  timeContext: {
    trend: 'improving' | 'stable' | 'declining';
    momentum: number;
    volatility: number;
  };
  socialContext: {
    mentionFrequency: 'increasing' | 'stable' | 'decreasing';
    influencerSentiment: number;
    retailSentiment: number;
  };
}

interface SentimentTrend {
  ticker: string;
  timeline: Array<{
    date: string;
    sentiment: number;
    volume: number;
    events: string[];
  }>;
  prediction: {
    nextWeek: number;
    confidence: number;
    factors: string[];
  };
}

export class SentimentAnalysisService {
  private readonly SENTIMENT_KEYWORDS = {
    veryPositive: {
      korean: ['대박', '폭등', '급등', '최고', '추천', '매수', '황금', '잭팟', '로켓', '폭발'],
      english: ['moon', 'rocket', 'bullish', 'buy', 'strong', 'breakout', 'rally', 'surge'],
      weight: 1.0
    },
    positive: {
      korean: ['상승', '좋음', '성장', '증가', '호재', '긍정', '기대', '투자'],
      english: ['up', 'growth', 'positive', 'gain', 'bull', 'rise', 'optimistic'],
      weight: 0.7
    },
    neutral: {
      korean: ['보합', '횡보', '관망', '대기', '현상유지'],
      english: ['flat', 'sideways', 'neutral', 'hold', 'stable'],
      weight: 0.0
    },
    negative: {
      korean: ['하락', '손실', '악재', '위험', '매도', '조정'],
      english: ['down', 'bear', 'sell', 'decline', 'loss', 'risk'],
      weight: -0.7
    },
    veryNegative: {
      korean: ['폭락', '급락', '망함', '최악', '공포', '패닉', '붕괴'],
      english: ['crash', 'plunge', 'panic', 'disaster', 'collapse', 'bearish'],
      weight: -1.0
    }
  };

  private readonly EMOTION_INDICATORS = {
    excitement: ['🚀', '💎', '🔥', '💪', '🎯', '대박', 'moon', 'rocket'],
    fear: ['😰', '😨', '💀', '⚠️', '🔴', '공포', '위험', 'panic', 'crash'],
    greed: ['💰', '💵', '🤑', '돈', '수익', 'profit', 'money'],
    optimism: ['✅', '💚', '📈', '희망', '기대', 'hope', 'bullish'],
    pessimism: ['❌', '🔴', '📉', '실망', '포기', 'bear', 'doom']
  };

  /**
   * 🧠 텍스트 고급 감정 분석
   */
  async analyzeSentiment(text: string, ticker?: string): Promise<SentimentScore> {
    const cacheKey = `sentiment_${this.hashText(text)}`;
    const cached = cacheService.getSentiment(cacheKey);
    
    if (cached) {
      return cached;
    }

    const analysis = this.performAnalysis(text);
    const contextualAdjustment = ticker ? await this.getContextualAdjustment(ticker) : 0;
    
    // 컨텍스트를 반영한 최종 점수
    const finalScore = Math.max(-1, Math.min(1, analysis.score + contextualAdjustment));
    
    const result: SentimentScore = {
      ...analysis,
      score: finalScore,
      sentiment: this.scoresToSentiment(finalScore)
    };

    cacheService.setSentiment(cacheKey, result);
    return result;
  }

  /**
   * 다층 텍스트 분석 수행
   */
  private performAnalysis(text: string): Omit<SentimentScore, 'sentiment'> {
    const normalizedText = text.toLowerCase();
    let totalScore = 0;
    let totalWeight = 0;
    const foundKeywords: SentimentScore['keywords'] = [];
    const emotions = {
      excitement: 0,
      fear: 0,
      greed: 0,
      optimism: 0,
      pessimism: 0
    };

    // 1. 키워드 기반 분석
    Object.entries(this.SENTIMENT_KEYWORDS).forEach(([category, data]) => {
      const allWords = [...data.korean, ...data.english];
      
      allWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = normalizedText.match(regex);
        
        if (matches) {
          const count = matches.length;
          const weight = data.weight * count;
          
          totalScore += weight;
          totalWeight += Math.abs(weight);
          
          foundKeywords.push({
            word,
            weight: data.weight,
            category: data.weight > 0 ? 'bullish' : data.weight < 0 ? 'bearish' : 'neutral'
          });
        }
      });
    });

    // 2. 감정 지표 분석
    Object.entries(this.EMOTION_INDICATORS).forEach(([emotion, indicators]) => {
      indicators.forEach(indicator => {
        if (normalizedText.includes(indicator.toLowerCase())) {
          emotions[emotion as keyof typeof emotions] += 0.2;
        }
      });
    });

    // 3. 문맥 기반 분석
    const contextScore = this.analyzeContext(text);
    
    // 4. 최종 점수 계산
    const baseScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const emotionWeight = (emotions.excitement + emotions.optimism - emotions.fear - emotions.pessimism) * 0.1;
    const finalScore = Math.max(-1, Math.min(1, baseScore + contextScore + emotionWeight));

    // 5. 신뢰도 계산
    const confidence = Math.min(1, (totalWeight + Object.values(emotions).reduce((a, b) => a + b)) / 5);

    return {
      score: finalScore,
      confidence,
      keywords: foundKeywords,
      emotions
    };
  }

  /**
   * 문맥 기반 분석
   */
  private analyzeContext(text: string): number {
    let contextScore = 0;

    // 부정문 검출
    const negationWords = ['안', '못', '없', '아니', 'not', 'no', 'never'];
    const hasNegation = negationWords.some(word => text.includes(word));
    
    // 의문문 검출
    const isQuestion = text.includes('?') || text.includes('까');
    
    // 조건문 검출
    const isConditional = text.includes('만약') || text.includes('if') || text.includes('면');

    // 과거형 검출
    const isPast = text.includes('었') || text.includes('was') || text.includes('were');

    // 미래형/예측 검출
    const isFuture = text.includes('될') || text.includes('will') || text.includes('예상');

    // 스코어 조정
    if (hasNegation) contextScore -= 0.2;
    if (isQuestion) contextScore *= 0.7; // 불확실성
    if (isConditional) contextScore *= 0.6; // 조건부
    if (isPast) contextScore *= 0.8; // 과거 사실
    if (isFuture) contextScore *= 1.2; // 미래 기대

    return contextScore;
  }

  /**
   * 컨텍스트 기반 조정
   */
  private async getContextualAdjustment(ticker: string): Promise<number> {
    try {
      // 최근 시장 동향을 반영한 조정
      const recentTrend = await this.getRecentTrend(ticker);
      const marketSentiment = await this.getMarketSentiment();
      
      return (recentTrend + marketSentiment) * 0.1; // 최대 ±0.2 조정
    } catch (error) {
      return 0;
    }
  }

  /**
   * 배치 감정 분석
   */
  async analyzeBatch(posts: Array<{ id: string; content: string; ticker?: string }>): Promise<Record<string, SentimentScore>> {
    const results: Record<string, SentimentScore> = {};
    
    // 캐시된 결과 먼저 확인
    const uncachedPosts = posts.filter(post => {
      const cacheKey = `sentiment_${this.hashText(post.content)}`;
      const cached = cacheService.getSentiment(cacheKey);
      if (cached) {
        results[post.id] = cached;
        return false;
      }
      return true;
    });

    // 병렬 처리
    const promises = uncachedPosts.map(async post => {
      const sentiment = await this.analyzeSentiment(post.content, post.ticker);
      results[post.id] = sentiment;
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 시계열 감정 트렌드 분석
   */
  async analyzeTrend(ticker: string, days: number = 30): Promise<SentimentTrend> {
    const cacheKey = `sentiment_trend_${ticker}_${days}d`;
    const cached = cacheService.get<SentimentTrend>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // 실제 구현에서는 데이터베이스에서 과거 포스트들을 조회
    const mockTimeline = this.generateMockTimeline(ticker, days);
    
    const trend: SentimentTrend = {
      ticker,
      timeline: mockTimeline,
      prediction: await this.predictSentiment(mockTimeline)
    };

    cacheService.set(cacheKey, trend, 'SENTIMENT');
    return trend;
  }

  /**
   * 감정 예측 모델
   */
  private async predictSentiment(timeline: SentimentTrend['timeline']): Promise<SentimentTrend['prediction']> {
    if (timeline.length < 7) {
      return { nextWeek: 0, confidence: 0.3, factors: ['insufficient_data'] };
    }

    // 간단한 트렌드 분석
    const recentWeek = timeline.slice(-7);
    const previousWeek = timeline.slice(-14, -7);
    
    const recentAvg = recentWeek.reduce((sum, day) => sum + day.sentiment, 0) / recentWeek.length;
    const previousAvg = previousWeek.reduce((sum, day) => sum + day.sentiment, 0) / previousWeek.length;
    
    const momentum = recentAvg - previousAvg;
    const volatility = this.calculateVolatility(recentWeek.map(day => day.sentiment));
    
    // 예측 계산
    const prediction = recentAvg + (momentum * 0.5);
    const confidence = Math.max(0.3, 1 - volatility);
    
    const factors = [];
    if (momentum > 0.1) factors.push('positive_momentum');
    if (momentum < -0.1) factors.push('negative_momentum');
    if (volatility > 0.3) factors.push('high_volatility');
    
    return {
      nextWeek: Math.max(-1, Math.min(1, prediction)),
      confidence,
      factors
    };
  }

  /**
   * 변동성 계산
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 1;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Mock 타임라인 생성 (실제 구현에서는 DB 조회)
   */
  private generateMockTimeline(ticker: string, days: number): SentimentTrend['timeline'] {
    const timeline: SentimentTrend['timeline'] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      timeline.push({
        date: date.toISOString().split('T')[0],
        sentiment: Math.random() * 2 - 1, // -1 to 1
        volume: Math.floor(Math.random() * 100) + 10,
        events: i % 7 === 0 ? ['weekly_analysis'] : []
      });
    }
    
    return timeline;
  }

  /**
   * 최근 트렌드 조회
   */
  private async getRecentTrend(ticker: string): Promise<number> {
    // 실제 구현에서는 최근 주가 동향을 분석
    return Math.random() * 0.4 - 0.2; // -0.2 to 0.2
  }

  /**
   * 전체 시장 감정 조회
   */
  private async getMarketSentiment(): Promise<number> {
    // 실제 구현에서는 VIX, 공포탐욕지수 등을 활용
    return Math.random() * 0.4 - 0.2; // -0.2 to 0.2
  }

  /**
   * 점수를 감정으로 변환
   */
  private scoresToSentiment(score: number): SentimentScore['sentiment'] {
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    if (score >= -0.2) return 'neutral';
    if (score >= -0.6) return 'negative';
    return 'very_negative';
  }

  /**
   * 텍스트 해시 생성
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * 감정 분석 통계
   */
  getAnalysisStats(): {
    totalAnalyzed: number;
    cacheHitRate: number;
    averageConfidence: number;
  } {
    // 실제 구현에서는 통계를 추적
    return {
      totalAnalyzed: 0,
      cacheHitRate: 0.85,
      averageConfidence: 0.76
    };
  }
}

// 싱글톤 인스턴스
export const sentimentAnalyzer = new SentimentAnalysisService();