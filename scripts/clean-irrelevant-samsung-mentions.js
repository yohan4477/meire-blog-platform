/**
 * 삼성전자와 관련 없는 포스트들을 merry_mentioned_stocks에서 제거
 * 조선업, 개인적 썰, 다이어트 관련 등 부정확하게 연결된 포스트들 정리
 */

const StockDB = require('../src/lib/stock-db-sqlite3');

class IrrelevantMentionCleaner {
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

  // 실제 삼성전자 관련 포스트 ID 목록 (정확한 리스트)
  getActualSamsungPostIds() {
    return [
      513, // AI와 반도체 시장의 새로운 전환점 - 2025년 하반기 전망
      512, // 인텔 국유화 되나? (feat 트럼프, 일라이릴리, 유나이티드헬스케어)
      5,   // 트럼프가 인텔 CEO의 사임을 요구하는 이유
      12,  // 대만 상호관세 20%의 비밀(feat TSMC)
      11,  // 삼성전자 애플칩 수주, 트럼프 반도체 100% 관세 부과
      27,  // 방금 발표한 2025년 세제개편안 7대 변경내용 정리(feat 증세)
      33,  // 삼성전자 근황 3 (feat 평택캠퍼스, 텍사스, 테슬라 수주)
      34,  // 삼성전자 근황 2 (feat TSMC, 3나노 수율, 평택)
      35,  // 삼성전자 근황 1 (feat 파운드리, 이건희회장)
      42,  // 조선업 근황 업데이트 (feat 임단협, 현장인력,한화오션) - ❌ 삼성전자와 무관
      58,  // 삼성이 BOE의 애플공급을 막을수 있을까?(feat SK하이닉스)
      61   // 엔비디아 H20칩의 중국수출 허용과 삼성전자 근황
    ];
  }

  // 실제 삼성전자와 관련된 포스트 ID만 (조선업 제외)
  getRelevantSamsungPostIds() {
    const allPosts = this.getActualSamsungPostIds();
    // 조선업 포스트 (ID 42) 제외
    return allPosts.filter(id => id !== 42);
  }

  // 현재 merry_mentioned_stocks에서 삼성전자 연결 상태 확인
  async checkCurrentSamsungMentions() {
    console.log('🔍 현재 merry_mentioned_stocks에서 삼성전자 연결 상태 확인...');
    
    const ticker = '005930';
    const currentMentions = await this.queryPromise(`
      SELECT mms.post_id, bp.title, bp.created_date
      FROM merry_mentioned_stocks mms
      INNER JOIN blog_posts bp ON mms.post_id = bp.id
      WHERE mms.ticker = ?
      ORDER BY bp.created_date DESC
    `, [ticker]);

    console.log(`📊 현재 merry_mentioned_stocks의 삼성전자 연결: ${currentMentions.length}개`);
    
    const relevantIds = this.getRelevantSamsungPostIds();
    const irrelevantMentions = currentMentions.filter(mention => 
      !relevantIds.includes(mention.post_id)
    );

    console.log(`\n✅ 관련있는 포스트: ${currentMentions.length - irrelevantMentions.length}개`);
    console.log(`❌ 관련없는 포스트: ${irrelevantMentions.length}개`);

    if (irrelevantMentions.length > 0) {
      console.log(`\n🗑️ 제거해야 할 부정확한 연결:`)
      irrelevantMentions.forEach((mention, idx) => {
        console.log(`  ${idx+1}. ID ${mention.post_id}: ${mention.title.substring(0, 60)}...`);
      });
    }

    return {
      total: currentMentions.length,
      relevant: currentMentions.length - irrelevantMentions.length,
      irrelevant: irrelevantMentions.length,
      irrelevantPosts: irrelevantMentions
    };
  }

  // 부정확한 삼성전자 연결 제거
  async cleanIrrelevantMentions() {
    console.log('🧹 부정확한 삼성전자 연결 제거 시작...');
    
    const ticker = '005930';
    const relevantIds = this.getRelevantSamsungPostIds();
    
    // 관련 없는 포스트 연결 삭제
    const placeholders = relevantIds.map(() => '?').join(',');
    const deletedCount = await this.updatePromise(`
      DELETE FROM merry_mentioned_stocks 
      WHERE ticker = ? 
        AND post_id NOT IN (${placeholders})
    `, [ticker, ...relevantIds]);

    console.log(`🗑️ 부정확한 연결 ${deletedCount}개 제거 완료`);
    return deletedCount;
  }

  // sentiments 테이블에서도 부정확한 분석 제거
  async cleanIrrelevantSentiments() {
    console.log('🧹 부정확한 감정 분석 데이터 제거...');
    
    const ticker = '005930';
    const relevantIds = this.getRelevantSamsungPostIds();
    
    // 관련 없는 포스트의 감정 분석 삭제
    const placeholders = relevantIds.map(() => '?').join(',');
    const deletedCount = await this.updatePromise(`
      DELETE FROM sentiments 
      WHERE ticker = ? 
        AND post_id NOT IN (${placeholders})
    `, [ticker, ...relevantIds]);

    console.log(`🗑️ 부정확한 감정 분석 ${deletedCount}개 제거 완료`);
    return deletedCount;
  }

