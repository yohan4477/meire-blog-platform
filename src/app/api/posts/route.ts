import { NextRequest, NextResponse } from 'next/server';

/**
 * Posts API Route - DB connection disabled, using fallback data
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  // DB 연결 비활성화 - 더미 데이터 반환
  console.log('📝 Posts API: DB disabled, returning fallback data');
  
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10');
  const category = searchParams.get('category');
  
  const fallbackPosts = [
    {
      id: 1,
      title: "국민연금의 2025년 투자 전략 분석",
      content: "국민연금공단이 2025년 상반기에 보인 투자 전략의 변화를 분석해봅니다. NVIDIA와 Microsoft 비중 증가, Apple 안정적 유지 등 주요 포인트들을 살펴보겠습니다.",
      category: "투자분석",
      created_date: new Date().toISOString(),
      author: "요르",
      views: 1250
    },
    {
      id: 2,
      title: "글로벌 기관투자자 포트폴리오 비교",
      content: "버크셔 해서웨이, 타이거 글로벌, 시타델 등 주요 기관투자자들의 투자 성향과 포트폴리오 구성을 비교 분석합니다.",
      category: "시장분석",
      created_date: new Date(Date.now() - 86400000).toISOString(),
      author: "요르",
      views: 980
    },
    {
      id: 3,
      title: "13F 파일링으로 보는 기관투자 트렌드",
      content: "SEC 13F 파일링 데이터를 통해 발견한 2025년 기관투자 트렌드와 시사점을 정리했습니다.",
      category: "데이터분석",
      created_date: new Date(Date.now() - 172800000).toISOString(),
      author: "요르",
      views: 756
    },
    {
      id: 4,
      title: "AI 시대 투자 패러다임의 변화",
      content: "인공지능과 자동화 기술이 금융시장에 미치는 영향과 새로운 투자 기회를 탐색해봅니다.",
      category: "기술투자",
      created_date: new Date(Date.now() - 259200000).toISOString(),
      author: "요르",
      views: 892
    },
    {
      id: 5,
      title: "ESG 투자의 현재와 미래",
      content: "환경, 사회, 지배구조를 고려한 ESG 투자가 기관투자자들에게 미치는 영향을 분석합니다.",
      category: "ESG",
      created_date: new Date(Date.now() - 345600000).toISOString(),
      author: "요르",
      views: 634
    },
    {
      id: 6,
      title: "반도체 업계 투자 동향 분석",
      content: "NVIDIA, TSMC, ASML 등 주요 반도체 기업들의 투자 가치와 향후 전망을 살펴봅니다.",
      category: "업종분석",
      created_date: new Date(Date.now() - 432000000).toISOString(),
      author: "요르",
      views: 1156
    },
    {
      id: 7,
      title: "중국 시장 투자 리스크 평가",
      content: "지정학적 리스크와 규제 변화가 중국 투자에 미치는 영향을 심층 분석합니다.",
      category: "지역분석",
      created_date: new Date(Date.now() - 518400000).toISOString(),
      author: "요르",
      views: 445
    },
    {
      id: 8,
      title: "암호화폐 ETF 시장 전망",
      content: "비트코인 및 이더리움 ETF 승인 이후 암호화폐 시장의 변화와 전망을 살펴봅니다.",
      category: "암호화폐",
      created_date: new Date(Date.now() - 604800000).toISOString(),
      author: "요르",
      views: 1389
    }
  ];

  // 카테고리 필터링
  let filteredPosts = fallbackPosts;
  if (category && category !== 'all') {
    filteredPosts = fallbackPosts.filter(post => post.category === category);
  }

  // 제한 적용
  const limitedPosts = filteredPosts.slice(0, limit);

  return NextResponse.json({
    success: true,
    data: limitedPosts,
    meta: {
      total: filteredPosts.length,
      limit,
      offset: 0,
      category: category || 'all',
      note: 'Fallback data - DB connection disabled for stability'
    }
  });
}