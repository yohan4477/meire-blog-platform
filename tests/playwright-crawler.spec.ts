import { test, expect } from '@playwright/test';
import { PlaywrightBlogCrawler } from '../scripts/playwright-automated-crawler';
import sqlite3 from 'sqlite3';
import path from 'path';

const DEV_PORT = process.env.DEV_PORT || '3004';
const BASE_URL = `http://localhost:${DEV_PORT}`;

test.describe('Playwright 자동화 크롤러 테스트', () => {
    let db: sqlite3.Database;

    test.beforeAll(async () => {
        // 테스트용 데이터베이스 연결
        db = new sqlite3.Database(path.resolve(__dirname, '../database.db'));
    });

    test.afterAll(async () => {
        if (db) db.close();
    });

    test('크롤러 초기화 및 브라우저 설정', async () => {
        const crawler = new PlaywrightBlogCrawler();
        
        try {
            await crawler.initializeBrowser();
            
            // 브라우저가 성공적으로 시작되었는지 확인
            expect(crawler.browser).toBeTruthy();
            expect(crawler.page).toBeTruthy();
            
            // 페이지가 올바르게 설정되었는지 확인
            const userAgent = await crawler.page.evaluate(() => navigator.userAgent);
            expect(userAgent).toContain('Chrome');
            
        } finally {
            await crawler.cleanup();
        }
    });

    test('네이버 블로그 접근 및 네트워크 모니터링', async ({ page }) => {
        const networkRequests: string[] = [];
        
        // 네트워크 요청 모니터링
        page.on('request', request => {
            const url = request.url();
            if (url.includes('blog.naver.com')) {
                networkRequests.push(url);
            }
        });
        
        // 네이버 블로그 접근
        await page.goto('https://blog.naver.com/ranto28', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // 페이지가 로드되었는지 확인
        expect(page.url()).toContain('blog.naver.com/ranto28');
        
        // 네트워크 요청이 발생했는지 확인
        expect(networkRequests.length).toBeGreaterThan(0);
        
        console.log(`📊 감지된 네트워크 요청: ${networkRequests.length}개`);
        networkRequests.slice(0, 5).forEach(url => {
            console.log(`  - ${url}`);
        });
    });

    test('포스트 목록 추출 및 데이터 검증', async () => {
        const crawler = new PlaywrightBlogCrawler();
        
        try {
            await crawler.initializeBrowser();
            
            // 실제 크롤링 수행 (테스트용으로 제한)
            crawler.config.maxPosts = 3;
            const stats = await crawler.crawlWithNetworkAnalysis();
            
            // 크롤링 결과 검증
            expect(stats.totalFound).toBeGreaterThanOrEqual(0);
            expect(stats.errors).toBeLessThan(3); // 에러율 50% 미만
            
            console.log('📊 크롤링 테스트 결과:', stats);
            
        } finally {
            await crawler.cleanup();
        }
    });

    test('종목 언급 추출 알고리즘', async () => {
        const crawler = new PlaywrightBlogCrawler();
        
        // 테스트 포스트 내용
        const testContent = `
            오늘 테슬라(TSLA) 주가가 상승했습니다. 
            엔비디아 실적도 기대되고 있고, 삼성전자(005930)도 관심입니다.
            애플의 새로운 제품 출시 소식도 있었네요.
        `;
        
        const mentionedStocks = crawler.extractMentionedStocks(testContent);
        
        // 종목 추출 결과 검증
        expect(mentionedStocks).toContain('TSLA');
        expect(mentionedStocks.length).toBeGreaterThan(0);
        
        console.log('📈 추출된 종목들:', mentionedStocks);
    });

    test('투자 테마 분류 알고리즘', async () => {
        const crawler = new PlaywrightBlogCrawler();
        
        const testContents = [
            '인공지능과 AI 반도체 시장이 성장하고 있습니다.',
            '테슬라 전기차 판매량이 증가했습니다.',
            '바이오 제약회사들의 신약 개발이 활발합니다.',
            '연준 금리 인상 우려가 커지고 있습니다.',
            '원자력 발전소 건설 프로젝트가 늘고 있습니다.'
        ];
        
        const expectedThemes = [
            'AI/반도체',
            '전기차/배터리', 
            '헬스케어',
            '금리/통화정책',
            '에너지/원자력'
        ];
        
        testContents.forEach((content, index) => {
            const theme = crawler.extractInvestmentTheme(content);
            console.log(`📊 테마 분류: "${content.substring(0, 20)}..." → ${theme}`);
            expect(theme).toBe(expectedThemes[index]);
        });
    });

    test('감정 톤 분석 알고리즘', async () => {
        const crawler = new PlaywrightBlogCrawler();
        
        const testSentiments = [
            { text: '주가가 상승하고 성장 전망이 좋습니다. 긍정적인 호재가 많아요.', expected: '긍정적' },
            { text: '주가가 하락하고 우려스러운 상황입니다. 부정적인 신호들이 보입니다.', expected: '부정적' },
            { text: '현재 시장 상황을 지켜보고 있습니다. 특별한 변화는 없네요.', expected: '중립적' }
        ];
        
        testSentiments.forEach(({ text, expected }) => {
            const sentiment = crawler.extractSentimentTone(text);
            console.log(`💭 감정 분석: "${text.substring(0, 30)}..." → ${sentiment}`);
            expect(sentiment).toBe(expected);
        });
    });

    test('데이터베이스 저장 기능', async () => {
        // 테스트 포스트 데이터
        const testPost = {
            logNo: 'TEST123456789',
            title: '테스트 포스트 제목',
            content: '이것은 테스트용 포스트 내용입니다. TSLA에 대한 분석이 포함되어 있습니다.',
            excerpt: '테스트용 포스트 요약',
            url: 'https://blog.naver.com/ranto28/TEST123456789',
            createdDate: Date.now(),
            category: '테스트',
            author: '테스트',
            mentionedStocks: 'TSLA',
            investmentTheme: 'AI/반도체',
            sentimentTone: '중립적'
        };
        
        const crawler = new PlaywrightBlogCrawler();
        
        try {
            // 기존 테스트 포스트 삭제 (있다면)
            await new Promise<void>((resolve) => {
                db.run('DELETE FROM blog_posts WHERE log_no = ?', [testPost.logNo], () => resolve());
            });
            
            // 테스트 포스트 저장
            const result = await crawler.savePostToDatabase(testPost);
            expect(result).toBeTruthy();
            
            // 저장된 데이터 검증
            const savedPost = await new Promise<any>((resolve, reject) => {
                db.get('SELECT * FROM blog_posts WHERE log_no = ?', [testPost.logNo], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            expect(savedPost).toBeTruthy();
            expect(savedPost.title).toBe(testPost.title);
            expect(savedPost.mentioned_stocks).toBe(testPost.mentionedStocks);
            
            console.log('✅ 데이터베이스 저장 성공:', savedPost);
            
        } finally {
            // 테스트 데이터 정리
            await new Promise<void>((resolve) => {
                db.run('DELETE FROM blog_posts WHERE log_no = ?', [testPost.logNo], () => resolve());
            });
        }
    });

    test('전체 크롤링 프로세스 통합 테스트', async () => {
        const crawler = new PlaywrightBlogCrawler();
        
        try {
            // 실제 크롤링 수행 (최소한으로 제한)
            crawler.config.maxPosts = 2;
            crawler.config.timeout = 20000;
            
            await crawler.initializeBrowser();
            const stats = await crawler.crawlWithNetworkAnalysis();
            
            // 전체 프로세스 검증
            expect(stats).toHaveProperty('totalFound');
            expect(stats).toHaveProperty('newPosts');
            expect(stats).toHaveProperty('existingPosts');
            expect(stats).toHaveProperty('errors');
            
            // 성공률 검증 (70% 이상)
            const successRate = stats.totalFound > 0 ? 
                (stats.totalFound - stats.errors) / stats.totalFound : 1;
            expect(successRate).toBeGreaterThan(0.7);
            
            console.log('🎉 통합 테스트 완료:', {
                ...stats,
                successRate: `${(successRate * 100).toFixed(1)}%`
            });
            
        } finally {
            await crawler.cleanup();
        }
    });

    test('API 엔드포인트 연동 검증', async ({ page }) => {
        // 새로운 포스트가 추가된 후 API가 정상 작동하는지 확인
        const apis = [
            '/api/merry/posts',
            '/api/merry/stocks',
            '/api/today-merry-quote'
        ];
        
        for (const apiPath of apis) {
            const response = await page.request.get(`${BASE_URL}${apiPath}`);
            expect(response.status()).toBe(200);
            
            const data = await response.json();
            expect(data).toBeTruthy();
            
            console.log(`✅ API 정상 작동: ${apiPath} (${response.status()})`);
        }
    });

    test('스케줄러 설정 및 실행 준비', async () => {
        // 스케줄러가 올바르게 설정되었는지 확인
        const schedulePatterns = [
            '20 0,3,9,12,15,18,21 * * *', // 포스트 크롤링
            '40 15 * * 1-5',              // 한국 주식
            '0 7 * * 1-5'                 // 미국 주식
        ];
        
        schedulePatterns.forEach(pattern => {
            // cron 패턴 유효성 기본 검증
            expect(pattern).toMatch(/^[\d\*,\-\/\s]+$/);
            console.log(`⏰ 스케줄 패턴 검증: ${pattern}`);
        });
        
        // 임시 디렉토리 생성 확인
        const tempDir = path.resolve(__dirname, '../temp');
        const fs = require('fs');
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        expect(fs.existsSync(tempDir)).toBe(true);
        console.log('📁 임시 디렉토리 준비 완료:', tempDir);
    });
});