import { NextRequest, NextResponse } from 'next/server';
import { 
  getNPSComparison, 
  getLatestNPSData, 
  getPortfolioOutperformance,
  initializeNPSSampleData 
} from '@/lib/nps-service';
import { getPortfolio } from '@/lib/portfolio-db';
import { ApiResponse } from '@/types';

// NPS 성과 비교 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as '1m' | '3m' | '6m' | '1y' | '3y' | '5y' || '1y';

    if (isNaN(portfolioId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PORTFOLIO_ID',
            message: 'Invalid portfolio ID',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    // 포트폴리오 정보 조회
    const portfolio = await getPortfolio(portfolioId);
    if (!portfolio) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'PORTFOLIO_NOT_FOUND',
            message: 'Portfolio not found',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // 포트폴리오 총 수익률 계산 (실제로는 복잡한 계산 필요)
    const portfolioReturn = portfolio.total_return_percent || 0;

    // NPS와 비교
    const comparison = await getNPSComparison(portfolioId, portfolioReturn, timeframe);
    const npsData = await getLatestNPSData();
    const outperformance = await getPortfolioOutperformance(portfolioId);

    // 요약 통계 계산
    const outperformingFunds = comparison.filter(c => c.is_outperforming).length;
    const totalFunds = comparison.length;
    const avgOutperformance = comparison.reduce((sum, c) => sum + c.outperformance, 0) / totalFunds;

    const summary = {
      portfolio_return: portfolioReturn,
      outperforming_funds: outperformingFunds,
      total_funds: totalFunds,
      outperformance_rate: (outperformingFunds / totalFunds) * 100,
      avg_outperformance: avgOutperformance,
      timeframe
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        summary,
        comparison,
        nps_data: npsData,
        historical_outperformance: outperformance,
        analysis_timestamp: new Date().toISOString()
      },
      meta: {
        portfolio_id: portfolioId,
        timeframe,
        comparison_count: comparison.length
      }
    });

  } catch (error) {
    console.error('NPS comparison error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'NPS_COMPARISON_ERROR',
          message: 'Failed to fetch NPS comparison',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

// NPS 데이터 초기화 및 업데이트
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const portfolioId = parseInt(id);
    const body = await request.json();
    const { action } = body;

    if (isNaN(portfolioId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PORTFOLIO_ID',
            message: 'Invalid portfolio ID',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    if (action === 'initialize_sample_data') {
      // 샘플 NPS 데이터 초기화
      await initializeNPSSampleData();
      
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'NPS sample data initialized successfully',
        data: {
          action: 'initialize_sample_data',
          initialized_at: new Date().toISOString()
        }
      });

    } else if (action === 'force_update') {
      // 강제 업데이트 (실제로는 외부 API에서 최신 데이터 가져오기)
      const portfolio = await getPortfolio(portfolioId);
      if (!portfolio) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'PORTFOLIO_NOT_FOUND',
              message: 'Portfolio not found',
              timestamp: new Date().toISOString()
            }
          },
          { status: 404 }
        );
      }

      const portfolioReturn = portfolio.total_return_percent || 0;
      const comparison = await getNPSComparison(portfolioId, portfolioReturn);

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'NPS comparison updated successfully',
        data: {
          action: 'force_update',
          comparison,
          updated_at: new Date().toISOString()
        }
      });

    } else {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Invalid action. Use "initialize_sample_data" or "force_update"',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('NPS comparison POST error:', error);
    
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'NPS_COMPARISON_UPDATE_ERROR',
          message: 'Failed to update NPS comparison',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}