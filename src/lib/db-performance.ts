import sqlite3 from 'sqlite3';
import path from 'path';

// Enhanced database performance utilities
export interface DatabaseConfig {
  maxConnections: number;
  queryTimeout: number;
  enableWAL: boolean;
  enableCache: boolean;
  pragmaSettings: Record<string, string>;
}

export class PerformantDatabase {
  private db: sqlite3.Database | null = null;
  private connectionPromise: Promise<sqlite3.Database> | null = null;
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private config: DatabaseConfig = {
    maxConnections: 10,
    queryTimeout: 2000, // 2 seconds (reduced from 5s)
    enableWAL: true,
    enableCache: true,
    pragmaSettings: {
      'journal_mode': 'WAL',
      'synchronous': 'NORMAL', 
      'cache_size': '20000', // Increased from 10K to 20K
      'temp_store': 'MEMORY',
      'mmap_size': '536870912', // 512MB (doubled from 256MB)
      'page_size': '32768', // 32KB pages
      'wal_autocheckpoint': '1000',
      'busy_timeout': '30000', // 30s for high concurrency
      // 'optimize' // Removed due to syntax error
      'foreign_keys': 'ON',
      'threads': '4' // Multi-threading support
    }
  };

  async getConnection(): Promise<sqlite3.Database> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const dbPath = path.join(process.cwd(), 'database.db');
      
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, async (err) => {
        if (err) {
          console.error('💥 Database connection failed:', err);
          reject(err);
          return;
        }

        console.log('🚀 SQLite3 고성능 모드 활성화 시작');
        
        // Apply performance optimizations
        try {
          await this.applyPragmaSettings(db);
          await this.createIndexes(db);
          console.log('✅ SQLite3 고성능 모드 활성화 완료');
          resolve(db);
        } catch (error) {
          console.error('💥 Performance optimization failed:', error);
          reject(error);
        }
      });
    });

    return this.connectionPromise;
  }

  private async applyPragmaSettings(db: sqlite3.Database): Promise<void> {
    return new Promise((resolve, reject) => {
      const pragmaQueries = Object.entries(this.config.pragmaSettings).map(
        ([key, value]) => `PRAGMA ${key} = ${value};`
      );

      let completed = 0;
      const total = pragmaQueries.length;

      for (const pragmaQuery of pragmaQueries) {
        db.run(pragmaQuery, (err) => {
          if (err) {
            console.warn(`⚠️ PRAGMA ${pragmaQuery} warning:`, err.message);
            // Continue with other PRAGMA settings even if one fails
          }
          
          completed++;
          if (completed === total) {
            console.log('⚡ PRAGMA settings applied (with possible warnings)');
            resolve();
          }
        });
      }
    });
  }

  private async createIndexes(db: sqlite3.Database): Promise<void> {
    const indexes = [
      // Performance critical indexes - MOST CRITICAL FIRST
      'CREATE INDEX IF NOT EXISTS idx_merry_mentioned_stocks_last_mentioned ON merry_mentioned_stocks(last_mentioned_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_blog_posts_created_date ON blog_posts(created_date DESC);',
      'CREATE INDEX IF NOT EXISTS idx_merry_mentioned_stocks_ticker ON merry_mentioned_stocks(ticker);',
      
      // Query-specific composite indexes (CRITICAL FOR PERFORMANCE)
      'CREATE INDEX IF NOT EXISTS idx_blog_posts_content_ticker ON blog_posts(content) WHERE content LIKE "%ticker%";',
      'CREATE INDEX IF NOT EXISTS idx_blog_posts_title_ticker ON blog_posts(title) WHERE title LIKE "%ticker%";',
      'CREATE INDEX IF NOT EXISTS idx_blog_posts_date_type ON blog_posts(created_date DESC, blog_type);',
      'CREATE INDEX IF NOT EXISTS idx_sentiments_ticker_analyzed ON post_stock_sentiments(ticker, analyzed_at DESC);',
      
      // Supporting indexes
      'CREATE INDEX IF NOT EXISTS idx_post_stock_sentiments_post_id ON post_stock_sentiments(post_id);',
      'CREATE INDEX IF NOT EXISTS idx_merry_stocks_mention_count ON merry_mentioned_stocks(mention_count DESC);',
      
      // FTS index for content search (if needed)
      'CREATE VIRTUAL TABLE IF NOT EXISTS blog_posts_fts USING fts5(title, content, content=blog_posts, content_rowid=id);'
    ];

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = indexes.length;

      for (const indexQuery of indexes) {
        db.run(indexQuery, (err) => {
          if (err) {
            console.warn(`⚠️ Index creation warning: ${err.message}`);
          }
          
          completed++;
          if (completed === total) {
            console.log('📊 Database indexes optimized');
            resolve();
          }
        });
      }
    });
  }

  async query<T = any>(
    sql: string, 
    params: any[] = [], 
    cacheKey?: string, 
    cacheTtl: number = 30000
  ): Promise<T[]> {
    // Check cache first
    if (cacheKey && this.config.enableCache) {
      const cached = this.getFromCache<T[]>(cacheKey);
      if (cached) {
        console.log(`🎯 Cache hit for: ${cacheKey}`);
        return cached;
      }
    }

    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Set query timeout
      const timeout = setTimeout(() => {
        reject(new Error(`Query timeout after ${this.config.queryTimeout}ms: ${sql}`));
      }, this.config.queryTimeout);

      db.all(sql, params, (err, rows) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        
        if (err) {
          console.error(`💥 Query failed (${duration}ms):`, err);
          reject(err);
          return;
        }

        console.log(`⚡ Query executed in ${duration}ms: ${sql.substring(0, 50)}...`);
        
        const result = rows as T[];
        
        // Cache the result
        if (cacheKey && this.config.enableCache) {
          this.setCache(cacheKey, result, cacheTtl);
        }
        
        resolve(result);
      });
    });
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clearCache(): void {
    this.queryCache.clear();
    console.log('🗑️ Query cache cleared');
  }

  getCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.queryCache.entries());
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, item]) => now - item.timestamp < item.ttl).length,
      expiredEntries: entries.filter(([_, item]) => now - item.timestamp >= item.ttl).length,
      memoryUsage: JSON.stringify(Object.fromEntries(this.queryCache)).length
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve) => {
        this.db!.close((err) => {
          if (err) {
            console.error('Database close error:', err);
          }
          console.log('🔌 Database connection closed');
          this.db = null;
          this.connectionPromise = null;
          resolve();
        });
      });
    }
  }
}

