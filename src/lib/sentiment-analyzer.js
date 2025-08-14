/**
 * AI 기반 포스트 감정 분석 시스템
 * 
 * 각 포스트에서 언급된 종목에 대한 감정(긍정/부정/중립)을 분석하여
 * post_stock_sentiments 테이블에 저장
 */

const StockDB = require('./stock-db-sqlite3');

class SentimentAnalyzer {
  constructor() {
    this.stockDB = new StockDB();
    
    // 종목명 매핑 (회사명 변형 포함)
    this.tickerToNameMap = {
      '005930': ['삼성전자', '삼성', '삼성디스플레이'],
      'TSLA': ['테슬라', 'Tesla'],
      'AAPL': ['애플', 'Apple'],
      'NVDA': ['엔비디아', 'NVIDIA'],
      'INTC': ['인텔', 'Intel'],
      'TSMC': ['TSMC', '대만반도체'],
      '042660': ['한화오션', '한화시스템'],
      '267250': ['HD현대', 'HD한국조선해양'],
      'MSFT': ['마이크로소프트', 'Microsoft'],
      'GOOGL': ['구글', 'Google', '알파벳'],
      'AMZN': ['아마존', 'Amazon'],
      'META': ['메타', 'Meta', '페이스북']
    };

    // 감정 분석용 키워드 사전
    this.sentimentKeywords = {
      positive: [
        '상승', '증가', '성장', '호재', '긍정적', '좋은', '유망', '전망', '기대',
        '투자', '추천', '매수', '목표가', '상향', '개선', '혁신', '선도', '리더',
        '실적', '수익', '이익', '흑자', '돌파', '신기록', '최고', '성공',
        '강세', '상향조정', '목표주가', '급등', '반등', '회복'
      ],
      negative: [
        '하락', '감소', '악재', '부정적', '나쁜', '우려', '위험', '리스크',
        '매도', '하향', '악화', '손실', '적자', '하락세', '급락', '폭락',
        '위기', '문제', '논란', '실망', '저조', '부진', '침체', '둔화'
      ],
      neutral: [
        '유지', '보합', '관망', '중립', '분석', '검토', '평가', '현황',
        '발표', '공시', '보고', '전망', '예상', '계획', '일반적'
      ]
    };
  }

  /**
   * 텍스트에서 종목 언급 찾기
   */
  findStockMentions(text) {
    const mentions = [];
    
    if (!text || text.trim().length === 0) {
      return mentions;
    }
    
    for (const [ticker, nameArray] of Object.entries(this.tickerToNameMap)) {
      // 티커 매칭 (영문/숫자는 word boundary 사용)
      const tickerRegex = new RegExp(`\\b${ticker}\\b`, 'gi');
      const tickerMatch = tickerRegex.test(text);
      
      let nameMatch = false;
      let matchedName = '';
      
      // 각 이름 변형 체크 (한글은 word boundary 없이)
      for (const name of nameArray) {
        // 한글이 포함된 경우는 단순 포함 검사, 영문은 word boundary 사용
        const isKorean = /[가-힣]/.test(name);
        let nameRegex;
        
        if (isKorean) {
          // 한글의 경우: 단순 포함 검사
          nameRegex = new RegExp(name, 'gi');
        } else {
          // 영문의 경우: word boundary 사용
          nameRegex = new RegExp(`\\b${name}\\b`, 'gi');
        }
        
        if (nameRegex.test(text)) {
          nameMatch = true;
          matchedName = name;
          console.log(`🎯 Found ${isKorean ? 'Korean' : 'English'} name match: ${name} in text`);
          break;
        }
      }
      
      if (tickerMatch || nameMatch) {
        const displayName = matchedName || nameArray[0];
        console.log(`✅ Final match: ${ticker} (${displayName}) in text`);
        mentions.push({
          ticker,
          name: displayName,
          contexts: this.extractContext(text, [ticker, ...nameArray])
        });
      }
    }
    
    return mentions;
  }

  /**
   * 컨텍스트 추출 (종목 언급 주변 텍스트)
   */
  extractContext(text, terms, windowSize = 100) {
    const contexts = [];
    
    for (const term of terms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const start = Math.max(0, match.index - windowSize);
        const end = Math.min(text.length, match.index + term.length + windowSize);
        const context = text.slice(start, end).trim();
        
        if (context && !contexts.includes(context)) {
          contexts.push(context);
        }
      }
    }
    
