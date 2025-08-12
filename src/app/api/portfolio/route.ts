import { NextRequest, NextResponse } from 'next/server';
import { createPortfolio, getUserPortfolios } from '@/lib/portfolio-db';
import { CreatePortfolioRequest, ApiResponse } from '@/types';

// 포트폴리오 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const portfolios = await getUserPortfolios(parseInt(userId));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: portfolios,
      meta: {
        totalCount: portfolios.length,
        requestId: crypto.randomUUID(),
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('Portfolio GET error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'PORTFOLIO_FETCH_ERROR',
        message: 'Failed to fetch portfolios',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 새 포트폴리오 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, ...portfolioData }: { user_id: number } & CreatePortfolioRequest = body;

    if (!user_id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // 입력 데이터 검증
    if (!portfolioData.name || portfolioData.name.trim().length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_PORTFOLIO_NAME',
          message: 'Portfolio name is required',
          field: 'name',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!['conservative', 'balanced', 'aggressive', 'custom'].includes(portfolioData.investment_goal)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_INVESTMENT_GOAL',
          message: 'Invalid investment goal',
          field: 'investment_goal',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const portfolio = await createPortfolio(user_id, portfolioData);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: portfolio,
      message: 'Portfolio created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Portfolio POST error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'PORTFOLIO_CREATE_ERROR',
        message: 'Failed to create portfolio',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}