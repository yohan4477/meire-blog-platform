/**
 * 메르 포스트 분석 완료 후 카카오톡 자동 전송
 * 사용법: node send-analysis-to-kakao.js [포스트번호]
 */

const Database = require('better-sqlite3');

// 카카오톡 메시지 전송 함수
async function sendToKakao(analysisResult) {
  try {
    // 카카오톡 Access Token (환경변수에서 가져오기)
    const KAKAO_ACCESS_TOKEN = process.env.KAKAO_ACCESS_TOKEN;
    
    if (!KAKAO_ACCESS_TOKEN) {
      console.log('⚠️ KAKAO_ACCESS_TOKEN 환경변수가 설정되지 않았습니다.');
      console.log('💡 카카오톡 Developer Console에서 토큰을 발급받아 설정해주세요.');
      return false;
    }

    const messageText = `🎯 메르 포스트 분석 완료!

📝 ${analysisResult.title}

💭 메르님 한줄 코멘트:
${analysisResult.comment}

📊 언급 종목: ${analysisResult.stocks}

💡 투자 인사이트:
${analysisResult.insight}

📅 ${new Date().toLocaleString('ko-KR')}

🔗 http://localhost:3004`;

    const template = {
      object_type: 'text',
      text: messageText,
      link: {
        web_url: 'http://localhost:3004',
        mobile_web_url: 'http://localhost:3004'
      },
      button_title: '메르 블로그 보기'
    };

    const formData = new URLSearchParams();
    formData.append('template_object', JSON.stringify(template));

    const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${KAKAO_ACCESS_TOKEN}`
      },
      body: formData
    });

    if (response.ok) {
      console.log('✅ 카카오톡 메시지 전송 완료!');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ 카카오톡 전송 실패:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ 카카오톡 전송 오류:', error.message);
    return false;
  }
}

async function main() {
  const db = new Database('database.db');
  
  try {
    // 명령행 인수에서 포스트 번호 가져오기 (없으면 최신 포스트)
    const logNo = process.argv[2];
    
    let post;
    if (logNo) {
      post = db.prepare(`
        SELECT bp.*, pa.summary, pa.investment_insight
        FROM blog_posts bp
        LEFT JOIN post_analysis pa ON bp.log_no = pa.log_no
        WHERE bp.log_no = ?
      `).get(logNo);
    } else {
      post = db.prepare(`
        SELECT bp.*, pa.summary, pa.investment_insight
        FROM blog_posts bp
        LEFT JOIN post_analysis pa ON bp.log_no = pa.log_no
        WHERE pa.summary IS NOT NULL
        ORDER BY bp.created_date DESC
        LIMIT 1
      `).get();
    }

    if (!post) {
      console.log('❌ 포스트를 찾을 수 없거나 분석이 완료되지 않았습니다.');
      return;
    }

    if (!post.summary || !post.investment_insight) {
      console.log('❌ 분석이 완료되지 않은 포스트입니다.');
      console.log('💡 먼저 포스트 분석을 완료해주세요.');
      return;
    }

    console.log(`📊 포스트 정보: ${post.title}`);
    console.log(`💭 한줄 코멘트: ${post.summary.substring(0, 50)}...`);
    console.log(`💡 투자 인사이트: ${post.investment_insight.substring(0, 50)}...`);
    console.log();

    const analysisResult = {
      title: post.title,
      comment: post.summary,
      insight: post.investment_insight,
      stocks: post.mentioned_stocks || '없음',
      date: post.created_date,
      postUrl: `http://localhost:3004/merry/posts/${post.id}`
    };

    console.log('📱 카카오톡으로 분석 결과 전송 중...');
    const success = await sendToKakao(analysisResult);
    
    if (success) {
      console.log('🎉 카카오톡 전송 완료!');
      
      // 전송 기록을 데이터베이스에 저장
      const logStmt = db.prepare(`
        INSERT OR IGNORE INTO notification_log 
        (log_no, notification_type, sent_at, success) 
        VALUES (?, 'kakao', datetime('now'), ?)
      `);
      
      // notification_log 테이블이 없으면 생성
      db.exec(`
        CREATE TABLE IF NOT EXISTS notification_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          log_no TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          sent_at DATETIME NOT NULL,
          success INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      logStmt.run(post.log_no, success ? 1 : 0);
      console.log('📝 전송 기록 저장 완료');
    }
  } catch (error) {
    console.error('❌ 실행 오류:', error.message);
  } finally {
    db.close();
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  console.log('🚀 카카오톡 분석 결과 전송 시작...');
  main().catch(console.error);
}

module.exports = { sendToKakao };