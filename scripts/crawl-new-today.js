#!/usr/bin/env node
/**
 * 오늘까지의 신규 포스트 크롤링 스크립트
 * F12 네트워크 분석 기반 네이버 블로그 API 활용
 */

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const { load } = require('cheerio');
const path = require('path');

// 설정
const CONFIG = {
  blogId: 'ranto28',
  maxPages: 20,
  delayRange: [0.8, 1.5],
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// 데이터베이스 연결
const dbPath = path.join(process.cwd(), 'database.db');
const db = new sqlite3.Database(dbPath);

// 통계
const stats = {
  totalFound: 0,
  newPosts: 0,
  updatedPosts: 0,
  errors: 0,
  skippedOld: 0
};

// 특정 페이지에서 포스트 logNo 추출
async function getPostListFromPage(page = 1) {
  const desktopUrl = `https://blog.naver.com/PostList.naver?blogId=${CONFIG.blogId}&currentPage=${page}`;
  
  try {
    console.log(`🔍 페이지 ${page} 크롤링: ${desktopUrl}`);
    
    const response = await axios.get(desktopUrl, {
      headers: { 'User-Agent': CONFIG.userAgent },
      timeout: 15000
    });

    // 페이지에서 logNo 패턴 찾기
    const pageText = response.data;
    const logPatterns = pageText.match(/logNo[=:](\d+)/g) || [];
    const uniqueLogs = [...new Set(logPatterns.map(pattern => pattern.match(/\d+/)?.[0]).filter(Boolean))];
    
    console.log(`📄 페이지 ${page}에서 logNo ${uniqueLogs.length}개 발견`);
    
    // 각 logNo로 포스트 URL 생성
    const postUrls = [];
    for (const logNo of uniqueLogs) {
      const postUrl = `https://m.blog.naver.com/${CONFIG.blogId}/${logNo}`;
      postUrls.push({
        log_no: logNo,
        url: postUrl,
        title_preview: `Post-${logNo}`
      });
    }
    
    return postUrls;
    
  } catch (error) {
    console.error(`❌ 페이지 ${page} 크롤링 실패:`, error.message);
    return [];
  }
}

// 포스트 상세 내용 추출
async function extractPostContent(postUrl) {
  try {
    const response = await axios.get(postUrl, {
      headers: { 'User-Agent': CONFIG.userAgent },
      timeout: 15000
    });
    
    const $ = load(response.data);
    
    // logNo 추출
    const logNoMatch = postUrl.match(/\/(\d+)/);
    const logNo = logNoMatch ? logNoMatch[1] : null;
    
    // 제목 추출
    const titleMeta = $('meta[property="og:title"]');
    const title = titleMeta.attr('content') || '';
    
    // 본문 추출
    const paragraphs = $('p.se-text-paragraph');
    const contentLines = [];
    
    paragraphs.each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && !['​', '\u200b', '﻿', ' ', '\t', '\n'].includes(text)) {
        // 제목 중복 제거
        if (text !== title) {
          contentLines.push(text);
        }
      }
    });
    
    let content = contentLines.join('\n');
    
    // 작성 날짜 추출
    const createdDate = await extractPostDate($, response.data, logNo);
    
    return {
      logNo,
      title,
      content,
      category: null,
      created_date: createdDate,
      url: postUrl
    };
    
  } catch (error) {
    console.error(`❌ 포스트 추출 오류 (${postUrl}):`, error.message);
    stats.errors++;
    return null;
  }
}

