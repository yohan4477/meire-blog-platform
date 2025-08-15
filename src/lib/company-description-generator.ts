/**
 * AI 기반 회사 설명 자동 생성 시스템
 * 메르 블로그 포스트 맥락을 분석하여 생생한 회사 설명을 자동 생성
 */

import { query } from './database';

interface CompanyContext {
  ticker: string;
  companyName: string;
  mentions: Array<{
    content: string;
    context: string;
    date: string;
    type: string;
  }>;
}

interface GeneratedDescription {
  ticker: string;
  description: string;
  confidence: number;
  sources: string[];
  lastUpdated: string;
}

export class CompanyDescriptionGenerator {
  
  /**
   * 종목별 맥락 정보 수집
   */
  async collectCompanyContext(ticker: string): Promise<CompanyContext | null> {
    console.log(`🔍 ${ticker} 회사 맥락 정보 수집 시작`);

    // 해당 종목의 모든 언급 정보 가져오기
    const mentions = await query(`
      SELECT 
        bp.title,
        bp.content,
        mms.context,
        mms.mentioned_date,
        mms.mention_type
      FROM merry_mentioned_stocks mms
      JOIN blog_posts bp ON mms.post_id = bp.id
      WHERE mms.ticker = ?
      ORDER BY mms.mentioned_date DESC
      LIMIT 10
    `, [ticker]);

    if (mentions.length === 0) {
      console.log(`❌ ${ticker} 언급 정보 없음`);
      return null;
    }

    // 회사명 가져오기
    const stockInfo = await query('SELECT company_name, company_name_kr FROM stocks WHERE ticker = ?', [ticker]);
    const companyName = stockInfo[0]?.company_name_kr || stockInfo[0]?.company_name || ticker;

    const context: CompanyContext = {
      ticker,
      companyName,
      mentions: mentions.map(m => ({
        content: m.title + '\n' + m.content,
        context: m.context,
        date: m.mentioned_date,
        type: m.mention_type
      }))
    };

    console.log(`✅ ${ticker} 맥락 수집 완료: ${mentions.length}개 언급`);
    return context;
  }

  /**
   * 메르 블로그 스타일 회사 설명 생성
   */
  async generateDescription(context: CompanyContext): Promise<GeneratedDescription> {
    console.log(`🤖 ${context.ticker} 회사 설명 생성 시작`);

    // 최신 언급들에서 핵심 키워드 추출
    const keyInsights = this.extractKeyInsights(context);
    
    // 메르 블로그 스타일로 설명 생성
    const description = this.buildMerryStyleDescription(context, keyInsights);

    // 신뢰도 계산
    const confidence = this.calculateDescriptionConfidence(context, keyInsights);

    const result: GeneratedDescription = {
      ticker: context.ticker,
      description: description,
      confidence: confidence,
      sources: context.mentions.slice(0, 3).map(m => m.date),
      lastUpdated: new Date().toISOString()
    };

    console.log(`✅ ${context.ticker} 설명 생성 완료 (신뢰도: ${confidence})`);
    return result;
  }

