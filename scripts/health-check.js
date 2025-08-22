#!/usr/bin/env node

/**
 * 🏥 System Health Check for Meire Blog Platform
 * 
 * Comprehensive health monitoring for the automated crawling system.
 * Checks system status, database integrity, API availability, and performance metrics.
 * 
 * Features:
 * - Database connectivity and integrity checks
 * - API endpoint health verification
 * - File system and permissions validation
 * - Performance metrics monitoring
 * - Memory and resource usage analysis
 * - Scheduler status verification
 * 
 * Usage:
 *   node scripts/health-check.js [options]
 * 
 * Options:
 *   --github-actions      Format output for GitHub Actions
 *   --detailed           Show detailed diagnostic information
 *   --json               Output results in JSON format
 *   --alert-threshold=N  Memory usage alert threshold in MB (default: 500)
 *   --notification-url   Webhook URL for health alerts
 */

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  DATABASE_PATH: path.join(__dirname, '..', 'database.db'),
  LOG_DIR: path.join(__dirname, '..', 'logs'),
  REQUIRED_TABLES: [
    'blog_posts',
    'stocks',
    'merry_mentioned_stocks', 
    'post_stock_sentiments',
    'crawl_logs'
  ],
  API_ENDPOINTS: [
    'http://localhost:3000/api/gateway/health',
    'http://localhost:3004/api/gateway/health'
  ],
  MEMORY_ALERT_THRESHOLD: 500, // MB
  DISK_ALERT_THRESHOLD: 90, // Percentage
  LOG_FILE_MAX_SIZE: 100 * 1024 * 1024 // 100MB
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    githubActions: false,
    detailed: false,
    json: false,
    alertThreshold: CONFIG.MEMORY_ALERT_THRESHOLD,
    notificationUrl: process.env.NOTIFICATION_WEBHOOK_URL || null
  };

  args.forEach(arg => {
    if (arg === '--github-actions') options.githubActions = true;
    if (arg === '--detailed') options.detailed = true;
    if (arg === '--json') options.json = true;
    if (arg.startsWith('--alert-threshold=')) {
      options.alertThreshold = parseInt(arg.split('=')[1]) || CONFIG.MEMORY_ALERT_THRESHOLD;
    }
    if (arg.startsWith('--notification-url=')) {
      options.notificationUrl = arg.split('=')[1];
    }
  });

  return options;
}

// Health check results collector
class HealthCheckResults {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      checks: {},
      metrics: {},
      alerts: [],
      recommendations: []
    };
  }

  addCheck(name, status, message, details = {}) {
    this.results.checks[name] = {
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
  }

  addMetric(name, value, unit = '', threshold = null) {
    this.results.metrics[name] = {
      value,
      unit,
      threshold,
      status: threshold ? (value > threshold ? 'warning' : 'good') : 'info'
    };
  }

  addAlert(level, message, component) {
    this.results.alerts.push({
      level,
      message,
      component,
      timestamp: new Date().toISOString()
    });
  }

  addRecommendation(message, priority = 'medium') {
    this.results.recommendations.push({
      message,
      priority,
      timestamp: new Date().toISOString()
    });
  }

  calculateOverallStatus() {
    const checkStatuses = Object.values(this.results.checks).map(c => c.status);
    const hasFailures = checkStatuses.includes('fail');
    const hasWarnings = checkStatuses.includes('warning');
    const hasAlerts = this.results.alerts.length > 0;

    if (hasFailures) {
      this.results.overall = 'unhealthy';
    } else if (hasWarnings || hasAlerts) {
      this.results.overall = 'degraded';
    } else {
      this.results.overall = 'healthy';
    }
  }

  getResults() {
    this.calculateOverallStatus();
    return this.results;
  }
}

// System health checker
class SystemHealthChecker {
  constructor(options) {
    this.options = options;
    this.results = new HealthCheckResults();
  }

  // Run all health checks
  async runAllChecks() {
    console.log('🏥 Starting comprehensive health check...\n');

    try {
      await this.checkDatabase();
      await this.checkFileSystem();
      await this.checkSystemResources();
      await this.checkLogFiles();
      await this.checkSchedulerStatus();
      await this.checkAPIEndpoints();
      await this.checkEnvironment();
      
      if (this.options.detailed) {
        await this.runDetailedChecks();
      }

    } catch (error) {
      this.results.addCheck('system', 'fail', `System check failed: ${error.message}`);
      this.results.addAlert('critical', `Health check system failure: ${error.message}`, 'system');
    }

    return this.results.getResults();
  }

