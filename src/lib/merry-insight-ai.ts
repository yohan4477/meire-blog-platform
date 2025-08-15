/**
 * MerryInsightAI - 메르의 매크로 트렌드 논리체인 추출 시스템
 * 
 * 메르 특화 분석:
 * 지정학적 이벤트 → 공급망 차단 → 경제 충격 → 주식 기회
 */

import { query } from './database';

// 타입 정의
export interface MacroEvent {
  id?: number;
  event_title: string;
  event_type: 'geopolitical' | 'economic' | 'natural' | 'technological';
  event_category: string;
  event_description: string;
  event_date?: string;
  severity_score: number;
  impact_regions: string[];
  source_urls: string[];
  extracted_from_post_id: number;
}

export interface CausalChain {
  id?: number;
  chain_title: string;
  chain_description: string;
  source_post_id: number;
  confidence_score: number;
  prediction_horizon: '1w' | '1m' | '3m' | '6m' | '1y';
  investment_thesis: string;
  steps: CausalStep[];
  correlations: StockCorrelation[];
}

export interface CausalStep {
  id?: number;
  chain_id?: number;
  step_order: number;
  step_type: 'trigger' | 'intermediate' | 'outcome';
  step_description: string;
  affected_entity: string;
  entity_type: 'country' | 'company' | 'sector' | 'commodity' | 'currency';
  impact_direction: 'positive' | 'negative' | 'neutral';
  confidence_score: number;
}

export interface StockCorrelation {
  id?: number;
  chain_id?: number;
  ticker: string;
  company_name: string;
  correlation_type: 'direct' | 'supplier' | 'competitor' | 'sector';
  expected_impact: 'strong_positive' | 'positive' | 'neutral' | 'negative' | 'strong_negative';
  impact_probability: number;
  reasoning: string;
}

// 메르 특화 키워드 사전 (실제 포스트 패턴 기반)
const MERRY_ANALYSIS_PATTERNS = {
  // 비즈니스 이벤트 키워드 (메르 특화)
  business_events: {
    corporate: ['실적', '매출', '이익', '손실', '적자', '흑자', '영업이익'],
    legal: ['소송', '승소', '패소', '특허', '법원', '판결', '계약'],
    strategic: ['인수', '합병', 'M&A', '투자', '지분', '협력', '파트너십'],
    operations: ['공장', '생산', '제조', '가동', '중단', '재개', '확장'],
  },

  // 경제 지표 및 정책 (메르 관심사)
  economic_indicators: {
    macro: ['CPI', '소비자물가지수', '인플레이션', '금리', 'GDP', '경제성장'],
    monetary: ['연준', '중앙은행', '기준금리', '통화정책', '양적완화'],
    market: ['증시', '주가', '코스피', '나스닥', 'S&P', '다우', '상승', '하락'],
    sectors: ['반도체', '방위산업', '항만', '조선', '에너지', '바이오', 'IT'],
  },

  // 지정학적 이벤트 (기존 유지하되 확장)
  geopolitical: {
    conflicts: ['전쟁', '분쟁', '갈등', '침공', '공격', '방어'],
    trade: ['무역전쟁', '관세', '수출규제', '제재', 'USMCA', 'RCEP'],
    defense: ['방위산업', '무기수출', '국방비', '군사협력', 'K2전차', 'KF21'],
    regions: ['우크라이나', '러시아', '중국', '대만', '중동', '폴란드'],
  },

  // 공급망 및 물류 (메르 관심 확장)
  supply_chain: {
    infrastructure: ['항만', '공항', '철도', '고속도로', '크레인', '터미널'],
    logistics: ['물류', '운송', '배송', '유통', '창고', '재고'],
    disruption: ['공급차질', '부족', '지연', '차단', '봉쇄'],
    materials: ['원자재', '철강', '구리', '리튬', '반도체', '칩셋'],
  },

  // 투자 기회 및 분석 (메르식 표현)
  investment_analysis: {
    opportunities: ['투자기회', '매수', '관심', '주목', '유망', '전망'],
    risks: ['리스크', '위험', '우려', '불안', '변동성', '불확실성'],
    performance: ['수익률', '성과', '실적', '배당', '주주환원', 'ROE'],
    valuation: ['밸류에이션', '저평가', '고평가', 'PER', 'PBR', '목표가'],
  }
};

