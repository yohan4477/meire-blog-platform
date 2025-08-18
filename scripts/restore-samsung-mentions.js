/**
 * 삼성전자 관련 포스트 복구
 * 너무 많이 제거된 삼성전자 관련 포스트들을 다시 merry_mentioned_stocks에 추가
 */

const StockDB = require('../src/lib/stock-db-sqlite3');

class SamsungMentionRestorer {
  constructor() {
    this.stockDB = null;
  }

  async connect() {
    this.stockDB = new StockDB();
    await this.stockDB.connect();
    console.log('✅ Connected to database');
  }

  async close() {
    if (this.stockDB) {
      await this.stockDB.close();
      console.log('🔌 Database connection closed');
    }
  }

  async queryPromise(query, params = []) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async updatePromise(query, params = []) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // 삼성전자 관련 포스트 찾기 (포괄적 검색)
  async findSamsungRelatedPosts() {
    console.log('🔍 삼성전자 관련 포스트 재검색...');
    
    // 삼성전자와 실제 관련된 포스트들을 포괄적으로 검색
    const relatedPosts = await this.queryPromise(`
      SELECT DISTINCT bp.id, bp.title, bp.created_date
      FROM blog_posts bp
      WHERE (
        bp.title LIKE '%삼성전자%' OR
        bp.title LIKE '%삼성디스플레이%' OR
        bp.title LIKE '%삼성바이오%' OR
        bp.title LIKE '%삼성%반도체%' OR
        bp.title LIKE '%삼성%HBM%' OR
        bp.title LIKE '%삼성%BOE%' OR
        bp.title LIKE '%삼성%애플%' OR
        bp.title LIKE '%삼성%TSMC%' OR
        bp.title LIKE '%삼성%수주%' OR
        bp.title LIKE '%삼성%파운드리%' OR
        bp.title LIKE '%삼성%평택%' OR
        bp.title LIKE '%삼성%메모리%' OR
        bp.title LIKE '%삼성%005930%' OR
        bp.content LIKE '%삼성전자%' OR
        bp.content LIKE '%005930%'
      )
      AND bp.id NOT IN (
        SELECT post_id FROM merry_mentioned_stocks WHERE ticker = '005930'
      )
      ORDER BY bp.created_date DESC
    `);

    console.log(`📊 복구 대상 포스트: ${relatedPosts.length}개`);
    
    if (relatedPosts.length > 0) {
      console.log(`\n📝 복구할 포스트 목록:`);
      relatedPosts.forEach((post, idx) => {
        console.log(`  ${idx+1}. ID ${post.id}: ${post.title.substring(0, 80)}...`);
      });
    }

    return relatedPosts;
  }

  // 특정 포스트들도 명시적으로 복구
  getAdditionalSamsungPosts() {
    // 확실히 삼성전자와 관련된 포스트 ID들
    return [
      506, // 삼성디스플레이의 BOE 소송 근황 A/S (feat 승소)
      82,  // 삼성전자의 HBM 3E 양산은 자신감일까? 위험한 도전일까? A/S
      93,  // 인공장기 시대가 시작된다 (feat 오가노이드, 삼성바이오, GDF11)
      150, // 데이터 센터 냉각전쟁 근황(feat 삼성전자, LG전자, SK, 중국)
      209, // 삼성전자의 HBM 3E 양산은 자신감일까? 위험한 도전일까?
      304, // 삼성 이재용회장은 시진핑을 왜 만났을까?
      484, // 미국의 비밀무기 DARPA A/S (feat 삼성전자,레인보우로보틱스)
      499, // 중국반도체 굴기근황 2(feat 창신메모리, 반간첩법, 삼성전자)
      500  // 중국 반도체굴기 근황 1(feat 화웨이,창신반도체, 삼성전자)
    ];
  }

  // merry_mentioned_stocks에 포스트 추가
  async addToMerryMentioned(posts) {
    console.log('📝 merry_mentioned_stocks에 포스트 추가...');
    
    const ticker = '005930';
    let addedCount = 0;

    for (const post of posts) {
      try {
        // 이미 있는지 확인
        const existing = await this.queryPromise(`
          SELECT id FROM merry_mentioned_stocks 
          WHERE ticker = ? AND post_id = ?
        `, [ticker, post.id]);

        if (existing.length === 0) {
          // 추가
          await this.updatePromise(`
            INSERT INTO merry_mentioned_stocks (
              ticker, post_id, mentioned_at, mention_type, mention_context,
              is_analyzed, created_at, mention_count_1m, mention_count_3m, 
              mention_count_6m, mention_count_total
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
          `, [
            ticker,
            post.id,
            post.created_date,
            'post_content',
            `Post ${post.id} mentions Samsung`,
            0,
            1, 1, 1, 1 // 기본 카운트
          ]);

          addedCount++;
          console.log(`  ✅ 추가: ID ${post.id} - ${post.title.substring(0, 50)}...`);
        }
      } catch (error) {
        console.warn(`  ⚠️ 추가 실패: ID ${post.id} - ${error.message}`);
      }
    }

    console.log(`📊 총 ${addedCount}개 포스트 추가 완료`);
    return addedCount;
  }

  // 추가 포스트들도 복구
  async restoreAdditionalPosts() {
    console.log('🔄 추가 삼성전자 관련 포스트 복구...');
    
    const additionalIds = this.getAdditionalSamsungPosts();
    const additionalPosts = await this.queryPromise(`
      SELECT id, title, created_date 
      FROM blog_posts 
      WHERE id IN (${additionalIds.map(() => '?').join(',')})
    `, additionalIds);

    console.log(`📊 추가 복구 대상: ${additionalPosts.length}개`);
    
    if (additionalPosts.length > 0) {
      const addedCount = await this.addToMerryMentioned(additionalPosts);
      return addedCount;
    }
    
    return 0;
  }

