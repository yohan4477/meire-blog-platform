/**
 * 하이브리드 AI 패턴 분석 시스템
 * 룰 기반 + AI 임베딩 + RAG 기법 통합 접근법
 */

import { query } from '@/lib/database';

export interface EnhancedPattern {
  ruleBasedScore: number;
  semanticSimilarity: number;
  contextualRelevance: number;
  hybridScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  improvements: string[];
}

export class HybridPatternAnalyzer {
  private basePatterns: any = null;
  private semanticThreshold = 0.7;

  constructor() {
    // 룰 기반 패턴을 기본으로 로드
    this.loadBasePatterns();
  }

  private async loadBasePatterns() {
    // 기존 룰 기반 패턴 로드
    this.basePatterns = {
      sourcePatterns: {
        'OGQ': { weight: 0.3, keywords: ['OGQ', '출처'] },
        'government': { weight: 0.4, keywords: ['CIA', 'FBI', '국방부'] },
        'media': { weight: 0.2, keywords: ['조선일보', '연합뉴스'] },
        'corporate': { weight: 0.1, keywords: ['공시', '발표'] }
      },
      logicFlow: {
        historical: { weight: 0.25, patterns: ['\\d+년.*?(전|이전|당시)'] },
        current: { weight: 0.25, patterns: ['현재.*?(상황|달러|가격)'] },
        future: { weight: 0.25, patterns: ['(전망|미래|계획|예정|목표)'] },
        investment: { weight: 0.25, patterns: ['한줄 코멘트|투자|추천'] }
      },
      keywordPatterns: {
        high_confidence: ['늦생시', '한줄 코멘트', '기본가정'],
        recommendation: ['롱이고', '숏이다', '좋은 투자', '추천'],
        certainty: ['확실', '분명', '틀림없이']
      }
    };
  }

  /**
   * 하이브리드 분석: 룰 기반 + 의미적 유사도 + 컨텍스트 관련성
   */
  async analyzeWithHybridApproach(post: any): Promise<EnhancedPattern> {
    // 1. 기존 룰 기반 점수 계산
    const ruleBasedScore = await this.calculateRuleBasedScore(post);
    
    // 2. 의미적 유사도 계산 (벡터 임베딩 기반)
    const semanticSimilarity = await this.calculateSemanticSimilarity(post);
    
    // 3. 컨텍스트 관련성 분석 (RAG-like 접근)
    const contextualRelevance = await this.analyzeContextualRelevance(post);
    
    // 4. 하이브리드 스코어 계산 (가중평균)
    const hybridScore = this.calculateHybridScore(ruleBasedScore, semanticSimilarity, contextualRelevance);
    
    // 5. 신뢰도 및 개선 제안 생성
    const confidence = this.determineConfidence(hybridScore, ruleBasedScore, semanticSimilarity);
    const reasoning = this.generateReasoning(ruleBasedScore, semanticSimilarity, contextualRelevance);
    const improvements = this.suggestImprovements(post, hybridScore);

    return {
      ruleBasedScore: ruleBasedScore.total,
      semanticSimilarity,
      contextualRelevance,
      hybridScore,
      confidence,
      reasoning,
      improvements
    };
  }