    return contexts;
  }

  /**
   * 규칙 기반 감정 분석
   */
  analyzeRuleBased(text, contexts) {
    const allText = [text, ...contexts].join(' ').toLowerCase();
    
    let positiveScore = 0;
    let negativeScore = 0;
    let neutralScore = 0;
    
    const foundKeywords = {
      positive: [],
      negative: [],
      neutral: []
    };

    // 키워드 매칭 및 점수 계산
    for (const [sentiment, keywords] of Object.entries(this.sentimentKeywords)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = allText.match(regex);
        
        if (matches) {
          foundKeywords[sentiment].push(...matches);
          
          if (sentiment === 'positive') {
            positiveScore += matches.length;
          } else if (sentiment === 'negative') {
            negativeScore += matches.length;
          } else {
            neutralScore += matches.length;
          }
        }
      }
    }

    // 전체 점수
    const totalScore = positiveScore + negativeScore + neutralScore;
    
    if (totalScore === 0) {
      return {
        sentiment: 'neutral',
        score: 0.0,
        confidence: 0.3, // 낮은 신뢰도
        keywords: foundKeywords
      };
    }

    // 감정 결정
    let sentiment, score, confidence;
    
    if (positiveScore > negativeScore && positiveScore > neutralScore) {
      sentiment = 'positive';
      score = Math.min(1.0, positiveScore / Math.max(1, totalScore));
      confidence = Math.min(1.0, positiveScore / Math.max(1, positiveScore + negativeScore));
    } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
      sentiment = 'negative'; 
      score = -Math.min(1.0, negativeScore / Math.max(1, totalScore));
      confidence = Math.min(1.0, negativeScore / Math.max(1, positiveScore + negativeScore));
    } else {
      sentiment = 'neutral';
      score = 0.0;
      confidence = 0.5;
    }

    return {
      sentiment,
      score: Math.round(score * 1000) / 1000, // 소수점 3자리
      confidence: Math.round(confidence * 1000) / 1000,
      keywords: foundKeywords
    };
  }

  /**
   * 단일 포스트 감정 분석
   */
  async analyzePost(post) {
    try {
      const fullText = [post.title, post.content, post.excerpt].filter(Boolean).join(' ');
      console.log(`📄 Analyzing post: "${post.title}" (content length: ${fullText.length})`);
      
      const stockMentions = this.findStockMentions(fullText);
      
      if (stockMentions.length === 0) {
        console.log(`⚠️ No stock mentions found in: "${post.title}"`);
        return [];
      }
      
      console.log(`✅ Found ${stockMentions.length} stock mentions in: "${post.title}"`);

      const results = [];
      
      for (const mention of stockMentions) {
        const analysis = this.analyzeRuleBased(fullText, mention.contexts);
        
        results.push({
          post_id: post.id,
          ticker: mention.ticker,
          sentiment: analysis.sentiment,
          sentiment_score: analysis.score,
          confidence: analysis.confidence,
          keywords: JSON.stringify(analysis.keywords),
          context_snippet: mention.contexts[0] || fullText.slice(0, 200) + '...'
        });
        
        console.log(`📊 ${mention.ticker} (${mention.name}): ${analysis.sentiment} (${analysis.score}) - confidence: ${analysis.confidence}`);
      }
      
      return results;
      
    } catch (error) {
      console.error('포스트 감정 분석 실패:', error);
      return [];
    }
  }

  /**
   * 감정 분석 결과를 DB에 저장
   */
  async saveSentimentToDB(sentimentResults) {
    if (!sentimentResults || sentimentResults.length === 0) {
      return;
    }

    try {
      await this.stockDB.connect();
      
      for (const result of sentimentResults) {
        await new Promise((resolve, reject) => {
          this.stockDB.db.run(`
            INSERT OR REPLACE INTO post_stock_sentiments 
            (post_id, ticker, sentiment, sentiment_score, confidence, keywords, context_snippet)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            result.post_id,
            result.ticker,
            result.sentiment,
            result.sentiment_score,
            result.confidence,
            result.keywords,
            result.context_snippet
          ], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      console.log(`✅ Saved ${sentimentResults.length} sentiment analysis results to DB`);
      
    } catch (error) {
      console.error('감정 분석 결과 저장 실패:', error);
      throw error;
    } finally {
      this.stockDB.close();
    }
  }

  /**
   * 모든 포스트 배치 분석
   */
  async analyzeAllPosts(limit = 100) {
    try {
      await this.stockDB.connect();
      
      // 아직 분석되지 않은 포스트들 가져오기
      const posts = await new Promise((resolve, reject) => {
        this.stockDB.db.all(`
          SELECT DISTINCT bp.id, bp.title, bp.content, bp.excerpt, bp.created_date
          FROM blog_posts bp
          LEFT JOIN post_stock_sentiments pss ON bp.id = pss.post_id
          WHERE pss.post_id IS NULL
          ORDER BY bp.created_date DESC
          LIMIT ?
        `, [limit], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });

      console.log(`🔍 Found ${posts.length} posts to analyze for sentiment`);
      
      let totalResults = [];
      
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        console.log(`\n📝 Analyzing post ${i + 1}/${posts.length}: "${post.title.slice(0, 50)}..."`);
        
        const results = await this.analyzePost(post);
        if (results.length > 0) {
          await this.saveSentimentToDB(results);
          totalResults = totalResults.concat(results);
        }
        
        // 진행 상황 표시
        if ((i + 1) % 10 === 0) {
          console.log(`\n✅ Processed ${i + 1}/${posts.length} posts`);
        }
      }
      
      console.log(`\n🎉 Sentiment analysis completed! Total results: ${totalResults.length}`);
      return totalResults;
      
    } catch (error) {
      console.error('배치 감정 분석 실패:', error);
      throw error;
    } finally {
      this.stockDB.close();
    }
  }

  /**
   * 특정 종목의 감정 분석 결과 조회
   */
  async getSentimentByTicker(ticker, limit = 10) {
    try {
      await this.stockDB.connect();
      
      const results = await new Promise((resolve, reject) => {
        this.stockDB.db.all(`
          SELECT 
            pss.*,
            bp.title,
            bp.created_date as post_date
          FROM post_stock_sentiments pss
          JOIN blog_posts bp ON pss.post_id = bp.id
          WHERE pss.ticker = ?
          ORDER BY bp.created_date DESC
          LIMIT ?
        `, [ticker, limit], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });

      return results;
      
    } catch (error) {
      console.error('감정 분석 결과 조회 실패:', error);
      return [];
    } finally {
      this.stockDB.close();
    }
  }
}

module.exports = SentimentAnalyzer;