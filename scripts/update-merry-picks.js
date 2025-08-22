#!/usr/bin/env node

/**
 * ⭐ Merry's Pick Rankings Update System
 * 
 * Updates Merry's Pick rankings following CLAUDE.md requirements.
 * Priority: Latest mention date (not mention count) as per CLAUDE.md guidelines.
 * 
 * Features:
 * - Latest mention date priority ranking (CLAUDE.md requirement)
 * - Company description management
 * - Cache invalidation for real-time updates
 * - Performance optimization for 3-second loading requirement
 * 
 * Usage:
 *   node scripts/update-merry-picks.js [options]
 * 
 * Options:
 *   --recalculate-all     Recalculate all rankings from scratch
 *   --update-descriptions Update company descriptions
 *   --clear-cache         Clear all related caches
 *   --github-actions      Running in GitHub Actions environment
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

// Configuration
const CONFIG = {
  DATABASE_PATH: path.join(__dirname, '..', 'database.db'),
  DEFAULT_LIMIT: 10,
  CACHE_DURATION_HOURS: 12
};

// Enhanced company descriptions (following CLAUDE.md requirements)
const ENHANCED_DESCRIPTIONS = {
  // US Stocks
  'TSLA': '전기차 시장 선도기업으로 자율주행 기술 혁신',
  'AAPL': '아이폰과 서비스 생태계 기반 프리미엄 브랜드',
  'GOOGL': '검색광고 독점과 클라우드 AI 기술 선도',
  'MSFT': '클라우드 컴퓨팅과 기업용 소프트웨어 강자',
  'NVDA': 'AI 반도체 시장 독점과 데이터센터 성장',
  'META': '소셜미디어 플랫폼과 메타버스 기술 개발',
  'AMZN': '전자상거래와 AWS 클라우드 서비스 양대축',
  'NFLX': '글로벌 스트리밍 콘텐츠 제작 배급 플랫폼',
  'INTC': 'CPU 시장 경쟁력 회복과 파운드리 사업 확대',
  'AMD': '고성능 CPU GPU로 인텔 엔비디아 추격',
  'XOM': '전통 에너지 기업의 친환경 전환 노력',
  'PLTR': '정부 기업 대상 빅데이터 분석 플랫폼',

  // Korean Stocks
  '005930': 'AI 메모리반도체 시장 선도와 파운드리 2위',
  '000660': '고대역폭 메모리 HBM 시장 점유율 확대',
  '005490': '전기차 배터리용 니켈 코발트 소재 공급',
  '051910': '배터리 양극재 기술로 전기차 성장 수혜',
  '006400': '프리미엄 전기차 배터리 공급 확대',
  '267250': '친환경 선박과 해상풍력 사업 진출',
  '042660': 'LNG선 수주와 해양플랜트 기술 강화',
  '096770': '배터리 소재와 친환경 에너지 전환',
  '010950': '정유마진 개선과 석유화학 사업 확대',
  '003470': '전기차 핵심소재 구리 가공 전문기업',
  '004020': '고급강 생산과 자동차 소재 공급 확대'
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    recalculateAll: false,
    updateDescriptions: false,
    clearCache: false,
    githubActions: false
  };

  args.forEach(arg => {
    if (arg === '--recalculate-all') options.recalculateAll = true;
    if (arg === '--update-descriptions') options.updateDescriptions = true;
    if (arg === '--clear-cache') options.clearCache = true;
    if (arg === '--github-actions') options.githubActions = true;
  });

  return options;
}

// Database manager for Merry's Pick
class MerryPickManager {
  constructor(dbPath) {
    this.db = sqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
  }

  // Initialize required tables and indexes for performance
  initializeTables() {
    console.log('🗄️ Initializing Merry\'s Pick tables...');

    // Ensure stocks table exists with proper structure
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
        badge_text TEXT,
        priority_score REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create performance indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_stocks_merry_pick 
      ON stocks(is_merry_mentioned, last_mentioned_date DESC, mention_count);
      
      CREATE INDEX IF NOT EXISTS idx_stocks_last_mentioned 
      ON stocks(last_mentioned_date DESC);
      
      CREATE INDEX IF NOT EXISTS idx_stocks_priority 
      ON stocks(priority_score DESC, last_mentioned_date DESC);
    `);

    // Cache table for performance (CLAUDE.md 3-second loading requirement)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS merry_picks_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT UNIQUE NOT NULL,
        cache_data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Merry\'s Pick tables and indexes ready');
  }

  // Update company descriptions with enhanced versions
  updateEnhancedDescriptions() {
    console.log('📝 Updating enhanced company descriptions...');
    
    let updatedCount = 0;
    
    for (const [ticker, description] of Object.entries(ENHANCED_DESCRIPTIONS)) {
      // Ensure description is under 100 characters (CLAUDE.md requirement)
      const trimmedDescription = description.length > 100 
        ? description.substring(0, 97) + '...'
        : description;

      const result = this.db.prepare(`
        UPDATE stocks 
        SET description = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE ticker = ?
      `).run(trimmedDescription, ticker);

      if (result.changes > 0) {
        console.log(`✏️ ${ticker}: ${trimmedDescription}`);
        updatedCount++;
      } else {
        console.log(`⚠️ ${ticker} not found in stocks table`);
      }
    }

    console.log(`✅ Enhanced descriptions updated: ${updatedCount} stocks`);
  }

  // Calculate priority scores based on CLAUDE.md requirements
  calculatePriorityScores() {
    console.log('🧮 Calculating Merry\'s Pick priority scores...');

    // Get all mentioned stocks
    const mentionedStocks = this.db.prepare(`
      SELECT ticker, last_mentioned_date, mention_count
      FROM stocks
      WHERE is_merry_mentioned = 1 
        AND last_mentioned_date IS NOT NULL
    `).all();

    console.log(`📊 Processing ${mentionedStocks.length} mentioned stocks`);

    const today = new Date();
    let updatedCount = 0;

    for (const stock of mentionedStocks) {
      try {
        const lastMentionDate = new Date(stock.last_mentioned_date);
        const daysSinceLastMention = Math.floor((today - lastMentionDate) / (1000 * 60 * 60 * 24));
        
        // CLAUDE.md Priority Formula: Latest mention date is primary
        // Formula: Base score - (days since last mention * 0.1) + (mention count * 0.01)
        const priorityScore = 1000 - (daysSinceLastMention * 0.5) + (stock.mention_count * 0.1);
        
        // Update priority score
        this.db.prepare(`
          UPDATE stocks 
          SET priority_score = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE ticker = ?
        `).run(priorityScore, stock.ticker);

        console.log(`📊 ${stock.ticker}: ${priorityScore.toFixed(2)} (${daysSinceLastMention}일 전, ${stock.mention_count}회)`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error calculating priority for ${stock.ticker}:`, error.message);
      }
    }

    console.log(`✅ Priority scores calculated for ${updatedCount} stocks`);
  }

  // Generate badge texts for stocks
  generateBadgeTexts() {
    console.log('🏷️ Generating badge texts...');

    const badgeRules = [
      { condition: 'mention_count >= 5', badge: 'HOT' },
      { condition: 'mention_count >= 3', badge: 'PICK' },
      { condition: 'last_mentioned_date >= date("now", "-7 days")', badge: 'NEW' },
      { condition: 'sector = "반도체" OR sector = "기술"', badge: 'TECH' },
      { condition: 'market = "NASDAQ"', badge: 'US' },
      { condition: 'market = "KOSPI"', badge: 'KR' }
    ];

    let updatedCount = 0;

    // Reset all badges first
    this.db.prepare('UPDATE stocks SET badge_text = NULL WHERE is_merry_mentioned = 1').run();

    // Apply badge rules in priority order
    for (const rule of badgeRules) {
      const result = this.db.prepare(`
        UPDATE stocks 
        SET badge_text = COALESCE(badge_text, ?)
        WHERE is_merry_mentioned = 1 
          AND badge_text IS NULL
          AND ${rule.condition}
      `).run(rule.badge);

      console.log(`🏷️ Applied '${rule.badge}' badge to ${result.changes} stocks`);
      updatedCount += result.changes;
    }

    console.log(`✅ Badge texts generated for ${updatedCount} stocks`);
  }

  // Get Merry's Pick rankings (CLAUDE.md requirement: latest mention date priority)
  getMerryPickRankings(limit = CONFIG.DEFAULT_LIMIT) {
    return this.db.prepare(`
      SELECT 
        ticker,
        company_name,
        description,
        mention_count,
        last_mentioned_date,
        sector,
        market,
        badge_text,
        priority_score,
        JULIANDAY('now') - JULIANDAY(last_mentioned_date) as days_since_mention
      FROM stocks 
      WHERE is_merry_mentioned = 1 
        AND mention_count > 0
        AND last_mentioned_date IS NOT NULL
      ORDER BY 
        last_mentioned_date DESC,  -- Primary: Latest mention date (CLAUDE.md requirement)
        priority_score DESC,       -- Secondary: Priority score
        mention_count DESC         -- Tertiary: Mention count
      LIMIT ?
    `).all(limit);
  }

  // Cache Merry's Pick data for performance (3-second loading requirement)
  cacheMerryPickData() {
    console.log('🗂️ Caching Merry\'s Pick data for performance...');

    const rankings = this.getMerryPickRankings(15); // Cache more than needed
    const cacheData = {
      generated_at: new Date().toISOString(),
      rankings: rankings,
      total_mentioned_stocks: rankings.length,
      last_update: rankings.length > 0 ? rankings[0].last_mentioned_date : null
    };

    // Set cache expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CONFIG.CACHE_DURATION_HOURS);

    // Store in cache
    this.db.prepare(`
      INSERT OR REPLACE INTO merry_picks_cache 
      (cache_key, cache_data, expires_at)
      VALUES (?, ?, ?)
    `).run(
      'merry_picks_rankings',
      JSON.stringify(cacheData),
      expiresAt.toISOString()
    );

    console.log(`✅ Cached ${rankings.length} rankings (expires: ${expiresAt.toLocaleString()})`);
  }

  // Clear all caches
  clearAllCaches() {
    console.log('🧹 Clearing all caches...');
    
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

  // Recalculate all stock mention data
  recalculateAllData() {
    console.log('🔄 Recalculating all Merry\'s Pick data...');

    // Recalculate mention counts
    const stockMentions = this.db.prepare(`
      SELECT 
        ticker,
        COUNT(*) as total_mentions,
        MAX(mentioned_date) as latest_mention
      FROM merry_mentioned_stocks
      GROUP BY ticker
    `).all();

    console.log(`📊 Recalculating data for ${stockMentions.length} stocks`);

    let updatedCount = 0;

    // Reset all stocks first
    this.db.prepare(`
      UPDATE stocks 
      SET mention_count = 0, 
          last_mentioned_date = NULL, 
          is_merry_mentioned = 0,
          priority_score = 0
    `).run();

    // Update based on actual mentions
    for (const stock of stockMentions) {
      this.db.prepare(`
        UPDATE stocks 
        SET mention_count = ?,
            last_mentioned_date = ?,
            is_merry_mentioned = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE ticker = ?
      `).run(stock.total_mentions, stock.latest_mention, stock.ticker);

      console.log(`📊 ${stock.ticker}: ${stock.total_mentions} mentions, latest: ${stock.latest_mention}`);
      updatedCount++;
    }

    console.log(`✅ Recalculated data for ${updatedCount} stocks`);
  }

  // Get statistics
  getStatistics() {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_stocks,
        SUM(CASE WHEN is_merry_mentioned = 1 THEN 1 ELSE 0 END) as mentioned_stocks,
        SUM(mention_count) as total_mentions,
        MAX(last_mentioned_date) as latest_mention_date,
        AVG(priority_score) as avg_priority_score
      FROM stocks
    `).get();

    return stats;
  }

  close() {
    this.db.close();
  }
}

// Main Merry's Pick updater
class MerryPickUpdater {
  constructor(options) {
    this.options = options;
    this.db = new MerryPickManager(CONFIG.DATABASE_PATH);
  }

  // Initialize the updater
  async initialize() {
    console.log('⭐ Initializing Merry\'s Pick Updater...');
    console.log('📋 Following CLAUDE.md requirements:');
    console.log('  🎯 Latest mention date priority (NOT mention count)');
    console.log('  ⚡ 3-second loading performance optimization');
    console.log('  📝 Enhanced company descriptions (<100 chars)');
    console.log('  🏷️ Smart badge system\n');

    this.db.initializeTables();

    if (this.options.updateDescriptions) {
      this.db.updateEnhancedDescriptions();
    }
  }

  // Update Merry's Pick rankings
  async update() {
    if (this.options.recalculateAll) {
      console.log('🔄 Full recalculation mode...\n');
      this.db.recalculateAllData();
    }

    // Core update process
    this.db.calculatePriorityScores();
    this.db.generateBadgeTexts();
    this.db.cacheMerryPickData();

    if (this.options.clearCache) {
      this.db.clearAllCaches();
    }
  }

  // Show final results
  finalize() {
    console.log('\n📊 MERRY\'S PICK UPDATE SUMMARY:');

    // Get and display statistics
    const stats = this.db.getStatistics();
    console.log(`  📈 Total stocks in universe: ${stats.total_stocks}`);
    console.log(`  ⭐ Merry mentioned stocks: ${stats.mentioned_stocks}`);
    console.log(`  💬 Total mentions: ${stats.total_mentions}`);
    console.log(`  📅 Latest mention: ${stats.latest_mention_date}`);
    console.log(`  🎯 Average priority score: ${(stats.avg_priority_score || 0).toFixed(2)}`);

    // Display top rankings
    console.log('\n⭐ TOP 10 MERRY\'S PICK RANKINGS:');
    console.log('📋 Sorted by: Latest Mention Date → Priority Score → Mention Count');
    console.log('─'.repeat(80));

    const rankings = this.db.getMerryPickRankings(10);
    
    rankings.forEach((stock, index) => {
      const badge = stock.badge_text ? `[${stock.badge_text}]` : '';
      const daysAgo = Math.floor(stock.days_since_mention);
      
      console.log(`${index + 1}.`.padEnd(3) + ` ${stock.ticker.padEnd(8)} ${stock.company_name} ${badge}`);
      console.log('   '.padEnd(3) + ` 📅 ${stock.last_mentioned_date} (${daysAgo}일 전)`);
      console.log('   '.padEnd(3) + ` 📊 ${stock.mention_count}회 언급 | 🎯 ${(stock.priority_score || 0).toFixed(1)}점`);
      console.log('   '.padEnd(3) + ` 📋 ${stock.description}`);
      console.log('');
    });

    console.log('─'.repeat(80));

    // Performance metrics
    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`  🗂️ Cache status: Rankings cached for ${CONFIG.CACHE_DURATION_HOURS} hours`);
    console.log(`  🏎️ Query optimization: Indexed for sub-second response`);
    console.log(`  📱 API ready: /api/merry/stocks optimized`);

    this.db.close();
    console.log('\n🎉 Merry\'s Pick update completed!');

    return {
      success: true,
      stats: {
        totalStocks: stats.total_stocks,
        mentionedStocks: stats.mentioned_stocks,
        totalMentions: stats.total_mentions,
        latestMention: stats.latest_mention_date
      }
    };
  }
}

// Main execution function
async function main() {
  const options = parseArgs();

  console.log('⭐ Meire Blog Merry\'s Pick Updater');
  console.log('📋 CLAUDE.md Compliance: Latest Mention Date Priority');
  console.log('⚡ SuperClaude Framework Integration');
  console.log('🎯 Performance Optimized for 3-Second Loading\n');

  try {
    const updater = new MerryPickUpdater(options);
    
    await updater.initialize();
    await updater.update();
    const result = updater.finalize();
    
    // Exit with success
    process.exit(0);

  } catch (error) {
    console.error('💥 Fatal Merry\'s Pick update error:', error);
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

module.exports = { MerryPickUpdater, MerryPickManager };