  /**
   * 기존 룰 기반 점수 계산 (개선된 버전)
   */
  private async calculateRuleBasedScore(post: any) {
    const content = post.content;
    let totalScore = 0;
    const breakdown = { sources: 0, logic: 0, keywords: 0, timeFlow: 0, stocks: 0 };

    // 출처 패턴 분석 (30점)
    for (const [sourceType, config] of Object.entries(this.basePatterns.sourcePatterns)) {
      for (const keyword of config.keywords) {
        if (content.includes(keyword)) {
          const score = 30 * config.weight;
          breakdown.sources += score;
          totalScore += score;
          break;
        }
      }
    }

    // 논리 흐름 패턴 (40점)
    for (const [flowType, config] of Object.entries(this.basePatterns.logicFlow)) {
      for (const pattern of config.patterns) {
        if (content.match(new RegExp(pattern))) {
          const score = 40 * config.weight;
          breakdown.logic += score;
          totalScore += score;
          break;
        }
      }
    }

    // 키워드 패턴 (30점)
    const highConfKeywords = this.basePatterns.keywordPatterns.high_confidence.some(k => content.includes(k));
    const recommendKeywords = this.basePatterns.keywordPatterns.recommendation.some(k => content.includes(k));
    
    if (highConfKeywords) {
      breakdown.keywords += 20;
      totalScore += 20;
    }
    if (recommendKeywords) {
      breakdown.keywords += 10;
      totalScore += 10;
    }

    return { total: Math.min(totalScore, 100), breakdown };
  }

  /**
   * 의미적 유사도 계산 (임베딩 기반)
   * 실제 구현에서는 OpenAI embeddings나 Sentence Transformers 사용
   */
  private async calculateSemanticSimilarity(post: any): Promise<number> {
    try {
      // 늦생시 포스트들의 임베딩과 비교
      const lateStartPosts = await query<{content: string}>(`
        SELECT content FROM blog_posts 
        WHERE title LIKE '%늦생시%' 
        ORDER BY created_date DESC 
        LIMIT 5
      `);

      // 간소화된 의미적 유사도 계산 (실제로는 임베딩 벡터 비교)
      const currentText = this.preprocessText(post.content);
      let totalSimilarity = 0;

      for (const referencePost of lateStartPosts) {
        const referenceText = this.preprocessText(referencePost.content);
        const similarity = this.calculateTextSimilarity(currentText, referenceText);
        totalSimilarity += similarity;
      }

      return totalSimilarity / lateStartPosts.length;
      
    } catch (error) {
      console.error('의미적 유사도 계산 오류:', error);
      return 0.5; // 기본값
    }
  }

  /**
   * 컨텍스트 관련성 분석 (RAG-like 접근)
   */
  private async analyzeContextualRelevance(post: any): Promise<number> {
    try {
      // 1. 유사한 시기의 포스트들 검색
      const timeWindow = 30; // 30일 전후
      const postDate = new Date(post.created_date);
      const startDate = new Date(postDate.getTime() - timeWindow * 24 * 60 * 60 * 1000);
      const endDate = new Date(postDate.getTime() + timeWindow * 24 * 60 * 60 * 1000);

      const contextPosts = await query<{content: string, title: string}>(`
        SELECT content, title FROM blog_posts 
        WHERE created_date BETWEEN ? AND ?
          AND title LIKE '%늦생시%'
          AND id != ?
      `, [startDate.toISOString(), endDate.toISOString(), post.id]);

      // 2. 컨텍스트 관련성 점수 계산
      let relevanceScore = 0;
      
      // 종목 일치도
      const currentStocks = this.extractStockMentions(post.content);
      for (const contextPost of contextPosts) {
        const contextStocks = this.extractStockMentions(contextPost.content);
        const stockOverlap = this.calculateOverlap(currentStocks, contextStocks);
        relevanceScore += stockOverlap * 0.4;
      }

      // 논리 구조 일치도
      const currentLogic = this.extractLogicStructure(post.content);
      for (const contextPost of contextPosts) {
        const contextLogic = this.extractLogicStructure(contextPost.content);
        const logicSimilarity = this.calculateStructureSimilarity(currentLogic, contextLogic);
        relevanceScore += logicSimilarity * 0.6;
      }

      return Math.min(relevanceScore / Math.max(contextPosts.length, 1), 1.0);
      
    } catch (error) {
      console.error('컨텍스트 관련성 분석 오류:', error);
      return 0.5; // 기본값
    }
  }