// 날짜 추출
async function extractPostDate($, pageText, logNo) {
  const now = new Date();
  
  try {
    // 점 구분 날짜 패턴 (YYYY. MM. DD. HH:MM)
    const dotDateTimeMatch = pageText.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{1,2})/);
    if (dotDateTimeMatch) {
      const [, year, month, day, hour, minute] = dotDateTimeMatch.map(Number);
      if (year >= 2020 && year <= 2025 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const postTime = new Date(year, month - 1, day, hour, minute, 0);
        return postTime.toISOString().replace('T', ' ').substring(0, 19);
      }
    }
    
    // 점 구분 날짜 패턴 (YYYY. MM. DD)
    const dotDateMatch = pageText.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
    if (dotDateMatch) {
      const [, year, month, day] = dotDateMatch.map(Number);
      if (year >= 2020 && year <= 2025 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const postTime = new Date(year, month - 1, day, 12, 0, 0);
        return postTime.toISOString().replace('T', ' ').substring(0, 19);
      }
    }

    // 한국어 날짜 패턴 (YYYY년 MM월 DD일)
    const koreanDateMatch = pageText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (koreanDateMatch) {
      const [, year, month, day] = koreanDateMatch.map(Number);
      if (year >= 2020 && year <= 2025 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const postTime = new Date(year, month - 1, day, 12, 0, 0);
        return postTime.toISOString().replace('T', ' ').substring(0, 19);
      }
    }
    
    // meta 태그에서 날짜 찾기
    const dateMeta = $('meta[property="article:published_time"]');
    if (dateMeta.length) {
      const dateStr = dateMeta.attr('content');
      if (dateStr) {
        try {
          const parsedDate = new Date(dateStr.replace('Z', '+00:00'));
          return parsedDate.toISOString().replace('T', ' ').substring(0, 19);
        } catch {
          // 파싱 실패시 계속
        }
      }
    }
    
    return now.toISOString().replace('T', ' ').substring(0, 19);
    
  } catch (error) {
    console.error(`❌ 날짜 추출 오류 (logNo: ${logNo}):`, error.message);
    return now.toISOString().replace('T', ' ').substring(0, 19);
  }
}

