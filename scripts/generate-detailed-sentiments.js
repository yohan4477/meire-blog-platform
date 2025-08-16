const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 종목명 매핑 확장
const tickerToNameMap = {
  '005930': ['삼성전자', '삼성', 'Samsung'],
  'AAPL': ['애플', 'Apple', '아이폰', 'iPhone', 'iOS'],
  'LLY': ['일라이릴리', 'Eli Lilly', '릴리'],
  'BRK': ['버크셔', 'Berkshire', '버핏', 'Buffett'],
  'INTC': ['인텔', 'Intel', 'CPU'],
  'UNH': ['유나이티드헬스', 'UnitedHealth'],
  '267250': ['HD현대', '현대중공업', '조선'],
  '042660': ['한화오션', '대우조선', '한화', 'LNG'],
  'TSLA': ['테슬라', 'Tesla', '일론머스크', 'Musk', '전기차'],
  'NVDA': ['엔비디아', 'NVIDIA', 'GPU', 'AI칩'],
  'TSM': ['TSMC', '대만반도체'],
  'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
  'SK하이닉스': ['SK하이닉스', '하이닉스', 'HBM', 'D램'],
  'META': ['메타', 'Meta', '페이스북', 'Facebook'],
  'AMD': ['AMD', '라이젠', 'Ryzen'],
  'MSFT': ['마이크로소프트', 'Microsoft', '윈도우', 'Windows', 'Azure']
};

// 감정 키워드 사전 확장
const sentimentKeywords = {
  positive: [
    '상승', '증가', '성장', '호재', '긍정적', '좋은', '유망', '전망', '기대',
    '투자', '추천', '매수', '강세', '신고가', '실적개선', '수익성', '혁신',
    '돌파', '회복', '반등', '개선', '성공', '달성', '흑자전환', '수주',
    '계약', '파트너십', '협력', '진출', '확대', '신제품', '기술력'
  ],
  negative: [
    '하락', '감소', '악재', '부정적', '나쁜', '우려', '위험', '리스크',
    '매도', '하향', '악화', '약세', '신저가', '실적악화', '손실', '적자',
    '폭락', '급락', '부진', '실패', '지연', '취소', '철수', '포기',
    '경쟁심화', '규제', '제재', '갈등', '분쟁', '소송', '리콜'
  ],
  neutral: [
    '유지', '보합', '관망', '중립', '분석', '검토', '평가', '현황',
    '발표', '공시', '예정', '계획', '진행', '논의', '협상', '대기',
    '변동', '조정', '전환', '이동', '교체', '변경', '수정', '검토중'
  ]
};

// 투자 관점 키워드
const investmentPerspectives = {
  growth: ['성장주', '성장성', '미래가치', '혁신', '신기술', '시장확대'],
  value: ['가치주', '저평가', 'PER', 'PBR', '배당', '안정성'],
  momentum: ['모멘텀', '추세', '단기', '스윙', '변동성', '거래량'],
  defensive: ['방어주', '안전자산', '헤지', '리스크관리', '보수적'],
  cyclical: ['경기민감주', '경기순환', '원자재', '산업재', '경기회복'],
  tech: ['기술주', 'AI', '반도체', '소프트웨어', '플랫폼', '클라우드']
};

// 데이터베이스 연결
const db = new sqlite3.Database(path.join(__dirname, '..', 'database.db'));

// 감정 분석 함수
function analyzeDetailedSentiment(content, ticker) {
  const tickerNames = tickerToNameMap[ticker] || [ticker];
  const lowerContent = content.toLowerCase();
  
  // 종목 언급 확인
  const isMentioned = tickerNames.some(name => 
    lowerContent.includes(name.toLowerCase())
  );
  
  if (!isMentioned) return null;
  
  // 감정 점수 계산
  let positiveScore = 0;
  let negativeScore = 0;
  let neutralScore = 0;
  
  const foundKeywords = {
    positive: [],
    negative: [],
    neutral: []
  };
  
  // 긍정 키워드 검색
  sentimentKeywords.positive.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      positiveScore += 1;
      foundKeywords.positive.push(keyword);
    }
  });
  
  // 부정 키워드 검색
  sentimentKeywords.negative.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      negativeScore += 1;
      foundKeywords.negative.push(keyword);
    }
  });
  
  // 중립 키워드 검색
  sentimentKeywords.neutral.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      neutralScore += 0.5;
      foundKeywords.neutral.push(keyword);
    }
  });
  
  // 감정 결정
  let sentiment = 'neutral';
  let sentimentScore = 0;
  
  const totalScore = positiveScore + negativeScore + neutralScore;
  if (totalScore > 0) {
    if (positiveScore > negativeScore * 1.5) {
      sentiment = 'positive';
      sentimentScore = Math.min(positiveScore / totalScore, 0.95);
    } else if (negativeScore > positiveScore * 1.5) {
      sentiment = 'negative';
      sentimentScore = -Math.min(negativeScore / totalScore, 0.95);
    } else {
      sentiment = 'neutral';
      sentimentScore = 0;
    }
  }
  
  // 신뢰도 계산
  const confidence = Math.min(totalScore / 10, 0.95);
  
  // 컨텍스트 추출
  const contextSnippet = extractContext(content, ticker);
  
  // 투자 관점 분석
  const perspectives = analyzeInvestmentPerspective(content);
  
  // 상세 근거 데이터 생성
  const detailedData = {
    sentiment,
    sentimentScore,
    confidence,
    keywords: foundKeywords,
    contextSnippet,
    key_reasoning: generateKeyReasoning(sentiment, foundKeywords, ticker),
    supporting_evidence: {
      positive_factors: foundKeywords.positive.slice(0, 5),
      negative_factors: foundKeywords.negative.slice(0, 5),
      neutral_factors: foundKeywords.neutral.slice(0, 3)
    },
    investment_perspective: perspectives,
    investment_timeframe: determineTimeframe(content),
    conviction_level: determineConvictionLevel(confidence),
    uncertainty_factors: identifyUncertainties(content),
    mention_context: extractMentionContext(content, ticker)
  };
  
  return detailedData;
}

// 핵심 근거 생성
function generateKeyReasoning(sentiment, keywords, ticker) {
  const tickerName = tickerToNameMap[ticker]?.[0] || ticker;
  
  if (sentiment === 'positive') {
    const factors = keywords.positive.slice(0, 3).join(', ');
    return `${tickerName}에 대한 ${factors} 등의 긍정적 요인이 확인되어 투자 매력도가 상승하고 있습니다.`;
  } else if (sentiment === 'negative') {
    const factors = keywords.negative.slice(0, 3).join(', ');
    return `${tickerName}의 ${factors} 등의 부정적 요인으로 인해 단기적 조정이 예상됩니다.`;
  } else {
    return `${tickerName}에 대한 시장의 평가가 엇갈리고 있어 추가적인 모니터링이 필요합니다.`;
  }
}

// 투자 관점 분석
function analyzeInvestmentPerspective(content) {
  const perspectives = [];
  const lowerContent = content.toLowerCase();
  
  Object.entries(investmentPerspectives).forEach(([type, keywords]) => {
    keywords.forEach(keyword => {
      if (lowerContent.includes(keyword.toLowerCase())) {
        perspectives.push(type);
      }
    });
  });
  
  return [...new Set(perspectives)].slice(0, 3);
}

// 투자 기간 결정
function determineTimeframe(content) {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('장기') || lowerContent.includes('연간') || lowerContent.includes('5년')) {
    return '장기';
  } else if (lowerContent.includes('단기') || lowerContent.includes('일간') || lowerContent.includes('주간')) {
    return '단기';
  }
  return '중기';
}

// 확신 수준 결정
function determineConvictionLevel(confidence) {
  if (confidence > 0.8) return '높음';
  if (confidence > 0.5) return '보통';
  return '낮음';
}

// 불확실성 요인 식별
function identifyUncertainties(content) {
  const uncertainties = [];
  const lowerContent = content.toLowerCase();
  
  const uncertaintyKeywords = [
    '불확실', '리스크', '변동성', '우려', '가능성', '예상', '전망',
    '규제', '정책', '금리', '환율', '경쟁', '시장상황'
  ];
  
  uncertaintyKeywords.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      uncertainties.push(keyword);
    }
  });
  
  return uncertainties.slice(0, 3);
}

// 언급 컨텍스트 추출
function extractMentionContext(content, ticker) {
  const tickerNames = tickerToNameMap[ticker] || [ticker];
  
  for (const name of tickerNames) {
    const index = content.toLowerCase().indexOf(name.toLowerCase());
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + 100);
      const context = content.substring(start, end);
      
      // 문장 단위로 정리
      const sentences = context.split(/[.!?]/).filter(s => s.includes(name));
      if (sentences.length > 0) {
        return sentences[0].trim();
      }
    }
  }
  
  return '직접적인 언급 없음';
}

