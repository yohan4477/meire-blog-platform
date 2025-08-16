const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const db = new sqlite3.Database(path.join(__dirname, '..', 'database.db'));

async function migrateSamsungToClaudeTable() {
  console.log('🚀 삼성전자 감정 분석 데이터를 Claude 테이블로 이전 중...');

  try {
    // 삼성전자 감정 분석 데이터와 상세 정보를 조회
    const sentimentData = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          pss.post_id,
          pss.ticker,
          pss.sentiment,
          pss.sentiment_score,
          pss.confidence,
          pss.keywords,
          pss.context_snippet,
          sd.key_reasoning,
          sd.supporting_evidence,
          sd.investment_perspective,
          sd.investment_timeframe,
          sd.conviction_level,
          sd.uncertainty_factors,
          sd.mention_context
        FROM post_stock_sentiments pss
        LEFT JOIN sentiment_details sd ON pss.post_id = sd.post_id AND pss.ticker = sd.ticker
        WHERE pss.ticker = '005930'
        ORDER BY pss.post_id
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    console.log(`📊 발견된 삼성전자 감정 분석 데이터: ${sentimentData.length}개`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const data of sentimentData) {
      // 이미 Claude 테이블에 있는지 확인
      const existing = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM post_stock_sentiments_claude WHERE post_id = ? AND ticker = ?',
          [data.post_id, data.ticker],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // 상세 정보 파싱
      const supportingEvidence = data.supporting_evidence ? 
        (typeof data.supporting_evidence === 'string' ? data.supporting_evidence : JSON.stringify(data.supporting_evidence)) : null;
      
      const investmentPerspective = data.investment_perspective ?
        (typeof data.investment_perspective === 'string' ? data.investment_perspective : JSON.stringify(data.investment_perspective)) : null;
      
      const uncertaintyFactors = data.uncertainty_factors ?
        (typeof data.uncertainty_factors === 'string' ? data.uncertainty_factors : JSON.stringify(data.uncertainty_factors)) : null;

      // 투자 기간 값 정규화
      let normalizedTimeframe = data.investment_timeframe || '중기';
      if (!['단기', '중기', '장기', '불명'].includes(normalizedTimeframe)) {
        if (normalizedTimeframe.includes('장기') || normalizedTimeframe.includes('중장기')) {
          normalizedTimeframe = '장기';
        } else if (normalizedTimeframe.includes('단기')) {
          normalizedTimeframe = '단기';
        } else {
          normalizedTimeframe = '중기';
        }
      }

      // Claude 테이블에 삽입
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO post_stock_sentiments_claude 
          (post_id, ticker, sentiment, sentiment_score, confidence, 
           key_reasoning, supporting_evidence, key_keywords, context_quotes,
           investment_perspective, investment_timeframe, conviction_level,
           mention_context, analysis_focus, uncertainty_factors,
           analyzed_at, claude_model)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'claude-samsung-analysis')
        `, [
          data.post_id,
          data.ticker,
          data.sentiment,
          data.sentiment_score,
          data.confidence,
          data.key_reasoning || `삼성전자에 대한 ${data.sentiment} 분석이 수행되었습니다.`,
          supportingEvidence,
          data.keywords || '[]',
          `["삼성전자 관련 언급"]`, // context_quotes
          investmentPerspective,
          normalizedTimeframe,
          data.conviction_level || '보통',
          data.mention_context || '투자 블로그 포스트에서 언급됨',
          '삼성전자 투자 분석',
          uncertaintyFactors
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      migratedCount++;
      console.log(`✅ Post ${data.post_id}: ${data.sentiment} (신뢰도: ${(data.confidence * 100).toFixed(0)}%) 이전 완료`);
    }

    // 결과 확인
    const claudeCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM post_stock_sentiments_claude WHERE ticker = ?',
        ['005930'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    console.log('\n📈 이전 결과:');
    console.log(`  - 새로 이전: ${migratedCount}개`);
    console.log(`  - 기존 데이터: ${skippedCount}개`);
    console.log(`  - Claude 테이블 총 데이터: ${claudeCount}개`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }

  db.close();
  console.log('✅ 삼성전자 데이터 이전 완료!');
}

// 실행
migrateSamsungToClaudeTable().catch(console.error);