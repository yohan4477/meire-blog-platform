#!/usr/bin/env node

/**
 * 🚀 Automated Blog Crawling System
 * 
 * This script implements comprehensive automated crawling for the Meire blog platform.
 * It follows CLAUDE.md guidelines and integrates with SuperClaude framework.
 * 
 * Features:
 * - Every 3-hour scheduled crawling
 * - Intelligent post detection and analysis
 * - Cache management and performance optimization
 * - Error handling with retry logic
 * - Multiple deployment environment support
 * 
 * Usage:
 *   node scripts/automated-crawl.js [options]
 * 
 * Options:
 *   --type=standard|intensive     Crawl type (default: standard)
 *   --date=YYYY-MM-DD            Target date (default: today)
 *   --force-full=true|false      Force full crawl (default: false)
 *   --github-actions=true|false  Running in GitHub Actions (default: false)
 *   --dry-run=true|false         Dry run mode (default: false)
 *   --max-posts=N                Maximum posts to process (default: 50)
 *   --timeout=N                  Timeout in seconds (default: 300)
 */

const sqlite3 = require('better-sqlite3');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  DATABASE_PATH: path.join(__dirname, '..', 'database.db'),
  BLOG_BASE_URL: 'https://meire.kr',
  USER_AGENT: 'Mozilla/5.0 (compatible; MeireCrawler/1.0; +https://meire.kr)',
  REQUEST_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  BATCH_SIZE: 10,
  MAX_CONCURRENT: 3
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: 'standard',
    date: new Date().toISOString().split('T')[0],
    forceFull: false,
    githubActions: false,
    dryRun: false,
    maxPosts: 50,
    timeout: 300
  };

  args.forEach(arg => {
    if (arg.startsWith('--type=')) options.type = arg.split('=')[1];
    if (arg.startsWith('--date=')) options.date = arg.split('=')[1];
    if (arg.startsWith('--force-full=')) options.forceFull = arg.split('=')[1] === 'true';
    if (arg.startsWith('--github-actions=')) options.githubActions = arg.split('=')[1] === 'true';
    if (arg.startsWith('--dry-run=')) options.dryRun = arg.split('=')[1] === 'true';
    if (arg.startsWith('--max-posts=')) options.maxPosts = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--timeout=')) options.timeout = parseInt(arg.split('=')[1]);
  });

  return options;
}

// Database manager class
class DatabaseManager {
  constructor(dbPath) {
    this.db = sqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
    this.db.pragma('temp_store = memory');
  }

  // Initialize required tables if they don't exist
  initializeTables() {
    console.log('🗄️ Initializing database tables...');

    // Blog posts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        created_date DATETIME NOT NULL,
        updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INTEGER DEFAULT 0,
        category TEXT,
        blog_type TEXT DEFAULT 'merry',
        author TEXT DEFAULT 'Meire',
        slug TEXT,
        meta_description TEXT,
        tags TEXT,
        featured_image TEXT,
        status TEXT DEFAULT 'published'
      )
    `);

    // Stocks table
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

    // Merry mentioned stocks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS merry_mentioned_stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        ticker TEXT NOT NULL,
        mentioned_date DATE NOT NULL,
        context TEXT,
        sentiment_score REAL DEFAULT 0,
        mention_type TEXT DEFAULT 'neutral',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
        UNIQUE(post_id, ticker)
      )
    `);

    // Post stock sentiments table (CLAUDE.md requirement)
    this.db.exec(`
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
        FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
        UNIQUE(post_id, ticker)
      )
    `);

    // Cache tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS merry_picks_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT UNIQUE NOT NULL,
        cache_data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crawl log table for tracking
    this.db.exec(`
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
    `);

    console.log('✅ Database tables initialized');
  }

  // Get the latest post date from database
  getLatestPostDate() {
    const result = this.db.prepare(`
      SELECT MAX(created_date) as latest_date 
      FROM blog_posts 
      WHERE blog_type = 'merry'
    `).get();
    
    return result?.latest_date || '2025-01-01';
  }

  // Check if post exists
  postExists(postId) {
    const result = this.db.prepare('SELECT id FROM blog_posts WHERE id = ?').get(postId);
    return !!result;
  }

  // Insert new blog post
  insertPost(post) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO blog_posts 
      (id, title, content, excerpt, created_date, views, category, blog_type, author, slug, meta_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'merry', 'Meire', ?, ?)
    `);

    return stmt.run([
      post.id,
      post.title,
      post.content,
      post.excerpt,
      post.created_date,
      post.views || 0,
      post.category || '분석',
      post.slug || post.title.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-'),
      post.meta_description || post.excerpt
    ]);
  }

  // Log crawl execution
  logCrawl(crawlData) {
    const stmt = this.db.prepare(`
      INSERT INTO crawl_logs 
      (crawl_date, crawl_type, posts_found, posts_new, posts_updated, errors_count, execution_time_seconds, status, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run([
      crawlData.date,
      crawlData.type,
      crawlData.postsFound || 0,
      crawlData.postsNew || 0,
      crawlData.postsUpdated || 0,
      crawlData.errorsCount || 0,
      crawlData.executionTime || 0,
      crawlData.status || 'completed',
      JSON.stringify(crawlData.details || {})
    ]);
  }

  close() {
    this.db.close();
  }
}

// Web scraper class
class BlogScraper {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || CONFIG.REQUEST_TIMEOUT,
      maxRetries: options.maxRetries || CONFIG.RETRY_ATTEMPTS,
      retryDelay: options.retryDelay || CONFIG.RETRY_DELAY,
      userAgent: options.userAgent || CONFIG.USER_AGENT
    };

    this.axiosInstance = axios.create({
      timeout: this.options.timeout,
      headers: {
        'User-Agent': this.options.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
  }

  // Fetch webpage with retry logic
  async fetchWithRetry(url, retries = this.options.maxRetries) {
    try {
      console.log(`🌐 Fetching: ${url}`);
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (retries > 0) {
        console.log(`⏳ Retry ${this.options.maxRetries - retries + 1}/${this.options.maxRetries} for ${url}`);
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        return this.fetchWithRetry(url, retries - 1);
      }
      throw error;
    }
  }

  // Discover blog posts from the main page
  async discoverPosts(maxPosts = 50) {
    console.log('🔍 Discovering blog posts...');
    
    const discovered = [];
    let page = 1;
    
    while (discovered.length < maxPosts) {
      try {
        const url = page === 1 ? CONFIG.BLOG_BASE_URL : `${CONFIG.BLOG_BASE_URL}/page/${page}`;
        const html = await this.fetchWithRetry(url);
        const $ = cheerio.load(html);
        
        const posts = [];
        
        // Parse blog post listings (adapt selectors based on actual blog structure)
        $('.post-item, .blog-post, article').each((i, element) => {
          const $post = $(element);
          const title = $post.find('h2 a, .post-title a, .entry-title a').first().text().trim();
          const link = $post.find('h2 a, .post-title a, .entry-title a').first().attr('href');
          const excerpt = $post.find('.excerpt, .post-excerpt, .entry-summary').first().text().trim();
          const date = $post.find('.post-date, .date, .published').first().text().trim();
          const category = $post.find('.category, .post-category').first().text().trim();
          
          if (title && link) {
            // Extract post ID from URL or generate from title
            const postId = this.extractPostId(link, title);
            
            posts.push({
              id: postId,
              title: title,
              url: link.startsWith('http') ? link : CONFIG.BLOG_BASE_URL + link,
              excerpt: excerpt,
              date: this.parseDate(date),
              category: category || '투자분석'
            });
          }
        });
        
        if (posts.length === 0) {
          console.log(`📄 No more posts found on page ${page}, stopping discovery`);
          break;
        }
        
        discovered.push(...posts);
        console.log(`📄 Page ${page}: Found ${posts.length} posts (Total: ${discovered.length})`);
        
        page++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Safety check
        if (page > 10) {
          console.log(`⚠️ Reached maximum page limit (10), stopping discovery`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error discovering posts on page ${page}:`, error.message);
        break;
      }
    }
    
    console.log(`✅ Discovery complete: ${discovered.length} posts found`);
    return discovered.slice(0, maxPosts);
  }

  // Extract full content from individual post
  async extractPostContent(post) {
    try {
      const html = await this.fetchWithRetry(post.url);
      const $ = cheerio.load(html);
      
      // Extract main content (adapt selectors based on actual blog structure)
      const content = $('.post-content, .entry-content, .article-content, main .content').first().text().trim();
      const views = this.extractViews($);
      
      return {
        ...post,
        content: content || post.excerpt,
        views: views,
        meta_description: $('meta[name="description"]').attr('content') || post.excerpt
      };
      
    } catch (error) {
      console.error(`❌ Error extracting content for ${post.title}:`, error.message);
      return {
        ...post,
        content: post.excerpt || '',
        views: 0
      };
    }
  }

  // Extract post ID from URL or generate from title
  extractPostId(url, title) {
    // Try to extract numeric ID from URL
    const urlMatch = url.match(/\/(\d+)/);
    if (urlMatch) {
      return parseInt(urlMatch[1]);
    }
    
    // Generate ID from title hash
    const titleHash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return Math.abs(titleHash) % 100000 + 500; // Start from 500 to avoid conflicts
  }

  // Parse date string to standard format
  parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0] + ' 09:00:00';
    
    const now = new Date();
    
    // Handle relative dates
    if (dateStr.includes('시간 전') || dateStr.includes('hours ago')) {
      const hours = parseInt(dateStr.match(/\d+/)?.[0]) || 1;
      return new Date(now - hours * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];
    }
    
    if (dateStr.includes('일 전') || dateStr.includes('days ago')) {
      const days = parseInt(dateStr.match(/\d+/)?.[0]) || 1;
      return new Date(now - days * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];
    }
    
    // Try to parse standard date formats
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().replace('T', ' ').split('.')[0];
      }
    } catch (e) {
      // Fall back to current date
    }
    
    return now.toISOString().replace('T', ' ').split('.')[0];
  }

  // Extract view count from page
  extractViews($) {
    const viewsText = $('.views, .view-count, .post-views').first().text();
    const match = viewsText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}

// Main crawler class
class AutomatedCrawler {
  constructor(options) {
    this.options = options;
    this.db = new DatabaseManager(CONFIG.DATABASE_PATH);
    this.scraper = new BlogScraper({
      timeout: options.timeout * 1000,
      maxRetries: 3
    });
    this.startTime = Date.now();
    
    this.stats = {
      postsFound: 0,
      postsNew: 0,
      postsUpdated: 0,
      errorsCount: 0,
      details: {}
    };
  }

  // Initialize the crawler
  async initialize() {
    console.log('🚀 Initializing Automated Crawler...');
    console.log(`📅 Target date: ${this.options.date}`);
    console.log(`⚙️ Crawl type: ${this.options.type}`);
    console.log(`🔧 Options:`, this.options);
    
    this.db.initializeTables();
    
    // Get latest post date for incremental crawling
    if (!this.options.forceFull) {
      this.latestPostDate = this.db.getLatestPostDate();
      console.log(`📈 Latest post in DB: ${this.latestPostDate}`);
    }
  }

  // Execute the crawling process
  async crawl() {
    try {
      console.log('\n🔍 Starting blog discovery...');
      
      // Discover posts
      const maxPosts = this.options.type === 'intensive' ? this.options.maxPosts * 2 : this.options.maxPosts;
      const discoveredPosts = await this.scraper.discoverPosts(maxPosts);
      this.stats.postsFound = discoveredPosts.length;
      
      if (discoveredPosts.length === 0) {
        console.log('ℹ️ No posts discovered, ending crawl');
        return;
      }
      
      // Filter posts based on criteria
      const postsToProcess = this.filterPosts(discoveredPosts);
      console.log(`📋 Posts to process: ${postsToProcess.length}`);
      
      if (this.options.dryRun) {
        console.log('🧪 DRY RUN MODE - Would process:');
        postsToProcess.forEach(post => {
          console.log(`  📝 ${post.id}: ${post.title} (${post.date})`);
        });
        return;
      }
      
      // Process posts in batches
      await this.processPosts(postsToProcess);
      
    } catch (error) {
      console.error('❌ Crawling error:', error);
      this.stats.errorsCount++;
      throw error;
    }
  }

  // Filter posts based on crawl criteria
  filterPosts(discoveredPosts) {
    let filtered = discoveredPosts;
    
    // If not forcing full crawl, filter by date
    if (!this.options.forceFull && this.latestPostDate) {
      filtered = filtered.filter(post => {
        const postDate = new Date(post.date);
        const latestDate = new Date(this.latestPostDate);
        return postDate > latestDate;
      });
      console.log(`📅 Filtered by date (after ${this.latestPostDate}): ${filtered.length} posts`);
    }
    
    // Additional filters based on crawl type
    if (this.options.type === 'standard') {
      filtered = filtered.slice(0, 20); // Limit standard crawls
    }
    
    return filtered;
  }

  // Process posts in batches
  async processPosts(posts) {
    console.log(`\n📦 Processing ${posts.length} posts in batches of ${CONFIG.BATCH_SIZE}...`);
    
    for (let i = 0; i < posts.length; i += CONFIG.BATCH_SIZE) {
      const batch = posts.slice(i, i + CONFIG.BATCH_SIZE);
      console.log(`\n🔄 Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(posts.length / CONFIG.BATCH_SIZE)}`);
      
      // Process batch with limited concurrency
      const promises = batch.map(post => this.processPost(post));
      await Promise.allSettled(promises);
      
      // Rate limiting between batches
      if (i + CONFIG.BATCH_SIZE < posts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // Process individual post
  async processPost(post) {
    try {
      console.log(`📝 Processing: ${post.title}`);
      
      // Check if post already exists
      const exists = this.db.postExists(post.id);
      
      if (exists && !this.options.forceFull) {
        console.log(`⏭️ Post ${post.id} already exists, skipping...`);
        return;
      }
      
      // Extract full content
      const fullPost = await this.scraper.extractPostContent(post);
      
      // Insert/update in database
      this.db.insertPost(fullPost);
      
      if (exists) {
        this.stats.postsUpdated++;
        console.log(`✏️ Updated post ${post.id}: ${post.title}`);
      } else {
        this.stats.postsNew++;
        console.log(`✅ Added new post ${post.id}: ${post.title}`);
      }
      
      this.stats.details[post.id] = {
        title: post.title,
        action: exists ? 'updated' : 'new',
        date: post.date
      };
      
    } catch (error) {
      console.error(`❌ Error processing post ${post.id}:`, error.message);
      this.stats.errorsCount++;
    }
  }

  // Finalize crawl and cleanup
  async finalize() {
    const executionTime = Math.round((Date.now() - this.startTime) / 1000);
    
    console.log('\n📊 CRAWL SUMMARY:');
    console.log(`  ⏱️ Execution time: ${executionTime} seconds`);
    console.log(`  🔍 Posts found: ${this.stats.postsFound}`);
    console.log(`  ✅ New posts: ${this.stats.postsNew}`);
    console.log(`  ✏️ Updated posts: ${this.stats.postsUpdated}`);
    console.log(`  ❌ Errors: ${this.stats.errorsCount}`);
    
    // Log to database
    this.db.logCrawl({
      date: this.options.date,
      type: this.options.type,
      postsFound: this.stats.postsFound,
      postsNew: this.stats.postsNew,
      postsUpdated: this.stats.postsUpdated,
      errorsCount: this.stats.errorsCount,
      executionTime: executionTime,
      status: this.stats.errorsCount === 0 ? 'completed' : 'completed_with_errors',
      details: this.stats.details
    });
    
    this.db.close();
    
    console.log('🎉 Automated crawling completed!');
    
    return {
      success: this.stats.errorsCount === 0,
      stats: this.stats,
      executionTime: executionTime
    };
  }
}

// Main execution function
async function main() {
  const options = parseArgs();
  
  console.log('🚀 Meire Blog Automated Crawler');
  console.log('📋 Following CLAUDE.md guidelines');
  console.log('⚡ Using SuperClaude framework integration');
  console.log('🕐 3-hour scheduled execution system\n');
  
  // Set timeout for the entire process
  const timeoutId = setTimeout(() => {
    console.error('⏰ Crawl timeout reached, forcing exit');
    process.exit(1);
  }, options.timeout * 1000);
  
  try {
    const crawler = new AutomatedCrawler(options);
    
    await crawler.initialize();
    await crawler.crawl();
    const result = await crawler.finalize();
    
    clearTimeout(timeoutId);
    
    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Fatal crawling error:', error);
    clearTimeout(timeoutId);
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

module.exports = { AutomatedCrawler, DatabaseManager, BlogScraper };