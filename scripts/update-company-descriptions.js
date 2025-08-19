const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

// 35자 이하의 성의 있는 회사 설명 (메르가 언급한 주요 종목들)
const companyDescriptions = {
  // 🇰🇷 한국 종목
  '005930': '세계 1위 메모리 반도체와 갤럭시 스마트폰 제조사', // 삼성전자
  '042660': '해양플랜트와 친환경 선박 건조의 글로벌 리더', // 한화오션
  '267250': '현대중공업그룹 건설장비와 로보틱스 전문기업', // HD현대
  '010620': '친환경 선박과 LPG선 건조 전문 조선회사', // 현대미포조선
  '373220': '테슬라·GM 납품하는 세계 2위 배터리 제조사', // LG에너지솔루션
  '000660': '세계 2위 메모리 반도체와 AI용 HBM 선도기업', // SK하이닉스
  '012450': '항공기 엔진과 우주발사체 제조 항공우주기업', // 한화에어로스페이스
  '066570': 'OLED TV와 스마트가전으로 유명한 글로벌 기업', // LG전자
  '272210': '반도체 특수가스와 건설소재 제조 화학기업', // KCC
  
  // 🇺🇸 미국 주요 기술주
  'TSLA': '일론 머스크의 전기차와 자율주행 기술 선도기업', // 테슬라
  'INTC': 'x86 CPU와 AI 칩 개발하는 반도체 선구자', // 인텔
  'AAPL': '아이폰과 iOS 생태계 구축한 세계 최대 기술기업', // 애플
  'NVDA': 'ChatGPT 학습용 AI 칩 제조하는 GPU 절대강자', // 엔비디아
  'GOOGL': '구글 검색과 유튜브 운영하는 인터넷 공룡', // 구글
  'AMZN': '전세계 최대 이커머스와 AWS 클라우드 기업', // 아마zon
  
  // 🏥 헬스케어 & 제약
  'LLY': '당뇨병 인슐린과 비만치료제 개발 제약 선도기업', // 일라이 릴리
  'UNH': '미국 최대 건강보험과 의료서비스 통합 기업', // 유나이티드헬스
  
  // 🏦 금융
  'JPM': '미국 최대 투자은행이자 월스트리트 금융 공룡', // JP모건
  'BAC': '메릴린치 자산관리 보유한 미국 2위 상업은행', // 뱅크오브아메리카
  
  // 🏠 소매 & 생활
  'HD': '북미 최대 홈인프라 소매업체, DIY 문화 선도', // 홈데포
};

console.log('🔄 회사 설명 업데이트 시작...');

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
    console.log('\n🎯 업데이트된 종목 확인:');
    db.all(
      'SELECT ticker, company_name, description FROM stocks WHERE ticker IN (' + 
      Object.keys(companyDescriptions).map(() => '?').join(',') + ')',
      Object.keys(companyDescriptions),
      (err, rows) => {
        if (err) {
          console.error('❌ 확인 쿼리 실패:', err);
        } else {
          rows.forEach(row => {
            console.log(`${row.ticker} (${row.company_name}): "${row.description}" (${row.description?.length || 0}자)`);
          });
          
          const longDescriptions = rows.filter(row => row.description && row.description.length > 35);
          if (longDescriptions.length > 0) {
            console.log('\n⚠️ 35자 초과 종목:');
            longDescriptions.forEach(row => {
              console.log(`${row.ticker}: ${row.description.length}자`);
            });
          } else {
            console.log('\n✅ 모든 종목이 35자 이하로 업데이트되었습니다!');
          }
        }
        
        db.close((err) => {
          if (err) {
            console.error('❌ DB 연결 종료 실패:', err);
          } else {
            console.log('✅ 데이터베이스 연결 종료');
          }
        });
      }
    );
  })
  .catch((error) => {
    console.error('❌ 업데이트 실패:', error);
    db.close();
  });