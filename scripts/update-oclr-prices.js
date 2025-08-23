async function updateOCLRPrices() {
    const sqlite3 = require('sqlite3').verbose();
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    const db = new sqlite3.Database('./database.db');
    
    try {
        console.log('📊 OCLR 주가 데이터 수집 시작...');
        
        // 최근 6개월 데이터 수집
        const period1 = Math.floor((Date.now() - 180 * 24 * 60 * 60 * 1000) / 1000);
        const period2 = Math.floor(Date.now() / 1000);
        
        // Oklo Inc는 최근 상장된 회사로 다른 티커일 수 있음
        // 여러 가능성을 시도해보자
        const possibleTickers = ['OKLO', 'OCLR', 'OKL'];
        let successfulTicker = null;
        let url = null;
        let data = null;
        
        for (const testTicker of possibleTickers) {
            try {
                url = `https://query1.finance.yahoo.com/v8/finance/chart/${testTicker}?period1=${period1}&period2=${period2}&interval=1d`;
                console.log(`🔍 ${testTicker} 티커로 시도 중...`);
                
                const testResponse = await fetch(url);
                const testData = await testResponse.json();
                
                if (testData.chart && testData.chart.result && testData.chart.result[0] && 
                    testData.chart.result[0].timestamp && testData.chart.result[0].timestamp.length > 0) {
                    console.log(`✅ ${testTicker} 티커에서 데이터 발견!`);
                    successfulTicker = testTicker;
                    data = testData;
                    break;
                } else {
                    console.log(`❌ ${testTicker} - 데이터 없음`);
                }
            } catch (err) {
                console.log(`❌ ${testTicker} - 오류: ${err.message}`);
            }
        }
        
        if (!successfulTicker || !data) {
            console.log('❌ 모든 티커에서 데이터를 찾지 못했습니다.');
            console.log('💡 수동으로 종가 데이터를 입력하거나 다른 방법을 시도해야 합니다.');
            return;
        }
        
        console.log(`🎯 최종 선택된 티커: ${successfulTicker}`);
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const quotes = result.indicators.quote[0];
            
            console.log(`✅ OCLR 원시 데이터 수집 완료: ${timestamps.length}개 데이터 포인트`);
            
            let insertCount = 0;
            // 데이터베이스에 저장
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] != null) {
                    const tradeDate = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
                    const closePrice = parseFloat(quotes.close[i]);
                    const openPrice = parseFloat(quotes.open[i] || quotes.close[i]);
                    const highPrice = parseFloat(quotes.high[i] || quotes.close[i]);
                    const lowPrice = parseFloat(quotes.low[i] || quotes.close[i]);
                    const volume = parseInt(quotes.volume[i] || 0);
                    
                    await new Promise((resolve, reject) => {
                        db.run(`
                            INSERT OR REPLACE INTO stock_prices (
                                ticker, date, open_price, high_price, 
                                low_price, close_price, volume, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        `, [successfulTicker, tradeDate, openPrice, highPrice, lowPrice, closePrice, volume], 
                        function(err) {
                            if (err) reject(err);
                            else {
                                insertCount++;
                                resolve(this);
                            }
                        });
                    });
                }
            }
            
            // stocks 테이블 업데이트 (기존 컬럼에 맞게 수정)
            const latestPrice = parseFloat(quotes.close[quotes.close.length-1]);
            await new Promise((resolve, reject) => {
                db.run(`
                    INSERT OR REPLACE INTO stocks (
                        ticker, company_name, market, is_merry_mentioned, 
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?)
                `, [successfulTicker, 'Oklo Inc', 'NYSE', 1, Date.now()], 
                function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });
            
            console.log(`💾 ${successfulTicker} 데이터 저장 완료: ${insertCount}개 레코드`);
            console.log(`📈 최신가: $${latestPrice.toFixed(2)}`);
            console.log(`📅 기간: ${new Date(timestamps[0]*1000).toISOString().split('T')[0]} ~ ${new Date(timestamps[timestamps.length-1]*1000).toISOString().split('T')[0]}`);
            
            // 감정 분석 데이터도 올바른 티커로 업데이트
            if (successfulTicker !== 'OCLR') {
                console.log(`🔄 감정 분석 데이터 티커 업데이트: OCLR → ${successfulTicker}`);
                await new Promise((resolve, reject) => {
                    db.run(`UPDATE post_stock_analysis SET ticker = ? WHERE ticker = ?`, 
                        [successfulTicker, 'OCLR'], 
                        function(err) {
                            if (err) reject(err);
                            else {
                                console.log(`✅ 감정 분석 데이터 티커 업데이트 완료: ${this.changes}개 레코드`);
                                resolve(this);
                            }
                        });
                });
            }
            
        } else {
            console.log(`❌ ${successfulTicker} 데이터 수집 실패 - API 응답 구조 확인 필요`);
        }
    } catch (error) {
        console.error('💥 OCLR 데이터 처리 오류:', error.message);
        console.error('상세 오류:', error);
    } finally {
        db.close();
        console.log('🔚 데이터베이스 연결 종료');
    }
}

updateOCLRPrices();