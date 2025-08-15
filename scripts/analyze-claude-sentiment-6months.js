#!/usr/bin/env node

/**
 * 6개월치 포스트 Claude AI 감정 분석 배치 실행 스크립트
 * 
 * 사용법:
 * node scripts/analyze-claude-sentiment-6months.js
 * 
 * 환경 변수:
 * CLAUDE_API_KEY=your_api_key_here
 * ANALYSIS_LIMIT=100 (선택적, 기본값 100)
 */

require('dotenv').config();
const path = require('path');
const ClaudeSentimentAnalyzer = require('../src/lib/claude-sentiment-analyzer');
const { execSync } = require('child_process');

class ClaudeSentimentBatchProcessor {
  constructor() {
    this.analyzer = new ClaudeSentimentAnalyzer();
    this.startTime = Date.now();
  }

  /**
   * 데이터베이스 스키마 초기화
   */
  async initializeDatabase() {
    console.log('🗄️ 데이터베이스 스키마 초기화 중...');
    
    try {
      const sqlFile = path.join(__dirname, 'setup-claude-sentiment-db.sql');
      const command = `sqlite3 database.db < "${sqlFile}"`;
      
      execSync(command, { cwd: path.join(__dirname, '..') });
      console.log('✅ 데이터베이스 스키마 초기화 완료');
    } catch (error) {
      console.error('❌ 데이터베이스 초기화 실패:', error.message);
      throw error;
    }
  }

  /**
   * 환경 변수 검증
   */
  validateEnvironment() {
    console.log('🔍 환경 설정 검증 중...');
    
    if (!process.env.CLAUDE_API_KEY) {
      console.error('❌ CLAUDE_API_KEY 환경 변수가 설정되지 않았습니다.');
      console.log('💡 .env.local 파일에 CLAUDE_API_KEY=your_api_key_here 를 추가하세요.');
      process.exit(1);
    }
    
    console.log('✅ Claude API 키 확인됨');
    
    const analysisLimit = parseInt(process.env.ANALYSIS_LIMIT) || 100;
    console.log(`📊 분석 제한: ${analysisLimit}개 포스트`);
    
    return { analysisLimit };
  }

