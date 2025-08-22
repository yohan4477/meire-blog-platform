#!/usr/bin/env node
/**
 * 3시간마다 자동 크롤링 스케줄러
 * cron 방식 또는 지속적인 루프 방식 지원
 */

const { spawn } = require('child_process');
const path = require('path');

// 설정
const CONFIG = {
  CRAWL_INTERVAL: 3 * 60 * 60 * 1000, // 3시간 (밀리초)
  SCRIPT_PATH: path.join(__dirname, 'crawl-new-today.js'),
  LOG_FILE: path.join(__dirname, '..', 'crawl-schedule.log')
};

let isRunning = false;
let nextRunTime = null;

// 로그 함수
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // 파일에도 로그 저장 (선택사항)
  const fs = require('fs');
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
}

// 크롤링 실행
function executeCrawling() {
  if (isRunning) {
    log('⚠️ 이미 크롤링이 실행 중입니다. 건너뜁니다.');
    return;
  }

  isRunning = true;
  log('🚀 3시간 주기 자동 크롤링 시작...');

  const childProcess = spawn('node', [CONFIG.SCRIPT_PATH], {
    stdio: 'pipe',
    cwd: path.dirname(CONFIG.SCRIPT_PATH)
  });

  let output = '';
  let errorOutput = '';

  childProcess.stdout.on('data', (data) => {
    const message = data.toString();
    output += message;
    console.log(message);
  });

  childProcess.stderr.on('data', (data) => {
    const message = data.toString();
    errorOutput += message;
    console.error(message);
  });

  childProcess.on('close', (code) => {
    isRunning = false;
    
    if (code === 0) {
      log('✅ 크롤링 성공적으로 완료');
      
      // 성공 시 간단한 통계 추출
      const statsMatch = output.match(/새 포스트: (\d+)개/);
      if (statsMatch) {
        log(`📊 새로운 포스트 ${statsMatch[1]}개 추가됨`);
      }
    } else {
      log(`❌ 크롤링 실패 (exit code: ${code})`);
      if (errorOutput) {
        log(`오류 내용: ${errorOutput.trim()}`);
      }
    }

    // 다음 실행 시간 계산 및 표시
    nextRunTime = new Date(Date.now() + CONFIG.CRAWL_INTERVAL);
    log(`⏰ 다음 크롤링 예정 시간: ${nextRunTime.toLocaleString('ko-KR')}`);
  });

  childProcess.on('error', (error) => {
    isRunning = false;
    log(`💥 크롤링 프로세스 실행 오류: ${error.message}`);
  });
}

// 상태 확인 함수
function showStatus() {
  const now = new Date();
  log('📋 크롤링 스케줄러 상태:');
  log(`   현재 시간: ${now.toLocaleString('ko-KR')}`);
  log(`   실행 중: ${isRunning ? 'YES' : 'NO'}`);
  log(`   실행 간격: 3시간`);
  
  if (nextRunTime) {
    const timeUntilNext = Math.max(0, nextRunTime - now);
    const hoursLeft = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
    log(`   다음 실행까지: ${hoursLeft}시간 ${minutesLeft}분`);
  }
}

// 즉시 실행 모드
function runOnce() {
  log('🏃‍♂️ 즉시 실행 모드 - 1회 크롤링 후 종료');
  executeCrawling();
}

// 연속 실행 모드 (3시간마다 반복)
function runContinuous() {
  log('🔄 연속 실행 모드 시작 - 3시간마다 자동 크롤링');
  log(`📁 로그 파일: ${CONFIG.LOG_FILE}`);
  
  // 즉시 1회 실행
  executeCrawling();
  
  // 3시간마다 반복 실행
  const intervalId = setInterval(() => {
    log('⏰ 스케줄된 시간이 되었습니다.');
    executeCrawling();
  }, CONFIG.CRAWL_INTERVAL);

  // 1시간마다 상태 확인
  const statusIntervalId = setInterval(() => {
    showStatus();
  }, 60 * 60 * 1000); // 1시간

  // 종료 시 정리
  process.on('SIGINT', () => {
    log('🛑 스케줄러 종료 요청 받음');
    clearInterval(intervalId);
    clearInterval(statusIntervalId);
    
    if (isRunning) {
      log('⏳ 현재 실행 중인 크롤링 완료 대기...');
      // 현재 실행 중인 프로세스가 끝날 때까지 잠시 대기할 수 있음
    }
    
    log('👋 크롤링 스케줄러 종료');
    process.exit(0);
  });

  // 초기 상태 표시
  setTimeout(() => {
    showStatus();
  }, 5000);
}

// 명령줄 인수 처리
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🤖 Meire Blog 자동 크롤링 스케줄러');
  console.log('📋 3시간마다 신규 포스트 자동 수집\n');

  switch (command) {
    case 'once':
      runOnce();
      break;
    
    case 'status':
      showStatus();
      break;
    
    case 'continuous':
    case 'daemon':
    default:
      runContinuous();
      break;
  }
}

// 사용법 표시
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
사용법:
  node schedule-crawl.js [command]

명령어:
  (없음)      - 연속 실행 모드 (기본값)
  continuous  - 연속 실행 모드 (3시간마다 반복)
  once        - 즉시 1회 실행 후 종료
  status      - 현재 상태 확인

예시:
  node schedule-crawl.js                # 3시간마다 자동 실행
  node schedule-crawl.js once          # 지금 당장 1회 실행
  node schedule-crawl.js status        # 상태 확인

종료:
  Ctrl+C로 안전하게 종료 가능
  `);
  process.exit(0);
}

// 에러 핸들링
process.on('unhandledRejection', (reason, promise) => {
  log(`💥 Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  log(`💥 Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// 실행
if (require.main === module) {
  main();
}

module.exports = { executeCrawling, showStatus, runOnce, runContinuous };