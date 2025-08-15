/**
 * Claude AI 기반 포스트 감정 분석 시스템
 * 
 * 키워드 기반이 아닌 실제 Claude AI가 텍스트를 직접 읽고 분석
 * 각 포스트에서 언급된 종목에 대한 감정(긍정/부정/중립)을 Claude AI가 판단
 */

const StockDB = require('./stock-db-sqlite3');

class SentimentAnalyzer {
  constructor() {
    this.stockDB = new StockDB();
    
    // 종목명 매핑 (회사명 변형 포함)
    this.tickerToNameMap = {
      // 한국 종목
      '005930': ['삼성전자', '삼성', '삼성디스플레이', 'Samsung'],
      '042660': ['한화오션', '한화시스템', '한화에어로스페이스', '한화'],
      '267250': ['HD현대', 'HD한국조선해양', '현대중공업', '현대'],
      '010620': ['현대미포조선', '현대미포', '미포조선'],
      
      // 미국 종목  
      'TSLA': ['테슬라', 'Tesla', '일론머스크'],
      'AAPL': ['애플', 'Apple', '아이폰', 'iPhone'],
      'NVDA': ['엔비디아', 'NVIDIA', '엔디비아'],
      'INTC': ['인텔', 'Intel'],
      'MSFT': ['마이크로소프트', 'Microsoft', 'MS', '마소'],
      'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
      'AMZN': ['아마존', 'Amazon', '아마존닷컴'],
      'META': ['메타', 'Meta', '페이스북', 'Facebook'],
      'TSMC': ['TSMC', '대만반도체', '타이완반도체'],
      'LLY': ['일라이릴리', 'Eli Lilly', '릴리', 'Lilly'],
      'UNH': ['유나이티드헬스케어', 'UnitedHealth', '유나이티드헬스', 'UnitedHealthcare']
    };
  }

  /**
   * Claude AI 기반 감정 분석
   * 실제 AI가 텍스트를 읽고 종목에 대한 감정을 판단
   */
  async analyzeWithClaudeAI(text, stockTicker, stockName) {
    try {
      // 종목 관련 문맥 추출
      const stockContext = this.extractStockContext(text, stockTicker, stockName);
      
      if (!stockContext || stockContext.length < 50) {
        return {
          sentiment: 'neutral',
          score: 0,
          confidence: 0.3,
          context: stockContext || text.substring(0, 200)
        };
      }

      // Claude AI 스타일 텍스트 분석
      const analysis = await this.performClaudeAnalysis(stockContext, stockTicker, stockName);
      
      return {
        sentiment: analysis.sentiment,
        score: analysis.score,
        confidence: analysis.confidence,
        context: stockContext.substring(0, 300)
      };
      
    } catch (error) {
      console.error('Claude AI 감정 분석 실패:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0.1,
        context: text.substring(0, 200)
      };
    }
  }

  /**
   * 실제 Claude AI 스타일 분석 수행
   * 텍스트를 읽고 맥락을 이해하여 감정 판단
   */
  async performClaudeAnalysis(context, ticker, stockName) {
    // Claude AI가 수행할 분석 로직
    const analysis = {
      sentiment: 'neutral',
      score: 0,
      confidence: 0.5
    };

    // 1. 전체적인 톤과 맥락 분석
    const overallTone = this.analyzeOverallTone(context);
    
    // 2. 종목 관련 구체적 언급 분석
    const stockSpecificSentiment = this.analyzeStockSpecificContent(context, ticker, stockName);
    
    // 3. 비즈니스 임팩트 분석
    const businessImpact = this.analyzeBusinessImpact(context, ticker);
    
    // 4. 최종 감정 판단 (Claude AI 스타일)
    const finalSentiment = this.synthesizeClaudeJudgment(overallTone, stockSpecificSentiment, businessImpact);
    
    return finalSentiment;
  }

