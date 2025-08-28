/**
 * 메르의 논리 흐름 및 추천 패턴 분석 시스템
 * "늦생시" 포스트들을 기반으로 한 투자 로직 패턴 학습
 */

export interface LogicPattern {
  id: string;
  title: string;
  date: string;
  
  // 논리 구조
  logicFlow: {
    historicalContext: string[];    // 역사적 배경/사례
    currentIssue: string[];        // 현재 문제점/이슈
    solutionPath: string[];        // 해결책/대안
    investmentThesis: string[];    // 투자 논리
  };
  
  // 출처 패턴
  sources: {
    type: 'government' | 'media' | 'academic' | 'corporate' | 'personal';
    name: string;
    credibility: number; // 1-10 점수
    frequency: number;   // 메르가 얼마나 자주 사용하는지
  }[];
  
  // 추천 종목
  recommendations: {
    ticker: string;
    company: string;
    rationale: string;
    confidence: number; // 1-10 점수
    timeframe: string;  // 예상 시간 프레임
  }[];
  
  // 성과 추적
  performance: {
    ticker: string;
    recommendDate: string;
    initialPrice: number;
    currentPrice: number;
    returnRate: number;
  }[];
}

export class MerryLogicAnalyzer {
  
  /**
   * "늦생시" 포스트 패턴 분석
   */
  async analyzeLateStartPattern(postId: number): Promise<LogicPattern> {
    // 실제 포스트 내용을 가져와서 분석
    const post = await this.getPostContent(postId);
    
    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }
    