  /**
   * 기존 분석 현황 조회
   */
  async getAnalysisStatus() {
    console.log('📈 기존 분석 현황 확인 중...');
    
    await this.analyzer.stockDB.connect();
    
    try {
      // 6개월치 포스트 총 개수
      const totalPosts = await new Promise((resolve, reject) => {
        this.analyzer.stockDB.db.get(`
          SELECT COUNT(*) as count 
          FROM blog_posts 
          WHERE created_date >= date('now', '-6 months')
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      // 이미 분석된 포스트 개수
      const analyzedPosts = await new Promise((resolve, reject) => {
        this.analyzer.stockDB.db.get(`
          SELECT COUNT(DISTINCT post_id) as count 
          FROM post_stock_sentiments_claude psc
          JOIN blog_posts bp ON psc.post_id = bp.id
          WHERE bp.created_date >= date('now', '-6 months')
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      // 총 감정 분석 개수
      const totalSentiments = await new Promise((resolve, reject) => {
        this.analyzer.stockDB.db.get(`
          SELECT COUNT(*) as count 
          FROM post_stock_sentiments_claude psc
          JOIN blog_posts bp ON psc.post_id = bp.id
          WHERE bp.created_date >= date('now', '-6 months')
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      console.log(`📊 6개월치 포스트: ${totalPosts}개`);
      console.log(`✅ 분석 완료 포스트: ${analyzedPosts}개`);
      console.log(`🎯 총 감정 분석: ${totalSentiments}개`);
      console.log(`⏳ 미분석 포스트: ${totalPosts - analyzedPosts}개`);

      return {
        totalPosts,
        analyzedPosts,
        totalSentiments,
        remainingPosts: totalPosts - analyzedPosts
      };

    } finally {
      this.analyzer.stockDB.close();
    }
  }

  /**
   * 메인 실행 함수
   */
  async run() {
    try {
      console.log('🚀 Claude AI 6개월치 감정 분석 시작');
      console.log('='.repeat(50));

      // 1. 환경 설정 검증
      const { analysisLimit } = this.validateEnvironment();

      // 2. 데이터베이스 초기화
      await this.initializeDatabase();

      // 3. 기존 분석 현황 확인
      const status = await this.getAnalysisStatus();

      if (status.remainingPosts === 0) {
        console.log('🎉 모든 6개월치 포스트 분석이 이미 완료되었습니다!');
        await this.showAnalysisResults();
        return;
      }

      console.log('\n🤖 Claude AI 분석 시작...');
      console.log('⚠️  API 비용이 발생합니다. 계속하시겠습니까? (Ctrl+C로 중단)');
      
      // 3초 대기 (사용자가 중단할 수 있도록)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. 배치 분석 실행
      await this.analyzer.analyzeSixMonthsPosts(analysisLimit);

      // 5. 결과 요약 출력
      await this.showAnalysisResults();

    } catch (error) {
      console.error('💥 분석 중 치명적 오류 발생:', error);
      process.exit(1);
    }
  }

  /**
   * 분석 결과 요약 출력
   */
  async showAnalysisResults() {
    console.log('\n📊 분석 결과 요약');
    console.log('='.repeat(30));

    await this.analyzer.stockDB.connect();

    try {
      // 총 감정 분석 통계
      const overallStats = await new Promise((resolve, reject) => {
        this.analyzer.stockDB.db.get(`
          SELECT 
            COUNT(*) as total_analyses,
            AVG(confidence) as avg_confidence,
            COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive_count,
            COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_count,
            COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral_count,
            SUM(api_cost) as total_cost
          FROM post_stock_sentiments_claude psc
          JOIN blog_posts bp ON psc.post_id = bp.id
          WHERE bp.created_date >= date('now', '-6 months')
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // 종목별 통계 (상위 10개)
      const tickerStats = await new Promise((resolve, reject) => {
        this.analyzer.stockDB.db.all(`
          SELECT 
            ticker,
            COUNT(*) as mention_count,
            AVG(confidence) as avg_confidence,
            COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive,
            COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative,
            COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral
          FROM post_stock_sentiments_claude psc
          JOIN blog_posts bp ON psc.post_id = bp.id
          WHERE bp.created_date >= date('now', '-6 months')
          GROUP BY ticker
          ORDER BY mention_count DESC
          LIMIT 10
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // 결과 출력
      console.log(`📈 총 감정 분석: ${overallStats.total_analyses}개`);
      console.log(`🎯 평균 신뢰도: ${(overallStats.avg_confidence * 100).toFixed(1)}%`);
      console.log(`🟢 긍정적: ${overallStats.positive_count}개`);
      console.log(`🔴 부정적: ${overallStats.negative_count}개`);
      console.log(`🔵 중립적: ${overallStats.neutral_count}개`);
      if (overallStats.total_cost > 0) {
        console.log(`💰 총 API 비용: $${overallStats.total_cost.toFixed(4)}`);
      }

      console.log('\n🏆 주요 언급 종목 (TOP 10):');
      tickerStats.forEach((ticker, index) => {
        console.log(`${index + 1}. ${ticker.ticker}: ${ticker.mention_count}회 (신뢰도: ${(ticker.avg_confidence * 100).toFixed(0)}%)`);
        console.log(`   🟢${ticker.positive} 🔴${ticker.negative} 🔵${ticker.neutral}`);
      });

      const elapsedTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
      console.log(`\n⏱️  총 실행 시간: ${elapsedTime}초`);
      console.log('✅ Claude AI 감정 분석 완료!');

    } finally {
      this.analyzer.stockDB.close();
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const processor = new ClaudeSentimentBatchProcessor();
  processor.run().catch(error => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });
}

module.exports = ClaudeSentimentBatchProcessor;