export class MerryInsightAI {
  
  /**
   * 메르 포스트에서 논리체인 추출
   */
  async extractCausalChain(postId: number, postContent: string, postTitle: string): Promise<CausalChain | null> {
    try {
      console.log(`🧠 [MerryInsightAI] 논리체인 추출 시작: ${postTitle}`);
      
      // 1. 지정학적 이벤트 감지
      const events = await this.detectMacroEvents(postContent, postId);
      
      if (events.length === 0) {
        console.log('❌ 지정학적 이벤트를 찾지 못했습니다.');
        return null;
      }

      // 2. 논리체인 구조 분석
      const causalSteps = await this.analyzeCausalStructure(postContent);
      
      if (causalSteps.length < 2) {
        console.log('❌ 충분한 논리체인을 찾지 못했습니다.');
        return null;
      }

      // 3. 논리체인 품질 검증
      const qualityScore = this.validateChainQuality(causalSteps);
      if (qualityScore < 0.6) {
        console.log(`❌ 논리체인 품질이 낮습니다 (점수: ${qualityScore})`);
        return null;
      }

      // 3. 주식 연관성 분석
      const stockCorrelations = await this.identifyStockCorrelations(postContent, causalSteps);

      // 4. 신뢰도 및 예측 기간 계산
      const confidenceScore = this.calculateConfidenceScore(causalSteps, stockCorrelations);
      const predictionHorizon = this.estimatePredictionHorizon(postContent, causalSteps);

      // 5. 투자 논제 추출
      const investmentThesis = this.extractInvestmentThesis(causalSteps, stockCorrelations);

      const causalChain: CausalChain = {
        chain_title: `${postTitle} - 논리체인 분석`,
        chain_description: this.generateChainDescription(causalSteps),
        source_post_id: postId,
        confidence_score: confidenceScore,
        prediction_horizon: predictionHorizon,
        investment_thesis: investmentThesis,
        steps: causalSteps,
        correlations: stockCorrelations
      };

      // 6. 데이터베이스에 저장
      await this.saveCausalChain(causalChain);

      console.log(`✅ [MerryInsightAI] 논리체인 추출 완료: ${causalSteps.length}단계, 신뢰도 ${confidenceScore}`);
      return causalChain;

    } catch (error) {
      console.error('❌ [MerryInsightAI] 논리체인 추출 실패:', error);
      return null;
    }
  }

