import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioHoldings, addHolding } from '@/lib/portfolio-db';
import { AddHoldingRequest, ApiResponse } from '@/types';

// 포트폴리오 보유 종목 조회
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

    const holdings = await getPortfolioHoldings(portfolioId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: holdings,
      meta: {
        totalCount: holdings.length,
        requestId: crypto.randomUUID(),
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('Holdings GET error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'HOLDINGS_FETCH_ERROR',
        message: 'Failed to fetch holdings',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 새 보유 종목 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);
    const body: AddHoldingRequest = await request.json();

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

    // 입력 데이터 검증
    if (!body.stock_symbol || body.stock_symbol.trim().length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_STOCK_SYMBOL',
          message: 'Stock symbol is required',
          field: 'stock_symbol',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!body.shares || body.shares <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_SHARES',
          message: 'Shares must be greater than 0',
          field: 'shares',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!body.purchase_price || body.purchase_price <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_PURCHASE_PRICE',
          message: 'Purchase price must be greater than 0',
          field: 'purchase_price',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!body.purchase_date) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_PURCHASE_DATE',
          message: 'Purchase date is required',
          field: 'purchase_date',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const holding = await addHolding(portfolioId, body);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: holding,
      message: 'Holding added successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Holdings POST error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'HOLDING_CREATE_ERROR',
        message: 'Failed to add holding',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}