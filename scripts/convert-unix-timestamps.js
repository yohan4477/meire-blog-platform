#!/usr/bin/env node

/**
 * Unix 타임스탬프를 문자열 형식으로 변환하는 스크립트
 * 
 * 용도: blog_posts 테이블의 created_date 컬럼에서 
 *       Unix 타임스탬프(숫자)를 문자열 형식(YYYY-MM-DD HH:mm:ss)으로 변환
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class TimestampConverter {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'database.db');
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('📊 데이터베이스 연결 성공');
          resolve();
        }
      });
    });
  }

  async getUnixTimestampRecords() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT id, created_date, title 
        FROM blog_posts 
        WHERE created_date NOT LIKE '%-%'
        ORDER BY id
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  convertUnixToDateString(unixTimestamp) {
    try {
      const timestamp = parseInt(unixTimestamp);
      const date = new Date(timestamp);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime()) || date.getFullYear() < 2020 || date.getFullYear() > 2030) {
        console.warn(`⚠️ 잘못된 타임스탬프: ${unixTimestamp}`);
        return null;
      }
      
      // YYYY-MM-DD HH:mm:ss 형식으로 변환
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error(`❌ 변환 실패: ${unixTimestamp}`, error);
      return null;
    }
  }

  async updateRecord(id, newDateString) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE blog_posts 
        SET created_date = ? 
        WHERE id = ?
      `, [newDateString, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async convertAllTimestamps() {
    try {
      console.log('🔍 Unix 타임스탬프 레코드 조회 중...');
      const records = await this.getUnixTimestampRecords();
      
      console.log(`📊 총 ${records.length}개의 Unix 타임스탬프 레코드 발견`);
      
      if (records.length === 0) {
        console.log('✅ 변환할 Unix 타임스탬프가 없습니다.');
        return;
      }

      // 백업 확인
      console.log('\n⚠️  중요: 변환 전에 데이터베이스를 백업하는 것을 권장합니다.');
      console.log('💾 백업 명령어: copy database.db database_backup.db\n');

      let converted = 0;
      let failed = 0;

      // 트랜잭션 시작
      await new Promise((resolve, reject) => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      try {
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const progress = `[${i + 1}/${records.length}]`;
          
          const convertedDate = this.convertUnixToDateString(record.created_date);
          
          if (convertedDate) {
            await this.updateRecord(record.id, convertedDate);
            console.log(`${progress} ✅ ID ${record.id}: ${record.created_date} → ${convertedDate}`);
            converted++;
          } else {
            console.log(`${progress} ❌ ID ${record.id}: 변환 실패 - ${record.created_date}`);
            failed++;
          }
        }

        // 트랜잭션 커밋
        await new Promise((resolve, reject) => {
          this.db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        console.log('\n📊 변환 완료 결과:');
        console.log(`✅ 성공: ${converted}개`);
        console.log(`❌ 실패: ${failed}개`);
        console.log(`📈 성공률: ${((converted / records.length) * 100).toFixed(1)}%`);

      } catch (error) {
        // 트랜잭션 롤백
        await new Promise((resolve) => {
          this.db.run('ROLLBACK', () => resolve());
        });
        throw error;
      }

    } catch (error) {
      console.error('❌ 변환 중 오류 발생:', error);
      throw error;
    }
  }

  async verifyConversion() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN created_date LIKE '%-%' THEN 1 END) as string_format,
          COUNT(CASE WHEN created_date NOT LIKE '%-%' THEN 1 END) as unix_format
        FROM blog_posts
      `, (err, row) => {
        if (err) {
          reject(err);
        } else {
          console.log('\n📊 변환 후 검증:');
          console.log(`📝 전체 레코드: ${row.total}개`);
          console.log(`✅ 문자열 형식: ${row.string_format}개`);
          console.log(`⏰ Unix 형식: ${row.unix_format}개`);
          
          if (row.unix_format === 0) {
            console.log('🎉 모든 타임스탬프가 문자열 형식으로 변환되었습니다!');
          } else {
            console.log(`⚠️ ${row.unix_format}개의 Unix 타임스탬프가 남아있습니다.`);
          }
          
          resolve(row);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ 데이터베이스 연결 종료 실패:', err);
          } else {
            console.log('📪 데이터베이스 연결 종료');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// 메인 실행 함수
async function main() {
  const converter = new TimestampConverter();
  
  try {
    await converter.connect();
    await converter.convertAllTimestamps();
    await converter.verifyConversion();
  } catch (error) {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  } finally {
    await converter.close();
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  console.log('🚀 Unix 타임스탬프 → 문자열 형식 변환 스크립트 시작\n');
  main();
}

module.exports = TimestampConverter;