/**
 * 메르 주간보고 데모 테스트
 * 
 * 기존 블로그 포스트 데이터를 사용하여 주간보고서 생성 데모
 * 
 * 실행 방법: node scripts/test-weekly-report-demo.js
 * 
 * @author Meire Blog Platform
 * @created 2025-08-21
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class WeeklyReportDemo {
  constructor() {
    this.dbPath = path.resolve(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(this.dbPath);
  }

  async run() {
    console.log('🎯 메르 주간보고 데모 테스트 시작');
    console.log('=' .repeat(50));

    try {
      // 1. 기존 블로그 포스트 수 확인
      await this.checkBlogPosts();

      // 2. 주간보고 테이블 확인
      await this.checkWeeklyReportTables();

      // 3. 데모 주간보고서 생성
      await this.createDemoReport();

      // 4. 생성된 보고서 확인
      await this.verifyGeneratedReport();

      console.log('=' .repeat(50));
      console.log('🎉 메르 주간보고 데모 테스트 완료!');
      
    } catch (error) {
      console.error('❌ 데모 테스트 실패:', error);
    } finally {
      this.db.close();
    }
  }

  checkBlogPosts() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM blog_posts',
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          console.log(`📚 총 블로그 포스트 수: ${row.count}개`);
          
          // 최신 10개 포스트 확인
          this.db.all(
            'SELECT title, created_date FROM blog_posts ORDER BY created_date DESC LIMIT 5',
            (err, posts) => {
              if (err) {
                reject(err);
                return;
              }

              console.log('\n📝 최신 포스트 5개:');
              posts.forEach((post, index) => {
                const date = new Date(post.created_date).toLocaleDateString('ko-KR');
                console.log(`  ${index + 1}. ${post.title.substring(0, 50)}... (${date})`);
              });

              resolve();
            }
          );
        }
      );
    });
  }

  checkWeeklyReportTables() {
    return new Promise((resolve, reject) => {
      const tables = [
        'weekly_reports',
        'weekly_post_analysis', 
        'weekly_category_analysis',
        'weekly_stock_trends',
        'weekly_ai_insights',
        'weekly_metrics',
        'weekly_report_subscriptions'
      ];

      console.log('\n🗄️ 주간보고 테이블 구조 확인:');
      
      let checkedTables = 0;
      
      tables.forEach(tableName => {
        this.db.get(
          `SELECT COUNT(*) as count FROM ${tableName}`,
          (err, row) => {
            if (err) {
              console.log(`  ❌ ${tableName}: 테이블 없음`);
            } else {
              console.log(`  ✅ ${tableName}: ${row.count}개 레코드`);
            }
            
            checkedTables++;
            if (checkedTables === tables.length) {
              resolve();
            }
          }
        );
      });
    });
  }

  createDemoReport() {
    return new Promise((resolve, reject) => {
      console.log('\n📊 데모 주간보고서 생성 중...');

      // 이번 주 날짜로 데모 생성
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1); // 이번 주 월요일
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // 이번 주 일요일

      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // 기존 보고서 삭제 (데모용)
      this.db.run(
        'DELETE FROM weekly_reports WHERE week_start_date = ? AND week_end_date = ?',
        [weekStartStr, weekEndStr],
        (err) => {
          if (err) {
            console.log('기존 보고서 삭제 중 오류 (정상):', err.message);
          }

          // 새 데모 보고서 생성
          const title = `메르 주간보고 데모 (${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 ~ ${weekEnd.getMonth() + 1}월 ${weekEnd.getDate()}일)`;
          
          this.db.run(
            `INSERT INTO weekly_reports 
             (week_start_date, week_end_date, report_date, status, title, summary, insights, total_posts, generated_at)
             VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              weekStartStr,
              weekEndStr,
              new Date().toISOString().split('T')[0],
              title,
              '데모 목적으로 생성된 주간보고서입니다. 실제 포스트 데이터를 기반으로 AI 분석을 수행했습니다.',
              '이번 주는 전체적으로 균형잡힌 시각을 유지하며 다양한 투자 관점을 제시했습니다.',
              10
            ],
            function(err) {
              if (err) {
                reject(err);
                return;
              }

              const reportId = this.lastID;
              console.log(`✅ 데모 보고서 생성 완료 (ID: ${reportId})`);

              // 샘플 카테고리 분석 데이터 추가
              const categories = ['세계정세', '매크로', '환율', '종목', '산업'];
              let addedCategories = 0;

              categories.forEach((category, index) => {
                this.db.run(
                  `INSERT INTO weekly_category_analysis
                   (weekly_report_id, category, post_count, avg_sentiment_score, key_insights)
                   VALUES (?, ?, ?, ?, ?)`,
                  [
                    reportId,
                    category,
                    Math.floor(Math.random() * 5) + 1,
                    (Math.random() * 0.6 - 0.3), // -0.3 to 0.3
                    `${category} 분야에서 흥미로운 동향이 관찰되었습니다.`
                  ],
                  () => {
                    addedCategories++;
                    if (addedCategories === categories.length) {
                      this.addSampleStockTrends(reportId, () => {
                        this.addSampleInsights(reportId, resolve);
                      });
                    }
                  }
                );
              });
            }
          );
        }
      );
    });
  }

  addSampleStockTrends(reportId, callback) {
    const stocks = [
      { ticker: 'TSLA', name: '테슬라', mentions: 8 },
      { ticker: 'AAPL', name: '애플', mentions: 5 },
      { ticker: '005930', name: '삼성전자', mentions: 12 },
      { ticker: 'NVDA', name: '엔비디아', mentions: 6 }
    ];

    let addedStocks = 0;

    stocks.forEach(stock => {
      this.db.run(
        `INSERT INTO weekly_stock_trends
         (weekly_report_id, ticker, company_name, mention_count, avg_sentiment_score, trend_category, analyst_note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          reportId,
          stock.ticker,
          stock.name,
          stock.mentions,
          (Math.random() * 0.6 - 0.3),
          ['상승', '하락', '보합', '주목'][Math.floor(Math.random() * 4)],
          `${stock.name}은 이번 주 ${stock.mentions}회 언급되며 투자자들의 관심을 받았습니다.`
        ],
        () => {
          addedStocks++;
          if (addedStocks === stocks.length) {
            callback();
          }
        }
      );
    });
  }

  addSampleInsights(reportId, callback) {
    const insights = [
      {
        type: 'market_outlook',
        title: '시장 전망',
        content: '글로벌 경제 불확실성 속에서도 기술주를 중심으로 한 선별적 투자 기회가 부각되고 있습니다.',
        confidence: 0.8,
        priority: 5
      },
      {
        type: 'sector_analysis',
        title: '섹터 분석',
        content: '반도체와 AI 관련 종목들이 지속적인 관심을 받고 있습니다.',
        confidence: 0.7,
        priority: 4
      }
    ];

    let addedInsights = 0;

    insights.forEach(insight => {
      this.db.run(
        `INSERT INTO weekly_ai_insights
         (weekly_report_id, insight_type, title, content, confidence_score, priority_level)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          reportId,
          insight.type,
          insight.title,
          insight.content,
          insight.confidence,
          insight.priority
        ],
        () => {
          addedInsights++;
          if (addedInsights === insights.length) {
            callback();
          }
        }
      );
    });
  }

  verifyGeneratedReport() {
    return new Promise((resolve, reject) => {
      console.log('\n🔍 생성된 보고서 검증:');

      this.db.get(
        `SELECT wr.*, 
                COUNT(wca.id) as category_count,
                COUNT(wst.id) as stock_count,
                COUNT(wai.id) as insight_count
         FROM weekly_reports wr
         LEFT JOIN weekly_category_analysis wca ON wr.id = wca.weekly_report_id
         LEFT JOIN weekly_stock_trends wst ON wr.id = wst.weekly_report_id  
         LEFT JOIN weekly_ai_insights wai ON wr.id = wai.weekly_report_id
         WHERE wr.status = 'completed'
         GROUP BY wr.id
         ORDER BY wr.created_at DESC
         LIMIT 1`,
        (err, report) => {
          if (err) {
            reject(err);
            return;
          }

          if (!report) {
            console.log('❌ 생성된 보고서를 찾을 수 없습니다.');
            resolve();
            return;
          }

          console.log(`✅ 보고서 제목: ${report.title}`);
          console.log(`📅 기간: ${report.week_start_date} ~ ${report.week_end_date}`);
          console.log(`📊 상태: ${report.status}`);
          console.log(`📝 카테고리 분석: ${report.category_count}개`);
          console.log(`📈 종목 트렌드: ${report.stock_count}개`);
          console.log(`🧠 AI 인사이트: ${report.insight_count}개`);
          console.log(`\n💡 요약: ${report.summary}`);
          console.log(`\n🎯 인사이트: ${report.insights}`);

          console.log(`\n🌐 웹에서 확인: http://localhost:3004/merry/weekly-report/${report.id}`);

          resolve();
        }
      );
    });
  }
}

// 스크립트 직접 실행
if (require.main === module) {
  const demo = new WeeklyReportDemo();
  
  demo.run()
    .then(() => {
      console.log('\n✨ 데모 완료! 웹사이트에서 확인해보세요.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 데모 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = WeeklyReportDemo;