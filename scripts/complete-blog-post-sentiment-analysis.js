/**
 * 🎯 blog_posts 기준 완전한 감정 분석 완료
 * 모든 블로그 포스트에서 종목 언급을 찾아 감정 분석 수행
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class BlogPostSentimentAnalyzer {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
    
    // 종목별 키워드 매핑 (확장)
    this.stockKeywords = {
      '005930': ['삼성전자', '삼성', 'Samsung', '삼성디스플레이', 'SAMSUNG'],
      'TSLA': ['테슬라', 'Tesla', '일론머스크', '일론 머스크', 'TSLA'],
      'AAPL': ['애플', 'Apple', '아이폰', 'iPhone', 'AAPL'],
      'NVDA': ['엔비디아', 'NVIDIA', 'GPU', 'NVDA'],
      'INTC': ['인텔', 'Intel', 'INTC'],
      'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet', 'GOOGL'],
      'MSFT': ['마이크로소프트', 'Microsoft', 'MS', '마소', 'MSFT'],
      'META': ['메타', 'Meta', '페이스북', 'Facebook', 'META'],
      '267250': ['HD현대', 'HD한국조선해양', '현대중공업', '현대'],
      '042660': ['한화오션', '한화시스템', '한화에어로스페이스', '한화'],
      '010620': ['현대미포조선', '현대미포', '미포조선'],
      'LLY': ['일라이릴리', 'Eli Lilly', '릴리', 'Lilly', '마운자로', 'LLY'],
      'UNH': ['유나이티드헬스케어', 'UnitedHealth', '유나이티드헬스', 'UnitedHealthcare', 'UNH']
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
      },
      'GOOGL': {
        name: '구글',
        특성: '검색 독점과 AI 경쟁의 선두주자',
        긍정신호: ['AI 혁신', '검색 독점', '클라우드 성장'],
        부정신호: ['반독점 규제', 'AI 경쟁', '광고 수익 둔화']
      },
      'MSFT': {
        name: '마이크로소프트',
        특성: '클라우드와 AI의 융합 선도기업',
        긍정신호: ['Azure 성장', 'AI 협업', '구독 모델'],
        부정신호: ['클라우드 경쟁', '라이센스 의존']
      },
      'META': {
        name: '메타',
        특성: '메타버스와 소셜 플랫폼의 변혁',
        긍정신호: ['메타버스', 'AI 광고', '사용자 증가'],
        부정신호: ['규제 압박', '메타버스 투자', 'TikTok 경쟁']
      },
      'NVDA': {
        name: '엔비디아',
        특성: 'AI 혁명의 핵심 수혜주',
        긍정신호: ['AI 붐', 'GPU 독점', '데이터센터'],
        부정신호: ['중국 제재', '경쟁 심화', 'AI 버블']
      }
    };
  }

  /**
   * 🎯 blog_posts 기준 완전한 감정 분석
   */
  async completeBlogPostSentimentAnalysis() {
    console.log('🎯 blog_posts 기준 완전한 감정 분석 시작...');
    
    // 모든 블로그 포스트 조회
    const allPosts = await this.getAllBlogPosts();
    console.log(`📝 전체 블로그 포스트: ${allPosts.length}개`);
    
    let totalAnalyzed = 0;
    let totalSentiments = 0;
    
    for (const post of allPosts) {
      const results = [];
      
      // 각 종목별로 포스트에서 언급 여부 확인 및 감정 분석
      for (const [ticker, keywords] of Object.entries(this.stockKeywords)) {
        const mentioned = this.isStockMentionedInPost(post, keywords);
        
        if (mentioned) {
          // 기존 감정 분석이 있는지 확인
          const existingSentiment = await this.getExistingSentiment(post.id, ticker);
          
          if (!existingSentiment) {
            const analysis = this.performSentimentAnalysis(post, ticker);
            if (analysis) {
              await this.saveSentimentWithCorrectDate(post.id, ticker, analysis, post.created_date);
              results.push(`${ticker}:${analysis.sentiment}`);
              totalSentiments++;
            }
          }
        }
      }
      
      if (results.length > 0) {
        console.log(`  📊 ${post.title.substring(0, 50)}... (${post.created_date}) → ${results.join(', ')}`);
        totalAnalyzed++;
      }
    }
    
    console.log(`\n✅ blog_posts 기준 감정 분석 완료:`);
    console.log(`   - 분석된 포스트: ${totalAnalyzed}개`);
    console.log(`   - 새로 추가된 감정 분석: ${totalSentiments}개`);
    
    // 최종 통계 확인
    await this.showFinalStatistics();
    
    this.db.close();
  }

  /**
   * 모든 블로그 포스트 조회
   */
  async getAllBlogPosts() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT id, title, content, excerpt, created_date
        FROM blog_posts 
        ORDER BY created_date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 포스트에서 종목 언급 여부 확인
   */
  isStockMentionedInPost(post, keywords) {
    const fullText = `${post.title} ${post.content || ''} ${post.excerpt || ''}`.toLowerCase();
    return keywords.some(keyword => 
      fullText.includes(keyword.toLowerCase())
    );
  }

  /**
   * 기존 감정 분석 결과 확인
   */
  async getExistingSentiment(postId, ticker) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM sentiments 
        WHERE post_id = ? AND ticker = ?
      `, [postId, ticker], (err, row) => {
        if (err) reject(err);
        else resolve(row);
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

  /**
   * 최종 통계 표시
   */
  async showFinalStatistics() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          ticker,
          sentiment,
          COUNT(*) as count
        FROM sentiments 
        GROUP BY ticker, sentiment
        ORDER BY ticker, sentiment
      `, (err, rows) => {
        if (err) reject(err);
        else {
          console.log('\n📊 최종 감정 분석 통계:');
          
          const stats = {};
          let totalSentiments = 0;
          
          rows.forEach(row => {
            if (!stats[row.ticker]) {
              stats[row.ticker] = { positive: 0, neutral: 0, negative: 0, total: 0 };
            }
            stats[row.ticker][row.sentiment] = row.count;
            stats[row.ticker].total += row.count;
            totalSentiments += row.count;
          });
          
          Object.entries(stats).forEach(([ticker, counts]) => {
            console.log(`   ${ticker}: 총 ${counts.total}개 (긍정 ${counts.positive}, 중립 ${counts.neutral}, 부정 ${counts.negative})`);
          });
          
          console.log(`\n🎯 전체 감정 분석: ${totalSentiments}개`);
          resolve();
        }
      });
    });
  }
}

// 실행
const analyzer = new BlogPostSentimentAnalyzer();
analyzer.completeBlogPostSentimentAnalysis().catch(console.error);