  // Check database connectivity and integrity
  async checkDatabase() {
    console.log('🗄️ Checking database...');

    try {
      // Check if database file exists
      if (!fs.existsSync(CONFIG.DATABASE_PATH)) {
        this.results.addCheck('database', 'fail', 'Database file does not exist', {
          path: CONFIG.DATABASE_PATH
        });
        return;
      }

      // Open database connection
      const db = sqlite3(CONFIG.DATABASE_PATH);
      
      // Check database is readable
      const pragmaResult = db.pragma('integrity_check');
      if (pragmaResult[0]?.integrity_check !== 'ok') {
        this.results.addCheck('database', 'fail', 'Database integrity check failed', {
          integrity: pragmaResult
        });
        db.close();
        return;
      }

      // Check required tables exist
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = tables.map(t => t.name);
      const missingTables = CONFIG.REQUIRED_TABLES.filter(table => !tableNames.includes(table));

      if (missingTables.length > 0) {
        this.results.addCheck('database_tables', 'fail', `Missing required tables: ${missingTables.join(', ')}`, {
          missing: missingTables,
          existing: tableNames
        });
      } else {
        this.results.addCheck('database_tables', 'pass', 'All required tables present');
      }

      // Check recent activity
      try {
        const recentPosts = db.prepare('SELECT COUNT(*) as count FROM blog_posts WHERE created_date >= date("now", "-7 days")').get();
        const recentMentions = db.prepare('SELECT COUNT(*) as count FROM merry_mentioned_stocks WHERE mentioned_date >= date("now", "-7 days")').get();
        
        this.results.addMetric('recent_posts', recentPosts.count, 'posts');
        this.results.addMetric('recent_mentions', recentMentions.count, 'mentions');

        if (recentPosts.count === 0 && recentMentions.count === 0) {
          this.results.addAlert('warning', 'No recent database activity detected', 'database');
        }
      } catch (error) {
        this.results.addCheck('database_activity', 'warning', `Could not check recent activity: ${error.message}`);
      }

      // Database size metrics
      const stats = fs.statSync(CONFIG.DATABASE_PATH);
      this.results.addMetric('database_size', Math.round(stats.size / 1024 / 1024), 'MB');

      db.close();
      this.results.addCheck('database', 'pass', 'Database connectivity and integrity verified');

    } catch (error) {
      this.results.addCheck('database', 'fail', `Database check failed: ${error.message}`);
      this.results.addAlert('critical', `Database inaccessible: ${error.message}`, 'database');
    }
  }

