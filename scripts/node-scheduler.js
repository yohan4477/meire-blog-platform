#!/usr/bin/env node

/**
 * ⏰ Node.js Automated Scheduler
 * 
 * Multi-deployment automated scheduling system for Meire blog platform.
 * Runs every 3 hours at specific times with comprehensive error handling.
 * 
 * Deployment Options:
 * 1. Standalone Node.js server
 * 2. PM2 managed process
 * 3. Docker container
 * 4. Vercel serverless functions
 * 5. Windows Task Scheduler integration
 * 
 * Schedule: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 KST
 * 
 * Usage:
 *   node scripts/node-scheduler.js [options]
 * 
 * Options:
 *   --mode=standalone|pm2|docker|vercel|windows
 *   --immediate                Run immediately for testing
 *   --single-run              Run once and exit
 *   --log-level=info|debug|error
 *   --notification-url=URL    Webhook URL for notifications
 */

const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Configuration
const CONFIG = {
  TIMEZONE: 'Asia/Seoul',
  CRON_SCHEDULE: '0 0,3,6,9,12,15,18,21 * * *', // Every 3 hours at specific times
  LOG_DIR: path.join(__dirname, '..', 'logs'),
  MAX_LOG_FILES: 30,
  CRAWL_TIMEOUT: 900000, // 15 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 300000, // 5 minutes
  HEALTH_CHECK_INTERVAL: 3600000 // 1 hour
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'standalone',
    immediate: false,
    singleRun: false,
    logLevel: 'info',
    notificationUrl: process.env.NOTIFICATION_WEBHOOK_URL || null
  };

  args.forEach(arg => {
    if (arg.startsWith('--mode=')) options.mode = arg.split('=')[1];
    if (arg === '--immediate') options.immediate = true;
    if (arg === '--single-run') options.singleRun = true;
    if (arg.startsWith('--log-level=')) options.logLevel = arg.split('=')[1];
    if (arg.startsWith('--notification-url=')) options.notificationUrl = arg.split('=')[1];
  });

  return options;
}

