/**
 * 🎯 Claude 직접 감정 분석 결과 저장
 * post_stock_analysis 테이블에 Claude의 수동 분석 결과 저장
 */

const Database = require('better-sqlite3');
const path = require('path');

class SentimentSaver {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database.db');
    this.db = new Database(this.dbPath);
    console.log(`💾 데이터베이스: ${this.dbPath}`);
  }

  /**
   * Claude 직접 분석 결과 저장
   */
  saveSentimentAnalysis() {
    console.log('🎯 Claude 직접 감정 분석 결과 저장 시작...');
    
    try {
      // 기존 데이터 삭제 (재분석 시)
      this.db.prepare(`
        DELETE FROM post_stock_analysis 
        WHERE log_no IN ('223984718208', '223982941308')
      `).run();
      
      // Claude 직접 분석 결과 데이터
      const analysisResults = [
        {
          log_no: '223982941308',
          ticker: 'JPY',
          sentiment: 'neutral',
          sentiment_score: 0.0,
          confidence: 0.85,
          reasoning: '일본은행의 금리정책 변화를 객관적으로 분석하며 중립적 톤을 유지. 우에다 총재 발언을 단순 해석하는 방향성으로 특별한 긍정/부정 표현 없음.',
          context_snippet: '일본은행의 금리인상 가능성이 한동안 보이지 않자 엔화는... 우에다 총재의 발언은 한마디로 "금리 인상을 서두르지 않고 천천히 하겠다"는 말임'
        },
        {
          log_no: '223984718208',
          ticker: 'FED',
          sentiment: 'negative',
          sentiment_score: -0.6,
          confidence: 0.90,
          reasoning: '트럼프의 연준 장악 시도에 대해 "본격적으로 싸우기 시작하는 것같다"며 갈등 우려 표현. "연준의 독립성이라는 신용이 무너지면, 생각보다 여파가 클 수 있다"는 부정적 전망 제시.',
          context_snippet: '쿡이사 문제로 트럼프와 연준이 본격적으로 싸우기 시작하는 것같다. 금융은 신용으로 돌아간다. 연준의 독립성이라는 신용이 무너지면, 생각보다 여파가 클 수 있다.'
        }
      ];
      
      // 데이터베이스에 저장
      const insertStmt = this.db.prepare(`
        INSERT INTO post_stock_analysis (
          log_no, ticker, sentiment, sentiment_score, confidence, reasoning, context_snippet
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      let savedCount = 0;
      
      for (const analysis of analysisResults) {
        try {
          insertStmt.run(
            analysis.log_no,
            analysis.ticker,
            analysis.sentiment,
            analysis.sentiment_score,
            analysis.confidence,
            analysis.reasoning,
            analysis.context_snippet
          );
          
          console.log(`✅ 저장 완료: logNo=${analysis.log_no}, ticker=${analysis.ticker}, sentiment=${analysis.sentiment}`);
          savedCount++;
          
        } catch (error) {
          console.error(`❌ 저장 실패: logNo=${analysis.log_no}, error=${error.message}`);
        }
      }
      
      console.log(`\n🎉 감정 분석 저장 완료: ${savedCount}개 결과`);
      
      // 저장된 데이터 확인
      const saved = this.db.prepare(`
        SELECT log_no, ticker, sentiment, sentiment_score, confidence
        FROM post_stock_analysis 
        WHERE log_no IN ('223984718208', '223982941308')
        ORDER BY log_no DESC
      `).all();
      
      console.log('\n📊 저장된 감정 분석 결과:');
      saved.forEach((row, index) => {
        const emoji = row.sentiment === 'positive' ? '🟢' : row.sentiment === 'negative' ? '🔴' : '🔵';
        console.log(`   ${index + 1}. ${emoji} logNo=${row.log_no}, ticker=${row.ticker}, sentiment=${row.sentiment} (${row.sentiment_score}), confidence=${row.confidence}`);
      });
      
      return savedCount;
      
    } catch (error) {
      console.error('❌ 감정 분석 저장 실패:', error.message);
      throw error;
    }
  }

  /**
   * 리소스 정리
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// 실행 함수
async function main() {
  const saver = new SentimentSaver();
  
  try {
    const count = saver.saveSentimentAnalysis();
    
    if (count > 0) {
      console.log(`\n🎯 Claude 직접 감정 분석 완료: ${count}개 결과 저장`);
      console.log('\n🔄 다음 단계:');
      console.log('1. 웹사이트 확인: http://localhost:3004/merry');
      console.log('2. 개별 포스트: http://localhost:3004/merry/posts/1031');
      console.log('3. 감정 분석 API: http://localhost:3004/api/merry/stocks/FED/sentiments');
    }
    
  } catch (error) {
    console.error('\n❌ 저장 실패:', error.message);
    process.exit(1);
  } finally {
    saver.close();
  }
}

// 명령줄 실행
if (require.main === module) {
  main();
}

module.exports = SentimentSaver;