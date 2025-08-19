const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// 35자 이하의 성의 있는 회사 설명 (시장 동향 형식 종목들)
const companyDescriptions = {
  // 🇰🇷 한국 주요 종목 (시장동향 → 실제 회사 설명)
  '000270': '현대차그룹 자동차 브랜드, K8·스포티지 등 제조', // 기아
  '003550': '생활건강·전자·화학 등 다양한 사업 영위하는 그룹', // LG
  '005380': '제네시스·아이오닉 등 제조하는 국내 1위 완성차기업', // 현대차
  '006400': '전기차 배터리와 반도체 소재 제조하는 삼성그룹 계열사', // 삼성SDI
  '012330': '현대차그룹 핵심 자동차 부품 제조 전문기업', // 현대모비스
  '028260': '삼성그룹 건설·무역·리조트 사업 총괄 지주회사', // 삼성물산
  '028300': '혁신 바이오의약품 개발하는 국내 대표 제약기업', // HLB
  '035420': '국내 1위 검색포털과 웹툰·클라우드 서비스 제공', // 네이버
  '035720': '카카오톡과 카카오페이 운영하는 국내 IT 대기업', // 카카오
  '051910': '석유화학과 2차전지 소재 제조하는 화학 선도기업', // LG화학
  '068270': '항체의약품 개발·제조하는 국내 대표 바이오기업', // 셀트리온
  '207940': '삼성그룹 바이오의약품 위탁개발생산 전문기업', // 삼성바이오로직스
  
  // 🇺🇸 미국 주요 종목 (시장동향 → 실제 회사 설명)
  'AMD': '인텔 라이벌 CPU와 AI용 GPU 제조하는 반도체기업', // AMD
  'ASML': '반도체 제조 필수 극자외선 노광장비 독점 제조사', // ASML
  'BABA': '중국 최대 이커머스와 클라우드 서비스 알리바바그룹', // 알리바바
  'IBM': '하이브리드 클라우드와 AI 왓슨 서비스 제공 IT기업', // IBM
  'KO': '130년 역사 코카콜라 음료 제조하는 글로벌 음료기업', // 코카콜라
  'PFE': 'COVID-19 백신과 혁신 의약품 개발 글로벌 제약사', // 화이자
  'PYPL': '온라인 결제와 디지털 지갑 서비스 제공 핀테크기업', // 페이팔
  'SAP': '기업용 ERP 소프트웨어 세계 1위 독일 IT기업', // SAP
  'TM': '프리우스 하이브리드카로 유명한 일본 1위 자동차기업', // 도요타
  'TSM': '애플 아이폰칩 제조하는 세계 1위 파운드리 기업', // TSMC
  'WMT': '미국 최대 할인매장 체인 운영하는 소매유통 공룡', // 월마트
  
  // 추가로 찾은 종목들 (MU는 이미 좋은 설명이 있으므로 제외)
};

console.log('🔄 시장동향 형식 설명을 실제 회사 설명으로 업데이트 시작...');
console.log(`📊 총 ${Object.keys(companyDescriptions).length}개 종목 업데이트 예정\n`);

// 각 회사 설명을 업데이트
const updatePromises = Object.entries(companyDescriptions).map(([ticker, description]) => {
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
            console.log(`✅ ${ticker}: "${description}" (${description.length}자)`);
          } else {
            console.log(`⚠️ ${ticker}: 해당 종목을 찾을 수 없습니다`);
          }
          resolve();
        }
      }
    );
  });
});

// 모든 업데이트 완료 후 확인
Promise.all(updatePromises)
  .then(() => {
    console.log('\n🎯 업데이트 완료! 남은 시장동향 형식 확인:');
    db.all(
      "SELECT ticker, company_name, description FROM stocks WHERE description LIKE '%시장%' OR description LIKE '%동향%' OR description LIKE '%분석%' ORDER BY ticker",
      (err, rows) => {
        if (err) {
          console.error('❌ 확인 쿼리 실패:', err);
        } else {
          if (rows.length > 0) {
            console.log(`⚠️ 아직 ${rows.length}개 종목이 시장동향 형식으로 남아있습니다:`);
            rows.forEach(row => {
              console.log(`${row.ticker} (${row.company_name}): "${row.description}"`);
            });
          } else {
            console.log('✅ 모든 시장동향 형식이 실제 회사 설명으로 변경되었습니다!');
          }
        }
        
        // 업데이트된 종목들 최종 확인
        console.log('\n📋 업데이트된 종목들 최종 확인:');
        db.all(
          'SELECT ticker, company_name, description FROM stocks WHERE ticker IN (' + 
          Object.keys(companyDescriptions).map(() => '?').join(',') + ')',
          Object.keys(companyDescriptions),
          (err, updatedRows) => {
            if (err) {
              console.error('❌ 최종 확인 쿼리 실패:', err);
            } else {
              updatedRows.forEach(row => {
                const length = row.description?.length || 0;
                const status = length <= 35 ? '✅' : '⚠️';
                console.log(`${status} ${row.ticker}: "${row.description}" (${length}자)`);
              });
              
              const longDescriptions = updatedRows.filter(row => row.description && row.description.length > 35);
              if (longDescriptions.length > 0) {
                console.log('\n⚠️ 35자 초과 종목:');
                longDescriptions.forEach(row => {
                  console.log(`${row.ticker}: ${row.description.length}자 - "${row.description}"`);
                });
              } else {
                console.log('\n🎉 모든 업데이트된 종목이 35자 이하입니다!');
              }
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
      }
    );
  })
  .catch((error) => {
    console.error('❌ 업데이트 실패:', error);
    db.close();
  });