  /**
   * 매크로 이벤트 감지 (확장된 패턴)
   */
  private async detectMacroEvents(content: string, postId: number): Promise<MacroEvent[]> {
    const events: MacroEvent[] = [];
    const text = content.toLowerCase();

    // 모든 카테고리에서 이벤트 패턴 매칭
    const allPatterns = [
      { type: 'economic', patterns: MERRY_ANALYSIS_PATTERNS.economic_indicators },
      { type: 'geopolitical', patterns: MERRY_ANALYSIS_PATTERNS.geopolitical },
      { type: 'technological', patterns: MERRY_ANALYSIS_PATTERNS.business_events },
      { type: 'natural', patterns: MERRY_ANALYSIS_PATTERNS.supply_chain }
    ];

    for (const { type, patterns } of allPatterns) {
      for (const [category, keywords] of Object.entries(patterns)) {
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            // 이벤트 추출 및 컨텍스트 분석
            const eventContext = this.extractEventContext(content, keyword);
            
            const event: MacroEvent = {
              event_title: `${keyword} 관련 ${this.getEventTypeKorean(type)} 이벤트`,
              event_type: type as any,
              event_category: category,
              event_description: eventContext,
              severity_score: this.calculateEventSeverity(keyword, eventContext),
              impact_regions: this.extractImpactedRegions(eventContext),
              source_urls: [],
              extracted_from_post_id: postId
            };

            events.push(event);
            break; // 중복 방지
          }
        }
      }
    }

    return events;
  }

  private getEventTypeKorean(type: string): string {
    const typeMap = {
      'economic': '경제',
      'geopolitical': '지정학',
      'technological': '기업',
      'natural': '공급망'
    };
    return typeMap[type] || type;
  }

  /**
   * 논리체인 구조 분석 (개선된 버전)
   */
  private async analyzeCausalStructure(content: string): Promise<CausalStep[]> {
    const steps: CausalStep[] = [];
    
    // 1. 명확한 인과관계 패턴 찾기
    const causalPatterns = this.extractCausalPatterns(content);
    
    if (causalPatterns.length < 2) {
      console.log('⚠️ 충분한 인과관계를 찾지 못했습니다.');
      return steps;
    }

    // 2. 논리적 순서로 정렬
    const orderedPatterns = this.orderCausalSteps(causalPatterns);
    
    // 3. 단계별 변환
    let stepOrder = 1;
    for (const pattern of orderedPatterns) {
      steps.push({
        step_order: stepOrder++,
        step_type: pattern.type,
        step_description: pattern.description,
        affected_entity: pattern.entity,
        entity_type: pattern.entityType,
        impact_direction: pattern.impact,
        confidence_score: pattern.confidence
      });
    }

    return steps;
  }

  /**
   * 명확한 인과관계 패턴 추출
   */
  private extractCausalPatterns(content: string): Array<{
    type: 'trigger' | 'intermediate' | 'outcome',
    description: string,
    entity: string,
    entityType: 'country' | 'company' | 'sector' | 'commodity' | 'currency',
    impact: 'positive' | 'negative' | 'neutral',
    confidence: number,
    order: number
  }> {
    const patterns = [];
    
    // 트리거 이벤트 패턴 (시작점)
    const triggerPatterns = [
      /(.{20,200}(?:정책|발표|결정|승인|계약|소송|발표함|요구|허용).*?)/gi,
      /(.{20,200}(?:전쟁|분쟁|제재|관세|규제|금지).*?)/gi
    ];

    // 중간 연결 패턴 (논리적 연결)
    const intermediatePatterns = [
      /(.{20,200}(?:이로 인해|따라서|그 결과|때문에|영향으로).*?)/gi,
      /(.{20,200}(?:이런 상황에서|이렇게 되면|그러면).*?)/gi
    ];

    // 결과 패턴 (최종 영향)
    const outcomePatterns = [
      /(.{20,200}(?:오를 것|상승할|하락할|기회|수혜|영향을 받을).*?)/gi,
      /(.{20,200}(?:투자기회|매수|성장할|확대될|변화).*?)/gi
    ];

    // 각 패턴 타입별로 추출
    this.extractByPatterns(content, triggerPatterns, 'trigger', patterns);
    this.extractByPatterns(content, intermediatePatterns, 'intermediate', patterns);
    this.extractByPatterns(content, outcomePatterns, 'outcome', patterns);

    return patterns.slice(0, 5); // 최대 5단계로 제한
  }

  /**
   * 패턴별 추출 헬퍼
   */
  private extractByPatterns(content: string, patterns: RegExp[], type: string, results: any[]) {
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches.slice(0, 2)) { // 타입당 최대 2개
          const cleaned = match.replace(/^\d+\.\s*/, '').trim();
          if (cleaned.length > 20) {
            results.push({
              type,
              description: cleaned,
              entity: this.extractAffectedEntity(cleaned),
              entityType: this.classifyEntityType(cleaned),
              impact: this.determineImpactDirection(cleaned),
              confidence: this.calculateStepConfidence(cleaned),
              order: results.length
            });
          }
        }
      }
    }
  }

  /**
   * 논리적 순서로 단계 정렬
   */
  private orderCausalSteps(patterns: any[]): any[] {
    // 논리적 순서: trigger → intermediate → outcome
    const triggers = patterns.filter(p => p.type === 'trigger');
    const intermediates = patterns.filter(p => p.type === 'intermediate');
    const outcomes = patterns.filter(p => p.type === 'outcome');

    const ordered = [];
    
    // 최소 하나의 트리거와 하나의 결과가 있어야 함
    if (triggers.length > 0 && (intermediates.length > 0 || outcomes.length > 0)) {
      ordered.push(triggers[0]); // 주요 트리거
      
      if (intermediates.length > 0) {
        ordered.push(intermediates[0]); // 중간 단계
      }
      
      if (outcomes.length > 0) {
        ordered.push(outcomes[0]); // 최종 결과
      }
    }

    return ordered;
  }

  /**
   * 논리체인 품질 검증
   */
  private validateChainQuality(steps: CausalStep[]): number {
    let score = 0;
    
    // 1. 단계별 다양성 점검 (모든 트리거는 낮은 점수)
    const stepTypes = steps.map(s => s.step_type);
    const uniqueTypes = new Set(stepTypes);
    
    if (uniqueTypes.size === 1 && uniqueTypes.has('trigger')) {
      return 0.2; // 모든 단계가 트리거면 낮은 점수
    }
    
    score += uniqueTypes.size * 0.3; // 다양성 점수 (최대 0.9)
    
    // 2. 논리적 흐름 점검
    const hasTrigger = stepTypes.includes('trigger');
    const hasOutcome = stepTypes.includes('outcome');
    
    if (hasTrigger && hasOutcome) {
      score += 0.4; // 시작과 끝이 있음
    }
    
    // 3. 인과관계 연결어 점검
    const causalWords = ['때문에', '따라서', '이로 인해', '그 결과', '영향으로'];
    const hasCausalConnection = steps.some(step => 
      causalWords.some(word => step.step_description.includes(word))
    );
    
    if (hasCausalConnection) {
      score += 0.3; // 명확한 인과관계 표현
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * 주식 연관성 식별
   */
  private async identifyStockCorrelations(content: string, steps: CausalStep[]): Promise<StockCorrelation[]> {
    const correlations: StockCorrelation[] = [];
    
    // 메르가 언급한 종목들 찾기
    const mentionedStocks = await this.findMentionedStocks(content);
    
    for (const stock of mentionedStocks) {
      // 논리체인과의 연관성 분석
      const correlation = await this.analyzeStockChainCorrelation(stock, steps, content);
      if (correlation) {
        correlations.push(correlation);
      }
    }

    return correlations;
  }

  /**
   * 메르가 언급한 종목 찾기
   */
  private async findMentionedStocks(content: string): Promise<Array<{ticker: string, name: string}>> {
    try {
      // 데이터베이스에서 기존 언급 종목들 가져오기 (stocks 테이블에서 회사명 조인)
      const existingStocks = await query<{ticker: string, company_name: string}>(
        `SELECT DISTINCT mms.ticker, s.company_name 
         FROM merry_mentioned_stocks mms 
         LEFT JOIN stocks s ON mms.ticker = s.ticker`
      );

      const mentionedStocks: Array<{ticker: string, name: string}> = [];

      for (const stock of existingStocks) {
        // 티커나 회사명이 언급되었는지 확인
        if (content.includes(stock.ticker) || content.includes(stock.company_name)) {
          mentionedStocks.push({
            ticker: stock.ticker,
            name: stock.company_name
          });
        }
      }

      return mentionedStocks;
    } catch (error) {
      console.error('종목 언급 검색 오류:', error);
      return [];
    }
  }

  /**
   * 주식-논리체인 연관성 분석
   */
  private async analyzeStockChainCorrelation(
    stock: {ticker: string, name: string}, 
    steps: CausalStep[], 
    content: string
  ): Promise<StockCorrelation | null> {
    
    // 각 단계에서 주식과의 연관성 점수 계산
    let maxRelevanceScore = 0;
    let bestReasoninng = '';
    let correlationType: 'direct' | 'supplier' | 'competitor' | 'sector' = 'sector';
    let expectedImpact: 'strong_positive' | 'positive' | 'neutral' | 'negative' | 'strong_negative' = 'neutral';

    for (const step of steps) {
      const relevanceScore = this.calculateStockStepRelevance(stock, step, content);
      
      if (relevanceScore > maxRelevanceScore) {
        maxRelevanceScore = relevanceScore;
        bestReasoninng = this.generateCorrelationReasoning(stock, step);
        correlationType = this.determineCorrelationType(stock, step);
        expectedImpact = this.determineExpectedImpact(step.impact_direction, relevanceScore);
      }
    }

    if (maxRelevanceScore < 0.3) {
      return null; // 연관성이 너무 낮음
    }

    return {
      ticker: stock.ticker,
      company_name: stock.name,
      correlation_type: correlationType,
      expected_impact: expectedImpact,
      impact_probability: maxRelevanceScore,
      reasoning: bestReasoninng
    };
  }

  // 헬퍼 메서드들
  private extractEventContext(content: string, keyword: string): string {
    const sentences = content.split(/[.!?]/);
    for (const sentence of sentences) {
      if (sentence.includes(keyword)) {
        return sentence.trim();
      }
    }
    return keyword;
  }

  private calculateEventSeverity(keyword: string, context: string): number {
    // 키워드와 컨텍스트 기반 심각도 계산
    const severityKeywords = {
      high: ['전쟁', '침공', '봉쇄', '폭등'],
      medium: ['제재', '관세', '차단', '급등'],
      low: ['협상', '논의', '검토', '상승']
    };

    if (severityKeywords.high.some(k => context.includes(k))) return 0.8;
    if (severityKeywords.medium.some(k => context.includes(k))) return 0.6;
    return 0.4;
  }

  private extractImpactedRegions(context: string): string[] {
    const regions = [];
    const regionKeywords = {
      '아시아': ['한국', '중국', '일본', '아시아', '동아시아'],
      '유럽': ['유럽', '독일', '프랑스', '영국', 'EU'],
      '북미': ['미국', '캐나다', '북미', 'US'],
      '중동': ['중동', '사우디', '이란', '이라크'],
      '남미': ['브라질', '아르헨티나', '남미', '라틴']
    };

    for (const [region, keywords] of Object.entries(regionKeywords)) {
      if (keywords.some(k => context.includes(k))) {
        regions.push(region);
      }
    }

    return regions;
  }

  private isTriggerEvent(sentence: string): boolean {
    const triggerPatterns = [
      // 기업 이벤트
      '실적 발표', '소송', '승소', '계약', '인수', '합병',
      // 경제 지표
      'CPI', '인플레이션', '금리', '발표',
      // 정책/규제
      '정책', '규제', '승인', '허가',
      // 지정학적
      '전쟁', '제재', '분쟁', '갈등'
    ];
    return triggerPatterns.some(pattern => sentence.includes(pattern));
  }

  private isIntermediateStep(sentence: string): boolean {
    const intermediatePatterns = [
      // 논리 연결어
      '따라서', '그러면', '이로 인해', '결과적으로', '그래서', '그러므로',
      // 메르식 표현
      '이런 상황에서', '이렇게 되면', '그런데', '여기서', '하지만',
      // 분석 표현
      '영향을 받아', '때문에', '덕분에', '영향으로'
    ];
    return intermediatePatterns.some(pattern => sentence.includes(pattern));
  }

  private isOutcomeStep(sentence: string): boolean {
    const outcomePatterns = [
      // 주가 관련
      '오를 것', '상승할', '하락할', '오를 수', '떨어질',
      // 투자 관련
      '투자기회', '매수', '관심', '주목', '유망',
      // 비즈니스 결과
      '수혜', '혜택', '이익', '성장할', '확대될',
      // 영향 관련
      '영향을 받을', '타격을 받을', '기회가'
    ];
    return outcomePatterns.some(pattern => sentence.includes(pattern));
  }

  private extractAffectedEntity(sentence: string): string {
    // 문장에서 주요 엔티티 추출 (메르 포스트 기반 확장)
    const entities = [
      // 주요 기업
      '삼성', '삼성전자', '삼성디스플레이', '테슬라', 'TSLA', '애플', 'AAPL',
      '구글', 'GOOGL', '엔비디아', 'NVDA', '마이크로소프트', 'MSFT',
      // 한국 기업
      '현대차', '현대모비스', 'LG', 'SK하이닉스', '포스코', '삼성SDI',
      // 산업/섹터
      '반도체', '에너지', '원자재', '방위산업', '항만', '조선', '바이오',
      'IT', '자동차', '배터리', '디스플레이',
      // 특정 제품/기술
      'K2전차', '크레인', 'CPI', '인플레이션'
    ];
    
    for (const entity of entities) {
      if (sentence.includes(entity)) {
        return entity;
      }
    }
    return '미확인';
  }

  private classifyEntityType(sentence: string): 'country' | 'company' | 'sector' | 'commodity' | 'currency' {
    const patterns = {
      country: ['한국', '미국', '중국', '일본'],
      company: ['삼성', '테슬라', 'TSLA', '애플'],
      sector: ['반도체', '에너지', '자동차', '바이오'],
      commodity: ['원자재', '철강', '구리', '리튬', '석유'],
      currency: ['달러', '원화', '위안화', '엔화']
    };

    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(k => sentence.includes(k))) {
        return type as any;
      }
    }
    return 'sector';
  }

  private determineImpactDirection(sentence: string): 'positive' | 'negative' | 'neutral' {
    const positiveKeywords = ['오를', '상승', '증가', '혜택', '기회', '성장'];
    const negativeKeywords = ['하락', '감소', '타격', '악영향', '손실'];

    if (positiveKeywords.some(k => sentence.includes(k))) return 'positive';
    if (negativeKeywords.some(k => sentence.includes(k))) return 'negative';
    return 'neutral';
  }

  private calculateStepConfidence(sentence: string): number {
    // 문장의 확실성 정도 계산
    const certaintyKeywords = ['확실히', '반드시', '틀림없이'];
    const uncertaintyKeywords = ['아마도', '가능성', '~할 수도'];

    if (certaintyKeywords.some(k => sentence.includes(k))) return 0.8;
    if (uncertaintyKeywords.some(k => sentence.includes(k))) return 0.4;
    return 0.6;
  }

  private calculateConfidenceScore(steps: CausalStep[], correlations: StockCorrelation[]): number {
    if (steps.length === 0) return 0;
    
    const avgStepConfidence = steps.reduce((sum, step) => sum + step.confidence_score, 0) / steps.length;
    const correlationBonus = correlations.length > 0 ? 0.1 : 0;
    
    return Math.min(avgStepConfidence + correlationBonus, 1.0);
  }

  private estimatePredictionHorizon(content: string, steps: CausalStep[]): '1w' | '1m' | '3m' | '6m' | '1y' {
    // 컨텐츠와 단계 복잡도에 따른 예측 기간 추정
    const timeHints = {
      '1w': ['즉시', '바로', '단기'],
      '1m': ['한달', '단기간'],
      '3m': ['분기', '3개월'],
      '6m': ['반년', '중기'],
      '1y': ['연간', '장기', '내년']
    };

    for (const [horizon, keywords] of Object.entries(timeHints)) {
      if (keywords.some(k => content.includes(k))) {
        return horizon as any;
      }
    }

    // 기본 로직: 단계가 많을수록 장기 예측
    if (steps.length >= 4) return '6m';
    if (steps.length >= 3) return '3m';
    return '1m';
  }

  private extractInvestmentThesis(steps: CausalStep[], correlations: StockCorrelation[]): string {
    const triggerSteps = steps.filter(s => s.step_type === 'trigger');
    const outcomeSteps = steps.filter(s => s.step_type === 'outcome');
    
    let thesis = '';
    
    if (triggerSteps.length > 0) {
      thesis += `트리거: ${triggerSteps[0].step_description}. `;
    }
    
    if (outcomeSteps.length > 0) {
      thesis += `결과: ${outcomeSteps[0].step_description}. `;
    }

    if (correlations.length > 0) {
      const positiveCorrelations = correlations.filter(c => 
        c.expected_impact === 'positive' || c.expected_impact === 'strong_positive'
      );
      
      if (positiveCorrelations.length > 0) {
        const tickers = positiveCorrelations.map(c => c.ticker).join(', ');
        thesis += `투자 기회: ${tickers}`;
      }
    }

    return thesis || '매크로 트렌드 기반 분석';
  }

  private generateChainDescription(steps: CausalStep[]): string {
    return steps.map((step, index) => 
      `${index + 1}. ${step.step_description}`
    ).join(' → ');
  }

  private calculateStockStepRelevance(stock: {ticker: string, name: string}, step: CausalStep, content: string): number {
    let score = 0;

    // 직접 언급
    if (step.step_description.includes(stock.ticker) || step.step_description.includes(stock.name)) {
      score += 0.8;
    }

    // 섹터 연관성
    if (this.isStockInSector(stock, step.affected_entity)) {
      score += 0.4;
    }

    // 임팩트 방향성
    if (step.impact_direction !== 'neutral') {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private isStockInSector(stock: {ticker: string, name: string}, sector: string): boolean {
    // 간단한 섹터 매핑 (실제로는 더 정교한 데이터 필요)
    const sectorMappings = {
      '반도체': ['NVDA', '삼성전자', 'TSMC'],
      '자동차': ['TSLA', '현대차', 'GM'],
      '에너지': ['XOM', 'CVX', '한국전력']
    };

    for (const [sectorName, tickers] of Object.entries(sectorMappings)) {
      if (sector.includes(sectorName) && tickers.includes(stock.ticker)) {
        return true;
      }
    }

    return false;
  }

  private generateCorrelationReasoning(stock: {ticker: string, name: string}, step: CausalStep): string {
    return `${step.step_description} 단계에서 ${stock.name}(${stock.ticker})이 ${step.impact_direction} 영향을 받을 것으로 분석됨`;
  }

  private determineCorrelationType(stock: {ticker: string, name: string}, step: CausalStep): 'direct' | 'supplier' | 'competitor' | 'sector' {
    if (step.step_description.includes(stock.name)) return 'direct';
    if (step.step_description.includes('공급') || step.step_description.includes('협력')) return 'supplier';
    return 'sector';
  }

  private determineExpectedImpact(direction: string, relevance: number): 'strong_positive' | 'positive' | 'neutral' | 'negative' | 'strong_negative' {
    if (direction === 'positive') {
      return relevance > 0.7 ? 'strong_positive' : 'positive';
    } else if (direction === 'negative') {
      return relevance > 0.7 ? 'strong_negative' : 'negative';
    }
    return 'neutral';
  }

  /**
   * 논리체인을 데이터베이스에 저장
   */
  private async saveCausalChain(chain: CausalChain): Promise<number> {
    try {
      // 1. 메인 체인 저장
      const chainResult = await query<{id: number}>(
        `INSERT INTO causal_chains (chain_title, chain_description, source_post_id, confidence_score, prediction_horizon, investment_thesis)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        [chain.chain_title, chain.chain_description, chain.source_post_id, chain.confidence_score, chain.prediction_horizon, chain.investment_thesis]
      );

      const chainId = chainResult[0].id;

      // 2. 단계별 저장
      for (const step of chain.steps) {
        await query(
          `INSERT INTO causal_steps (chain_id, step_order, step_type, step_description, affected_entity, entity_type, impact_direction, confidence_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [chainId, step.step_order, step.step_type, step.step_description, step.affected_entity, step.entity_type, step.impact_direction, step.confidence_score]
        );
      }

      // 3. 주식 연관성 저장
      for (const correlation of chain.correlations) {
        await query(
          `INSERT INTO stock_correlations (chain_id, ticker, company_name, correlation_type, expected_impact, impact_probability, reasoning)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [chainId, correlation.ticker, correlation.company_name, correlation.correlation_type, correlation.expected_impact, correlation.impact_probability, correlation.reasoning]
        );
      }

      console.log(`💾 [MerryInsightAI] 논리체인 저장 완료: ID ${chainId}`);
      return chainId;

    } catch (error) {
      console.error('❌ [MerryInsightAI] 논리체인 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 저장된 논리체인 조회 (중복 제거 및 실제 포스트 연결)
   */
  async getCausalChains(postId?: number, limit: number = 10): Promise<CausalChain[]> {
    try {
      // 1. 먼저 고유한 논리체인만 조회 (중복 제거)
      let chainSql = `
        SELECT DISTINCT cc.*, bp.title as post_title, bp.created_date as post_date
        FROM causal_chains cc
        LEFT JOIN blog_posts bp ON cc.source_post_id = bp.id
        WHERE cc.source_post_id IS NOT NULL AND bp.id IS NOT NULL
      `;

      const params: any[] = [];
      if (postId) {
        chainSql += ' AND cc.source_post_id = ?';
        params.push(postId);
      }

      // 중복 제거: 같은 chain_title과 source_post_id를 가진 것 중 최신 것만
      chainSql += `
        AND cc.id IN (
          SELECT MAX(id) 
          FROM causal_chains 
          GROUP BY chain_title, source_post_id
        )
        ORDER BY cc.created_at DESC
      `;
      
      if (limit) {
        chainSql += ' LIMIT ?';
        params.push(limit);
      }

      const chainResults = await query<any>(chainSql, params);

      if (chainResults.length === 0) {
        return [];
      }

      const chainIds = chainResults.map(r => r.id);
      
      // 2. 각 체인의 단계들 조회
      const stepsSql = `
        SELECT cs.* 
        FROM causal_steps cs 
        WHERE cs.chain_id IN (${chainIds.map(() => '?').join(',')})
        ORDER BY cs.chain_id, cs.step_order
      `;
      const stepsResults = await query<any>(stepsSql, chainIds);

      // 3. 각 체인의 연관성 조회
      const corrSql = `
        SELECT sc.* 
        FROM stock_correlations sc 
        WHERE sc.chain_id IN (${chainIds.map(() => '?').join(',')})
        ORDER BY sc.chain_id
      `;
      const corrResults = await query<any>(corrSql, chainIds);

      // 4. 데이터 조립
      const chains: CausalChain[] = chainResults.map(row => {
        const steps = stepsResults
          .filter(s => s.chain_id === row.id)
          .map(s => ({
            id: s.id,
            chain_id: s.chain_id,
            step_order: s.step_order,
            step_type: s.step_type,
            step_description: s.step_description,
            affected_entity: s.affected_entity,
            entity_type: s.entity_type,
            impact_direction: s.impact_direction,
            confidence_score: s.confidence_score
          }));

        const correlations = corrResults
          .filter(c => c.chain_id === row.id)
          .map(c => ({
            id: c.id,
            chain_id: c.chain_id,
            ticker: c.ticker,
            company_name: c.company_name,
            correlation_type: c.correlation_type,
            expected_impact: c.expected_impact,
            impact_probability: c.impact_probability,
            reasoning: c.reasoning
          }));

        return {
          id: row.id,
          chain_title: row.chain_title,
          chain_description: row.chain_description,
          source_post_id: row.source_post_id,
          confidence_score: row.confidence_score,
          prediction_horizon: row.prediction_horizon,
          investment_thesis: row.investment_thesis,
          created_at: row.created_at,
          steps: steps.sort((a, b) => a.step_order - b.step_order),
          correlations
        };
      });

      console.log(`📊 [MerryInsightAI] 논리체인 조회 완료: ${chains.length}개 (중복 제거됨)`);
      return chains;

    } catch (error) {
      console.error('❌ [MerryInsightAI] 논리체인 조회 실패:', error);
      return [];
    }
  }
}

// 싱글톤 인스턴스
let merryInsightAIInstance: MerryInsightAI | null = null;

export function getMerryInsightAI(): MerryInsightAI {
  if (!merryInsightAIInstance) {
    merryInsightAIInstance = new MerryInsightAI();
  }
  return merryInsightAIInstance;
}