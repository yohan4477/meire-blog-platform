#!/usr/bin/env node

/**
 * 🤖 Claude Direct Analysis Scheduler
 * 
 * CLAUDE.md 완전 준수 자동 크롤링 스케줄러
 * - 자동화: 데이터 크롤링 및 시스템 준비
 * - 수동화: 감정 분석 및 데이터 정리 (Claude 직접 수행)
 * 
 * 스케줄: 3시간 20분 주기 (00:20, 03:20, 06:20, 09:20, 12:20, 15:20, 18:20, 21:20 KST)
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// 로깅 시스템
class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        this.logFile = path.join(this.logDir, `claude-scheduler-${new Date().toISOString().split('T')[0]}.log`);
    }

    log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            ...data
        };
        
        console.log(`[${logEntry.timestamp}] ${logEntry.level}: ${logEntry.message}`);
        fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    }

    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
}

const logger = new Logger();

// 크롤링 실행 함수
async function executeCrawling() {
    const executionId = `crawl-${Date.now()}`;
    
    logger.info('🚀 크롤링 작업 시작', { executionId });
    logger.info('📋 CLAUDE.md 준수 모드: 크롤링만 자동화, 분석은 Claude 직접 수행');

    try {
        // 1단계: 블로그 포스트 크롤링 (자동화 허용)
        logger.info('📥 1단계: 새로운 블로그 포스트 크롤링 중...');
        await runCrawlingScript();
        
        // 2단계: 데이터베이스 동기화 (자동화 허용)
        logger.info('🔄 2단계: 데이터베이스 동기화 중...');
        await syncDatabase();
        
        // 3단계: 캐시 정리 (자동화 허용)
        logger.info('🧹 3단계: 애플리케이션 캐시 정리 중...');
        await clearAppCaches();
        
        // 4단계: Claude에게 데이터 정리 요청 알림 (수동 트리거)
        logger.info('🤖 4단계: Claude 데이터 정리 요청 준비 중...');
        await prepareClaudeRequest();
        
        logger.info('✅ 크롤링 작업 완료', { 
            executionId,
            nextSteps: 'Claude에게 데이터 정리 및 분석 요청 필요' 
        });
        
        return { success: true, executionId };
        
    } catch (error) {
        logger.error('💥 크롤링 작업 실패', { executionId, error: error.message });
        
        // 크롤링 실패 시 Claude에게 수동 크롤링 요청
        logger.info('🤖 크롤링 실패 - Claude 직접 크롤링 요청 준비 중...');
        await requestClaudeDirectCrawling(error);
        
        throw error;
    }
}

// 크롤링 스크립트 실행
async function runCrawlingScript() {
    return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        
        // 실제 크롤링 스크립트 실행 - JavaScript blog-crawler 사용
        logger.info('📥 실제 블로그 크롤링 스크립트 실행 중...');
        
        const crawlProcess = spawn('node', ['scripts/blog-crawler.js'], {
            stdio: 'pipe',
            cwd: path.resolve(__dirname, '..')
        });
        
        crawlProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            logger.info('📊 크롤링 진행', { output });
            console.log(output);
        });
        
        crawlProcess.stderr.on('data', (data) => {
            const error = data.toString().trim();
            logger.warn('⚠️ 크롤링 경고', { error });
            console.warn(error);
        });
        
        crawlProcess.on('close', (code) => {
            if (code === 0) {
                logger.info('✅ 실제 크롤링 완료');
                resolve();
            } else {
                const error = new Error(`크롤링 스크립트 실패 (종료 코드: ${code})`);
                logger.error('❌ 크롤링 실패', { code, error: error.message });
                reject(error);
            }
        });
        
        crawlProcess.on('error', (error) => {
            logger.error('💥 크롤링 프로세스 오류', { error: error.message });
            reject(error);
        });
        
        // 타임아웃 설정 (5분)
        setTimeout(() => {
            crawlProcess.kill('SIGTERM');
            reject(new Error('크롤링 타임아웃 (5분 초과)'));
        }, 5 * 60 * 1000);
    });
}

// 데이터베이스 동기화
async function syncDatabase() {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, '../database.db');
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        logger.info('🔄 메르\'s Pick 업데이트 중...');
        
        // 1. stocks 테이블 언급 횟수 업데이트
        db.run(`
            UPDATE stocks 
            SET mention_count = (
                SELECT COUNT(*) 
                FROM blog_posts 
                WHERE (
                    title LIKE '%' || stocks.ticker || '%' OR 
                    content LIKE '%' || stocks.ticker || '%' OR
                    title LIKE '%' || stocks.company_name || '%' OR
                    content LIKE '%' || stocks.company_name || '%'
                )
            )
        `, (err) => {
            if (err) {
                logger.error('❌ 언급 횟수 업데이트 실패', { error: err.message });
                db.close();
                return reject(err);
            }
            
            logger.info('📊 종목 통계 업데이트 중...');
            
            // 2. 최근 언급 날짜 업데이트 (NULL 값 처리)
            db.run(`
                UPDATE stocks 
                SET last_mentioned_date = (
                    SELECT MAX(created_date) 
                    FROM blog_posts 
                    WHERE (
                        title LIKE '%' || stocks.ticker || '%' OR 
                        content LIKE '%' || stocks.ticker || '%' OR
                        title LIKE '%' || stocks.company_name || '%' OR
                        content LIKE '%' || stocks.company_name || '%'
                    ) AND created_date IS NOT NULL
                )
                WHERE EXISTS (
                    SELECT 1 
                    FROM blog_posts 
                    WHERE (
                        title LIKE '%' || stocks.ticker || '%' OR 
                        content LIKE '%' || stocks.ticker || '%' OR
                        title LIKE '%' || stocks.company_name || '%' OR
                        content LIKE '%' || stocks.company_name || '%'
                    ) AND created_date IS NOT NULL
                )
            `, (err) => {
                if (err) {
                    logger.error('❌ 최근 언급 날짜 업데이트 실패', { error: err.message });
                    db.close();
                    return reject(err);
                }
                
                // 3. is_merry_mentioned 플래그 설정
                db.run(`
                    UPDATE stocks 
                    SET is_merry_mentioned = CASE 
                        WHEN mention_count > 0 THEN 1 
                        ELSE 0 
                    END
                `, (err) => {
                    if (err) {
                        logger.error('❌ 메르 언급 플래그 업데이트 실패', { error: err.message });
                        db.close();
                        return reject(err);
                    }
                    
                    logger.info('📊 메르\'s Pick 테이블 동기화 중...');
                    
                    // 4. merry_mentioned_stocks 테이블 동기화 (API에서 사용)
                    db.run(`
                        UPDATE merry_mentioned_stocks 
                        SET mention_count = (
                            SELECT COUNT(*) 
                            FROM blog_posts 
                            WHERE (
                                title LIKE '%' || merry_mentioned_stocks.ticker || '%' OR 
                                content LIKE '%' || merry_mentioned_stocks.ticker || '%'
                            )
                        ),
                        last_mentioned_at = (
                            SELECT MAX(created_date) 
                            FROM blog_posts 
                            WHERE (
                                title LIKE '%' || merry_mentioned_stocks.ticker || '%' OR 
                                content LIKE '%' || merry_mentioned_stocks.ticker || '%'
                            ) AND created_date IS NOT NULL
                        )
                        WHERE EXISTS (
                            SELECT 1 
                            FROM blog_posts 
                            WHERE (
                                title LIKE '%' || merry_mentioned_stocks.ticker || '%' OR 
                                content LIKE '%' || merry_mentioned_stocks.ticker || '%'
                            ) AND created_date IS NOT NULL
                        )
                    `, (err) => {
                        db.close();
                        
                        if (err) {
                            logger.error('❌ 메르\'s Pick 테이블 동기화 실패', { error: err.message });
                            return reject(err);
                        }
                        
                        logger.info('✅ 데이터베이스 동기화 완료 (stocks + merry_mentioned_stocks)');
                        resolve();
                    });
                });
            });
        });
    });
}

// 애플리케이션 캐시 정리
async function clearAppCaches() {
    logger.info('🧹 API 캐시 정리 중...');
    
    try {
        // Next.js 캐시 정리
        const { execSync } = require('child_process');
        const cacheDir = path.resolve(__dirname, '../.next/cache');
        
        // 캐시 디렉토리 존재 확인 후 정리
        if (require('fs').existsSync(cacheDir)) {
            execSync('rm -rf .next/cache/*', { 
                cwd: path.resolve(__dirname, '..'),
                stdio: 'pipe' 
            });
            logger.info('🗂️ Next.js 캐시 정리 완료');
        }
        
        // API 호출로 런타임 캐시 정리
        try {
            const response = await fetch('http://localhost:3006/api/merry/picks?_clearCache=true');
            if (response.ok) {
                logger.info('🌐 API 런타임 캐시 정리 완료');
            }
        } catch (apiError) {
            logger.warn('⚠️ API 캐시 정리 실패 (서버 접근 불가)', { error: apiError.message });
        }
        
        logger.info('✅ 캐시 정리 완료');
        
    } catch (error) {
        logger.warn('⚠️ 캐시 정리 중 일부 오류', { error: error.message });
        // 캐시 정리 실패는 치명적이지 않으므로 계속 진행
    }
}

// Claude 작업 요청 준비
async function prepareClaudeRequest() {
    const requestFile = path.join(__dirname, '../temp', 'claude-work-request.json');
    
    // temp 디렉토리 생성
    const tempDir = path.dirname(requestFile);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const workRequest = {
        timestamp: new Date().toISOString(),
        type: 'data-analysis-required',
        tasks: [
            '새로운 포스트의 감정 분석 수행',
            '종목별 포스트 관계 분석 및 정리',
            '메르\'s Pick 랭킹 검증 및 조정',
            '포스트별 독립 특징 분석 (언급 종목, 투자 테마, 감정 톤)',
            '차트 마커 데이터 검증'
        ],
        instructions: 'CLAUDE.md 준수: API 호출 금지, Claude 직접 분석만 허용',
        dataReady: true,
        requestedBy: 'automated-scheduler'
    };
    
    fs.writeFileSync(requestFile, JSON.stringify(workRequest, null, 2));
    
    logger.info('🎯 Claude 작업 요청 파일 생성 완료', { 
        file: requestFile,
        tasks: workRequest.tasks.length 
    });
}

// Claude 직접 크롤링 요청 (크롤링 실패 시)
async function requestClaudeDirectCrawling(error) {
    const requestFile = path.join(__dirname, '../temp', 'claude-crawling-emergency-request.json');
    
    const tempDir = path.dirname(requestFile);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const emergencyRequest = {
        timestamp: new Date().toISOString(),
        type: 'emergency-crawling-required',
        priority: 'HIGH',
        reason: '자동 크롤링 실패',
        errorDetails: {
            message: error.message,
            timestamp: new Date().toISOString()
        },
        tasks: [
            '🔴 URGENT: 자동 크롤링 시스템 복구',
            '📥 수동 블로그 포스트 수집 및 분석',
            '🔍 크롤링 실패 원인 조사 및 해결',
            '📊 누락된 포스트 데이터 복구',
            '🧹 데이터 무결성 검증',
            '⚡ 시스템 정상화 후 정기 스케줄 재개'
        ],
        instructions: [
            'CLAUDE.md 준수: Claude가 직접 수동 크롤링 수행',
            '자동 크롤링 실패로 인한 긴급 수동 개입 필요',
            '누락된 데이터 없이 완전한 복구 수행',
            '크롤링 시스템 문제 해결 및 예방책 수립'
        ],
        urgentAction: true,
        requestedBy: 'automated-scheduler-emergency',
        nextScheduledRun: '크롤링 복구 후 재개'
    };
    
    fs.writeFileSync(requestFile, JSON.stringify(emergencyRequest, null, 2));
    
    logger.error('🚨 EMERGENCY: Claude 직접 크롤링 요청 파일 생성', { 
        file: requestFile,
        priority: 'HIGH',
        reason: error.message 
    });
    
    // 추가적으로 로그 파일에 긴급 상황 기록
    logger.error('🔴 자동 크롤링 시스템 장애', {
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        action: 'Claude 수동 개입 요청됨',
        status: '시스템 대기 상태'
    });
}

// 스케줄러 초기화
function initializeScheduler() {
    logger.info('🤖 Initializing Claude Direct Analysis Scheduler...');
    logger.info('📋 Following CLAUDE.md requirements:');
    logger.info('   ❌ NO API calls for analysis');
    logger.info('   ❌ NO automated scripts for sentiment analysis');
    logger.info('   ✅ Claude direct manual analysis only');
    logger.info('   ⏰ Data readiness updates every 3h20m');
    
    // 한국 시간대 설정
    logger.info('🌏 Timezone: Asia/Seoul');
    logger.info('⏱️ Schedule: Every 3h20m at 00:20, 03:20, 06:20, 09:20, 12:20, 15:20, 18:20, 21:20');
    
    // 3시간 20분마다 실행 (KST 기준)
    // 00:20, 03:20, 06:20, 09:20, 12:20, 15:20, 18:20, 21:20
    const scheduleExpression = '20 0,3,6,9,12,15,18,21 * * *';
    
    cron.schedule(scheduleExpression, async () => {
        logger.info('⏰ 스케줄된 크롤링 작업 시작');
        
        try {
            const result = await executeCrawling();
            logger.info('🎉 스케줄된 작업 성공 완료', result);
        } catch (error) {
            logger.error('💥 스케줄된 작업 실패', { error: error.message });
        }
    }, {
        timezone: 'Asia/Seoul'
    });
    
    logger.info('✅ Claude Direct Analysis Scheduler initialized successfully');
    
    // 명령어 인수 처리
    const args = process.argv.slice(2);
    
    if (args.includes('--immediate') || args.includes('--single-run')) {
        logger.info('🏃 Running immediate execution...');
        
        executeCrawling()
            .then((result) => {
                logger.info('🎉 즉시 실행 완료', result);
                if (args.includes('--single-run')) {
                    process.exit(0);
                }
            })
            .catch((error) => {
                logger.error('💥 즉시 실행 실패', { error: error.message });
                process.exit(1);
            });
    }
}

// 신호 처리
process.on('SIGINT', () => {
    logger.info('👋 Scheduler shutting down...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

// 스케줄러 시작
if (require.main === module) {
    initializeScheduler();
}

module.exports = { executeCrawling, initializeScheduler };