// Logger class with multiple levels and file rotation
class Logger {
  constructor(logLevel = 'info') {
    this.logLevel = logLevel;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.currentLevel = this.levels[logLevel] || 2;
    
    this.ensureLogDirectory();
    this.logFile = path.join(CONFIG.LOG_DIR, `scheduler-${new Date().toISOString().split('T')[0]}.log`);
    this.cleanOldLogs();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(CONFIG.LOG_DIR)) {
      fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    }
  }

  cleanOldLogs() {
    try {
      const files = fs.readdirSync(CONFIG.LOG_DIR)
        .filter(file => file.startsWith('scheduler-'))
        .sort()
        .reverse();

      if (files.length > CONFIG.MAX_LOG_FILES) {
        const filesToDelete = files.slice(CONFIG.MAX_LOG_FILES);
        filesToDelete.forEach(file => {
          fs.unlinkSync(path.join(CONFIG.LOG_DIR, file));
        });
      }
    } catch (error) {
      console.error('Error cleaning old logs:', error.message);
    }
  }

  log(level, message, meta = {}) {
    if (this.levels[level] > this.currentLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    const logLine = JSON.stringify(logEntry);

    // Console output with colors
    const colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[35m',
      reset: '\x1b[0m'
    };

    console.log(`${colors[level] || ''}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);

    // File output
    try {
      fs.appendFileSync(this.logFile, logLine + '\n');
    } catch (error) {
      console.error('Error writing to log file:', error.message);
    }
  }

  error(message, meta) { this.log('error', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  debug(message, meta) { this.log('debug', message, meta); }
}

// Notification system
class NotificationManager {
  constructor(webhookUrl, logger) {
    this.webhookUrl = webhookUrl;
    this.logger = logger;
  }

  async send(title, message, level = 'info', additionalData = {}) {
    if (!this.webhookUrl) {
      this.logger.debug('No notification webhook configured, skipping notification');
      return;
    }

    try {
      const emoji = {
        info: '📢',
        success: '✅',
        warning: '⚠️',
        error: '❌'
      }[level] || '📢';

      const payload = {
        text: `${emoji} ${title}`,
        attachments: [{
          color: {
            info: 'good',
            success: 'good',
            warning: 'warning',
            error: 'danger'
          }[level] || 'good',
          fields: [
            {
              title: '메시지',
              value: message,
              short: false
            },
            {
              title: '시간',
              value: new Date().toLocaleString('ko-KR', { timeZone: CONFIG.TIMEZONE }),
              short: true
            },
            ...Object.entries(additionalData).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true
            }))
          ]
        }]
      };

      await axios.post(this.webhookUrl, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      this.logger.debug('Notification sent successfully');

    } catch (error) {
      this.logger.error('Failed to send notification', { error: error.message });
    }
  }
}

// Task executor for running crawling operations
class TaskExecutor {
  constructor(logger, notificationManager) {
    this.logger = logger;
    this.notifications = notificationManager;
    this.currentExecution = null;
  }

  // Execute a single crawling task
  async executeTask(taskType, options = {}) {
    const startTime = Date.now();
    const executionId = `${taskType}-${Date.now()}`;
    
    this.logger.info(`🚀 Starting ${taskType} execution`, { executionId });

    try {
      this.currentExecution = executionId;

      const result = await this.runCrawlingProcess(taskType, options);
      const executionTime = Math.round((Date.now() - startTime) / 1000);

      this.logger.info(`✅ ${taskType} completed successfully`, {
        executionId,
        executionTime,
        result
      });

      await this.notifications.send(
        `자동 크롤링 완료 (${taskType})`,
        `실행 시간: ${executionTime}초\n새 포스트: ${result.newPosts || 0}개\n감정 분석: ${result.sentiments || 0}개`,
        'success',
        {
          '실행 ID': executionId,
          '실행 시간': `${executionTime}초`,
          '크롤링 타입': taskType
        }
      );

      return { success: true, executionTime, result };

    } catch (error) {
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      
      this.logger.error(`❌ ${taskType} execution failed`, {
        executionId,
        error: error.message,
        executionTime
      });

      await this.notifications.send(
        `자동 크롤링 실패 (${taskType})`,
        `오류: ${error.message}\n실행 시간: ${executionTime}초`,
        'error',
        {
          '실행 ID': executionId,
          '오류': error.message,
          '실행 시간': `${executionTime}초`
        }
      );

      throw error;
    } finally {
      this.currentExecution = null;
    }
  }

  // Run the actual crawling process
  async runCrawlingProcess(taskType, options) {
    const scriptsDir = path.join(__dirname);
    const isIntensive = taskType === 'intensive' || this.isIntensiveTime();
    
    return new Promise((resolve, reject) => {
      const processes = [];
      let results = {
        newPosts: 0,
        sentiments: 0,
        stockUpdates: 0,
        errors: []
      };

      // Step 1: Main crawling
      this.logger.info('📥 Step 1: Running main crawling...');
      const crawlProcess = spawn('node', [
        path.join(scriptsDir, 'automated-crawl.js'),
        `--type=${isIntensive ? 'intensive' : 'standard'}`,
        `--date=${new Date().toISOString().split('T')[0]}`,
        '--github-actions=false'
      ], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let crawlOutput = '';
      crawlProcess.stdout.on('data', (data) => {
        crawlOutput += data.toString();
        this.logger.debug('Crawl output:', data.toString().trim());
      });

      crawlProcess.stderr.on('data', (data) => {
        this.logger.error('Crawl error:', data.toString().trim());
      });

      crawlProcess.on('close', (code) => {
        if (code === 0) {
          // Parse results from crawl output
          const newPostsMatch = crawlOutput.match(/New posts: (\d+)/);
          if (newPostsMatch) results.newPosts = parseInt(newPostsMatch[1]);

          this.logger.info('✅ Main crawling completed');
          this.runStockMentionsUpdate(results, resolve, reject);
        } else {
          results.errors.push('Main crawling failed');
          this.logger.error('Main crawling failed', { exitCode: code });
          reject(new Error(`Crawling process failed with code ${code}`));
        }
      });

      // Set timeout
      setTimeout(() => {
        if (!crawlProcess.killed) {
          crawlProcess.kill('SIGTERM');
          reject(new Error('Crawling process timeout'));
        }
      }, CONFIG.CRAWL_TIMEOUT);
    });
  }

  // Run stock mentions update
  runStockMentionsUpdate(results, resolve, reject) {
    this.logger.info('📈 Step 2: Updating stock mentions...');
    
    const stockProcess = spawn('node', [
      path.join(__dirname, 'update-stock-mentions.js'),
      `--date=${new Date().toISOString().split('T')[0]}`
    ], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });

    stockProcess.on('close', (code) => {
      if (code === 0) {
        this.logger.info('✅ Stock mentions updated');
        this.runSentimentAnalysis(results, resolve, reject);
      } else {
        results.errors.push('Stock mentions update failed');
        this.runSentimentAnalysis(results, resolve, reject); // Continue anyway
      }
    });
  }

  // Run sentiment analysis
  runSentimentAnalysis(results, resolve, reject) {
    this.logger.info('🧠 Step 3: Running sentiment analysis...');
    
    if (!process.env.ANTHROPIC_API_KEY) {
      this.logger.warn('No Anthropic API key found, skipping sentiment analysis');
      this.runMerryPicksUpdate(results, resolve, reject);
      return;
    }

    const sentimentProcess = spawn('node', [
      path.join(__dirname, 'automated-sentiment-analysis.js'),
      `--date=${new Date().toISOString().split('T')[0]}`,
      '--batch-size=10'
    ], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });

    let sentimentOutput = '';
    sentimentProcess.stdout.on('data', (data) => {
      sentimentOutput += data.toString();
    });

    sentimentProcess.on('close', (code) => {
      if (code === 0) {
        // Parse sentiment results
        const sentimentsMatch = sentimentOutput.match(/Sentiments created: (\d+)/);
        if (sentimentsMatch) results.sentiments = parseInt(sentimentsMatch[1]);
        
        this.logger.info('✅ Sentiment analysis completed');
      } else {
        results.errors.push('Sentiment analysis failed');
        this.logger.error('Sentiment analysis failed', { exitCode: code });
      }
      
      this.runMerryPicksUpdate(results, resolve, reject);
    });
  }

  // Run Merry's Picks update
  runMerryPicksUpdate(results, resolve, reject) {
    this.logger.info('⭐ Step 4: Updating Merry\'s Picks...');
    
    const picksProcess = spawn('node', [
      path.join(__dirname, 'update-merry-picks.js'),
      '--recalculate-all'
    ], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });

    picksProcess.on('close', (code) => {
      if (code === 0) {
        this.logger.info('✅ Merry\'s Picks updated');
      } else {
        results.errors.push('Merry\'s Picks update failed');
        this.logger.error('Merry\'s Picks update failed', { exitCode: code });
      }
      
      // Always resolve with results
      resolve(results);
    });
  }

  // Check if current time requires intensive crawling
  isIntensiveTime() {
    const now = new Date();
    const hour = now.getHours();
    return hour === 0 || hour === 12; // Midnight or noon
  }

  // Get current execution status
  getStatus() {
    return {
      isRunning: this.currentExecution !== null,
      currentExecution: this.currentExecution,
      nextScheduledRun: this.getNextScheduledTime()
    };
  }

  // Get next scheduled execution time
  getNextScheduledTime() {
    const now = new Date();
    const hours = [0, 3, 6, 9, 12, 15, 18, 21];
    
    for (const hour of hours) {
      const nextRun = new Date(now);
      nextRun.setHours(hour, 0, 0, 0);
      
      if (nextRun > now) {
        return nextRun;
      }
    }
    
    // Next day, first run
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

// Main scheduler class
class AutomatedScheduler {
  constructor(options) {
    this.options = options;
    this.logger = new Logger(options.logLevel);
    this.notifications = new NotificationManager(options.notificationUrl, this.logger);
    this.executor = new TaskExecutor(this.logger, this.notifications);
    this.healthCheckInterval = null;
    this.gracefulShutdown = false;
  }

  // Initialize the scheduler
  async initialize() {
    this.logger.info('⏰ Initializing Automated Scheduler...');
    this.logger.info('🌏 Timezone: ' + CONFIG.TIMEZONE);
    this.logger.info('⏱️ Schedule: Every 3 hours at 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00');
    this.logger.info('🚀 Mode: ' + this.options.mode);

    // Send startup notification
    await this.notifications.send(
      '메르 블로그 스케줄러 시작',
      '자동 크롤링 시스템이 시작되었습니다.',
      'info',
      {
        '모드': this.options.mode,
        '다음 실행': this.executor.getNextScheduledTime().toLocaleString('ko-KR', { timeZone: CONFIG.TIMEZONE })
      }
    );

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();
    
    this.logger.info('✅ Scheduler initialized successfully');
  }

  // Start the scheduler
  async start() {
    if (this.options.immediate || this.options.singleRun) {
      this.logger.info('🏃 Running immediate execution...');
      await this.runScheduledTask();
      
      if (this.options.singleRun) {
        this.logger.info('🔚 Single run completed, exiting...');
        return;
      }
    }

    if (!this.options.singleRun) {
      this.logger.info('📅 Starting cron scheduler...');
      this.logger.info(`⏱️ Cron pattern: ${CONFIG.CRON_SCHEDULE}`);
      
      // Start cron job
      cron.schedule(CONFIG.CRON_SCHEDULE, async () => {
        if (!this.gracefulShutdown) {
          await this.runScheduledTask();
        }
      }, {
        scheduled: true,
        timezone: CONFIG.TIMEZONE
      });

      // Start health check
      this.startHealthCheck();

      this.logger.info('✅ Scheduler is running!');
      this.logger.info(`🕐 Next execution: ${this.executor.getNextScheduledTime().toLocaleString('ko-KR', { timeZone: CONFIG.TIMEZONE })}`);
    }
  }

  // Run scheduled task with retry logic
  async runScheduledTask() {
    const taskType = this.executor.isIntensiveTime() ? 'intensive' : 'standard';
    let attempt = 1;

    while (attempt <= CONFIG.RETRY_ATTEMPTS) {
      try {
        this.logger.info(`🚀 Executing scheduled task (attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS})`);
        
        const result = await this.executor.executeTask(taskType);
        this.logger.info('✅ Scheduled task completed successfully', result);
        return result;

      } catch (error) {
        this.logger.error(`❌ Scheduled task attempt ${attempt} failed`, { error: error.message });
        
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          this.logger.info(`⏳ Retrying in ${CONFIG.RETRY_DELAY / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
          attempt++;
        } else {
          this.logger.error('💥 All retry attempts failed, giving up');
          
          await this.notifications.send(
            '자동 크롤링 최종 실패',
            `${CONFIG.RETRY_ATTEMPTS}번의 재시도 모두 실패\n오류: ${error.message}`,
            'error',
            { '재시도 횟수': CONFIG.RETRY_ATTEMPTS }
          );
          
          throw error;
        }
      }
    }
  }

  // Start health check monitoring
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        this.logger.debug('🏥 Running health check...');
        
        const status = this.executor.getStatus();
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        this.logger.debug('Health check completed', {
          status,
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
          },
          uptime: Math.round(uptime / 3600) + 'h'
        });

        // Alert if memory usage is high
        const memoryUsageMB = memoryUsage.rss / 1024 / 1024;
        if (memoryUsageMB > 500) {
          this.logger.warn('High memory usage detected', { memoryUsageMB: Math.round(memoryUsageMB) });
        }

      } catch (error) {
        this.logger.error('Health check failed', { error: error.message });
      }
    }, CONFIG.HEALTH_CHECK_INTERVAL);

    this.logger.info('🏥 Health check monitoring started');
  }

  // Setup graceful shutdown handlers
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      this.logger.info(`📡 Received ${signal}, initiating graceful shutdown...`);
      this.gracefulShutdown = true;

      await this.notifications.send(
        '메르 블로그 스케줄러 종료',
        `${signal} 신호를 받아 정상 종료 중입니다.`,
        'warning'
      );

      // Clear intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Wait for current execution to complete
      let waitTime = 0;
      while (this.executor.getStatus().isRunning && waitTime < 30000) {
        this.logger.info('⏳ Waiting for current execution to complete...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitTime += 1000;
      }

      this.logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  // Get scheduler status
  getStatus() {
    return {
      mode: this.options.mode,
      isRunning: !this.gracefulShutdown,
      executor: this.executor.getStatus(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

// Main execution function
async function main() {
  const options = parseArgs();
  
  console.log('⏰ Meire Blog Node.js Automated Scheduler');
  console.log('📋 Following CLAUDE.md guidelines for automated crawling');
  console.log('⚡ SuperClaude framework integration');
  console.log('🕐 Every 3-hour execution system\n');

  try {
    const scheduler = new AutomatedScheduler(options);
    
    await scheduler.initialize();
    await scheduler.start();

    // Keep process alive if not single run
    if (!options.singleRun) {
      process.stdin.resume(); // Keep process alive
    }

  } catch (error) {
    console.error('💥 Fatal scheduler error:', error);
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { AutomatedScheduler, TaskExecutor, Logger, NotificationManager };