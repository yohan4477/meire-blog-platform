#!/usr/bin/env node
/**
 * 로컬에서 크롤링된 데이터를 EC2로 증분 업데이트하는 스크립트
 */

const mysql = require('mysql2/promise');
const axios = require('axios');

// 설정
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root', 
  password: '',
  database: 'meire_blog',
  charset: 'utf8mb4'
};

const EC2_ENDPOINT = process.env.EC2_ENDPOINT || 'http://your-ec2-domain.com';
const BATCH_SIZE = 50; // 한 번에 전송할 포스트 수

class EC2Syncer {
  constructor() {
    this.mysqlConnection = null;
    this.stats = {
      totalProcessed: 0,
      newPosts: 0,
      updatedPosts: 0,
      errors: 0
    };
  }

  async connectMySQL() {
    try {
      console.log('MySQL 연결 중...');
      this.mysqlConnection = await mysql.createConnection(MYSQL_CONFIG);
      console.log('✅ MySQL 연결 성공');
      return true;
    } catch (error) {
      console.error('❌ MySQL 연결 실패:', error.message);
      return false;
    }
  }

  async getRecentPosts(hours = 24) {
    try {
      const [rows] = await this.mysqlConnection.execute(`
        SELECT 
          log_no, title, content, category, created_date, crawled_at, updated_at
        FROM blog_posts 
        WHERE crawled_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        ORDER BY created_date DESC
      `, [hours]);
      
      console.log(`📊 최근 ${hours}시간 내 포스트: ${rows.length}개`);
      return rows;
    } catch (error) {
      console.error('데이터 조회 오류:', error.message);
      return [];
    }
  }

  generateExcerpt(content) {
    if (!content) return '';
    const cleanContent = content.replace(/<[^>]*>/g, '');
    const excerpt = cleanContent.substring(0, 200).trim();
    
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

  async syncBatch(posts, batchId) {
    try {
      // 포스트 데이터 준비
      const processedPosts = posts.map(post => ({
        log_no: post.log_no,
        title: post.title,
        content: post.content,
        excerpt: this.generateExcerpt(post.content),
        category: post.category,
        created_date: post.created_date
      }));

      console.log(`🚀 배치 ${batchId} 전송 중... (${posts.length}개)`);

      const response = await axios.post(`${EC2_ENDPOINT}/api/merry/sync`, {
        posts: processedPosts,
        batchId
      }, {
        timeout: 30000, // 30초 타임아웃
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Meire-Local-Sync/1.0'
        }
      });

      if (response.data.success) {
        const data = response.data.data;
        console.log(`✅ 배치 ${batchId} 완료: 새글 ${data.newPosts}, 업데이트 ${data.updatedPosts}, 오류 ${data.errors}`);
        
        this.stats.totalProcessed += data.processed;
        this.stats.newPosts += data.newPosts;
        this.stats.updatedPosts += data.updatedPosts;
        this.stats.errors += data.errors;
        
        return true;
      } else {
        console.error(`❌ 배치 ${batchId} 실패:`, response.data.error?.message);
        return false;
      }
    } catch (error) {
      console.error(`❌ 배치 ${batchId} 전송 오류:`, error.message);
      return false;
    }
  }

  async sync(hours = 24) {
    try {
      console.log('=== EC2 데이터 동기화 시작 ===\n');

      // MySQL 연결
      const connected = await this.connectMySQL();
      if (!connected) return false;

      // 최근 데이터 조회
      const posts = await this.getRecentPosts(hours);
      if (posts.length === 0) {
        console.log('🎉 동기화할 새 데이터가 없습니다.');
        return true;
      }

      // 배치 단위로 처리
      const batches = [];
      for (let i = 0; i < posts.length; i += BATCH_SIZE) {
        batches.push(posts.slice(i, i + BATCH_SIZE));
      }

      console.log(`📦 총 ${batches.length}개 배치로 처리\n`);

      // 각 배치 전송
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchId = `${Date.now()}-${i + 1}`;
        
        await this.syncBatch(batch, batchId);
        
        // 배치 간 간격 (서버 부하 방지)
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.printStats();
      console.log('\n✅ 동기화 완료!');
      return true;

    } catch (error) {
      console.error('동기화 오류:', error);
      return false;
    } finally {
      if (this.mysqlConnection) {
        await this.mysqlConnection.end();
        console.log('MySQL 연결 종료');
      }
    }
  }

  printStats() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 동기화 완료 통계');
    console.log('='.repeat(50));
    console.log(`총 처리: ${this.stats.totalProcessed}개`);
    console.log(`새 포스트: ${this.stats.newPosts}개`);
    console.log(`업데이트: ${this.stats.updatedPosts}개`);
    console.log(`오류: ${this.stats.errors}개`);
    console.log('='.repeat(50));
  }
}

// 메인 실행
async function main() {
  const args = process.argv.slice(2);
  const hours = parseInt(args[0]) || 24;
  
  console.log(`최근 ${hours}시간 내 데이터를 동기화합니다...\n`);
  
  const syncer = new EC2Syncer();
  const success = await syncer.sync(hours);
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EC2Syncer;