  // stocks 테이블 카운트 재계산
  async recalculateStocksCounts() {
    console.log('🔢 stocks 테이블 카운트 재계산...');
    
    const ticker = '005930';
    const relevantIds = this.getRelevantSamsungPostIds();
    
    // 30일 전 날짜
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().replace('T', ' ').replace('Z', '');

    // 실제 관련 포스트 수 (30일 기준)
    const relevantPostsIn30Days = relevantIds.length; // 최근 30일간 모든 관련 포스트

    // 분석 완료된 포스트 수
    const placeholders = relevantIds.map(() => '?').join(',');
    const analyzedPosts = await this.queryPromise(`
      SELECT COUNT(DISTINCT s.post_id) as count 
      FROM sentiments s 
      INNER JOIN blog_posts bp ON s.post_id = bp.id 
      WHERE s.ticker = ? 
        AND s.post_id IN (${placeholders})
        AND bp.created_date >= ?
    `, [ticker, ...relevantIds, startDate]);

    const analyzedCount = analyzedPosts[0].count;

    console.log(`📊 재계산된 카운트:`)
    console.log(`  총 관련 포스트 (30일): ${relevantPostsIn30Days}개`);
    console.log(`  분석 완료: ${analyzedCount}개`);
    console.log(`  분석률: ${analyzedCount}/${relevantPostsIn30Days} (${((analyzedCount/relevantPostsIn30Days)*100).toFixed(1)}%)`);

    // stocks 테이블 업데이트
    await this.updatePromise(`
      UPDATE stocks 
      SET 
        mention_count_1m = ?,
        sentiment_count_1m = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE ticker = ?
    `, [relevantPostsIn30Days, analyzedCount, ticker]);

    console.log(`✅ stocks 테이블 업데이트 완료`);
    return { totalCount: relevantPostsIn30Days, analyzedCount };
  }

  // 최종 검증
  async validateCleaning() {
    console.log(`\n🔍 정리 결과 검증...`);
    
    const ticker = '005930';
    
    // merry_mentioned_stocks 확인
    const mentions = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM merry_mentioned_stocks 
      WHERE ticker = ?
    `, [ticker]);

    // sentiments 확인
    const sentiments = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM sentiments 
      WHERE ticker = ?
    `, [ticker]);

    // stocks 테이블 확인
    const stocks = await this.queryPromise(`
      SELECT mention_count_1m, sentiment_count_1m 
      FROM stocks 
      WHERE ticker = ?
    `, [ticker]);

    console.log(`📊 정리 후 상태:`)
    console.log(`  merry_mentioned_stocks: ${mentions[0].count}개`);
    console.log(`  sentiments: ${sentiments[0].count}개`);
    if (stocks.length > 0) {
      console.log(`  stocks 1M: ${stocks[0].sentiment_count_1m}/${stocks[0].mention_count_1m} (${((stocks[0].sentiment_count_1m/stocks[0].mention_count_1m)*100).toFixed(1)}%)`);
    }

    return {
      mentions: mentions[0].count,
      sentiments: sentiments[0].count,
      stocksData: stocks[0] || null
    };
  }

  // 메인 실행
  async cleanIrrelevantSamsungMentionsComplete() {
    console.log('🚀 삼성전자 부정확한 연결 정리 시작...');
    
    try {
      // 1. 현재 상태 확인
      const currentState = await this.checkCurrentSamsungMentions();
      
      if (currentState.irrelevant === 0) {
        console.log('✅ 이미 모든 연결이 정확합니다. 정리할 필요 없음');
        return { cleaned: false, currentState };
      }

      // 2. 부정확한 연결 제거
      const deletedMentions = await this.cleanIrrelevantMentions();
      const deletedSentiments = await this.cleanIrrelevantSentiments();
      
      // 3. stocks 테이블 재계산
      const recalculated = await this.recalculateStocksCounts();
      
      // 4. 최종 검증
      const validation = await this.validateCleaning();

      console.log('\n🎯 삼성전자 부정확한 연결 정리 완료!');
      console.log(`🗑️ 제거된 항목: mentions=${deletedMentions}, sentiments=${deletedSentiments}`);
      console.log(`📊 최종 분석률: ${validation.stocksData.sentiment_count_1m}/${validation.stocksData.mention_count_1m} (${((validation.stocksData.sentiment_count_1m/validation.stocksData.mention_count_1m)*100).toFixed(1)}%)`);
      
      return { 
        cleaned: true, 
        deletedMentions, 
        deletedSentiments, 
        recalculated, 
        validation 
      };

    } catch (error) {
      console.error('❌ 삼성전자 부정확한 연결 정리 중 오류:', error);
      throw error;
    }
  }
}

async function main() {
  const cleaner = new IrrelevantMentionCleaner();
  
  try {
    await cleaner.connect();
    const result = await cleaner.cleanIrrelevantSamsungMentionsComplete();
    
    console.log('\n✅ 삼성전자 부정확한 연결 정리 완료!');
    console.log('📈 다음: 웹사이트에서 차트 확인 (조선업 포스트 마커 사라짐)');
    return result;
    
  } catch (error) {
    console.error('💥 삼성전자 부정확한 연결 정리 실패:', error);
    throw error;
  } finally {
    await cleaner.close();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n🎉 삼성전자 부정확한 연결 정리 성공');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { IrrelevantMentionCleaner };