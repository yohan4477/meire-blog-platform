const { Database } = require('sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'database.db');

function cleanBlogContent(content) {
  if (!content) return '';
  
  let cleaned = content
    // 1. 저작권 표시 및 출처 제거
    .replace(/© [^,]+,?\s*출처[^\n]*/g, '')
    .replace(/출처\s*[^\n]*/g, '')
    .replace(/© [^,\n]+/g, '')
    
    // 2. @mentions 제거
    .replace(/@\w+/g, '')
    
    // 3. URL 제거 (선택적으로 유지할 수 있음)
    .replace(/https?:\/\/[^\s]+/g, '')
    
    // 4. HTML 태그와 특수 문자 정리
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/&[^;]+;/g, '') // HTML 엔티티 제거
    .replace(/\u200B/g, '') // Zero-width space 제거
    .replace(/\u00A0/g, ' ') // Non-breaking space를 일반 공백으로
    
    // 5. 과도한 공백 정리 (줄바꿈은 보존)
    .replace(/[ \t]{3,}/g, ' ') // 3개 이상의 연속 공백/탭을 1개로
    .replace(/^\s+/gm, '') // 각 줄의 시작 공백 제거
    .replace(/\s+$/gm, '') // 각 줄의 끝 공백 제거
    .replace(/\n{4,}/g, '\n\n\n') // 4개 이상의 연속 줄바꿈을 3개로
    .trim();

  // 6. 메르님 스타일 구조화
  const lines = cleaned.split('\n').filter(line => line.trim() !== '');
  let organized = [];
  let oneLinerComments = []; // 한 줄 코멘트 수집
  
  // 한 줄 코멘트 추출 및 제거
  const processedLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // "한 줄 코멘트" 패턴 감지
    if (line.includes('한 줄 코멘트') || 
        (line.length > 10 && line.length < 200 && 
         (line.includes('이다.') || line.includes('된다.') || line.includes('같음.') || 
          line.includes('것임.') || line.includes('모르겠음.')))) {
      
      // 한 줄 코멘트에서 "한 줄 코멘트." 제거하고 실제 내용만 추출
      const comment = line.replace(/한\s*줄\s*코멘트[.\s]*/, '').trim();
      if (comment && comment.length > 10) {
        oneLinerComments.push(comment);
      }
    } else if (line) {
      processedLines.push(line);
    }
  }

  // 번호 매김 항목들을 단락으로 그룹화 (메르님 스타일 유지)
  let currentParagraph = [];
  
  for (const line of processedLines) {
    // 숫자로 시작하는 항목
    if (/^\d+\./.test(line)) {
      if (currentParagraph.length > 0) {
        organized.push(currentParagraph.join('\n'));
        currentParagraph = [];
      }
      currentParagraph.push(line.replace(/^\d+\.\s*/, ''));
    }
    // 짧은 문장들 (한 줄로 처리)
    else if (line.length < 100) {
      if (currentParagraph.length > 0) {
        organized.push(currentParagraph.join('\n'));
        currentParagraph = [];
      }
      organized.push(line);
    }
    // 긴 문장들 (단락 구성)
    else {
      currentParagraph.push(line);
    }
  }
  
  // 마지막 단락 추가
  if (currentParagraph.length > 0) {
    organized.push(currentParagraph.join('\n'));
  }

  let result = '';
  
  // 한 줄 코멘트를 맨 앞에 배치 (메르님 스타일)
  if (oneLinerComments.length > 0) {
    result += '📝 **메르님 한 줄 요약**: ' + oneLinerComments[0] + '\n\n';
    result += '---\n\n';
  }
  
  // 본문 내용
  result += organized.join('\n\n');
  
  // 추가 한 줄 코멘트들은 끝에 배치
  if (oneLinerComments.length > 1) {
    result += '\n\n---\n\n';
    for (let i = 1; i < oneLinerComments.length; i++) {
      result += '💬 ' + oneLinerComments[i] + '\n\n';
    }
  }

  return result;
}

async function updateBlogPosts() {
  return new Promise((resolve, reject) => {
    const db = new Database(dbPath);
    
    db.all("SELECT id, title, content FROM blog_posts WHERE content IS NOT NULL AND length(content) > 100", (err, posts) => {
      if (err) {
        reject(err);
        return;
      }
      
      let processedCount = 0;
      const totalPosts = posts.length;
      
      console.log(`🚀 ${totalPosts}개 포스트 내용 정리 시작...`);
      
      if (totalPosts === 0) {
        console.log('✅ 정리할 포스트가 없습니다.');
        db.close();
        resolve();
        return;
      }
      
      posts.forEach((post, index) => {
        const originalLength = post.content.length;
        const cleanedContent = cleanBlogContent(post.content);
        const newLength = cleanedContent.length;
        
        db.run(
          "UPDATE blog_posts SET content = ? WHERE id = ?", 
          [cleanedContent, post.id], 
          function(updateErr) {
            processedCount++;
            
            if (updateErr) {
              console.error(`❌ 포스트 ${post.id} 업데이트 실패:`, updateErr);
            } else {
              console.log(`✅ [${processedCount}/${totalPosts}] "${post.title.substring(0, 30)}..." 정리 완료`);
              console.log(`   ${originalLength} → ${newLength} chars (${Math.round((1 - newLength/originalLength) * 100)}% 감소)`);
            }
            
            if (processedCount === totalPosts) {
              console.log(`🎯 모든 포스트 정리 완료! (${totalPosts}개 처리)`);
              db.close();
              resolve();
            }
          }
        );
      });
    });
  });
}

// 스크립트 직접 실행시
if (require.main === module) {
  updateBlogPosts()
    .then(() => {
      console.log('✅ 블로그 포스트 정리 작업 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 블로그 포스트 정리 작업 실패:', error);
      process.exit(1);
    });
}

module.exports = { cleanBlogContent, updateBlogPosts };