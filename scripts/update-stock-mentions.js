#!/usr/bin/env node

/**
 * 📈 Automated Stock Mentions Update System
 * 
 * Updates stock mention tracking and Merry's Pick rankings based on newly crawled posts.
 * Integrates with the automated crawling system to maintain accurate stock metrics.
 * 
 * Features:
 * - Stock mention detection and tracking
 * - Merry's Pick rankings update (CLAUDE.md requirement: latest mention date priority)
 * - Stock metadata and company information management
 * - Cache invalidation for real-time updates
 * 
 * Usage:
 *   node scripts/update-stock-mentions.js [options]
 * 
 * Options:
 *   --date=YYYY-MM-DD     Target date for processing (default: today)
 *   --recalculate-all     Recalculate all stock mention counts
 *   --update-descriptions Update company descriptions for new stocks
 *   --github-actions      Running in GitHub Actions environment
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

// Configuration
const CONFIG = {
  DATABASE_PATH: path.join(__dirname, '..', 'database.db')
};

// Stock universe with company information
const STOCK_UNIVERSE = {
  // US Stocks
  'TSLA': {
    company_name: '테슬라',
    market: 'NASDAQ',
    sector: '전기차',
    description: '전기차 및 에너지 솔루션 선도 기업'
  },
  'AAPL': {
    company_name: '애플',
    market: 'NASDAQ',
    sector: '기술',
    description: '글로벌 소비자 전자제품 및 서비스 기업'
  },
  'GOOGL': {
    company_name: '구글',
    market: 'NASDAQ',
    sector: '기술',
    description: '검색엔진 및 클라우드 서비스 플랫폼 기업'
  },
  'MSFT': {
    company_name: '마이크로소프트',
    market: 'NASDAQ',
    sector: '기술',
    description: '소프트웨어 및 클라우드 컴퓨팅 선도 기업'
  },
  'NVDA': {
    company_name: '엔비디아',
    market: 'NASDAQ',
    sector: '반도체',
    description: 'AI 및 그래픽 처리 반도체 전문 기업'
  },
  'META': {
    company_name: '메타',
    market: 'NASDAQ',
    sector: '기술',
    description: '소셜미디어 플랫폼 및 메타버스 기업'
  },
  'AMZN': {
    company_name: '아마존',
    market: 'NASDAQ',
    sector: '전자상거래',
    description: '글로벌 전자상거래 및 클라우드 서비스 기업'
  },
  'NFLX': {
    company_name: '넷플릭스',
    market: 'NASDAQ',
    sector: '엔터테인먼트',
    description: '글로벌 스트리밍 서비스 선도 기업'
  },
  'INTC': {
    company_name: '인텔',
    market: 'NASDAQ',
    sector: '반도체',
    description: 'CPU 및 반도체 설계 제조 기업'
  },
  'AMD': {
    company_name: 'AMD',
    market: 'NASDAQ',
    sector: '반도체',
    description: 'CPU 및 GPU 반도체 설계 전문 기업'
  },
  'XOM': {
    company_name: '엑손모빌',
    market: 'NYSE',
    sector: '에너지',
    description: '글로벌 석유 정제 및 화학 기업'
  },
  'PLTR': {
    company_name: '팰런티어',
    market: 'NYSE',
    sector: '기술',
    description: '빅데이터 분석 및 정보 플랫폼 기업'
  },

  // Korean Stocks
  '005930': {
    company_name: '삼성전자',
    market: 'KOSPI',
    sector: '반도체',
    description: '메모리반도체 및 스마트폰 글로벌 선도 기업'
  },
  '000660': {
    company_name: 'SK하이닉스',
    market: 'KOSPI',
    sector: '반도체',
    description: '메모리반도체 전문 글로벌 기업'
  },
  '005490': {
    company_name: '포스코',
    market: 'KOSPI',
    sector: '철강',
    description: '철강 제조 및 소재 전문 기업'
  },
  '051910': {
    company_name: 'LG화학',
    market: 'KOSPI',
    sector: '화학',
    description: '배터리 및 화학소재 글로벌 기업'
  },
  '006400': {
    company_name: '삼성SDI',
    market: 'KOSPI',
    sector: '배터리',
    description: '전기차 배터리 및 에너지솔루션 기업'
  },
  '267250': {
    company_name: 'HD현대',
    market: 'KOSPI',
    sector: '조선',
    description: '조선 및 해양플랜트 글로벌 선도 기업'
  },
  '042660': {
    company_name: '한화오션',
    market: 'KOSPI',
    sector: '조선',
    description: '선박건조 및 해양엔지니어링 기업'
  },
  '096770': {
    company_name: 'SK이노베이션',
    market: 'KOSPI',
    sector: '에너지',
    description: '정유 및 석유화학 전문 기업'
  },
  '010950': {
    company_name: 'S-Oil',
    market: 'KOSPI',
    sector: '에너지',
    description: '정유 및 석유화학 제품 생산 기업'
  },
  '003470': {
    company_name: 'LS니꼬동제련',
    market: 'KOSPI',
    sector: '소재',
    description: '동 제련 및 비철금속 전문 기업'
  },
  '004020': {
    company_name: '현대제철',
    market: 'KOSPI',
    sector: '철강',
    description: '철강 제조 및 가공 전문 기업'
  }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    date: new Date().toISOString().split('T')[0],
    recalculateAll: false,
    updateDescriptions: false,
    githubActions: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--date=')) options.date = arg.split('=')[1];
    if (arg === '--recalculate-all') options.recalculateAll = true;
    if (arg === '--update-descriptions') options.updateDescriptions = true;
    if (arg === '--github-actions') options.githubActions = true;
  });

  return options;
}

// Database manager for stock mentions
class StockMentionManager {
  constructor(dbPath) {
    this.db = sqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
  }

  // Ensure stocks table has required structure
  initializeStocksTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT UNIQUE NOT NULL,
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
    `);

    // Create index for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker);
      CREATE INDEX IF NOT EXISTS idx_stocks_last_mentioned ON stocks(last_mentioned_date DESC);
      CREATE INDEX IF NOT EXISTS idx_stocks_merry_mentioned ON stocks(is_merry_mentioned);
    `);

    console.log('✅ Stocks table initialized');
  }

  // Ensure all stocks from universe exist in database
  ensureStockUniverse() {
    console.log('🌌 Ensuring stock universe completeness...');
    
    let addedCount = 0;
    
    for (const [ticker, info] of Object.entries(STOCK_UNIVERSE)) {
      const existing = this.db.prepare('SELECT id FROM stocks WHERE ticker = ?').get(ticker);
      
      if (!existing) {
        this.db.prepare(`
          INSERT INTO stocks (ticker, company_name, market, sector, description, is_merry_mentioned)
          VALUES (?, ?, ?, ?, ?, 0)
        `).run(
          ticker,
          info.company_name,
          info.market,
          info.sector,
          info.description
        );
        
        console.log(`➕ Added stock: ${ticker} (${info.company_name})`);
        addedCount++;
      }
    }
    
    console.log(`✅ Stock universe updated: ${addedCount} stocks added`);
  }

  // Update company descriptions for existing stocks
  updateStockDescriptions() {
    console.log('📝 Updating stock descriptions...');
    
    let updatedCount = 0;
    
    for (const [ticker, info] of Object.entries(STOCK_UNIVERSE)) {
      const result = this.db.prepare(`
        UPDATE stocks 
        SET company_name = ?, 
            market = ?, 
            sector = ?, 
            description = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE ticker = ?
      `).run(
        info.company_name,
        info.market,
        info.sector,
        info.description,
        ticker
      );
      
      if (result.changes > 0) {
        console.log(`✏️ Updated: ${ticker} - ${info.description.substring(0, 30)}...`);
        updatedCount++;
      }
    }
    
    console.log(`✅ Stock descriptions updated: ${updatedCount} stocks`);
  }

  // Get posts with stock mentions for a specific date
  getPostsWithStockMentions(date) {
    return this.db.prepare(`
      SELECT DISTINCT bp.id, bp.title, bp.content, bp.excerpt, bp.created_date
      FROM blog_posts bp
      INNER JOIN merry_mentioned_stocks mms ON bp.id = mms.post_id
      WHERE DATE(bp.created_date) >= DATE(?)
        AND bp.blog_type = 'merry'
      ORDER BY bp.created_date DESC
    `).all(date);
  }

  // Get all posts for recalculation
  getAllMerryPosts() {
    return this.db.prepare(`
      SELECT id, title, content, excerpt, created_date
      FROM blog_posts 
      WHERE blog_type = 'merry'
      ORDER BY created_date DESC
    `).all();
  }

  // Detect stock mentions in post content
  detectStockMentions(post) {
    const content = (post.content + ' ' + post.title + ' ' + (post.excerpt || '')).toLowerCase();
    const mentions = [];

    for (const [ticker, info] of Object.entries(STOCK_UNIVERSE)) {
      // Check ticker
      if (content.includes(ticker.toLowerCase())) {
        mentions.push({
          ticker: ticker,
          company_name: info.company_name,
          match_type: 'ticker'
        });
        continue;
      }

      // Check company name
      if (content.includes(info.company_name.toLowerCase())) {
        mentions.push({
          ticker: ticker,
          company_name: info.company_name,
          match_type: 'company_name'
        });
      }
    }

    return mentions;
  }

  // Update stock mention tracking
  updateStockMention(postId, ticker, mentionDate, context = '') {
    // Check if mention already exists
    const existing = this.db.prepare(`
      SELECT id FROM merry_mentioned_stocks 
      WHERE post_id = ? AND ticker = ?
    `).get(postId, ticker);

    if (!existing) {
      // Add new mention
      this.db.prepare(`
        INSERT INTO merry_mentioned_stocks 
        (post_id, ticker, mentioned_date, context, mention_type)
        VALUES (?, ?, ?, ?, 'detected')
      `).run(postId, ticker, mentionDate, context);
    }

    // Update stock statistics
    this.updateStockStatistics(ticker, mentionDate);
  }

  // Update stock statistics
  updateStockStatistics(ticker, mentionDate) {
    // Calculate total mentions for this stock
    const totalMentions = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM merry_mentioned_stocks 
      WHERE ticker = ?
    `).get(ticker).count;

    // Get latest mention date
    const latestDate = this.db.prepare(`
      SELECT MAX(mentioned_date) as latest
      FROM merry_mentioned_stocks 
      WHERE ticker = ?
    `).get(ticker).latest;

    // Update stock record
    this.db.prepare(`
      UPDATE stocks 
      SET mention_count = ?,
          last_mentioned_date = ?,
          is_merry_mentioned = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE ticker = ?
    `).run(totalMentions, latestDate, ticker);
  }

  // Recalculate all stock mention statistics
  recalculateAllStockMentions() {
    console.log('🔄 Recalculating all stock mention statistics...');

    // Reset all mention counts
    this.db.prepare(`
      UPDATE stocks 
      SET mention_count = 0, 
          last_mentioned_date = NULL, 
          is_merry_mentioned = 0
    `).run();

    // Get all unique stock tickers from mentions
    const tickersWithMentions = this.db.prepare(`
      SELECT DISTINCT ticker 
      FROM merry_mentioned_stocks
    `).all();

    let updatedCount = 0;

    for (const { ticker } of tickersWithMentions) {
      // Calculate statistics
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as mention_count,
          MAX(mentioned_date) as last_mentioned_date
        FROM merry_mentioned_stocks 
        WHERE ticker = ?
      `).get(ticker);

      // Update stock record
      this.db.prepare(`
        UPDATE stocks 
        SET mention_count = ?,
            last_mentioned_date = ?,
            is_merry_mentioned = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE ticker = ?
      `).run(stats.mention_count, stats.last_mentioned_date, ticker);

      console.log(`📊 ${ticker}: ${stats.mention_count} mentions, latest: ${stats.last_mentioned_date}`);
      updatedCount++;
    }

    console.log(`✅ Recalculated statistics for ${updatedCount} stocks`);
  }

  // Get Merry's Pick rankings (CLAUDE.md requirement: latest mention date priority)
  getMerryPickRankings(limit = 10) {
    return this.db.prepare(`
      SELECT 
        ticker,
        company_name,
        description,
        mention_count,
        last_mentioned_date,
        sector,
        market
      FROM stocks 
      WHERE is_merry_mentioned = 1 
        AND mention_count > 0
      ORDER BY 
        last_mentioned_date DESC,  -- Latest mention date priority (CLAUDE.md requirement)
        mention_count ASC          -- Mention count as secondary sort
      LIMIT ?
    `).all(limit);
  }

  // Clear cache tables
  clearCaches() {
    console.log('🧹 Clearing cache tables...');
    
    const cacheTables = [
      'merry_picks_cache',
      'stock_price_cache',
      'sentiment_cache'
    ];

    let clearedCount = 0;

    cacheTables.forEach(table => {
      try {
        const result = this.db.prepare(`DELETE FROM ${table}`).run();
        console.log(`🗑️ Cleared ${table}: ${result.changes} entries`);
        clearedCount += result.changes;
      } catch (error) {
        console.log(`ℹ️ Cache table ${table} not found or already empty`);
      }
    });

    console.log(`✅ Total cache entries cleared: ${clearedCount}`);
  }

  close() {
    this.db.close();
  }
}

// Main stock mentions update orchestrator
class StockMentionsUpdater {
  constructor(options) {
    this.options = options;
    this.db = new StockMentionManager(CONFIG.DATABASE_PATH);
    
    this.stats = {
      postsProcessed: 0,
      mentionsFound: 0,
      mentionsAdded: 0,
      stocksUpdated: 0,
      errorsCount: 0
    };
  }

  // Initialize the updater
  async initialize() {
    console.log('📈 Initializing Stock Mentions Updater...');
    console.log(`📅 Target date: ${this.options.date}`);
    console.log(`🔄 Recalculate all: ${this.options.recalculateAll}`);
    console.log(`📝 Update descriptions: ${this.options.updateDescriptions}`);

    this.db.initializeStocksTable();
    this.db.ensureStockUniverse();

    if (this.options.updateDescriptions) {
      this.db.updateStockDescriptions();
    }
  }

  // Update stock mentions
  async update() {
    if (this.options.recalculateAll) {
      console.log('\n🔄 Recalculating all stock mentions...');
      await this.recalculateAllMentions();
    } else {
      console.log('\n🔍 Processing new stock mentions...');
      await this.processNewMentions();
    }
  }

  // Recalculate all stock mentions
  async recalculateAllMentions() {
    const posts = this.db.getAllMerryPosts();
    console.log(`📋 Processing ${posts.length} posts for recalculation`);

    // Clear existing mention records
    this.db.db.prepare('DELETE FROM merry_mentioned_stocks').run();
    console.log('🗑️ Cleared existing mention records');

    // Process all posts
    for (const post of posts) {
      await this.processPost(post);
    }

    // Recalculate statistics
    this.db.recalculateAllStockMentions();
  }

  // Process new mentions for specific date
  async processNewMentions() {
    const posts = this.db.getPostsWithStockMentions(this.options.date);
    console.log(`📋 Found ${posts.length} posts to process`);

    if (posts.length === 0) {
      // Check for posts without existing mentions
      const allPosts = this.db.db.prepare(`
        SELECT id, title, content, excerpt, created_date
        FROM blog_posts 
        WHERE DATE(created_date) >= DATE(?)
          AND blog_type = 'merry'
        ORDER BY created_date DESC
      `).all(this.options.date);

      console.log(`📋 Checking ${allPosts.length} posts from ${this.options.date}`);

      for (const post of allPosts) {
        await this.processPost(post);
      }
    } else {
      for (const post of posts) {
        await this.processPost(post);
      }
    }
  }

  // Process individual post for stock mentions
  async processPost(post) {
    try {
      console.log(`📝 Processing: ${post.title}`);

      // Detect stock mentions
      const mentions = this.db.detectStockMentions(post);
      
      if (mentions.length === 0) {
        console.log(`  ⏭️ No stock mentions found`);
        this.stats.postsProcessed++;
        return;
      }

      console.log(`  📈 Found ${mentions.length} mentions: ${mentions.map(m => m.ticker).join(', ')}`);
      this.stats.mentionsFound += mentions.length;

      // Process each mention
      for (const mention of mentions) {
        try {
          const postDate = post.created_date.split(' ')[0]; // Extract date part
          
          this.db.updateStockMention(
            post.id,
            mention.ticker,
            postDate,
            `Detected via ${mention.match_type}: ${mention.company_name}`
          );

          console.log(`  ✅ Updated mention: ${mention.ticker}`);
          this.stats.mentionsAdded++;
          this.stats.stocksUpdated++;

        } catch (error) {
          console.error(`  ❌ Error updating mention for ${mention.ticker}:`, error.message);
          this.stats.errorsCount++;
        }
      }

      this.stats.postsProcessed++;

    } catch (error) {
      console.error(`❌ Error processing post ${post.id}:`, error.message);
      this.stats.errorsCount++;
    }
  }

  // Finalize and show results
  finalize() {
    console.log('\n📊 STOCK MENTIONS UPDATE SUMMARY:');
    console.log(`  📝 Posts processed: ${this.stats.postsProcessed}`);
    console.log(`  🔍 Mentions found: ${this.stats.mentionsFound}`);
    console.log(`  ➕ Mentions added: ${this.stats.mentionsAdded}`);
    console.log(`  📈 Stocks updated: ${this.stats.stocksUpdated}`);
    console.log(`  ❌ Errors: ${this.stats.errorsCount}`);

    // Show current Merry's Pick rankings
    console.log('\n⭐ MERRY\'S PICK RANKINGS (Latest Mention Date Priority):');
    const rankings = this.db.getMerryPickRankings(10);
    
    rankings.forEach((stock, index) => {
      console.log(`  ${index + 1}. ${stock.ticker} (${stock.company_name})`);
      console.log(`     📅 Latest: ${stock.last_mentioned_date} | 📊 Mentions: ${stock.mention_count}`);
      console.log(`     📋 ${stock.description}`);
      console.log('');
    });

    // Clear caches for real-time updates
    this.db.clearCaches();

    this.db.close();
    console.log('🎉 Stock mentions update completed!');

    return {
      success: this.stats.errorsCount === 0,
      stats: this.stats
    };
  }
}

// Main execution function
async function main() {
  const options = parseArgs();

  console.log('📈 Meire Blog Stock Mentions Updater');
  console.log('📋 Following CLAUDE.md Merry\'s Pick requirements');
  console.log('🎯 Latest mention date priority ranking system');
  console.log('⚡ SuperClaude framework integration\n');

  try {
    const updater = new StockMentionsUpdater(options);
    
    await updater.initialize();
    await updater.update();
    const result = updater.finalize();
    
    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('💥 Fatal stock mentions update error:', error);
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

module.exports = { StockMentionsUpdater, StockMentionManager };