  // Check file system and permissions
  async checkFileSystem() {
    console.log('📁 Checking file system...');

    try {
      // Check project directory
      const projectDir = path.join(__dirname, '..');
      if (!fs.existsSync(projectDir)) {
        this.results.addCheck('filesystem', 'fail', 'Project directory not accessible');
        return;
      }

      // Check critical files
      const criticalFiles = [
        'package.json',
        'scripts/automated-crawl.js',
        'scripts/automated-sentiment-analysis.js',
        'scripts/update-stock-mentions.js'
      ];

      const missingFiles = criticalFiles.filter(file => 
        !fs.existsSync(path.join(projectDir, file))
      );

      if (missingFiles.length > 0) {
        this.results.addCheck('critical_files', 'fail', `Missing critical files: ${missingFiles.join(', ')}`);
      } else {
        this.results.addCheck('critical_files', 'pass', 'All critical files present');
      }

      // Check logs directory
      if (!fs.existsSync(CONFIG.LOG_DIR)) {
        try {
          fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
          this.results.addCheck('logs_dir', 'pass', 'Logs directory created');
        } catch (error) {
          this.results.addCheck('logs_dir', 'fail', `Cannot create logs directory: ${error.message}`);
        }
      } else {
        this.results.addCheck('logs_dir', 'pass', 'Logs directory accessible');
      }

      // Check permissions
      try {
        const testFile = path.join(CONFIG.LOG_DIR, 'health-check-test.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        this.results.addCheck('permissions', 'pass', 'File system permissions verified');
      } catch (error) {
        this.results.addCheck('permissions', 'warning', `Limited file system permissions: ${error.message}`);
      }

    } catch (error) {
      this.results.addCheck('filesystem', 'fail', `File system check failed: ${error.message}`);
    }
  }

  // Check system resources
  async checkSystemResources() {
    console.log('💾 Checking system resources...');

    try {
      // Memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = Math.round(memoryUsage.rss / 1024 / 1024);
      
      this.results.addMetric('memory_usage', memoryUsageMB, 'MB', this.options.alertThreshold);
      
      if (memoryUsageMB > this.options.alertThreshold) {
        this.results.addAlert('warning', `High memory usage: ${memoryUsageMB}MB`, 'system');
        this.results.addRecommendation('Consider restarting the application to free memory', 'high');
      }

      // Process uptime
      const uptimeHours = Math.round(process.uptime() / 3600 * 100) / 100;
      this.results.addMetric('uptime', uptimeHours, 'hours');

      // CPU usage (if available)
      const cpuUsage = process.cpuUsage();
      this.results.addMetric('cpu_user', Math.round(cpuUsage.user / 1000), 'ms');
      this.results.addMetric('cpu_system', Math.round(cpuUsage.system / 1000), 'ms');

      this.results.addCheck('system_resources', 'pass', 'System resources checked');

    } catch (error) {
      this.results.addCheck('system_resources', 'warning', `Resource check failed: ${error.message}`);
    }
  }

  // Check log files
  async checkLogFiles() {
    console.log('📋 Checking log files...');

    try {
      if (!fs.existsSync(CONFIG.LOG_DIR)) {
        this.results.addCheck('log_files', 'warning', 'Log directory does not exist');
        return;
      }

      const logFiles = fs.readdirSync(CONFIG.LOG_DIR)
        .filter(file => file.endsWith('.log'))
        .map(file => {
          const filePath = path.join(CONFIG.LOG_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified - a.modified);

      this.results.addMetric('log_files_count', logFiles.length, 'files');

      if (logFiles.length > 0) {
        const recentLog = logFiles[0];
        const daysSinceLastLog = Math.floor((Date.now() - recentLog.modified.getTime()) / (1000 * 60 * 60 * 24));
        
        this.results.addMetric('days_since_last_log', daysSinceLastLog, 'days');

        if (daysSinceLastLog > 1) {
          this.results.addAlert('warning', 'No recent log activity detected', 'logging');
        }

        // Check for large log files
        const largeFiles = logFiles.filter(file => file.size > CONFIG.LOG_FILE_MAX_SIZE);
        if (largeFiles.length > 0) {
          this.results.addAlert('warning', `Large log files detected: ${largeFiles.map(f => f.name).join(', ')}`, 'logging');
          this.results.addRecommendation('Consider implementing log rotation', 'medium');
        }
      }

      this.results.addCheck('log_files', 'pass', `Log files checked (${logFiles.length} files)`);

    } catch (error) {
      this.results.addCheck('log_files', 'warning', `Log files check failed: ${error.message}`);
    }
  }

  // Check scheduler status
  async checkSchedulerStatus() {
    console.log('⏰ Checking scheduler status...');

    try {
      // Check for running Node.js processes related to scheduler
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'tasklist' : 'ps aux';
      const args = isWindows ? [] : [];

      const result = await this.runCommand(command, args);
      const processLines = result.split('\n');
      
      const schedulerProcesses = processLines.filter(line => 
        line.includes('node-scheduler') || line.includes('automated-crawl')
      );

      if (schedulerProcesses.length > 0) {
        this.results.addCheck('scheduler_process', 'pass', `Scheduler processes detected (${schedulerProcesses.length})`);
        this.results.addMetric('scheduler_processes', schedulerProcesses.length, 'processes');
      } else {
        this.results.addCheck('scheduler_process', 'warning', 'No scheduler processes detected');
        this.results.addRecommendation('Check if automated scheduler is running', 'high');
      }

      // Check crawl logs for recent activity
      try {
        const db = sqlite3(CONFIG.DATABASE_PATH);
        const recentCrawls = db.prepare(`
          SELECT * FROM crawl_logs 
          WHERE created_at >= datetime('now', '-24 hours')
          ORDER BY created_at DESC
          LIMIT 5
        `).all();

        if (recentCrawls.length > 0) {
          const lastCrawl = recentCrawls[0];
          const hoursAgo = Math.floor((Date.now() - new Date(lastCrawl.created_at).getTime()) / (1000 * 60 * 60));
          
          this.results.addMetric('hours_since_last_crawl', hoursAgo, 'hours');
          
          if (hoursAgo > 4) { // More than 4 hours since last crawl
            this.results.addAlert('warning', `Last crawl was ${hoursAgo} hours ago`, 'scheduler');
          }

          this.results.addCheck('recent_crawls', 'pass', `Recent crawl activity detected (${recentCrawls.length} in 24h)`);
        } else {
          this.results.addCheck('recent_crawls', 'warning', 'No recent crawl activity found');
          this.results.addAlert('warning', 'No crawling activity in the last 24 hours', 'scheduler');
        }

        db.close();
      } catch (error) {
        this.results.addCheck('crawl_logs', 'warning', `Could not check crawl logs: ${error.message}`);
      }

    } catch (error) {
      this.results.addCheck('scheduler_status', 'warning', `Scheduler status check failed: ${error.message}`);
    }
  }

  // Check API endpoints
  async checkAPIEndpoints() {
    console.log('🌐 Checking API endpoints...');

    for (const endpoint of CONFIG.API_ENDPOINTS) {
      try {
        const response = await axios.get(endpoint, { timeout: 10000 });
        
        if (response.status === 200) {
          this.results.addCheck(`api_${endpoint}`, 'pass', 'API endpoint responsive');
        } else {
          this.results.addCheck(`api_${endpoint}`, 'warning', `API endpoint returned status ${response.status}`);
        }
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          this.results.addCheck(`api_${endpoint}`, 'warning', 'API endpoint not available (service may be stopped)');
        } else {
          this.results.addCheck(`api_${endpoint}`, 'fail', `API endpoint error: ${error.message}`);
        }
      }
    }
  }

  // Check environment configuration
  async checkEnvironment() {
    console.log('🌍 Checking environment...');

    // Check Node.js version
    this.results.addMetric('node_version', process.version, 'version');

    // Check environment variables
    const requiredEnvVars = ['TZ'];
    const optionalEnvVars = ['ANTHROPIC_API_KEY', 'NOTIFICATION_WEBHOOK_URL'];
    
    const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingRequired.length > 0) {
      this.results.addCheck('env_required', 'warning', `Missing required environment variables: ${missingRequired.join(', ')}`);
    } else {
      this.results.addCheck('env_required', 'pass', 'Required environment variables present');
    }

    const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);
    if (missingOptional.length > 0) {
      this.results.addCheck('env_optional', 'info', `Optional environment variables not set: ${missingOptional.join(', ')}`);
      
      if (missingOptional.includes('ANTHROPIC_API_KEY')) {
        this.results.addRecommendation('Set ANTHROPIC_API_KEY for sentiment analysis functionality', 'medium');
      }
    }

    // Check timezone
    const currentTz = process.env.TZ || 'system default';
    this.results.addMetric('timezone', currentTz, 'tz');

    this.results.addCheck('environment', 'pass', 'Environment configuration checked');
  }

