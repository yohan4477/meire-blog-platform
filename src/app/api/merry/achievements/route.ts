import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { measureApiCall, performanceMonitor } from '@/lib/monitoring/performance-monitor';

export async function GET(request: NextRequest) {
  return measureApiCall(async () => {
    const startTime = Date.now();
    console.log('🎯 Analyzing Merry\'s achievements and predictions...');

    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '500');
    
    // 메르의 전체 포스트 분석 (성능 모니터링 포함)
    const achievements = await analyzeMerryAchievements(limit);

    const response = NextResponse.json({
      success: true,
      data: {
        achievements,
        totalPosts: achievements.totalAnalyzed,
        lastUpdated: new Date().toISOString(),
        performanceMetrics: {
          responseTime: Date.now() - startTime,
          cacheStatus: 'no-cache'
        }
      }
    });

    // 개선된 캐시 전략: 데이터 특성에 따른 적절한 캐시
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, must-revalidate'); // 5분 캐시

    console.log(`✅ Achievements API completed in ${Date.now() - startTime}ms`);
    return response;

  }, 'achievements-api').catch(error => {
    console.error('메르 업적 분석 오류:', error);
    performanceMonitor.recordMetric({
      apiResponseTime: 0,
      errorRate: 1,
      timestamp: Date.now()
    });
    
    return NextResponse.json({
      success: false,
      error: { message: '메르 업적 분석 실패' }
    }, { status: 500 });
  });
}

async function analyzeMerryAchievements(limit: number) {
  try {
    // 메르 포스트 데이터 로드
    const merryPosts = await loadMerryPosts(limit);
    
    // 실제 직장 생활 썰 기반 업적 분석
    const achievements = {
      totalAnalyzed: merryPosts.length,
      corporateAchievements: [
        {
          title: "금융권 자산운용 전문가",
          description: "수십조원 규모 자산운용 실무 경험과 금융상품 개발",
          category: "career",
          period: "삼성 입사-현재",
          impact: "high",
          details: "삼성 신입사원 출신으로 거제도 지점부터 시작하여 본사 자산운용 부서까지, 실제 금융 현장 경험을 바탕으로 한 투자 인사이트 공유"
        },
        {
          title: "업무 프로세스 혁신상 수상",
          description: "인지세 전자납부 시스템 도입으로 한국은행 업무개선상 수상",
          category: "award",
          period: "대리 시절",
          impact: "high",
          details: "전국 금융기관의 인지세 납부 업무를 전산화로 혁신하여 수많은 직원들의 단순반복 업무를 없앤 공로로 한국은행 표창 수상"
        },
        {
          title: "역모기지(주택연금) 제도 설계 참여",
          description: "재경부 과장과의 면담을 통해 국내 주택연금 제도 설계에 기여",
          category: "research", 
          period: "2000년대 초반",
          impact: "high",
          details: "미국 모기지 시장 벤치마킹 보고서 작성 후 재경부와 협의, 현재 주택금융공사의 주택연금 제도 기반 설계에 참여"
        },
        {
          title: "예외승인 심사 전문가",
          description: "기준을 벗어나는 특수 투자건에 대한 정밀심사 업무 담당",
          category: "leadership",
          period: "차장급 시절",
          impact: "medium",
          details: "위험값 0.5% 범위에서 연간 500억원 손실 한도 내 예외승인 업무, 보수적 안전투자와 수익성 사이의 균형 유지"
        },
        {
          title: "현장 중심 투자 철학 확립",
          description: "재무제표보다 현장 실사를 중시하는 독특한 투자 분석 방법론",
          category: "research",
          period: "차장-부장급",
          impact: "high",
          details: "홍콩 현지 실사로 1조원 대출 부실기업 사전 발견, 돼지 축사 현장 방문 등 발로 뛰는 현장 중심 투자 분석 실천"
        }
      ],
      investmentPhilosophy: {
        core: "현장 실사 기반 리스크 관리 투자",
        principles: [
          "재무제표보다 현장이 우선 - 발로 뛰는 투자",
          "적절한 위험 수준 유지 (밴드 평가 0.1-5% 손실)",
          "하자 있는 저평가 우량주 발굴",
          "감정보다 논리와 근거 중심 의사결정",
          "조직 관리와 투자 분석의 균형"
        ]
      },
    };

    return achievements;

  } catch (error) {
    console.error('메르 업적 분석 실패:', error);
    throw error;
  }
}

async function loadMerryPosts(limit: number): Promise<any[]> {
  try {
    // 메르 포스트 JSON 파일 로드
    const dataPath = path.join(process.cwd(), 'data', 'stock-mentions-count.json');
    
    if (!fs.existsSync(dataPath)) {
      return [];
    }

    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const stockData = JSON.parse(fileContent);
    
    // 모든 종목의 포스트 수집
    const allPosts: any[] = [];
    
    stockData.forEach((stock: any) => {
      if (stock.recentPosts && stock.recentPosts.length > 0) {
        allPosts.push(...stock.recentPosts.map((post: any) => ({
          ...post,
          ticker: stock.ticker,
          stockName: stock.stockName
        })));
      }
    });

    // 날짜순 정렬 후 limit 적용
    allPosts.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
    
    return allPosts.slice(0, limit);

  } catch (error) {
    console.error('메르 포스트 로드 실패:', error);
    return [];
  }
}