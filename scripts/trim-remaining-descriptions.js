const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// 100자 초과하는 나머지 종목들을 100자 이내로 수정
const remainingDescriptions = {
  'MSFT': '윈도우 OS와 오피스 365, Azure 클라우드로 글로벌 기업 IT 인프라 지배. OpenAI 파트너십으로 AI 시대 선도하는 소프트웨어 공룡', // 95자
  'META': '페이스북·인스타그램·왓츠앱 운영하는 소셜미디어 플랫폼 기업이자 VR/AR 메타버스 기술 개발에 연간 130억달러 투자하는 혁신기업', // 98자
  'NFLX': '전세계 스트리밍 서비스 선구자로 240개국 2억7천만 구독자 보유. 오징어게임·기묘한 이야기 등 글로벌 오리지널 콘텐츠 제작 선도', // 99자
  'V': '전세계 결제시스템 절대강자로 200개국 40억장 카드로 연간 190조달러 결제 처리. 디지털 결제와 핀테크 생태계의 핵심 인프라', // 96자
};

console.log('🔄 100자 초과 종목들 추가 수정 시작...');
console.log(`📊 총 ${Object.keys(remainingDescriptions).length}개 종목 수정 예정\n`);

// 각 회사 설명을 업데이트
const updatePromises = Object.entries(remainingDescriptions).map(([ticker, description]) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE stocks SET description = ? WHERE ticker = ?',
      [description, ticker],
      function(err) {
        if (err) {
          console.error(`❌ ${ticker} 업데이트 실패:`, err);
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`✅ ${ticker}: "${description.substring(0, 40)}..." (${description.length}자)`);
          } else {
            console.log(`⚠️ ${ticker}: 해당 종목을 찾을 수 없습니다`);
          }
          resolve();
        }
      }
    );
  });
});

// 모든 업데이트 완료 후 최종 확인
Promise.all(updatePromises)
  .then(() => {
    console.log('\n🎯 최종 확인: 100자 초과 종목 검사');
    db.all(
      'SELECT ticker, company_name, description, LENGTH(description) as len FROM stocks WHERE description IS NOT NULL AND description != "" ORDER BY len DESC LIMIT 20',
      (err, rows) => {
        if (err) {
          console.error('❌ 확인 쿼리 실패:', err);
        } else {
          console.log('\n📋 상위 20개 종목 글자 수:');
          rows.forEach((row, index) => {
            const length = row.len || 0;
            const status = length > 100 ? '❌' : '✅';
            console.log(`${status} ${index + 1}. ${row.ticker}: ${length}자`);
          });
          
          const over100 = rows.filter(row => row.len > 100);
          if (over100.length > 0) {
            console.log(`\n❌ 여전히 100자 초과 종목 (${over100.length}개):`);
            over100.forEach(row => {
              console.log(`${row.ticker}: ${row.len}자 - "${row.description.substring(0, 60)}..."`);
            });
          } else {
            console.log('\n✅ 모든 종목이 100자 이내로 수정 완료!');
          }
          
          const avgLength = rows.reduce((sum, row) => sum + (row.len || 0), 0) / rows.length;
          console.log(`\n📊 평균 설명 길이: ${Math.round(avgLength)}자`);
        }
        
        db.close((err) => {
          if (err) {
            console.error('❌ DB 연결 종료 실패:', err);
          } else {
            console.log('\n✅ 데이터베이스 연결 종료');
          }
        });
      }
    );
  })
  .catch((error) => {
    console.error('❌ 업데이트 실패:', error);
    db.close();
  });