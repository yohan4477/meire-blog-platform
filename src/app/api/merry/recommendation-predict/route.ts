import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

/**
 * 신규 포스트 추천 가능성 실시간 예측 API
 * 메르의 새로운 블로그 포스트가 종목 추천을 포함할 가능성을 예측
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'recent';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    switch (action) {
      case 'recent':
        return await predictRecentPosts(limit);
      case 'all':
        return await predictAllPosts();
      case 'high-probability':
        return await getHighProbabilityPosts();
      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('추천 예측 API 오류:', error);
    return NextResponse.json(
      { success: false, error: '추천 예측 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postIds } = body;
    
    if (!postIds || !Array.isArray(postIds)) {
      return NextResponse.json(
        { success: false, error: 'postIds 배열이 필요합니다' },
        { status: 400 }
      );
    }
    
    const predictions = await predictSpecificPosts(postIds);
    
    return NextResponse.json({
      success: true,
      data: predictions
    });
    
  } catch (error) {
    console.error('대량 예측 API 오류:', error);
    return NextResponse.json(
      { success: false, error: '대량 예측 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 최근 포스트들의 추천 가능성 예측
 */
async function predictRecentPosts(limit: number) {
  try {
    // 최근 포스트들 조회 (늦생시 제외하고 일반 포스트만)
    const recentPosts = await query<{
      id: number;
      title: string;
      content: string;
      created_date: string;
      views: number;
    }>(`
      SELECT id, title, content, created_date, views
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND title NOT LIKE '%늦생시%'
      ORDER BY created_date DESC 
      LIMIT ?
    `, [limit]);

    const predictions: any[] = [];

    for (const post of recentPosts) {
      const prediction = await analyzePostForRecommendation(post);
      predictions.push(prediction);
    }

    // 확률순으로 정렬
    predictions.sort((a, b) => b.probability.total - a.probability.total);

    return NextResponse.json({
      success: true,
      data: {
        predictions,
        summary: {
          totalAnalyzed: predictions.length,
          highProbability: predictions.filter(p => p.probability.total >= 60).length,
          mediumProbability: predictions.filter(p => p.probability.total >= 40 && p.probability.total < 60).length,
          lowProbability: predictions.filter(p => p.probability.total < 40).length,
          averageProbability: predictions.reduce((sum, p) => sum + p.probability.total, 0) / predictions.length
        },
        analyzedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('최근 포스트 예측 오류:', error);
    throw error;
  }
}

/**
 * 높은 확률의 추천 포스트들 조회
 */
async function getHighProbabilityPosts() {
  try {
    // 지난 30일간의 포스트들 분석
    const recentPosts = await query<{
      id: number;
      title: string;
      content: string;
      created_date: string;
      views: number;
    }>(`
      SELECT id, title, content, created_date, views
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND created_date >= datetime('now', '-30 days')
        AND title NOT LIKE '%늦생시%'
      ORDER BY created_date DESC
    `);

    const highProbabilityPosts: any[] = [];

    for (const post of recentPosts) {
      const prediction = await analyzePostForRecommendation(post);
      
      // 60% 이상 확률인 포스트만 선별
      if (prediction.probability.total >= 60) {
        highProbabilityPosts.push(prediction);
      }
    }

    // 확률순으로 정렬
    highProbabilityPosts.sort((a, b) => b.probability.total - a.probability.total);

    return NextResponse.json({
      success: true,
      data: {
        highProbabilityPosts,
        criteria: '추천 확률 60% 이상',
        period: '최근 30일',
        summary: {
          totalFound: highProbabilityPosts.length,
          averageProbability: highProbabilityPosts.reduce((sum, p) => sum + p.probability.total, 0) / (highProbabilityPosts.length || 1),
          topPost: highProbabilityPosts[0] || null
        }
      }
    });

  } catch (error) {
    console.error('고확률 포스트 조회 오류:', error);
    throw error;
  }
}

/**
 * 특정 포스트들의 추천 가능성 예측
 */
async function predictSpecificPosts(postIds: number[]) {
  try {
    const predictions: any[] = [];

    for (const postId of postIds) {
      const post = await query<{
        id: number;
        title: string;
        content: string;
        created_date: string;
        views: number;
      }>('SELECT id, title, content, created_date, views FROM blog_posts WHERE id = ?', [postId]);

      if (post.length > 0) {
        const prediction = await analyzePostForRecommendation(post[0]);
        predictions.push(prediction);
      }
    }

    return predictions;

  } catch (error) {
    console.error('특정 포스트 예측 오류:', error);
    throw error;
  }
}

/**
 * 모든 포스트 예측 (배치 처리용)
 */
async function predictAllPosts() {
  try {
    // 모든 일반 포스트 조회 (늦생시 제외)
    const allPosts = await query<{
      id: number;
      title: string;
      created_date: string;
    }>(`
      SELECT id, title, created_date
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND title NOT LIKE '%늦생시%'
      ORDER BY created_date DESC
    `);

    // 샘플링 (전체가 너무 많을 경우 최근 100개만)
    const samplePosts = allPosts.slice(0, 100);
    
    return NextResponse.json({
      success: true,
      data: {
        totalPosts: allPosts.length,
        sampledPosts: samplePosts.length,
        posts: samplePosts.map(post => ({
          id: post.id,
          title: post.title,
          created_date: post.created_date,
          analyzed: false // 실제 분석은 별도 요청으로
        })),
        message: '전체 분석은 /api/merry/pattern-learning?action=analyze 사용'
      }
    });

  } catch (error) {
    console.error('전체 포스트 조회 오류:', error);
    throw error;
  }
}

/**
 * 포스트 추천 가능성 분석
 */
async function analyzePostForRecommendation(post: any) {
  const content = post.content;
  
  // 1. 출처 패턴 분석 (30점)
  let sourceScore = 0;
  const sources: any[] = [];
  
  if (content.includes('OGQ') || content.includes('출처')) {
    sourceScore += 10;
    sources.push('출처 표기');
  }
  if (content.includes('CIA') || content.includes('FBI') || content.includes('국방부')) {
    sourceScore += 15;
    sources.push('정부기관');
  }
  if (content.includes('조선일보') || content.includes('연합뉴스')) {
    sourceScore += 10;
    sources.push('언론사');
  }
  if (content.includes('글을 썼다') || content.includes('블로그 글')) {
    sourceScore += 8;
    sources.push('과거 글 인용');
  }
  sourceScore = Math.min(sourceScore, 30);

  // 2. 논리 흐름 패턴 (25점)
  let logicScore = 0;
  const logicElements: string[] = [];
  
  if (content.match(/\d+년.*?(전|이전|당시)/)) {
    logicScore += 8;
    logicElements.push('과거 언급');
  }
  if (content.match(/현재.*?(상황|달러|가격)/)) {
    logicScore += 8;
    logicElements.push('현재 상황');
  }
  if (content.match(/(전망|미래|계획|예정|목표)/)) {
    logicScore += 6;
    logicElements.push('미래 전망');
  }
  if (content.includes('한줄 코멘트') || content.includes('투자') || content.includes('추천')) {
    logicScore += 8;
    logicElements.push('투자 논리');
  }
  logicScore = Math.min(logicScore, 25);

  // 3. 종목 언급 패턴 (20점)
  let stockScore = 0;
  const stockMentions: string[] = [];
  
  const stockPatterns = [
    { name: '팔란티어', pattern: /팔란티어|PLTR/i },
    { name: 'TMC', pattern: /TMC|The Metals Company/i },
    { name: 'CRML', pattern: /CRML|Critical Metals/i },
    { name: '고려아연', pattern: /고려아연/i },
    { name: '풍산', pattern: /풍산/i },
    { name: '테슬라', pattern: /테슬라|TSLA/i },
    { name: '엔비디아', pattern: /엔비디아|NVDA/i }
  ];
  
  stockPatterns.forEach(stock => {
    if (content.match(stock.pattern)) {
      stockScore += 3;
      stockMentions.push(stock.name);
    }
  });
  stockScore = Math.min(stockScore, 20);

  // 4. 시간 흐름 표현 (15점)
  let timeScore = 0;
  const timeElements: string[] = [];
  
  if (content.match(/\d+년 \d+월.*?\d+년 \d+월/)) {
    timeScore += 15;
    timeElements.push('구체적 시간 비교');
  } else if (content.match(/(당시|현재|이제|지금)/)) {
    timeScore += 8;
    timeElements.push('시간 표현');
  }

  // 5. 신뢰도 키워드 (10점)
  let keywordScore = 0;
  const keywords: string[] = [];
  
  if (content.includes('확실') || content.includes('분명')) {
    keywordScore += 5;
    keywords.push('확신 표현');
  }
  if (content.includes('전망') || content.includes('기대')) {
    keywordScore += 3;
    keywords.push('전망 표현');
  }
  if (content.includes('좋은') || content.includes('괜찮')) {
    keywordScore += 2;
    keywords.push('긍정 표현');
  }
  keywordScore = Math.min(keywordScore, 10);

  const totalScore = sourceScore + logicScore + stockScore + timeScore + keywordScore;

  // 추가 보너스 점수
  let bonusScore = 0;
  if (content.length > 2000) bonusScore += 3; // 긴 글 보너스
  if (post.views > 100) bonusScore += 2; // 높은 조회수 보너스

  const finalScore = Math.min(totalScore + bonusScore, 100);

  return {
    postId: post.id,
    title: post.title,
    created_date: post.created_date,
    views: post.views,
    probability: {
      total: finalScore,
      breakdown: {
        sources: sourceScore,
        logic: logicScore,
        stocks: stockScore,
        timeFlow: timeScore,
        keywords: keywordScore,
        bonus: bonusScore
      },
      level: getProbabilityLevel(finalScore)
    },
    analysis: {
      sources,
      logicElements,
      stockMentions,
      timeElements,
      keywords,
      contentLength: content.length,
      hasNumbers: content.match(/\d+/g)?.length || 0
    },
    recommendation: {
      isLikelyRecommendation: finalScore >= 60,
      confidence: finalScore >= 80 ? 'high' : finalScore >= 60 ? 'medium' : 'low',
      reasoning: generateReasoning(finalScore, sources, stockMentions, logicElements)
    }
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
 * 추천 근거 생성
 */
function generateReasoning(score: number, sources: string[], stocks: string[], logic: string[]): string {
  const reasons: string[] = [];
  
  if (sources.length >= 2) {
    reasons.push(`다양한 출처 활용 (${sources.join(', ')})`);
  }
  
  if (stocks.length > 0) {
    reasons.push(`구체적 종목 언급 (${stocks.join(', ')})`);
  }
  
  if (logic.length >= 3) {
    reasons.push('완전한 논리 구조');
  }
  
  if (score >= 80) {
    reasons.push('메르의 전형적인 추천 패턴과 매우 유사');
  } else if (score >= 60) {
    reasons.push('메르의 추천 패턴과 유사한 특징들 발견');
  }
  
  return reasons.join('; ') || '일반적인 블로그 포스트 패턴';
}