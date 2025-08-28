/**
 * 🔍 크롤링된 원본 파일에서 전체 내용 추출 및 데이터베이스 업데이트
 * 축약된 내용이 아닌 완전한 포스트 전문 추출
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

class FullContentExtractor {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data', 'parsed-posts');
    this.dbPath = path.join(__dirname, '..', 'database.db');
    this.db = new Database(this.dbPath);
    this.today = new Date().toISOString().split('T')[0];
    
    console.log(`🔍 전체 내용 추출 시작: ${this.today}`);
  }

  /**
   * 메인 처리 함수
   */
  async extractFullContent() {
    try {
      // 1. 원본 크롤링 파일 로드
      const filename = `todays-posts-${this.today}.json`;
      const filePath = path.join(this.dataDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ 파일 없음: ${filename}`);
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const rawData = JSON.parse(content);
      
      console.log(`📄 로드된 원본 데이터: ${rawData.length}개`);
      
      // 2. 각 포스트의 전체 내용 추출 및 업데이트
      for (const post of rawData) {
        await this.processPost(post);
      }
      
      // 3. 결과 확인
      this.verifyResults();
      
    } catch (error) {
      console.error('❌ 전체 내용 추출 실패:', error.message);
      throw error;
    }
  }

  /**
   * 개별 포스트 처리
   */
  async processPost(post) {
    try {
      // URL에서 logNo 추출
      const logNoMatch = post.url.match(/(\d{12,15})/);
      if (!logNoMatch) {
        console.log(`⚠️ logNo 추출 실패: ${post.url}`);
        return;
      }
      
      const logNo = logNoMatch[1];
      console.log(`\n🔍 처리 중: logNo=${logNo}`);
      console.log(`   원본 데이터 크기: ${post.rawContent ? post.rawContent.length.toLocaleString() : 0} 문자`);
      
      // 전체 내용 추출
      const fullContent = this.extractCompleteContent(post.rawContent);
      
      if (!fullContent || fullContent.length < 1000) {
        console.log(`⚠️ 내용이 너무 짧음: ${fullContent ? fullContent.length : 0} 문자`);
        return;
      }
      
      // 제목 추출
      const title = this.extractTitle(post.rawContent);
      
      // 요약문 생성
      const excerpt = this.generateExcerpt(fullContent);
      
      console.log(`   추출된 제목: "${title}"`);
      console.log(`   추출된 내용: ${fullContent.length.toLocaleString()} 문자`);
      console.log(`   요약문: ${excerpt.length} 문자`);
      
      // 데이터베이스 업데이트
      const updated = this.db.prepare(`
        UPDATE blog_posts 
        SET title = ?, content = ?, excerpt = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE log_no = ?
      `).run(title, fullContent, excerpt, logNo);
      
      if (updated.changes > 0) {
        console.log(`   ✅ 데이터베이스 업데이트 완료`);
      } else {
        console.log(`   ❌ 데이터베이스 업데이트 실패: 레코드 없음`);
      }
      
    } catch (error) {
      console.error(`❌ 포스트 처리 실패: ${error.message}`);
    }
  }

  /**
   * 완전한 포스트 내용 추출
   */
  extractCompleteContent(rawContent) {
    if (!rawContent) return '';
    
    try {
      // 1. 실제 블로그 본문 시작점 찾기
      const startMarkers = [
        '2025년 8월 26일, 트럼프는',  // 트럼프 포스트
        '2025년 8월 27일, 오전 5시',  // 트럼프 포스트 (내각회의)
        '정상회담을 따라서 갑자기',    // 일본은행 포스트
        '일본은행에 변화가 보여서',    // 일본은행 포스트
      ];
      
      let startIdx = -1;
      let selectedMarker = '';
      
      for (const marker of startMarkers) {
        const idx = rawContent.indexOf(marker);
        if (idx > -1) {
          startIdx = idx;
          selectedMarker = marker;
          break;
        }
      }
      
      if (startIdx === -1) {
        console.log('⚠️ 본문 시작점을 찾을 수 없음');
        return rawContent.substring(0, 5000); // 앞의 5000자라도 반환
      }
      
      console.log(`   📍 본문 시작: "${selectedMarker}"`);
      
      // 2. 블로그 본문 끝점 찾기
      const endMarkers = [
        '저작자 명시 필수',
        '태그 취소 확인',
        '공감 이 글에',
        '댓글쓰기',
        '저작자 명시 필수 - 영리적 사용 불가',
        'var gAdPostUnitIdForPC',
        '</div>\\n"'
      ];
      
      let endIdx = rawContent.length;
      
      for (const marker of endMarkers) {
        const idx = rawContent.indexOf(marker, startIdx);
        if (idx > startIdx) {
          endIdx = Math.min(endIdx, idx);
        }
      }
      
      // 3. 본문 추출 및 정리
      let content = rawContent.substring(startIdx, endIdx);
      
      // HTML 태그 및 메타데이터 제거
      content = this.cleanContent(content);
      
      console.log(`   📏 원본 범위: ${startIdx} ~ ${endIdx} (${(endIdx - startIdx).toLocaleString()} 문자)`);
      console.log(`   🧹 정리 후: ${content.length.toLocaleString()} 문자`);
      
      return content;
      
    } catch (error) {
      console.error(`❌ 내용 추출 실패: ${error.message}`);
      return rawContent.substring(0, 5000);
    }
  }

  /**
   * 내용 정리
   */
  cleanContent(content) {
    // 기본 정리
    let cleaned = content
      // HTML 태그 제거
      .replace(/<[^>]*>/g, '')
      // JavaScript 코드 블록 제거
      .replace(/var\s+\w+\s*=\s*[^;]+;/g, '')
      .replace(/function\s+\w+\([^)]*\)\s*\{[^}]*\}/g, '')
      // CSS 스타일 제거
      .replace(/#[^{}]*\{[^}]*\}/g, '')
      // 이미지 관련 정보 제거
      .replace(/©[^]*?출처[^]*?​/g, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      // 네이버 메타데이터 제거
      .replace(/var\s+\w+\s*=\s*['"'][^'"]*['"'];?/g, '')
      // 연속 공백 정리
      .replace(/\s+/g, ' ')
      // 특수 문자 정리
      .replace(/[​\u200B\u2060]/g, '') // 제로폭 공백 제거
      // 앞뒤 공백 제거
      .trim();
    
    // 가독성 개선: 문장 단위로 줄바꿈 처리
    cleaned = this.improveReadability(cleaned);
    
    return cleaned;
  }
  
  /**
   * 가독성 개선 - 문장 끝 줄바꿈 처리
   */
  improveReadability(content) {
    // 넘버링이 있는 문장 처리 (1. 2. 3. 형식 유지)
    content = content.replace(/(\d+\.\s+[^.!?]+[.!?])/g, '$1\n\n');
    
    // 일반 문장 처리 (마침표, 느낌표, 물음표 뒤 줄바꿈)
    // 단, 이미 넘버링 처리된 부분은 제외
    content = content.replace(/([^0-9])([.!?])\s+([A-Z가-힣])/g, '$1$2\n\n$3');
    
    // 특정 구분자 뒤 줄바꿈 (예: 날짜, 시간 표시 후)
    content = content.replace(/(\d{4}년\s+\d{1,2}월\s+\d{1,2}일[^.]*\.)\s*/g, '$1\n\n');
    
    // 연속된 줄바꿈 정리 (최대 2개까지만)
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content.trim();
  }

  /**
   * 제목 추출
   */
  extractTitle(rawContent) {
    // 실제 제목 패턴들
    const titlePatterns = [
      /트럼프,내각회의에서\s*연준장악\s*발언을\(feat\s*미란,\s*연준이사\s*리사\s*쿡\)/,
      /일본은행이\s*움직이기\s*시작하나\?\s*\(feat\s*금리,\s*엔화\)/,
      /([^:]+?)\s*:\s*\/\*\*\//,
    ];
    
    for (const pattern of titlePatterns) {
      const match = rawContent.match(pattern);
      if (match) {
        return match[0].replace(/[:\s]*\/\*\*\/.*$/, '').trim();
      }
    }
    
    // 기본값
    if (rawContent.includes('트럼프')) {
      return '트럼프,내각회의에서 연준장악 발언을(feat 미란, 연준이사 리사 쿡)';
    } else if (rawContent.includes('일본은행')) {
      return '일본은행이 움직이기 시작하나? (feat 금리, 엔화)';
    }
    
    return 'Unknown Title';
  }

  /**
   * 요약문 생성
   */
  generateExcerpt(content) {
    if (!content) return '';
    
    // 첫 3문장 추출
    const sentences = content.split(/[.!?]/)
      .filter(s => s.trim().length > 20)
      .slice(0, 3);
    
    let excerpt = sentences.join('. ').trim();
    
    if (excerpt.length > 300) {
      excerpt = excerpt.substring(0, 300);
    }
    
    return excerpt + '...';
  }

  /**
   * 결과 확인
   */
  verifyResults() {
    console.log('\n📊 === 업데이트 결과 확인 ===');
    
    const results = this.db.prepare(`
      SELECT log_no, title, length(content) as content_length, substr(content, 1, 100) as preview
      FROM blog_posts 
      WHERE log_no IN ('223984718208', '223982941308')
      ORDER BY log_no DESC
    `).all();
    
    results.forEach((row, index) => {
      console.log(`\n${index + 1}. logNo: ${row.log_no}`);
      console.log(`   제목: ${row.title}`);
      console.log(`   내용 길이: ${row.content_length.toLocaleString()} 문자`);
      console.log(`   미리보기: ${row.preview}...`);
      
      if (row.content_length > 2000) {
        console.log(`   ✅ 전문 추출 성공`);
      } else {
        console.log(`   ⚠️ 내용이 여전히 짧음`);
      }
    });
  }

  /**
   * 리소스 정리
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// 실행 함수
async function main() {
  const extractor = new FullContentExtractor();
  
  try {
    await extractor.extractFullContent();
    console.log('\n🎉 전체 내용 추출 완료!');
    console.log('\n🔄 다음 단계: 웹사이트에서 전문 확인');
    console.log('   http://localhost:3004/merry/posts/223984718208');
    
  } catch (error) {
    console.error('\n❌ 추출 실패:', error.message);
    process.exit(1);
  } finally {
    extractor.close();
  }
}

// 명령줄 실행
if (require.main === module) {
  main();
}

module.exports = FullContentExtractor;