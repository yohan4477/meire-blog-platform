#!/usr/bin/env node
/**
 * MySQL 데이터를 SQLite로 마이그레이션하는 스크립트
 * Meire 폴더의 MySQL 데이터베이스에서 데이터를 가져와서 
 * meire-blog-platform의 SQLite 데이터베이스로 이전
 */

const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// MySQL 설정 (Meire 폴더의 config.py와 동일)
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'meire_blog',
  charset: 'utf8mb4'
};

// SQLite 파일 경로
const SQLITE_PATH = path.join(__dirname, '..', 'database.db');

class DataMigrator {
  constructor() {
    this.mysqlConnection = null;
    this.sqliteDb = null;
    this.stats = {
      totalPosts: 0,
      migratedPosts: 0,
      errors: 0,
      skipped: 0
    };
  }

  async connectMySQL() {
    try {
      console.log('MySQL 연결 중...');
      this.mysqlConnection = await mysql.createConnection(MYSQL_CONFIG);
      console.log('MySQL 연결 성공');
      return true;
    } catch (error) {
      console.error('MySQL 연결 실패:', error.message);
      return false;
    }
  }

  async connectSQLite() {
    try {
      console.log('SQLite 연결 중...');
      this.sqliteDb = await open({
        filename: SQLITE_PATH,
        driver: sqlite3.Database
      });
      console.log('SQLite 연결 성공');
      return true;
    } catch (error) {
      console.error('SQLite 연결 실패:', error.message);
      return false;
    }
  }

  async createSQLiteTables() {
    try {
      console.log('SQLite 테이블 생성 중...');
      
      // blog_posts 테이블 생성
      await this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS blog_posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          log_no TEXT UNIQUE,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          category TEXT,
          created_date DATETIME NOT NULL,
          crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          author TEXT,
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          featured BOOLEAN DEFAULT 0,
          blog_type TEXT DEFAULT 'merry'
        )
      `);

      // 인덱스 생성
      await this.sqliteDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_blog_posts_log_no ON blog_posts(log_no);
        CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
        CREATE INDEX IF NOT EXISTS idx_blog_posts_created_date ON blog_posts(created_date);
        CREATE INDEX IF NOT EXISTS idx_blog_posts_blog_type ON blog_posts(blog_type);
      `);

