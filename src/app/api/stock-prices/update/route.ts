import { NextRequest, NextResponse } from 'next/server';
import { getStockPriceService, updatePortfolioPrices } from '@/lib/stock-price-service';
import { ApiResponse } from '@/types';

// 주가 업데이트 (수동 트리거)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portfolio_id, symbols } = body;

    const stockPriceService = getStockPriceService();

    if (portfolio_id) {
      // 특정 포트폴리오의 주가 업데이트
      await updatePortfolioPrices(portfolio_id);
      
      return NextResponse.json<ApiResponse>({
        success: true,
        message: `Stock prices updated for portfolio ${portfolio_id}`,
        data: { portfolio_id, updated_at: new Date().toISOString() }
      });

    } else if (symbols && Array.isArray(symbols)) {
      // 특정 심볼들의 주가 업데이트
      const quotes = await stockPriceService.getMultipleStockQuotes(symbols);
      
      return NextResponse.json<ApiResponse>({
        success: true,
        message: `Stock prices updated for ${quotes.length} symbols`,
        data: {
          symbols,
          quotes,
          updated_at: new Date().toISOString()
        }
      });

    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Either portfolio_id or symbols array is required',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Stock price update error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'PRICE_UPDATE_ERROR',
        message: 'Failed to update stock prices',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 주가 서비스 상태 확인
export async function GET(request: NextRequest) {
  try {
    const stockPriceService = getStockPriceService();
    const providerStatus = stockPriceService.getProviderStatus();
    const cacheSize = stockPriceService.getCacheSize();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        providers: providerStatus,
        cache_size: cacheSize,
        status: 'operational',
        last_check: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Stock price service status error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'SERVICE_STATUS_ERROR',
        message: 'Failed to get service status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}