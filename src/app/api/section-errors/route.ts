import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import crypto from 'crypto';

// 📊 섹션 오류 추적 및 관리 API
// 목적: 모든 섹션 오류를 기록하고 분석하여 재발 방지

interface SectionError {
  componentName: string;
  sectionName: string;
  pagePath: string;
  errorMessage: string;
  errorStack?: string;
  errorType: string;
  errorCategory: '데이터' | 'API' | '렌더링' | '로직';
  userAgent?: string;
  userAction?: string;
  apiCalls?: any[];
  componentProps?: any;
  stateSnapshot?: any;
}

interface ErrorSolution {
  errorPattern: string;
  solutionTitle: string;
  solutionSteps: string[];
  codeTemplate?: string;
  preventionCode?: string;
  testCode?: string;
  priority?: number;
}

// 데이터베이스 연결 헬퍼
function getDbConnection(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(process.cwd(), 'database.db');
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// 오류 해시 생성 (중복 방지용)
function generateErrorHash(error: SectionError): string {
  const hashInput = `${error.componentName}:${error.sectionName}:${error.errorType}:${error.errorMessage.substring(0, 100)}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
}

// 브라우저 정보 파싱
function parseBrowserInfo(userAgent?: string) {
  if (!userAgent) return { browserName: 'Unknown', deviceType: 'Unknown' };
  
  let browserName = 'Unknown';
  let deviceType = 'Desktop';
  
  // 브라우저 감지
  if (userAgent.includes('Chrome')) browserName = 'Chrome';
  else if (userAgent.includes('Firefox')) browserName = 'Firefox';
  else if (userAgent.includes('Safari')) browserName = 'Safari';
  else if (userAgent.includes('Edge')) browserName = 'Edge';
  
  // 디바이스 타입 감지
  if (userAgent.includes('Mobile')) deviceType = 'Mobile';
  else if (userAgent.includes('Tablet')) deviceType = 'Tablet';
  
  return { browserName, deviceType };
}

// POST: 섹션 오류 기록
export async function POST(request: NextRequest) {
  try {
    const errorData: SectionError = await request.json();
    const db = await getDbConnection();
    
    // 오류 해시 생성 (중복 방지)
    const errorHash = generateErrorHash(errorData);
    
    // 브라우저 정보 파싱
    const userAgent = request.headers.get('user-agent') || '';
    const { browserName, deviceType } = parseBrowserInfo(userAgent);
    
    console.log(`🚨 [SECTION ERROR] ${errorData.componentName}/${errorData.sectionName}: ${errorData.errorMessage}`);
    
    // 오류 기록 (중복 시 카운트 업데이트)
    await new Promise<void>((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO section_errors (
          error_hash, component_name, section_name, page_path,
          error_message, error_stack, error_type, error_category,
          user_agent, browser_name, device_type,
          user_action, api_calls, component_props, state_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        errorHash,
        errorData.componentName,
        errorData.sectionName,
        errorData.pagePath,
        errorData.errorMessage,
        errorData.errorStack || null,
        errorData.errorType,
        errorData.errorCategory,
        userAgent,
        browserName,
        deviceType,
        errorData.userAction || null,
        errorData.apiCalls ? JSON.stringify(errorData.apiCalls) : null,
        errorData.componentProps ? JSON.stringify(errorData.componentProps) : null,
        errorData.stateSnapshot ? JSON.stringify(errorData.stateSnapshot) : null
      ], (err) => {
        if (err) {
          console.error('섹션 오류 기록 실패:', err);
          reject(err);
        } else {
          // 중복 오류인 경우 카운트 증가
          db.run(`
            UPDATE section_errors 
            SET occurrence_count = occurrence_count + 1, 
                last_occurred_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE error_hash = ?
          `, [errorHash], (updateErr) => {
            if (updateErr) {
              console.error('오류 카운트 업데이트 실패:', updateErr);
            }
            resolve();
          });
        }
      });
    });
    
    // 해결 방법 조회 (LIKE 패턴 사용)
    const solutions = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT * FROM error_solutions
        WHERE ? LIKE '%' || error_pattern || '%'
        ORDER BY priority ASC, success_rate DESC
        LIMIT 3
      `, [errorData.errorMessage], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
    
    db.close();
    
    return NextResponse.json({
      success: true,
      errorHash,
      message: '섹션 오류가 기록되었습니다',
      solutions: solutions.map(sol => ({
        title: sol.solution_title,
        steps: JSON.parse(sol.solution_steps),
        codeTemplate: sol.code_template,
        preventionCode: sol.prevention_code
      }))
    });
    
  } catch (error) {
    console.error('섹션 오류 API 실패:', error);
    return NextResponse.json({
      success: false,
      error: '섹션 오류 기록 실패'
    }, { status: 500 });
  }
}

