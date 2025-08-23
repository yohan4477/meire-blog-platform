/**
 * 🧹 테스트 자동 정리 시스템 일괄 적용 스크립트
 * 
 * CLAUDE.md 요구사항을 모든 Playwright 테스트 파일에 자동으로 적용합니다.
 * 
 * 실행: node scripts/apply-test-cleanup.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const TESTS_DIR = path.join(__dirname, '..', 'tests');
const CLEANUP_IMPORT = `import './setup/test-cleanup';`;
const CLEANUP_REQUIRE = `require('./setup/test-cleanup');`;

// 테스트 파일 패턴
const TEST_PATTERNS = [
  path.join(TESTS_DIR, '*.spec.ts'),
  path.join(TESTS_DIR, '*.spec.js'),
  path.join(TESTS_DIR, '*.test.ts'),
  path.join(TESTS_DIR, '*.test.js')
];

function applyCleanupToFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // 이미 cleanup이 적용되었는지 확인
    if (content.includes('./setup/test-cleanup')) {
      console.log(`⏭️  ${fileName}: 이미 적용됨`);
      return false;
    }
    
    // setup 디렉토리 파일은 제외
    if (filePath.includes('setup/')) {
      console.log(`⏭️  ${fileName}: setup 파일 제외`);
      return false;
    }
    
    let modified = false;
    
    // TypeScript 파일 (.ts, .tsx)
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const importMatch = content.match(/^import .* from ['"]@playwright\/test['"];?$/m);
      if (importMatch) {
        const importLine = importMatch[0];
        const newContent = content.replace(
          importLine,
          `${importLine}\n${CLEANUP_IMPORT}`
        );
        fs.writeFileSync(filePath, newContent, 'utf8');
        modified = true;
        console.log(`✅ ${fileName}: TypeScript import 적용`);
      }
    }
    
    // JavaScript 파일 (.js, .jsx)
    else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      const requireMatch = content.match(/^const .* = require\(['"]@playwright\/test['"]\);?$/m);
      if (requireMatch) {
        const requireLine = requireMatch[0];
        const newContent = content.replace(
          requireLine,
          `${requireLine}\n${CLEANUP_REQUIRE}`
        );
        fs.writeFileSync(filePath, newContent, 'utf8');
        modified = true;
        console.log(`✅ ${fileName}: JavaScript require 적용`);
      }
    }
    
    if (!modified) {
      console.log(`⚠️  ${fileName}: Playwright import/require를 찾을 수 없음`);
    }
    
    return modified;
    
  } catch (error) {
    console.error(`❌ ${path.basename(filePath)}: 처리 실패 -`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 테스트 자동 정리 시스템 일괄 적용 시작...');
  console.log('📋 CLAUDE.md 테스트 정리 요구사항을 모든 파일에 적용합니다.');
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  // 모든 테스트 파일 패턴 검색
  for (const pattern of TEST_PATTERNS) {
    const files = glob.sync(pattern);
    
    for (const file of files) {
      totalFiles++;
      if (applyCleanupToFile(file)) {
        modifiedFiles++;
      }
    }
  }
  
  console.log('\n📊 작업 완료:');
  console.log(`📁 총 검사 파일: ${totalFiles}개`);
  console.log(`✅ 수정된 파일: ${modifiedFiles}개`);
  console.log(`⏭️  건너뛴 파일: ${totalFiles - modifiedFiles}개`);
  
  if (modifiedFiles > 0) {
    console.log('\n🎯 이제 테스트를 실행하면:');
    console.log('  ✅ 모든 페이지가 자동으로 정리됩니다');
    console.log('  ✅ 브라우저 프로세스가 자동으로 종료됩니다');
    console.log('  ✅ 로컬에 하나의 호스팅만 남겨둡니다');
    console.log('  🚨 다시는 수동 정리가 필요하지 않습니다!');
  } else {
    console.log('\n✨ 모든 파일이 이미 최신 상태입니다!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { applyCleanupToFile };