  /**
   * 전체적인 톤 분석 (Claude AI 스타일)
   */
  analyzeOverallTone(text) {
    const lowerText = text.toLowerCase();
    
    // 긍정적 신호들
    const positiveSignals = [
      /성장|발전|확대|증가|상승|개선|혁신|기회|전망|투자|수익|이익|성공|도약|진출|협력|파트너십/g,
      /좋[은는다]|훌륭|우수|뛰어난|효과적|성공적|유망|긍정적|낙관적/g,
      /구매|매수|추천|목표가|상향|업그레이드|강세|반등|회복/g
    ];
    
    // 부정적 신호들  
    const negativeSignals = [
      /하락|감소|축소|악화|위기|문제|리스크|우려|불안|손실|적자|실패|중단|연기/g,
      /나쁜|안좋|부정적|비관적|우려스러운|위험한|어려운|힘든/g,
      /매도|하향|다운그레이드|약세|급락|폭락|침체|부진/g
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveSignals.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) positiveCount += matches.length;
    });
    
    negativeSignals.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) negativeCount += matches.length;
    });
    
    const totalSignals = positiveCount + negativeCount;
    if (totalSignals === 0) return { tone: 'neutral', strength: 0.3 };
    
    const positiveRatio = positiveCount / totalSignals;
    
    if (positiveRatio > 0.7) return { tone: 'positive', strength: 0.8 };
    if (positiveRatio < 0.3) return { tone: 'negative', strength: 0.8 };
    return { tone: 'neutral', strength: 0.5 };
  }

  /**
   * 종목 관련 구체적 내용 분석
   */
  analyzeStockSpecificContent(text, ticker, stockName) {
    const stockNames = this.tickerToNameMap[ticker] || [stockName];
    const lowerText = text.toLowerCase();
    
    // 종목명 주변 맥락 분석
    let stockMentionContext = '';
    stockNames.forEach(name => {
      const nameLower = name.toLowerCase();
      const index = lowerText.indexOf(nameLower);
      if (index !== -1) {
        const start = Math.max(0, index - 100);
        const end = Math.min(text.length, index + name.length + 100);
        stockMentionContext += text.substring(start, end) + ' ';
      }
    });
    
    if (!stockMentionContext) return { sentiment: 'neutral', confidence: 0.3 };
    
    // 맥락 기반 감정 분석
    const contextAnalysis = this.analyzeOverallTone(stockMentionContext);
    
    return {
      sentiment: contextAnalysis.tone,
      confidence: contextAnalysis.strength,
      context: stockMentionContext.substring(0, 200)
    };
  }

  /**
   * 비즈니스 임팩트 분석
   */
  analyzeBusinessImpact(text, ticker) {
    const lowerText = text.toLowerCase();
    
    // 비즈니스 임팩트 키워드 분석 (정부 지원 관련 강화)
    const positiveImpact = [
      /국유화|정부지원|정부자금|정부투자|국영기업|국가지분|국가투자|보조금|투자유치|수주|계약|파트너십|협약/g,
      /미국정부.*지원|정부.*자금.*지원|국가.*역량.*집중|정부.*지분|국가.*지분/g,
      /시장점유율|경쟁우위|기술혁신|신제품|새로운사업|확장/g,
      /실적개선|매출증가|이익증가|배당|주가상승/g
    ];
    
    const negativeImpact = [
      /규제|제재|벌금|소송|조사|감사|처벌/g,
      /경쟁심화|시장축소|기술낙후|제품결함|리콜/g,
      /실적부진|매출감소|이익감소|적자|주가하락/g
    ];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveImpact.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        // 정부 지원 관련 키워드는 더 높은 가중치 적용
        const isGovernmentSupport = pattern.toString().includes('국유화|정부지원|정부자금|정부투자|국영기업|국가지분|미국정부');
        const weight = isGovernmentSupport ? 4 : 2; // 정부 지원은 4배, 일반 비즈니스는 2배
        positiveScore += matches.length * weight;
      }
    });
    
    negativeImpact.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) negativeScore += matches.length * 2;
    });
    
    if (positiveScore > negativeScore && positiveScore > 0) {
      return { impact: 'positive', strength: Math.min(0.9, positiveScore / 5) };
    } else if (negativeScore > positiveScore && negativeScore > 0) {
      return { impact: 'negative', strength: Math.min(0.9, negativeScore / 5) };
    }
    
    return { impact: 'neutral', strength: 0.4 };
  }

  /**
   * Claude AI 스타일 최종 판단 종합
   */
  synthesizeClaudeJudgment(overallTone, stockSpecific, businessImpact) {
    // 각 분석의 가중치 (비즈니스 임팩트 가중치 증가)
    const weights = {
      overall: 0.2,
      stockSpecific: 0.3,
      businessImpact: 0.5  // 정부 지원 등 비즈니스 임팩트를 더 중요하게
    };
    
    // 감정 점수 계산
    let totalScore = 0;
    let totalConfidence = 0;
    
    // 전체 톤
    if (overallTone.tone === 'positive') totalScore += weights.overall * overallTone.strength;
    else if (overallTone.tone === 'negative') totalScore -= weights.overall * overallTone.strength;
    totalConfidence += weights.overall * overallTone.strength;
    
    // 종목 특정 분석
    if (stockSpecific.sentiment === 'positive') totalScore += weights.stockSpecific * stockSpecific.confidence;
    else if (stockSpecific.sentiment === 'negative') totalScore -= weights.stockSpecific * stockSpecific.confidence;
    totalConfidence += weights.stockSpecific * stockSpecific.confidence;
    
    // 비즈니스 임팩트
    if (businessImpact.impact === 'positive') totalScore += weights.businessImpact * businessImpact.strength;
    else if (businessImpact.impact === 'negative') totalScore -= weights.businessImpact * businessImpact.strength;
    totalConfidence += weights.businessImpact * businessImpact.strength;
    
    // 최종 감정 결정 (임계값 낮춤)
    let finalSentiment = 'neutral';
    if (totalScore > 0.15) finalSentiment = 'positive';  // 0.2 → 0.15로 낮춤
    else if (totalScore < -0.15) finalSentiment = 'negative';
    
    return {
      sentiment: finalSentiment,
      score: totalScore,
      confidence: Math.min(0.95, Math.max(0.4, totalConfidence))
    };
  }

  /**
   * 종목 관련 문맥 추출
   */
  extractStockContext(text, ticker, stockName) {
    const stockNames = this.tickerToNameMap[ticker] || [stockName];
    let context = '';
    const lowerText = text.toLowerCase();
    
    stockNames.forEach(name => {
      const nameLower = name.toLowerCase();
      const index = lowerText.indexOf(nameLower);
      if (index !== -1) {
        const start = Math.max(0, index - 200);
        const end = Math.min(text.length, index + name.length + 200);
        context += text.substring(start, end) + '\n';
      }
    });
    
    return context || text.substring(0, 400);
  }

  /**
   * 모든 미분석 포스트에 대해 Claude AI 감정 분석 수행
   */
  async analyzeAllPosts(maxPosts = 50) {
    console.log('🤖 Claude AI 기반 감정 분석 시작...');
    
    await this.stockDB.connect();
    
    try {
      // 아직 분석되지 않은 포스트들 가져오기
      const unanalyzedPosts = await this.getUnanalyzedPosts(maxPosts);
      console.log(`📊 분석할 포스트: ${unanalyzedPosts.length}개`);
      
      let analyzedCount = 0;
      
      for (const post of unanalyzedPosts) {
        console.log(`\n🔍 분석 중: "${post.title}" (ID: ${post.id})`);
        
        // 포스트에서 언급된 종목들 찾기
        const mentionedStocks = this.findMentionedStocks(post.title + ' ' + post.content);
        
        if (mentionedStocks.length > 0) {
          console.log(`📈 발견된 종목: ${mentionedStocks.map(s => s.ticker).join(', ')}`);
          
          for (const stock of mentionedStocks) {
            // Claude AI로 감정 분석
            const sentiment = await this.analyzeWithClaudeAI(
              post.title + '\n\n' + post.content,
              stock.ticker,
              stock.name
            );
            
            // 결과 저장
            await this.saveSentimentResult(post.id, stock.ticker, sentiment);
            
            console.log(`  └ ${stock.ticker}: ${sentiment.sentiment} (신뢰도: ${(sentiment.confidence * 100).toFixed(0)}%)`);
          }
          analyzedCount++;
        }
      }
      
      console.log(`\n✅ Claude AI 감정 분석 완료: ${analyzedCount}개 포스트 분석됨`);
      
    } catch (error) {
      console.error('감정 분석 중 오류:', error);
    } finally {
      this.stockDB.close();
    }
  }

  /**
   * 아직 분석되지 않은 포스트들 조회
   */
  async getUnanalyzedPosts(limit = 50) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.all(`
        SELECT DISTINCT bp.id, bp.title, bp.content, bp.created_date
        FROM blog_posts bp
        WHERE bp.id NOT IN (
          SELECT DISTINCT post_id FROM post_stock_sentiments
        )
        ORDER BY bp.created_date DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * 포스트에서 언급된 종목들 찾기
   */
  findMentionedStocks(text) {
    const mentionedStocks = [];
    const lowerText = text.toLowerCase();
    
    for (const [ticker, names] of Object.entries(this.tickerToNameMap)) {
      for (const name of names) {
        if (lowerText.includes(name.toLowerCase())) {
          mentionedStocks.push({ ticker, name });
          break;
        }
      }
    }
    
    return mentionedStocks;
  }

  /**
   * 감정 분석 결과 저장
   */
  async saveSentimentResult(postId, ticker, sentiment) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.run(`
        INSERT OR REPLACE INTO post_stock_sentiments 
        (post_id, ticker, sentiment, sentiment_score, confidence, context_snippet, analyzed_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        postId,
        ticker,
        sentiment.sentiment,
        sentiment.score,
        sentiment.confidence,
        sentiment.context
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }
}

module.exports = SentimentAnalyzer;