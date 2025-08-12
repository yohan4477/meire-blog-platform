import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioDashboard } from '@/lib/portfolio-db';
import { ApiResponse } from '@/types';

// 포트폴리오 대시보드 데이터 조회
export async function GET(
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

    const dashboard = await getPortfolioDashboard(portfolioId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: dashboard,
      meta: {
        requestId: crypto.randomUUID(),
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('Portfolio dashboard GET error:', error);
    
    if (error instanceof Error && error.message === 'Portfolio not found') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'PORTFOLIO_NOT_FOUND',
          message: 'Portfolio not found',
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'DASHBOARD_FETCH_ERROR',
        message: 'Failed to fetch portfolio dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}