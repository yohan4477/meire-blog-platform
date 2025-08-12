#!/usr/bin/env node
/**
 * 메르 블로그에서 종목별 언급된 포스트 개수 계산 스크립트
 */

const path = require('path');
const fs = require('fs');

// ../src/lib/database.ts 의 query 함수를 import할 수 없으므로 API로 데이터 가져오기
async function fetchPosts() {
  const response = await fetch('http://localhost:3003/api/merry?limit=1000');
  const data = await response.json();
  return data.success ? data.data : [];
}

// 종목 데이터 (회사명과 티커)
const stockData = [
  { ticker: 'TSLA', name: '테슬라', keywords: ['테슬라', 'Tesla', 'TSLA', '일론머스크', '일론 머스크'], market: 'NASDAQ', tags: ['전기차', 'AI', '자율주행'] },
  { ticker: '005930', name: '삼성전자', keywords: ['삼성전자', '삼성', 'Samsung', '005930'], market: 'KOSPI', tags: ['반도체', 'HBM', '파운드리'] },
  { ticker: '042660', name: '한화오션', keywords: ['한화오션', '대우조선해양', '대우조선', '042660'], market: 'KOSPI', tags: ['조선업', 'LNG선', '방위산업'] },
  { ticker: 'AAPL', name: '애플', keywords: ['애플', 'Apple', 'AAPL', '아이폰', '맥북'], market: 'NASDAQ', tags: ['빅테크', '아이폰', '워런버핏'] },
  { ticker: '010140', name: '삼성중공업', keywords: ['삼성중공업', '010140'], market: 'KOSPI', tags: ['조선업', 'LNG선', '해양플랜트'] },
  { ticker: 'NVDA', name: '엔비디아', keywords: ['엔비디아', 'NVIDIA', 'NVDA', '젠슨황', '젠슨 황'], market: 'NASDAQ', tags: ['AI', '반도체', 'GPU'] },
  { ticker: 'MSFT', name: '마이크로소프트', keywords: ['마이크로소프트', 'Microsoft', 'MSFT', '윈도우', '오피스'], market: 'NASDAQ', tags: ['빅테크', '클라우드', 'AI'] },
  { ticker: 'GOOGL', name: '구글', keywords: ['구글', 'Google', 'Alphabet', 'GOOGL', 'GOOG'], market: 'NASDAQ', tags: ['빅테크', '검색', 'AI'] },
  { ticker: 'META', name: '메타', keywords: ['메타', 'Meta', 'META', '페이스북', 'Facebook'], market: 'NASDAQ', tags: ['빅테크', 'SNS', 'VR'] },
  { ticker: '000660', name: 'SK하이닉스', keywords: ['SK하이닉스', 'SK 하이닉스', 'SK하이닉스', '000660', 'HBM'], market: 'KOSPI', tags: ['반도체', 'HBM', '메모리'] },
  { ticker: 'INTC', name: '인텔', keywords: ['인텔', 'Intel', 'INTC'], market: 'NASDAQ', tags: ['반도체', 'CPU', 'x86'] },
  { ticker: 'AMD', name: 'AMD', keywords: ['AMD', 'Advanced Micro Devices', '라이젠'], market: 'NASDAQ', tags: ['반도체', 'CPU', 'GPU'] },
  { ticker: '267250', name: 'HD현대', keywords: ['HD현대', '현대중공업', '267250'], market: 'KOSPI', tags: ['조선업', '중공업', '해양플랜트'] },
  { ticker: 'TSMC', name: 'TSMC', keywords: ['TSMC', '대만반도체', 'Taiwan Semiconductor'], market: 'TSE', tags: ['반도체', '파운드리', '대만'] },
  { ticker: 'BRK.B', name: '버크셔 해서웨이', keywords: ['버크셔', '버크셔해서웨이', '워런버핏', '워런 버핏', 'Berkshire'], market: 'NYSE', tags: ['가치투자', '워런버핏', '보험'] }
];

// 감정 분석 키워드
const sentimentKeywords = {
  positive: ['상승', '급등', '호재', '긍정', '강세', '매수', '추천', '좋은', '성장', '확대', '증가'],
  negative: ['하락', '급락', '악재', '부정', '약세', '매도', '위험', '나쁜', '감소', '축소', '하향'],
  neutral: []
};

function analyzeSentiment(text) {
  const positiveCount = sentimentKeywords.positive.filter(keyword => 
    text.toLowerCase().includes(keyword)
  ).length;
  
  const negativeCount = sentimentKeywords.negative.filter(keyword => 
    text.toLowerCase().includes(keyword)
  ).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

async function extractStockMentions() {
  console.log('=== 메르 블로그 종목 언급 포스트 개수 분석 ===\n');
  
  // 모든 메르 블로그 포스트 가져오기
  const posts = await fetchPosts();
  
  console.log(`총 ${posts.length}개의 메르 블로그 포스트 분석 중...\n`);
  
  const stockMentions = [];
  
  stockData.forEach(stock => {
    const mentionedPosts = [];
    const allText = [];
    
    posts.forEach(post => {
      const fullText = (post.title + ' ' + post.content).toLowerCase();
      
      // 키워드 매칭
      const isMatched = stock.keywords.some(keyword => 
        fullText.includes(keyword.toLowerCase())
      );
      
      if (isMatched) {
        mentionedPosts.push({
          id: post.id,
          log_no: post.log_no,
          title: post.title,
          created_date: post.created_date,
          excerpt: post.content.substring(0, 200) + '...'
        });
        allText.push(fullText);
      }
    });
    
    if (mentionedPosts.length > 0) {
      // 전체 텍스트로 감정 분석
      const combinedText = allText.join(' ');
      const sentiment = analyzeSentiment(combinedText);
      
      // 날짜 정보
      const dates = mentionedPosts.map(p => new Date(p.created_date)).sort();
      const firstMention = dates[0].toISOString().split('T')[0];
      const lastMention = dates[dates.length - 1].toISOString().split('T')[0];
      
      stockMentions.push({
        ticker: stock.ticker,
        name: stock.name,
        market: stock.market,
        postCount: mentionedPosts.length, // 언급 횟수 대신 포스트 개수
        firstMention,
        lastMention,
        sentiment,
        tags: stock.tags,
        description: `${stock.name} - ${mentionedPosts.length}개 포스트에서 언급`,
        recentPosts: mentionedPosts.slice(0, 3) // 최근 3개 포스트
      });
      
      console.log(`✅ ${stock.name} (${stock.ticker}): ${mentionedPosts.length}개 포스트에서 언급`);
    }
  });
  
  // 포스트 개수 순으로 정렬
  stockMentions.sort((a, b) => b.postCount - a.postCount);
  
  console.log('\n=== 포스트 언급 개수 TOP 10 ===');
  stockMentions.slice(0, 10).forEach((stock, index) => {
    console.log(`${index + 1}. ${stock.name} (${stock.ticker}): ${stock.postCount}개 포스트, 감정: ${stock.sentiment}`);
  });
  
  return stockMentions;
}

// 실행
async function main() {
  const result = await extractStockMentions();

  // 결과 저장
  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'stock-mentions-count.json'),
    JSON.stringify(result, null, 2),
    'utf8'
  );

  console.log('\n📁 결과가 data/stock-mentions-count.json에 저장되었습니다.');
  console.log(`총 ${result.length}개 종목이 발견되었습니다.`);
}

main().catch(console.error);