// 컨텍스트 추출
function extractContext(content, ticker) {
  const tickerNames = tickerToNameMap[ticker] || [ticker];
  
  for (const name of tickerNames) {
    const index = content.toLowerCase().indexOf(name.toLowerCase());
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + 150);
      return content.substring(start, end).trim();
    }
  }
  
  return content.substring(0, 150).trim();
}

// 메인 실행 함수
async function generateDetailedSentiments() {
  console.log('🚀 상세 감정 분석 시작...');
  
  // 메르's Pick 종목 목록 (최신 언급일 순)
  const tickers = [
    '005930', 'AAPL', 'LLY', 'BRK', 'INTC', 'UNH',
    '267250', '042660', 'TSLA', 'NVDA', 'TSM', 'GOOGL',
    'SK하이닉스', 'META', 'AMD', 'MSFT'
  ];
  
  for (const ticker of tickers) {
    console.log(`\n📊 ${ticker} 종목 분석 중...`);
    
    // 관련 포스트 조회
    const posts = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, content, excerpt, created_date 
         FROM blog_posts 
         WHERE title LIKE ? OR content LIKE ? OR excerpt LIKE ?
         ORDER BY created_date DESC
         LIMIT 15`,
        [`%${ticker}%`, `%${ticker}%`, `%${ticker}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`  - ${posts.length}개 포스트 발견`);
    
    let analyzedCount = 0;
    
    for (const post of posts) {
      const fullContent = `${post.title} ${post.content || ''} ${post.excerpt || ''}`;
      const analysis = analyzeDetailedSentiment(fullContent, ticker);
      
      if (analysis) {
        // 기존 데이터 확인
        const exists = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM post_stock_sentiments WHERE post_id = ? AND ticker = ?',
            [post.id, ticker],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        if (!exists) {
          // 새로운 감정 분석 데이터 삽입
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO post_stock_sentiments 
               (post_id, ticker, sentiment, sentiment_score, confidence, keywords, context_snippet)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                post.id,
                ticker,
                analysis.sentiment,
                analysis.sentimentScore,
                analysis.confidence,
                JSON.stringify(analysis.keywords),
                analysis.contextSnippet
              ],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          // 확장 테이블에 상세 데이터 저장 (필요시 생성)
          await new Promise((resolve, reject) => {
            db.run(
              `CREATE TABLE IF NOT EXISTS sentiment_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER,
                ticker TEXT,
                key_reasoning TEXT,
                supporting_evidence TEXT,
                investment_perspective TEXT,
                investment_timeframe TEXT,
                conviction_level TEXT,
                uncertainty_factors TEXT,
                mention_context TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES blog_posts(id)
              )`,
              (err) => {
                if (err && !err.message.includes('already exists')) reject(err);
                else resolve();
              }
            );
          });
          
          // 상세 데이터 삽입
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO sentiment_details 
               (post_id, ticker, key_reasoning, supporting_evidence, investment_perspective, 
                investment_timeframe, conviction_level, uncertainty_factors, mention_context)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                post.id,
                ticker,
                analysis.key_reasoning,
                JSON.stringify(analysis.supporting_evidence),
                JSON.stringify(analysis.investment_perspective),
                analysis.investment_timeframe,
                analysis.conviction_level,
                JSON.stringify(analysis.uncertainty_factors),
                analysis.mention_context
              ],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          analyzedCount++;
          console.log(`    ✅ Post ${post.id}: ${analysis.sentiment} (신뢰도: ${(analysis.confidence * 100).toFixed(0)}%)`);
        }
      }
    }
    
    console.log(`  - ${analyzedCount}개 새로운 감정 분석 완료`);
  }
  
  // 분석 결과 요약
  const summary = await new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
              SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
              SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral
       FROM post_stock_sentiments`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  
  console.log('\n📈 전체 분석 결과:');
  console.log(`  - 총 분석: ${summary.total}개`);
  console.log(`  - 긍정: ${summary.positive}개`);
  console.log(`  - 부정: ${summary.negative}개`);
  console.log(`  - 중립: ${summary.neutral}개`);
  
  db.close();
  console.log('\n✅ 상세 감정 분석 완료!');
}

// 스크립트 실행
generateDetailedSentiments().catch(console.error);