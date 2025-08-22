import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';

/**
 * 개별 주간보고서 상세 조회 API
 * 
 * GET: 특정 주간보고서의 상세 정보 조회
 * 
 * @author Meire Blog Platform
 * @created 2025-08-21
 */

const dbPath = path.resolve(process.cwd(), 'database.db');

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/merry/weekly-reports/[id] - 특정 주간보고서 상세 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reportId = parseInt(id);
    
    if (isNaN(reportId)) {
      return NextResponse.json({
        success: false,
        error: '유효한 보고서 ID를 입력해주세요.'
      }, { status: 400 });
    }

    const db = new Database(dbPath);
    
    return new Promise((resolve) => {
      // 메인 보고서 정보 조회
      db.get(
        'SELECT * FROM weekly_reports WHERE id = ?',
        [reportId],
        (err, reportRow: any) => {
          if (err) {
            db.close();
            resolve(NextResponse.json({
              success: false,
              error: '보고서 조회 중 오류가 발생했습니다.',
              details: err.message
            }, { status: 500 }));
            return;
          }

          if (!reportRow) {
            db.close();
            resolve(NextResponse.json({
              success: false,
              error: '해당 보고서를 찾을 수 없습니다.'
            }, { status: 404 }));
            return;
          }

          // 포스트 분석 결과 조회
          db.all(
            'SELECT * FROM weekly_post_analysis WHERE weekly_report_id = ? ORDER BY post_date DESC',
            [reportId],
            (err, postAnalyses) => {
              if (err) {
                db.close();
                resolve(NextResponse.json({
                  success: false,
                  error: '포스트 분석 조회 중 오류가 발생했습니다.',
                  details: err.message
                }, { status: 500 }));
                return;
              }

              // 카테고리별 분석 조회
              db.all(
                'SELECT * FROM weekly_category_analysis WHERE weekly_report_id = ?',
                [reportId],
                (err, categoryAnalyses) => {
                  if (err) {
                    db.close();
                    resolve(NextResponse.json({
                      success: false,
                      error: '카테고리 분석 조회 중 오류가 발생했습니다.',
                      details: err.message
                    }, { status: 500 }));
                    return;
                  }

                  // 종목 트렌드 조회
                  db.all(
                    'SELECT * FROM weekly_stock_trends WHERE weekly_report_id = ? ORDER BY mention_count DESC',
                    [reportId],
                    (err, stockTrends) => {
                      if (err) {
                        db.close();
                        resolve(NextResponse.json({
                          success: false,
                          error: '종목 트렌드 조회 중 오류가 발생했습니다.',
                          details: err.message
                        }, { status: 500 }));
                        return;
                      }

                      // AI 인사이트 조회
                      db.all(
                        'SELECT * FROM weekly_ai_insights WHERE weekly_report_id = ? ORDER BY priority_level DESC',
                        [reportId],
                        (err, aiInsights) => {
                          if (err) {
                            db.close();
                            resolve(NextResponse.json({
                              success: false,
                              error: 'AI 인사이트 조회 중 오류가 발생했습니다.',
                              details: err.message
                            }, { status: 500 }));
                            return;
                          }

                          // 주간 지표 조회
                          db.all(
                            'SELECT * FROM weekly_metrics WHERE weekly_report_id = ?',
                            [reportId],
                            (err, metrics) => {
                              db.close();

                              if (err) {
                                resolve(NextResponse.json({
                                  success: false,
                                  error: '주간 지표 조회 중 오류가 발생했습니다.',
                                  details: err.message
                                }, { status: 500 }));
                                return;
                              }

                              // 상세 보고서 데이터 구성
                              const detailedReport = {
                                id: reportRow.id,
                                weekRange: {
                                  start: reportRow.week_start_date,
                                  end: reportRow.week_end_date
                                },
                                reportDate: reportRow.report_date,
                                status: reportRow.status,
                                title: reportRow.title,
                                summary: reportRow.summary,
                                insights: reportRow.insights,
                                stats: {
                                  totalPosts: reportRow.total_posts,
                                  totalStockMentions: reportRow.total_stock_mentions,
                                  analyzedPosts: (postAnalyses as any[]).length,
                                  categories: (categoryAnalyses as any[]).length,
                                  stockTrends: (stockTrends as any[]).length,
                                  aiInsights: (aiInsights as any[]).length
                                },
                                postAnalyses: (postAnalyses as any[]).map((pa: any) => ({
                                  id: pa.id,
                                  postTitle: pa.post_title,
                                  postDate: pa.post_date,
                                  category: pa.post_category,
                                  sentimentScore: pa.sentiment_score,
                                  marketImpactScore: pa.market_impact_score,
                                  keyThemes: pa.key_themes ? JSON.parse(pa.key_themes) : [],
                                  insights: pa.extracted_insights
                                })),
                                categoryAnalyses: (categoryAnalyses as any[]).map((ca: any) => ({
                                  category: ca.category,
                                  postCount: ca.post_count,
                                  totalWordCount: ca.total_word_count,
                                  avgSentimentScore: ca.avg_sentiment_score,
                                  keyInsights: ca.key_insights,
                                  topKeywords: ca.top_keywords ? JSON.parse(ca.top_keywords) : [],
                                  trendAnalysis: ca.trend_analysis
                                })),
                                stockTrends: (stockTrends as any[]).map((st: any) => ({
                                  ticker: st.ticker,
                                  companyName: st.company_name,
                                  mentionCount: st.mention_count,
                                  avgSentimentScore: st.avg_sentiment_score,
                                  priceChangePercent: st.price_change_percent,
                                  volumeChangePercent: st.volume_change_percent,
                                  trendCategory: st.trend_category,
                                  keyEvents: st.key_events,
                                  analystNote: st.analyst_note
                                })),
                                aiInsights: (aiInsights as any[]).map((ai: any) => ({
                                  id: ai.id,
                                  type: ai.insight_type,
                                  title: ai.title,
                                  content: ai.content,
                                  confidence: ai.confidence_score,
                                  supportingPosts: ai.supporting_posts ? JSON.parse(ai.supporting_posts) : [],
                                  dataSources: ai.data_sources,
                                  priority: ai.priority_level
                                })),
                                metrics: (metrics as any[]).map((m: any) => ({
                                  name: m.metric_name,
                                  value: m.metric_value,
                                  unit: m.metric_unit,
                                  previousWeekValue: m.previous_week_value,
                                  changePercent: m.change_percent,
                                  benchmarkValue: m.benchmark_value,
                                  trendDirection: m.trend_direction,
                                  interpretation: m.interpretation
                                })),
                                generatedAt: reportRow.generated_at,
                                createdAt: reportRow.created_at,
                                updatedAt: reportRow.updated_at
                              };

                              resolve(NextResponse.json({
                                success: true,
                                data: detailedReport
                              }));
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
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