  /**
   * 메르 언급에서 핵심 인사이트 추출
   */
  private extractKeyInsights(context: CompanyContext): Array<{type: string, content: string}> {
    const insights: Array<{type: string, content: string}> = [];

    for (const mention of context.mentions) {
      const content = mention.content.toLowerCase();

      // 비즈니스 모델 관련
      if (content.includes('사업') || content.includes('비즈니스')) {
        insights.push({
          type: 'business',
          content: this.extractSentence(mention.content, ['사업', '비즈니스', '수익', '매출'])
        });
      }

      // 시장 지위/경쟁력
      if (content.includes('1위') || content.includes('선도') || content.includes('최대')) {
        insights.push({
          type: 'market_position',
          content: this.extractSentence(mention.content, ['1위', '선도', '최대', '글로벌', '세계'])
        });
      }

      // 최신 이슈/트렌드
      if (content.includes('트럼프') || content.includes('정책') || content.includes('규제')) {
        insights.push({
          type: 'current_issue',
          content: this.extractSentence(mention.content, ['트럼프', '정책', '규제', '변화', '영향'])
        });
      }

      // 성장 동력
      if (content.includes('성장') || content.includes('확대') || content.includes('기회')) {
        insights.push({
          type: 'growth',
          content: this.extractSentence(mention.content, ['성장', '확대', '기회', '전망', '예상'])
        });
      }

      // 리스크/우려
      if (content.includes('위험') || content.includes('우려') || content.includes('하락')) {
        insights.push({
          type: 'risk',
          content: this.extractSentence(mention.content, ['위험', '우려', '하락', '문제', '어려움'])
        });
      }
    }

    // 중복 제거 및 최신 순 정렬
    const uniqueInsights = insights
      .filter((insight, index, self) => 
        self.findIndex(i => i.type === insight.type) === index
      )
      .slice(0, 3); // 최대 3개까지

    return uniqueInsights;
  }

  /**
   * 특정 키워드가 포함된 문장 추출
   */
  private extractSentence(content: string, keywords: string[]): string {
    const sentences = content.split(/[.!?。]/);
    
    for (const sentence of sentences) {
      if (keywords.some(keyword => sentence.includes(keyword))) {
        return sentence.trim();
      }
    }
    
    return content.substring(0, 100); // 키워드 없으면 앞 100자
  }

  /**
   * 메르 블로그 스타일 설명 생성
   */
  private buildMerryStyleDescription(context: CompanyContext, insights: Array<{type: string, content: string}>): string {
    const { companyName } = context;
    
    // 기본 템플릿 설정
    let description = '';

    // 현재 이슈 우선 (메르 블로그의 특징)
    const currentIssue = insights.find(i => i.type === 'current_issue');
    if (currentIssue) {
      description += this.summarizeIssue(currentIssue.content, companyName);
    }

    // 비즈니스 모델/시장 지위
    const business = insights.find(i => i.type === 'business');
    const marketPosition = insights.find(i => i.type === 'market_position');
    
    if (business || marketPosition) {
      if (description) description += ', ';
      description += this.summarizeBusiness(business?.content, marketPosition?.content, companyName);
    }

    // 성장 동력
    const growth = insights.find(i => i.type === 'growth');
    if (growth) {
      if (description) description += ', ';
      description += this.summarizeGrowth(growth.content);
    }

    // 기본 설명이 없으면 일반적인 설명 생성
    if (!description) {
      description = `${companyName} 관련 투자 이슈가 메르 블로그에서 언급된 기업`;
    }

    // 길이 제한 (최대 120자)
    if (description.length > 120) {
      description = description.substring(0, 117) + '...';
    }

    return description;
  }

  /**
   * 현재 이슈 요약
   */
  private summarizeIssue(content: string, companyName: string): string {
    if (content.includes('트럼프')) {
      if (content.includes('정책') || content.includes('국영')) {
        return `트럼프 정책의 핵심 수혜/타겟이 된 ${companyName}`;
      }
      if (content.includes('공격') || content.includes('비판')) {
        return `트럼프 공격에도 불구하고 투자 가치가 주목받는 ${companyName}`;
      }
    }
    
    if (content.includes('버핏') || content.includes('워런')) {
      return `워런 버핏이 대규모 투자한 ${companyName}`;
    }

    return `최신 투자 이슈로 주목받는 ${companyName}`;
  }

