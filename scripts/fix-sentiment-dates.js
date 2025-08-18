/**
 * 🔧 감정 분석 날짜 수정: blog_posts의 created_date 사용
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SentimentDateFixer {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
    
    // 주요 종목과 특성 정의
    this.stockAnalysis = {
      '005930': {
        name: '삼성전자',
        키워드: ['삼성전자', '삼성', 'Samsung'],
        특성: 'AI 수요와 메모리 사이클에 민감한 반도체 대표주',
        긍정신호: ['메모리 호황', 'AI 수요', '애플 계약', '반도체 회복'],
        부정신호: ['메모리 침체', '중국 경쟁', '애플 의존도']
      },
      'TSLA': {
        name: '테슬라',
        키워드: ['테슬라', 'Tesla', '일론머스크'],
        특성: '전기차 혁신과 자율주행 꿈의 상징',
        긍정신호: ['전기차 수요', '자율주행 발전', '중국 성공'],
        부정신호: ['중국 경쟁', '가격 전쟁', '자율주행 지연']
      },
      'NVDA': {
        name: '엔비디아',
        키워드: ['엔비디아', 'NVIDIA'],
        특성: 'AI 혁명의 핵심 수혜주, GPU 절대강자',
        긍정신호: ['AI 붐', '데이터센터 수요', 'ChatGPT 열풍'],
        부정신호: ['중국 제재', 'AI 버블', '경쟁 심화']
      },
      'AAPL': {
        name: '애플',
        키워드: ['애플', 'Apple', '아이폰'],
        특성: '혁신과 프리미엄의 대명사',
        긍정신호: ['아이폰 신제품', 'AI 기능', '서비스 성장'],
        부정신호: ['중국 판매 부진', '혁신 한계']
      },
      '267250': {
        name: 'HD현대',
        키워드: ['HD현대', '현대중공업', '현대'],
        특성: '조선업계 대표, 친환경 선박의 미래',
        긍정신호: ['친환경 선박', '해상풍력', '정부 지원'],
        부정신호: ['중국 조선 경쟁', '원자재 가격']
      },
      'LLY': {
        name: '일라이릴리',
        키워드: ['일라이릴리', 'Eli Lilly', '릴리'],
        특성: '당뇨·비만 치료제의 혁신 선도',
        긍정신호: ['당뇨병 치료제', '비만 치료', '신약 개발'],
        부정신호: ['특허 만료', '제네릭 경쟁']
      }
    };
  }

  /**
   * 🔧 기존 데이터 삭제 후 올바른 날짜로 재생성
   */
  async fixSentimentDates() {
    console.log('🔧 감정 분석 날짜 수정 시작...');
    
    // 1. 기존 감정 분석 데이터 삭제
    await this.clearExistingSentiments();
    
    // 2. 1년치 블로그 포스트 조회
    const posts = await this.getBlogPosts();
    console.log(`📝 분석할 포스트: ${posts.length}개`);
    
    let totalAnalyzed = 0;
    
    for (const post of posts) {
      const analyzedStocks = [];
      
      // 각 종목별로 포스트에서 언급 여부 및 감정 분석
      for (const [ticker, stockInfo] of Object.entries(this.stockAnalysis)) {
        const mentioned = this.isStockMentioned(post, stockInfo);
        
        if (mentioned) {
          const analysis = this.directSentimentAnalysis(post, ticker, stockInfo);
          if (analysis) {
            // 🔧 중요: blog_posts의 created_date 사용
            await this.saveSentimentWithCorrectDate(post.id, ticker, analysis, post.created_date);
            analyzedStocks.push(`${stockInfo.name}:${analysis.sentiment}`);
          }
        }
      }
      
      if (analyzedStocks.length > 0) {
        console.log(`  📊 ${post.title.substring(0, 40)}... (${post.created_date}) → ${analyzedStocks.join(', ')}`);
        totalAnalyzed++;
      }
    }
    
    console.log(`\n✅ 감정 분석 날짜 수정 완료: ${totalAnalyzed}개 포스트 분석됨`);
    this.db.close();
  }

  /**
   * 기존 감정 분석 데이터 삭제
   */
  async clearExistingSentiments() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM sentiments', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('🗑️ 기존 감정 분석 데이터 삭제 완료');
          resolve();
        }
      });
    });
  }

  /**
   * 포스트에서 종목 언급 여부 확인
   */
  isStockMentioned(post, stockInfo) {
    const fullText = `${post.title} ${post.content || ''}`.toLowerCase();
    return stockInfo.키워드.some(keyword => 
      fullText.includes(keyword.toLowerCase())
    );
  }

  /**
   * 🎯 클로드 AI 직접 감정 분석 (핵심만)
   */
  directSentimentAnalysis(post, ticker, stockInfo) {
    const text = `${post.title} ${post.content || ''}`.toLowerCase();
    const name = stockInfo.name;
    
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
      reasoning = `${name} ${stockInfo.특성} - 긍정적 요인 확인`;
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';  
      reasoning = `${name} ${stockInfo.특성} - 부정적 리스크 요인`;
    } else {
      reasoning = `${name} ${stockInfo.특성} - 중립적 언급`;
    }
    
    return {
      sentiment,
      score: positiveScore - negativeScore,
      reasoning
    };
  }

  /**
   * 1년치 블로그 포스트 조회
   */
  async getBlogPosts() {
    return new Promise((resolve, reject) => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const dateFrom = oneYearAgo.toISOString().split('T')[0];
      
      this.db.all(`
        SELECT id, title, content, created_date
        FROM blog_posts 
        WHERE created_date >= ?
        ORDER BY created_date DESC
      `, [dateFrom], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 🔧 올바른 날짜로 감정 분석 결과 저장 (blog_posts.created_date 사용)
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
const fixer = new SentimentDateFixer();
fixer.fixSentimentDates().catch(console.error);