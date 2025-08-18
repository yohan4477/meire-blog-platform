/**
 * 🔄 감정 분석 데이터 전체 재구축
 * 모든 종목에 대해 1년치 감정 분석 데이터 재생성
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SentimentDataRebuilder {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
    
    // 주요 종목 리스트
    this.targetStocks = [
      { ticker: '005930', name: '삼성전자' },
      { ticker: 'TSLA', name: '테슬라' },
      { ticker: 'AAPL', name: '애플' },
      { ticker: 'NVDA', name: '엔비디아' },
      { ticker: 'INTC', name: '인텔' },
      { ticker: 'GOOGL', name: '구글' },
      { ticker: 'MSFT', name: '마이크로소프트' },
      { ticker: 'META', name: '메타' },
      { ticker: '267250', name: 'HD현대' },
      { ticker: '042660', name: '한화오션' },
      { ticker: '010620', name: '현대미포조선' },
      { ticker: 'LLY', name: '일라이릴리' },
      { ticker: 'UNH', name: '유나이티드헬스케어' }
    ];

    // 종목별 키워드 매핑
    this.stockKeywords = {
      '005930': ['삼성전자', '삼성', '삼성디스플레이', 'Samsung'],
      'TSLA': ['테슬라', 'Tesla', '일론머스크'],
      'AAPL': ['애플', 'Apple', '아이폰', 'iPhone'],
      'NVDA': ['엔비디아', 'NVIDIA', '엔디비아'],
      'INTC': ['인텔', 'Intel'],
      'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
      'MSFT': ['마이크로소프트', 'Microsoft', 'MS', '마소'],
      'META': ['메타', 'Meta', '페이스북', 'Facebook'],
      '267250': ['HD현대', 'HD한국조선해양', '현대중공업', '현대'],
      '042660': ['한화오션', '한화시스템', '한화에어로스페이스', '한화'],
      '010620': ['현대미포조선', '현대미포', '미포조선'],
      'LLY': ['일라이릴리', 'Eli Lilly', '릴리', 'Lilly'],
      'UNH': ['유나이티드헬스케어', 'UnitedHealth', '유나이티드헬스', 'UnitedHealthcare']
    };
  }

  /**
   * 1년치 블로그 포스트에서 종목별 데이터 추출 및 분석
   */
  async rebuildAllSentimentData() {
    console.log('🔄 감정 분석 데이터 전체 재구축 시작...');
    console.log(`📊 대상 종목: ${this.targetStocks.length}개`);
    
    // 1년전 날짜 계산
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    
    console.log(`📅 분석 기간: ${oneYearAgoStr} ~ 현재`);

    let totalAnalyzed = 0;

    for (const stock of this.targetStocks) {
      console.log(`\n📈 ${stock.name} (${stock.ticker}) 분석 시작...`);
      
      try {
        // 해당 종목이 언급된 포스트 찾기
        const mentionedPosts = await this.findPostsWithStock(stock, oneYearAgoStr);
        console.log(`  📝 발견된 포스트: ${mentionedPosts.length}개`);

        let stockAnalyzedCount = 0;
        for (const post of mentionedPosts) {
          // 감정 분석 수행
          const sentiment = this.analyzeStockSentiment(post, stock);
          
          // 결과 저장
          await this.saveSentimentResult(post.id, stock.ticker, sentiment);
          stockAnalyzedCount++;
        }

        console.log(`  ✅ ${stock.name}: ${stockAnalyzedCount}개 분석 완료`);
        totalAnalyzed += stockAnalyzedCount;

      } catch (error) {
        console.error(`  ❌ ${stock.name} 분석 실패:`, error);
      }
    }

    console.log(`\n🎉 감정 분석 데이터 재구축 완료!`);
    console.log(`📊 총 분석 건수: ${totalAnalyzed}개`);
    
    this.db.close();
  }

  /**
   * 특정 종목이 언급된 포스트들 찾기
   */
  async findPostsWithStock(stock, dateFrom) {
    return new Promise((resolve, reject) => {
      const keywords = this.stockKeywords[stock.ticker] || [stock.name];
      
      // 키워드 검색 조건 생성
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
          AND created_date >= ?
        ORDER BY created_date DESC
      `;
      
      this.db.all(query, [...searchParams, dateFrom], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 종목별 감정 분석 수행 (실제적인 분석 로직)
   */
  analyzeStockSentiment(post, stock) {
    const fullText = `${post.title} ${post.content || ''} ${post.excerpt || ''}`.toLowerCase();
    const stockKeywords = this.stockKeywords[stock.ticker] || [stock.name];
    
    // 종목 관련 문맥 추출
    let stockContext = '';
    stockKeywords.forEach(keyword => {
      const index = fullText.indexOf(keyword.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - 200);
        const end = Math.min(fullText.length, index + keyword.length + 200);
        stockContext += fullText.substring(start, end) + ' ';
      }
    });

    // 실제 비즈니스 임팩트 기반 감정 분석
    const analysis = this.performRealSentimentAnalysis(stockContext, stock, post);
    
    return {
      sentiment: analysis.sentiment,
      score: analysis.score,
      key_reasoning: analysis.reasoning,
      supporting_evidence: analysis.evidence,
      investment_perspective: analysis.perspective,
      investment_timeframe: analysis.timeframe,
      conviction_level: analysis.conviction,
      uncertainty_factors: analysis.uncertainties,
      mention_context: stockContext.substring(0, 500)
    };
  }

  /**
   * 🎯 종목별 특성 반영 감정 분석 로직 (상세 버전)
   */
  performRealSentimentAnalysis(context, stock, post) {
    // 🏢 종목별 특화 분석 패턴
    const stockSpecificPatterns = this.getStockSpecificPatterns(stock.ticker);
    
    // 📈 종목별 긍정적 신호 (특성 반영)
    const positiveSignals = [
      ...stockSpecificPatterns.positive,
      // 공통 긍정 신호
      { pattern: /수주|계약.*체결|협약.*체결|파트너십/, impact: 0.8, reason: `${stock.name} 신규 계약 체결로 매출 성장 동력 확보` },
      { pattern: /매출.*증가|이익.*증가|실적.*개선|성장/, impact: 0.9, reason: `${stock.name} 실적 개선으로 투자 매력도 상승` },
      { pattern: /정부.*지원|국가.*투자|보조금/, impact: 0.7, reason: `정부 지원정책이 ${stock.name}의 성장에 긍정적 영향` },
      { pattern: /목표가.*상향|매수.*추천|투자.*의견.*상향/, impact: 0.7, reason: `애널리스트들의 ${stock.name} 투자의견 상향으로 주가 상승 모멘텀` }
    ];

    // 📉 종목별 부정적 신호 (특성 반영) 
    const negativeSignals = [
      ...stockSpecificPatterns.negative,
      // 공통 부정 신호
      { pattern: /매출.*감소|이익.*감소|실적.*부진|판매.*감소/, impact: -0.9, reason: `${stock.name} 실적 악화로 주가 하락 압력 증가` },
      { pattern: /소송|벌금|제재|조사|스캔들/, impact: -0.7, reason: `${stock.name} 법적 리스크로 기업 평판 및 주가에 악영향` },
      { pattern: /경쟁.*심화|점유율.*하락|시장.*축소/, impact: -0.7, reason: `${stock.name} 시장 경쟁 심화로 수익성 압박 우려` },
      { pattern: /목표가.*하향|매도.*추천|투자.*의견.*하향/, impact: -0.7, reason: `애널리스트들의 ${stock.name} 투자의견 하향으로 투자 심리 악화` }
    ];

    let totalScore = 0;
    let confidence = 0.4;
    let reasoning = '';
    let evidence = [];
    let perspective = 'neutral';
    let timeframe = 'medium-term';
    let conviction = 'low';
    let uncertainties = [];

    // 긍정적 신호 검사
    positiveSignals.forEach(signal => {
      if (signal.pattern.test(context)) {
        totalScore += signal.impact;
        confidence = Math.max(confidence, 0.8);
        reasoning = signal.reason;
        evidence.push(`긍정: ${signal.reason}`);
        perspective = 'bullish';
        conviction = 'medium';
      }
    });

    // 부정적 신호 검사
    negativeSignals.forEach(signal => {
      if (signal.pattern.test(context)) {
        totalScore += signal.impact;
        confidence = Math.max(confidence, 0.8);
        reasoning = signal.reason;
        evidence.push(`부정: ${signal.reason}`);
        perspective = 'bearish';
        conviction = 'medium';
      }
    });

    // 최종 감정 판단
    let finalSentiment = 'neutral';
    if (totalScore > 0.3) {
      finalSentiment = 'positive';
      timeframe = 'short-to-medium-term';
      conviction = totalScore > 0.7 ? 'high' : 'medium';
    } else if (totalScore < -0.3) {
      finalSentiment = 'negative';
      timeframe = 'short-term';
      conviction = totalScore < -0.7 ? 'high' : 'medium';
    } else {
      reasoning = `${stock.name}에 대한 명확한 호재나 악재 없어 중립적 전망`;
      uncertainties.push('구체적인 비즈니스 임팩트 정보 부족');
    }

    // 불확실성 요소 추가
    if (context.includes('예상') || context.includes('전망') || context.includes('계획')) {
      uncertainties.push('미래 계획의 실행 불확실성');
    }

    // 🎯 종목별 특화 분석 요약 생성
    const stockContext = this.getStockBusinessContext(stock.ticker);
    const enhancedReasoning = this.generateDetailedReasoning(stock, finalSentiment, reasoning, evidence, stockContext);
    
    return {
      sentiment: finalSentiment,
      score: totalScore,
      reasoning: enhancedReasoning,
      evidence: evidence.join('; ') || `${stock.name} 관련 구체적 비즈니스 임팩트 데이터 부족`,
      perspective: perspective,
      timeframe: timeframe,
      conviction: conviction,
      uncertainties: uncertainties.join('; ') || '업계 및 거시경제 변수'
    };
  }

  /**
   * 감정 분석 결과 저장
   */
  async saveSentimentResult(postId, ticker, sentiment) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO sentiments (
          post_id, ticker, sentiment, sentiment_score, key_reasoning,
          supporting_evidence, investment_perspective, investment_timeframe,
          conviction_level, uncertainty_factors, mention_context,
          analysis_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), datetime('now'))
      `;

      this.db.run(query, [
        postId,
        ticker,
        sentiment.sentiment,
        sentiment.score,
        sentiment.key_reasoning,
        sentiment.supporting_evidence,
        sentiment.investment_perspective,
        sentiment.investment_timeframe,
        sentiment.conviction_level,
        sentiment.uncertainty_factors,
        sentiment.mention_context
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  /**
   * 🏢 종목별 특화 분석 패턴 정의
   */
  getStockSpecificPatterns(ticker) {
    const patterns = {
      // 🔵 삼성전자 (반도체/메모리 사이클, 애플 의존도, 중국 경쟁)
      '005930': {
        positive: [
          { pattern: /메모리.*호황|반도체.*슈퍼사이클|DRAM.*가격.*상승/, impact: 0.9, reason: "메모리 반도체 슈퍼사이클 진입으로 삼성전자 매출 및 마진 대폭 개선 예상" },
          { pattern: /애플.*계약|아이폰.*생산.*증가|애플.*파트너십/, impact: 0.8, reason: "애플과의 파트너십 강화로 삼성전자 디스플레이 및 반도체 사업 수혜" },
          { pattern: /파운드리.*수주|TSMC.*경쟁|3나노.*양산/, impact: 0.7, reason: "첨단 공정 파운드리 경쟁력 확보로 삼성전자 시장점유율 확대 기대" },
          { pattern: /중국.*견제|화웨이.*제재|반도체.*자립/, impact: 0.6, reason: "중국 반도체 견제 정책이 삼성전자에게 시장 기회 제공" }
        ],
        negative: [
          { pattern: /메모리.*가격.*하락|반도체.*침체|DRAM.*재고/, impact: -0.9, reason: "메모리 반도체 가격 하락으로 삼성전자 주력 사업 수익성 악화" },
          { pattern: /중국.*경쟁|YMTC.*추격|반도체.*굴기/, impact: -0.7, reason: "중국 메모리 업체들의 기술 추격으로 삼성전자 시장지배력 위협" },
          { pattern: /애플.*의존도|아이폰.*판매.*부진/, impact: -0.6, reason: "아이폰 판매 부진이 삼성전자 주요 고객사 리스크로 작용" }
        ]
      },
      
      // 🚗 테슬라 (EV 수요, 중국시장, 자율주행 규제)
      'TSLA': {
        positive: [
          { pattern: /전기차.*보급|EV.*수요.*증가|탄소중립/, impact: 0.9, reason: "글로벌 탄소중립 정책으로 전기차 수요 폭증, 테슬라 시장 선도 지위 강화" },
          { pattern: /자율주행.*승인|FSD.*확산|로보택시/, impact: 0.8, reason: "자율주행 기술 상용화로 테슬라 소프트웨어 매출 및 밸류에이션 대폭 상승" },
          { pattern: /중국.*생산.*증가|상하이.*공장|중국.*판매/, impact: 0.7, reason: "중국 시장 점유율 확대로 테슬라 글로벌 생산능력 및 비용경쟁력 향상" },
          { pattern: /배터리.*기술|4680.*셀|에너지.*저장/, impact: 0.6, reason: "차세대 배터리 기술로 테슬라 원가절감 및 에너지사업 확장" }
        ],
        negative: [
          { pattern: /중국.*판매.*감소|중국.*경쟁|BYD.*추격/, impact: -0.8, reason: "중국 로컬 전기차 업체들의 공격적 가격정책으로 테슬라 중국시장 점유율 하락" },
          { pattern: /자율주행.*사고|FSD.*문제|규제.*강화/, impact: -0.7, reason: "자율주행 안전성 이슈로 테슬라 핵심 기술의 상용화 지연 우려" },
          { pattern: /전기차.*보조금.*축소|EV.*세제혜택.*감소/, impact: -0.6, reason: "전기차 보조금 축소로 테슬라 가격경쟁력 및 수요 둔화 예상" }
        ]
      },
      
      // 🖥️ 엔비디아 (AI 붐, 데이터센터, 중국 수출제재)
      'NVDA': {
        positive: [
          { pattern: /AI.*붐|ChatGPT.*열풍|생성형.*AI/, impact: 0.9, reason: "생성형 AI 혁명으로 엔비디아 GPU 수요 폭증, 데이터센터 시장 독점적 지위" },
          { pattern: /데이터센터.*수요|H100.*주문|클라우드.*투자/, impact: 0.8, reason: "빅테크 기업들의 AI 인프라 투자 확대로 엔비디아 고성능 GPU 매출 급증" },
          { pattern: /CUDA.*생태계|AI.*소프트웨어|개발자.*플랫폼/, impact: 0.7, reason: "CUDA 생태계 확장으로 엔비디아 소프트웨어 의존도 심화 및 해자 강화" }
        ],
        negative: [
          { pattern: /중국.*수출.*제재|GPU.*수출.*금지/, impact: -0.8, reason: "미국의 대중 반도체 수출 제재로 엔비디아 중국시장 매출 타격" },
          { pattern: /AI.*버블|GPU.*과잉.*공급|경쟁.*심화/, impact: -0.7, reason: "AI 투자 과열 우려와 GPU 경쟁 심화로 엔비디아 밸류에이션 조정 압력" },
          { pattern: /AMD.*경쟁|인텔.*추격|AI.*칩.*경쟁/, impact: -0.6, reason: "AMD, 인텔 등 경쟁사의 AI 칩 개발로 엔비디아 독점적 지위 위협" }
        ]
      },
      
      // 🚢 HD현대 (조선 수주, 친환경 선박, 해상풍력)
      '267250': {
        positive: [
          { pattern: /조선.*수주|LNG.*선박|친환경.*선박/, impact: 0.9, reason: "친환경 선박 수주 증가로 HD현대 조선 사업 매출 및 수익성 대폭 개선" },
          { pattern: /해상풍력|신재생.*에너지|그린.*뉴딜/, impact: 0.8, reason: "해상풍력 프로젝트 확대로 HD현대 신성장 동력 확보" },
          { pattern: /정부.*지원|K.*조선|조선.*정책/, impact: 0.7, reason: "정부의 K-조선 정책 지원으로 HD현대 경쟁력 강화 및 수주 확대" }
        ],
        negative: [
          { pattern: /중국.*조선.*경쟁|조선.*가격.*경쟁/, impact: -0.7, reason: "중국 조선업체와의 가격 경쟁 심화로 HD현대 수익성 압박" },
          { pattern: /원자재.*가격.*상승|철강.*가격/, impact: -0.6, reason: "원자재 가격 상승으로 HD현대 조선 사업 원가 부담 증가" }
        ]
      },
      
      // 💊 일라이릴리 (당뇨병 치료제, 알츠하이머)
      'LLY': {
        positive: [
          { pattern: /당뇨병.*치료제|인슐린.*시장|비만.*치료/, impact: 0.9, reason: "글로벌 당뇨병 환자 증가로 일라이릴리 핵심 치료제 시장 확대" },
          { pattern: /알츠하이머.*치료제|치매.*신약|뇌질환/, impact: 0.8, reason: "알츠하이머 치료제 개발 성공시 일라이릴리 신약 매출 폭증 예상" },
          { pattern: /FDA.*승인|신약.*출시|임상.*성공/, impact: 0.7, reason: "신약 FDA 승인으로 일라이릴리 제품 포트폴리오 확장 및 매출 성장" }
        ],
        negative: [
          { pattern: /특허.*만료|제네릭.*경쟁|약가.*인하/, impact: -0.8, reason: "주력 의약품 특허 만료로 일라이릴리 제네릭 경쟁 및 매출 감소" },
          { pattern: /임상.*실패|부작용.*이슈|안전성.*문제/, impact: -0.7, reason: "신약 임상시험 실패로 일라이릴리 신성장 동력 확보 차질" }
        ]
      }
    };
    
    return patterns[ticker] || { positive: [], negative: [] };
  }
  
  /**
   * 🏢 종목별 비즈니스 컨텍스트 정의
   */
  getStockBusinessContext(ticker) {
    const contexts = {
      '005930': {
        industry: '반도체/메모리',
        keyDrivers: ['메모리 사이클', '애플 의존도', '중국 경쟁', '파운드리 경쟁력'],
        risks: ['메모리 가격 변동성', '중국 기술굴기', '고객 집중도'],
        competitive: 'DRAM/NAND 세계 1위, 파운드리 세계 2위'
      },
      'TSLA': {
        industry: '전기차/에너지',
        keyDrivers: ['EV 시장 성장', '자율주행 기술', '배터리 혁신', '중국 시장'],
        risks: ['중국 로컬 경쟁', '자율주행 규제', '보조금 정책'],
        competitive: '글로벌 프리미엄 EV 시장 선도'
      },
      'NVDA': {
        industry: 'AI/GPU',
        keyDrivers: ['AI 혁명', '데이터센터 수요', 'CUDA 생태계', '게이밍 시장'],
        risks: ['중국 수출 제재', 'AI 버블', '경쟁 심화'],
        competitive: 'AI 가속 컴퓨팅 시장 독점적 지위'
      },
      '267250': {
        industry: '중공업/조선',
        keyDrivers: ['친환경 선박', '해상풍력', 'LNG 선박', '정부 정책'],
        risks: ['중국 조선 경쟁', '원자재 가격', '수주 변동성'],
        competitive: '글로벌 조선 Big3, 해상풍력 강자'
      },
      'LLY': {
        industry: '제약/바이오',
        keyDrivers: ['당뇨병 치료제', '알츠하이머 신약', '비만 치료', '신약 파이프라인'],
        risks: ['특허 절벽', '규제 리스크', '임상 실패'],
        competitive: '당뇨병 치료제 글로벌 톱3'
      }
    };
    
    return contexts[ticker] || {
      industry: '일반',
      keyDrivers: ['사업 성과', '시장 환경'],
      risks: ['경쟁 심화', '규제 변화'],
      competitive: '업계 주요 기업'
    };
  }
  
  /**
   * 🎯 상세한 종목별 특화 분석 내용 생성
   */
  generateDetailedReasoning(stock, sentiment, basicReasoning, evidence, stockContext) {
    const ticker = stock.ticker;
    const name = stock.name;
    
    if (sentiment === 'positive') {
      if (ticker === '005930') {
        return `삼성전자의 주력 사업인 메모리 반도체 시장 호황과 파운드리 경쟁력 강화로 중장기 성장 모멘텀 확보. ${basicReasoning} 특히 AI 수요 급증과 애플과의 파트너십 확대가 매출 성장을 견인할 전망`;
      } else if (ticker === 'TSLA') {
        return `글로벌 전기차 시장 확산과 테슬라의 자율주행 기술 우위로 프리미엄 EV 시장 지배력 강화. ${basicReasoning} 중국 시장에서의 현지화 성공과 배터리 기술 혁신이 경쟁우위 지속`;
      } else if (ticker === 'NVDA') {
        return `생성형 AI 혁명의 핵심 수혜주로 데이터센터 GPU 독점적 지위 활용. ${basicReasoning} CUDA 생태계 확장으로 소프트웨어 종속성 심화되어 지속가능한 성장 기반 구축`;
      } else if (ticker === '267250') {
        return `친환경 선박 수주 증가와 해상풍력 사업 확장으로 HD현대 신성장 동력 확보. ${basicReasoning} K-조선 정책 지원과 LNG 선박 특화 경쟁력으로 글로벌 조선업계 선도`;
      } else if (ticker === 'LLY') {
        return `당뇨병 치료제 시장 성장과 알츠하이머 신약 개발로 일라이릴리 장기 성장 견인. ${basicReasoning} 고령화 사회 진입으로 뇌질환 치료제 수요 급증 예상`;
      }
    } else if (sentiment === 'negative') {
      if (ticker === '005930') {
        return `메모리 반도체 가격 하락 사이클과 중국 업체들의 기술 추격으로 삼성전자 수익성 압박. ${basicReasoning} 특히 YMTC 등 중국 메모리 업체들의 공격적 투자가 시장 점유율 위협`;
      } else if (ticker === 'TSLA') {
        return `중국 로컬 전기차 업체들의 공격적 가격 정책과 자율주행 규제 강화로 테슬라 성장 둔화. ${basicReasoning} BYD 등 중국 업체들의 기술 추격과 정부 지원이 경쟁 심화 요인`;
      } else if (ticker === 'NVDA') {
        return `미중 반도체 갈등 심화로 엔비디아 중국 시장 접근 제한. ${basicReasoning} AI 투자 과열 우려와 AMD, 인텔의 AI 칩 경쟁 가세로 독점적 지위 위협`;
      } else if (ticker === '267250') {
        return `중국 조선업체와의 가격 경쟁 심화와 원자재 가격 상승으로 HD현대 수익성 압박. ${basicReasoning} 조선업 특성상 수주 변동성이 크고 경기 민감도가 높아 실적 예측 어려움`;
      } else if (ticker === 'LLY') {
        return `주력 의약품의 특허 만료와 제네릭 경쟁 심화로 일라이릴리 매출 감소 압력. ${basicReasoning} 신약 개발의 높은 불확실성과 임상시험 실패 리스크가 성장성 제약`;
      }
    }
    
    // 기본 분석 (종목 특화 정보 없는 경우)
    const industryContext = stockContext.industry;
    const keyDriver = stockContext.keyDrivers[0] || '사업 환경';
    
    if (sentiment === 'positive') {
      return `${name}의 ${industryContext} 사업 특성을 고려할 때 ${keyDriver} 개선으로 투자 매력도 상승. ${basicReasoning || '긍정적 사업 환경 변화 기대'}`;
    } else if (sentiment === 'negative') {
      return `${name}의 ${industryContext} 사업 환경에서 ${keyDriver} 악화로 투자 리스크 증가. ${basicReasoning || '부정적 사업 환경 변화 우려'}`;
    } else {
      return `${name}의 ${industryContext} 사업에 대한 명확한 호재나 악재 없어 중립적 투자 관점 유지. 향후 ${keyDriver} 변화 추이 주목 필요`;
    }
  }
}

// 실행
const rebuilder = new SentimentDataRebuilder();
rebuilder.rebuildAllSentimentData().catch(console.error);