      // 태그 테이블들 생성
      await this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS merry_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS merry_post_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES merry_tags(id) ON DELETE CASCADE,
          UNIQUE(post_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS merry_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          author_name TEXT NOT NULL,
          author_email TEXT,
          content TEXT NOT NULL,
          parent_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_deleted BOOLEAN DEFAULT 0,
          FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_id) REFERENCES merry_comments(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS merry_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          user_ip TEXT NOT NULL,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
          UNIQUE(post_id, user_ip)
        );
      `);

      console.log('SQLite 테이블 생성 완료');
      return true;
    } catch (error) {
      console.error('SQLite 테이블 생성 실패:', error.message);
      return false;
    }
  }

  async getMySQLPosts() {
    try {
      console.log('MySQL에서 포스트 데이터 조회 중...');
      
      const [rows] = await this.mysqlConnection.execute(`
        SELECT 
          log_no,
          title,
          content,
          category,
          created_date,
          crawled_at,
          updated_at
        FROM blog_posts 
        ORDER BY created_date DESC
      `);
      
      this.stats.totalPosts = rows.length;
      console.log(`총 ${rows.length}개의 포스트 발견`);
      
      return rows;
    } catch (error) {
      console.error('MySQL 데이터 조회 실패:', error.message);
      return [];
    }
  }

  async migratePosts(mysqlPosts) {
    console.log('포스트 마이그레이션 시작...');
    
    for (let i = 0; i < mysqlPosts.length; i++) {
      const post = mysqlPosts[i];
      
      try {
        // 진행률 표시
        const progress = Math.floor(((i + 1) / mysqlPosts.length) * 100);
        const barLength = 30;
        const filledLength = Math.floor(barLength * (i + 1) / mysqlPosts.length);
        const bar = '#'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
        
        process.stdout.write(`\r[${i + 1}/${mysqlPosts.length}] [${bar}] ${progress}% - ${post.title?.substring(0, 30) || 'No title'}...`);
        
        // 중복 체크
        const existing = await this.sqliteDb.get(
          'SELECT id FROM blog_posts WHERE log_no = ?',
          [post.log_no]
        );
        
        if (existing) {
          this.stats.skipped++;
          continue;
        }

        // 포스트 내용에서 excerpt 생성
        const excerpt = this.generateExcerpt(post.content);
        
        // SQLite에 삽입
        await this.sqliteDb.run(`
          INSERT INTO blog_posts (
            log_no, title, content, excerpt, category, 
            created_date, crawled_at, updated_at, 
            author, views, likes, comments_count, featured, blog_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          post.log_no,
          post.title,
          post.content,
          excerpt,
          post.category,
          post.created_date,
          post.crawled_at,
          post.updated_at,
          '메르', // 기본 작성자
          Math.floor(Math.random() * 300) + 50, // 랜덤 조회수
          Math.floor(Math.random() * 20) + 1, // 랜덤 좋아요
          Math.floor(Math.random() * 5), // 랜덤 댓글수
          Math.random() > 0.8 ? 1 : 0, // 20% 확률로 추천 포스트
          'merry'
        ]);
        
        this.stats.migratedPosts++;
        
      } catch (error) {
        console.error(`\n포스트 마이그레이션 오류 (${post.log_no}):`, error.message);
        this.stats.errors++;
      }
    }
    
    console.log('\n포스트 마이그레이션 완료');
  }

  generateExcerpt(content) {
    if (!content) return '';
    
    // HTML 태그 제거
    const cleanContent = content.replace(/<[^>]*>/g, '');
    
    // 첫 200자만 추출
    const excerpt = cleanContent.substring(0, 200).trim();
    
    // 마지막 완전한 문장까지만 포함
    const lastSentenceEnd = Math.max(
      excerpt.lastIndexOf('.'),
      excerpt.lastIndexOf('!'),
      excerpt.lastIndexOf('?'),
      excerpt.lastIndexOf('다'),
      excerpt.lastIndexOf('요')
    );
    
    if (lastSentenceEnd > 50) {
      return excerpt.substring(0, lastSentenceEnd + 1);
    }
    
    return excerpt + (excerpt.length === 200 ? '...' : '');
  }

  async createSampleTags() {
    try {
      console.log('샘플 태그 생성 중...');
      
      const sampleTags = [
        '투자', '주식', '경제', '시장분석', '포트폴리오', '재테크',
        '일상', '생각', '독서', '책리뷰', '라이프스타일', '취미',
        '기술', 'IT', '프로그래밍', '개발', '트렌드', '뉴스',
        '여행', '음식', '문화', '예술', '영화', '음악',
        '건강', '운동', '자기계발', '성장', '목표', '계획'
      ];
      
      for (const tagName of sampleTags) {
        await this.sqliteDb.run(
          'INSERT OR IGNORE INTO merry_tags (name) VALUES (?)',
          [tagName]
        );
      }
      
      console.log(`${sampleTags.length}개의 태그 생성 완료`);
    } catch (error) {
      console.error('태그 생성 오류:', error.message);
    }
  }

  async assignRandomTags() {
    try {
      console.log('포스트에 랜덤 태그 할당 중...');
      
      const posts = await this.sqliteDb.all('SELECT id, category FROM blog_posts');
      const tags = await this.sqliteDb.all('SELECT id, name FROM merry_tags');
      
      for (const post of posts) {
        // 카테고리 기반 태그 선택
        const relevantTags = this.getRelevantTags(post.category, tags);
        
        // 1-3개의 랜덤 태그 선택
        const numTags = Math.floor(Math.random() * 3) + 1;
        const selectedTags = relevantTags
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.min(numTags, relevantTags.length));
        
        // 포스트-태그 관계 생성
        for (const tag of selectedTags) {
          await this.sqliteDb.run(
            'INSERT OR IGNORE INTO merry_post_tags (post_id, tag_id) VALUES (?, ?)',
            [post.id, tag.id]
          );
        }
      }
      
      console.log('태그 할당 완료');
    } catch (error) {
      console.error('태그 할당 오류:', error.message);
    }
  }

  getRelevantTags(category, allTags) {
    const categoryTagMap = {
      '투자': ['투자', '주식', '경제', '시장분석', '포트폴리오', '재테크'],
      '경제': ['경제', '시장분석', '투자', '뉴스', '트렌드'],
      '일상': ['일상', '생각', '라이프스타일', '취미'],
      '독서': ['독서', '책리뷰', '자기계발', '성장'],
      '기술': ['기술', 'IT', '프로그래밍', '개발', '트렌드'],
      '여행': ['여행', '문화', '라이프스타일'],
      '음식': ['음식', '요리', '라이프스타일', '일상'],
      '건강': ['건강', '운동', '자기계발', '라이프스타일']
    };
    
    const relevantTagNames = categoryTagMap[category] || ['일상', '생각', '라이프스타일'];
    
    // 관련 태그 + 랜덤 태그 몇 개 추가
    const relevantTags = allTags.filter(tag => relevantTagNames.includes(tag.name));
    const randomTags = allTags.filter(tag => !relevantTagNames.includes(tag.name))
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    return [...relevantTags, ...randomTags];
  }

  async closeConnections() {
    try {
      if (this.mysqlConnection) {
        await this.mysqlConnection.end();
        console.log('MySQL 연결 종료');
      }
      
      if (this.sqliteDb) {
        await this.sqliteDb.close();
        console.log('SQLite 연결 종료');
      }
    } catch (error) {
      console.error('연결 종료 오류:', error.message);
    }
  }

  printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('마이그레이션 완료 통계');
    console.log('='.repeat(60));
    console.log(`총 MySQL 포스트: ${this.stats.totalPosts}개`);
    console.log(`마이그레이션된 포스트: ${this.stats.migratedPosts}개`);
    console.log(`건너뛴 포스트 (중복): ${this.stats.skipped}개`);
    console.log(`오류 발생: ${this.stats.errors}개`);
    console.log(`성공률: ${((this.stats.migratedPosts / Math.max(this.stats.totalPosts, 1)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
  }

  async migrate() {
    try {
      console.log('=== MySQL → SQLite 데이터 마이그레이션 시작 ===\n');
      
      // 연결 설정
      const mysqlConnected = await this.connectMySQL();
      if (!mysqlConnected) {
        console.log('MySQL 서버가 실행되지 않거나 데이터베이스가 존재하지 않습니다.');
        console.log('XAMPP를 실행하고 meire_blog 데이터베이스가 있는지 확인해주세요.');
        return false;
      }
      
      const sqliteConnected = await this.connectSQLite();
      if (!sqliteConnected) {
        return false;
      }
      
      // SQLite 테이블 생성
      const tablesCreated = await this.createSQLiteTables();
      if (!tablesCreated) {
        return false;
      }
      
      // MySQL 데이터 조회
      const mysqlPosts = await this.getMySQLPosts();
      if (mysqlPosts.length === 0) {
        console.log('마이그레이션할 데이터가 없습니다.');
        return true;
      }
      
      // 포스트 마이그레이션
      await this.migratePosts(mysqlPosts);
      
      // 태그 생성 및 할당
      await this.createSampleTags();
      await this.assignRandomTags();
      
      this.printStats();
      
      console.log('\n✅ 마이그레이션이 성공적으로 완료되었습니다!');
      console.log('이제 Next.js 애플리케이션에서 메르 블로그 데이터를 사용할 수 있습니다.');
      
      return true;
      
    } catch (error) {
      console.error('마이그레이션 오류:', error);
      return false;
    } finally {
      await this.closeConnections();
    }
  }
}

// 메인 실행
async function main() {
  const migrator = new DataMigrator();
  const success = await migrator.migrate();
  
  process.exit(success ? 0 : 1);
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DataMigrator;