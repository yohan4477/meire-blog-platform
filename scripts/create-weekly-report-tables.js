// 메르's 주간보고 테이블 생성
const Database = require('better-sqlite3');
const path = require('path');

function createWeeklyReportTables() {
  const dbPath = path.join(__dirname, '../database.db');
  const db = new Database(dbPath);
  
  console.log('🔧 메르\'s 주간보고 테이블 생성 중...');
  
  try {
    // 1. 주간 보고서 메인 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS merry_weekly_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start_date DATE NOT NULL UNIQUE,
        week_end_date DATE NOT NULL,
        week_number INTEGER NOT NULL,
        year INTEGER NOT NULL,
        
        -- 보고서 메타데이터
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        key_insights TEXT NOT NULL,
        market_outlook TEXT,
        
        -- 통계 정보
        total_posts INTEGER DEFAULT 0,
        mentioned_stocks_count INTEGER DEFAULT 0,
        top_sector TEXT,
        sentiment_score DECIMAL(3,2), -- -1.0 ~ 1.0
        
        -- 생성 정보
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_published BOOLEAN DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        
        INDEX idx_week_date (week_start_date),
        INDEX idx_year_week (year, week_number),
        INDEX idx_published (is_published)
      )
    `);

    // 2. 주간보고서별 포스트 연결 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS weekly_report_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weekly_report_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        post_title TEXT NOT NULL,
        post_date DATETIME NOT NULL,
        importance_score INTEGER DEFAULT 1, -- 1-5 중요도
        category TEXT,
        summary TEXT,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (weekly_report_id) REFERENCES merry_weekly_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
        UNIQUE(weekly_report_id, post_id),
        INDEX idx_weekly_report_id (weekly_report_id),
        INDEX idx_importance (importance_score)
      )
    `);

    // 3. 주간 언급 종목 순위 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS weekly_stock_mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weekly_report_id INTEGER NOT NULL,
        ticker TEXT NOT NULL,
        company_name_kr TEXT,
        
        mention_count INTEGER DEFAULT 0,
        sentiment_score DECIMAL(3,2), -- -1.0 ~ 1.0
        price_change_percent DECIMAL(5,2),
        ranking INTEGER NOT NULL,
        
        -- 주요 언급 내용
        key_mentions TEXT,
        recommendation TEXT, -- buy, sell, hold, watch
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (weekly_report_id) REFERENCES merry_weekly_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (ticker) REFERENCES stocks(ticker),
        UNIQUE(weekly_report_id, ticker),
        INDEX idx_weekly_report_id (weekly_report_id),
        INDEX idx_ranking (ranking)
      )
    `);

    // 4. 주간 키워드/테마 분석 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS weekly_themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weekly_report_id INTEGER NOT NULL,
        theme_name TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        related_stocks TEXT, -- JSON array of tickers
        description TEXT,
        trend_direction TEXT, -- up, down, stable
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (weekly_report_id) REFERENCES merry_weekly_reports(id) ON DELETE CASCADE,
        INDEX idx_weekly_report_id (weekly_report_id),
        INDEX idx_frequency (frequency)
      )
    `);

    console.log('✅ 메르\'s 주간보고 테이블 생성 완료!');
    
    // 샘플 데이터 삽입
    insertSampleWeeklyReport(db);
    
    // 생성된 테이블 확인
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%weekly%' OR name LIKE '%merry_weekly%' ORDER BY name").all();
    console.log('📊 생성된 주간보고 테이블:', tables.map(t => t.name).join(', '));
    
  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
  } finally {
    db.close();
  }
}

function insertSampleWeeklyReport(db) {
  try {
    // 이번 주 시작/끝 날짜 계산
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 일요일
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // 토요일
    
    const weekNumber = Math.ceil(today.getDate() / 7);
    const year = today.getFullYear();
    
    // 샘플 주간보고서 삽입
    const insertReport = db.prepare(`
      INSERT OR IGNORE INTO merry_weekly_reports 
      (week_start_date, week_end_date, week_number, year, title, summary, key_insights, 
       market_outlook, total_posts, mentioned_stocks_count, top_sector, sentiment_score) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertReport.run(
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0],
      weekNumber,
      year,
      `메르's 주간보고 ${year}년 ${weekNumber}주차`,
      '이번 주는 반도체 섹터의 강세가 두드러진 한 주였습니다. 특히 메모리 반도체와 AI 칩 관련주들이 큰 관심을 받았습니다.',
      '1) 반도체 업사이클 신호 감지\n2) 전기차 시장의 조정 국면\n3) 바이오 섹터 선별적 투자 기회',
      '단기적으로는 반도체 섹터의 강세가 지속될 것으로 예상되나, 변동성에 대비한 리스크 관리가 필요합니다.',
      12, 8, '반도체', 0.65
    );
    
    const reportId = db.prepare("SELECT id FROM merry_weekly_reports ORDER BY id DESC LIMIT 1").get()?.id;
    
    if (reportId) {
      // 샘플 종목 언급 데이터
      const insertStock = db.prepare(`
        INSERT OR IGNORE INTO weekly_stock_mentions 
        (weekly_report_id, ticker, company_name_kr, mention_count, sentiment_score, 
         price_change_percent, ranking, key_mentions, recommendation) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const sampleStocks = [
        [reportId, '005930', '삼성전자', 8, 0.7, 3.2, 1, 'HBM 수요 증가로 실적 개선 기대', 'buy'],
        [reportId, 'TSLA', '테슬라', 5, -0.2, -2.1, 2, '중국 시장 경쟁 심화로 주의 필요', 'hold'],
        [reportId, '042660', '한화오션', 4, 0.5, 1.8, 3, '친환경 선박 수주 증가', 'watch']
      ];
      
      sampleStocks.forEach(stock => insertStock.run(...stock));
      
      // 샘플 테마 데이터
      const insertTheme = db.prepare(`
        INSERT OR IGNORE INTO weekly_themes 
        (weekly_report_id, theme_name, frequency, related_stocks, description, trend_direction) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const sampleThemes = [
        [reportId, 'AI 반도체', 6, '["005930", "000660"]', 'AI 붐으로 인한 반도체 수요 급증', 'up'],
        [reportId, '전기차', 3, '["TSLA"]', '중국 시장 경쟁과 보조금 축소 이슈', 'down'],
        [reportId, '친환경 에너지', 2, '["042660"]', '탄소 중립 정책으로 친환경 기술 주목', 'up']
      ];
      
      sampleThemes.forEach(theme => insertTheme.run(...theme));
      
      console.log('✅ 샘플 주간보고 데이터 생성 완료');
    }
    
  } catch (error) {
    console.error('❌ 샘플 데이터 생성 실패:', error);
  }
}

// 실행
if (require.main === module) {
  createWeeklyReportTables();
}

module.exports = createWeeklyReportTables;