/**
 * 메르's Pick 종목들에 감정 분석을 추가하는 스크립트
 * 현재는 메인 종목들만 처리하고, 나머지는 나중에 DB로 이관 예정
 */

import fs from 'fs';
import path from 'path';
import { analyzeStockSentimentWithContext } from '../utils/sentimentAnalysis';

interface MentionData {
  postId: number;
  logNo: string;
  title: string;
  date: number;
  context: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  keywords?: string[];
}

interface StockData {
  name: string;
  ticker: string;
  mentions: MentionData[];
  firstMention: number;
  lastMention: number;
}

interface MerryStocksData {
  extractedAt: string;
  totalPosts: number;
  totalStocksFound: number;
  stocks: StockData[];
}

// 메르's Pick에 포함될 주요 종목들 (상위 표시되는 종목들)
const PRIORITY_STOCKS = [
  'TSLA', '005930', 'NVDA', 'AAPL', '000270', 'GOOGL', 'AMZN', 'META', 'MSFT'
];

/**
 * 메르's Pick 종목들에 감정 분석 추가
 */
function addSentimentAnalysis() {
  try {
    // merry-stocks.json 파일 읽기
    const dataPath = path.join(process.cwd(), 'merry-stocks.json');
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const data: MerryStocksData = JSON.parse(fileContent);

    console.log('🔍 감정 분석 시작...');
    
    // 우선순위 종목들만 처리
    data.stocks = data.stocks.map(stock => {
      if (!PRIORITY_STOCKS.includes(stock.ticker)) {
        console.log(`⏭️  ${stock.name}(${stock.ticker}) - 나중에 처리 예정`);
        return stock;
      }

      console.log(`📊 ${stock.name}(${stock.ticker}) 감정 분석 중...`);
      
      // 각 언급에 대해 문맥 기반 감정 분석 수행
      stock.mentions = stock.mentions.map(mention => {
        const content = mention.context || mention.title;
        
        // 한 포스트에 여러 종목이 언급된 경우를 고려한 분석
        const analysis = analyzeStockSentimentWithContext(
          content,
          stock.name, 
          stock.ticker
        );

        return {
          ...mention,
          sentiment: analysis.sentiment,
          confidence: analysis.confidence,
          keywords: analysis.keywords
        };
      });

      const sentimentCounts = {
        positive: stock.mentions.filter(m => m.sentiment === 'positive').length,
        negative: stock.mentions.filter(m => m.sentiment === 'negative').length,
        neutral: stock.mentions.filter(m => m.sentiment === 'neutral').length
      };

      console.log(`  ✅ 완료: 긍정 ${sentimentCounts.positive}, 중립 ${sentimentCounts.neutral}, 부정 ${sentimentCounts.negative}`);
      
      return stock;
    });

    // 업데이트된 데이터 저장
    const updatedData = {
      ...data,
      extractedAt: new Date().toISOString(),
      lastSentimentUpdate: new Date().toISOString(),
      sentimentAnalysisNote: '메르\'s Pick 우선순위 종목만 감정 분석 완료. 나머지 종목은 DB 이관 후 처리 예정.'
    };

    fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2), 'utf8');
    
    console.log('✅ 감정 분석 완료 및 저장됨');
    console.log('📝 참고: 나머지 종목들은 DB 구축 후 배치 처리 예정');
    
  } catch (error) {
    console.error('❌ 감정 분석 중 오류 발생:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  addSentimentAnalysis();
}

export default addSentimentAnalysis;