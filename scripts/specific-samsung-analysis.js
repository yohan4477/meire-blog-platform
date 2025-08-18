/**
 * 🎯 구체적 사실과 숫자를 포함한 삼성전자 감정 분석
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SpecificSamsungAnalyzer {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
  }

  async specificAnalyzeSamsung() {
    console.log('🎯 구체적 사실과 숫자를 포함한 삼성전자 감정 분석 시작...');
    
    // 구체적으로 분석할 주요 포스트들
    const specificPosts = [
      { id: 513, expectation: 'AI와 반도체 시장 전환점' },
      { id: 512, expectation: '인텔 국유화 이슈' },
      { id: 5, expectation: '트럼프 vs 인텔 CEO' },
      { id: 11, expectation: '텍사스 공장 지연' },
      { id: 12, expectation: '대만 관세 TSMC' }
    ];

    for (const postInfo of specificPosts) {
      const post = await this.getPostById(postInfo.id);
      if (post) {
        console.log(`\n=== 포스트 ${post.id}: ${post.title} ===`);
        
        const specificAnalysis = this.createSpecificAnalysis(post);
        if (specificAnalysis) {
          await this.updateSentiment(post.id, '005930', specificAnalysis);
          console.log(`🎯 감정: ${specificAnalysis.sentiment}`);
          console.log(`📝 구체적 분석: ${specificAnalysis.reasoning}`);
          console.log(`===========================================`);
        }
      }
    }
    
    console.log(`\n✅ 구체적 분석 완료`);
    this.db.close();
  }

  async getPostById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT id, title, content, created_date
        FROM blog_posts 
        WHERE id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * 🎯 구체적 사실과 숫자를 포함한 분석 생성
   */
  createSpecificAnalysis(post) {
    // 포스트 513: "AI와 반도체 시장의 새로운 전환점"
    if (post.id === 513) {
      return {
        sentiment: 'positive',
        score: 1,
        reasoning: 'AI 칩 시장에서 삼성전자 HBM3 메모리가 테슬라 FSD 칩과 함께 핵심 부품으로 언급. HBM3은 일반 DRAM 대비 10-15배 높은 가격으로 2025년 하반기 AI 데이터센터 급증시 삼성전자 메모리 부문 수익성 크게 개선될 전망'
      };
    }
    
    // 포스트 512: "인텔 국유화 되나?"
    else if (post.id === 512) {
      return {
        sentiment: 'negative',
        score: -1,
        reasoning: '미국 정부가 인텔 오하이오 200억달러 팹 건설에 지분 투자 검토. 국가 차원의 인텔 지원으로 파운드리 경쟁에서 삼성전자가 불리해질 가능성. 특히 미국 내 정부 발주 물량에서 삼성전자 배제 우려'
      };
    }
    
    // 포스트 5: "트럼프가 인텔 CEO의 사임을 요구하는 이유"  
    else if (post.id === 5) {
      return {
        sentiment: 'positive',
        score: 1,
        reasoning: '트럼프가 인텔 CEO 립부탄(화교 출신)의 즉시 사임 요구로 인텔 내부 혼란 가중. 케이던스의 1억4000만달러 벌금 문제와 중국 기술기업 투자 이력이 쟁점. 인텔 경영 불안정이 삼성전자 파운드리 사업에 기회 요소'
      };
    }
    
    // 포스트 11: "삼성전자 애플칩 수주, 트럼프 반도체 100% 관세 부과"
    else if (post.id === 11) {
      return {
        sentiment: 'negative', 
        score: -1,
        reasoning: '삼성전자 370억달러 투자 텍사스 테일러2공장 완공이 2024년→2025년→2026년으로 연이어 연기. 고객 확보 실패로 ASML 노광기 도입 연기, 파견인력 한국 철수. 텍사스주가 삼성고속도로까지 개통했으나 공장 가동 무산'
      };
    }
    
    // 포스트 12: "대만 상호관세 20%의 비밀(feat TSMC)"
    else if (post.id === 12) {
      return {
        sentiment: 'neutral',
        score: 0,
        reasoning: '대만 상호관세 20%(한국 15% 대비 높음) 부과와 TSMC 위탁생산 모델 분석. TSMC는 1987년 공기업→1992년 민영화되었으나 대만 정부 7% 지분 보유. 삼성전자 관련해서는 일반적 경쟁 관계 언급에 그침'
      };
    }
    
    else {
      return {
        sentiment: 'neutral',
        score: 0,
        reasoning: '삼성전자 관련 내용이 포함되었으나 구체적 사업 전망이나 투자 의견 없음'
      };
    }
  }

  async updateSentiment(postId, ticker, analysis) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE sentiments 
        SET sentiment = ?, sentiment_score = ?, key_reasoning = ?
        WHERE post_id = ? AND ticker = ?
      `, [
        analysis.sentiment, analysis.score, analysis.reasoning, postId, ticker
      ], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
}

// 실행
const analyzer = new SpecificSamsungAnalyzer();
analyzer.specificAnalyzeSamsung().catch(console.error);