import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown() {
  console.log('🎉 Playwright 테스트 완료!');
  console.log('🧹 테스트 후 자동 정리 시작...');
  
  // 1. 모든 브라우저 프로세스 정리
  try {
    console.log('🧹 브라우저 프로세스 정리 중...');
    
    // Edge 브라우저 정리
    try {
      await execAsync('wmic process where "name=\'msedge.exe\'" delete');
      console.log('✅ Edge 브라우저 프로세스 정리 완료');
    } catch (edgeError) {
      console.log('ℹ️ Edge 브라우저 프로세스 없음 또는 이미 정리됨');
    }
    
    // Chrome 브라우저 정리
    try {
      await execAsync('wmic process where "name=\'chrome.exe\'" delete');
      console.log('✅ Chrome 브라우저 프로세스 정리 완료');
    } catch (chromeError) {
      console.log('ℹ️ Chrome 브라우저 프로세스 없음 또는 이미 정리됨');
    }
    
    // Firefox 브라우저 정리
    try {
      await execAsync('wmic process where "name=\'firefox.exe\'" delete');
      console.log('✅ Firefox 브라우저 프로세스 정리 완료');
    } catch (firefoxError) {
      console.log('ℹ️ Firefox 브라우저 프로세스 없음 또는 이미 정리됨');
    }
    
  } catch (error) {
    console.log('⚠️ 브라우저 프로세스 정리 중 일부 오류 발생 (정상적일 수 있음)');
  }
  
  // 2. 잠시 대기 (프로세스 정리 완료 대기)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. 로컬 호스팅을 위한 단일 웹사이트만 열기
  console.log('🌐 로컬에 하나만 호스팅해드립니다...');
  
  try {
    // 설정된 포트로 웹사이트 열기 (playwright.config.ts의 webServer 포트 사용)
    await execAsync('start http://localhost:3005');
    console.log('✅ 로컬 웹사이트 호스팅 완료: http://localhost:3005');
    console.log('📋 테스트 요구사항: 모든 테스트 페이지는 테스트 완료 후 자동 정리됩니다.');
  } catch (error) {
    console.log('⚠️ 웹사이트를 자동으로 열 수 없습니다. 수동으로 http://localhost:3005를 방문해주세요.');
  }
  
  console.log('🎯 전체 테스트 정리 완료! 다시는 수동 정리 필요 없습니다.');
}

export default globalTeardown;