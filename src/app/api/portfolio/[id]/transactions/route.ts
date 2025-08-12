import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioTransactions, addTransaction } from '@/lib/portfolio-db';
import { AddTransactionRequest, ApiResponse } from '@/types';

// 포트폴리오 거래 내역 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

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

    const transactions = await getPortfolioTransactions(portfolioId, limit);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: transactions,
      meta: {
        totalCount: transactions.length,
        limit: limit,
        requestId: crypto.randomUUID(),
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('Transactions GET error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'TRANSACTIONS_FETCH_ERROR',
        message: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 새 거래 내역 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);
    const body: AddTransactionRequest = await request.json();

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

    if (!['buy', 'sell'].includes(body.transaction_type)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_TRANSACTION_TYPE',
          message: 'Transaction type must be buy or sell',
          field: 'transaction_type',
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

    if (!body.price || body.price <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_PRICE',
          message: 'Price must be greater than 0',
          field: 'price',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!body.transaction_date) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'INVALID_TRANSACTION_DATE',
          message: 'Transaction date is required',
          field: 'transaction_date',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const transaction = await addTransaction(portfolioId, body);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: transaction,
      message: 'Transaction added successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Transactions POST error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Cannot sell stock not in portfolio')) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            code: 'STOCK_NOT_IN_PORTFOLIO',
            message: 'Cannot sell stock not in portfolio',
            timestamp: new Date().toISOString()
          }
        }, { status: 400 });
      }
      
      if (error.message.includes('Cannot sell more shares than owned')) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            code: 'INSUFFICIENT_SHARES',
            message: 'Cannot sell more shares than owned',
            timestamp: new Date().toISOString()
          }
        }, { status: 400 });
      }
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'TRANSACTION_CREATE_ERROR',
        message: 'Failed to add transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}