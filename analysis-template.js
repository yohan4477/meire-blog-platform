/**
 * 메르 포스트 분석 자동화 템플릿
 * 사용법: 새 포스트 크롤링 후 이 템플릿을 복사해서 실제 데이터로 수정 후 실행
 */

const Database = require('better-sqlite3');
const db = new Database('database.db');

try {
  console.log('🚀 메르 포스트 완전 분석 시작...');

  // ========================================
  // 1단계: 포스트 정보 (실제 데이터로 수정 필요)
  // ========================================
  const POST_LOG_NO = 'XXXXXXXXXXXXXX'; // 실제 로그 번호로 수정
  const POST_TITLE = '포스트 제목'; // 실제 제목으로 수정
  const TODAY = '2025-08-28'; // 실제 날짜로 수정

  // ========================================
  // 2단계: 언급된 종목 정보 (실제 데이터로 수정 필요)
  // ========================================
  const MENTIONED_STOCKS = [
    {
      ticker: '329180',
      company_name: 'HD현대중공업',
      market: 'KOSPI',
      description: '한국 1위 조선사, 군함 건조 및 미해군 MRO 라이센스 보유',
      sector: '조선',
      industry: '조선업'
    },
    // 추가 종목들...
  ];

  // ========================================
  // 3단계: 감정 분석 데이터 (Claude 직접 분석 결과로 수정 필요)
  // ========================================
  const SENTIMENT_ANALYSIS = [
    {
      ticker: '329180',
      sentiment: 'positive',
      sentiment_score: 0.7,
      confidence: 0.8,
      reasoning: 'HD현대중공업과 HD현대미포 합병으로 미해군 MRO 사업 시너지 기대. 드라이도크 활용도 증가 및 방산 사업 확대 가능성'
    },
    // 추가 분석들...
  ];

  // ========================================
  // 4단계: 메르님 한줄 코멘트 (실제 코멘트로 수정 필요)
  // ========================================
  const MERRY_COMMENT = `실제 메르님 한줄 코멘트를 여기에 입력하세요. 
포스트 맨 끝에 있는 "한 줄 코멘트:" 부분을 정확히 복사해주세요.`;

  // ========================================
  // 5단계: 투자 인사이트 (Claude 분석 결과로 수정 필요)
  // ========================================
  const INVESTMENT_INSIGHT = `🚢 주요 투자 테마: 실제 분석한 투자 테마
⚙️ 경쟁 구도: 실제 분석한 경쟁 상황  
📊 기회 포인트: 실제 분석한 기회 요소
🚨 리스크 요소: 실제 분석한 위험 요소`;

  // ========================================
  // 자동 실행 부분 (수정 불필요)
  // ========================================

  // 종목 정보 업데이트
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM stocks WHERE ticker = ?');
  const insertStmt = db.prepare(`
    INSERT INTO stocks (ticker, company_name, market, is_merry_mentioned, mention_count, 
                       first_mentioned_date, last_mentioned_date, description, sector, industry)
    VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE stocks 
    SET company_name = ?, 
        is_merry_mentioned = 1,
        last_mentioned_date = ?,
        description = ?,
        sector = ?,
        industry = ?
    WHERE ticker = ?
  `);

  MENTIONED_STOCKS.forEach(stock => {
    const existing = checkStmt.get(stock.ticker);
    if (existing.count === 0) {
      insertStmt.run(
        stock.ticker, stock.company_name, stock.market, 
        TODAY, TODAY, stock.description, stock.sector, stock.industry
      );
      console.log(`✅ ${stock.company_name}(${stock.ticker}) 추가`);
    } else {
      updateStmt.run(
        stock.company_name, TODAY, stock.description, 
        stock.sector, stock.industry, stock.ticker
      );
      console.log(`✅ ${stock.company_name}(${stock.ticker}) 업데이트`);
    }
  });

  // mention_count 업데이트
  const updateMentionStmt = db.prepare(`
    UPDATE stocks 
    SET mention_count = (
      SELECT COUNT(DISTINCT bp.id) 
      FROM blog_posts bp 
      WHERE bp.content LIKE '%' || stocks.ticker || '%' 
         OR bp.content LIKE '%' || stocks.company_name || '%'
    ),
    first_mentioned_date = COALESCE(first_mentioned_date, ?),
    last_mentioned_date = ?
    WHERE ticker = ?
  `);

  MENTIONED_STOCKS.forEach(stock => {
    updateMentionStmt.run(TODAY, TODAY, stock.ticker);
  });

  // 감정 분석 저장
  const sentimentStmt = db.prepare(`
    INSERT OR REPLACE INTO post_stock_analysis (
      log_no, ticker, sentiment, sentiment_score, confidence, reasoning
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  SENTIMENT_ANALYSIS.forEach(analysis => {
    sentimentStmt.run(
      POST_LOG_NO, analysis.ticker, analysis.sentiment,
      analysis.sentiment_score, analysis.confidence, analysis.reasoning
    );
  });

  // 메르님 한줄 코멘트 저장 (excerpt 업데이트)
  const updateExcerptStmt = db.prepare('UPDATE blog_posts SET excerpt = ? WHERE log_no = ?');
  updateExcerptStmt.run(MERRY_COMMENT, POST_LOG_NO);

  // blog_posts 메타데이터 업데이트
  const updateMetaStmt = db.prepare(`
    UPDATE blog_posts 
    SET mentioned_stocks = ?, investment_theme = ?, sentiment_tone = ? 
    WHERE log_no = ?
  `);
  const stockNames = MENTIONED_STOCKS.map(s => s.company_name).join(',');
  updateMetaStmt.run(stockNames, '주요 투자 테마', 'cautiously_positive', POST_LOG_NO);

  // post_analysis 테이블 생성 (없으면)
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_no TEXT NOT NULL,
      summary TEXT NOT NULL,
      investment_insight TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(log_no)
    )
  `);

  // post_analysis에 최종 분석 결과 저장
  const insertAnalysisStmt = db.prepare(`
    INSERT OR REPLACE INTO post_analysis (log_no, summary, investment_insight) 
    VALUES (?, ?, ?)
  `);
  insertAnalysisStmt.run(POST_LOG_NO, MERRY_COMMENT, INVESTMENT_INSIGHT);

  console.log('\\n✅ 모든 분석 완료!');
  console.log('📊 종목 분석:', MENTIONED_STOCKS.length, '개 완료');
  console.log('💭 감정 분석:', SENTIMENT_ANALYSIS.length, '개 완료');
  console.log('🔥 메르님 한줄 코멘트: 저장 완료');
  console.log('💡 투자 인사이트: 저장 완료');
  
  console.log('\\n🎯 검증 명령어:');
  console.log('- 메르\\'s Pick: curl -s "http://localhost:3004/api/merry/picks?limit=10"');
  console.log('- 오늘의 메르님 말씀: curl -s "http://localhost:3004/api/today-merry-quote"');
  console.log('- 웹사이트 확인: start http://localhost:3004');

} catch (error) {
  console.error('❌ 오류:', error.message);
} finally {
  db.close();
}