  /**
   * 하이브리드 스코어 계산 (가중평균)
   */
  private calculateHybridScore(
    ruleScore: number, 
    semanticSimilarity: number, 
    contextRelevance: number
  ): number {
    // 가중치 설정 (조정 가능)
    const weights = {
      rules: 0.4,      // 룰 기반 점수 40%
      semantic: 0.35,  // 의미적 유사도 35% 
      context: 0.25    // 컨텍스트 관련성 25%
    };

    const normalizedRuleScore = ruleScore / 100;
    
    return (
      normalizedRuleScore * weights.rules +
      semanticSimilarity * weights.semantic +
      contextRelevance * weights.context
    ) * 100;
  }

  /**
   * 신뢰도 결정
   */
  private determineConfidence(
    hybridScore: number, 
    ruleScore: any, 
    semanticSimilarity: number
  ): 'high' | 'medium' | 'low' {
    // 모든 지표가 높은 경우
    if (hybridScore >= 80 && ruleScore.total >= 70 && semanticSimilarity >= 0.8) {
      return 'high';
    }
    
    // 일부 지표가 높은 경우
    if (hybridScore >= 60 && (ruleScore.total >= 50 || semanticSimilarity >= 0.6)) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * 근거 생성
   */
  private generateReasoning(
    ruleScore: any, 
    semanticSimilarity: number, 
    contextRelevance: number
  ): string[] {
    const reasoning = [];

    if (ruleScore.total >= 70) {
      reasoning.push(`룰 기반 분석에서 높은 점수 (${ruleScore.total}점)`);
    }

    if (semanticSimilarity >= 0.7) {
      reasoning.push(`늦생시 포스트와 높은 의미적 유사도 (${(semanticSimilarity * 100).toFixed(1)}%)`);
    }

    if (contextRelevance >= 0.6) {
      reasoning.push(`동일 시기 추천 포스트와 컨텍스트 일치도 높음`);
    }

    if (ruleScore.breakdown.sources >= 20) {
      reasoning.push('신뢰할 수 있는 출처 활용');
    }

    if (ruleScore.breakdown.logic >= 25) {
      reasoning.push('완전한 논리 구조 보유');
    }

    return reasoning.length > 0 ? reasoning : ['일반적인 블로그 포스트 패턴'];
  }

  /**
   * 개선 제안 생성
   */
  private suggestImprovements(post: any, hybridScore: number): string[] {
    const improvements = [];

    if (hybridScore < 60) {
      improvements.push('더 구체적인 출처 표기 필요');
      improvements.push('논리적 근거 보강 필요');
    }

    if (!post.content.includes('늦생시')) {
      improvements.push('추천 신호 키워드 부족');
    }

    const stockMentions = this.extractStockMentions(post.content);
    if (stockMentions.length === 0) {
      improvements.push('구체적인 종목 언급 부족');
    }

    return improvements;
  }

  // 유틸리티 메소드들
  private preprocessText(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // 간소화된 Jaccard 유사도 계산
    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private extractStockMentions(content: string): string[] {
    const stockPatterns = [
      /팔란티어|PLTR/gi,
      /TMC|The Metals Company/gi,
      /테슬라|TSLA/gi,
      /엔비디아|NVDA/gi,
      /고려아연/gi,
      /풍산/gi
    ];

    const mentions = [];
    for (const pattern of stockPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        mentions.push(...matches);
      }
    }

    return [...new Set(mentions)];
  }

  private extractLogicStructure(content: string): any {
    return {
      hasHistorical: !!content.match(/\d+년.*?(전|이전|당시)/),
      hasCurrent: !!content.match(/현재.*?(상황|달러|가격)/),
      hasFuture: !!content.match(/(전망|미래|계획|예정|목표)/),
      hasInvestment: !!content.match(/한줄 코멘트|투자|추천/)
    };
  }

  private calculateOverlap(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateStructureSimilarity(struct1: any, struct2: any): number {
    const keys = Object.keys(struct1);
    let matches = 0;
    
    for (const key of keys) {
      if (struct1[key] === struct2[key]) {
        matches++;
      }
    }
    
    return matches / keys.length;
  }
}