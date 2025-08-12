import { NextRequest, NextResponse } from 'next/server';
import { 
  generatePortfolioRecommendations, 
  getRecommendations,
  applyRecommendation,
  ignoreRecommendation 
} from '@/lib/portfolio-recommendations';
import { ApiResponse } from '@/types';

// 포트폴리오 추천 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    if (isNaN(portfolioId)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_PORTFOLIO_ID',
          message: 'Invalid portfolio ID',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const recommendations = await getRecommendations(portfolioId, status);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: recommendations,
      meta: {
        totalCount: recommendations.length,
        requestId: crypto.randomUUID(),
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('Recommendations GET error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'RECOMMENDATIONS_FETCH_ERROR',
        message: 'Failed to fetch recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 새 추천 생성 (AI 분석)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);

    if (isNaN(portfolioId)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_PORTFOLIO_ID',
          message: 'Invalid portfolio ID',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // AI 분석을 통한 추천 생성
    const recommendations = await generatePortfolioRecommendations(portfolioId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: recommendations,
      message: `Generated ${recommendations.length} recommendations`,
      meta: {
        totalCount: recommendations.length,
        requestId: crypto.randomUUID(),
        processingTime: Date.now()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Recommendations POST error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'RECOMMENDATIONS_CREATE_ERROR',
        message: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 추천 상태 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);
    const body = await request.json();
    const { recommendation_id, action } = body;

    if (isNaN(portfolioId)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_PORTFOLIO_ID',
          message: 'Invalid portfolio ID',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!recommendation_id || !action) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'recommendation_id and action are required',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!['apply', 'ignore'].includes(action)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be "apply" or "ignore"',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // 추천 상태 업데이트
    if (action === 'apply') {
      await applyRecommendation(recommendation_id);
    } else {
      await ignoreRecommendation(recommendation_id);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Recommendation ${action === 'apply' ? 'applied' : 'ignored'} successfully`,
      data: {
        recommendation_id,
        action,
        status: action === 'apply' ? 'applied' : 'ignored',
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Recommendations PATCH error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'RECOMMENDATION_UPDATE_ERROR',
        message: 'Failed to update recommendation',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}