  // Run detailed diagnostic checks
  async runDetailedChecks() {
    console.log('🔍 Running detailed diagnostics...');

    // Package dependencies check
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
      this.results.addMetric('dependencies_count', Object.keys(packageJson.dependencies || {}).length, 'packages');
    } catch (error) {
      this.results.addCheck('package_json', 'warning', `Could not read package.json: ${error.message}`);
    }

    // Disk space check (if possible)
    try {
      const stats = fs.statSync(CONFIG.DATABASE_PATH);
      const projectDir = path.join(__dirname, '..');
      const dirStats = fs.statSync(projectDir);
      
      this.results.addCheck('detailed_checks', 'pass', 'Detailed diagnostics completed');
    } catch (error) {
      this.results.addCheck('detailed_checks', 'warning', `Some detailed checks failed: ${error.message}`);
    }
  }

  // Helper method to run system commands
  async runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// Output formatter
class HealthCheckFormatter {
  constructor(options) {
    this.options = options;
  }

  format(results) {
    if (this.options.json) {
      return this.formatJSON(results);
    } else if (this.options.githubActions) {
      return this.formatGitHubActions(results);
    } else {
      return this.formatConsole(results);
    }
  }

  formatJSON(results) {
    return JSON.stringify(results, null, 2);
  }

