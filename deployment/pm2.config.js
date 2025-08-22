/**
 * PM2 Configuration for Meire Blog Automated Crawler
 * 
 * This PM2 ecosystem file manages the automated crawling system with:
 * - Process monitoring and auto-restart
 * - Log management and rotation
 * - Resource monitoring
 * - Multiple environment configurations
 * 
 * Usage:
 *   pm2 start deployment/pm2.config.js
 *   pm2 status
 *   pm2 logs meire-crawler
 *   pm2 stop meire-crawler
 *   pm2 restart meire-crawler
 */

module.exports = {
  apps: [
    {
      // Main crawler scheduler
      name: 'meire-crawler',
      script: './scripts/node-scheduler.js',
      args: '--mode=pm2 --log-level=info',
      
      // Process configuration
      instances: 1, // Single instance to avoid concurrent crawling
      exec_mode: 'fork',
      
      // Auto restart configuration
      autorestart: true,
      watch: false, // Don't watch files in production
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Seoul',
        LOG_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        TZ: 'Asia/Seoul',
        LOG_LEVEL: 'debug'
      },
      env_staging: {
        NODE_ENV: 'staging',
        TZ: 'Asia/Seoul',
        LOG_LEVEL: 'info'
      },
      
      // Logging configuration
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Performance monitoring
      monitoring: true,
      pmx: true,
      
      // Advanced PM2 features
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health check URL (if using PM2 Plus)
      health_check_url: 'http://localhost:3000/api/health',
      health_check_grace_period: 30000
    },
    
    // Health monitor process
    {
      name: 'meire-health-monitor',
      script: './scripts/health-monitor.js',
      args: '--monitor-crawler=meire-crawler',
      
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      
      env: {
        NODE_ENV: 'production',
        MONITOR_INTERVAL: '300000', // 5 minutes
        ALERT_THRESHOLD: '3600000'  // 1 hour
      },
      
      log_file: './logs/health-monitor.log',
      merge_logs: true
    }
  ],

  // PM2 deploy configuration
  deploy: {
    production: {
      user: 'node',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/meire-blog-platform.git',
      path: '/var/www/meire-blog',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    
    staging: {
      user: 'node',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/meire-blog-platform.git',
      path: '/var/www/meire-blog-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
};