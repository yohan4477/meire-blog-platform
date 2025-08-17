/**
 * Claude AI 기반 포스트 감정 분석 시스템 (6개월치 배치 처리)
 * 
 * 실제 Claude AI API를 사용하여 메르의 투자 블로그에서 종목별 감정 분석
 * 한 번 분석하고 영구 저장하는 방식으로 비용 효율성 극대화
 */

const StockDB = require('./stock-db-sqlite3');

class ClaudeSentimentAnalyzer {
  constructor() {
    this.stockDB = new StockDB();
    this.claudeApiKey = process.env.CLAUDE_API_KEY;
    this.claudeApiUrl = 'https://api.anthropic.com/v1/messages';
    
    // 종목명 매핑 (기존 매핑 확장)
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

    // 분석 통계
    this.analysisStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      totalCost: 0
    };
  }

  /**
   * 메르 투자 분석 전용 Claude AI 프롬프트
   */
  generateAnalysisPrompt(ticker, companyName, blogContent) {
    return `당신은 전문 투자 분석가 메르(Merry)의 블로그 포스트를 분석하는 AI입니다.
주어진 텍스트에서 특정 종목에 대한 감정, 투자 논리, 그리고 구체적인 근거를 추출해주세요.

## 분석 대상
- 종목: ${ticker} (${companyName})
- 텍스트: ${blogContent}

## 분석 기준

### 1. 감정 분석 (Sentiment Analysis)
- **positive**: 명확한 긍정적 전망, 투자 추천, 성장 동력 언급
- **negative**: 명확한 부정적 전망, 매도 추천, 리스크 강조
- **neutral**: 관망, 중립적 분석, 단순 현황 설명, 추가 관찰 필요

### 2. 신뢰도 점수 (Confidence Score)
- **0.9-1.0**: 매우 명확한 투자 의견 (강력 추천/비추천)
- **0.7-0.8**: 명확한 방향성 (추천/비추천)
- **0.5-0.6**: 약간의 방향성 (약한 선호도)
- **0.3-0.4**: 애매하거나 중립적
- **0.1-0.2**: 매우 애매하거나 언급만

### 3. 투자 관점 분류
- **실적**: 매출, 영업이익, 성장률 등 재무 실적
- **전망**: 미래 사업 전망, 신사업, 시장 확장
- **리스크**: 위험 요인, 불확실성, 경쟁 심화
- **기회**: 새로운 기회, 시장 변화, 정책 수혜
- **밸류에이션**: 주가 수준, PER, 저평가/고평가

### 4. 메르의 특징적 투자 스타일
- 장기 투자 관점 중시
- 데이터와 논리 기반 분석
- 펀더멘털 중심 접근
- 구체적인 수치와 근거 제시
- 균형잡힌 시각 (장단점 모두 언급)

## 출력 형식 (JSON)
반드시 다음 JSON 형식으로 응답해주세요:

{
  "ticker": "${ticker}",
  "company_name": "${companyName}",
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0,
  "sentiment_score": -1.0,
  "analysis": {
    "investment_perspective": ["실적", "전망", "리스크", "기회", "밸류에이션"],
    "key_reasoning": "메르의 핵심 투자 논리 요약 (1-2문장)",
    "supporting_evidence": {
      "positive_factors": ["긍정 요인 1", "긍정 요인 2"],
      "negative_factors": ["부정 요인 1", "부정 요인 2"],
      "neutral_factors": ["중립 요인 1", "중립 요인 2"]
    },
    "key_keywords": ["핵심키워드1", "핵심키워드2", "핵심키워드3"],
    "context_quotes": ["구체적인 판단 근거가 되는 문장 1", "문장 2"],
    "investment_timeframe": "단기|중기|장기",
    "conviction_level": "높음|보통|낮음"
  },
  "metadata": {
    "mention_context": "언급 맥락 (실적 발표, 뉴스 반응, 시장 분석 등)",
    "analysis_focus": "분석의 주요 초점",
    "uncertainty_factors": ["불확실 요소 1", "불확실 요소 2"]
  }
}

## 추가 지침
1. 감정 판단시 메르의 어조와 표현을 정확히 파악하세요
2. 단순 언급과 투자 의견을 구분하세요
3. 구체적인 수치나 데이터가 언급되면 반드시 포함하세요
4. 메르의 투자 철학(장기 관점, 펀더멘털)을 고려하세요
5. 애매한 경우에는 보수적으로 판단하세요 (낮은 confidence)
6. context_quotes는 실제 텍스트에서 정확히 추출하세요`;
  }

  /**
   * Claude AI API 호출
   */
  async callClaudeAPI(prompt) {
    if (!this.claudeApiKey) {
      throw new Error('CLAUDE_API_KEY 환경 변수가 설정되지 않았습니다');
    }

    try {
      const response = await fetch(this.claudeApiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          temperature: 0.1, // 일관성을 위해 낮은 temperature
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // 비용 추적
      this.analysisStats.totalCost += this.estimateTokenCost(prompt, data.content[0].text);
      
      return data.content[0].text;
    } catch (error) {
      console.error('Claude AI API 호출 실패:', error);
      throw error;
    }
  }

  /**
   * 토큰 비용 추정 (대략적)
   */
  estimateTokenCost(input, output) {
    const inputTokens = Math.ceil(input.length / 4); // 대략적 토큰 계산
    const outputTokens = Math.ceil(output.length / 4);
    
    // Claude 3 Sonnet 가격 (2024년 기준)
    const inputCost = (inputTokens / 1000) * 0.003;  // $0.003 per 1K input tokens
    const outputCost = (outputTokens / 1000) * 0.015; // $0.015 per 1K output tokens
    
    return inputCost + outputCost;
  }

  /**
   * Claude AI 응답 파싱 및 검증
   */
  async parseClaudeResponse(responseText, ticker, companyName, originalText) {
    try {
      // JSON 추출 (마크다운 코드 블록 제거)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('JSON 응답을 찾을 수 없습니다');
      }

      const analysis = JSON.parse(jsonMatch[0].replace(/```json\n?/, '').replace(/\n?```/, ''));
      
      // 기본 검증
      if (!analysis.sentiment || !analysis.confidence) {
        throw new Error('필수 필드가 누락되었습니다');
      }

      // 추가 검증 및 개선
      return this.validateAndEnhanceAnalysis(analysis, originalText);
      
    } catch (error) {
      console.error('Claude 응답 파싱 실패:', error);
      return this.createFallbackAnalysis(ticker, companyName, originalText);
    }
  }

  /**
   * 분석 결과 검증 및 개선
   */
  validateAndEnhanceAnalysis(analysis, originalText) {
    // 신뢰도 점수 검증
    if (analysis.confidence > 0.8 && 
        (!analysis.analysis.context_quotes || analysis.analysis.context_quotes.length === 0)) {
      analysis.confidence = Math.max(0.4, analysis.confidence - 0.3);
    }

    // 감정과 근거의 일치성 검증
    const positiveCount = analysis.analysis.supporting_evidence.positive_factors?.length || 0;
    const negativeCount = analysis.analysis.supporting_evidence.negative_factors?.length || 0;

    if (analysis.sentiment === 'positive' && positiveCount === 0) {
      analysis.confidence = Math.min(analysis.confidence, 0.4);
    }
    
    if (analysis.sentiment === 'negative' && negativeCount === 0) {
      analysis.confidence = Math.min(analysis.confidence, 0.4);
    }

    // 감정 점수 계산
    if (analysis.sentiment === 'positive') {
      analysis.sentiment_score = Math.min(1.0, analysis.confidence);
    } else if (analysis.sentiment === 'negative') {
      analysis.sentiment_score = Math.max(-1.0, -analysis.confidence);
    } else {
      analysis.sentiment_score = 0.0;
    }

    return analysis;
  }

  /**
   * 실패시 기본 분석 결과 생성
   */
  createFallbackAnalysis(ticker, companyName, originalText) {
    return {
      ticker,
      company_name: companyName,
      sentiment: 'neutral',
      confidence: 0.1,
      sentiment_score: 0.0,
      analysis: {
        investment_perspective: [],
        key_reasoning: 'Claude AI 분석에 실패하여 기본값을 반환합니다.',
        supporting_evidence: {
          positive_factors: [],
          negative_factors: [],
          neutral_factors: ['분석 실패']
        },
        key_keywords: [],
        context_quotes: [],
        investment_timeframe: '불명',
        conviction_level: '낮음'
      },
      metadata: {
        mention_context: '분석 실패',
        analysis_focus: '분석 불가',
        uncertainty_factors: ['Claude API 오류']
      }
    };
  }

  /**
   * 6개월치 포스트 대상 배치 분석 실행
   */
  async analyzeSixMonthsPosts(maxPosts = 100) {
    console.log('🤖 Claude AI 기반 6개월치 감정 분석 시작...');
    console.log(`📊 최대 분석 포스트: ${maxPosts}개`);
    
    await this.stockDB.connect();

    try {
      // 6개월 전 날짜 계산
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateThreshold = sixMonthsAgo.toISOString().split('T')[0];

      // 6개월치 미분석 포스트 조회
      const unanalyzedPosts = await this.getSixMonthsUnanalyzedPosts(dateThreshold, maxPosts);
      console.log(`📈 6개월치 분석 대상 포스트: ${unanalyzedPosts.length}개`);

      if (unanalyzedPosts.length === 0) {
        console.log('✅ 분석할 새로운 포스트가 없습니다.');
        return;
      }

      let processedCount = 0;
      
      for (const post of unanalyzedPosts) {
        console.log(`\n🔍 [${processedCount + 1}/${unanalyzedPosts.length}] 분석 중: "${post.title}" (${post.created_date})`);
        
        // 포스트에서 언급된 종목들 찾기
        const mentionedStocks = this.findMentionedStocks(post.title + ' ' + post.content);
        
        if (mentionedStocks.length > 0) {
          console.log(`📈 발견된 종목: ${mentionedStocks.map(s => s.ticker).join(', ')}`);
          
          for (const stock of mentionedStocks) {
            try {
              // Claude AI로 감정 분석
              const prompt = this.generateAnalysisPrompt(
                stock.ticker,
                stock.name,
                post.title + '\n\n' + post.content
              );
              
              const claudeResponse = await this.callClaudeAPI(prompt);
              const analysis = await this.parseClaudeResponse(
                claudeResponse, 
                stock.ticker, 
                stock.name, 
                post.title + ' ' + post.content
              );
              
              // 확장된 데이터 구조로 저장
              await this.saveEnhancedSentimentResult(post.id, stock.ticker, analysis);
              
              console.log(`  ✅ ${stock.ticker}: ${analysis.sentiment} (신뢰도: ${(analysis.confidence * 100).toFixed(0)}%)`);
              console.log(`     💡 논리: ${analysis.analysis.key_reasoning}`);
              
              this.analysisStats.successful++;
              
              // API 제한을 위한 지연
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (error) {
              console.error(`  ❌ ${stock.ticker} 분석 실패:`, error.message);
              this.analysisStats.failed++;
            }
          }
          
          processedCount++;
          this.analysisStats.totalProcessed++;
        }
      }
      
      // 분석 통계 출력
      console.log('\n📊 Claude AI 감정 분석 완료');
      console.log(`✅ 성공: ${this.analysisStats.successful}개`);
      console.log(`❌ 실패: ${this.analysisStats.failed}개`);
      console.log(`💰 예상 비용: $${this.analysisStats.totalCost.toFixed(4)}`);
      
    } catch (error) {
      console.error('배치 분석 중 오류:', error);
    } finally {
      this.stockDB.close();
    }
  }

  /**
   * 6개월치 미분석 포스트 조회
   */
  async getSixMonthsUnanalyzedPosts(dateThreshold, limit = 100) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.all(`
        SELECT DISTINCT bp.id, bp.title, bp.content, bp.created_date
        FROM blog_posts bp
        WHERE bp.created_date >= ?
          AND bp.id NOT IN (
            SELECT DISTINCT post_id FROM sentiments
          )
        ORDER BY bp.created_date DESC
        LIMIT ?
      `, [dateThreshold, limit], (err, rows) => {
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
   * 확장된 감정 분석 결과 저장
   */
  async saveEnhancedSentimentResult(postId, ticker, analysis) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.run(`
        INSERT OR REPLACE INTO sentiments 
        (post_id, ticker, sentiment, sentiment_score, key_reasoning, 
         supporting_evidence, investment_perspective, investment_timeframe, 
         conviction_level, uncertainty_factors, mention_context, analysis_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
      `, [
        postId,
        ticker,
        analysis.sentiment,
        analysis.sentiment_score,
        analysis.analysis.key_reasoning,
        JSON.stringify(analysis.analysis.supporting_evidence),
        JSON.stringify(analysis.analysis.investment_perspective),
        analysis.analysis.investment_timeframe,
        analysis.analysis.conviction_level,
        JSON.stringify(analysis.metadata.uncertainty_factors),
        analysis.metadata.mention_context
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }
}

module.exports = ClaudeSentimentAnalyzer;