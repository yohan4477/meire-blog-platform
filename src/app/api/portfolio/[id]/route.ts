import { NextRequest, NextResponse } from 'next/server';
import { getPortfolio, updatePortfolio, deletePortfolio } from '@/lib/portfolio-db';
import { ApiResponse } from '@/types';

// 특정 포트폴리오 조회
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

    const portfolio = await getPortfolio(portfolioId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: portfolio
    });

  } catch (error) {
    console.error('Portfolio GET error:', error);
    
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
        code: 'PORTFOLIO_FETCH_ERROR',
        message: 'Failed to fetch portfolio',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 포트폴리오 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);
    const body = await request.json();

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

    const portfolio = await updatePortfolio(portfolioId, body);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: portfolio,
      message: 'Portfolio updated successfully'
    });

  } catch (error) {
    console.error('Portfolio PUT error:', error);
    
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
        code: 'PORTFOLIO_UPDATE_ERROR',
        message: 'Failed to update portfolio',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 포트폴리오 삭제
export async function DELETE(
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

    await deletePortfolio(portfolioId);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Portfolio deleted successfully'
    });

  } catch (error) {
    console.error('Portfolio DELETE error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'PORTFOLIO_DELETE_ERROR',
        message: 'Failed to delete portfolio',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}