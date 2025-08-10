import { NextRequest, NextResponse } from 'next/server';
import { getCachedScionHoldings, getWhaleWisdomClient } from '@/lib/whalewisdom';
import { getSmartCachedScionHoldings, forceRefreshScionHoldings, getCacheStatus } from '@/lib/smartCache';
import { createMockScionData } from '@/lib/mockData';
import { ScionPortfolio } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const forceRefresh = searchParams.get('refresh') === 'true';
    const debug = searchParams.get('debug') === 'true';
    const useMock = searchParams.get('mock') === 'true';

    console.log('Fetching Scion Asset Management holdings...');

    // Debug mode - return cache status
    if (debug) {
      const cacheStatus = await getCacheStatus();
      return NextResponse.json({
        success: true,
        debug: true,
        cacheStatus,
        message: 'Cache status information'
      });
    }

    let holdings: ScionPortfolio | null;

    // Mock mode for development/testing
    if (useMock) {
      console.log('🎭 Using mock data for development');
      holdings = createMockScionData();
    } else if (forceRefresh) {
      console.log('Force refresh requested...');
      holdings = await forceRefreshScionHoldings();
    } else {
      // Use smart caching strategy
      holdings = await getSmartCachedScionHoldings();
    }

    // Fallback to mock data if API fails
    if (!holdings) {
      console.log('⚠️ API failed, using mock data as fallback');
      holdings = createMockScionData();
      
      // Mark as fallback data
      holdings.filerName = '국민연금 (Demo Data)';
    }

    // Apply limit if specified
    let responseData = holdings;
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        responseData = {
          ...holdings,
          holdings: holdings.holdings.slice(0, limitNum)
        };
      }
    }

    // Add CORS headers for potential frontend requests
    const response = NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        totalHoldings: holdings.holdings.length,
        limitApplied: limit ? parseInt(limit) : null,
        lastUpdated: holdings.lastUpdated,
        quarter: holdings.quarter,
        totalPortfolioValue: holdings.totalValue,
      }
    });

    // Set cache headers
    response.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return response;

  } catch (error) {
    console.error('API Error fetching Scion holdings:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      },
      { status: 500 }
    );
  }
}

// POST endpoint for manual data refresh (optional)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'refresh') {
      console.log('Manual refresh triggered via POST');
      const client = getWhaleWisdomClient();
      const holdings = await client.getScionHoldings();

      if (!holdings) {
        return NextResponse.json(
          { error: 'Failed to refresh Scion holdings data' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Scion holdings data refreshed successfully',
        data: holdings,
        refreshedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: refresh' },
      { status: 400 }
    );

  } catch (error) {
    console.error('POST API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      },
      { status: 500 }
    );
  }
}