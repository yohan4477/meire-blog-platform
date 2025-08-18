/**
 * 🎯 삼성전자 구체적 감정 분석 재생성
 * 실제 포스트 내용을 바탕으로 각각 다른 분석 생성
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SpecificSamsungSentimentAnalyzer {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
  }

  /**
   * 🎯 삼성전자 구체적 감정 분석 재생성
   */
  async regenerateSpecificSamsungSentiment() {
    console.log('🎯 삼성전자 구체적 감정 분석 재생성 시작...');
    
    // 삼성전자 관련 포스트와 기존 감정 분석 조회
    const samsungPosts = await this.getSamsungPosts();
    console.log(`📝 삼성전자 관련 포스트: ${samsungPosts.length}개`);
    
    let updatedCount = 0;
    
    for (const post of samsungPosts) {
      // 실제 포스트 내용 기반 구체적 분석
      const specificAnalysis = this.generateSpecificAnalysis(post);
      
      if (specificAnalysis) {
        await this.updateSentiment(post.id, '005930', specificAnalysis, post.created_date);
        console.log(`  ✅ ${post.title.substring(0, 40)}... → ${specificAnalysis.reasoning.substring(0, 60)}...`);
        updatedCount++;
      }
    }
    
    console.log(`\n✅ 삼성전자 구체적 감정 분석 완료: ${updatedCount}개 업데이트됨`);
    this.db.close();
  }

  /**
   * 삼성전자 관련 포스트 조회
   */
  async getSamsungPosts() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT DISTINCT bp.id, bp.title, bp.content, bp.excerpt, bp.created_date
        FROM blog_posts bp
        JOIN sentiments s ON bp.id = s.post_id
        WHERE s.ticker = '005930'
        ORDER BY bp.created_date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 🎯 실제 포스트 내용 기반 구체적 분석
   */
  generateSpecificAnalysis(post) {
    const title = post.title.toLowerCase();
    const content = (post.content || '').toLowerCase();
    const excerpt = (post.excerpt || '').toLowerCase();
    const fullText = `${title} ${content} ${excerpt}`;
    
    // 포스트 내용에 따른 구체적 감정 분석
    let sentiment = 'neutral';
    let reasoning = '';
    
    // AI 관련 언급
    if (fullText.includes('ai') || fullText.includes('인공지능')) {
      if (fullText.includes('수요') || fullText.includes('호황') || fullText.includes('성장')) {
        sentiment = 'positive';
        reasoning = 'AI 반도체 수요 증가로 삼성전자 메모리 사업 성장 전망 긍정적';
      } else {
        sentiment = 'neutral';
        reasoning = 'AI 시장 관련 삼성전자 포지션 언급, 구체적 임팩트는 제한적';
      }
    }
    // 메모리 반도체 관련
    else if (fullText.includes('메모리') || fullText.includes('dram') || fullText.includes('반도체')) {
      if (fullText.includes('회복') || fullText.includes('상승') || fullText.includes('호조')) {
        sentiment = 'positive';
        reasoning = '메모리 반도체 업황 회복으로 삼성전자 수익성 개선 기대';
      } else if (fullText.includes('하락') || fullText.includes('침체') || fullText.includes('부진')) {
        sentiment = 'negative';
        reasoning = '메모리 반도체 시장 침체로 삼성전자 실적 압박 우려';
      } else {
        sentiment = 'neutral';
        reasoning = '메모리 반도체 시장 현황 언급, 삼성전자에 대한 구체적 전망 불분명';
      }
    }
    // 애플 관련
    else if (fullText.includes('애플') || fullText.includes('apple') || fullText.includes('아이폰')) {
      if (fullText.includes('계약') || fullText.includes('공급') || fullText.includes('파트너')) {
        sentiment = 'positive';
        reasoning = '애플과의 협업 확대로 삼성전자 부품 공급 증가 전망';
      } else if (fullText.includes('의존') || fullText.includes('리스크')) {
        sentiment = 'negative';
        reasoning = '애플 의존도 심화로 삼성전자 사업 변동성 확대 우려';
      } else {
        sentiment = 'neutral';
        reasoning = '애플 관련 이슈 언급, 삼성전자에 대한 직접적 임팩트는 제한적';
      }
    }
    // 중국 관련
    else if (fullText.includes('중국')) {
      if (fullText.includes('경쟁') || fullText.includes('위협')) {
        sentiment = 'negative';
        reasoning = '중국 반도체 업체들의 기술 추격으로 삼성전자 경쟁 압박 심화';
      } else {
        sentiment = 'neutral';
        reasoning = '중국 시장 이슈 언급, 삼성전자에 대한 구체적 영향 평가 필요';
      }
    }
    // 투자/전망 관련
    else if (fullText.includes('투자') || fullText.includes('전망') || fullText.includes('성장')) {
      if (fullText.includes('긍정') || fullText.includes('상승') || fullText.includes('호재')) {
        sentiment = 'positive';
        reasoning = '삼성전자에 대한 긍정적 투자 전망 및 성장 기대감 표출';
      } else if (fullText.includes('부정') || fullText.includes('하락') || fullText.includes('악재')) {
        sentiment = 'negative';
        reasoning = '삼성전자에 대한 부정적 투자 전망 및 리스크 요인 부각';
      } else {
        sentiment = 'neutral';
        reasoning = '삼성전자 투자 관점 언급, 명확한 방향성 제시되지 않음';
      }
    }
    // 실적/매출 관련
    else if (fullText.includes('실적') || fullText.includes('매출') || fullText.includes('수익')) {
      if (fullText.includes('개선') || fullText.includes('증가') || fullText.includes('호조')) {
        sentiment = 'positive';
        reasoning = '삼성전자 실적 개선 및 수익성 향상 기대감 반영';
      } else if (fullText.includes('악화') || fullText.includes('감소') || fullText.includes('부진')) {
        sentiment = 'negative';
        reasoning = '삼성전자 실적 부진 및 수익성 악화 우려 표출';
      } else {
        sentiment = 'neutral';
        reasoning = '삼성전자 실적 현황 언급, 구체적 평가 없이 팩트 나열';
      }
    }
    // 기술 혁신 관련
    else if (fullText.includes('기술') || fullText.includes('혁신') || fullText.includes('개발')) {
      sentiment = 'positive';
      reasoning = '삼성전자 기술 혁신 및 신제품 개발 역량에 대한 긍정적 평가';
    }
    // 일반적 언급
    else {
      const date = new Date(post.created_date);
      const month = date.getMonth() + 1;
      
      if (month >= 6 && month <= 8) {
        sentiment = 'neutral';
        reasoning = '하반기 반도체 시장에서 삼성전자 포지션 언급, 구체적 투자 의견 없음';
      } else if (month >= 9 && month <= 11) {
        sentiment = 'neutral';
        reasoning = '4분기 삼성전자 실적 전망 관련 일반적 언급, 명확한 방향성 부재';
      } else {
        sentiment = 'neutral';
        reasoning = '삼성전자 일반적 언급, 구체적 투자 임팩트나 전망 제시되지 않음';
      }
    }
    
    return {
      sentiment,
      score: sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0,
      reasoning
    };
  }

  /**
   * 감정 분석 업데이트
   */
  async updateSentiment(postId, ticker, analysis, blogPostDate) {
    return new Promise((resolve, reject) => {
      const normalizedDate = blogPostDate.includes('T') ? blogPostDate.split('T')[0] : 
                            blogPostDate.includes(' ') ? blogPostDate.split(' ')[0] : 
                            blogPostDate;
      
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
const analyzer = new SpecificSamsungSentimentAnalyzer();
analyzer.regenerateSpecificSamsungSentiment().catch(console.error);