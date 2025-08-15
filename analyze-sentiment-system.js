const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function analyzeSentimentSystem() {
  const db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });
  
  try {
    console.log('📊 메르 블로그 플랫폼 감정 분석 시스템 종합 분석\n');
    
    // 1. post_stock_sentiments 테이블 구조 확인
    console.log('🗄️ 1. post_stock_sentiments 테이블 구조:');
    const tableSchema = await db.all('PRAGMA table_info(post_stock_sentiments)');
    tableSchema.forEach(col => {
      console.log(`   ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 2. 저장된 데이터 현황
    console.log('\n📈 2. 저장된 감정 분석 데이터 현황:');
    const dataStats = await db.get(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT ticker) as unique_tickers,
        COUNT(DISTINCT post_id) as unique_posts,
        AVG(confidence) as avg_confidence,
        MIN(analyzed_at) as first_analysis,
        MAX(analyzed_at) as last_analysis
      FROM post_stock_sentiments
    `);
    
    console.log(`   총 레코드: ${dataStats.total_records}개`);
    console.log(`   고유 종목: ${dataStats.unique_tickers}개`);
    console.log(`   고유 포스트: ${dataStats.unique_posts}개`);
    console.log(`   평균 신뢰도: ${(dataStats.avg_confidence * 100).toFixed(1)}%`);
    console.log(`   최초 분석: ${dataStats.first_analysis}`);
    console.log(`   최근 분석: ${dataStats.last_analysis}`);
    
    // 3. 종목별 감정 분석 현황
    console.log('\n🎯 3. 종목별 감정 분석 현황:');
    const tickerStats = await db.all(`
      SELECT 
        ticker,
        COUNT(*) as mention_count,
        AVG(confidence) as avg_confidence,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_count
      FROM post_stock_sentiments
      GROUP BY ticker
      ORDER BY mention_count DESC
      LIMIT 10
    `);
    
    tickerStats.forEach(stat => {
      console.log(`   ${stat.ticker}: ${stat.mention_count}개 언급`);
      console.log(`     긍정: ${stat.positive_count}, 부정: ${stat.negative_count}, 중립: ${stat.neutral_count}`);
      console.log(`     평균 신뢰도: ${(stat.avg_confidence * 100).toFixed(1)}%`);
    });
    
    // 4. 샘플 데이터 상세 분석
    console.log('\n🔍 4. 샘플 데이터 상세 분석 (TSLA):');
    const tslaSamples = await db.all(`
      SELECT 
        pss.sentiment,
        pss.sentiment_score,
        pss.confidence,
        pss.context_snippet,
        bp.title as post_title,
        bp.created_date
      FROM post_stock_sentiments pss
      JOIN blog_posts bp ON pss.post_id = bp.id
      WHERE pss.ticker = 'TSLA'
      ORDER BY bp.created_date DESC
      LIMIT 5
    `);
    
    tslaSamples.forEach((sample, idx) => {
      console.log(`\n   샘플 ${idx + 1}:`);
      console.log(`     포스트: "${sample.post_title?.substring(0, 60)}..."`);
      console.log(`     날짜: ${new Date(sample.created_date).toLocaleDateString('ko-KR')}`);
      console.log(`     감정: ${sample.sentiment} (점수: ${sample.sentiment_score?.toFixed(2)}, 신뢰도: ${(sample.confidence * 100).toFixed(0)}%)`);
      console.log(`     컨텍스트: "${sample.context_snippet?.substring(0, 100)}..."`);
    });
    
    // 5. 데이터 품질 분석
    console.log('\n📊 5. 데이터 품질 분석:');
    
    // 감정 분포
    const sentimentDistribution = await db.all(`
      SELECT sentiment, COUNT(*) as count, 
             ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM post_stock_sentiments), 1) as percentage
      FROM post_stock_sentiments
      GROUP BY sentiment
      ORDER BY count DESC
    `);
    
    console.log('   감정 분포:');
    sentimentDistribution.forEach(dist => {
      console.log(`     ${dist.sentiment}: ${dist.count}개 (${dist.percentage}%)`);
    });
    
    // 신뢰도 분포
    const confidenceStats = await db.get(`
      SELECT 
        MIN(confidence) as min_conf,
        MAX(confidence) as max_conf,
        AVG(confidence) as avg_conf,
        COUNT(CASE WHEN confidence >= 0.8 THEN 1 END) as high_conf_count,
        COUNT(CASE WHEN confidence < 0.5 THEN 1 END) as low_conf_count
      FROM post_stock_sentiments
    `);
    
    console.log('\n   신뢰도 분포:');
    console.log(`     최소: ${(confidenceStats.min_conf * 100).toFixed(1)}%`);
    console.log(`     최대: ${(confidenceStats.max_conf * 100).toFixed(1)}%`);
    console.log(`     평균: ${(confidenceStats.avg_conf * 100).toFixed(1)}%`);
    console.log(`     고신뢰도(≥80%): ${confidenceStats.high_conf_count}개`);
    console.log(`     저신뢰도(<50%): ${confidenceStats.low_conf_count}개`);
    
    // 6. 시간별 분석 현황
    console.log('\n📅 6. 시간별 분석 현황:');
    const timeStats = await db.all(`
      SELECT 
        DATE(bp.created_date) as analysis_date,
        COUNT(*) as daily_count
      FROM post_stock_sentiments pss
      JOIN blog_posts bp ON pss.post_id = bp.id
      WHERE bp.created_date >= datetime('now', '-30 days')
      GROUP BY DATE(bp.created_date)
      ORDER BY analysis_date DESC
      LIMIT 10
    `);
    
    console.log('   최근 30일 일별 분석 건수:');
    timeStats.forEach(stat => {
      console.log(`     ${stat.analysis_date}: ${stat.daily_count}건`);
    });
    
    // 7. 현재 시스템의 한계점 식별
    console.log('\n⚠️ 7. 현재 시스템의 한계점:');
    
    // 빈 키워드 확인
    const emptyKeywords = await db.get(`
      SELECT COUNT(*) as count 
      FROM post_stock_sentiments 
      WHERE keywords IS NULL OR keywords = '' OR keywords = '{}'
    `);
    console.log(`   빈 키워드 데이터: ${emptyKeywords.count}개`);
    
    // 짧은 컨텍스트 확인
    const shortContext = await db.get(`
      SELECT COUNT(*) as count 
      FROM post_stock_sentiments 
      WHERE LENGTH(context_snippet) < 100
    `);
    console.log(`   짧은 컨텍스트(<100자): ${shortContext.count}개`);
    
    // 중복 분석 확인
    const duplicates = await db.get(`
      SELECT COUNT(*) as total_count, COUNT(DISTINCT post_id, ticker) as unique_count
      FROM post_stock_sentiments
    `);
    const duplicateCount = duplicates.total_count - duplicates.unique_count;
    console.log(`   중복 분석: ${duplicateCount}개`);
    
    console.log('\n✅ 감정 분석 시스템 종합 분석 완료');
    
  } catch (error) {
    console.error('❌ 분석 중 오류:', error);
  } finally {
    await db.close();
  }
}

analyzeSentimentSystem().catch(console.error);