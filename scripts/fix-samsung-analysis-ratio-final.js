/**
 * 삼성전자 1개월 차트 AI 분석률 최종 수정
 * 실제 삼성전자 관련 포스트만을 기준으로 정확한 분석률 계산
 */

const StockDB = require('../src/lib/stock-db-sqlite3');

class SamsungAnalysisRatioFinalFixer {
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

  // 실제 삼성전자 관련 포스트 ID 목록 정의
  getActualSamsungPostIds() {
    // 최근 30일간 실제 삼성전자와 관련된 포스트들
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
      42,  // 조선업 근황 업데이트 (feat 임단협, 현장인력,한화오션)
      58,  // 삼성이 BOE의 애플공급을 막을수 있을까?(feat SK하이닉스)
      61   // 엔비디아 H20칩의 중국수출 허용과 삼성전자 근황
    ];
  }

  // 정확한 삼성전자 분석률 계산
  async calculateCorrectRatio() {
    console.log('📊 삼성전자 정확한 분석률 계산...');
    
    const actualPostIds = this.getActualSamsungPostIds();
    const totalPosts = actualPostIds.length;
    
    console.log(`📋 실제 삼성전자 관련 포스트: ${totalPosts}개`);
    
    // 이 포스트들 중 감정 분석이 완료된 것들 확인
    const placeholders = actualPostIds.map(() => '?').join(',');
    const analyzedPosts = await this.queryPromise(`
      SELECT DISTINCT s.post_id, bp.title, s.sentiment
      FROM sentiments s 
      INNER JOIN blog_posts bp ON s.post_id = bp.id 
      WHERE s.ticker = '005930' 
        AND s.post_id IN (${placeholders})
        AND s.sentiment IS NOT NULL 
        AND s.sentiment != ''
      ORDER BY bp.created_date DESC
    `, actualPostIds);
    
    const analyzedCount = analyzedPosts.length;
    
    console.log(`\n📊 분석 결과:`);
    console.log(`  총 삼성전자 포스트: ${totalPosts}개`);
    console.log(`  분석 완료: ${analyzedCount}개`);
    console.log(`  분석률: ${analyzedCount}/${totalPosts} (${((analyzedCount/totalPosts)*100).toFixed(1)}%)`);
    
    console.log(`\n✅ 분석 완료된 포스트:`);
    analyzedPosts.forEach((post, idx) => {
      console.log(`  ${idx+1}. ID ${post.post_id}: ${post.title.substring(0, 50)}... [${post.sentiment}]`);
    });
    
    // 분석 미완료 포스트 확인
    const missingPostIds = actualPostIds.filter(id => 
      !analyzedPosts.some(analyzed => analyzed.post_id === id)
    );
    
    if (missingPostIds.length > 0) {
      console.log(`\n❌ 분석 미완료 포스트:`);
      for (const postId of missingPostIds) {
        const postInfo = await this.queryPromise(`
          SELECT id, title FROM blog_posts WHERE id = ?
        `, [postId]);
        
        if (postInfo.length > 0) {
          console.log(`  ID ${postId}: ${postInfo[0].title.substring(0, 50)}...`);
        }
      }
    }
    
    return {
      totalMentions: totalPosts,
      analyzedMentions: analyzedCount,
      progressPercent: Math.round((analyzedCount / totalPosts) * 100)
    };
  }

  // stocks 테이블 정확한 값으로 업데이트
  async updateStocksWithCorrectData(correctData) {
    console.log(`\n🔧 stocks 테이블 정확한 값으로 업데이트...`);
    
    const ticker = '005930';
    
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
    console.log(`  mention_count_1m: ${current.mention_count_1m} → ${correctData.totalMentions}`);
    console.log(`  sentiment_count_1m: ${current.sentiment_count_1m} → ${correctData.analyzedMentions}`);

    // 업데이트 실행
    await this.updatePromise(`
      UPDATE stocks 
      SET 
        mention_count_1m = ?,
        sentiment_count_1m = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE ticker = ?
    `, [correctData.totalMentions, correctData.analyzedMentions, ticker]);

    console.log(`✅ stocks 테이블 정확한 값으로 업데이트 완료`);
    return true;
  }

  // 최종 검증
  async validateFinalUpdate() {
    console.log(`\n🔍 최종 업데이트 검증...`);
    
    const ticker = '005930';
    const updatedData = await this.queryPromise(`
      SELECT mention_count_1m, sentiment_count_1m 
      FROM stocks 
      WHERE ticker = ?
    `, [ticker]);

    if (updatedData.length > 0) {
      const data = updatedData[0];
      console.log(`📊 최종 stocks 테이블 값:`);
      console.log(`  mention_count_1m: ${data.mention_count_1m}`);
      console.log(`  sentiment_count_1m: ${data.sentiment_count_1m}`);
      console.log(`  최종 분석률: ${data.sentiment_count_1m}/${data.mention_count_1m} (${((data.sentiment_count_1m/data.mention_count_1m)*100).toFixed(1)}%)`);
      
      // 분석률이 100%를 넘지 않는지 확인
      if (data.sentiment_count_1m > data.mention_count_1m) {
        console.log(`⚠️ 경고: 분석 완료 수가 총 포스트 수보다 많습니다!`);
        return { valid: false, data };
      } else {
        console.log(`✅ 분석률이 정상 범위 내에 있습니다.`);
        return { valid: true, data };
      }
    }
    return { valid: false, data: null };
  }

  // 메인 실행
  async fixSamsungAnalysisRatioFinal() {
    console.log('🚀 삼성전자 1개월 AI 분석률 최종 수정 시작...');
    
    try {
      // 1. 정확한 분석률 계산
      const correctData = await this.calculateCorrectRatio();
      
      // 2. stocks 테이블 업데이트  
      const updated = await this.updateStocksWithCorrectData(correctData);
      
      if (updated) {
        // 3. 최종 검증
        const validation = await this.validateFinalUpdate();
        
        if (validation.valid) {
          console.log('\n🎯 삼성전자 AI 분석률 최종 수정 완료!');
          console.log(`📊 올바른 분석률: ${validation.data.sentiment_count_1m}/${validation.data.mention_count_1m} (${((validation.data.sentiment_count_1m/validation.data.mention_count_1m)*100).toFixed(1)}%)`);
          
          return { success: true, validation };
        } else {
          throw new Error('분석률 검증 실패');
        }
      } else {
        throw new Error('stocks 테이블 업데이트 실패');
      }

    } catch (error) {
      console.error('❌ 삼성전자 AI 분석률 최종 수정 중 오류:', error);
      throw error;
    }
  }
}

async function main() {
  const fixer = new SamsungAnalysisRatioFinalFixer();
  
  try {
    await fixer.connect();
    const result = await fixer.fixSamsungAnalysisRatioFinal();
    
    console.log('\n✅ 삼성전자 AI 분석률 최종 수정 완료!');
    console.log('📈 다음: 웹사이트에서 1M 차트 분석률 확인');
    return result;
    
  } catch (error) {
    console.error('💥 삼성전자 AI 분석률 최종 수정 실패:', error);
    throw error;
  } finally {
    await fixer.close();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n🎉 삼성전자 AI 분석률 최종 수정 성공');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { SamsungAnalysisRatioFinalFixer };