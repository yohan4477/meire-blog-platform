/**
 * 메르 주간보고 AI 분석 엔진
 * 
 * 주요 기능:
 * 1. 포스트 자동 카테고리 분류 (세계정세, 매크로, 환율, 종목, 산업)
 * 2. 감정 분석 및 시장 영향도 스코어링
 * 3. 키워드 추출 및 트렌드 분석
 * 4. AI 인사이트 생성
 * 
 * @author Meire Blog Platform
 * @created 2025-08-21
 */

import { Database } from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

interface PostData {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  created_date: string;
  category?: string;
}

interface CategoryKeywords {
  세계정세: string[];
  매크로: string[];
  환율: string[];
  종목: string[];
  산업: string[];
}

interface AnalysisResult {
  category: keyof CategoryKeywords;
  confidence: number;
  sentiment_score: number;
  market_impact_score: number;
  key_themes: string[];
  insights: string;
}

export class WeeklyReportAnalyzer {
  private db: Database;
  private dbPath: string;

  // 카테고리별 키워드 사전 (확장 가능)
  private readonly categoryKeywords: CategoryKeywords = {
    세계정세: [
      '미국', '중국', '러시아', '유럽', '일본', '전쟁', '정치', '외교',
      '제재', '무역전쟁', '지정학', '대선', '정부', '정책', '국가',
      '글로벌', '국제', '트럼프', '바이든', '시진핑', '우크라이나'
    ],
    매크로: [
      '금리', '인플레이션', 'GDP', 'CPI', 'PPI', '기준금리', '연준', 'Fed',
      '양적완화', 'QE', '통화정책', '재정정책', '경기침체', '경기회복',
      '실업률', '고용', '소비자물가', '생산자물가', '경제성장', '경제지표'
    ],
    환율: [
      '달러', '원화', '엔화', '유로', '위안', '환율', '달러인덱스',
      '강달러', '약달러', '원달러', '달러원', '환헤지', '통화',
      '외환', '환차손', '환차익', 'DXY', 'USDKRW'
    ],
    종목: [
      '삼성전자', '애플', 'AAPL', 'TSLA', '테슬라', 'NVDA', '엔비디아',
      '구글', 'GOOGL', '마이크로소프트', 'MSFT', '아마존', 'AMZN',
      '005930', '종목', '주식', '매수', '매도', '상승', '하락',
      '수익률', '배당', '실적', '분할', '합병'
    ],
    산업: [
      '반도체', 'AI', '인공지능', '자동차', '전기차', 'EV', '배터리',
      '바이오', '제약', '은행', '금융', '부동산', '건설', '항공',
      '여행', '에너지', '유가', '원자재', '구리', '금', '은',
      '리튬', '철강', '화학', 'IT', '소프트웨어'
    ]
  };

  constructor() {
    this.dbPath = path.resolve(process.cwd(), 'database.db');
    this.db = new Database(this.dbPath);
  }