  // stocks 테이블 카운트 업데이트
  async updateStocksCounts() {
    console.log('🔢 stocks 테이블 카운트 재계산...');
    
    const ticker = '005930';
    
    // 30일, 90일, 180일 전 날짜 계산
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const startDate30 = thirtyDaysAgo.toISOString().replace('T', ' ').replace('Z', '');
    const startDate90 = ninetyDaysAgo.toISOString().replace('T', ' ').replace('Z', '');
    const startDate180 = oneEightyDaysAgo.toISOString().replace('T', ' ').replace('Z', '');

    // 각 기간별 포스트 수 계산
    const count1m = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM merry_mentioned_stocks mms
      INNER JOIN blog_posts bp ON mms.post_id = bp.id
      WHERE mms.ticker = ? AND bp.created_date >= ?
    `, [ticker, startDate30]);

    const count3m = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM merry_mentioned_stocks mms
      INNER JOIN blog_posts bp ON mms.post_id = bp.id
      WHERE mms.ticker = ? AND bp.created_date >= ?
    `, [ticker, startDate90]);

    const count6m = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM merry_mentioned_stocks mms
      INNER JOIN blog_posts bp ON mms.post_id = bp.id
      WHERE mms.ticker = ? AND bp.created_date >= ?
    `, [ticker, startDate180]);

    const countTotal = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM merry_mentioned_stocks 
      WHERE ticker = ?
    `, [ticker]);

    const counts = {
      count1m: count1m[0].count,
      count3m: count3m[0].count,
      count6m: count6m[0].count,
      countTotal: countTotal[0].count
    };

    console.log(`📊 새로운 카운트:`);
    console.log(`  1M: ${counts.count1m}개`);
    console.log(`  3M: ${counts.count3m}개`);
    console.log(`  6M: ${counts.count6m}개`);
    console.log(`  Total: ${counts.countTotal}개`);

    // stocks 테이블 업데이트 (sentiment_count는 기존 유지)
    await this.updatePromise(`
      UPDATE stocks 
      SET 
        mention_count_1m = ?,
        mention_count_3m = ?,
        mention_count_6m = ?,
        mention_count_total = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE ticker = ?
    `, [counts.count1m, counts.count3m, counts.count6m, counts.countTotal, ticker]);

    console.log(`✅ stocks 테이블 업데이트 완료`);
    return counts;
  }

  // 최종 검증
  async validateRestoration() {
    console.log(`\n🔍 복구 결과 검증...`);
    
    const ticker = '005930';
    
    // 현재 상태 확인
    const mentionCount = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM merry_mentioned_stocks 
      WHERE ticker = ?
    `, [ticker]);

    const stocksData = await this.queryPromise(`
      SELECT mention_count_1m, mention_count_3m, mention_count_6m, 
             sentiment_count_1m, sentiment_count_3m, sentiment_count_6m
      FROM stocks 
      WHERE ticker = ?
    `, [ticker]);

    const counts = mentionCount[0].count;
    const stocks = stocksData[0];

    console.log(`📊 복구 후 상태:`);
    console.log(`  merry_mentioned_stocks: ${counts}개`);
    console.log(`  stocks 1M: ${stocks.sentiment_count_1m}/${stocks.mention_count_1m}`);
    console.log(`  stocks 3M: ${stocks.sentiment_count_3m}/${stocks.mention_count_3m}`);
    console.log(`  stocks 6M: ${stocks.sentiment_count_6m}/${stocks.mention_count_6m}`);

    return { counts, stocks };
  }

  // 메인 실행
  async restoreSamsungMentions() {
    console.log('🚀 삼성전자 관련 포스트 복구 시작...');
    
    try {
      // 1. 삼성전자 관련 포스트 재검색
      const relatedPosts = await this.findSamsungRelatedPosts();
      
      // 2. merry_mentioned_stocks에 추가
      let totalAdded = 0;
      if (relatedPosts.length > 0) {
        totalAdded += await this.addToMerryMentioned(relatedPosts);
      }

      // 3. 추가 포스트들 복구
      totalAdded += await this.restoreAdditionalPosts();
      
      // 4. stocks 테이블 카운트 업데이트
      const newCounts = await this.updateStocksCounts();
      
      // 5. 최종 검증
      const validation = await this.validateRestoration();

      console.log('\n🎯 삼성전자 관련 포스트 복구 완료!');
      console.log(`📊 복구된 포스트: ${totalAdded}개`);
      console.log(`📊 총 관련 포스트: ${validation.counts}개`);
      
      return { 
        restored: true, 
        totalAdded,
        newCounts,
        validation 
      };

    } catch (error) {
      console.error('❌ 삼성전자 포스트 복구 중 오류:', error);
      throw error;
    }
  }
}

async function main() {
  const restorer = new SamsungMentionRestorer();
  
  try {
    await restorer.connect();
    const result = await restorer.restoreSamsungMentions();
    
    console.log('\n✅ 삼성전자 관련 포스트 복구 완료!');
    console.log('📈 다음: 웹사이트에서 복구된 차트 확인');
    return result;
    
  } catch (error) {
    console.error('💥 삼성전자 포스트 복구 실패:', error);
    throw error;
  } finally {
    await restorer.close();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n🎉 삼성전자 포스트 복구 성공');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { SamsungMentionRestorer };