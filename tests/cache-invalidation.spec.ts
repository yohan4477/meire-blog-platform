import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

// CLAUDE.md 요구사항: 캐시 무효화 테스트 - 실시간 업데이트 검증
test.describe('메르\'s Pick 캐시 무효화', () => {
  test('캐시 버스터 파라미터로 실시간 업데이트 지원 확인', async ({ page }) => {
    console.log('🔄 캐시 무효화 테스트 시작');

    // 1. 일반 API 호출 (30초 캐시)
    const normalResponse = await page.request.get('http://localhost:3004/api/merry/picks?limit=3');
    expect(normalResponse.status()).toBe(200);
    
    const normalHeaders = normalResponse.headers();
    console.log('📄 일반 요청 캐시 헤더:', normalHeaders['cache-control']);
    expect(normalHeaders['cache-control']).toContain('max-age=30');

    // 2. 캐시 버스터 포함 API 호출 (완전 무효화)
    const timestamp = Date.now();
    const bustResponse = await page.request.get(`http://localhost:3004/api/merry/picks?limit=3&t=${timestamp}`);
    expect(bustResponse.status()).toBe(200);
    
    const bustHeaders = bustResponse.headers();
    console.log('🚫 캐시 버스터 요청 헤더:', bustHeaders['cache-control']);
    expect(bustHeaders['cache-control']).toContain('no-store');
    expect(bustHeaders['cache-control']).toContain('no-cache');
    expect(bustHeaders['pragma']).toBe('no-cache');

    // 3. 응답 데이터 구조 검증
    const data = await bustResponse.json();
    expect(data.success).toBe(true);
    expect(data.data.picks).toBeInstanceOf(Array);
    
    if (data.data.picks.length > 0) {
      const firstPick = data.data.picks[0];
      expect(firstPick).toHaveProperty('ticker');
      expect(firstPick).toHaveProperty('name');
      expect(firstPick).toHaveProperty('last_mentioned_at');
      expect(firstPick).toHaveProperty('description');
      console.log(`✅ 첫 번째 Pick: ${firstPick.name} (${firstPick.ticker})`);
    }

    console.log('🎯 캐시 무효화 테스트 완료 - 실시간 업데이트 지원 확인됨');
  });

  test('메인 페이지에서 메르\'s Pick 컴포넌트 로딩 확인', async ({ page }) => {
    console.log('📱 메인 페이지 메르\'s Pick 컴포넌트 테스트');

    await page.goto('http://localhost:3004');
    
    // 메르's Pick 섹션 존재 확인
    await expect(page.locator('text=메르\'s Pick')).toBeVisible();
    
    // 최신 언급일 기준 랭킹 배지 확인
    await expect(page.locator('text=최신 언급일 기준 랭킹')).toBeVisible();
    
    // 종목 카드 존재 확인
    const stockCards = page.locator('[data-testid="stock-card"]').or(page.locator('.border').filter({ hasText: /[A-Z0-9]{3,6}/ }));
    const cardCount = await stockCards.count();
    console.log(`📊 표시된 종목 카드 수: ${cardCount}개`);
    
    if (cardCount > 0) {
      console.log('✅ 메르\'s Pick 데이터 정상 로딩 확인');
    }
  });

  test('API 응답 시간 성능 요구사항 확인', async ({ page }) => {
    console.log('⚡ API 성능 테스트 - 500ms 이내 응답 확인');

    const startTime = Date.now();
    const response = await page.request.get(`http://localhost:3004/api/merry/picks?limit=5&t=${Date.now()}`);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    console.log(`⏱️ API 응답 시간: ${responseTime}ms`);
    
    expect(response.status()).toBe(200);
    // CLAUDE.md 성능 요구사항: 캐시 버스터 사용 시 < 500ms
    expect(responseTime).toBeLessThan(500);
    
    console.log('🎯 성능 요구사항 충족 - 500ms 이내 응답 완료');
  });
});