    return {
      id: `late-start-${postId}`,
      title: post.title,
      date: post.created_date,
      
      logicFlow: {
        historicalContext: await this.extractHistoricalContext(post.content),
        currentIssue: await this.extractCurrentIssues(post.content),
        solutionPath: await this.extractSolutions(post.content),
        investmentThesis: await this.extractInvestmentThesis(post.content)
      },
      
      sources: await this.analyzeSources(post.content),
      recommendations: await this.extractRecommendations(post.content),
      performance: await this.trackPerformance(postId)
    };
  }
  
  /**
   * 역사적 맥락 추출
   */
  private async extractHistoricalContext(content: string): Promise<string[]> {
    const historicalPatterns = [
      /(\d{4})년.*?독립/g,
      /과거.*?경우/g,
      /역사적으로.*?였음/g,
      /\d+년.*?시절/g
    ];
    
    const contexts: string[] = [];
    
    historicalPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        contexts.push(...matches);
      }
    });
    
    return contexts;
  }
  
  /**
   * 현재 이슈 추출
   */
  private async extractCurrentIssues(content: string): Promise<string[]> {
    const issuePatterns = [
      /문제는.*?것임/g,
      /현재.*?상황/g,
      /.*?독점.*?상태/g,
      /.*?부족.*?문제/g
    ];
    
    const issues: string[] = [];
    
    issuePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push(...matches);
      }
    });
    
    return issues;
  }
  
  /**
   * 해결책 추출
   */
  private async extractSolutions(content: string): Promise<string[]> {
    const solutionPatterns = [
      /.*?방법이 있음/g,
      /.*?해결.*?방법/g,
      /.*?대안.*?방법/g,
      /트럼프.*?행정명령/g
    ];
    
    const solutions: string[] = [];
    
    solutionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        solutions.push(...matches);
      }
    });
    
    return solutions;
  }
  
  /**
   * 투자 논리 추출
   */
  private async extractInvestmentThesis(content: string): Promise<string[]> {
    const thesisPatterns = [
      /.*?확보.*?가능성.*?높아짐/g,
      /.*?주가.*?상승/g,
      /.*?기대.*?있음/g,
      /.*?수익.*?창출/g
    ];
    
    const thesis: string[] = [];
    
    thesisPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        thesis.push(...matches);
      }
    });
    
    return thesis;
  }
  
  /**
   * 출처 분석 - 메르의 실제 출처 사용 패턴 기반
   */
  private async analyzeSources(content: string): Promise<LogicPattern['sources']> {
    const sources: LogicPattern['sources'] = [];
    
    // 1. OGQ (개인 저작물) 패턴 - 가장 자주 사용
    const ogqMatches = content.match(/©.*?OGQ/g);
    if (ogqMatches) {
      ogqMatches.forEach(match => {
        sources.push({
          type: 'personal',
          name: 'OGQ (개인 저작물)',
          credibility: 7, // 개인 제작이지만 메르가 자주 사용하는 신뢰할 만한 소스
          frequency: 9 // 매우 자주 사용
        });
      });
    }
    
    // 2. 언론사 출처
    const mediaPatterns = [
      /출처\s+([가-힣A-Za-z\s]+)/g,
      /(조선일보|한국일보|연합뉴스|뉴스1|로이터)/g,
      /뉴스내용/g
    ];
    
    mediaPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const mediaName = match.replace('출처', '').trim();
          if (mediaName && mediaName !== '뉴스내용') {
            sources.push({
              type: 'media',
              name: mediaName,
              credibility: 8, // 언론사는 높은 신뢰도
              frequency: this.getMediaFrequency(mediaName)
            });
          }
        });
      }
    });
    
    // 3. 정부/공공기관 
    const govPatterns = [
      /(미국|한국|일본|EU).*?(정부|국방부|은행|청|부)/g,
      /(CIA|FBI|국토안보부|연방대테러국)/g,
      /(미국 수출입은행|EXIM)/g,
      /(UN|유엔|ISA)/g
    ];
    
    govPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          sources.push({
            type: 'government',
            name: match.trim(),
            credibility: 9, // 정부 기관은 최고 신뢰도
            frequency: this.getGovFrequency(match)
          });
        });
      }
    });
    
    // 4. 기업/산업 출처
    const corporatePatterns = [
      /(팔란티어|TMC|CRML|고려아연|풍산|한화).*?(발표|공시|계약)/g,
      /주식회사.*?(발표|공시)/g
    ];
    
    corporatePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          sources.push({
            type: 'corporate',
            name: match.trim(),
            credibility: 7, // 기업 발표는 중간 신뢰도
            frequency: this.getCorporateFrequency(match)
          });
        });
      }
    });
    
    // 5. 개인/블로그 출처 (메르의 과거 글 인용)
    const personalPatterns = [
      /네이버블로그/g,
      /위 블로그 글/g,
      /해당 글의/g
    ];
    
    personalPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          sources.push({
            type: 'personal',
            name: '메르의 과거 포스트',
            credibility: 6, // 본인 글은 중간 신뢰도
            frequency: 8 // 자주 인용
          });
        });
      }
    });
    
    // 6. 웹사이트/플랫폼 출처
    const webPatterns = [
      /https?:\/\/[^\s]+/g,
      /(Borgenproject\.com|디스커버리|insh\.world\.com)/g
    ];
    
    webPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          sources.push({
            type: 'media',
            name: this.extractDomainName(match),
            credibility: 6, // 웹사이트는 중간 신뢰도
            frequency: 3 // 가끔 사용
          });
        });
      }
    });
    
    return sources;
  }
  
  /**
   * 추천 종목 추출
   */
  private async extractRecommendations(content: string): Promise<LogicPattern['recommendations']> {
    const recommendations: LogicPattern['recommendations'] = [];
    
    // 티커 패턴 매칭
    const tickerPatterns = [
      /([A-Z]{2,5})\s*.*?주가.*?상승/g,
      /([A-Z]{2,5})\s*.*?확보.*?계약/g,
      /([가-힣]+)\s*.*?주가.*?올라/g
    ];
    
    tickerPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const ticker = this.extractTicker(match);
          if (ticker) {
            recommendations.push({
              ticker,
              company: this.getCompanyName(ticker),
              rationale: this.extractRationale(content, ticker),
              confidence: this.assessConfidence(match),
              timeframe: this.extractTimeframe(content, ticker)
            });
          }
        });
      }
    });
    
    return recommendations;
  }
  
  /**
   * 새 포스트의 추천 가능성 점수 계산
   */
  async calculateRecommendationProbability(content: string): Promise<number> {
    let score = 0;
    
    // 논리 구조 유사도 (40점)
    const logicScore = await this.analyzeLogicStructure(content);
    score += logicScore * 0.4;
    
    // 출처 신뢰도 (30점)
    const sourceScore = await this.analyzeSourceCredibility(content);
    score += sourceScore * 0.3;
    
    // 키워드 패턴 (30점)
    const keywordScore = await this.analyzeKeywordPatterns(content);
    score += keywordScore * 0.3;
    
    return Math.min(score, 100);
  }
  
  /**
   * 논리 구조 유사도 분석
   */
  private async analyzeLogicStructure(content: string): Promise<number> {
    const structureElements = [
      { pattern: /역사적.*?사례/g, weight: 25 },
      { pattern: /현재.*?문제/g, weight: 25 },
      { pattern: /해결.*?방법/g, weight: 25 },
      { pattern: /투자.*?기회/g, weight: 25 }
    ];
    
    let score = 0;
    
    structureElements.forEach(({ pattern, weight }) => {
      if (content.match(pattern)) {
        score += weight;
      }
    });
    
    return score;
  }
  
  private assessCredibility(source: string, type: string): number {
    // 출처별 신뢰도 점수 (1-10)
    const credibilityMap: Record<string, number> = {
      'government': 9,
      'academic': 8,
      'media': 7,
      'corporate': 6,
      'personal': 5
    };
    
    return credibilityMap[type] || 5;
  }
  
  private getSourceFrequency(source: string): number {
    // 메르가 해당 출처를 얼마나 자주 사용하는지
    // 실제로는 DB에서 조회
    return Math.floor(Math.random() * 10) + 1;
  }
  
  private extractTicker(text: string): string {
    const tickerMatch = text.match(/([A-Z]{2,5})/);
    return tickerMatch ? (tickerMatch[1] || '') : '';
  }
  
  private getCompanyName(ticker: string): string {
    // 실제로는 종목 DB에서 조회
    const companyMap: Record<string, string> = {
      'TMC': 'The Metals Company',
      'CRML': 'Critical Metals Corp',
      'TSLA': '테슬라'
    };
    
    return companyMap[ticker] || '알 수 없음';
  }
  
  private extractRationale(content: string, ticker: string): string {
    // 해당 종목의 추천 근거 추출
    const sentences = content.split('.');
    for (const sentence of sentences) {
      if (sentence.includes(ticker)) {
        return sentence.trim();
      }
    }
    return '';
  }
  
  private assessConfidence(text: string): number {
    // 확신도 키워드 기반 점수
    const confidenceKeywords = [
      { keyword: '확실', score: 9 },
      { keyword: '가능성이 높아', score: 8 },
      { keyword: '전망', score: 7 },
      { keyword: '기대', score: 6 },
      { keyword: '같음', score: 5 }
    ];
    
    for (const { keyword, score } of confidenceKeywords) {
      if (text.includes(keyword)) {
        return score;
      }
    }
    
    return 5;
  }
  
  private extractTimeframe(content: string, ticker: string): string {
    const timeframes = [
      { pattern: /\d+년/g, value: '장기' },
      { pattern: /\d+개월/g, value: '중기' },
      { pattern: /곧|빠른|즉시/g, value: '단기' }
    ];
    
    for (const { pattern, value } of timeframes) {
      if (content.match(pattern)) {
        return value;
      }
    }
    
    return '미정';
  }
  
  private async getPostContent(postId: number) {
    // 실제 DB에서 포스트 가져오기
    const { query } = require('./database');
    
    try {
      const posts = await query('SELECT title, content, created_date FROM blog_posts WHERE id = ?', [postId]) as {
        title: string;
        content: string;
        created_date: string;
      }[];
      
      if (posts.length > 0) {
        return posts[0];
      }
      
      // 포스트가 없을 경우 기본값 반환
      return {
        title: `포스트 ${postId}`,
        content: '',
        created_date: new Date().toISOString()
      };
    } catch (error) {
      console.error(`포스트 ${postId} 조회 실패:`, error);
      return {
        title: `포스트 ${postId}`,
        content: '',
        created_date: new Date().toISOString()
      };
    }
  }
  
  private async trackPerformance(postId: number) {
    // 실제 성과 추적 로직
    return [];
  }
  
  private async analyzeSourceCredibility(content: string): Promise<number> {
    // 출처 신뢰도 분석
    return 0;
  }
  
  private async analyzeKeywordPatterns(content: string): Promise<number> {
    // 키워드 패턴 분석
    return 0;
  }
  
  /**
   * 출처별 신뢰도 헬퍼 메서드들
   */
  private getMediaFrequency(mediaName: string): number {
    const frequencyMap: Record<string, number> = {
      '조선일보': 8,
      '한국일보': 6,
      '연합뉴스': 7,
      '뉴스1': 5,
      '로이터': 6
    };
    return frequencyMap[mediaName] || 4;
  }
  
  private getGovFrequency(govName: string): number {
    // 정부기관은 신뢰도가 높지만 사용빈도는 중간 정도
    if (govName.includes('미국') || govName.includes('CIA') || govName.includes('FBI')) {
      return 7;
    }
    if (govName.includes('한국') || govName.includes('국방부')) {
      return 6;
    }
    return 5;
  }
  
  private getCorporateFrequency(corpName: string): number {
    const frequencyMap: Record<string, number> = {
      '팔란티어': 8, // 자주 언급
      '고려아연': 6,
      '풍산': 7,
      '한화': 6,
      'TMC': 5,
      'CRML': 4
    };
    
    for (const [company, freq] of Object.entries(frequencyMap)) {
      if (corpName.includes(company)) {
        return freq;
      }
    }
    return 3;
  }
  
  private extractDomainName(url: string): string {
    if (url.startsWith('http')) {
      try {
        return new URL(url).hostname;
      } catch {
        return url.substring(0, 50);
      }
    }
    return url;
  }
  
  /**
   * 메르의 실제 포스트 패턴 분석 - "늦생시" 시리즈 기반
   */
  async analyzeActualLateStartPost(postId: number): Promise<LogicPattern> {
    const post = await this.getPostContent(postId);
    
    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }
    
    // 실제 "늦생시" 포스트 패턴에 맞춘 분석
    const analysis = {
      id: `late-start-actual-${postId}`,
      title: post.title,
      date: post.created_date,
      
      logicFlow: {
        // 메르의 실제 패턴: 과거 언급 → 현재 상황 → 미래 전망 → 투자 논리
        historicalContext: await this.extractHistoricalMentions(post.content),
        currentIssue: await this.extractCurrentSituation(post.content),
        solutionPath: await this.extractFutureTrends(post.content),
        investmentThesis: await this.extractInvestmentOpportunity(post.content)
      },
      
      sources: await this.analyzeSources(post.content),
      recommendations: await this.extractSpecificStocks(post.content),
      performance: await this.trackPerformance(postId)
    };
    
    return analysis;
  }
  
  /**
   * 메르의 과거 언급 패턴 추출
   */
  private async extractHistoricalMentions(content: string): Promise<string[]> {
    const patterns = [
      /\d+년 \d+월.*?글을 썼다/g,
      /당시.*?주가는.*?달러/g,
      /\d+년.*?언급했다/g,
      /위 글에서.*?이야기했음/g
    ];
    
    const mentions: string[] = [];
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        mentions.push(...matches);
      }
    });
    
    return mentions;
  }
  
  /**
   * 현재 상황 분석
   */
  private async extractCurrentSituation(content: string): Promise<string[]> {
    const patterns = [
      /현재.*?상황/g,
      /\d+년 \d+월.*?달러까지 올라가/g,
      /시간이 지났다/g,
      /이때가.*?편으로/g
    ];
    
    const situations: string[] = [];
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        situations.push(...matches);
      }
    });
    
    return situations;
  }
  
  /**
   * 미래 트렌드 및 전망
   */
  private async extractFutureTrends(content: string): Promise<string[]> {
    const patterns = [
      /미래.*?언젠가/g,
      /\d+년까지.*?목표/g,
      /전망.*?있음/g,
      /계획.*?있다/g
    ];
    
    const trends: string[] = [];
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        trends.push(...matches);
      }
    });
    
    return trends;
  }
  
  /**
   * 투자 기회 추출
   */
  private async extractInvestmentOpportunity(content: string): Promise<string[]> {
    const patterns = [
      /한줄 코멘트.*?같다/g,
      /늦생시.*?기본가정/g,
      /상승은.*?롱이고.*?숏이다/g,
      /좋은 투자 결과가 나왔다/g
    ];
    
    const opportunities: string[] = [];
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        opportunities.push(...matches);
      }
    });
    
    return opportunities;
  }
  
  /**
   * 구체적인 종목 추출 - 실제 언급된 종목들
   */
  private async extractSpecificStocks(content: string): Promise<LogicPattern['recommendations']> {
    const stockMentions = [
      { ticker: 'PLTR', name: '팔란티어', pattern: /팔란티어.*?달러/g },
      { ticker: 'TMC', name: 'The Metals Company', pattern: /TMC.*?달러/g },
      { ticker: 'CRML', name: 'Critical Metals', pattern: /CRML.*?달러/g },
      { ticker: '181710', name: '고려아연', pattern: /고려아연.*?계약/g },
      { ticker: '103140', name: '풍산', pattern: /풍산.*?수주/g }
    ];
    
    const recommendations: LogicPattern['recommendations'] = [];
    
    stockMentions.forEach(stock => {
      const matches = content.match(stock.pattern);
      if (matches) {
        const confidence = this.calculateConfidenceFromContext(matches, content);
        recommendations.push({
          ticker: stock.ticker,
          company: stock.name,
          rationale: matches[0],
          confidence,
          timeframe: this.extractTimeframeFromContext(matches, content)
        });
      }
    });
    
    return recommendations;
  }
  
  /**
   * 컨텍스트 기반 확신도 계산
   */
  private calculateConfidenceFromContext(matches: string[], content: string): number {
    // "늦생시" 시리즈는 대체로 높은 확신도를 가짐
    if (content.includes('늦생시')) return 8;
    if (content.includes('한줄 코멘트')) return 7;
    if (content.includes('전망')) return 6;
    return 5;
  }
  
  /**
   * 시간 프레임 추출
   */
  private extractTimeframeFromContext(matches: string[], content: string): string {
    if (content.includes('오랜기간')) return '장기';
    if (content.includes('짧은 시간')) return '단기';
    if (content.includes('언젠가')) return '중장기';
    return '미정';
  }
}

export const merryLogicAnalyzer = new MerryLogicAnalyzer();