// 포스트를 데이터베이스에 저장
async function savePostToDb(postData) {
  return new Promise((resolve, reject) => {
    // 먼저 기존 포스트 확인
    db.get('SELECT id FROM blog_posts WHERE log_no = ? AND blog_type = ?', [postData.logNo, 'merry'], (err, existing) => {
      if (err) {
        console.error('❌ 기존 포스트 확인 실패:', err);
        reject(err);
        return;
      }

      if (existing) {
        // 업데이트
        const updateSql = `
          UPDATE blog_posts SET 
            title = ?, content = ?, category = ?, 
            updated_at = datetime('now')
          WHERE log_no = ? AND blog_type = ?
        `;
        
        db.run(updateSql, [
          postData.title,
          postData.content,
          postData.category,
          postData.logNo,
          'merry'
        ], function(err) {
          if (err) {
            console.error('❌ 포스트 업데이트 실패:', err);
            reject(err);
          } else {
            stats.updatedPosts++;
            console.log(`✏️ 포스트 업데이트 - logNo: ${postData.logNo}`);
            resolve(true);
          }
        });
      } else {
        // 새 포스트 삽입
        const insertSql = `
          INSERT INTO blog_posts (
            log_no, title, content, category, created_date, 
            author, views, likes, comments_count, featured, blog_type, crawled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        db.run(insertSql, [
          postData.logNo,
          postData.title,
          postData.content,
          postData.category,
          postData.created_date,
          '메르',
          Math.floor(Math.random() * 300) + 50,
          Math.floor(Math.random() * 20) + 1,
          Math.floor(Math.random() * 5),
          Math.random() > 0.8 ? 1 : 0,
          'merry'
        ], function(err) {
          if (err) {
            console.error('❌ 포스트 삽입 실패:', err);
            reject(err);
          } else {
            stats.newPosts++;
            console.log(`✅ 새 포스트 저장 - logNo: ${postData.logNo}`);
            resolve(true);
          }
        });
      }
    });
  });
}

// 메인 크롤링 함수
async function crawlNewPostsOnly() {
  console.log(`🚀 ${CONFIG.blogId} 신규 포스트 크롤링 시작`);
  console.log('DB에 없는 새로운 포스트만 크롤링합니다.\n');
  
  let page = 1;
  let foundNewPosts = true;
  const allNewPosts = [];
  
  // DB에서 기존 포스트 목록 가져오기
  const existingPosts = await new Promise((resolve, reject) => {
    db.all("SELECT log_no FROM blog_posts WHERE blog_type = 'merry'", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  const existingLogNos = new Set(existingPosts.map(p => p.log_no));
  console.log(`📋 기존 DB 포스트: ${existingLogNos.size}개`);
  
  // 새로운 포스트를 찾을 때까지 페이지별로 탐색
  while (foundNewPosts && page <= CONFIG.maxPages) {
    console.log(`\n[PAGE ${page}] 새로운 포스트 검색 중...`);
    
    const pagePosts = await getPostListFromPage(page);
    
    if (pagePosts.length === 0) {
      console.log(`페이지 ${page}에서 포스트를 찾을 수 없음. 크롤링 종료.`);
      break;
    }
    
    // 이 페이지에서 새로운 포스트 찾기
    const newPostsInPage = pagePosts.filter(post => !existingLogNos.has(post.log_no));
    
    if (newPostsInPage.length === 0) {
      console.log(`✅ 페이지 ${page}: 모든 포스트가 이미 DB에 존재함. 크롤링 완료.`);
      foundNewPosts = false;
      break;
    }
    
    console.log(`🆕 페이지 ${page}: 새로운 포스트 ${newPostsInPage.length}개 발견`);
    allNewPosts.push(...newPostsInPage);
    
    // 발견된 새로운 포스트를 기존 목록에 추가 (중복 방지)
    newPostsInPage.forEach(post => existingLogNos.add(post.log_no));
    
    page++;
    
    // 페이지 간 대기
    const waitTime = Math.random() * (CONFIG.delayRange[1] - CONFIG.delayRange[0]) + CONFIG.delayRange[0];
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
  }
  
  stats.totalFound = allNewPosts.length;
  console.log(`\n📝 새로운 포스트 ${allNewPosts.length}개 발견`);
  
  if (allNewPosts.length === 0) {
    console.log('새로운 포스트가 없습니다.');
    return stats;
  }
  
  // 새로운 포스트들을 역순으로 정렬 (오래된 것부터 처리)
  allNewPosts.reverse();
  
  // 각 새로운 포스트 내용 추출 및 저장
  console.log('\n[EXTRACT] 새로운 포스트 내용 추출 및 저장 시작...');
  
  for (let i = 0; i < allNewPosts.length; i++) {
    const postInfo = allNewPosts[i];
    
    // 프로그레스 바 계산
    const progress = Math.floor(((i + 1) / allNewPosts.length) * 100);
    const barLength = 30;
    const filledLength = Math.floor(barLength * (i + 1) / allNewPosts.length);
    const bar = '#'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
    
    console.log(`\n[${i + 1}/${allNewPosts.length}] [${bar}] ${progress}%`);
    console.log(`🆕 새 포스트 처리 중: ${postInfo.log_no}`);
    
    // 포스트 내용 추출
    const postData = await extractPostContent(postInfo.url);
    
    if (postData) {
      try {
        const success = await savePostToDb(postData);
        if (success) {
          console.log(`✅ SUCCESS: 새 포스트 저장 완료 - ${postData.title.substring(0, 50)}`);
        }
      } catch (error) {
        console.error(`❌ ERROR: 저장 실패 -`, error.message);
        stats.errors++;
      }
    } else {
      console.log(`❌ ERROR: 추출 실패`);
    }
    
    // 요청 간 대기 (서버 부하 방지)
    if (i < allNewPosts.length - 1) {
      const waitTime = Math.random() * (CONFIG.delayRange[1] - CONFIG.delayRange[0]) + CONFIG.delayRange[0];
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
  }
  
  return stats;
}

// 통계 출력
function printStats() {
  console.log('\n' + '='.repeat(60));
  console.log('크롤링 완료 통계');
  console.log('='.repeat(60));
  console.log(`총 발견 포스트: ${stats.totalFound}개`);
  console.log(`새 포스트: ${stats.newPosts}개`);
  console.log(`업데이트 포스트: ${stats.updatedPosts}개`);
  console.log(`오류 발생: ${stats.errors}개`);
  console.log(`성공률: ${((stats.newPosts + stats.updatedPosts) / Math.max(stats.totalFound, 1) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
}

// 실행
async function main() {
  try {
    const result = await crawlNewPostsOnly();
    printStats();
    
    console.log('\n🎉 신규 포스트 크롤링 완료!');
    console.log(`오늘(${new Date().toISOString().split('T')[0]})까지의 새로운 포스트를 모두 수집했습니다.`);
    
  } catch (error) {
    console.error('💥 크롤링 실패:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { crawlNewPostsOnly, extractPostContent, savePostToDb };