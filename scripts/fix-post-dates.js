#!/usr/bin/env node
/**
 * 기존 포스트들의 날짜 정보 수정 스크립트
 * 503개 포스트의 올바른 날짜를 크롤링해서 업데이트
 */

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const { load } = require('cheerio');
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(process.cwd(), 'database.db');
const db = new sqlite3.Database(dbPath);

// 날짜 정보가 없거나 잘못된 포스트들의 날짜 수정
async function fixPostDates() {
  console.log('🔧 포스트 날짜 정보 수정 시작...');

  return new Promise((resolve, reject) => {
    // 날짜 정보가 잘못된 포스트들 조회
    db.all(`
      SELECT id, log_no, title 
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND (created_date IS NULL 
             OR created_date = '' 
             OR datetime(created_date, 'unixepoch') < '2020-01-01'
             OR datetime(created_date, 'unixepoch') > '2025-12-31')
      ORDER BY id 
      LIMIT 50
    `, async (err, posts) => {
      if (err) {
        console.error('❌ 포스트 조회 실패:', err);
        reject(err);
        return;
      }

      console.log(`📊 수정 대상 포스트: ${posts.length}개`);

      let fixed = 0;
      let errors = 0;

      for (const post of posts) {
        try {
          console.log(`🔍 ${post.log_no} 날짜 정보 추출 중...`);

          // 모바일 페이지에서 날짜 정보 추출
          const postUrl = `https://m.blog.naver.com/ranto28/${post.log_no}`;
          const response = await axios.get(postUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            },
            timeout: 10000
          });

          const $ = load(response.data);
          
          // 날짜 정보 추출 시도
          let createdDate = null;
          
          // 1. JSON-LD에서 날짜 추출
          const jsonLd = $('script[type="application/ld+json"]').text();
          if (jsonLd) {
            try {
              const data = JSON.parse(jsonLd);
              if (data.datePublished) {
                createdDate = data.datePublished;
              }
            } catch (e) {
              console.log('JSON-LD 파싱 실패');
            }
          }

          // 2. 메타 태그에서 날짜 추출
          if (!createdDate) {
            const metaDate = $('meta[property="article:published_time"]').attr('content') ||
                           $('meta[name="article:published_time"]').attr('content');
            if (metaDate) {
              createdDate = metaDate;
            }
          }

          // 3. 페이지 텍스트에서 날짜 패턴 찾기
          if (!createdDate) {
            const pageText = $.text();
            const datePatterns = [
              /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/g,
              /(\d{4})-(\d{2})-(\d{2})/g,
              /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g
            ];

            for (const pattern of datePatterns) {
              const match = pageText.match(pattern);
              if (match && match[0]) {
                // 첫 번째 일치하는 날짜 사용
                const dateStr = match[0];
                const parsedDate = new Date(dateStr.replace(/\./g, '-').replace(/년|월|일/g, ''));
                if (parsedDate.getFullYear() >= 2020 && parsedDate.getFullYear() <= 2025) {
                  createdDate = parsedDate.toISOString();
                  break;
                }
              }
            }
          }

          // 날짜를 찾았으면 업데이트
          if (createdDate) {
            const updateDate = new Date(createdDate).toISOString();
            
            db.run(`
              UPDATE blog_posts 
              SET created_date = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [updateDate, post.id], function(updateErr) {
              if (updateErr) {
                console.error(`❌ ${post.log_no} 업데이트 실패:`, updateErr);
                errors++;
              } else {
                console.log(`✅ ${post.log_no} 날짜 수정: ${updateDate.substring(0, 10)}`);
                fixed++;
              }
            });
          } else {
            console.log(`⚠️ ${post.log_no} 날짜 정보를 찾을 수 없음`);
            errors++;
          }

          // 요청 간 지연
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ ${post.log_no} 처리 실패:`, error.message);
          errors++;
        }
      }

      // 결과 출력
      setTimeout(() => {
        console.log(`\n🎉 날짜 수정 완료: 성공 ${fixed}개, 실패 ${errors}개`);
        resolve({ fixed, errors });
      }, 2000);
    });
  });
}

// 실행
if (require.main === module) {
  fixPostDates()
    .then(result => {
      console.log('결과:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { fixPostDates };