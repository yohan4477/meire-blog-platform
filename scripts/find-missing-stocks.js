/**
 * 3개월치 포스트에서 놓친 상장된 종목들을 찾는 스크립트
 * 기존 종목 매핑에 없는 새로운 종목들을 발견하고 상장 여부 확인
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'database.db');

// 기존에 추적하고 있는 종목들
const existingTickers = [
  'TSLA', '005930', 'INTC', 'LLY', 'UNH', 'NVDA', 'AAPL', 'GOOGL', 
  'MSFT', 'AMZN', 'META', '042660', '267250', '010620', 'TSM', 'PLTR'
];

// 상장된 종목들의 패턴 매칭
const stockPatterns = [
  // 미국 주식 패턴 (NYSE, NASDAQ)
  { pattern: /\b([A-Z]{1,5})\b/g, type: 'US', market: 'NASDAQ/NYSE' },
  
  // 한국 주식 패턴 (6자리 숫자)
  { pattern: /\b(\d{6})\b/g, type: 'KR', market: 'KOSPI/KOSDAQ' },
  
  // 일본 주식 패턴 (4자리 숫자)
  { pattern: /\b(\d{4})\b/g, type: 'JP', market: 'TSE' }
];

// 알려진 상장 종목들 (확장 가능한 리스트)
const knownStocks = {
  // 미국 주식
  'HD': { name: '홈디포', company_name: '홈디포', market: 'NYSE' },
  'WMT': { name: '월마트', company_name: '월마트', market: 'NYSE' },
  'JPM': { name: 'JP모건', company_name: 'JP모건', market: 'NYSE' },
  'BAC': { name: '뱅크오브아메리카', company_name: '뱅크오브아메리카', market: 'NYSE' },
  'V': { name: '비자', company_name: '비자', market: 'NYSE' },
  'MA': { name: '마스터카드', company_name: '마스터카드', market: 'NYSE' },
  'PG': { name: '프록터앤갬블', company_name: '프록터앤갬블', market: 'NYSE' },
  'JNJ': { name: '존슨앤존슨', company_name: '존슨앤존슨', market: 'NYSE' },
  'KO': { name: '코카콜라', company_name: '코카콜라', market: 'NYSE' },
  'PEP': { name: '펩시코', company_name: '펩시코', market: 'NASDAQ' },
  'DIS': { name: '디즈니', company_name: '월트디즈니', market: 'NYSE' },
  'NFLX': { name: '넷플릭스', company_name: '넷플릭스', market: 'NASDAQ' },
  'CRM': { name: '세일즈포스', company_name: '세일즈포스', market: 'NYSE' },
  'ORCL': { name: '오라클', company_name: '오라클', market: 'NYSE' },
  'AMD': { name: 'AMD', company_name: 'AMD', market: 'NASDAQ' },
  'MU': { name: '마이크론', company_name: '마이크론', market: 'NASDAQ' },
  'QCOM': { name: '퀄컴', company_name: '퀄컴', market: 'NASDAQ' },
  'AVGO': { name: '브로드컴', company_name: '브로드컴', market: 'NASDAQ' },
  
  // 한국 주식
  '000270': { name: '기아', company_name: '기아', market: 'KOSPI' },
  '012330': { name: '현대모비스', company_name: '현대모비스', market: 'KOSPI' },
  '066570': { name: 'LG전자', company_name: 'LG전자', market: 'KOSPI' },
  '051910': { name: 'LG화학', company_name: 'LG화학', market: 'KOSPI' },
  '096770': { name: 'SK이노베이션', company_name: 'SK이노베이션', market: 'KOSPI' },
  '207940': { name: '삼성바이오로직스', company_name: '삼성바이오로직스', market: 'KOSPI' },
  '068270': { name: '셀트리온', company_name: '셀트리온', market: 'KOSPI' },
  '323410': { name: '카카오뱅크', company_name: '카카오뱅크', market: 'KOSPI' },
  '035420': { name: 'NAVER', company_name: 'NAVER', market: 'KOSPI' },
  '035720': { name: '카카오', company_name: '카카오', market: 'KOSPI' },
  '028260': { name: '삼성물산', company_name: '삼성물산', market: 'KOSPI' },
  '000660': { name: 'SK하이닉스', company_name: 'SK하이닉스', market: 'KOSPI' },
  
  // 방위산업
  '047810': { name: '한국항공우주', company_name: '한국항공우주', market: 'KOSPI' },
  '272210': { name: '한화시스템', company_name: '한화시스템', market: 'KOSPI' },
  '012450': { name: '한화에어로스페이스', company_name: '한화에어로스페이스', market: 'KOSPI' },
  
  // 조선업 추가
  '009540': { name: 'HD한국조선해양', company_name: 'HD한국조선해양', market: 'KOSPI' },
  
  // 일본 주식 (예시)
  '7203': { name: '토요타', company_name: '토요타자동차', market: 'TSE' },
  '6758': { name: '소니', company_name: '소니그룹', market: 'TSE' },
  '9984': { name: '소프트뱅크', company_name: '소프트뱅크그룹', market: 'TSE' }
};

// 회사명 키워드 매핑 (더 정확한 매칭을 위해)
const companyKeywords = {
  // 미국 기업
  '홈디포': 'HD',
  '월마트': 'WMT',
  'JP모건': 'JPM',
  '뱅크오브아메리카': 'BAC',
  '비자': 'V',
  '마스터카드': 'MA',
  '프록터앤갬블': 'PG',
  '존슨앤존슨': 'JNJ',
  '코카콜라': 'KO',
  '펩시코': 'PEP',
  '디즈니': 'DIS',
  '넷플릭스': 'NFLX',
  '세일즈포스': 'CRM',
  '오라클': 'ORCL',
  'AMD': 'AMD',
  '마이크론': 'MU',
  '퀄컴': 'QCOM',
  '브로드컴': 'AVGO',
  
  // 한국 기업
  '기아': '000270',
  '현대모비스': '012330',
  'LG전자': '066570',
  'LG화학': '051910',
  'SK이노베이션': '096770',
  '삼성바이오로직스': '207940',
  '셀트리온': '068270',
  '카카오뱅크': '323410',
  'NAVER': '035420',
  '네이버': '035420',
  '카카오': '035720',
  '삼성물산': '028260',
  'SK하이닉스': '000660',
  
  // 방위산업
  '한국항공우주': '047810',
  '한화시스템': '272210',
  '한화에어로스페이스': '012450',
  
  // 조선업
  'HD한국조선해양': '009540',
  
  // 일본 기업
  '토요타': '7203',
  '소니': '6758',
  '소프트뱅크': '9984'
};

class MissingStockFinder {
  constructor() {
    this.db = null;
    this.foundStocks = new Set();
    this.newStocks = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('💥 데이터베이스 연결 실패:', err);
          reject(err);
        } else {
          console.log('✅ 데이터베이스 연결 성공');
          resolve();
        }
      });
    });
  }

  async getThreeMonthsPosts() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT id, title, content, created_date 
        FROM blog_posts 
        WHERE created_date >= date('now', '-3 months')
        ORDER BY created_date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  findStockMentions(post) {
    const text = (post.title + ' ' + post.content);
    const mentions = [];

    // 1. 회사명 키워드로 검색
    for (const [keyword, ticker] of Object.entries(companyKeywords)) {
      if (text.includes(keyword) && !existingTickers.includes(ticker)) {
        const stockInfo = knownStocks[ticker];
        if (stockInfo) {
          mentions.push({
            ticker,
            company_name: stockInfo.company_name,
            market: stockInfo.market,
            post_id: post.id,
            mentioned_date: post.created_date,
            found_by: `keyword: ${keyword}`
          });
          this.foundStocks.add(ticker);
        }
      }
    }

    // 2. 티커 패턴으로 검색
    for (const patternInfo of stockPatterns) {
      const matches = text.match(patternInfo.pattern);
      if (matches) {
        for (const match of matches) {
          const ticker = match.trim();
          if (!existingTickers.includes(ticker) && knownStocks[ticker]) {
            const stockInfo = knownStocks[ticker];
            mentions.push({
              ticker,
              company_name: stockInfo.company_name,
              market: stockInfo.market,
              post_id: post.id,
              mentioned_date: post.created_date,
              found_by: `pattern: ${patternInfo.type}`
            });
            this.foundStocks.add(ticker);
          }
        }
      }
    }

    return mentions;
  }

  async analyzeThreeMonthsPosts() {
    console.log('🔍 3개월치 포스트에서 놓친 상장 종목 찾기 시작...');

    try {
      const posts = await this.getThreeMonthsPosts();
      console.log(`📄 3개월치 포스트 ${posts.length}개 분석 시작`);

      const allMentions = [];
      const stockCounts = {};

      for (const post of posts) {
        const mentions = this.findStockMentions(post);
        
        for (const mention of mentions) {
          allMentions.push(mention);
          
          if (!stockCounts[mention.ticker]) {
            stockCounts[mention.ticker] = {
              count: 0,
              name: mention.company_name,
              market: mention.market,
              posts: []
            };
          }
          stockCounts[mention.ticker].count++;
          stockCounts[mention.ticker].posts.push({
            id: post.id,
            title: post.title.substring(0, 50) + '...',
            date: post.created_date
          });
        }
      }

      // 결과 정리
      this.newStocks = Object.entries(stockCounts)
        .map(([ticker, data]) => ({
          ticker,
          ...data
        }))
        .sort((a, b) => b.count - a.count);

      // 결과 출력
      console.log('\\n📊 새로 발견된 상장 종목들:');
      console.log(`✅ 총 ${this.newStocks.length}개 종목 발견`);
      
      if (this.newStocks.length > 0) {
        console.log('\\n🎯 발견된 종목 상세:');
        this.newStocks.forEach((stock, index) => {
          console.log(`${index + 1}. ${stock.name} (${stock.ticker}) - ${stock.market}`);
          console.log(`   📈 언급 횟수: ${stock.count}회`);
          console.log(`   📝 관련 포스트: ${stock.posts.slice(0, 3).map(p => p.title).join(', ')}`);
          console.log('');
        });

        // 추가할 종목 매핑 생성
        console.log('\\n🔧 종목 매핑에 추가할 코드:');
        this.newStocks.forEach(stock => {
          const keywords = this.generateKeywords(stock);
          console.log(`  {`);
          console.log(`    ticker: '${stock.ticker}',`);
          console.log(`    keywords: [${keywords.map(k => `'${k}'`).join(', ')}],`);
          console.log(`    company_name: '${stock.name}'`);
          console.log(`  },`);
        });
      } else {
        console.log('\\n✅ 모든 상장 종목이 이미 추적되고 있습니다.');
      }

      return this.newStocks;

    } catch (error) {
      console.error('💥 분석 중 오류:', error);
      return [];
    }
  }

  generateKeywords(stock) {
    const keywords = [stock.ticker, stock.name];
    
    // 추가 키워드 생성 로직
    if (stock.name.includes('삼성')) {
      keywords.push('Samsung');
    }
    if (stock.name.includes('LG')) {
      keywords.push('LG');
    }
    if (stock.name.includes('현대')) {
      keywords.push('Hyundai');
    }
    if (stock.name.includes('한화')) {
      keywords.push('Hanwha');
    }
    
    return [...new Set(keywords)]; // 중복 제거
  }

  async close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('데이터베이스 종료 오류:', err);
        } else {
          console.log('🔌 데이터베이스 연결 종료');
        }
      });
    }
  }
}

// 스크립트 실행
async function main() {
  const finder = new MissingStockFinder();
  
  try {
    await finder.connect();
    const newStocks = await finder.analyzeThreeMonthsPosts();
    
    if (newStocks.length > 0) {
      console.log('\\n🚀 다음 단계:');
      console.log('1. 위의 종목 매핑을 sync-stock-mentions.js에 추가');
      console.log('2. sync-stock-mentions.js 실행으로 데이터 동기화');
      console.log('3. 새 종목들에 대한 감정 분석 실행');
    }
    
    return newStocks;
    
  } catch (error) {
    console.error('💥 실행 중 오류:', error);
    return [];
  } finally {
    await finder.close();
  }
}

// 직접 실행시
if (require.main === module) {
  main();
}

module.exports = MissingStockFinder;