/**
 * merry_mentioned_stocks 테이블을 실제 blog_posts 데이터와 동기화하는 스크립트
 * 실제 포스트에서 종목 언급을 다시 계산하여 테이블 업데이트
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'database.db');

// 종목 매핑 정보
const stockMappings = [
  {
    ticker: 'TSLA',
    keywords: ['테슬라', 'TSLA', 'Tesla'],
    company_name: '테슬라'
  },
  {
    ticker: '005930',
    keywords: ['삼성전자', '005930', '삼성'],
    company_name: '삼성전자'
  },
  {
    ticker: 'INTC',
    keywords: ['인텔', 'INTC', 'Intel'],
    company_name: '인텔'
  },
  {
    ticker: 'LLY',
    keywords: ['일라이릴리', 'LLY', 'Eli Lilly', '릴리'],
    company_name: '일라이릴리'
  },
  {
    ticker: 'UNH',
    keywords: ['유나이티드헬스케어', 'UNH', 'UnitedHealth', '유나이티드헬스'],
    company_name: '유나이티드헬스케어'
  },
  {
    ticker: 'NVDA',
    keywords: ['엔비디아', 'NVDA', 'NVIDIA'],
    company_name: '엔비디아'
  },
  {
    ticker: 'AAPL',
    keywords: ['애플', 'AAPL', 'Apple', '아이폰'],
    company_name: '애플'
  },
  {
    ticker: 'GOOGL',
    keywords: ['구글', 'GOOGL', 'Google', '알파벳'],
    company_name: '구글'
  },
  {
    ticker: 'MSFT',
    keywords: ['마이크로소프트', 'MSFT', 'Microsoft', '마소'],
    company_name: '마이크로소프트'
  },
  {
    ticker: 'AMZN',
    keywords: ['아마존', 'AMZN', 'Amazon'],
    company_name: '아마존'
  },
  {
    ticker: 'META',
    keywords: ['메타', 'META', '페이스북', 'Facebook'],
    company_name: '메타'
  },
  {
    ticker: '042660',
    keywords: ['한화오션', '042660', '한화시스템'],
    company_name: '한화오션'
  },
  {
    ticker: '267250',
    keywords: ['HD현대', '267250', '현대중공업'],
    company_name: 'HD현대'
  },
  {
    ticker: '010620',
    keywords: ['현대미포조선', '010620', '미포조선'],
    company_name: '현대미포조선'
  },
  // 새로 발견된 상장 종목들 (언급 횟수 많은 순)
  {
    ticker: 'V',
    keywords: ['비자', 'Visa'],
    company_name: '비자'
  },
  {
    ticker: '000660',
    keywords: ['000660', 'SK하이닉스', 'SK Hynix'],
    company_name: 'SK하이닉스'
  },
  {
    ticker: 'JPM',
    keywords: ['JPM', 'JP모건', 'JP Morgan'],
    company_name: 'JP모건'
  },
  {
    ticker: 'NFLX',
    keywords: ['NFLX', '넷플릭스', 'Netflix'],
    company_name: '넷플릭스'
  },
  {
    ticker: 'QCOM',
    keywords: ['QCOM', '퀄컴', 'Qualcomm'],
    company_name: '퀄컴'
  },
  {
    ticker: '272210',
    keywords: ['272210', '한화시스템', '한화'],
    company_name: '한화시스템'
  },
  {
    ticker: 'MU',
    keywords: ['MU', '마이크론', 'Micron'],
    company_name: '마이크론'
  },
  {
    ticker: '066570',
    keywords: ['066570', 'LG전자', 'LG Electronics'],
    company_name: 'LG전자'
  },
  {
    ticker: 'BAC',
    keywords: ['BAC', '뱅크오브아메리카', 'Bank of America'],
    company_name: '뱅크오브아메리카'
  },
  {
    ticker: '012450',
    keywords: ['012450', '한화에어로스페이스', '한화'],
    company_name: '한화에어로스페이스'
  }
];

class StockMentionSyncer {
  constructor() {
    this.db = null;
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

  async getAllPosts() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, title, content, created_date FROM blog_posts',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  findStockMentions(post) {
    const mentions = [];
    const text = (post.title + ' ' + post.content).toLowerCase();

    for (const stock of stockMappings) {
      for (const keyword of stock.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          mentions.push({
            ticker: stock.ticker,
            company_name: stock.company_name,
            post_id: post.id,
            mentioned_date: post.created_date
          });
          break; // 하나의 키워드만 발견되면 중복 방지
        }
      }
    }

    return mentions;
  }

  async clearExistingMentions() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM merry_mentioned_stocks', (err) => {
        if (err) {
          console.error('💥 기존 데이터 삭제 실패:', err);
          reject(err);
        } else {
          console.log('🗑️ 기존 merry_mentioned_stocks 데이터 삭제 완료');
          resolve();
        }
      });
    });
  }

  async insertMention(mention) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO merry_mentioned_stocks (ticker, mentioned_date, post_id) VALUES (?, ?, ?)',
        [mention.ticker, mention.mentioned_date, mention.post_id],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async syncStockMentions() {
    console.log('🔄 종목 언급 데이터 동기화 시작...');

    try {
      // 1. 모든 포스트 가져오기
      const posts = await this.getAllPosts();
      console.log(`📄 총 ${posts.length}개 포스트 분석 시작`);

      // 2. 기존 데이터 삭제
      await this.clearExistingMentions();

      // 3. 각 포스트에서 종목 언급 찾기
      let totalMentions = 0;
      const stockCounts = {};

      for (const post of posts) {
        const mentions = this.findStockMentions(post);
        
        for (const mention of mentions) {
          await this.insertMention(mention);
          totalMentions++;
          
          // 통계 계산
          if (!stockCounts[mention.ticker]) {
            stockCounts[mention.ticker] = { count: 0, name: mention.company_name };
          }
          stockCounts[mention.ticker].count++;
        }
      }

      // 4. 결과 출력
      console.log('\n📊 동기화 결과:');
      console.log(`✅ 총 ${totalMentions}개 언급 발견`);
      console.log('\n🏆 종목별 언급 순위:');
      
      const sortedStocks = Object.entries(stockCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10);

      sortedStocks.forEach(([ticker, data], index) => {
        console.log(`${index + 1}. ${data.name} (${ticker}): ${data.count}개`);
      });

      console.log('\n✅ merry_mentioned_stocks 테이블 동기화 완료!');

    } catch (error) {
      console.error('💥 동기화 중 오류:', error);
    }
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
  const syncer = new StockMentionSyncer();
  
  try {
    await syncer.connect();
    await syncer.syncStockMentions();
  } catch (error) {
    console.error('💥 실행 중 오류:', error);
  } finally {
    await syncer.close();
  }
}

// 직접 실행시
if (require.main === module) {
  main();
}

module.exports = StockMentionSyncer;