import { test, expect } from '@playwright/test';

const DEV_PORT = process.env.DEV_PORT || '3004';
const BASE_URL = `http://localhost:${DEV_PORT}`;

test.describe('오늘 포스트 알림 기능', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('헤더에 알림 아이콘이 표시되는지 확인', async ({ page }) => {
    // 헤더의 알림 아이콘 버튼 확인
    const notificationButton = page.locator('button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await expect(notificationButton).toBeVisible();

    // 알림 아이콘 확인
    const bellIcon = page.locator('svg[class*="lucide-bell"]');
    await expect(bellIcon).toBeVisible();
  });

  test('오늘 포스트 API가 정상적으로 응답하는지 확인', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/merry/today-posts`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('date');
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('posts');
    expect(Array.isArray(data.posts)).toBe(true);
  });

  test('알림 드롭다운을 열고 닫을 수 있는지 확인', async ({ page }) => {
    // 알림 버튼 클릭
    const notificationButton = page.locator('button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await notificationButton.click();

    // 드롭다운이 나타나는지 확인
    const sheetContent = page.locator('[role="dialog"]').filter({ hasText: '오늘의 새 포스트' });
    await expect(sheetContent).toBeVisible();

    // 제목 확인
    await expect(page.getByRole('heading', { name: '오늘의 새 포스트' })).toBeVisible();
  });

  test('오늘 포스트가 있을 때 알림 카운트 표시', async ({ page }) => {
    // API 응답을 모킹하여 포스트가 있는 경우를 시뮬레이션
    await page.route('/api/merry/today-posts', async (route) => {
      await route.fulfill({
        json: {
          date: '2025-08-24',
          count: 2,
          posts: [
            {
              id: 1,
              logNo: 100,
              title: '테스트 포스트 1',
              summary: '오늘 작성된 첫 번째 테스트 포스트입니다.',
              createdDate: '2025-08-24 15:30',
              views: 10
            },
            {
              id: 2,
              logNo: 101,
              title: '테스트 포스트 2',
              summary: '오늘 작성된 두 번째 테스트 포스트입니다.',
              createdDate: '2025-08-24 16:00',
              views: 5
            }
          ]
        }
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // 알림 카운트 배지가 표시되는지 확인
    const notificationBadge = page.locator('[class*="absolute"][class*="badge"]');
    await expect(notificationBadge).toBeVisible();
    await expect(notificationBadge).toContainText('2');
  });

  test('오늘 포스트가 없을 때 알림 표시', async ({ page }) => {
    // API 응답을 모킹하여 포스트가 없는 경우를 시뮬레이션
    await page.route('/api/merry/today-posts', async (route) => {
      await route.fulfill({
        json: {
          date: '2025-08-24',
          count: 0,
          posts: []
        }
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // 알림 버튼 클릭
    const notificationButton = page.locator('button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await notificationButton.click();

    // "오늘 새로운 포스트가 없습니다" 메시지 확인
    await expect(page.getByText('오늘 새로운 포스트가 없습니다')).toBeVisible();
  });

  test('오늘 포스트 목록에서 포스트 클릭 시 해당 페이지로 이동', async ({ page }) => {
    // API 응답을 모킹
    await page.route('/api/merry/today-posts', async (route) => {
      await route.fulfill({
        json: {
          date: '2025-08-24',
          count: 1,
          posts: [
            {
              id: 1,
              logNo: 100,
              title: '테스트 포스트',
              summary: '테스트 포스트 요약입니다.',
              createdDate: '2025-08-24 15:30',
              views: 10
            }
          ]
        }
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // 알림 버튼 클릭하여 드롭다운 열기
    const notificationButton = page.locator('button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await notificationButton.click();

    // 포스트 링크 클릭 (새 탭에서 열리므로 context를 사용)
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('link', { name: /테스트 포스트/ }).first().click()
    ]);

    // 새 페이지의 URL이 올바른지 확인
    expect(newPage.url()).toContain('/merry/posts/100');
  });

  test('새로고침 버튼 기능 확인', async ({ page }) => {
    // 알림 버튼 클릭하여 드롭다운 열기
    const notificationButton = page.locator('button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await notificationButton.click();

    // API 호출을 추적
    let apiCalled = false;
    await page.route('/api/merry/today-posts', async (route) => {
      apiCalled = true;
      await route.continue();
    });

    // 새로고침 버튼 클릭
    const refreshButton = page.getByRole('button', { name: '새로고침' });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // API가 호출되었는지 확인
    expect(apiCalled).toBe(true);
  });

  test('모바일 화면에서 알림 기능 동작 확인', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 알림 버튼이 여전히 표시되는지 확인
    const notificationButton = page.locator('button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await expect(notificationButton).toBeVisible();

    // 드롭다운 기능이 정상 작동하는지 확인
    await notificationButton.click();
    const sheetContent = page.locator('[role="dialog"]').filter({ hasText: '오늘의 새 포스트' });
    await expect(sheetContent).toBeVisible();
  });

  test('로딩 상태 표시 확인', async ({ page }) => {
    // API 응답을 지연시켜 로딩 상태 확인
    await page.route('/api/merry/today-posts', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        json: {
          date: '2025-08-24',
          count: 0,
          posts: []
        }
      });
    });

    await page.reload();

    // 알림 버튼 클릭
    const notificationButton = page.locator('button[class*="relative"]').filter({ has: page.locator('svg[class*="lucide-bell"]') });
    await notificationButton.click();

    // 로딩 상태 확인
    await expect(page.getByText('로딩 중...')).toBeVisible();
    
    // 로딩 완료 후 메시지 확인
    await expect(page.getByText('오늘 새로운 포스트가 없습니다')).toBeVisible({ timeout: 5000 });
  });
});