  /**
   * 포스트 내용 기반 카테고리 분류
   */
  public analyzePostCategory(post: PostData): AnalysisResult {
    const text = `${post.title} ${post.content} ${post.excerpt || ''}`.toLowerCase();
    
    // 각 카테고리별 매칭 스코어 계산
    const categoryScores: Record<keyof CategoryKeywords, number> = {
      세계정세: 0,
      매크로: 0,
      환율: 0,
      종목: 0,
      산업: 0
    };

    // 키워드 기반 스코어링
    Object.entries(this.categoryKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        const matches = (text.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
        categoryScores[category as keyof CategoryKeywords] += matches;
      });
    });

    // 최고 스코어 카테고리 선택
    const maxCategory = Object.entries(categoryScores).reduce((a, b) => 
      categoryScores[a[0] as keyof CategoryKeywords] > categoryScores[b[0] as keyof CategoryKeywords] ? a : b
    )[0] as keyof CategoryKeywords;

    const totalScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? categoryScores[maxCategory] / totalScore : 0;

    // 감정 분석 (간단한 키워드 기반)
    const sentimentScore = this.analyzeSentiment(text);
    
    // 시장 영향도 분석
    const marketImpactScore = this.analyzeMarketImpact(text, maxCategory);
    
    // 키 테마 추출
    const keyThemes = this.extractKeyThemes(text, maxCategory);
    
    // 인사이트 생성
    const insights = this.generateInsights(post, maxCategory, sentimentScore);

    return {
      category: maxCategory,
      confidence,
      sentiment_score: sentimentScore,
      market_impact_score: marketImpactScore,
      key_themes: keyThemes,
      insights
    };
  }

  /**
   * 감정 분석 (긍정: 1, 중립: 0, 부정: -1)
   */
  private analyzeSentiment(text: string): number {
    const positiveWords = [
      '상승', '증가', '성장', '호재', '긍정', '좋은', '유망', '전망',
      '기대', '투자', '추천', '매수', '개선', '확대', '발전'
    ];
    
    const negativeWords = [
      '하락', '감소', '악재', '부정', '나쁜', '우려', '위험', '리스크',
      '매도', '하향', '악화', '문제', '위기', '충격', '손실'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      positiveCount += (text.match(new RegExp(word, 'g')) || []).length;
    });

    negativeWords.forEach(word => {
      negativeCount += (text.match(new RegExp(word, 'g')) || []).length;
    });

    const totalWords = positiveCount + negativeCount;
    if (totalWords === 0) return 0;

    return (positiveCount - negativeCount) / totalWords;
  }

  /**
   * 시장 영향도 분석 (0-1 스케일)
   */
  private analyzeMarketImpact(text: string, category: keyof CategoryKeywords): number {
    const highImpactWords = [
      '금리', 'Fed', '연준', '기준금리', '인플레이션', '실적',
      '분할', '합병', '대선', '전쟁', '제재', '정책'
    ];

    let impactScore = 0;
    highImpactWords.forEach(word => {
      impactScore += (text.match(new RegExp(word, 'g')) || []).length;
    });

    // 카테고리별 가중치 적용
    const categoryWeight = {
      매크로: 1.0,
      세계정세: 0.8,
      종목: 0.7,
      산업: 0.6,
      환율: 0.5
    };

    return Math.min(impactScore * (categoryWeight[category] || 0.5) * 0.1, 1.0);
  }

  /**
   * 키 테마 추출
   */
  private extractKeyThemes(text: string, category: keyof CategoryKeywords): string[] {
    const categoryWords = this.categoryKeywords[category];
    const themes: string[] = [];

    categoryWords.forEach(word => {
      if (text.includes(word.toLowerCase())) {
        themes.push(word);
      }
    });

    // 최대 5개 테마 반환
    return themes.slice(0, 5);
  }

  /**
   * AI 인사이트 생성
   */
  private generateInsights(post: PostData, category: keyof CategoryKeywords, sentiment: number): string {
    const sentimentLabel = sentiment > 0.2 ? '긍정적' : sentiment < -0.2 ? '부정적' : '중립적';
    
    const insights = [
      `이 포스트는 ${category} 분야로 분류되며, ${sentimentLabel} 톤으로 작성되었습니다.`,
      `제목: "${post.title}"에서 주요 시장 동향을 다루고 있습니다.`
    ];

    // 카테고리별 특화 인사이트
    switch (category) {
      case '세계정세':
        insights.push('글로벌 정치경제 상황이 투자심리에 미치는 영향을 분석했습니다.');
        break;
      case '매크로':
        insights.push('거시경제 지표와 통화정책 변화가 시장에 미치는 영향을 다룹니다.');
        break;
      case '환율':
        insights.push('환율 변동성이 국내 증시와 수출기업에 미치는 영향을 분석합니다.');
        break;
      case '종목':
        insights.push('개별 종목의 펀더멘털과 투자 포인트를 분석했습니다.');
        break;
      case '산업':
        insights.push('산업별 트렌드와 구조적 변화를 투자 관점에서 해석했습니다.');
        break;
    }

    return insights.join(' ');
  }

  /**
   * 주간 보고서 생성
   */
  public async generateWeeklyReport(weekStartDate: string, weekEndDate: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // 해당 주간의 포스트 조회
      const query = `
        SELECT id, title, content, excerpt, created_date, category
        FROM blog_posts 
        WHERE created_date BETWEEN ? AND ?
        ORDER BY created_date DESC
      `;

      this.db.all(query, [weekStartDate, weekEndDate], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const analyses: AnalysisResult[] = [];
        const categoryStats: Record<keyof CategoryKeywords, number> = {
          세계정세: 0,
          매크로: 0,
          환율: 0,
          종목: 0,
          산업: 0
        };

        // 각 포스트 분석
        rows.forEach((post: PostData) => {
          const analysis = this.analyzePostCategory(post);
          analyses.push(analysis);
          categoryStats[analysis.category]++;
        });

        // 주간 리포트 생성
        const report = {
          period: { start: weekStartDate, end: weekEndDate },
          totalPosts: rows.length,
          analyses,
          categoryDistribution: categoryStats,
          avgSentiment: analyses.reduce((sum, a) => sum + a.sentiment_score, 0) / analyses.length || 0,
          topThemes: this.getTopThemes(analyses),
          marketOutlook: this.generateMarketOutlook(analyses)
        };

        resolve(report);
      });
    });
  }

  /**
   * 상위 테마 추출
   */
  private getTopThemes(analyses: AnalysisResult[]): string[] {
    const themeCount: Record<string, number> = {};
    
    analyses.forEach(analysis => {
      analysis.key_themes.forEach(theme => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      });
    });

    return Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme]) => theme);
  }

  /**
   * 시장 전망 생성
   */
  private generateMarketOutlook(analyses: AnalysisResult[]): string {
    const avgSentiment = analyses.reduce((sum, a) => sum + a.sentiment_score, 0) / analyses.length;
    const avgMarketImpact = analyses.reduce((sum, a) => sum + a.market_impact_score, 0) / analyses.length;

    let outlook = '';
    
    if (avgSentiment > 0.2) {
      outlook += '이번 주 메르의 분석은 전반적으로 긍정적인 톤을 보였습니다. ';
    } else if (avgSentiment < -0.2) {
      outlook += '이번 주 메르의 분석은 다소 신중한 시각을 보였습니다. ';
    } else {
      outlook += '이번 주 메르의 분석은 균형잡힌 시각을 유지했습니다. ';
    }

    if (avgMarketImpact > 0.6) {
      outlook += '시장에 높은 영향을 미칠 수 있는 이슈들을 주로 다뤘습니다.';
    } else if (avgMarketImpact > 0.3) {
      outlook += '중간 정도의 시장 영향력을 가진 주제들을 분석했습니다.';
    } else {
      outlook += '장기적 관점에서 시장을 바라보는 내용이 주를 이뤘습니다.';
    }

    return outlook;
  }

  /**
   * 리소스 정리
   */
  public close(): void {
    this.db.close();
  }
}

export default WeeklyReportAnalyzer;