  /**
   * 비즈니스 모델 요약
   */
  private summarizeBusiness(businessContent?: string, marketContent?: string, companyName?: string): string {
    if (marketContent) {
      if (marketContent.includes('1위') || marketContent.includes('최대')) {
        return '업계 선두 지위를 유지하는 기업';
      }
      if (marketContent.includes('글로벌')) {
        return '글로벌 시장에서 경쟁력을 갖춘 기업';
      }
    }

    if (businessContent) {
      if (businessContent.includes('반도체')) {
        return '반도체 사업 전환점에 있는 기업';
      }
      if (businessContent.includes('조선') || businessContent.includes('해양')) {
        return '조선 해양 분야의 전문 기업';
      }
      if (businessContent.includes('제약') || businessContent.includes('의료')) {
        return '헬스케어 분야의 성장 기업';
      }
    }

    return '핵심 사업 영역에서 성장하는 기업';
  }

  /**
   * 성장 동력 요약
   */
  private summarizeGrowth(content: string): string {
    if (content.includes('AI') || content.includes('인공지능')) {
      return 'AI 시장 확대로 성장 모멘텀 기대';
    }
    if (content.includes('북극') || content.includes('항로')) {
      return '북극항로 개통으로 수혜 예상';
    }
    if (content.includes('정책') || content.includes('지원')) {
      return '정부 정책 지원으로 성장 가능성 증대';
    }

    return '새로운 성장 동력 확보 중';
  }

  /**
   * 설명 신뢰도 계산
   */
  private calculateDescriptionConfidence(context: CompanyContext, insights: Array<{type: string, content: string}>): number {
    let confidence = 0.3; // 기본 신뢰도

    // 언급 횟수에 따른 가중치
    confidence += Math.min(context.mentions.length * 0.1, 0.4);

    // 인사이트 다양성에 따른 가중치
    confidence += insights.length * 0.1;

    // 최신성에 따른 가중치 (30일 이내 언급)
    const recentMentions = context.mentions.filter(m => {
      const daysDiff = Math.floor((Date.now() - new Date(m.date).getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30;
    });
    confidence += recentMentions.length * 0.05;

    return Math.min(1.0, confidence);
  }

  /**
   * 모든 종목의 설명 업데이트
   */
  async updateAllDescriptions(): Promise<void> {
    console.log('🔄 모든 종목 설명 업데이트 시작...');

    // 메르가 언급한 모든 종목 가져오기
    const stocks = await query(`
      SELECT DISTINCT ticker 
      FROM merry_mentioned_stocks 
      ORDER BY MAX(mentioned_date) DESC
    `);

    console.log(`📈 업데이트할 종목: ${stocks.length}개`);

    for (const stock of stocks) {
      try {
        const context = await this.collectCompanyContext(stock.ticker);
        if (context) {
          const description = await this.generateDescription(context);
          await this.saveDescription(description);
          
          console.log(`✅ ${stock.ticker} 설명 업데이트 완료`);
        }
        
        // API 부하 방지
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ ${stock.ticker} 설명 생성 실패:`, error);
      }
    }

    console.log('🎉 모든 종목 설명 업데이트 완료');
  }

  /**
   * 생성된 설명을 API 코드에 반영
   */
  private async saveDescription(description: GeneratedDescription): Promise<void> {
    // 실제로는 picks/route.ts의 STOCK_INFO_MAP을 동적으로 업데이트하거나
    // 데이터베이스에 저장하여 API에서 동적으로 읽어오도록 구현
    console.log(`💾 ${description.ticker} 설명 저장: ${description.description}`);
    
    // TODO: 실제 저장 로직 구현
    // 1. 별도 테이블에 저장하거나
    // 2. picks/route.ts 파일을 동적으로 업데이트
  }

  /**
   * 특정 종목의 설명 업데이트 (단일 종목용)
   */
  async updateSingleStock(ticker: string): Promise<GeneratedDescription | null> {
    console.log(`🎯 ${ticker} 개별 설명 업데이트`);

    const context = await this.collectCompanyContext(ticker);
    if (!context) {
      console.log(`❌ ${ticker} 맥락 정보 없음`);
      return null;
    }

    const description = await this.generateDescription(context);
    await this.saveDescription(description);

    return description;
  }
}

export default CompanyDescriptionGenerator;