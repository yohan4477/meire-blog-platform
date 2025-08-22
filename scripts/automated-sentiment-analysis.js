#!/usr/bin/env node

/**
 * 🧠 Automated Sentiment Analysis System
 * 
 * This script performs AI-powered sentiment analysis for newly crawled blog posts.
 * It integrates with the Meire blog platform's automated crawling system.
 * 
 * Features:
 * - Claude AI-powered sentiment analysis
 * - Stock mention detection and analysis
 * - Batch processing with concurrency control
 * - Following CLAUDE.md sentiment analysis requirements
 * - Integration with post_stock_sentiments table
 * 
 * Usage:
 *   node scripts/automated-sentiment-analysis.js [options]
 * 
 * Options:
 *   --date=YYYY-MM-DD     Target date for analysis (default: today)
 *   --batch-size=N        Batch size for processing (default: 10)
 *   --max-posts=N         Maximum posts to analyze (default: 50)
 *   --force-reanalyze     Force re-analysis of existing sentiments
 *   --github-actions      Running in GitHub Actions environment
 */

const sqlite3 = require('better-sqlite3');
const axios = require('axios');
const path = require('path');

// Configuration
const CONFIG = {
  DATABASE_PATH: path.join(__dirname, '..', 'database.db'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  REQUEST_TIMEOUT: 30000,
  BATCH_DELAY: 1000
};

// Stock ticker mapping (Korean companies and US stocks)
const STOCK_MAPPING = {
  // Korean stocks
  '005930': ['삼성전자', '삼성', 'Samsung'],
  '000660': ['SK하이닉스', 'SK하이닉스', 'SKHynix'],
  '005490': ['포스코', 'POSCO'],
  '051910': ['LG화학', 'LG'],
  '006400': ['삼성SDI'],
  '267250': ['HD현대', '현대중공업', '조선'],
  '042660': ['한화오션', '대우조선해양'],
  '096770': ['SK이노베이션'],
  '010950': ['S-Oil'],
  '003470': ['유진테크', 'LS니꼬동제련'],
  '004020': ['현대제철'],
  
  // US stocks
  'TSLA': ['테슬라', 'Tesla'],
  'AAPL': ['애플', 'Apple'],
  'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
  'AMZN': ['아마존', 'Amazon'],
  'MSFT': ['마이크로소프트', 'Microsoft'],
  'NVDA': ['엔비디아', 'NVIDIA'],
  'META': ['메타', 'Meta', '페이스북', 'Facebook'],
  'NFLX': ['넷플릭스', 'Netflix'],
  'INTC': ['인텔', 'Intel'],
  'AMD': ['AMD'],
  'XOM': ['엑손모빌', 'ExxonMobil'],
  'PLTR': ['팰런티어', 'Palantir']
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    date: new Date().toISOString().split('T')[0],
    batchSize: 10,
    maxPosts: 50,
    forceReanalyze: false,
    githubActions: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--date=')) options.date = arg.split('=')[1];
    if (arg.startsWith('--batch-size=')) options.batchSize = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--max-posts=')) options.maxPosts = parseInt(arg.split('=')[1]);
    if (arg === '--force-reanalyze') options.forceReanalyze = true;
    if (arg === '--github-actions') options.githubActions = true;
  });

  return options;
}

// Database manager for sentiment analysis
class SentimentDatabaseManager {
  constructor(dbPath) {
    this.db = sqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
  }

  // Get posts for sentiment analysis
  getPostsForAnalysis(date, maxPosts, forceReanalyze) {
    let query;
    let params;

    if (forceReanalyze) {
      query = `
        SELECT id, title, content, excerpt, created_date 
        FROM blog_posts 
        WHERE blog_type = 'merry' 
          AND created_date >= ? 
        ORDER BY created_date DESC 
        LIMIT ?
      `;
      params = [date, maxPosts];
    } else {
      query = `
        SELECT bp.id, bp.title, bp.content, bp.excerpt, bp.created_date
        FROM blog_posts bp
        LEFT JOIN post_stock_sentiments pss ON bp.id = pss.post_id
        WHERE bp.blog_type = 'merry' 
          AND bp.created_date >= ?
          AND pss.id IS NULL
        ORDER BY bp.created_date DESC 
        LIMIT ?
      `;
      params = [date, maxPosts];
    }

    return this.db.prepare(query).all(...params);
  }