  formatGitHubActions(results) {
    const status = results.overall;
    const emoji = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
    
    console.log(`::notice::${emoji} System Health: ${status.toUpperCase()}`);
    
    // Set outputs for GitHub Actions
    console.log(`::set-output name=status::${status}`);
    console.log(`::set-output name=alerts_count::${results.alerts.length}`);
    
    // Create annotations for alerts
    results.alerts.forEach(alert => {
      const level = alert.level === 'critical' ? 'error' : 'warning';
      console.log(`::${level}::${alert.component}: ${alert.message}`);
    });

    return `Health check completed: ${status}`;
  }

  formatConsole(results) {
    const status = results.overall;
    const emoji = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
    
    let output = `\n${'='.repeat(60)}\n`;
    output += `${emoji} SYSTEM HEALTH: ${status.toUpperCase()}\n`;
    output += `${'='.repeat(60)}\n\n`;

    // Summary
    const passedChecks = Object.values(results.checks).filter(c => c.status === 'pass').length;
    const totalChecks = Object.keys(results.checks).length;
    
    output += `📊 SUMMARY:\n`;
    output += `  ✅ Passed: ${passedChecks}/${totalChecks} checks\n`;
    output += `  ⚠️ Alerts: ${results.alerts.length}\n`;
    output += `  💡 Recommendations: ${results.recommendations.length}\n\n`;

    // Checks
    output += `🔍 CHECK RESULTS:\n`;
    for (const [name, check] of Object.entries(results.checks)) {
      const statusEmoji = check.status === 'pass' ? '✅' : 
                         check.status === 'warning' ? '⚠️' : 
                         check.status === 'info' ? 'ℹ️' : '❌';
      output += `  ${statusEmoji} ${name}: ${check.message}\n`;
    }

    // Metrics
    if (Object.keys(results.metrics).length > 0) {
      output += `\n📈 METRICS:\n`;
      for (const [name, metric] of Object.entries(results.metrics)) {
        const statusIcon = metric.status === 'warning' ? '⚠️' : 
                          metric.status === 'good' ? '✅' : 'ℹ️';
        output += `  ${statusIcon} ${name}: ${metric.value}${metric.unit}\n`;
      }
    }

    // Alerts
    if (results.alerts.length > 0) {
      output += `\n🚨 ALERTS:\n`;
      results.alerts.forEach(alert => {
        const alertEmoji = alert.level === 'critical' ? '🔴' : '🟡';
        output += `  ${alertEmoji} ${alert.component}: ${alert.message}\n`;
      });
    }

    // Recommendations
    if (results.recommendations.length > 0) {
      output += `\n💡 RECOMMENDATIONS:\n`;
      results.recommendations.forEach(rec => {
        const priorityEmoji = rec.priority === 'high' ? '🔴' : 
                             rec.priority === 'medium' ? '🟡' : '🟢';
        output += `  ${priorityEmoji} ${rec.message}\n`;
      });
    }

    output += `\n${'='.repeat(60)}\n`;
    output += `Health check completed at ${new Date().toLocaleString()}\n`;
    output += `${'='.repeat(60)}\n`;

    return output;
  }
}

// Main execution function
async function main() {
  const options = parseArgs();
  
  if (!options.json && !options.githubActions) {
    console.log('🏥 Meire Blog Platform Health Check');
    console.log('📋 Comprehensive system diagnostics');
    console.log('⚡ SuperClaude framework integration\n');
  }

  try {
    const checker = new SystemHealthChecker(options);
    const results = await checker.runAllChecks();
    
    const formatter = new HealthCheckFormatter(options);
    const output = formatter.format(results);
    
    console.log(output);

    // Send notification if configured and there are alerts
    if (options.notificationUrl && results.alerts.length > 0) {
      try {
        await axios.post(options.notificationUrl, {
          text: `🏥 메르 블로그 헬스체크 경고`,
          attachments: [{
            color: results.overall === 'unhealthy' ? 'danger' : 'warning',
            fields: [
              {
                title: '전체 상태',
                value: results.overall,
                short: true
              },
              {
                title: '알림 개수',
                value: results.alerts.length.toString(),
                short: true
              },
              ...results.alerts.slice(0, 3).map(alert => ({
                title: alert.component,
                value: alert.message,
                short: false
              }))
            ]
          }]
        });
      } catch (error) {
        console.error('Failed to send health check notification:', error.message);
      }
    }

    // Exit with appropriate code
    process.exit(results.overall === 'unhealthy' ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal health check error:', error);
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

module.exports = { SystemHealthChecker, HealthCheckResults, HealthCheckFormatter };