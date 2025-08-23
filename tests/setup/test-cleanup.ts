import { test } from '@playwright/test';

/**
 * 🧹 테스트 자동 정리 시스템
 * CLAUDE.md 테스트 정리 요구사항을 자동으로 적용하는 공통 설정
 * 
 * 사용법:
 * import './setup/test-cleanup';
 * 
 * 모든 테스트 파일 최상단에 import하면 자동으로 적용됩니다.
 */

// 전역 페이지 추적 배열
let globalOpenedPages: any[] = [];
let globalOpenedBrowsers: any[] = [];

// 각 테스트 전에 페이지 추적 초기화
test.beforeEach(async ({ page, browser }) => {
  console.log('🧪 테스트 시작 - 페이지 추적 초기화');
  
  // 현재 페이지를 추적 목록에 추가
  if (page && !globalOpenedPages.includes(page)) {
    globalOpenedPages.push(page);
  }
  
  // 브라우저 인스턴스 추적
  if (browser && !globalOpenedBrowsers.includes(browser)) {
    globalOpenedBrowsers.push(browser);
  }
});

// 각 테스트 후에 자동 정리
test.afterEach(async ({ page }) => {
  console.log('🧹 테스트 완료 - 자동 정리 시작');
  
  // 열린 모든 페이지 정리
  const pagesToClose = [...globalOpenedPages];
  for (const openedPage of pagesToClose) {
    try {
      if (openedPage && !openedPage.isClosed()) {
        await openedPage.close();
        console.log('✅ 테스트 페이지 정리 완료');
      }
    } catch (error) {
      console.log('⚠️ 페이지 정리 중 오류:', error.message);
    }
  }
  
  // 추가로 열린 모든 페이지들도 정리
  try {
    const context = page?.context();
    if (context) {
      const allPages = context.pages();
      for (const contextPage of allPages) {
        if (contextPage && !contextPage.isClosed()) {
          await contextPage.close();
          console.log('✅ 컨텍스트 페이지 정리 완료');
        }
      }
    }
  } catch (error) {
    console.log('⚠️ 컨텍스트 페이지 정리 중 오류:', error.message);
  }
  
  // 배열 초기화
  globalOpenedPages = [];
  console.log('🎯 테스트 정리 완료');
});

// 전역 정리 (모든 테스트 완료 후)
test.afterAll(async () => {
  console.log('🏁 전체 테스트 완료 - 전역 정리 시작');
  
  // 남은 브라우저 인스턴스들 정리
  for (const browser of globalOpenedBrowsers) {
    try {
      if (browser && browser.isConnected()) {
        await browser.close();
        console.log('✅ 브라우저 인스턴스 정리 완료');
      }
    } catch (error) {
      console.log('⚠️ 브라우저 정리 중 오류:', error.message);
    }
  }
  
  globalOpenedBrowsers = [];
  globalOpenedPages = [];
  
  console.log('🎉 전체 테스트 정리 완료!');
});

// 페이지 추적 유틸리티 함수 내보내기
export const trackPage = (page: any) => {
  if (page && !globalOpenedPages.includes(page)) {
    globalOpenedPages.push(page);
    console.log('📝 새 페이지 추적 추가됨');
  }
};

export const trackBrowser = (browser: any) => {
  if (browser && !globalOpenedBrowsers.includes(browser)) {
    globalOpenedBrowsers.push(browser);
    console.log('📝 새 브라우저 추적 추가됨');
  }
};

console.log('🔧 테스트 자동 정리 시스템 로드됨 (CLAUDE.md 요구사항 적용)');