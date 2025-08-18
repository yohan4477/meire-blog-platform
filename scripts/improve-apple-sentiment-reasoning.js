/**
 * 🎯 애플 감정 분석 근거 개선
 * 각 포스트별로 다른 논리적 근거 생성
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class AppleSentimentImprover {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
  }

  async improveAppleSentiment() {
    console.log('🎯 애플 감정 분석 근거 개선 시작...');
    
    const applePosts = await this.getApplePosts();
    console.log(`📝 애플 관련 포스트: ${applePosts.length}개`);
    
    let updatedCount = 0;
    
    for (const post of applePosts) {
      const improvedAnalysis = this.generateAppleReasoning(post);
      
      if (improvedAnalysis) {
        await this.updateSentiment(post.id, 'AAPL', improvedAnalysis);
        console.log(`  ✅ ${post.title.substring(0, 40)}... → ${improvedAnalysis.reasoning.substring(0, 60)}...`);
        updatedCount++;
      }
    }
    
    console.log(`\n✅ 애플 감정 분석 근거 개선 완료: ${updatedCount}개 업데이트됨`);
    this.db.close();
  }

  async getApplePosts() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT DISTINCT bp.id, bp.title, bp.content, bp.excerpt, bp.created_date
        FROM blog_posts bp
        JOIN sentiments s ON bp.id = s.post_id
        WHERE s.ticker = 'AAPL'
        ORDER BY bp.created_date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 🎯 애플별 논리적 근거 생성
   */
  generateAppleReasoning(post) {
    const title = post.title.toLowerCase();
    const content = (post.content || '').toLowerCase();
    const fullText = `${title} ${content}`;
    
    let sentiment = 'neutral';
    let reasoning = '';
    
    // iPhone 관련
    if (fullText.includes('아이폰') || fullText.includes('iphone')) {
      if (fullText.includes('판매') || fullText.includes('성공') || fullText.includes('호조')) {
        sentiment = 'positive';
        reasoning = '아이폰 판매 호조로 애플 주력 사업 안정성 확인. 프리미엄 스마트폰 시장에서 브랜드 파워 및 생태계 우위 지속';
      } else if (fullText.includes('부진') || fullText.includes('감소') || fullText.includes('경쟁')) {
        sentiment = 'negative';
        reasoning = '아이폰 판매 부진 또는 중국 등 주요 시장에서 경쟁 심화. 애플 매출의 50% 이상을 차지하는 핵심 사업 위축 우려';
      } else {
        sentiment = 'neutral';
        reasoning = '아이폰 관련 일반적 언급, 구체적 판매 성과나 시장 점유율 변화는 명시되지 않음';
      }
    }
    
    // AI 관련
    else if (fullText.includes('ai') || fullText.includes('인공지능') || fullText.includes('siri')) {
      if (fullText.includes('혁신') || fullText.includes('발전') || fullText.includes('도입')) {
        sentiment = 'positive';
        reasoning = '애플의 AI 기술 혁신으로 Siri 성능 개선 및 생태계 경쟁력 강화. 온디바이스 AI를 통한 개인정보 보호와 기능성 양립으로 차별화';
      } else if (fullText.includes('뒤처짐') || fullText.includes('경쟁') || fullText.includes('열세')) {
        sentiment = 'negative';
        reasoning = 'AI 기술 발전에서 구글, 마이크로소프트 대비 애플이 뒤처지는 상황. Siri의 제한적 기능으로 AI 생태계 경쟁에서 불리';
      } else {
        sentiment = 'neutral';
        reasoning = 'AI 관련 애플 동향 언급, 구체적 기술 우위나 열세 평가는 제시되지 않음';
      }
    }
    
    // 중국 시장 관련
    else if (fullText.includes('중국') || fullText.includes('china')) {
      if (fullText.includes('회복') || fullText.includes('성장') || fullText.includes('확대')) {
        sentiment = 'positive';
        reasoning = '중국 시장에서 애플 브랜드 선호도 회복 및 판매 증가. 세계 2위 스마트폰 시장에서 점유율 확대로 글로벌 성장 견인';
      } else if (fullText.includes('제재') || fullText.includes('규제') || fullText.includes('보이콧')) {
        sentiment = 'negative';
        reasoning = '중국 정부의 애플 제품 사용 제한 또는 소비자 보이콧으로 매출 타격. 애플 전체 매출의 15-20%를 차지하는 핵심 시장 위축';
      } else {
        sentiment = 'neutral';
        reasoning = '중국 시장 관련 애플 현황 언급, 구체적 판매 증감이나 정책 영향은 명시되지 않음';
      }
    }
    
    // 서비스 사업 관련
    else if (fullText.includes('서비스') || fullText.includes('앱스토어') || fullText.includes('subscription')) {
      if (fullText.includes('성장') || fullText.includes('확대') || fullText.includes('증가')) {
        sentiment = 'positive';
        reasoning = '애플 서비스 사업 성장으로 하드웨어 의존도 감소 및 수익성 개선. 앱스토어, 아이클라우드 등 구독 모델로 안정적 수익 기반 확대';
      } else if (fullText.includes('규제') || fullText.includes('반독점') || fullText.includes('수수료')) {
        sentiment = 'negative';
        reasoning = '앱스토어 독점 및 수수료 정책에 대한 규제 강화로 서비스 수익 모델 위협. EU 등 주요 시장에서 규제 압박 증가';
      } else {
        sentiment = 'neutral';
        reasoning = '애플 서비스 사업 현황 언급, 구체적 성장성이나 규제 영향은 평가되지 않음';
      }
    }
    
    // 워렌 버핏 관련
    else if (fullText.includes('버핏') || fullText.includes('워렌') || fullText.includes('buffett')) {
      if (fullText.includes('매수') || fullText.includes('투자') || fullText.includes('보유')) {
        sentiment = 'positive';
        reasoning = '워렌 버핏의 애플 대량 보유 및 추가 투자로 장기 투자자들의 신뢰 증대. 가치 투자의 대가가 인정한 안정성과 성장성';
      } else if (fullText.includes('매도') || fullText.includes('축소') || fullText.includes('감소')) {
        sentiment = 'negative';
        reasoning = '워렌 버핏의 애플 지분 매도로 시장 심리 위축. 장기 보유 철학으로 유명한 투자자의 포지션 축소가 애플 전망에 대한 우려 신호';
      } else {
        sentiment = 'neutral';
        reasoning = '워렌 버핏의 애플 투자 관련 일반적 언급, 구체적 포지션 변화나 투자 의견은 명시되지 않음';
      }
    }
    
    // Vision Pro/VR 관련
    else if (fullText.includes('vision') || fullText.includes('vr') || fullText.includes('ar')) {
      if (fullText.includes('성공') || fullText.includes('혁신') || fullText.includes('미래')) {
        sentiment = 'positive';
        reasoning = '애플 Vision Pro를 통한 VR/AR 시장 개척으로 새로운 성장 동력 확보. 프리미엄 웨어러블 시장에서 애플의 기술 리더십 확장';
      } else if (fullText.includes('실패') || fullText.includes('부진') || fullText.contains('취소')) {
        sentiment = 'negative';
        reasoning = 'Vision Pro 판매 부진으로 애플의 차세대 성장 사업 전략에 차질. 고가격 정책으로 대중화 실패 및 투자 회수 지연 우려';
      } else {
        sentiment = 'neutral';
        reasoning = '애플 VR/AR 제품 관련 언급, 구체적 성과나 시장 반응은 평가되지 않음';
      }
    }
    
    // 반도체/칩 관련
    else if (fullText.includes('칩') || fullText.includes('반도체') || fullText.includes('processor')) {
      if (fullText.includes('자체') || fullText.includes('개발') || fullText.includes('성능')) {
        sentiment = 'positive';
        reasoning = '애플 자체 칩 개발로 인텔 의존도 탈피 및 성능 최적화 실현. M시리즈 프로세서의 우수한 전력 효율성으로 경쟁 우위 확보';
      } else if (fullText.includes('의존') || fullText.includes('공급') || fullText.includes('리스크')) {
        sentiment = 'negative';
        reasoning = '반도체 공급망 불안정성으로 애플 제품 생산 차질 우려. TSMC 등 특정 업체 의존도 심화로 지정학적 리스크 증가';
      } else {
        sentiment = 'neutral';
        reasoning = '애플 반도체 관련 일반 현황, 구체적 기술 우위나 공급망 리스크는 명시되지 않음';
      }
    }
    
    // 주가/실적 관련
    else if (fullText.includes('주가') || fullText.includes('실적') || fullText.includes('매출')) {
      if (fullText.includes('상승') || fullText.includes('호조') || fullText.includes('성장')) {
        sentiment = 'positive';
        reasoning = '애플 실적 개선 및 주가 상승으로 투자자 신뢰 회복. 아이폰 판매 안정성과 서비스 매출 성장으로 균형잡힌 성장 구조';
      } else if (fullText.includes('하락') || fullText.includes('부진') || fullText.includes('우려')) {
        sentiment = 'negative';
        reasoning = '애플 주가 조정 또는 실적 둔화로 성장 모멘텀 약화 우려. 스마트폰 시장 포화와 중국 리스크로 매출 성장률 둔화';
      } else {
        sentiment = 'neutral';
        reasoning = '애플 주가/실적 현황 일반 언급, 명확한 상승/하락 전망은 제시되지 않음';
      }
    }
    
    // 일반적인 경우
    else {
      const date = new Date(post.created_date);
      const month = date.getMonth() + 1;
      
      if (month >= 9 && month <= 11) {
        sentiment = 'neutral';
        reasoning = '신제품 출시 시즌 애플 동향 언급, 구체적 제품 성과나 시장 반응은 제시되지 않음';
      } else if (month >= 1 && month <= 3) {
        sentiment = 'neutral';
        reasoning = '애플 분기 실적 시즌 관련 일반적 언급, 명확한 투자 의견이나 전망은 부재';
      } else {
        sentiment = 'neutral';
        reasoning = '애플 일반적 언급, 구체적 사업 임팩트나 투자 관점에서의 평가 없음';
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

const improver = new AppleSentimentImprover();
improver.improveAppleSentiment().catch(console.error);