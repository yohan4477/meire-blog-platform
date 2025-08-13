import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown() {
  console.log('🎉 Playwright 테스트 완료!');
  console.log('📂 웹사이트를 자동으로 열어드립니다...');
  
  try {
    // Windows에서 기본 브라우저로 웹사이트 열기
    await execAsync('start http://localhost:3004');
    console.log('✅ 웹사이트가 열렸습니다: http://localhost:3004');
  } catch (error) {
    console.log('⚠️ 웹사이트를 자동으로 열 수 없습니다. 수동으로 http://localhost:3004를 방문해주세요.');
  }
}

export default globalTeardown;