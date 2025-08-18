/**
 * 배지 시스템 업데이트
 * - hot, new 배지 제거
 * - trump 배지를 "트럼프관련"으로 변경
 */

const StockDB = require('../src/lib/stock-db-sqlite3');

class BadgeSystemUpdater {
  constructor() {
    this.stockDB = null;
  }

  async connect() {
    this.stockDB = new StockDB();
    await this.stockDB.connect();
    console.log('✅ Database connected');
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

  // 현재 배지 상태 확인
  async checkCurrentBadges() {
    console.log('\n🔍 현재 배지 상태 확인...');
    
    const badges = await this.queryPromise(`
      SELECT ticker, company_name, badge_type, badge_text, badge_color, rank_position
      FROM merry_picks_cache 
      WHERE badge_type IS NOT NULL 
      ORDER BY rank_position
    `);

    console.log(`📊 현재 배지 적용 종목: ${badges.length}개`);
    
    const badgeStats = badges.reduce((acc, item) => {
      acc[item.badge_type] = (acc[item.badge_type] || 0) + 1;
      return acc;
    }, {});

    console.log('🏷️ 배지 분포:', badgeStats);
    
    badges.forEach((badge, idx) => {
      console.log(`  ${idx + 1}. ${badge.ticker} (${badge.company_name}) - ${badge.badge_type}: ${badge.badge_text}`);
    });

    return { badges, badgeStats };
  }

  // hot, new 배지 제거
  async removeHotNewBadges() {
    console.log('\n🗑️ HOT, NEW 배지 제거...');
    
    const toRemove = await this.queryPromise(`
      SELECT ticker, company_name, badge_type, badge_text
      FROM merry_picks_cache 
      WHERE badge_type IN ('hot', 'new')
    `);

    console.log(`📋 제거할 배지: ${toRemove.length}개`);
    toRemove.forEach(item => {
      console.log(`  - ${item.ticker} (${item.company_name}): ${item.badge_type} → 제거`);
    });

    if (toRemove.length > 0) {
      const changes = await this.updatePromise(`
        UPDATE merry_picks_cache 
        SET 
          badge_type = NULL,
          badge_text = NULL,
          badge_color = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE badge_type IN ('hot', 'new')
      `);

      console.log(`✅ ${changes}개 배지 제거 완료`);
    } else {
      console.log('ℹ️ 제거할 HOT/NEW 배지 없음');
    }

    return toRemove.length;
  }

  // trump 배지를 "트럼프관련"으로 변경
  async updateTrumpBadges() {
    console.log('\n🔄 TRUMP 배지 → "트럼프관련" 변경...');
    
    const trumpBadges = await this.queryPromise(`
      SELECT ticker, company_name, badge_type, badge_text, badge_color
      FROM merry_picks_cache 
      WHERE badge_type = 'trump'
    `);

    console.log(`📋 변경할 TRUMP 배지: ${trumpBadges.length}개`);
    trumpBadges.forEach(item => {
      console.log(`  - ${item.ticker} (${item.company_name}): "${item.badge_text}" → "트럼프관련"`);
    });

    if (trumpBadges.length > 0) {
      const changes = await this.updatePromise(`
        UPDATE merry_picks_cache 
        SET 
          badge_text = '트럼프관련',
          badge_color = 'bg-gradient-to-r from-blue-500 to-red-500 text-white',
          updated_at = CURRENT_TIMESTAMP
        WHERE badge_type = 'trump'
      `);

      console.log(`✅ ${changes}개 TRUMP 배지 → "트럼프관련" 변경 완료`);
    } else {
      console.log('ℹ️ 변경할 TRUMP 배지 없음');
    }

    return trumpBadges.length;
  }

  // 업데이트 결과 검증
  async validateUpdates() {
    console.log('\n🔍 업데이트 결과 검증...');
    
    const updatedBadges = await this.queryPromise(`
      SELECT ticker, company_name, badge_type, badge_text, badge_color, rank_position
      FROM merry_picks_cache 
      WHERE badge_type IS NOT NULL 
      ORDER BY rank_position
    `);

    console.log(`📊 업데이트 후 배지 적용 종목: ${updatedBadges.length}개`);
    
    const newBadgeStats = updatedBadges.reduce((acc, item) => {
      acc[item.badge_type] = (acc[item.badge_type] || 0) + 1;
      return acc;
    }, {});

    console.log('🏷️ 새로운 배지 분포:', newBadgeStats);
    
    console.log('\n📝 최종 배지 목록:');
    updatedBadges.forEach((badge, idx) => {
      console.log(`  ${idx + 1}. ${badge.ticker} (${badge.company_name}) - ${badge.badge_type}: ${badge.badge_text}`);
    });

    // 검증: hot, new 배지 없는지 확인
    const hotNewRemaining = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM merry_picks_cache 
      WHERE badge_type IN ('hot', 'new')
    `);

    if (hotNewRemaining[0].count === 0) {
      console.log('✅ HOT/NEW 배지 완전 제거 확인');
    } else {
      console.log(`❌ HOT/NEW 배지 ${hotNewRemaining[0].count}개 남아있음`);
    }

    // 검증: trump 배지 텍스트 변경 확인
    const trumpUpdated = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM merry_picks_cache 
      WHERE badge_type = 'trump' AND badge_text = '트럼프관련'
    `);

    console.log(`✅ "트럼프관련" 배지: ${trumpUpdated[0].count}개`);

    return { updatedBadges, newBadgeStats };
  }

  // 메인 업데이트 프로세스
  async updateBadgeSystem() {
    console.log('🚀 배지 시스템 업데이트 시작...');
    
    try {
      // 1. 현재 상태 확인
      const { badges, badgeStats } = await this.checkCurrentBadges();
      
      // 2. HOT/NEW 배지 제거
      const removedCount = await this.removeHotNewBadges();
      
      // 3. TRUMP 배지 변경
      const updatedCount = await this.updateTrumpBadges();
      
      // 4. 결과 검증
      const { newBadgeStats } = await this.validateUpdates();

      console.log('\n🎯 배지 시스템 업데이트 완료!');
      console.log(`📊 제거된 HOT/NEW 배지: ${removedCount}개`);
      console.log(`🔄 변경된 TRUMP 배지: ${updatedCount}개`);
      console.log(`📈 최종 배지 분포:`, newBadgeStats);
      
      return { removedCount, updatedCount, newBadgeStats };

    } catch (error) {
      console.error('❌ 배지 시스템 업데이트 중 오류:', error);
      throw error;
    }
  }
}

async function main() {
  const updater = new BadgeSystemUpdater();
  
  try {
    await updater.connect();
    const result = await updater.updateBadgeSystem();
    
    console.log('\n✅ 배지 시스템 업데이트 성공!');
    console.log('📈 다음: 개발 서버에서 변경사항 확인');
    return result;
    
  } catch (error) {
    console.error('💥 배지 시스템 업데이트 실패:', error);
    throw error;
  } finally {
    await updater.close();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n🎉 배지 시스템 업데이트 성공');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { BadgeSystemUpdater };