// Singleton instance
export const performantDb = new PerformantDatabase();

// Helper functions for common queries
export async function getStockMentions(limit: number = 10): Promise<any[]> {
  const cacheKey = `stock-mentions-${limit}`;
  
  // OPTIMIZED QUERY - Join with stocks table for real company info
  const query = `
    SELECT 
      m.ticker, 
      MAX(m.mentioned_date) as last_mentioned_at,
      COUNT(*) as mention_count,
      COALESCE(s.company_name_kr, s.company_name, m.ticker) as company_name,
      COALESCE(s.market, 
        CASE 
          WHEN LENGTH(m.ticker) = 6 AND m.ticker GLOB '[0-9]*' THEN 'KOSPI'
          ELSE 'NASDAQ'
        END
      ) as market,
      CASE 
        WHEN m.ticker = 'TSLA' THEN '일론 머스크가 이끄는 전기차와 자율주행 기술의 글로벌 선도기업'
        WHEN m.ticker = 'INTC' THEN '세계 최대의 반도체 칩 제조업체, CPU 및 데이터센터 솔루션 전문'
        WHEN m.ticker = 'LLY' THEN '미국의 글로벌 제약회사, 당뇨병 치료제 및 비만 치료제 선도기업'
        WHEN m.ticker = 'UNH' THEN '미국 최대 건강보험 회사, 헬스케어 서비스 및 보험 솔루션 제공'
        WHEN m.ticker = '005930' THEN '세계 최대 메모리 반도체 및 스마트폰 제조업체'
        WHEN m.ticker = '042660' THEN '대한민국의 대표적인 조선 및 해양플랜트 전문기업'
        WHEN m.ticker = '267250' THEN '국내 대표 이차전지 소재 전문기업, 배터리 양극재 선도기업'
        WHEN m.ticker = '010620' THEN '국내 중형 조선업체, 특수선박 및 해양구조물 전문'
        ELSE COALESCE(s.company_name_kr, s.company_name, m.ticker) || ' 관련 기업'
      END as description
    FROM merry_mentioned_stocks m
    LEFT JOIN stocks s ON m.ticker = s.ticker
    GROUP BY m.ticker
    HAVING COUNT(*) > 0 
    ORDER BY MAX(m.mentioned_date) DESC 
    LIMIT ?
  `;
  
  return performantDb.query(query, [limit], cacheKey, 300000); // 5min cache (extended)
}

export async function getRecentPosts(daysBack: number = 90): Promise<any[]> {
  const cacheKey = `recent-posts-${daysBack}`;
  const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  
  // OPTIMIZED QUERY - Uses covering index and limits data transfer
  const query = `
    SELECT 
      id, 
      title, 
      SUBSTR(content, 1, 500) as content_preview,
      excerpt, 
      created_date,
      blog_type
    FROM blog_posts 
    WHERE created_date >= ? 
    ORDER BY created_date DESC
    LIMIT 100
  `;
  
  return performantDb.query(query, [cutoffDate], cacheKey, 300000); // 5min cache
}

export async function getStockSentiments(ticker: string): Promise<any[]> {
  const cacheKey = `sentiments-${ticker}`;
  
  const query = `
    SELECT * FROM post_stock_sentiments 
    WHERE ticker = ? 
    ORDER BY analyzed_at DESC
  `;
  
  return performantDb.query(query, [ticker], cacheKey, 300000); // 5min cache
}