#!/usr/bin/env node

/**
 * 실제 블로그 데이터로 주간보고 생성 스크립트
 * CLAUDE.md 준수: 실제 데이터만 사용, Dummy 데이터 금지
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

class RealWeeklyReportGenerator {
  constructor() {
    this.db = new sqlite3.Database('database.db');
  }

  async generateReport() {
    console.log('🚀 실제 데이터 기반 주간보고 생성 시작...');
    
    try {
      // 1. 최근 7일간 포스트 분석
      const recentPosts = await this.getRecentPosts();
      console.log(`📝 최근 7일 포스트: ${recentPosts.length}개`);
      
      // 2. 종목 언급 분석
      const stockMentions = await this.analyzeStockMentions();
      console.log(`📊 종목 언급 분석: ${stockMentions.length}개 종목`);
      
      // 3. 카테고리별 분석
      const categoryAnalysis = await this.analyzePosts(recentPosts);
      console.log(`🗂️ 카테고리 분석 완료`);
      
      // 4. 주간보고서 생성
      const reportId = await this.createWeeklyReport(recentPosts, stockMentions, categoryAnalysis);
      console.log(`✅ 주간보고서 생성 완료: ID ${reportId}`);
      
      return reportId;
    } catch (error) {
      console.error('❌ 주간보고 생성 실패:', error);
      throw error;
    }
  }

  async getRecentPosts() {
    return new Promise((resolve, reject) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      this.db.all(
        `SELECT id, title, content, excerpt, created_date, views 
         FROM blog_posts 
         WHERE created_date >= ? 
         ORDER BY created_date DESC`,
        [sevenDaysAgo.toISOString()],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async analyzeStockMentions() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          mms.ticker,
          s.company_name,
          mms.mention_count,
          mms.last_mentioned_at
         FROM merry_mentioned_stocks mms
         LEFT JOIN stocks s ON mms.ticker = s.ticker
         WHERE mms.mention_count > 0
         GROUP BY mms.ticker
         ORDER BY mms.last_mentioned_at DESC
         LIMIT 10`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async analyzePosts(posts) {
    const categories = {
      '세계정세': [],
      '매크로': [],
      '환율': [],
      '종목': [],
      '산업': []
    };

    // 키워드 기반 카테고리 분류 (실제 텍스트 분석)
    const keywords = {
      '세계정세': ['미국', '중국', '러시아', '전쟁', '정치', '외교', '제재', '트럼프', '바이든'],
      '매크로': ['금리', '인플레이션', 'GDP', '연준', 'Fed', '통화정책', '경제성장', '불황'],
      '환율': ['달러', '원화', '엔화', '유로', '환율', '달러강세', '원화약세'],
      '종목': ['주식', '주가', '매수', '매도', '투자', '배당', '실적', '어닝'],
      '산업': ['반도체', 'AI', '자동차', '전기차', '배터리', '바이오', '헬스케어', '테크']
    };

    posts.forEach(post => {
      const content = (post.title + ' ' + (post.content || post.excerpt || '')).toLowerCase();
      
      Object.keys(keywords).forEach(category => {
        const hasKeyword = keywords[category].some(keyword => 
          content.includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          categories[category].push({
            id: post.id,
            title: post.title,
            created_date: post.created_date,
            views: post.views || 0
          });
        }
      });
    });

    return categories;
  }

  async createWeeklyReport(posts, stocks, categories) {
    return new Promise((resolve, reject) => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const reportData = {
        title: `메르 주간보고 - ${weekStart.toLocaleDateString('ko-KR')} ~ ${now.toLocaleDateString('ko-KR')}`,
        week_start_date: weekStart.toISOString().split('T')[0],
        week_end_date: now.toISOString().split('T')[0],
        report_date: now.toISOString().split('T')[0],
        status: 'completed',
        summary: `총 ${posts.length}개 포스트 분석, ${stocks.length}개 종목 언급`,
        total_posts: posts.length,
        total_stock_mentions: stocks.length,
        insights: JSON.stringify({
          categories: categories,
          stocks: stocks,
          ai_insights: this.generateInsights(posts, stocks, categories)
        }),
        generated_at: now.toISOString()
      };

      this.db.run(
        `INSERT INTO weekly_reports 
         (title, week_start_date, week_end_date, report_date, status, summary, total_posts, total_stock_mentions, insights, generated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reportData.title,
          reportData.week_start_date,
          reportData.week_end_date,
          reportData.report_date,
          reportData.status,
          reportData.summary,
          reportData.total_posts,
          reportData.total_stock_mentions,
          reportData.insights,
          reportData.generated_at
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  generateInsights(posts, stocks, categories) {
    const insights = [];

    // 가장 활발한 카테고리
    const activeCategoryName = Object.keys(categories).reduce((max, cat) => 
      categories[cat].length > (categories[max] || []).length ? cat : max
    );
    
    if (categories[activeCategoryName] && categories[activeCategoryName].length > 0) {
      insights.push({
        priority: 'high',
        category: activeCategoryName,
        title: `이번 주 ${activeCategoryName} 분야 집중 조명`,
        content: `총 ${categories[activeCategoryName].length}개의 ${activeCategoryName} 관련 포스트가 게시되어 가장 활발한 분야로 나타났습니다.`,
        impact: 'positive'
      });
    }

    // 최다 언급 종목
    if (stocks.length > 0) {
      const topStock = stocks[0];
      insights.push({
        priority: 'medium',
        category: '종목',
        title: `${topStock.company_name || topStock.ticker} 지속적 관심`,
        content: `${topStock.ticker} 종목이 총 ${topStock.mention_count}회 언급되며 투자자들의 높은 관심을 받고 있습니다.`,
        impact: 'neutral'
      });
    }

    // 포스팅 활성도
    if (posts.length > 0) {
      insights.push({
        priority: 'low',
        category: '전체',
        title: `이번 주 블로그 활성도`,
        content: `총 ${posts.length}개의 새로운 포스트가 게시되어 ${posts.length > 10 ? '높은' : '보통'} 활성도를 보였습니다.`,
        impact: posts.length > 10 ? 'positive' : 'neutral'
      });
    }

    return JSON.stringify(insights);
  }

  close() {
    this.db.close();
  }
}

// 실행
if (require.main === module) {
  const generator = new RealWeeklyReportGenerator();
  generator.generateReport()
    .then(reportId => {
      console.log(`🎉 실제 데이터 주간보고 생성 완료! Report ID: ${reportId}`);
      generator.close();
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 생성 실패:', error);
      generator.close();
      process.exit(1);
    });
}

module.exports = RealWeeklyReportGenerator;