/**
 * 종목 언급 자동 추출 시스템
 * 메르 블로그 포스트에서 종목 언급을 자동으로 감지하고 데이터베이스에 저장
 */

import { query } from './database';

interface StockMention {
  ticker: string;
  post_id: number;
  mentioned_date: string;
  mention_type: 'analysis' | 'news' | 'opinion' | 'prediction';
  context: string;
  confidence: number;
}

interface StockMapping {
  ticker: string;
  name: string;
  market: string;
  currency: string;
  keywords: string[];
}

export class StockMentionExtractor {
  // 종목명 매핑 (확장 가능)
  private stockMappings: StockMapping[] = [
    // 한국 종목
    {
      ticker: '005930',
      name: '삼성전자',
      market: 'KOSPI',
      currency: 'KRW',
      keywords: ['삼성전자', '삼성', '삼성디스플레이', 'Samsung']
    },
    {
      ticker: '042660',
      name: '한화오션',
      market: 'KOSPI',
      currency: 'KRW',
      keywords: ['한화오션', '한화', '오션']
    },
    {
      ticker: '267250',
      name: 'HD현대',
      market: 'KOSPI',
      currency: 'KRW',
      keywords: ['HD현대', '현대중공업', 'HD', '현대']
    },
    {
      ticker: '010620',
      name: '현대미포조선',
      market: 'KOSPI',
      currency: 'KRW',
      keywords: ['현대미포조선', '미포조선', '현대미포', '미포']
    },
    // 미국 종목
    {
      ticker: 'TSLA',
      name: '테슬라',
      market: 'NASDAQ',
      currency: 'USD',
      keywords: ['테슬라', 'Tesla', '일론머스크', '일론 머스크']
    },
    {
      ticker: 'AAPL',
      name: '애플',
      market: 'NASDAQ',
      currency: 'USD',
      keywords: ['애플', 'Apple', '아이폰', 'iPhone', '맥', 'Mac']
    },
    {
      ticker: 'INTC',
      name: '인텔',
      market: 'NASDAQ',
      currency: 'USD',
      keywords: ['인텔', 'Intel', '인텔리전스']
    },
    {
      ticker: 'LLY',
      name: '일라이릴리',
      market: 'NYSE',
      currency: 'USD',
      keywords: ['일라이릴리', '일라이', 'Eli Lilly', '릴리', '마운자로']
    },
    {
      ticker: 'UNH',
      name: '유나이티드헬스케어',
      market: 'NYSE',
      currency: 'USD',
      keywords: ['유나이티드헬스케어', '유나이티드헬스', 'UnitedHealth', '헬스케어']
    },
    {
      ticker: 'BRK',
      name: '버크셔 헤서웨이',
      market: 'NYSE',
      currency: 'USD',
      keywords: ['버크셔', '버크셔헤서웨이', 'Berkshire', '워런버핏', '워런 버핏']
    },
    {
      ticker: 'NVDA',
      name: '엔비디아',
      market: 'NASDAQ',
      currency: 'USD',
      keywords: ['엔비디아', 'NVIDIA', 'GPU', '젠슨황']
    },
    {
      ticker: 'GOOGL',
      name: '구글',
      market: 'NASDAQ',
      currency: 'USD',
      keywords: ['구글', 'Google', '알파벳', 'Alphabet']
    },
    {
      ticker: 'MSFT',
      name: '마이크로소프트',
      market: 'NASDAQ',
      currency: 'USD',
      keywords: ['마이크로소프트', 'Microsoft', '윈도우', 'Windows', '오피스']
    }
  ];

  /**
   * 포스트 내용에서 종목 언급 추출
   */
  async extractMentions(postContent: string, postId: number, postDate: string): Promise<StockMention[]> {
    const mentions: StockMention[] = [];
    const content = postContent.toLowerCase();

    console.log(`🔍 종목 언급 추출 시작 - Post ID: ${postId}`);

    for (const stock of this.stockMappings) {
      const mentionedKeywords = stock.keywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );

      if (mentionedKeywords.length > 0) {
        const context = this.extractContext(postContent, mentionedKeywords[0]);
        const mentionType = this.determineMentionType(context);
        const confidence = this.calculateConfidence(mentionedKeywords, content);

        mentions.push({
          ticker: stock.ticker,
          post_id: postId,
          mentioned_date: postDate,
          mention_type: mentionType,
          context: context,
          confidence: confidence
        });

        console.log(`✅ 종목 발견: ${stock.name}(${stock.ticker}) - 키워드: ${mentionedKeywords[0]} - 신뢰도: ${confidence}`);
      }
    }

