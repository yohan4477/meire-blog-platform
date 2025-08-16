#!/usr/bin/env node

/**
 * Claude AI 분석 데이터를 sentiment_details 테이블로 마이그레이션
 * 
 * post_stock_sentiments_claude → sentiment_details 변환
 * 고품질 Claude AI 분석을 기존 sentiment_details 형식으로 복구
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ClaudeToSentimentDetailsMigrator {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '..', 'database.db'));
    this.migrationStats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * 메인 마이그레이션 실행
   */
  async migrate() {
    console.log('🚀 Claude AI → sentiment_details 마이그레이션 시작...');
    console.log('='.repeat(50));

    try {
      // 1. Claude 데이터 조회
      const claudeData = await this.getClaudeAnalysisData();
      console.log(`📊 Claude AI 분석 데이터: ${claudeData.length}개`);

      if (claudeData.length === 0) {
        console.log('⚠️  마이그레이션할 Claude 데이터가 없습니다.');
        return;
      }

      // 2. 각 레코드 변환 및 삽입
      for (const record of claudeData) {
        await this.processRecord(record);
      }

      // 3. 결과 요약
      this.showMigrationResults();

    } catch (error) {
      console.error('💥 마이그레이션 중 오류:', error);
    } finally {
      this.db.close();
    }
  }

  /**
   * Claude 분석 데이터 조회
   */
  async getClaudeAnalysisData() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          psc.id,
          psc.post_id,
          psc.ticker,
          psc.sentiment,
          psc.sentiment_score,
          psc.confidence,
          psc.key_reasoning,
          psc.supporting_evidence,
          psc.key_keywords,
          psc.context_quotes,
          psc.investment_perspective,
          psc.investment_timeframe,
          psc.conviction_level,
          psc.mention_context,
          psc.analysis_focus,
          psc.uncertainty_factors,
          psc.analyzed_at,
          bp.created_date as post_date
        FROM post_stock_sentiments_claude psc
        JOIN blog_posts bp ON psc.post_id = bp.id
        ORDER BY psc.analyzed_at ASC
      `;

      this.db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 개별 레코드 처리
   */
  async processRecord(record) {
    try {
      this.migrationStats.processed++;
      console.log(`\n🔄 [${this.migrationStats.processed}] 처리 중: ${record.ticker} (Post ${record.post_id})`);

      // 기존 sentiment_details 확인
      const existingRecord = await this.checkExistingRecord(record.post_id, record.ticker);
      if (existingRecord) {
        console.log(`  ⏭️  이미 존재: ID ${existingRecord.id}`);
        this.migrationStats.skipped++;
        return;
      }

      // sentiment_details 형식으로 변환
      const sentimentDetail = this.convertToSentimentDetail(record);

      // 데이터베이스에 삽입
      const insertedId = await this.insertSentimentDetail(sentimentDetail);
      
      console.log(`  ✅ 성공: ID ${insertedId} - ${record.sentiment} (신뢰도: ${(record.confidence * 100).toFixed(0)}%)`);
      console.log(`     💡 ${sentimentDetail.key_reasoning.substring(0, 60)}...`);
      
      this.migrationStats.successful++;

    } catch (error) {
      console.error(`  ❌ 실패: ${record.ticker} (Post ${record.post_id})`, error.message);
      this.migrationStats.failed++;
    }
  }

  /**
   * 기존 레코드 확인
   */
  async checkExistingRecord(postId, ticker) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id FROM sentiment_details WHERE post_id = ? AND ticker = ?',
        [postId, ticker],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  /**
   * Claude 데이터를 sentiment_details 형식으로 변환
   */
  convertToSentimentDetail(record) {
    // supporting_evidence JSON 파싱
    let supportingEvidence = {};
    try {
      supportingEvidence = record.supporting_evidence ? JSON.parse(record.supporting_evidence) : {};
    } catch (e) {
      console.warn(`지원 증거 파싱 실패: ${e.message}`);
      supportingEvidence = {};
    }

    // investment_perspective JSON 파싱
    let investmentPerspective = [];
    try {
      investmentPerspective = record.investment_perspective ? JSON.parse(record.investment_perspective) : [];
    } catch (e) {
      console.warn(`투자 관점 파싱 실패: ${e.message}`);
      investmentPerspective = [];
    }

    // uncertainty_factors JSON 파싱
    let uncertaintyFactors = [];
    try {
      uncertaintyFactors = record.uncertainty_factors ? JSON.parse(record.uncertainty_factors) : [];
    } catch (e) {
      console.warn(`불확실성 요인 파싱 실패: ${e.message}`);
      uncertaintyFactors = [];
    }

    // analysis_date 계산 (post 생성일 기준)
    const analysisDate = record.post_date ? record.post_date.split(' ')[0] : new Date().toISOString().split('T')[0];

    return {
      post_id: record.post_id,
      ticker: record.ticker,
      key_reasoning: record.key_reasoning || '분석 근거 없음',
      supporting_evidence: JSON.stringify(supportingEvidence),
      investment_perspective: JSON.stringify(investmentPerspective),
      investment_timeframe: record.investment_timeframe || '중기',
      conviction_level: record.conviction_level || '보통',
      uncertainty_factors: JSON.stringify(uncertaintyFactors),
      mention_context: record.mention_context || '일반적 언급',
      analysis_date: analysisDate
    };
  }

  /**
   * sentiment_details 테이블에 삽입
   */
  async insertSentimentDetail(sentimentDetail) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO sentiment_details 
        (post_id, ticker, key_reasoning, supporting_evidence, investment_perspective, 
         investment_timeframe, conviction_level, uncertainty_factors, mention_context, analysis_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(query, [
        sentimentDetail.post_id,
        sentimentDetail.ticker,
        sentimentDetail.key_reasoning,
        sentimentDetail.supporting_evidence,
        sentimentDetail.investment_perspective,
        sentimentDetail.investment_timeframe,
        sentimentDetail.conviction_level,
        sentimentDetail.uncertainty_factors,
        sentimentDetail.mention_context,
        sentimentDetail.analysis_date
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  /**
   * 마이그레이션 결과 요약
   */
  showMigrationResults() {
    console.log('\n📊 마이그레이션 완료 결과');
    console.log('='.repeat(30));
    console.log(`📈 처리된 레코드: ${this.migrationStats.processed}개`);
    console.log(`✅ 성공: ${this.migrationStats.successful}개`);
    console.log(`⏭️  스킵: ${this.migrationStats.skipped}개`);
    console.log(`❌ 실패: ${this.migrationStats.failed}개`);

    const successRate = this.migrationStats.processed > 0 
      ? ((this.migrationStats.successful / this.migrationStats.processed) * 100).toFixed(1)
      : 0;
    console.log(`🎯 성공률: ${successRate}%`);

    if (this.migrationStats.successful > 0) {
      console.log('\n🎉 고품질 Claude AI 분석이 sentiment_details 테이블로 성공적으로 마이그레이션되었습니다!');
      console.log('💡 이제 차트에서 더 정확한 감정 분석 근거를 확인할 수 있습니다.');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const migrator = new ClaudeToSentimentDetailsMigrator();
  migrator.migrate().catch(error => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });
}

module.exports = ClaudeToSentimentDetailsMigrator;