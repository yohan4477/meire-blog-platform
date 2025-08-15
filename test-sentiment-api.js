const fetch = require('node-fetch');

async function testSentimentAPI() {
  try {
    console.log('🧪 Testing sentiment analysis API...');
    
    const response = await fetch('http://localhost:3004/api/merry/stocks/TSLA/sentiments?period=6mo');
    
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n📊 Sentiment API Response Structure:');
    console.log('- Ticker:', data.ticker);
    console.log('- Period:', data.period);
    console.log('- Total Mentions:', data.totalMentions);
    console.log('- Average Confidence:', data.averageConfidence?.toFixed(2));
    
    console.log('\n📈 Sentiment Summary:');
    console.log('- Positive:', data.summary?.positive || 0);
    console.log('- Negative:', data.summary?.negative || 0);
    console.log('- Neutral:', data.summary?.neutral || 0);
    console.log('- Total:', data.summary?.total || 0);
    
    console.log('\n🗓️ Sentiment by Date:');
    const dates = Object.keys(data.sentimentByDate || {});
    console.log(`Available dates: ${dates.length}`);
    
    if (dates.length > 0) {
      // Show first few dates with details
      const sampleDates = dates.slice(0, 3);
      
      sampleDates.forEach(date => {
        const dayData = data.sentimentByDate[date];
        console.log(`\n📅 ${date}:`);
        console.log(`  Sentiments: ${dayData.sentiments?.length || 0}개`);
        console.log(`  Posts: ${dayData.posts?.length || 0}개`);
        
        if (dayData.sentiments && dayData.sentiments.length > 0) {
          const sentiment = dayData.sentiments[0];
          console.log(`  감정: ${sentiment.sentiment} (신뢰도: ${(sentiment.confidence * 100).toFixed(0)}%)`);
          console.log(`  컨텍스트: ${sentiment.context?.substring(0, 100)}...`);
        }
        
        if (dayData.posts && dayData.posts.length > 0) {
          const post = dayData.posts[0];
          console.log(`  포스트: "${post.title?.substring(0, 50)}..."`);
        }
      });
    }
    
    console.log('\n✅ Sentiment API test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSentimentAPI();