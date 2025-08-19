const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

async function fetchTSMCHistoricalData() {
  try {
    console.log('🔄 TSMC 1년치 실제 데이터 가져오는 중...');
    
    // 1년치 데이터 범위 설정
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60); // 1년 전
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/TSM?period1=${startTime}&period2=${endTime}&interval=1d`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (result?.timestamp && result?.indicators?.quote?.[0]?.close) {
      const timestamps = result.timestamp;
      const closes = result.indicators.quote[0].close;
      const volumes = result.indicators.quote[0].volume || [];
      
      console.log(`✅ ${timestamps.length}개 데이터 포인트 수신`);
      
      // 데이터베이스에 저장
      const stmt = db.prepare('INSERT INTO stock_prices (ticker, date, close_price, volume) VALUES (?, ?, ?, ?)');
      
      let savedCount = 0;
      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        const close = closes[i];
        const volume = volumes[i] || 0;
        
        if (close && !isNaN(close)) {
          stmt.run(['TSM', date, close, volume], (err) => {
            if (!err) savedCount++;
          });
        }
      }
      
      stmt.finalize(() => {
        console.log(`✅ TSMC 실제 데이터 ${savedCount}개 저장 완료`);
        
        // 저장된 데이터 확인
        db.all('SELECT COUNT(*) as count, MIN(date) as first_date, MAX(date) as last_date FROM stock_prices WHERE ticker = "TSM"', (err, rows) => {
          if (!err && rows[0]) {
            const { count, first_date, last_date } = rows[0];
            console.log(`📊 저장된 TSM 데이터: ${count}개 (${first_date} ~ ${last_date})`);
            
            // 최근 5일 가격 확인
            db.all('SELECT date, close_price FROM stock_prices WHERE ticker = "TSM" ORDER BY date DESC LIMIT 5', (err, rows) => {
              if (!err) {
                console.log('\n📈 최근 5일 TSMC 종가:');
                rows.forEach(row => {
                  console.log(`${row.date}: $${row.close_price.toFixed(2)}`);
                });
              }
              db.close();
            });
          } else {
            db.close();
          }
        });
      });
    } else {
      throw new Error('Invalid data structure');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
  }
}

fetchTSMCHistoricalData();