  // Check if sentiment analysis exists for post-ticker combination
  sentimentExists(postId, ticker) {
    const result = this.db.prepare(
      'SELECT id FROM post_stock_sentiments WHERE post_id = ? AND ticker = ?'
    ).get(postId, ticker);
    return !!result;
  }

  // Insert sentiment analysis result
  insertSentiment(data) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO post_stock_sentiments 
      (post_id, ticker, sentiment, sentiment_score, confidence, keywords, context_snippet, reasoning)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run([
      data.postId,
      data.ticker,
      data.sentiment,
      data.sentimentScore,
      data.confidence,
      data.keywords || '',
      data.contextSnippet || '',
      data.reasoning || ''
    ]);
  }

  // Update stock mention information
  updateStockMentions(postId, ticker, mentionDate, context) {
    // First check if mention exists
    const existingMention = this.db.prepare(
      'SELECT id FROM merry_mentioned_stocks WHERE post_id = ? AND ticker = ?'
    ).get(postId, ticker);

    if (!existingMention) {
      // Insert new mention
      const stmt = this.db.prepare(`
        INSERT INTO merry_mentioned_stocks 
        (post_id, ticker, mentioned_date, context, sentiment_score, mention_type)
        VALUES (?, ?, ?, ?, 0, 'neutral')
      `);
      stmt.run(postId, ticker, mentionDate, context);
    }

    // Update stock table
    const stockExists = this.db.prepare('SELECT id FROM stocks WHERE ticker = ?').get(ticker);
    if (stockExists) {
      this.db.prepare(`
        UPDATE stocks 
        SET mention_count = mention_count + 1,
            last_mentioned_date = MAX(last_mentioned_date, ?),
            is_merry_mentioned = 1
        WHERE ticker = ?
      `).run(mentionDate, ticker);
    }
  }

  close() {
    this.db.close();
  }
}

// Claude AI sentiment analyzer
class ClaudeAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
  }

  // Analyze post for stock mentions and sentiments
  async analyzePost(post) {
    const prompt = this.buildAnalysisPrompt(post);
    
    try {
      const response = await axios.post(this.baseURL, {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.1,
        system: this.getSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        timeout: CONFIG.REQUEST_TIMEOUT
      });

      return this.parseAnalysisResponse(response.data.content[0].text);
    } catch (error) {
      console.error(`❌ Claude API error for post ${post.id}:`, error.message);
      return [];
    }
  }

  // Build analysis prompt following CLAUDE.md requirements
  buildAnalysisPrompt(post) {
    return `
다음 블로그 포스트를 분석하여 언급된 주식 종목들에 대한 감정을 분석해주세요.

포스트 정보:
- 제목: ${post.title}
- 내용: ${post.content}
- 날짜: ${post.created_date}

분석 기준:
1. 구체적 사실과 논리적 근거만 사용
2. 키워드 매칭이나 패턴 분석 금지
3. 투자 관점에서 긍정/부정/중립 판단
4. 각 종목별로 간결하고 명확한 분석 근거 제시

응답 형식 (JSON):
{
  "analyses": [
    {
      "ticker": "종목코드",
      "company": "회사명",
      "sentiment": "positive/negative/neutral",
      "confidence": 0.0-1.0,
      "reasoning": "구체적이고 논리적인 분석 근거",
      "context": "관련 문맥 발췌"
    }
  ]
}

분석 대상 종목: ${Object.entries(STOCK_MAPPING).map(([ticker, names]) => 
  `${ticker}(${names.join(',')})`
).join(', ')}
`;
  }

  // System prompt for Claude
  getSystemPrompt() {
    return `
당신은 금융 투자 전문가입니다. 블로그 포스트를 분석하여 언급된 주식에 대한 감정 분석을 수행합니다.

핵심 원칙:
- 절대 금지: 키워드 분석, 패턴 매칭, 글자수 기준 분석
- 필수 사용: 구체적 사실, 인과관계, 논리적 추론
- 감정 판단: 투자 관점에서 해당 종목에 긍정적/부정적/중립적 영향 평가
- 근거 품질: 근거만 봐도 감정 판단이 논리적으로 납득 가능해야 함

예시 (좋은 근거):
- 긍정: "AI 칩 시장 급성장으로 TSMC 파운드리 사업 강화 전망"
- 부정: "트럼프 인텔 CEO 사임 요구로 반도체 업계 정치적 리스크"
- 중립: "삼성전자 실적 발표로 시장 관심 집중, 추가 정보 대기"

반드시 JSON 형식으로만 응답하세요.
`;
  }

  // Parse Claude's analysis response
  parseAnalysisResponse(responseText) {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No JSON found in Claude response');
        return [];
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return analysis.analyses || [];
    } catch (error) {
      console.error('❌ Error parsing Claude response:', error.message);
      return [];
    }
  }
}

