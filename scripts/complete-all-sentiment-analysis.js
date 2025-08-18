/**
 * 🎯 모든 메르 언급에 대한 감정 분석 완료
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class CompleteSentimentAnalyzer {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
    
    // 종목별 키워드 매핑 확장
    this.stockKeywords = {
      '005930': ['삼성전자', '삼성', 'Samsung', '삼성디스플레이'],
      'TSLA': ['테슬라', 'Tesla', '일론머스크', '일론 머스크'],
      'AAPL': ['애플', 'Apple', '아이폰', 'iPhone'],
      'NVDA': ['엔비디아', 'NVIDIA', 'GPU'],
      'INTC': ['인텔', 'Intel'],
      'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
      'MSFT': ['마이크로소프트', 'Microsoft', 'MS', '마소'],
      'META': ['메타', 'Meta', '페이스북', 'Facebook'],
      '267250': ['HD현대', 'HD한국조선해양', '현대중공업', '현대'],
      '042660': ['한화오션', '한화시스템', '한화에어로스페이스', '한화'],
      '010620': ['현대미포조선', '현대미포', '미포조선'],
      'LLY': ['일라이릴리', 'Eli Lilly', '릴리', 'Lilly', '마운자로'],
      'UNH': ['유나이티드헬스케어', 'UnitedHealth', '유나이티드헬스', 'UnitedHealthcare']
    };

    // 종목별 감정 분석 패턴
    this.sentimentPatterns = {
      '005930': {
        name: '삼성전자',
        특성: 'AI 수요와 메모리 사이클에 민감한 반도체 대표주',
        긍정신호: ['메모리 호황', 'AI 수요', '애플 계약', '반도체 회복', 'HBM', 'DRAM 가격 상승', '파운드리 수주'],
        부정신호: ['메모리 침체', '중국 경쟁', '애플 의존도', 'DRAM 가격 하락', '중국 메모리']
      },
      'TSLA': {
        name: '테슬라',
        특성: '전기차 혁신과 자율주행 꿈의 상징',
        긍정신호: ['전기차 수요', '자율주행 발전', '중국 성공', 'FSD', '배터리 기술'],
        부정신호: ['중국 경쟁', '가격 전쟁', '자율주행 지연', 'BYD', '판매 부진']
      },
      'NVDA': {
        name: '엔비디아',
        특성: 'AI 혁명의 핵심 수혜주, GPU 절대강자',
        긍정신호: ['AI 붐', '데이터센터 수요', 'ChatGPT 열풍', 'H100', 'GPU 수요'],
        부정신호: ['중국 제재', 'AI 버블', '경쟁 심화', '수출 금지']
      },
      'AAPL': {
        name: '애플',
        특성: '혁신과 프리미엄의 대명사',
        긍정신호: ['아이폰 신제품', 'AI 기능', '서비스 성장', '신제품 출시'],
        부정신호: ['중국 판매 부진', '혁신 한계', '매출 감소']
      },
      '267250': {
        name: 'HD현대',
        특성: '조선업계 대표, 친환경 선박의 미래',
        긍정신호: ['친환경 선박', '해상풍력', '정부 지원', 'LNG 선박', '수주'],
        부정신호: ['중국 조선 경쟁', '원자재 가격', '수주 실패']
      },
      'LLY': {
        name: '일라이릴리',
        특성: '당뇨·비만 치료제의 혁신 선도',
        긍정신호: ['당뇨병 치료제', '비만 치료', '신약 개발', '마운자로', 'FDA 승인'],
        부정신호: ['특허 만료', '제네릭 경쟁', '임상 실패']
      }
    };
  }

  /**
   * 🎯 모든 메르 언급에 대한 완전한 감정 분석
   */
  async completeAllSentimentAnalysis() {
    console.log('🎯 모든 메르 언급 감정 분석 완료 작업 시작...');
    
    // 모든 종목별 메르 언급 vs 감정 분석 비교
    for (const ticker of Object.keys(this.stockKeywords)) {
      console.log(`\n📊 ${ticker} 분석 중...`);
      
      // 메르 언급 포스트 조회
      const mentionedPosts = await this.getMentionedPosts(ticker);
      console.log(`  📝 메르 언급: ${mentionedPosts.length}개`);
      
      // 기존 감정 분석 조회
      const existingSentiments = await this.getExistingSentiments(ticker);
      console.log(`  🎯 기존 감정 분석: ${existingSentiments.length}개`);
      
      // 누락된 포스트 찾기
      const existingPostIds = new Set(existingSentiments.map(s => s.post_id));
      const missingPosts = mentionedPosts.filter(post => !existingPostIds.has(post.id));
      
      if (missingPosts.length > 0) {
        console.log(`  ❗ 누락된 감정 분석: ${missingPosts.length}개`);
        
        // 누락된 포스트들에 대해 감정 분석 수행
        for (const post of missingPosts) {
          const analysis = this.performSentimentAnalysis(post, ticker);
          if (analysis) {
            await this.saveSentimentWithCorrectDate(post.id, ticker, analysis, post.created_date);
            console.log(`    ✅ ${post.title.substring(0, 30)}... → ${analysis.sentiment}`);
          }
        }
      } else {
        console.log(`  ✅ 모든 언급에 대한 감정 분석 완료`);
      }
    }
    
    console.log('\n🎉 전체 감정 분석 완료 작업 끝!');
    this.db.close();
  }

  /**
   * 특정 종목이 언급된 모든 포스트 조회
   */
  async getMentionedPosts(ticker) {
    return new Promise((resolve, reject) => {
      const keywords = this.stockKeywords[ticker] || [ticker];
      
      // 검색 조건 생성
      const searchConditions = keywords.map(() => 
        '(title LIKE ? OR content LIKE ? OR excerpt LIKE ?)'
      ).join(' OR ');
      
      const searchParams = [];
      keywords.forEach(keyword => {
        const pattern = `%${keyword}%`;
        searchParams.push(pattern, pattern, pattern);
      });
      
      const query = `
        SELECT id, title, content, excerpt, created_date
        FROM blog_posts 
        WHERE (${searchConditions})
        ORDER BY created_date DESC
      `;
      
      this.db.all(query, searchParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 기존 감정 분석 결과 조회
   */
  async getExistingSentiments(ticker) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT post_id, sentiment, key_reasoning
        FROM sentiments 
        WHERE ticker = ?
      `, [ticker], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 🎯 포스트별 감정 분석 수행
   */
  performSentimentAnalysis(post, ticker) {
    const text = `${post.title} ${post.content || ''}`.toLowerCase();
    const stockInfo = this.sentimentPatterns[ticker];
    
    if (!stockInfo) {
      // 기본 패턴이 없는 종목은 중립으로 처리
      return {
        sentiment: 'neutral',
        score: 0,
        reasoning: `${ticker} 관련 일반적 언급`
      };
    }
    
    // 긍정적 신호 체크
    const positiveScore = stockInfo.긍정신호.reduce((score, signal) => {
      return text.includes(signal.toLowerCase()) ? score + 1 : score;
    }, 0);
    
    // 부정적 신호 체크  
    const negativeScore = stockInfo.부정신호.reduce((score, signal) => {
      return text.includes(signal.toLowerCase()) ? score + 1 : score;
    }, 0);
    
    // 최종 감정 판단
    let sentiment = 'neutral';
    let reasoning = '';
    
    if (positiveScore > negativeScore) {
      sentiment = 'positive';
      reasoning = `${stockInfo.name} ${stockInfo.특성} - 긍정적 요인 확인`;
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';  
      reasoning = `${stockInfo.name} ${stockInfo.특성} - 부정적 리스크 요인`;
    } else {
      reasoning = `${stockInfo.name} ${stockInfo.특성} - 중립적 언급`;
    }
    
    return {
      sentiment,
      score: positiveScore - negativeScore,
      reasoning
    };
  }

  /**
   * 🔧 올바른 날짜로 감정 분석 결과 저장
   */
  async saveSentimentWithCorrectDate(postId, ticker, analysis, blogPostDate) {
    return new Promise((resolve, reject) => {
      // 날짜 형식 정규화 (YYYY-MM-DD)
      const normalizedDate = blogPostDate.includes('T') ? blogPostDate.split('T')[0] : 
                            blogPostDate.includes(' ') ? blogPostDate.split(' ')[0] : 
                            blogPostDate;
      
      this.db.run(`
        INSERT OR REPLACE INTO sentiments (
          post_id, ticker, sentiment, sentiment_score, 
          key_reasoning, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        postId, ticker, analysis.sentiment, 
        analysis.score, analysis.reasoning, normalizedDate
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }
}

// 실행
const analyzer = new CompleteSentimentAnalyzer();
analyzer.completeAllSentimentAnalysis().catch(console.error);