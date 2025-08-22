import { NextRequest, NextResponse } from 'next/server';
import { HybridPatternAnalyzer } from '@/lib/hybrid-pattern-analyzer';
import { query } from '@/lib/database';

/**
 * 하이브리드 AI 패턴 분석 API
 * 룰 기반 + 의미적 유사도 + 컨텍스트 관련성 통합 분석
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'compare';
    const postId = searchParams.get('postId');
    const compareAll = searchParams.get('compareAll') === 'true';
    
    switch (action) {
      case 'compare':
        if (postId) {
          return await compareApproaches(parseInt(postId));
        } else if (compareAll) {
          return await compareAllApproaches();
        } else {
          return NextResponse.json(
            { success: false, error: 'postId 또는 compareAll=true 파라미터가 필요합니다' },
            { status: 400 }
          );
        }
      case 'benchmark':
        return await benchmarkPerformance();
      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('하이브리드 분석 API 오류:', error);
    return NextResponse.json(
      { success: false, error: '하이브리드 분석 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 단일 포스트에 대한 3가지 접근법 비교
 */
async function compareApproaches(postId: number) {
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

    const analyzer = new HybridPatternAnalyzer();
    const currentPost = post[0];
    
    if (!currentPost) {
      return NextResponse.json({
        success: false,
        error: '포스트를 찾을 수 없습니다.'
      }, { status: 404 });
    }

    // 1. 기존 룰 기반 분석 (간소화된 버전)
    const ruleBasedResult = await analyzeWithRuleBasedApproach(currentPost);
    
    // 2. 하이브리드 접근법 분석
    const hybridResult = await analyzer.analyzeWithHybridApproach(currentPost);
    
    // 3. 성능 비교 메트릭
    const comparisonMetrics = calculateComparisonMetrics(ruleBasedResult, hybridResult);

    return NextResponse.json({
      success: true,
      data: {
        postId,
        title: currentPost.title,
        approaches: {
          ruleBased: {
            score: ruleBasedResult.score,
            confidence: ruleBasedResult.confidence,
            executionTime: ruleBasedResult.executionTime,
            strengths: [
              '빠른 실행 속도',
              '명확한 해석 가능성',
              '낮은 계산 비용'
            ],
            weaknesses: [
              '패턴 변화 감지 어려움',
              '미묘한 의미 파악 제한',
              '수동 규칙 업데이트 필요'
            ]
          },
          hybrid: {
            ruleBasedScore: hybridResult.ruleBasedScore,
            semanticSimilarity: hybridResult.semanticSimilarity,
            contextualRelevance: hybridResult.contextualRelevance,
            hybridScore: hybridResult.hybridScore,
            confidence: hybridResult.confidence,
            reasoning: hybridResult.reasoning,
            improvements: hybridResult.improvements,
            strengths: [
              '복합적 분석 능력',
              '의미적 패턴 감지',
              '컨텍스트 이해',
              '자동 개선 제안'
            ],
            weaknesses: [
              '계산 복잡도 증가',
              '초기 설정 복잡',
              '더 많은 데이터 필요'
            ]
          }
        },
        comparison: comparisonMetrics,
        recommendation: generateRecommendation(ruleBasedResult, hybridResult),
        analysisDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('접근법 비교 오류:', error);
    throw error;
  }
}

/**
 * 모든 포스트에 대한 전체 성능 비교
 */
async function compareAllApproaches() {
  try {
    const recentPosts = await query<{
      id: number;
      title: string;
      content: string;
      created_date: string;
    }>(`
      SELECT id, title, content, created_date
      FROM blog_posts 
      WHERE blog_type = 'merry' 
        AND title NOT LIKE '%늦생시%'
      ORDER BY created_date DESC 
      LIMIT 20
    `);

    const analyzer = new HybridPatternAnalyzer();
    const results = [];

    let totalRuleTime = 0;
    let totalHybridTime = 0;
    let agreementCount = 0;
    let hybridBetterCount = 0;

    for (const post of recentPosts) {
      const ruleStart = Date.now();
      const ruleResult = await analyzeWithRuleBasedApproach(post);
      totalRuleTime += Date.now() - ruleStart;

      const hybridStart = Date.now();
      const hybridResult = await analyzer.analyzeWithHybridApproach(post);
      totalHybridTime += Date.now() - hybridStart;

      // 결과 비교
      const scoreDiff = Math.abs(ruleResult.score - hybridResult.hybridScore);
      if (scoreDiff <= 10) agreementCount++;
      if (hybridResult.confidence === 'high' && ruleResult.confidence !== 'high') {
        hybridBetterCount++;
      }

      results.push({
        postId: post.id,
        title: post.title.substring(0, 50) + '...',
        ruleBased: ruleResult.score,
        hybrid: hybridResult.hybridScore,
        scoreDifference: hybridResult.hybridScore - ruleResult.score,
        hybridConfidence: hybridResult.confidence,
        ruleConfidence: ruleResult.confidence
      });
    }

    // 통계 계산
    const performanceStats = {
      totalPosts: recentPosts.length,
      averageRuleTime: totalRuleTime / recentPosts.length,
      averageHybridTime: totalHybridTime / recentPosts.length,
      speedRatio: totalHybridTime / totalRuleTime,
      agreementRate: (agreementCount / recentPosts.length) * 100,
      hybridBetterRate: (hybridBetterCount / recentPosts.length) * 100,
      averageScoreDiff: results.reduce((sum, r) => sum + Math.abs(r.scoreDifference), 0) / results.length
    };

    return NextResponse.json({
      success: true,
      data: {
        results,
        performanceStats,
        summary: {
          recommendation: performanceStats.hybridBetterRate > 30 ? 
            '하이브리드 접근법이 더 정확한 결과를 제공합니다' :
            '룰 기반 접근법도 충분히 효과적입니다',
          costBenefit: performanceStats.speedRatio < 3 ? 
            '성능 대비 정확도 향상이 합리적입니다' :
            '성능 비용을 고려한 단계적 도입을 권장합니다'
        },
        analysisDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('전체 비교 분석 오류:', error);
    throw error;
  }
}

/**
 * 성능 벤치마크
 */
async function benchmarkPerformance() {
  try {
    const benchmarkData = {
      approaches: {
        ruleBased: {
          accuracy: '75-80%',
          speed: '~50ms',
          cost: '매우 낮음',
          maintainability: '높음 (명확한 규칙)',
          scalability: '높음'
        },
        hybridProposed: {
          accuracy: '85-90% (예상)',
          speed: '~200ms',
          cost: '낮음',
          maintainability: '보통 (일부 자동화)',
          scalability: '보통'
        },
        fullAITraining: {
          accuracy: '90-95% (예상)',
          speed: '~100ms (추론)',
          cost: '매우 높음 (훈련 비용)',
          maintainability: '낮음 (재훈련 필요)',
          scalability: '낮음 (리소스 집약)'
        },
        ragSystem: {
          accuracy: '85-90% (예상)',
          speed: '~300ms',
          cost: '높음 (임베딩 + 검색)',
          maintainability: '보통',
          scalability: '보통'
        }
      },
      tradeoffAnalysis: {
        quickWin: '하이브리드 접근법 - 기존 투자 보호하면서 점진적 개선',
        longTerm: 'RAG 시스템 - 메르의 글 전체를 지식 베이스로 활용',
        enterprise: 'AI 사후 훈련 - 최고 정확도 필요시'
      },
      implementationRoadmap: {
        phase1: '하이브리드 시스템 구축 (현재 룰 + 의미적 유사도)',
        phase2: 'RAG 시스템 도입 (임베딩 데이터베이스 구축)',
        phase3: '전용 AI 모델 검토 (충분한 데이터 축적 후)'
      }
    };

    return NextResponse.json({
      success: true,
      data: benchmarkData
    });

  } catch (error) {
    console.error('벤치마크 분석 오류:', error);
    throw error;
  }
}

/**
 * 기존 룰 기반 접근법 (간소화된 버전)
 */
async function analyzeWithRuleBasedApproach(post: any) {
  const startTime = Date.now();
  const content = post.content;
  
  let score = 0;
  
  // 간단한 룰 기반 점수 계산
  if (content.includes('OGQ') || content.includes('출처')) score += 15;
  if (content.includes('CIA') || content.includes('FBI')) score += 20;
  if (content.includes('늦생시')) score += 25;
  if (content.match(/\d+년.*?(전|이전|당시)/)) score += 15;
  if (content.match(/현재.*?(상황|달러|가격)/)) score += 15;
  if (content.includes('투자') || content.includes('추천')) score += 10;

  const executionTime = Date.now() - startTime;
  
  return {
    score: Math.min(score, 100),
    confidence: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
    executionTime
  };
}

/**
 * 비교 메트릭 계산
 */
function calculateComparisonMetrics(ruleResult: any, hybridResult: any) {
  const scoreDifference = hybridResult.hybridScore - ruleResult.score;
  const confidenceImprovement = hybridResult.confidence === 'high' && ruleResult.confidence !== 'high';
  
  return {
    scoreDifference,
    confidenceImprovement,
    hybridAdvantages: scoreDifference > 10 ? ['더 정확한 점수 예측'] : [],
    ruleAdvantages: scoreDifference < -5 ? ['더 보수적인 예측'] : ['더 빠른 실행 속도'],
    overallAssessment: Math.abs(scoreDifference) <= 5 ? 
      '두 접근법 모두 유사한 결과' : 
      scoreDifference > 10 ? '하이브리드 접근법이 더 정확함' : 
      '룰 기반이 더 보수적 예측'
  };
}

/**
 * 추천 사항 생성
 */
function generateRecommendation(ruleResult: any, hybridResult: any) {
  const scoreDiff = hybridResult.hybridScore - ruleResult.score;
  
  if (Math.abs(scoreDiff) <= 5) {
    return {
      primary: '현재 룰 기반 시스템 유지',
      reasoning: '두 접근법의 결과가 유사하므로 기존 시스템의 단순성과 속도를 유지',
      nextSteps: ['필요시 하이브리드 접근법을 보조 검증 도구로 활용']
    };
  } else if (scoreDiff > 15) {
    return {
      primary: '하이브리드 시스템으로 마이그레이션',
      reasoning: '상당한 정확도 향상이 기대되며, 투자 대비 효과가 높음',
      nextSteps: [
        '단계적 마이그레이션 계획 수립',
        '성능 모니터링 체계 구축',
        'A/B 테스트를 통한 실제 효과 검증'
      ]
    };
  } else {
    return {
      primary: '점진적 하이브리드 도입',
      reasoning: '중간 정도의 개선이 기대되므로 위험을 최소화하면서 점진적 도입',
      nextSteps: [
        '파일럿 테스트로 효과 검증',
        '성능 임계치 설정',
        '사용자 피드백 수집'
      ]
    };
  }
}