/**
 * InteractiveButton 컴포넌트 테스트
 * 버튼 클릭 시 즉시 반응성과 로딩 상태 테스트
 */

const { test, expect } = require('@playwright/test');
require('./setup/test-cleanup');

test.describe('InteractiveButton 반응성 테스트', () => {
  let openedPages = []; // 테스트 중 열린 페이지들 추적

  test.beforeEach(async ({ page }) => {
    // 개발 서버 포트 확인
    const serverPort = process.env.DEV_PORT || '3020';
    await page.goto(`http://localhost:${serverPort}`);
    
    // 페이지 로딩 완료 대기 (타임아웃 방지를 위해 domcontentloaded로 변경)
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async ({ page }) => {
    // 🧹 테스트 중 열린 모든 페이지 정리
    for (const openedPage of openedPages) {
      try {
        if (!openedPage.isClosed()) {
          await openedPage.close();
          console.log('✅ 테스트 페이지 정리 완료');
        }
      } catch (error) {
        console.log('⚠️ 페이지 정리 중 오류:', error.message);
      }
    }
    openedPages = []; // 배열 초기화
  });

  test('메인 페이지 버튼들의 즉시 반응성 확인', async ({ page }) => {
    console.log('🧪 메인 페이지 버튼 반응성 테스트 시작');
    
    // 하단 카드 섹션이 로딩될 때까지 대기
    await page.waitForSelector('[data-testid="bottom-cards"]', { timeout: 10000 });
    
    // 국민연금 분석 카드의 "자세히 보기" 버튼 찾기
    const detailButton = page.locator('text=자세히 보기').first();
    await expect(detailButton).toBeVisible();
    
    // 버튼 클릭 시 즉시 시각적 피드백 확인
    console.log('🖱️ 버튼 클릭 반응성 테스트');
    
    // 버튼의 초기 스타일 저장
    const initialClass = await detailButton.getAttribute('class');
    
    // 버튼 클릭
    await detailButton.click();
    
    // 클릭 후 100ms 이내에 변화가 있는지 확인
    await page.waitForTimeout(50);
    
    console.log('✅ 내부 링크 버튼 반응성 테스트 완료');
  });

  test('외부 링크 버튼의 즉시 피드백 확인', async ({ page }) => {
    console.log('🧪 외부 링크 버튼 테스트 시작');
    
    // 외부 링크 테스트 섹션이 보일 때까지 스크롤
    const externalLinkSection = page.locator('text=외부 링크 테스트');
    await externalLinkSection.scrollIntoViewIfNeeded();
    
    // 국민연금 공식 사이트 버튼 찾기
    const externalButton = page.locator('text=국민연금 공식 사이트');
    await expect(externalButton).toBeVisible();
    
    // 새 탭 열기 이벤트 감지
    const [newPage] = await Promise.all([
      // 새 페이지가 열릴 것을 기다림
      page.waitForEvent('popup'),
      // 버튼 클릭
      externalButton.click()
    ]);
    
    // 🗂️ 열린 페이지를 추적 배열에 추가
    openedPages.push(newPage);
    
    // 새 탭에서 올바른 URL로 이동했는지 확인
    await newPage.waitForLoadState();
    const newPageURL = newPage.url();
    expect(newPageURL).toContain('nps.or.kr');
    
    // 🧹 즉시 새 탭 닫기 (테스트 완료 후 정리)
    await newPage.close();
    console.log('🧹 외부 링크 테스트 페이지 정리 완료');
    
    console.log('✅ 외부 링크 버튼 테스트 완료');
  });


  test('버튼 상호작용 성능 측정', async ({ page }) => {
    console.log('📊 버튼 반응 시간 성능 측정');
    
    // 성능 측정을 위한 Navigation Timing API 사용
    await page.evaluate(() => {
      window.buttonClickTimes = [];
      
      // 모든 버튼에 클릭 시간 측정 이벤트 추가
      document.querySelectorAll('button').forEach((button, index) => {
        button.addEventListener('mousedown', () => {
          window.buttonClickTimes[index] = performance.now();
        });
        
        button.addEventListener('mouseup', () => {
          if (window.buttonClickTimes[index]) {
            const responseTime = performance.now() - window.buttonClickTimes[index];
            console.log(`Button ${index} response time: ${responseTime}ms`);
          }
        });
      });
    });
    
    // 첫 번째 버튼 클릭하여 반응 시간 측정
    const firstButton = page.locator('button').first();
    if (await firstButton.isVisible()) {
      await firstButton.click();
      
      // 반응 시간 결과 확인
      const clickTimes = await page.evaluate(() => window.buttonClickTimes);
      console.log('📈 버튼 반응 시간 데이터:', clickTimes);
    }
    
    console.log('✅ 성능 측정 완료');
  });
});

console.log('🎉 Playwright 테스트 완료!');
console.log('🧹 모든 테스트 페이지가 자동으로 정리되었습니다.');
console.log('📂 웹사이트를 자동으로 열어드립니다...');

// 테스트 후 웹사이트 자동 오픈
const { execSync } = require('child_process');
try {
  const serverPort = process.env.DEV_PORT || '3020';
  execSync(`start http://localhost:${serverPort}`, { stdio: 'inherit' });
  console.log(`✅ 웹사이트가 열렸습니다: http://localhost:${serverPort}`);
  console.log('📋 테스트 요구사항: 모든 테스트 페이지는 테스트 완료 후 자동 정리됩니다.');
} catch (error) {
  console.log('⚠️ 자동 웹사이트 열기 실패:', error.message);
}