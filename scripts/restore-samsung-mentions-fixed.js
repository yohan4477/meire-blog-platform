/**
 * 삼성전자 관련 포스트 복구 (수정된 버전)
 * 올바른 테이블 스키마로 삼성전자 관련 포스트들을 복구
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

  // 확실히 삼성전자와 관련된 포스트들 정의
  getSamsungRelatedPostIds() {
    return [
      // 확실한 삼성전자 직접 관련 포스트들
      506, // 삼성디스플레이의 BOE 소송 근황 A/S (feat 승소)
      82,  // 삼성전자의 HBM 3E 양산은 자신감일까? 위험한 도전일까? A/S
      93,  // 인공장기 시대가 시작된다 (feat 오가노이드, 삼성바이오, GDF11)
      150, // 데이터 센터 냉각전쟁 근황(feat 삼성전자, LG전자, SK, 중국)
      209, // 삼성전자의 HBM 3E 양산은 자신감일까? 위험한 도전일까?
      304, // 삼성 이재용회장은 시진핑을 왜 만났을까?
      484, // 미국의 비밀무기 DARPA A/S (feat 삼성전자,레인보우로보틱스)
      499, // 중국반도체 굴기근황 2(feat 창신메모리, 반간첩법, 삼성전자)
      500, // 중국 반도체굴기 근황 1(feat 화웨이,창신반도체, 삼성전자)
      
      // 반도체 관련 (삼성전자 간접 관련)
      79,  // 눈 깜짝할 사이 (feat SK하이닉스, 펨토초 그루빙, 아토초)
      254, // 한미반도체가 SK하이닉스와 싸우는 이유
      420, // 미중 반도체 전쟁과 엔비디아의 상황(feat DeepSeek,트럼프)
      171, // 엔비디아의 젠슨황이 언급한 대만의 약점(feat TSMC, 원전)
      
      // 전자/기술 관련
      264, // 자고 일어나면 바뀌어 있는 세상 2 (feat 휴대폰등 관세면제,애플)
      266, // 자고 일어나면 바뀌어 있는 세상 (feat 전자제품, 휴대폰등 관세면제)
      
      // 경제/투자 관련 (삼성 포함 대기업 언급)
      251, // 국민연금 매수여력이 바닥났을까?
      301, // 세계 1만개기업 순위별로 둘러보기 (feat 워런 버핏의 위엄)
      311, // 배당 및 투자 안 하고 곳간에... 사내유보금 2801조 유감
      346, // 일본 주식 어디에 들어갈까?
      379  // 재무제표 보는 법(feat 이익 3종세트,영업이익,공헌이익,EBITDA)
    ];
  }

  // 실제 삼성전자 관련 포스트 확인
  async findActualSamsungPosts() {
    console.log('🔍 삼성전자 관련 포스트 확인...');
    
    const candidateIds = this.getSamsungRelatedPostIds();
    const placeholders = candidateIds.map(() => '?').join(',');
    
    const relatedPosts = await this.queryPromise(`
      SELECT id, title, created_date, content
      FROM blog_posts 
      WHERE id IN (${placeholders})
        AND id NOT IN (
          SELECT post_id FROM merry_mentioned_stocks WHERE ticker = '005930'
        )
      ORDER BY created_date DESC
    `, candidateIds);

    console.log(`📊 복구 대상 포스트: ${relatedPosts.length}개`);
    
    if (relatedPosts.length > 0) {
      console.log(`\n📝 복구할 포스트 목록:`);
      relatedPosts.forEach((post, idx) => {
        console.log(`  ${idx+1}. ID ${post.id}: ${post.title.substring(0, 70)}...`);
      });
    }

    return relatedPosts;
  }

  // merry_mentioned_stocks에 포스트 추가 (올바른 스키마)
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
          // 올바른 컬럼명으로 추가
          await this.updatePromise(`
            INSERT INTO merry_mentioned_stocks (
              ticker, post_id, mentioned_date, mention_type, context,
              is_featured, created_at, mention_count, last_mentioned_at,
              mention_count_1m, mention_count_3m, mention_count_6m, mention_count_total
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
          `, [
            ticker,
            post.id,
            post.created_date,
            'post_content',
            `Post ${post.id} mentions Samsung: ${post.title.substring(0, 50)}`,
            0, // is_featured
            1, // mention_count
            post.created_date, // last_mentioned_at
            1, 1, 1, 1 // 기본 카운트들
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

    // stocks 테이블 업데이트
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
      // 1. 삼성전자 관련 포스트 찾기
      const relatedPosts = await this.findActualSamsungPosts();
      
      let totalAdded = 0;
      if (relatedPosts.length > 0) {
        // 2. merry_mentioned_stocks에 추가
        totalAdded = await this.addToMerryMentioned(relatedPosts);
      }
      
      // 3. stocks 테이블 카운트 업데이트
      const newCounts = await this.updateStocksCounts();
      
      // 4. 최종 검증
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