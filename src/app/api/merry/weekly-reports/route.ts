import { NextRequest, NextResponse } from 'next/server';
import ClaudeWeeklyAnalyzer from '@/lib/claude-weekly-analyzer';
import { Database } from 'sqlite3';
import path from 'path';

/**
 * 메르 주간보고 API - 메인 엔드포인트
 * 
 * GET: 주간보고서 리스트 조회
 * POST: 새로운 주간보고서 생성
 * 
 * @author Meire Blog Platform
 * @created 2025-08-21
 */

const dbPath = path.resolve(process.cwd(), 'database.db');

// GET /api/merry/weekly-reports - 주간보고서 리스트 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status'); // pending, completed, failed

    const db = new Database(dbPath);
    
    return new Promise((resolve) => {
      let query = `
        SELECT 
          wr.*,
          COUNT(wpa.id) as analyzed_posts_count,
          COUNT(wst.id) as stock_trends_count,
          COUNT(wai.id) as ai_insights_count
        FROM weekly_reports wr
        LEFT JOIN weekly_post_analysis wpa ON wr.id = wpa.weekly_report_id
        LEFT JOIN weekly_stock_trends wst ON wr.id = wst.weekly_report_id  
        LEFT JOIN weekly_ai_insights wai ON wr.id = wai.weekly_report_id
      `;

      const params: any[] = [];
      
      if (status) {
        query += ' WHERE wr.status = ?';
        params.push(status);
      }
      
      query += `
        GROUP BY wr.id
        ORDER BY wr.week_start_date DESC
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);

      db.all(query, params, (err, rows) => {
        db.close();
        
        if (err) {
          console.error('주간보고서 조회 실패:', err);
          resolve(NextResponse.json({
            success: false,
            error: '주간보고서 조회에 실패했습니다.',
            details: err.message
          }, { status: 500 }));
          return;
        }

        const reports = (rows as any[]).map(row => ({
          id: row.id,
          weekRange: {
            start: row.week_start_date,
            end: row.week_end_date
          },
          reportDate: row.report_date,
          status: row.status,
          title: row.title,
          summary: row.summary,
          stats: {
            totalPosts: row.total_posts,
            analyzedPosts: row.analyzed_posts_count,
            stockTrends: row.stock_trends_count,
            aiInsights: row.ai_insights_count,
            stockMentions: row.total_stock_mentions
          },
          generatedAt: row.generated_at,
          createdAt: row.created_at
        }));

        resolve(NextResponse.json({
          success: true,
          data: reports,
          pagination: {
            limit,
            offset,
            total: reports.length
          }
        }));
      });
    });
    
  } catch (error) {
    console.error('API 에러:', error);
    return NextResponse.json({
      success: false,
      error: 'API 요청 처리 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

// POST /api/merry/weekly-reports - 새로운 주간보고서 생성
export async function POST(request: NextRequest) {
  try {
    const { weekStartDate, weekEndDate } = await request.json();
    
    if (!weekStartDate || !weekEndDate) {
      return NextResponse.json({
        success: false,
        error: '주간 시작일과 종료일을 입력해주세요.'
      }, { status: 400 });
    }

    // 날짜 유효성 검증
    const startDate = new Date(weekStartDate);
    const endDate = new Date(weekEndDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({
        success: false,
        error: '유효한 날짜 형식을 입력해주세요.'
      }, { status: 400 });
    }

    if (startDate >= endDate) {
      return NextResponse.json({
        success: false,
        error: '시작일은 종료일보다 빨라야 합니다.'
      }, { status: 400 });
    }

    // 기존 보고서 중복 확인
    const db = new Database(dbPath);
    
    return new Promise(async (resolve) => {
      // 중복 확인
      db.get(
        'SELECT id FROM weekly_reports WHERE week_start_date = ? AND week_end_date = ?',
        [weekStartDate, weekEndDate],
        async (err, row) => {
          if (err) {
            db.close();
            resolve(NextResponse.json({
              success: false,
              error: '기존 보고서 확인 중 오류가 발생했습니다.',
              details: err.message
            }, { status: 500 }));
            return;
          }

          if (row) {
            db.close();
            resolve(NextResponse.json({
              success: false,
              error: '해당 기간의 주간보고서가 이미 존재합니다.'
            }, { status: 409 }));
            return;
          }

          // Claude 직접 분석을 통한 새 보고서 생성
          try {
            const analyzer = new ClaudeWeeklyAnalyzer();
            const analysisResult = await analyzer.generateWeeklyReport(weekStartDate, weekEndDate);
            
            // 보고서 제목 생성
            const startDateStr = new Date(weekStartDate).toLocaleDateString('ko-KR', { 
              month: 'long', 
              day: 'numeric' 
            });
            const endDateStr = new Date(weekEndDate).toLocaleDateString('ko-KR', { 
              month: 'long', 
              day: 'numeric' 
            });
            const title = `메르 주간보고 (${startDateStr} ~ ${endDateStr})`;

            // Claude가 생성한 Executive Summary 사용
            const summary = analysisResult.executiveSummary.highlights.join(' ');

            // 데이터베이스에 저장
            db.run(
              `INSERT INTO weekly_reports 
               (week_start_date, week_end_date, report_date, status, title, summary, insights, total_posts, generated_at)
               VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                weekStartDate,
                weekEndDate,
                new Date().toISOString().split('T')[0],
                title,
                summary,
                analysisResult.executiveSummary.marketOutlook,
                analysisResult.metadata.totalPosts
              ],
              function(err) {
                if (err) {
                  db.close();
                  analyzer.close();
                  resolve(NextResponse.json({
                    success: false,
                    error: '보고서 저장 중 오류가 발생했습니다.',
                    details: err.message
                  }, { status: 500 }));
                  return;
                }

                const reportId = this.lastID;

                // Claude 분석 결과 저장 (비동기로 처리)
                analysisResult.postAnalyses.forEach((analysis: any) => {
                  if (analysis) {
                    const postData = analysis;
                    
                    db.run(
                      `INSERT INTO weekly_post_analysis
                       (weekly_report_id, post_id, post_title, post_date, post_category, sentiment_score, market_impact_score, key_themes, extracted_insights)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        reportId,
                        postData.postId,
                        postData.title,
                        postData.date,
                        postData.category,
                        postData.sentiment.score,
                        postData.marketImpact === 'high' ? 0.8 : postData.marketImpact === 'medium' ? 0.5 : 0.2,
                        JSON.stringify(postData.keyInsights),
                        postData.coreSummary
                      ]
                    );
                  }
                });

                // 종목별 분석 저장
                analysisResult.stockSummary.forEach((summary: any, ticker: string) => {
                  db.run(
                    `INSERT INTO weekly_stock_trends
                     (weekly_report_id, ticker, mention_count, sentiment_score, trend_direction, key_insights)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      reportId,
                      ticker,
                      summary.mentions,
                      summary.overallSentiment,
                      summary.recommendation,
                      summary.keyPoints.join('; ')
                    ]
                  );
                });

                db.close();
                analyzer.close();

                resolve(NextResponse.json({
                  success: true,
                  message: '주간보고서가 성공적으로 생성되었습니다.',
                  data: {
                    id: reportId,
                    title,
                    summary,
                    weekRange: { start: weekStartDate, end: weekEndDate },
                    stats: {
                      totalPosts: analysisResult.metadata.totalPosts,
                      avgSentiment: analysisResult.aggregatedInsights.marketSentiment,
                      stockMentions: analysisResult.stockSummary.size
                    }
                  }
                }));
              }
            );

          } catch (analysisError) {
            db.close();
            console.error('분석 엔진 오류:', analysisError);
            resolve(NextResponse.json({
              success: false,
              error: '포스트 분석 중 오류가 발생했습니다.',
              details: analysisError instanceof Error ? analysisError.message : '분석 엔진 오류'
            }, { status: 500 }));
          }
        }
      );
    });
    
  } catch (error) {
    console.error('POST API 에러:', error);
    return NextResponse.json({
      success: false,
      error: 'API 요청 처리 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}