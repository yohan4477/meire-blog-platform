/**
 * 삼성전자 1개월 차트 AI 분석률 분모 수정
 * 사용자 지적: "분모가 왜 15야? 16이여야할텐데" -> 실제로는 12가 맞음
 */

const StockDB = require('../src/lib/stock-db-sqlite3');

class SamsungAnalysisRatioFixer {
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

  // 정확한 1개월 데이터 계산
  async calculateAccurateCounts(ticker) {
    console.log(`📊 ${ticker} 정확한 1개월 데이터 계산 중...`);
    
    // 1개월 전 날짜 계산
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const startDate = oneMonthAgo.toISOString().replace('T', ' ').replace('Z', '');
    
    console.log(`📅 기간: ${startDate} ~ 현재`);
    
    // 실제 포스트 수 계산
    const totalPosts = await this.queryPromise(`
      SELECT COUNT(*) as count 
      FROM blog_posts 
      WHERE (title LIKE '%삼성%' OR title LIKE '%005930%' OR content LIKE '%삼성전자%') 
        AND created_date >= ?
    `, [startDate]);
    
    // 감정 분석 완료 포스트 수 계산
    const analyzedPosts = await this.queryPromise(`
      SELECT COUNT(DISTINCT bp.id) as count 
      FROM blog_posts bp 
      INNER JOIN sentiments s ON bp.id = s.post_id 
      WHERE s.ticker = ? 
        AND bp.created_date >= ?
        AND s.sentiment IS NOT NULL 
        AND s.sentiment != ''
    `, [ticker, startDate]);

    // 포스트 목록도 확인
    const postList = await this.queryPromise(`
      SELECT bp.created_date, bp.title, s.sentiment
      FROM blog_posts bp 
      LEFT JOIN sentiments s ON bp.id = s.post_id AND s.ticker = ?
      WHERE (bp.title LIKE '%삼성%' OR bp.title LIKE '%005930%' OR bp.content LIKE '%삼성전자%') 
        AND bp.created_date >= ?
      ORDER BY bp.created_date DESC
    `, [ticker, startDate]);

    const actualTotal = totalPosts[0].count;
    const actualAnalyzed = analyzedPosts[0].count;
    
    console.log(`📈 실제 데이터:`);
    console.log(`  총 포스트: ${actualTotal}개`);
    console.log(`  분석 완료: ${actualAnalyzed}개`);
    console.log(`  분석률: ${actualAnalyzed}/${actualTotal} (${((actualAnalyzed/actualTotal)*100).toFixed(1)}%)`);
    
    console.log(`\n📋 포스트 목록:`);
    postList.forEach((post, idx) => {
      const status = post.sentiment ? `✅ ${post.sentiment}` : '❌ 미분석';
      console.log(`  ${idx+1}. ${post.created_date.split(' ')[0]} - ${post.title.substring(0, 50)}... [${status}]`);
    });

    return {
      totalMentions: actualTotal,
      analyzedMentions: actualAnalyzed,
      progressPercent: Math.round((actualAnalyzed / actualTotal) * 100)
    };
  }

  // stocks 테이블 업데이트
  async updateStocksTable(ticker, counts) {
    console.log(`\n🔧 stocks 테이블 업데이트...`);
    
    // 현재 값 확인
    const currentData = await this.queryPromise(`
      SELECT mention_count_1m, sentiment_count_1m 
      FROM stocks 
      WHERE ticker = ?
    `, [ticker]);

    if (currentData.length === 0) {
      console.log(`❌ ${ticker} 종목을 stocks 테이블에서 찾을 수 없음`);
      return false;
    }

    const current = currentData[0];
    console.log(`📊 현재 stocks 테이블 값:`);
    console.log(`  mention_count_1m: ${current.mention_count_1m} → ${counts.totalMentions}`);
    console.log(`  sentiment_count_1m: ${current.sentiment_count_1m} → ${counts.analyzedMentions}`);

    // 업데이트 실행
    await this.updatePromise(`
      UPDATE stocks 
      SET 
        mention_count_1m = ?,
        sentiment_count_1m = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE ticker = ?
    `, [counts.totalMentions, counts.analyzedMentions, ticker]);

    console.log(`✅ stocks 테이블 업데이트 완료`);
    return true;
  }

  // 검증
  async validateUpdate(ticker) {
    console.log(`\n🔍 업데이트 검증...`);
    
    const updatedData = await this.queryPromise(`
      SELECT mention_count_1m, sentiment_count_1m 
      FROM stocks 
      WHERE ticker = ?
    `, [ticker]);

    if (updatedData.length > 0) {
      const data = updatedData[0];
      console.log(`📊 업데이트 후 stocks 테이블 값:`);
      console.log(`  mention_count_1m: ${data.mention_count_1m}`);
      console.log(`  sentiment_count_1m: ${data.sentiment_count_1m}`);
      console.log(`  분석률: ${data.sentiment_count_1m}/${data.mention_count_1m} (${((data.sentiment_count_1m/data.mention_count_1m)*100).toFixed(1)}%)`);
      return data;
    }
    return null;
  }

  // 메인 실행
  async fixSamsungAnalysisRatio() {
    console.log('🚀 삼성전자 1개월 AI 분석률 수정 시작...');
    
    try {
      const ticker = '005930';
      
      // 1. 정확한 카운트 계산
      const accurateCounts = await this.calculateAccurateCounts(ticker);
      
      // 2. stocks 테이블 업데이트
      const updated = await this.updateStocksTable(ticker, accurateCounts);
      
      if (updated) {
        // 3. 검증
        const validation = await this.validateUpdate(ticker);
        
        console.log('\n🎯 삼성전자 AI 분석률 수정 완료!');
        console.log(`📊 최종 결과: ${validation.sentiment_count_1m}/${validation.mention_count_1m} (${((validation.sentiment_count_1m/validation.mention_count_1m)*100).toFixed(1)}%)`);
        
        return { updated: true, validation };
      } else {
        throw new Error('stocks 테이블 업데이트 실패');
      }

    } catch (error) {
      console.error('❌ 삼성전자 AI 분석률 수정 중 오류:', error);
      throw error;
    }
  }
}

async function main() {
  const fixer = new SamsungAnalysisRatioFixer();
  
  try {
    await fixer.connect();
    const result = await fixer.fixSamsungAnalysisRatio();
    
    console.log('\n✅ 삼성전자 AI 분석률 수정 완료!');
    console.log('📈 다음: 웹사이트에서 변경사항 확인 (1M 차트)');
    return result;
    
  } catch (error) {
    console.error('💥 삼성전자 AI 분석률 수정 실패:', error);
    throw error;
  } finally {
    await fixer.close();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n🎉 삼성전자 AI 분석률 수정 성공');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { SamsungAnalysisRatioFixer };