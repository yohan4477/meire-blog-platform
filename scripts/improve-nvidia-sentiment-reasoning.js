/**
 * 🎯 엔비디아 감정 분석 근거 개선
 * 각 포스트별로 다른 논리적 근거 생성
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class NvidiaSentimentImprover {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
  }

  /**
   * 🎯 엔비디아 감정 분석 근거 개선
   */
  async improveNvidiaSentiment() {
    console.log('🎯 엔비디아 감정 분석 근거 개선 시작...');
    
    const nvidiaPosts = await this.getNvidiaPosts();
    console.log(`📝 엔비디아 관련 포스트: ${nvidiaPosts.length}개`);
    
    let updatedCount = 0;
    
    for (const post of nvidiaPosts) {
      const improvedAnalysis = this.generateNvidiaReasoning(post);
      
      if (improvedAnalysis) {
        await this.updateSentiment(post.id, 'NVDA', improvedAnalysis);
        console.log(`  ✅ ${post.title.substring(0, 40)}... → ${improvedAnalysis.reasoning.substring(0, 60)}...`);
        updatedCount++;
      }
    }
    
    console.log(`\n✅ 엔비디아 감정 분석 근거 개선 완료: ${updatedCount}개 업데이트됨`);
    this.db.close();
  }

  async getNvidiaPosts() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT DISTINCT bp.id, bp.title, bp.content, bp.excerpt, bp.created_date
        FROM blog_posts bp
        JOIN sentiments s ON bp.id = s.post_id
        WHERE s.ticker = 'NVDA'
        ORDER BY bp.created_date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 🎯 엔비디아별 논리적 근거 생성
   */
  generateNvidiaReasoning(post) {
    const title = post.title.toLowerCase();
    const content = (post.content || '').toLowerCase();
    const fullText = `${title} ${content}`;
    
    let sentiment = 'neutral';
    let reasoning = '';
    
    // AI 칩/데이터센터 관련
    if (fullText.includes('ai') || fullText.includes('데이터센터') || fullText.includes('gpu')) {
      if (fullText.includes('수요') || fullText.includes('급증') || fullText.includes('성장')) {
        sentiment = 'positive';
        reasoning = 'AI 데이터센터 수요 급증으로 엔비디아 GPU 공급 부족 현상 지속. H100, A100 등 고성능 AI 칩 독점 공급으로 초고수익 마진 구조 유지';
      } else if (fullText.includes('경쟁') || fullText.includes('대안') || fullText.includes('위협')) {
        sentiment = 'negative';
        reasoning = 'AI 칩 시장에 AMD, 인텔 등 경쟁업체 참여 확대로 엔비디아 독점 지위 위협. 고객사들의 공급업체 다각화 전략으로 가격 협상력 약화 우려';
      } else {
        sentiment = 'neutral';
        reasoning = 'AI 칩 시장 현황에서 엔비디아 언급, 구체적 수요 증감이나 경쟁 변화는 명시되지 않음';
      }
    }
    
    // 젠슨 황 관련
    else if (fullText.includes('젠슨') || fullText.includes('황') || fullText.includes('jensen')) {
      if (fullText.includes('비전') || fullText.includes('리더십') || fullText.includes('전략')) {
        sentiment = 'positive';
        reasoning = '젠슨 황 CEO의 AI 미래 비전과 강력한 리더십이 엔비디아의 기술 혁신과 시장 선도를 이끌고 있음. 투자자들의 장기적 신뢰 기반';
      } else if (fullText.includes('논란') || fullText.includes('우려') || fullText.includes('비판')) {
        sentiment = 'negative';
        reasoning = '젠슨 황 관련 이슈가 엔비디아 경영 불확실성 증대. 핵심 리더십에 대한 우려로 기업 가치 평가에 부정적 영향';
      } else {
        sentiment = 'neutral';
        reasoning = '젠슨 황 관련 일반적 언급, 엔비디아 사업 전략이나 성과에 대한 구체적 평가 없음';
      }
    }
    
    // 중국 관련
    else if (fullText.includes('중국') || fullText.includes('china')) {
      if (fullText.includes('제재') || fullText.includes('규제') || fullText.includes('금지')) {
        sentiment = 'negative';
        reasoning = '중국향 AI 칩 수출 제재 강화로 엔비디아 최대 시장 중 하나 접근 차단. 매출 감소와 함께 중국 내 대체재 개발 가속화로 장기적 시장 상실 위험';
      } else if (fullText.includes('완화') || fullText.includes('허용') || fullText.includes('협력')) {
        sentiment = 'positive';
        reasoning = '중국 시장 제재 완화 또는 특별 허가로 엔비디아 AI 칩 수출 재개 가능성. 거대한 중국 시장 접근 복구로 매출 급성장 기대';
      } else {
        sentiment = 'neutral';
        reasoning = '중국 관련 엔비디아 이슈 언급, 구체적 제재 영향이나 시장 접근성 변화는 제시되지 않음';
      }
    }
    
    // 경쟁사 관련 (AMD, 인텔)
    else if (fullText.includes('amd') || fullText.includes('인텔') || fullText.includes('intel')) {
      if (fullText.includes('경쟁') || fullText.includes('대항') || fullText.includes('추격')) {
        sentiment = 'negative';
        reasoning = 'AMD, 인텔 등 경쟁업체들의 AI 칩 개발 가속화로 엔비디아 기술적 우위 축소 압박. GPU 시장 점유율 감소 및 마진 압박 우려';
      } else if (fullText.includes('우위') || fullText.includes('앞서') || fullText.includes('선도')) {
        sentiment = 'positive';
        reasoning = 'AI 칩 시장에서 엔비디아의 기술적 우위 지속 확인. 경쟁사 대비 성능과 소프트웨어 생태계에서 압도적 경쟁력 유지';
      } else {
        sentiment = 'neutral';
        reasoning = 'GPU 시장 경쟁 현황에서 엔비디아 언급, 구체적 우위나 열세 평가는 명시되지 않음';
      }
    }
    
    // 주가/실적 관련
    else if (fullText.includes('주가') || fullText.includes('실적') || fullText.includes('매출')) {
      if (fullText.includes('상승') || fullText.includes('급등') || fullText.includes('호조')) {
        sentiment = 'positive';
        reasoning = '엔비디아 실적 호조 및 주가 상승 모멘텀 지속. AI 붐에 따른 매출 급증과 수익성 개선으로 투자자 기대치 상회';
      } else if (fullText.includes('하락') || fullText.includes('조정') || fullText.includes('부진')) {
        sentiment = 'negative';
        reasoning = '엔비디아 주가 조정 압력 또는 실적 부진 우려. 과도한 밸류에이션 부담이나 AI 투자 둔화로 성장 모멘텀 약화 가능성';
      } else {
        sentiment = 'neutral';
        reasoning = '엔비디아 주가/실적 현황 일반 언급, 명확한 상승/하락 전망은 제시되지 않음';
      }
    }
    
    // 양자컴퓨터 관련
    else if (fullText.includes('양자') || fullText.includes('quantum')) {
      if (fullText.includes('위협') || fullText.includes('대체') || fullText.includes('혁명')) {
        sentiment = 'negative';
        reasoning = '양자컴퓨터 기술 발전으로 기존 GPU 기반 컴퓨팅 모델에 대한 장기적 위협. 엔비디아의 AI 칩 독점 구조가 근본적으로 변화할 가능성';
      } else if (fullText.includes('협력') || fullText.includes('투자') || fullText.includes('개발')) {
        sentiment = 'positive';
        reasoning = '엔비디아의 양자컴퓨터 영역 진출로 차세대 컴퓨팅 시장 선점 기회. GPU와 양자 기술의 융합을 통한 새로운 성장 동력 확보';
      } else {
        sentiment = 'neutral';
        reasoning = '양자컴퓨터 관련 일반 언급, 엔비디아에 대한 구체적 임팩트나 전략적 의미는 평가되지 않음';
      }
    }
    
    // 자율주행/자동차 관련
    else if (fullText.includes('자율주행') || fullText.includes('자동차') || fullText.includes('automotive')) {
      sentiment = 'positive';
      reasoning = '자율주행차 시장 확대로 엔비디아 Drive 플랫폼 수요 증가. AI 칩의 새로운 대형 시장 개척으로 매출원 다각화 성공';
    }
    
    // 메타버스/게임 관련
    else if (fullText.includes('메타버스') || fullText.includes('게임') || fullText.includes('그래픽')) {
      if (fullText.includes('성장') || fullText.includes('수요') || fullText.includes('확대')) {
        sentiment = 'positive';
        reasoning = '메타버스, 게임 시장 성장으로 엔비디아 그래픽 카드 수요 견조. AI 시장 외에도 전통적 강자 영역에서 안정적 수익 기반 유지';
      } else {
        sentiment = 'neutral';
        reasoning = '게임/그래픽 시장에서 엔비디아 언급, 구체적 성장성이나 수요 변화는 명시되지 않음';
      }
    }
    
    // 데이터센터/클라우드 관련
    else if (fullText.includes('데이터센터') || fullText.includes('클라우드') || fullText.includes('서버')) {
      sentiment = 'positive';
      reasoning = '글로벌 데이터센터 AI 전환 가속화로 엔비디아 서버용 GPU 수요 폭증. 클라우드 업체들의 AI 인프라 구축 경쟁으로 장기 성장 동력 확보';
    }
    
    // 일반적인 경우
    else {
      const date = new Date(post.created_date);
      const month = date.getMonth() + 1;
      
      if (month >= 10 && month <= 12) {
        sentiment = 'neutral';
        reasoning = '연말 AI 반도체 시장에서 엔비디아 포지션 언급, 구체적 성과 지표나 전망은 제시되지 않음';
      } else if (month >= 1 && month <= 3) {
        sentiment = 'neutral';
        reasoning = '연초 엔비디아 사업 전망 관련 일반적 언급, 명확한 투자 의견이나 방향성은 부재';
      } else {
        sentiment = 'neutral';
        reasoning = '엔비디아 일반적 언급, 구체적 사업 임팩트나 투자 관점에서의 평가 없음';
      }
    }
    
    return {
      sentiment,
      score: sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0,
      reasoning
    };
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

const improver = new NvidiaSentimentImprover();
improver.improveNvidiaSentiment().catch(console.error);