// Main sentiment analysis orchestrator
class AutomatedSentimentAnalyzer {
  constructor(options) {
    this.options = options;
    this.db = new SentimentDatabaseManager(CONFIG.DATABASE_PATH);
    
    if (!CONFIG.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    this.claude = new ClaudeAnalyzer(CONFIG.ANTHROPIC_API_KEY);
    
    this.stats = {
      postsAnalyzed: 0,
      sentimentsCreated: 0,
      stockMentionsUpdated: 0,
      errorsCount: 0,
      details: {}
    };
  }

  // Run sentiment analysis
  async analyze() {
    console.log('🧠 Starting automated sentiment analysis...');
    console.log(`📅 Target date: ${this.options.date}`);
    console.log(`📦 Batch size: ${this.options.batchSize}`);
    console.log(`🔄 Force re-analyze: ${this.options.forceReanalyze}`);

    // Get posts for analysis
    const posts = this.db.getPostsForAnalysis(
      this.options.date, 
      this.options.maxPosts,
      this.options.forceReanalyze
    );

    console.log(`📋 Found ${posts.length} posts for analysis`);

    if (posts.length === 0) {
      console.log('ℹ️ No posts need sentiment analysis');
      return;
    }

    // Process posts in batches
    await this.processPosts(posts);
  }

  // Process posts in batches
  async processPosts(posts) {
    for (let i = 0; i < posts.length; i += this.options.batchSize) {
      const batch = posts.slice(i, i + this.options.batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i / this.options.batchSize) + 1}/${Math.ceil(posts.length / this.options.batchSize)}`);

      // Process batch with error handling
      const promises = batch.map(post => this.analyzePost(post));
      await Promise.allSettled(promises);

      // Rate limiting between batches
      if (i + this.options.batchSize < posts.length) {
        console.log('⏳ Waiting between batches...');
        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
      }
    }
  }

  // Analyze individual post
  async analyzePost(post) {
    try {
      console.log(`🎯 Analyzing: ${post.title}`);

      // Detect stock mentions in the post
      const stockMentions = this.detectStockMentions(post);
      
      if (stockMentions.length === 0) {
        console.log(`⏭️ No stock mentions found in post ${post.id}`);
        this.stats.postsAnalyzed++;
        return;
      }

      console.log(`📈 Found ${stockMentions.length} stock mentions: ${stockMentions.join(', ')}`);

      // Analyze sentiment using Claude
      const analyses = await this.claude.analyzePost(post);

      if (analyses.length === 0) {
        console.log(`⚠️ No sentiment analysis returned for post ${post.id}`);
        this.stats.errorsCount++;
        return;
      }

      // Process each analysis result
      for (const analysis of analyses) {
        await this.processSentimentAnalysis(post, analysis);
      }

      this.stats.postsAnalyzed++;
      this.stats.details[post.id] = {
        title: post.title,
        mentionsFound: stockMentions.length,
        sentimentsAnalyzed: analyses.length
      };

    } catch (error) {
      console.error(`❌ Error analyzing post ${post.id}:`, error.message);
      this.stats.errorsCount++;
    }
  }

  // Detect stock mentions in post content
  detectStockMentions(post) {
    const content = (post.content + ' ' + post.title).toLowerCase();
    const mentions = [];

    for (const [ticker, names] of Object.entries(STOCK_MAPPING)) {
      const found = names.some(name => 
        content.includes(name.toLowerCase()) || 
        content.includes(ticker.toLowerCase())
      );

      if (found) {
        mentions.push(ticker);
      }
    }

    return mentions;
  }

  // Process individual sentiment analysis result
  async processSentimentAnalysis(post, analysis) {
    try {
      const ticker = analysis.ticker;
      
      // Skip if sentiment already exists (unless forcing re-analysis)
      if (!this.options.forceReanalyze && this.db.sentimentExists(post.id, ticker)) {
        console.log(`⏭️ Sentiment for ${ticker} in post ${post.id} already exists`);
        return;
      }

      // Calculate sentiment score
      const sentimentScore = this.calculateSentimentScore(analysis.sentiment, analysis.confidence);

      // Insert sentiment analysis
      this.db.insertSentiment({
        postId: post.id,
        ticker: ticker,
        sentiment: analysis.sentiment,
        sentimentScore: sentimentScore,
        confidence: analysis.confidence,
        keywords: '', // Not using keyword-based analysis per CLAUDE.md
        contextSnippet: analysis.context || '',
        reasoning: analysis.reasoning
      });

      // Update stock mentions
      this.db.updateStockMentions(
        post.id, 
        ticker, 
        post.created_date.split(' ')[0], // Extract date part
        analysis.context || ''
      );

      const emoji = analysis.sentiment === 'positive' ? '🟢' : 
                   analysis.sentiment === 'negative' ? '🔴' : '🔵';
      
      console.log(`${emoji} ${ticker}: ${analysis.sentiment} (신뢰도: ${(analysis.confidence * 100).toFixed(0)}%)`);
      
      this.stats.sentimentsCreated++;
      this.stats.stockMentionsUpdated++;

    } catch (error) {
      console.error(`❌ Error processing sentiment for ${analysis.ticker}:`, error.message);
      this.stats.errorsCount++;
    }
  }

  // Calculate numerical sentiment score
  calculateSentimentScore(sentiment, confidence) {
    const baseScore = {
      'positive': 0.7,
      'negative': -0.7,
      'neutral': 0.0
    }[sentiment] || 0.0;

    return baseScore * confidence;
  }

  // Finalize analysis and report results
  finalize() {
    console.log('\n📊 SENTIMENT ANALYSIS SUMMARY:');
    console.log(`  📝 Posts analyzed: ${this.stats.postsAnalyzed}`);
    console.log(`  🎯 Sentiments created: ${this.stats.sentimentsCreated}`);
    console.log(`  📈 Stock mentions updated: ${this.stats.stockMentionsUpdated}`);
    console.log(`  ❌ Errors: ${this.stats.errorsCount}`);

    // Show sentiment breakdown
    if (this.stats.sentimentsCreated > 0) {
      const sentiments = this.db.db.prepare(`
        SELECT sentiment, COUNT(*) as count
        FROM post_stock_sentiments 
        WHERE analyzed_at >= ?
        GROUP BY sentiment
      `).all(this.options.date);

      console.log('\n📈 Sentiment Distribution:');
      sentiments.forEach(s => {
        const emoji = s.sentiment === 'positive' ? '🟢' : 
                     s.sentiment === 'negative' ? '🔴' : '🔵';
        console.log(`  ${emoji} ${s.sentiment}: ${s.count}`);
      });
    }

    this.db.close();
    console.log('🎉 Automated sentiment analysis completed!');

    return {
      success: this.stats.errorsCount === 0,
      stats: this.stats
    };
  }
}

// Main execution function
async function main() {
  const options = parseArgs();

  console.log('🧠 Meire Blog Automated Sentiment Analysis');
  console.log('📋 Following CLAUDE.md sentiment analysis requirements');
  console.log('🎯 AI-powered analysis without keyword matching');
  console.log('⚡ SuperClaude framework integration\n');

  try {
    const analyzer = new AutomatedSentimentAnalyzer(options);
    
    await analyzer.analyze();
    const result = analyzer.finalize();
    
    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('💥 Fatal sentiment analysis error:', error);
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { AutomatedSentimentAnalyzer, SentimentDatabaseManager, ClaudeAnalyzer };