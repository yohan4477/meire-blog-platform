import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

/**
 * 메르 추천 패턴 학습 API
 * "늦생시" 포스트들을 분석하여 패턴 학습 및 새 포스트 추천 가능성 예측
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'analyze';
    const postId = searchParams.get('postId');
    
    switch (action) {
      case 'analyze':
        return await analyzeRecommendationPatterns();
      case 'predict':
        if (!postId) {
          return NextResponse.json(
            { success: false, error: 'postId 파라미터가 필요합니다' },
            { status: 400 }
          );
        }
        return await predictRecommendationProbability(parseInt(postId));
      case 'patterns':
        return await getLearnedPatterns();
      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('패턴 학습 API 오류:', error);
    return NextResponse.json(
      { success: false, error: '패턴 학습 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * "늦생시" 포스트들의 추천 패턴 분석
 */
async function analyzeRecommendationPatterns() {
  try {
    // 늦생시 포스트들 조회
    const lateStartPosts = await query<{
      id: number;
      title: string;
      content: string;
      created_date: string;
    }>(`
      SELECT id, title, content, created_date
      FROM blog_posts 
      WHERE title LIKE '%늦생시%' 
      ORDER BY created_date DESC
    `);

    const patterns: any[] = [];
    const stockMentions: any[] = [];

    for (const post of lateStartPosts) {
      const analysis = await analyzePostPattern(post);
      patterns.push(analysis);
      
      // 종목 언급 추출
      const mentions = extractStockMentions(post.content);
      stockMentions.push(...mentions.map(m => ({
        ...m,
        postId: post.id,
        postTitle: post.title,
        postDate: post.created_date
      })));
    }

    // 패턴 요약 통계
    const patternSummary = {
      totalPosts: lateStartPosts.length,
      averageSourceCount: patterns.reduce((sum, p) => sum + p.sourceCount, 0) / patterns.length,
      averageConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
      commonSources: extractCommonSources(patterns),
      stockMentionFrequency: calculateStockFrequency(stockMentions),
      logicFlowPatterns: extractLogicFlowPatterns(patterns)
    };

    return NextResponse.json({
      success: true,
      data: {
        patterns,
        stockMentions,
        summary: patternSummary,
        analysisDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('패턴 분석 오류:', error);
    throw error;
  }
}

/**
 * 개별 포스트의 추천 가능성 예측
 */
async function predictRecommendationProbability(postId: number) {
  try {
    const post = await query<{
      id: number;
      title: string;
      content: string;
      created_date: string;
    }>('SELECT id, title, content, created_date FROM blog_posts WHERE id = ?', [postId]);

    if (post.length === 0) {
      return NextResponse.json(
        { success: false, error: '포스트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const analysis = await analyzePostPattern(post[0]);
    const probability = calculateRecommendationProbability(analysis);

    return NextResponse.json({
      success: true,
      data: {
        postId,
        title: post[0]?.title || 'Unknown',
        recommendationProbability: probability,
        analysis,
        prediction: {
          level: getProbabilityLevel(probability.total),
          confidence: probability.confidence,
          reasoning: probability.reasoning
        }
      }
    });

  } catch (error) {
    console.error('예측 오류:', error);
    throw error;
  }
}

/**
 * 학습된 패턴 정보 반환
 */
async function getLearnedPatterns() {
  try {
    const patterns = {
      sourcePatterns: {
        'OGQ (개인 저작물)': { frequency: 9, credibility: 7, description: '가장 자주 사용되는 출처' },
        '정부기관 (CIA, FBI)': { frequency: 7, credibility: 9, description: '최고 신뢰도 출처' },
        '언론사 (조선일보 등)': { frequency: 6, credibility: 8, description: '높은 신뢰도' },
        '기업 발표': { frequency: 5, credibility: 7, description: '종목별 차이' },
        '과거 글 인용': { frequency: 8, credibility: 6, description: '시간 연속성 구축' }
      },
      logicFlowPattern: {
        step1: '과거 언급',
        step2: '현재 상황', 
        step3: '미래 전망',
        step4: '투자 논리',
        description: '4단계 논리 전개 구조'
      },
      keywordPatterns: {
        high_confidence: ['늦생시', '한줄 코멘트', '기본가정'],
        medium_confidence: ['전망', '계획', '기대'],
        time_indicators: ['오랜기간', '언젠가', '짧은 시간'],
        recommendation_indicators: ['롱이고', '숏이다', '좋은 투자']
      },
      stockPatterns: {
        'PLTR': { frequency: 8, avgPrice: '67달러', confidence: 8 },
        'TMC': { frequency: 5, avgPrice: '5.59달러', confidence: 7 },
        'CRML': { frequency: 4, avgPrice: '4.34달러', confidence: 6 },
        '고려아연': { frequency: 6, confidence: 7 },
        '풍산': { frequency: 7, confidence: 8 }
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        patterns,
        lastUpdated: new Date().toISOString(),
        description: '메르의 "늦생시" 포스트 분석을 통해 학습된 추천 패턴'
      }
    });

  } catch (error) {
    console.error('패턴 조회 오류:', error);
    throw error;
  }
}

/**
 * 포스트 패턴 분석
 */
async function analyzePostPattern(post: any) {
  const content = post.content;
  
  // 출처 분석
  const sources = [];
  if (content.includes('OGQ')) sources.push({ type: 'personal', name: 'OGQ', credibility: 7 });
  if (content.includes('CIA') || content.includes('FBI')) sources.push({ type: 'government', name: 'CIA/FBI', credibility: 9 });
  if (content.includes('조선일보')) sources.push({ type: 'media', name: '조선일보', credibility: 8 });
  if (content.includes('블로그 글')) sources.push({ type: 'personal', name: '과거 글', credibility: 6 });

  // 논리 흐름 분석
  const historicalMentions = content.match(/\d+년.*?글을 썼다/g) || [];
  const currentSituation = content.match(/현재.*?달러/g) || [];
  const futureTrends = content.match(/미래.*?언젠가/g) || [];
  const investmentLogic = content.match(/한줄 코멘트.*?같다/g) || [];

  // 종목 언급 분석
  const stockMentions = extractStockMentions(content);

  // 확신도 계산
  let confidence = 5;
  if (content.includes('늦생시')) confidence += 3;
  if (content.includes('한줄 코멘트')) confidence += 2;
  if (sources.length >= 3) confidence += 2;
  if (stockMentions.length > 0) confidence += 1;

  return {
    postId: post.id,
    title: post.title,
    sourceCount: sources.length,
    sources,
    logicFlow: {
      historicalContext: historicalMentions.length,
      currentSituation: currentSituation.length,
      futureTrends: futureTrends.length,
      investmentLogic: investmentLogic.length
    },
    stockMentions,
    confidence: Math.min(confidence, 10),
    hasLateStartKeyword: content.includes('늦생시'),
    hasTimeFlow: historicalMentions.length > 0 && currentSituation.length > 0
  };
}

/**
 * 종목 언급 추출
 */
function extractStockMentions(content: string) {
  const stocks = [
    { ticker: 'PLTR', name: '팔란티어', pattern: /팔란티어.*?달러/g },
    { ticker: 'TMC', name: 'The Metals Company', pattern: /TMC.*?달러/g },
    { ticker: 'CRML', name: 'Critical Metals', pattern: /CRML.*?달러/g },
    { ticker: '181710', name: '고려아연', pattern: /고려아연.*?계약/g },
    { ticker: '103140', name: '풍산', pattern: /풍산.*?수주/g }
  ];

  const mentions: any[] = [];
  stocks.forEach(stock => {
    const matches = content.match(stock.pattern);
    if (matches) {
      mentions.push({
        ticker: stock.ticker,
        name: stock.name,
        mentions: matches.length,
        context: matches[0]
      });
    }
  });

  return mentions;
}

/**
 * 추천 가능성 점수 계산
 */
function calculateRecommendationProbability(analysis: any) {
  let score = 0;
  const reasoning: string[] = [];

  // 출처 다양성 (30점)
  const sourceScore = Math.min(analysis.sourceCount * 7, 30);
  score += sourceScore;
  reasoning.push(`출처 다양성: ${analysis.sourceCount}개 (${sourceScore}점)`);

  // 논리 흐름 완성도 (25점)
  const logicScore = Object.values(analysis.logicFlow).reduce((sum: number, count) => sum + (count as number), 0) * 3;
  const finalLogicScore = Math.min(logicScore, 25);
  score += finalLogicScore;
  reasoning.push(`논리 흐름: ${finalLogicScore}점`);

  // 늦생시 키워드 (20점)
  const keywordScore = analysis.hasLateStartKeyword ? 20 : 0;
  score += keywordScore;
  reasoning.push(`"늦생시" 키워드: ${keywordScore}점`);

  // 시간 흐름 (15점)
  const timeScore = analysis.hasTimeFlow ? 15 : 0;
  score += timeScore;
  reasoning.push(`시간 흐름: ${timeScore}점`);

  // 종목 언급 (10점)
  const stockScore = Math.min(analysis.stockMentions.length * 5, 10);
  score += stockScore;
  reasoning.push(`종목 언급: ${analysis.stockMentions.length}개 (${stockScore}점)`);

  return {
    total: Math.min(score, 100),
    breakdown: {
      sources: sourceScore,
      logic: finalLogicScore,
      keywords: keywordScore,
      timeFlow: timeScore,
      stocks: stockScore
    },
    confidence: analysis.confidence,
    reasoning
  };
}

/**
 * 확률 수준 계산
 */
function getProbabilityLevel(score: number): string {
  if (score >= 80) return '매우 높음';
  if (score >= 60) return '높음';
  if (score >= 40) return '보통';
  if (score >= 20) return '낮음';
  return '매우 낮음';
}

/**
 * 공통 출처 추출
 */
function extractCommonSources(patterns: any[]) {
  const sourceFreq: Record<string, number> = {};
  patterns.forEach(p => {
    p.sources.forEach((s: any) => {
      sourceFreq[s.name] = (sourceFreq[s.name] || 0) + 1;
    });
  });
  return Object.entries(sourceFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
}

/**
 * 종목 빈도 계산
 */
function calculateStockFrequency(mentions: any[]) {
  const freq: Record<string, number> = {};
  mentions.forEach(m => {
    freq[m.ticker] = (freq[m.ticker] || 0) + 1;
  });
  return Object.entries(freq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
}

/**
 * 논리 흐름 패턴 추출
 */
function extractLogicFlowPatterns(patterns: any[]) {
  const avgFlow = {
    historicalContext: 0,
    currentSituation: 0,
    futureTrends: 0,
    investmentLogic: 0
  };

  patterns.forEach(p => {
    Object.keys(avgFlow).forEach(key => {
      avgFlow[key as keyof typeof avgFlow] += p.logicFlow[key] || 0;
    });
  });

  Object.keys(avgFlow).forEach(key => {
    avgFlow[key as keyof typeof avgFlow] = avgFlow[key as keyof typeof avgFlow] / patterns.length;
  });

  return avgFlow;
}