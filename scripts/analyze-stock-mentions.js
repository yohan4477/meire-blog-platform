#!/usr/bin/env node
/**
 * 새로 추가된 포스트들의 종목 언급 분석 스크립트
 * merry_mentioned_stocks 테이블에 종목 언급 정보 추가
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(process.cwd(), 'database.db');
const db = new sqlite3.Database(dbPath);

// 종목 매핑 사전 (확장 가능)
const STOCK_MAPPING = {
  // 미국 주식
  'TSLA': ['테슬라', 'Tesla', 'TSLA', '일론 머스크'],
  'AAPL': ['애플', 'Apple', 'AAPL', '아이폰', 'iPhone'],
  'NVDA': ['엔비디아', 'NVIDIA', 'NVDA'],
  'GOOGL': ['구글', 'Google', 'GOOGL', '알파벳', 'Alphabet'],
  'MSFT': ['마이크로소프트', 'Microsoft', 'MSFT', '마소'],
  'AMZN': ['아마존', 'Amazon', 'AMZN'],
  'META': ['메타', 'META', '페이스북', 'Facebook'],
  'INTC': ['인텔', 'Intel', 'INTC'],
  'LLY': ['일라이릴리', 'Eli Lilly', 'LLY', '릴리'],
  'UNH': ['유나이티드헬스케어', 'UnitedHealth', 'UNH', '유나이티드헬스'],
  
  // 한국 주식
  '005930': ['삼성전자', '005930', '삼성'],
  '042660': ['한화오션', '042660', '한화시스템'],
  '267250': ['HD현대', '267250', '현대중공업'],
  '010620': ['현대미포조선', '010620', '미포조선'],
  // '035420': ['NAVER', '네이버', '035420'], // 메르가 실제 언급하지 않으므로 제외
  '012450': ['한화에어로스페이스', '012450'],
  '272210': ['한화시스템', '272210'],
  
  // 기타
  'BYD': ['BYD', '비야디'],
  'GM': ['GM', '제너럴모터스', '한국GM']
};

let stats = {
  postsProcessed: 0,
  mentionsFound: 0,
  newMentions: 0,
  errors: 0
};

// 종목 언급 분석 함수
function analyzeStockMentions(title, content) {
  const mentions = [];
  const fullText = `${title} ${content}`.toLowerCase();
  
  for (const [ticker, keywords] of Object.entries(STOCK_MAPPING)) {
    let mentionFound = false;
    let context = '';
    let confidence = 0;
    
    // 키워드 검색
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const index = fullText.indexOf(keywordLower);
      
      if (index !== -1) {
        // 컨텍스트 추출 (언급된 부분 주변 텍스트)
        const start = Math.max(0, index - 50);
        const end = Math.min(fullText.length, index + 100);
        context = fullText.slice(start, end).trim();
        
        // NAVER 특별 처리: "네이버 블로그", "네이버카페" 등은 제외
        if (ticker === '035420' && keyword === '네이버') {
          // 전체 텍스트(제목+내용)에서 제외 패턴 확인
          const titleAndContent = `${title} ${content}`.toLowerCase();
          
          // 정규식을 사용한 더 유연한 패턴 매칭
          const excludeRegexes = [
            /네이버\s*블로그/,     // 네이버 블로그 (공백 포함)
            /네이버블로그/,       // 네이버블로그 (붙여쓰기)
            /네이버\s*카페/,      // 네이버 카페
            /네이버\s*포스트/,    // 네이버 포스트
            /네이버\s*뉴스/,      // 네이버 뉴스
            /:\s*네이버/,         // : 네이버
            /\.naver\.com/,       // 모든 naver.com 도메인 (blog, m.blog, cafe 등)
            /naver\.com/,         // naver.com 모든 형태
            /블로그\s*키우는/,    // 블로그 키우는
            /블로그\s*이웃/,      // 블로그 이웃
            /이웃수/,             // 이웃수
            /블로그에\s*글/,      // 블로그에 글
            /https?:\/\/.*naver/, // 모든 네이버 URL
            /블로거/              // 블로거 (블로깅 관련)
          ];
          
          const shouldExclude = excludeRegexes.some(regex => 
            regex.test(context) || regex.test(titleAndContent)
          );
          
          if (shouldExclude) {
            console.log(`⚠️ NAVER 언급 제외: "${context.substring(0, 100)}..."`);
            continue; // 이 키워드는 건너뛰기
          }
        }
        
        mentionFound = true;
        
        // 신뢰도 계산 (제목에 있으면 높은 점수)
        if (title.toLowerCase().includes(keywordLower)) {
          confidence += 0.8;
        } else {
          confidence += 0.5;
        }
        
        break;
      }
    }
    
    if (mentionFound) {
      mentions.push({
        ticker,
        context,
        confidence: Math.min(confidence, 1.0),
        sentiment_score: 0, // 기본값 (나중에 감정 분석으로 개선 가능)
        mention_type: confidence > 0.7 ? 'primary' : 'secondary'
      });
    }
  }
  
  return mentions;
}

// 특정 포스트의 종목 언급 처리
async function processPostStockMentions(postId, title, content, createdDate) {
  return new Promise((resolve, reject) => {
    try {
      const mentions = analyzeStockMentions(title, content);
      
      if (mentions.length === 0) {
        resolve(0);
        return;
      }
      
      let processedMentions = 0;
      let completedInserts = 0;
      
      mentions.forEach((mention) => {
        // 중복 체크 후 삽입
        db.get(
          'SELECT id FROM merry_mentioned_stocks WHERE post_id = ? AND ticker = ?',
          [postId, mention.ticker],
          (err, existing) => {
            if (err) {
              console.error(`❌ 중복 체크 실패 (post ${postId}, ticker ${mention.ticker}):`, err);
              completedInserts++;
              if (completedInserts === mentions.length) resolve(processedMentions);
              return;
            }
            
            if (existing) {
              console.log(`⏭️ 이미 존재하는 언급: post ${postId}, ticker ${mention.ticker}`);
              completedInserts++;
              if (completedInserts === mentions.length) resolve(processedMentions);
              return;
            }
            
            // 새로운 언급 삽입
            db.run(
              `INSERT INTO merry_mentioned_stocks 
               (post_id, ticker, mentioned_date, context, sentiment_score, mention_type, created_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
              [
                postId,
                mention.ticker,
                createdDate.split(' ')[0], // YYYY-MM-DD 형식
                mention.context.substring(0, 500), // 500자 제한
                mention.sentiment_score,
                mention.mention_type
              ],
              function(err) {
                if (err) {
                  console.error(`❌ 언급 삽입 실패 (post ${postId}, ticker ${mention.ticker}):`, err);
                  stats.errors++;
                } else {
                  console.log(`✅ 새 언급 추가: post ${postId} → ${mention.ticker} (${mention.mention_type})`);
                  processedMentions++;
                  stats.newMentions++;
                }
                
                completedInserts++;
                if (completedInserts === mentions.length) {
                  resolve(processedMentions);
                }
              }
            );
          }
        );
      });
    } catch (error) {
      console.error(`❌ 포스트 ${postId} 처리 실패:`, error);
      stats.errors++;
      resolve(0);
    }
  });
}

// 새로 추가된 포스트들 처리
async function processNewPosts() {
  return new Promise((resolve, reject) => {
    // 최근 추가된 포스트들 (ID 1000 이상 = 새로 크롤링된 포스트들)
    const query = `
      SELECT id, title, content, excerpt, created_date 
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND id >= 1000
        AND (title IS NOT NULL AND title != '')
      ORDER BY id DESC
    `;
    
    db.all(query, [], async (err, posts) => {
      if (err) {
        console.error('❌ 포스트 조회 실패:', err);
        reject(err);
        return;
      }
      
      console.log(`📝 처리할 새 포스트: ${posts.length}개`);
      
      if (posts.length === 0) {
        console.log('처리할 새 포스트가 없습니다.');
        resolve();
        return;
      }
      
      // 순차적으로 포스트 처리
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const progress = Math.floor(((i + 1) / posts.length) * 100);
        
        console.log(`\n[${i + 1}/${posts.length}] (${progress}%) 포스트 ${post.id} 처리 중...`);
        console.log(`제목: ${post.title.substring(0, 60)}...`);
        
        try {
          const content = post.content || post.excerpt || '';
          const mentionsCount = await processPostStockMentions(
            post.id, 
            post.title, 
            content, 
            post.created_date
          );
          
          stats.postsProcessed++;
          stats.mentionsFound += mentionsCount;
          
          if (mentionsCount > 0) {
            console.log(`  📊 ${mentionsCount}개 종목 언급 발견`);
          } else {
            console.log(`  📊 종목 언급 없음`);
          }
          
        } catch (error) {
          console.error(`❌ 포스트 ${post.id} 처리 실패:`, error);
          stats.errors++;
        }
        
        // 처리 간 짧은 지연 (DB 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      resolve();
    });
  });
}

// 통계 출력
function printStats() {
  console.log('\n' + '='.repeat(60));
  console.log('종목 언급 분석 완료 통계');
  console.log('='.repeat(60));
  console.log(`처리된 포스트: ${stats.postsProcessed}개`);
  console.log(`발견된 언급: ${stats.mentionsFound}개`);
  console.log(`새로 추가된 언급: ${stats.newMentions}개`);
  console.log(`오류 발생: ${stats.errors}개`);
  console.log(`성공률: ${((stats.postsProcessed - stats.errors) / Math.max(stats.postsProcessed, 1) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
}

// 메인 실행 함수
async function main() {
  console.log('🔍 새 포스트 종목 언급 분석 시작...\n');
  
  try {
    await processNewPosts();
    printStats();
    
    // 분석 결과 확인
    db.all(
      `SELECT ticker, COUNT(*) as count 
       FROM merry_mentioned_stocks 
       WHERE created_at >= date('now', '-1 day')
       GROUP BY ticker 
       ORDER BY count DESC 
       LIMIT 10`,
      [],
      (err, results) => {
        if (!err && results.length > 0) {
          console.log('\n📈 최근 24시간 내 추가된 종목 언급 TOP 10:');
          results.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.ticker}: ${row.count}건`);
          });
        }
        
        db.close();
      }
    );
    
  } catch (error) {
    console.error('💥 분석 실패:', error);
    db.close();
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main();
}

module.exports = { 
  analyzeStockMentions, 
  processPostStockMentions, 
  STOCK_MAPPING 
};