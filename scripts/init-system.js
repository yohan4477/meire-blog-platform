#!/usr/bin/env node

/**
 * 🚀 System Initialization Script
 * 
 * Sets up the automated crawling system for first-time use.
 * Creates necessary directories, validates dependencies, and prepares the system.
 * 
 * Usage:
 *   node scripts/init-system.js
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('better-sqlite3');

console.log('🚀 Initializing Meire Blog Automated Crawling System');
console.log('📋 Following CLAUDE.md guidelines and SuperClaude framework');
console.log('⚡ Setting up all required components...\n');

const CONFIG = {
  DATABASE_PATH: path.join(__dirname, '..', 'database.db'),
  LOG_DIR: path.join(__dirname, '..', 'logs'),
  BACKUP_DIR: path.join(__dirname, '..', 'backup'),
  CONFIG_DIR: path.join(__dirname, '..', 'config')
};

// Create necessary directories
function createDirectories() {
  console.log('📁 Creating necessary directories...');
  
  const dirs = [
    CONFIG.LOG_DIR,
    CONFIG.BACKUP_DIR,
    CONFIG.CONFIG_DIR
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ Created: ${path.relative(process.cwd(), dir)}`);
    } else {
      console.log(`  ℹ️ Exists: ${path.relative(process.cwd(), dir)}`);
    }
  });
}

// Initialize database with minimal schema
function initializeDatabase() {
  console.log('\n🗄️ Initializing database...');
  
  try {
    const db = sqlite3(CONFIG.DATABASE_PATH);
    
    // Create tables with compatible schema
    const tables = {
      blog_posts: `
        CREATE TABLE IF NOT EXISTS blog_posts (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          created_date DATETIME NOT NULL,
          views INTEGER DEFAULT 0,
          category TEXT,
          blog_type TEXT DEFAULT 'merry'
        )
      `,
      
      stocks: `
        CREATE TABLE IF NOT EXISTS stocks (
          ticker TEXT PRIMARY KEY,
          company_name TEXT,
          market TEXT,
          sector TEXT,
          description TEXT,
          mention_count INTEGER DEFAULT 0,
          last_mentioned_date DATE,
          is_merry_mentioned BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      
      merry_mentioned_stocks: `
        CREATE TABLE IF NOT EXISTS merry_mentioned_stocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          ticker TEXT NOT NULL,
          mentioned_date DATE NOT NULL,
          context TEXT,
          sentiment_score REAL DEFAULT 0,
          mention_type TEXT DEFAULT 'neutral',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, ticker)
        )
      `,
      
      post_stock_sentiments: `
        CREATE TABLE IF NOT EXISTS post_stock_sentiments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          ticker TEXT NOT NULL,
          sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
          sentiment_score DECIMAL(4,3) NOT NULL,
          confidence DECIMAL(4,3) NOT NULL,
          keywords TEXT,
          context_snippet TEXT,
          reasoning TEXT,
          analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, ticker)
        )
      `,
      
      crawl_logs: `
        CREATE TABLE IF NOT EXISTS crawl_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          crawl_date DATE NOT NULL,
          crawl_type TEXT NOT NULL,
          posts_found INTEGER DEFAULT 0,
          posts_new INTEGER DEFAULT 0,
          posts_updated INTEGER DEFAULT 0,
          errors_count INTEGER DEFAULT 0,
          execution_time_seconds INTEGER,
          status TEXT DEFAULT 'running',
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    };
    
    // Create tables
    Object.entries(tables).forEach(([tableName, sql]) => {
      try {
        db.exec(sql);
        console.log(`  ✅ Table: ${tableName}`);
      } catch (error) {
        console.log(`  ⚠️ Table ${tableName}: ${error.message}`);
      }
    });
    
    // Create basic indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker)',
      'CREATE INDEX IF NOT EXISTS idx_stocks_last_mentioned ON stocks(last_mentioned_date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_merry_mentioned_ticker ON merry_mentioned_stocks(ticker)',
      'CREATE INDEX IF NOT EXISTS idx_sentiments_ticker ON post_stock_sentiments(ticker)'
    ];
    
    indexes.forEach(indexSql => {
      try {
        db.exec(indexSql);
      } catch (error) {
        console.log(`  ℹ️ Index warning: ${error.message}`);
      }
    });
    
    console.log('  ✅ Indexes created');
    
    // Add some basic stock data
    const basicStocks = [
      { ticker: 'TSLA', company_name: '테슬라', market: 'NASDAQ', sector: '전기차', description: '전기차 및 에너지 솔루션 기업' },
      { ticker: 'AAPL', company_name: '애플', market: 'NASDAQ', sector: '기술', description: '소비자 전자제품 및 서비스 기업' },
      { ticker: '005930', company_name: '삼성전자', market: 'KOSPI', sector: '반도체', description: '메모리반도체 및 전자제품 기업' },
      { ticker: 'NVDA', company_name: '엔비디아', market: 'NASDAQ', sector: '반도체', description: 'AI 및 그래픽 처리 반도체 기업' },
      { ticker: 'GOOGL', company_name: '구글', market: 'NASDAQ', sector: '기술', description: '검색엔진 및 클라우드 서비스 기업' }
    ];
    
    const stockStmt = db.prepare(`
      INSERT OR IGNORE INTO stocks (ticker, company_name, market, sector, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    let stocksAdded = 0;
    basicStocks.forEach(stock => {
      const result = stockStmt.run(stock.ticker, stock.company_name, stock.market, stock.sector, stock.description);
      if (result.changes > 0) stocksAdded++;
    });
    
    console.log(`  ✅ Added ${stocksAdded} basic stocks`);
    
    const stats = {
      posts: db.prepare('SELECT COUNT(*) as count FROM blog_posts').get().count,
      stocks: db.prepare('SELECT COUNT(*) as count FROM stocks').get().count,
      mentions: db.prepare('SELECT COUNT(*) as count FROM merry_mentioned_stocks').get().count
    };
    
    console.log(`  📊 Database stats: ${stats.posts} posts, ${stats.stocks} stocks, ${stats.mentions} mentions`);
    
    db.close();
    
  } catch (error) {
    console.error('  ❌ Database initialization failed:', error.message);
    return false;
  }
  
  return true;
}

// Check dependencies
function checkDependencies() {
  console.log('\n📦 Checking dependencies...');
  
  const requiredPackages = [
    'better-sqlite3',
    'node-cron', 
    'axios',
    'cheerio'
  ];
  
  let allPresent = true;
  
  requiredPackages.forEach(pkg => {
    try {
      require.resolve(pkg);
      console.log(`  ✅ ${pkg}`);
    } catch (error) {
      console.log(`  ❌ ${pkg} - Missing!`);
      allPresent = false;
    }
  });
  
  if (!allPresent) {
    console.log('\n  💡 Run: npm install');
    return false;
  }
  
  return true;
}

// Create sample configuration
function createSampleConfig() {
  console.log('\n⚙️ Creating sample configuration...');
  
  const sampleConfig = {
    "crawling": {
      "schedule": "0 0,3,6,9,12,15,18,21 * * *",
      "timezone": "Asia/Seoul",
      "batchSize": 10,
      "maxPosts": 50,
      "timeout": 300000
    },
    "database": {
      "path": "./database.db",
      "backupEnabled": true,
      "backupInterval": "daily"
    },
    "notifications": {
      "enabled": false,
      "webhookUrl": "",
      "alertThreshold": {
        "memory": 500,
        "errorRate": 0.1
      }
    },
    "performance": {
      "loadingTimeLimit": 3000,
      "apiResponseLimit": 500,
      "chartRenderLimit": 1500
    }
  };
  
  const configPath = path.join(CONFIG.CONFIG_DIR, 'crawler-config.json');
  
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
    console.log(`  ✅ Created: ${path.relative(process.cwd(), configPath)}`);
  } else {
    console.log(`  ℹ️ Config already exists: ${path.relative(process.cwd(), configPath)}`);
  }
  
  // Create environment template
  const envTemplate = `# Meire Blog Automated Crawling System Configuration
# Copy this to .env and configure your values

# Required
TZ=Asia/Seoul

# Optional - Sentiment Analysis
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional - Notifications  
NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/your/webhook/url

# Optional - Deployment Webhooks
VERCEL_WEBHOOK_URL=your_vercel_deployment_webhook
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Optional - GitHub Actions
GITHUB_TOKEN=your_github_token_for_actions
`;

  const envPath = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envTemplate);
    console.log(`  ✅ Created: ${path.relative(process.cwd(), envPath)}`);
  } else {
    console.log(`  ℹ️ Template already exists: ${path.relative(process.cwd(), envPath)}`);
  }
}

// Validate scripts
function validateScripts() {
  console.log('\n🔍 Validating scripts...');
  
  const requiredScripts = [
    'automated-crawl.js',
    'automated-sentiment-analysis.js',
    'update-stock-mentions.js', 
    'update-merry-picks.js',
    'health-check.js',
    'node-scheduler.js'
  ];
  
  let allValid = true;
  
  requiredScripts.forEach(scriptName => {
    const scriptPath = path.join(__dirname, scriptName);
    if (fs.existsSync(scriptPath)) {
      console.log(`  ✅ ${scriptName}`);
    } else {
      console.log(`  ❌ ${scriptName} - Missing!`);
      allValid = false;
    }
  });
  
  return allValid;
}

// Run system test
function runSystemTest() {
  console.log('\n🧪 Running system test...');
  
  try {
    // Test database connection
    const db = sqlite3(CONFIG.DATABASE_PATH);
    const testQuery = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get();
    db.close();
    
    console.log(`  ✅ Database test passed (${testQuery.count} tables)`);
    
    // Test log directory write
    const testLogFile = path.join(CONFIG.LOG_DIR, 'test.log');
    fs.writeFileSync(testLogFile, 'System initialization test\n');
    fs.unlinkSync(testLogFile);
    
    console.log('  ✅ Log directory write test passed');
    
    return true;
    
  } catch (error) {
    console.log(`  ❌ System test failed: ${error.message}`);
    return false;
  }
}

// Main initialization
async function main() {
  try {
    // Step 1: Check dependencies
    if (!checkDependencies()) {
      console.log('\n❌ Initialization failed: Missing dependencies');
      process.exit(1);
    }
    
    // Step 2: Create directories
    createDirectories();
    
    // Step 3: Initialize database
    if (!initializeDatabase()) {
      console.log('\n❌ Initialization failed: Database setup error');
      process.exit(1);
    }
    
    // Step 4: Create configuration
    createSampleConfig();
    
    // Step 5: Validate scripts
    if (!validateScripts()) {
      console.log('\n❌ Initialization failed: Missing script files');
      process.exit(1);
    }
    
    // Step 6: Run system test
    if (!runSystemTest()) {
      console.log('\n❌ Initialization failed: System test error');
      process.exit(1);
    }
    
    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SYSTEM INITIALIZATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    
    console.log('\n📋 What\'s Ready:');
    console.log('  ✅ Database initialized with required tables');
    console.log('  ✅ Directories created for logs and backups');  
    console.log('  ✅ Sample configuration files created');
    console.log('  ✅ All required scripts validated');
    console.log('  ✅ System test passed');
    
    console.log('\n🚀 Next Steps:');
    console.log('  1. Configure environment variables (copy .env.example to .env)');
    console.log('  2. Start crawler scheduler:');
    console.log('     • Node.js: node scripts/node-scheduler.js --mode=standalone');
    console.log('  3. Run health check: node scripts/health-check.js --detailed');
    console.log('  4. Test individual components:');
    console.log('     • node scripts/update-stock-mentions.js --date=2025-08-21');
    console.log('     • node scripts/health-check.js');
    
    console.log('\n📚 Documentation:');
    console.log('  📖 Full documentation: docs/automated-crawling-system.md');
    console.log('  🔧 Troubleshooting: Check health status and logs/');
    console.log('  🏥 Health monitoring: scripts/health-check.js');
    
    console.log('\n✅ Your automated crawling system is ready to use!');
    console.log('🌟 Built with SuperClaude framework and CLAUDE.md compliance');
    
  } catch (error) {
    console.error('\n💥 Initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
if (require.main === module) {
  main();
}

module.exports = { main };