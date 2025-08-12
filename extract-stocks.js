const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { join } = require('path');

async function extractStocks() {
  try {
    const dbPath = join(process.cwd(), 'database.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('=== 메르 블로그 종목 분석 ===\n');

    // 국내 주식 종목 패턴 및 키워드
    const koreanStocks = [
      // 조선업
      { name: '삼성중공업', ticker: '010140', keywords: ['삼성중공업', '삼중'] },
      { name: '한화오션', ticker: '042660', keywords: ['한화오션', '대우조선해양'] },
      { name: 'HD현대중공업', ticker: '329180', keywords: ['HD현대중공업', '현대중공업', '현대중'] },
      { name: 'HD한국조선해양', ticker: '009540', keywords: ['한국조선해양', 'HD한국조선'] },
      { name: '한국카본', ticker: '017960', keywords: ['한국카본'] },
      
      // IT/반도체
      { name: '삼성전자', ticker: '005930', keywords: ['삼성전자'] },
      { name: 'SK하이닉스', ticker: '000660', keywords: ['SK하이닉스', 'SK하이'] },
      { name: '한미반도체', ticker: '042700', keywords: ['한미반도체'] },
      
      // 방위산업
      { name: '한화에어로스페이스', ticker: '012450', keywords: ['한화에어로스페이스', '한화에어로'] },
      { name: 'LIG넥스원', ticker: '079550', keywords: ['LIG넥스원'] },
      { name: '풍산', ticker: '103140', keywords: ['풍산'] },
      
      // 기타
      { name: '고려아연', ticker: '010130', keywords: ['고려아연'] },
      { name: '에코프로', ticker: '086520', keywords: ['에코프로'] },
      { name: '현대차', ticker: '005380', keywords: ['현대차', '현대자동차'] },
      { name: '롯데관광개발', ticker: '032350', keywords: ['롯데관광개발'] },
      { name: '레인보우로보틱스', ticker: '277810', keywords: ['레인보우로보틱스'] },
      { name: '한화', ticker: '000880', keywords: ['한화\\.', '한화 '] },
      { name: 'HLB', ticker: '028300', keywords: ['HLB'] },
      { name: '코오롱티슈진', ticker: '950160', keywords: ['코오롱티슈진', '인보사'] },
      { name: 'HMM', ticker: '011200', keywords: ['HMM'] },
      { name: '한국전력', ticker: '015760', keywords: ['한전', '한국전력'] },
      { name: '한수원', ticker: '한수원(비상장)', keywords: ['한수원', '한국수력원자력'] },
    ];

    // 미국 주식 종목 패턴
    const usStocks = [
      { name: '엔비디아', ticker: 'NVDA', keywords: ['엔비디아', 'NVIDIA', '젠슨황', '젠슨 황'] },
      { name: '팔란티어', ticker: 'PLTR', keywords: ['팔란티어', 'Palantir'] },
      { name: '테슬라', ticker: 'TSLA', keywords: ['테슬라', 'Tesla', '일론 머스크'] },
      { name: '애플', ticker: 'AAPL', keywords: ['애플', 'Apple', '워런 버핏.*애플'] },
      { name: '옥시덴탈', ticker: 'OXY', keywords: ['옥시덴탈'] },
      { name: '오클로', ticker: 'OKLO', keywords: ['오클로', 'Oklo'] },
      { name: 'TMC', ticker: 'TMC', keywords: ['TMC'] },
      { name: 'MP머티리얼즈', ticker: 'MP', keywords: ['MP머티리얼즈', 'MP Materials'] },
      { name: '서클', ticker: 'CIRCLE(미상장)', keywords: ['서클', 'Circle', '스테이블코인.*서클'] },
      { name: '테더', ticker: 'TETHER(미상장)', keywords: ['테더', 'Tether', 'USDT'] },
      { name: 'TSMC', ticker: 'TSM', keywords: ['TSMC', '대만반도체'] },
      { name: 'CATL', ticker: 'CATL(중국)', keywords: ['CATL'] },
      { name: '버크셔해서웨이', ticker: 'BRK.B', keywords: ['버크셔', '워런 버핏'] },
      { name: '아마존', ticker: 'AMZN', keywords: ['아마존', 'Amazon'] },
      { name: '일라이릴리', ticker: 'LLY', keywords: ['일라이 릴리', '마운자로'] },
      { name: '유나이티드헬스', ticker: 'UNH', keywords: ['유나이티드헬스케어', '유나이티드헬스'] },
      { name: '인텔', ticker: 'INTC', keywords: ['인텔', 'Intel'] },
      { name: 'BOE', ticker: 'BOE(중국)', keywords: ['BOE'] },
      { name: '뉴럴링크', ticker: 'Neuralink(미상장)', keywords: ['뉴럴링크', 'Neuralink'] },
      { name: 'DeepSeek', ticker: 'DeepSeek(중국)', keywords: ['딥시크', 'DeepSeek'] },
    ];

    // 일본 주식
    const japanStocks = [
      { name: '미쓰비시상사', ticker: '8058.T', keywords: ['미쓰비시상사', '일본 종합상사'] },
      { name: '이토추상사', ticker: '8001.T', keywords: ['이토추상사', '일본 종합상사'] },
      { name: '마루베니', ticker: '8002.T', keywords: ['마루베니', '일본 종합상사'] },
      { name: '미쓰이물산', ticker: '8031.T', keywords: ['미쓰이물산', '일본 종합상사'] },
      { name: '스미토모상사', ticker: '8053.T', keywords: ['스미토모상사', '일본 종합상사'] },
    ];

    const allStocks = [...koreanStocks, ...usStocks, ...japanStocks];
    const stockMentions = new Map();

    // 모든 포스트 가져오기
    const posts = await db.all(`
      SELECT id, log_no, title, content, created_date 
      FROM blog_posts 
      WHERE blog_type = 'merry' 
      ORDER BY created_date DESC
    `);

    console.log(`총 ${posts.length}개 포스트 분석 중...\n`);

    // 각 포스트에서 종목 언급 찾기
    for (const post of posts) {
      const searchText = `${post.title} ${post.content || ''}`;
      
      for (const stock of allStocks) {
        for (const keyword of stock.keywords) {
          const regex = new RegExp(keyword, 'gi');
          if (regex.test(searchText)) {
            if (!stockMentions.has(stock.ticker)) {
              stockMentions.set(stock.ticker, {
                name: stock.name,
                ticker: stock.ticker,
                mentions: []
              });
            }
            
            const mention = stockMentions.get(stock.ticker);
            // 중복 체크 (같은 포스트에서 여러 번 언급되어도 한 번만 기록)
            const alreadyAdded = mention.mentions.some(m => m.postId === post.id);
            if (!alreadyAdded) {
              mention.mentions.push({
                postId: post.id,
                logNo: post.log_no,
                title: post.title.substring(0, 50),
                date: post.created_date,
                context: extractContext(searchText, keyword)
              });
            }
            break; // 한 종목당 포스트당 한 번만 기록
          }
        }
      }
    }

    // 결과 정리 및 출력
    const sortedStocks = Array.from(stockMentions.values())
      .sort((a, b) => b.mentions.length - a.mentions.length);

    console.log('=== 종목별 언급 횟수 TOP 30 ===\n');
    
    const top30 = sortedStocks.slice(0, 30);
    
    for (let i = 0; i < top30.length; i++) {
      const stock = top30[i];
      console.log(`${i + 1}. ${stock.name} (${stock.ticker}): ${stock.mentions.length}회`);
      
      // 최근 3개 언급만 표시
      const recentMentions = stock.mentions.slice(0, 3);
      for (const mention of recentMentions) {
        const date = new Date(mention.date);
        const dateStr = isNaN(date.getTime()) ? mention.date : date.toISOString().split('T')[0];
        console.log(`   - ${dateStr}: ${mention.title}...`);
      }
      console.log('');
    }

    // JSON 파일로 저장
    const fullData = {
      extractedAt: new Date().toISOString(),
      totalPosts: posts.length,
      totalStocksFound: sortedStocks.length,
      stocks: sortedStocks.map(stock => ({
        ...stock,
        firstMention: stock.mentions[stock.mentions.length - 1]?.date,
        lastMention: stock.mentions[0]?.date,
        mentionDates: stock.mentions.map(m => m.date)
      }))
    };

    const fs = require('fs');
    fs.writeFileSync('merry-stocks.json', JSON.stringify(fullData, null, 2));
    console.log('전체 데이터가 merry-stocks.json 파일로 저장되었습니다.');

    await db.close();
  } catch (error) {
    console.error('종목 추출 오류:', error);
  }
}

function extractContext(text, keyword) {
  const index = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (index === -1) return '';
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + keyword.length + 50);
  return '...' + text.substring(start, end).replace(/\n/g, ' ') + '...';
}

extractStocks();