import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { ApiResponse } from '@/types';

/**
 * MySQL 데이터를 SQLite로 마이그레이션하는 API 엔드포인트
 */
export async function POST(request: NextRequest) {
  try {
    console.log('MySQL 데이터 마이그레이션 시작...');

    const scriptPath = join(process.cwd(), 'scripts', 'migrate-mysql-data.js');
    
    // 마이그레이션 스크립트 실행
    const migrationResult = await runMigrationScript(scriptPath);

    if (migrationResult.success) {
      const response: ApiResponse = {
        success: true,
        data: {
          migratedPosts: migrationResult.migratedPosts,
          totalPosts: migrationResult.totalPosts,
          errors: migrationResult.errors,
          skipped: migrationResult.skipped
        },
        message: `MySQL 데이터 마이그레이션 완료 - ${migrationResult.migratedPosts}개 포스트 이전`
      };

      return NextResponse.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MIGRATION_FAILED',
          message: migrationResult.error || 'MySQL 데이터 마이그레이션 실패',
          details: migrationResult.details || '',
          timestamp: new Date().toISOString()
        }
      };

      return NextResponse.json(response, { status: 500 });
    }

  } catch (error) {
    console.error('MySQL 마이그레이션 API 오류:', error);
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MIGRATION_API_ERROR',
        message: error instanceof Error ? error.message : 'MySQL 마이그레이션 중 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      // 마이그레이션 상태 확인
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      try {
        const db = await open({
          filename: join(process.cwd(), 'database.db'),
          driver: sqlite3.Database
        });

        // blog_posts 테이블 존재 여부 확인
        const tableExists = await db.get(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='blog_posts'
        `);

        if (!tableExists) {
          await db.close();
          return NextResponse.json({
            success: true,
            data: {
              status: 'not_migrated',
              message: 'blog_posts 테이블이 존재하지 않습니다. 마이그레이션이 필요합니다.',
              totalPosts: 0,
              merryPosts: 0
            }
          });
        }

        // 포스트 수 확인
        const totalPosts = await db.get('SELECT COUNT(*) as count FROM blog_posts');
        const merryPosts = await db.get(`SELECT COUNT(*) as count FROM blog_posts WHERE blog_type = 'merry'`);

        await db.close();

        return NextResponse.json({
          success: true,
          data: {
            status: totalPosts.count > 0 ? 'migrated' : 'empty',
            message: `데이터베이스에 ${totalPosts.count}개의 포스트가 있습니다 (메르 블로그: ${merryPosts.count}개)`,
            totalPosts: totalPosts.count,
            merryPosts: merryPosts.count
          }
        });

      } catch (dbError) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'error',
            message: 'SQLite 데이터베이스에 접근할 수 없습니다.',
            error: dbError instanceof Error ? dbError.message : 'Database error'
          }
        });
      }
    }

    if (action === 'mysql-check') {
      // MySQL 연결 상태 확인
      const mysql = require('mysql2/promise');
      
      try {
        const connection = await mysql.createConnection({
          host: 'localhost',
          user: 'root',
          password: '',
          database: 'meire_blog',
          charset: 'utf8mb4'
        });

        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM blog_posts');
        await connection.end();

        return NextResponse.json({
          success: true,
          data: {
            mysql_status: 'connected',
            mysql_posts: rows[0].count,
            message: `MySQL에 ${rows[0].count}개의 포스트가 있습니다`
          }
        });

      } catch (mysqlError) {
        return NextResponse.json({
          success: true,
          data: {
            mysql_status: 'disconnected',
            mysql_posts: 0,
            message: 'MySQL에 연결할 수 없습니다. XAMPP가 실행 중인지 확인하세요.',
            error: mysqlError instanceof Error ? mysqlError.message : 'MySQL connection error'
          }
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_ACTION',
        message: '지원하지 않는 작업입니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 400 });

  } catch (error) {
    console.error('MySQL 마이그레이션 GET 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'MIGRATION_STATUS_ERROR',
        message: error instanceof Error ? error.message : '마이그레이션 상태 확인 중 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

/**
 * 마이그레이션 스크립트를 실행하고 결과를 반환
 */
function runMigrationScript(scriptPath: string): Promise<{
  success: boolean;
  migratedPosts?: number;
  totalPosts?: number;
  errors?: number;
  skipped?: number;
  error?: string;
  details?: string;
}> {
  return new Promise((resolve) => {
    const child = spawn('node', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      console.log('마이그레이션 스크립트 종료, 코드:', code);
      console.log('STDOUT:', stdout);
      if (stderr) console.log('STDERR:', stderr);

      if (code === 0) {
        // 성공 - stdout에서 통계 정보 추출
        const stats = extractStatsFromOutput(stdout);
        resolve({
          success: true,
          ...stats
        });
      } else {
        resolve({
          success: false,
          error: '마이그레이션 스크립트 실행 실패',
          details: stderr || stdout
        });
      }
    });

    child.on('error', (error) => {
      console.error('마이그레이션 스크립트 실행 오류:', error);
      resolve({
        success: false,
        error: error.message,
        details: '스크립트를 실행할 수 없습니다'
      });
    });

    // 30초 타임아웃
    setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        error: '마이그레이션 타임아웃',
        details: '30초 이내에 완료되지 않았습니다'
      });
    }, 30000);
  });
}

/**
 * 마이그레이션 출력에서 통계 정보 추출
 */
function extractStatsFromOutput(output: string): {
  migratedPosts?: number;
  totalPosts?: number;
  errors?: number;
  skipped?: number;
} {
  const stats: any = {};
  
  // 정규식으로 통계 정보 추출
  const totalMatch = output.match(/총 MySQL 포스트: (\d+)개/);
  const migratedMatch = output.match(/마이그레이션된 포스트: (\d+)개/);
  const skippedMatch = output.match(/건너뛴 포스트.*: (\d+)개/);
  const errorsMatch = output.match(/오류 발생: (\d+)개/);

  if (totalMatch) stats.totalPosts = parseInt(totalMatch[1] || '0');
  if (migratedMatch) stats.migratedPosts = parseInt(migratedMatch[1] || '0');
  if (skippedMatch) stats.skipped = parseInt(skippedMatch[1] || '0');
  if (errorsMatch) stats.errors = parseInt(errorsMatch[1] || '0');

  return stats;
}