// GET: 섹션 오류 통계 및 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'stats';
    const component = searchParams.get('component');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const timeRange = searchParams.get('timeRange') || '7d';
    
    // TimeRange를 SQL WHERE 조건으로 변환
    const getTimeRangeCondition = (range: string) => {
      switch (range) {
        case '1d':
          return "AND created_at >= datetime('now', '-1 day')";
        case '7d':
          return "AND created_at >= datetime('now', '-7 days')";
        case '30d':
          return "AND created_at >= datetime('now', '-30 days')";
        case '90d':
          return "AND created_at >= datetime('now', '-90 days')";
        default:
          return "AND created_at >= datetime('now', '-7 days')";
      }
    };
    
    const db = await getDbConnection();
    
    if (type === 'stats') {
      // 통계 조회
      const [componentStats, dailyTrends, recentErrors] = await Promise.all([
        new Promise<any[]>((resolve, reject) => {
          db.all(`SELECT * FROM component_error_stats LIMIT 20`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        }),
        new Promise<any[]>((resolve, reject) => {
          db.all(`SELECT * FROM daily_error_trends LIMIT 30`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        }),
        new Promise<any[]>((resolve, reject) => {
          db.all(`
            SELECT component_name, section_name, error_message, error_category,
                   occurrence_count, status, last_occurred_at
            FROM section_errors 
            WHERE status IN ('new', 'investigating')
            ORDER BY last_occurred_at DESC 
            LIMIT 10
          `, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        })
      ]);
      
      db.close();
      
      return NextResponse.json({
        success: true,
        data: {
          componentStats,
          dailyTrends,
          recentErrors
        }
      });
      
    } else if (type === 'list') {
      // 오류 목록 조회 (시각화 대시보드용)
      const timeRangeCondition = getTimeRangeCondition(timeRange);
      
      let query = `
        SELECT id, error_hash, component_name, section_name, page_path,
               error_message, error_type, error_category, browser_name, device_type,
               occurrence_count, status, created_at, first_occurred_at, last_occurred_at,
               resolved_at, resolution_notes
        FROM section_errors
        WHERE 1=1 ${timeRangeCondition}
      `;
      const params: any[] = [];
      
      if (component) {
        query += ` AND component_name = ?`;
        params.push(component);
      }
      
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);
      
      const [errors, stats] = await Promise.all([
        new Promise<any[]>((resolve, reject) => {
          db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        }),
        // 통계 정보 조회
        new Promise<any>((resolve, reject) => {
          db.get(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
              SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigating,
              SUM(CASE WHEN status = 'fixed' THEN 1 ELSE 0 END) as fixed,
              SUM(CASE WHEN status = 'ignored' THEN 1 ELSE 0 END) as ignored
            FROM section_errors 
            WHERE 1=1 ${timeRangeCondition}
          `, (err, row) => {
            if (err) reject(err);
            else resolve(row || { total: 0, new: 0, investigating: 0, fixed: 0, ignored: 0 });
          });
        })
      ]);
      
      db.close();
      
      return NextResponse.json({
        success: true,
        data: {
          errors,
          stats
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      error: '지원되지 않는 쿼리 타입'
    }, { status: 400 });
    
  } catch (error) {
    console.error('섹션 오류 조회 실패:', error);
    return NextResponse.json({
      success: false,
      error: '섹션 오류 조회 실패'
    }, { status: 500 });
  }
}

// PUT: 오류 상태 업데이트
export async function PUT(request: NextRequest) {
  try {
    const { errorHash, status, resolutionNotes, preventionMethod } = await request.json();
    
    if (!errorHash || !status) {
      return NextResponse.json({
        success: false,
        error: '필수 파라미터가 누락되었습니다'
      }, { status: 400 });
    }
    
    const db = await getDbConnection();
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (resolutionNotes) updateData.resolution_notes = resolutionNotes;
    if (preventionMethod) {
      updateData.prevention_applied = true;
      updateData.prevention_method = preventionMethod;
    }
    if (status === 'fixed') {
      updateData.fixed_at = new Date().toISOString();
    }
    
    await new Promise<void>((resolve, reject) => {
      const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      
      db.run(`
        UPDATE section_errors 
        SET ${fields}
        WHERE error_hash = ?
      `, [...values, errorHash], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    db.close();
    
    console.log(`✅ [SECTION ERROR] Updated ${errorHash} to ${status}`);
    
    return NextResponse.json({
      success: true,
      message: '오류 상태가 업데이트되었습니다'
    });
    
  } catch (error) {
    console.error('섹션 오류 업데이트 실패:', error);
    return NextResponse.json({
      success: false,
      error: '섹션 오류 업데이트 실패'
    }, { status: 500 });
  }
}