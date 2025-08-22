#!/usr/bin/env node

/**
 * 🔄 Database Migration Script
 * 
 * Migrates the existing database to support the automated crawling system.
 * Adds missing columns and indexes required for proper operation.
 * 
 * Usage:
 *   node scripts/migrate-database.js
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  DATABASE_PATH: path.join(__dirname, '..', 'database.db')
};

console.log('🔄 Starting database migration...');

try {
  const db = sqlite3(CONFIG.DATABASE_PATH);
  
  console.log('📊 Checking current database schema...');
  
  // Check if stocks table exists and get its schema
  const stocksTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='stocks'").get();
  
  if (!stocksTable) {
    console.log('❌ Stocks table does not exist');
    process.exit(1);
  }
  
  console.log('Current stocks table schema:', stocksTable.sql);
  
  // Check for missing columns
  const columns = db.prepare("PRAGMA table_info(stocks)").all();
  const columnNames = columns.map(col => col.name);
  
  console.log('Current columns:', columnNames);
  
  const requiredColumns = {
    'id': 'INTEGER PRIMARY KEY AUTOINCREMENT',
    'priority_score': 'REAL DEFAULT 0',
    'badge_text': 'TEXT'
  };
  
  // Add missing columns
  let needsRecreate = false;
  const missingColumns = [];
  
  for (const [colName, colDef] of Object.entries(requiredColumns)) {
    if (!columnNames.includes(colName)) {
      missingColumns.push({ name: colName, definition: colDef });
      
      if (colName === 'id') {
        needsRecreate = true; // Need to recreate table for PRIMARY KEY
      }
    }
  }
  
  if (missingColumns.length > 0) {
    console.log('➕ Adding missing columns:', missingColumns.map(c => c.name));
    
    if (needsRecreate) {
      console.log('🔄 Recreating stocks table with proper schema...');
      
      // Backup existing data
      const existingData = db.prepare('SELECT * FROM stocks').all();
      console.log(`📋 Backing up ${existingData.length} existing records`);
      
      // Drop existing table
      db.exec('DROP TABLE IF EXISTS stocks_backup');
      db.exec('ALTER TABLE stocks RENAME TO stocks_backup');
      
      // Create new table with correct schema
      db.exec(`
        CREATE TABLE stocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticker TEXT UNIQUE NOT NULL,
          company_name TEXT,
          market TEXT,
          sector TEXT,
          industry TEXT,
          description TEXT,
          tags TEXT,
          mention_count INTEGER DEFAULT 0,
          first_mentioned_date DATE,
          last_mentioned_date DATE,
          is_merry_mentioned BOOLEAN DEFAULT 0,
          priority_score REAL DEFAULT 0,
          badge_text TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Restore data
      if (existingData.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO stocks (
            ticker, company_name, market, sector, industry, description, tags,
            mention_count, first_mentioned_date, last_mentioned_date, is_merry_mentioned,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const row of existingData) {
          insertStmt.run(
            row.ticker, row.company_name, row.market, row.sector, row.industry,
            row.description, row.tags, row.mention_count || 0,
            row.first_mentioned_date, row.last_mentioned_date, 
            row.is_merry_mentioned || 0, row.created_at, row.updated_at
          );
        }
      }
      
      // Drop backup table
      db.exec('DROP TABLE stocks_backup');
      console.log('✅ Table recreated and data restored');
      
    } else {
      // Add columns normally
      for (const col of missingColumns) {
        try {
          db.exec(`ALTER TABLE stocks ADD COLUMN ${col.name} ${col.definition}`);
          console.log(`✅ Added column: ${col.name}`);
        } catch (error) {
          if (error.message.includes('duplicate column')) {
            console.log(`ℹ️ Column ${col.name} already exists`);
          } else {
            console.error(`❌ Error adding column ${col.name}:`, error.message);
          }
        }
      }
    }
  } else {
    console.log('✅ All required columns already exist');
  }
  
  // Create/update indexes
  console.log('🔍 Creating indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_merry_pick ON stocks(is_merry_mentioned, last_mentioned_date DESC, mention_count)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_last_mentioned ON stocks(last_mentioned_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_priority ON stocks(priority_score DESC, last_mentioned_date DESC)'
  ];
  
  indexes.forEach(indexSql => {
    try {
      db.exec(indexSql);
      console.log('✅ Index created/updated');
    } catch (error) {
      console.log('ℹ️ Index already exists or error:', error.message);
    }
  });
  
  // Ensure other required tables exist
  console.log('📋 Ensuring other required tables exist...');
  
  db.exec(`
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
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS merry_picks_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_key TEXT UNIQUE NOT NULL,
      cache_data TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Verify final schema
  console.log('🔍 Verifying final schema...');
  const finalColumns = db.prepare("PRAGMA table_info(stocks)").all();
  console.log('Final columns:', finalColumns.map(c => c.name));
  
  const stockCount = db.prepare('SELECT COUNT(*) as count FROM stocks').get().count;
  console.log(`📊 Total stocks in database: ${stockCount}`);
  
  db.close();
  
  console.log('✅ Database migration completed successfully!');
  
} catch (error) {
  console.error('💥 Database migration failed:', error);
  process.exit(1);
}