    return mentions;
  }

  /**
   * 언급 맥락 추출 (키워드 주변 100자)
   */
  private extractContext(content: string, keyword: string): string {
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return content.substring(0, 100);

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + keyword.length + 50);
    
    return content.substring(start, end).trim();
  }

  /**
   * 언급 유형 판단
   */
  private determineMentionType(context: string): StockMention['mention_type'] {
    const analysisKeywords = ['분석', '전망', '예상', '판단', '평가', '검토'];
    const newsKeywords = ['발표', '공시', '뉴스', '소식', '보도'];
    const opinionKeywords = ['생각', '의견', '보는', '봄', '개인적'];
    const predictionKeywords = ['예측', '전망', '목표', '기대', '우려'];

    const lowerContext = context.toLowerCase();

    if (analysisKeywords.some(kw => lowerContext.includes(kw))) return 'analysis';
    if (newsKeywords.some(kw => lowerContext.includes(kw))) return 'news';
    if (predictionKeywords.some(kw => lowerContext.includes(kw))) return 'prediction';
    if (opinionKeywords.some(kw => lowerContext.includes(kw))) return 'opinion';

    return 'analysis'; // 기본값
  }

  /**
   * 언급 신뢰도 계산
   */
  private calculateConfidence(mentionedKeywords: string[], content: string): number {
    let confidence = 0.5; // 기본 신뢰도

    // 키워드 개수가 많을수록 신뢰도 증가
    confidence += mentionedKeywords.length * 0.1;

    // 주식 관련 키워드가 함께 언급되면 신뢰도 증가
    const stockKeywords = ['주가', '주식', '투자', '매수', '매도', '상승', '하락', '수익', '손실'];
    const stockMentions = stockKeywords.filter(kw => content.includes(kw)).length;
    confidence += stockMentions * 0.05;

    // 최대 신뢰도 1.0으로 제한
    return Math.min(1.0, confidence);
  }

  /**
   * 데이터베이스에 언급 정보 저장
   */
  async saveMentions(mentions: StockMention[]): Promise<void> {
    console.log(`💾 ${mentions.length}개 종목 언급 데이터베이스 저장 시작`);

    for (const mention of mentions) {
      try {
        // 1. merry_mentioned_stocks 테이블에 추가
        await query(`
          INSERT OR IGNORE INTO merry_mentioned_stocks 
          (ticker, post_id, mentioned_date, mention_type, context) 
          VALUES (?, ?, ?, ?, ?)
        `, [mention.ticker, mention.post_id, mention.mentioned_date, mention.mention_type, mention.context]);

        // 2. stocks 테이블에 종목이 없으면 추가
        await this.ensureStockExists(mention.ticker);

        // 3. stocks 테이블의 통계 업데이트
        await this.updateStockStats(mention.ticker, mention.mentioned_date);

        console.log(`✅ ${mention.ticker} 언급 정보 저장 완료`);
      } catch (error) {
        console.error(`❌ ${mention.ticker} 저장 실패:`, error);
      }
    }
  }

  /**
   * stocks 테이블에 종목 정보 확인 및 추가
   */
  private async ensureStockExists(ticker: string): Promise<void> {
    const existing = await query('SELECT ticker FROM stocks WHERE ticker = ?', [ticker]);
    
    if (existing.length === 0) {
      const stockInfo = this.stockMappings.find(s => s.ticker === ticker);
      if (stockInfo) {
        await query(`
          INSERT INTO stocks 
          (ticker, company_name, company_name_kr, market, currency, is_merry_mentioned, mention_count)
          VALUES (?, ?, ?, ?, ?, 1, 0)
        `, [ticker, stockInfo.name, stockInfo.name, stockInfo.market, stockInfo.currency]);
        
        console.log(`📈 새 종목 추가: ${stockInfo.name}(${ticker})`);
      }
    }
  }

  /**
   * stocks 테이블 통계 업데이트
   */
  private async updateStockStats(ticker: string, mentionDate: string): Promise<void> {
    // 언급 횟수 계산
    const countResult = await query(
      'SELECT COUNT(*) as count FROM merry_mentioned_stocks WHERE ticker = ?',
      [ticker]
    );
    const mentionCount = countResult[0]?.count || 0;

    // 최신 언급일과 첫 언급일 계산
    const dateResult = await query(`
      SELECT 
        MIN(mentioned_date) as first_date,
        MAX(mentioned_date) as last_date
      FROM merry_mentioned_stocks 
      WHERE ticker = ?
    `, [ticker]);

    const firstDate = dateResult[0]?.first_date;
    const lastDate = dateResult[0]?.last_date;

    // stocks 테이블 업데이트
    await query(`
      UPDATE stocks 
      SET 
        mention_count = ?,
        first_mentioned_date = ?,
        last_mentioned_date = ?,
        is_merry_mentioned = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE ticker = ?
    `, [mentionCount, firstDate, lastDate, ticker]);

    console.log(`📊 ${ticker} 통계 업데이트: ${mentionCount}회 언급, 최신: ${lastDate}`);
  }

  /**
   * 특정 포스트의 종목 언급 처리 (메인 함수)
   */
  async processPost(postId: number, title: string, content: string, createdDate: string): Promise<number> {
    console.log(`🚀 포스트 처리 시작: "${title}" (ID: ${postId})`);

    const mentions = await this.extractMentions(content, postId, createdDate);
    
    if (mentions.length > 0) {
      await this.saveMentions(mentions);
      console.log(`✅ 포스트 처리 완료: ${mentions.length}개 종목 언급 발견`);
    } else {
      console.log(`ℹ️ 포스트 처리 완료: 종목 언급 없음`);
    }

    return mentions.length;
  }

  /**
   * 전체 포스트 일괄 처리 (초기 설정용)
   */
  async processAllUnprocessedPosts(): Promise<void> {
    console.log('🔄 미처리 포스트 일괄 처리 시작...');

    // 아직 종목 언급이 추출되지 않은 포스트들 찾기
    const unprocessedPosts = await query(`
      SELECT bp.id, bp.title, bp.content, bp.created_date
      FROM blog_posts bp
      LEFT JOIN merry_mentioned_stocks mms ON bp.id = mms.post_id
      WHERE mms.post_id IS NULL
      ORDER BY bp.created_date DESC
      LIMIT 50
    `);

    console.log(`📝 처리할 포스트: ${unprocessedPosts.length}개`);

    let totalMentions = 0;
    for (const post of unprocessedPosts) {
      const mentionCount = await this.processPost(
        post.id,
        post.title,
        post.content,
        post.created_date
      );
      totalMentions += mentionCount;
      
      // API 부하 방지를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎉 일괄 처리 완료: ${unprocessedPosts.length}개 포스트, ${totalMentions}개 종목 언급 발견`);
  }
}

export default StockMentionExtractor;