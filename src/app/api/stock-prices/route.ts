import { NextRequest } from 'next/server';
import { getMultipleStockQuotes } from '@/lib/stock-api';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  addSecurityHeaders,
  withPerformanceMonitoring
} from '@/lib/api-utils';

/**
 * GET /api/stock-prices?symbols=AAPL,GOOGL,MSFT
 * Retrieve real-time stock prices for given symbols
 */
export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    const start = Date.now();
    try {
      const { searchParams } = new URL(request.url);
      const symbolsParam = searchParams.get('symbols');

      if (!symbolsParam) {
        return addSecurityHeaders(createValidationErrorResponse(
          'symbols',
          'Symbols parameter is required (e.g., ?symbols=AAPL,GOOGL,MSFT)'
        ));
      }

      // Parse and validate symbols
      const symbols = symbolsParam
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0 && /^[A-Z]{1,5}$/.test(s)); // Basic symbol validation

      if (symbols.length === 0) {
        return addSecurityHeaders(createValidationErrorResponse(
          'symbols',
          'No valid stock symbols provided'
        ));
      }

      if (symbols.length > 20) {
        return addSecurityHeaders(createValidationErrorResponse(
          'symbols',
          'Too many symbols requested (max 20)'
        ));
      }

      console.log(`📈 Stock price request for: ${symbols.join(', ')}`);

      // Fetch stock quotes
      const result = await getMultipleStockQuotes(symbols);

      if (!result.success) {
        return addSecurityHeaders(createErrorResponse(
          result.error || 'Failed to fetch stock prices',
          503,
          'STOCK_API_ERROR'
        ));
      }

      const message = result.data 
        ? `Retrieved prices for ${result.data.length} symbols${result.error ? ` (${result.error})` : ''}`
        : 'No price data available';

      return addSecurityHeaders(createSuccessResponse(
        result.data || [],
        message,
        {
          totalCount: result.data?.length || 0,
          processingTime: Date.now() - start
        } as any
      ));

    } catch (error) {
      console.error('Stock Prices API Error:', error);
      
      return addSecurityHeaders(createErrorResponse(
        'Failed to fetch stock prices',
        500,
        'INTERNAL_ERROR'
      ));
    }
  }, 'GET /api/stock-prices');
}

/**
 * POST /api/stock-prices
 * Batch stock price lookup with portfolio holdings
 * Body: { holdings: [{ name: string, symbol?: string }] }
 */
export async function POST(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    const start = Date.now();
    try {
      const body = await request.json();
      const { holdings } = body;

      if (!Array.isArray(holdings)) {
        return addSecurityHeaders(createValidationErrorResponse(
          'holdings',
          'Holdings must be an array'
        ));
      }

      if (holdings.length === 0) {
        return addSecurityHeaders(createValidationErrorResponse(
          'holdings',
          'Holdings array cannot be empty'
        ));
      }

      if (holdings.length > 50) {
        return addSecurityHeaders(createValidationErrorResponse(
          'holdings',
          'Too many holdings (max 50)'
        ));
      }

      // Extract symbols from holdings
      const symbols: string[] = [];
      
      for (const holding of holdings) {
        if (typeof holding.name !== 'string') {
          continue;
        }

        // Use provided symbol or try to extract from name
        let symbol = holding.symbol;
        
        if (!symbol) {
          // Try to extract symbol from holding name
          // Common patterns: "Apple Inc (AAPL)", "Microsoft Corporation", etc.
          const match = holding.name.match(/\(([A-Z]{1,5})\)/);
          if (match) {
            symbol = match[1];
          } else {
            // Skip holdings without identifiable symbols
            console.warn(`⚠️ No symbol found for holding: ${holding.name}`);
            continue;
          }
        }

        if (symbol && /^[A-Z]{1,5}$/.test(symbol)) {
          symbols.push(symbol.toUpperCase());
        }
      }

      if (symbols.length === 0) {
        return addSecurityHeaders(createErrorResponse(
          'No valid stock symbols found in holdings',
          400,
          'NO_SYMBOLS_FOUND'
        ));
      }

      console.log(`📊 Portfolio price lookup for: ${symbols.join(', ')}`);

      // Fetch stock quotes
      const result = await getMultipleStockQuotes(symbols);

      if (!result.success) {
        return addSecurityHeaders(createErrorResponse(
          result.error || 'Failed to fetch portfolio prices',
          503,
          'STOCK_API_ERROR'
        ));
      }

      return addSecurityHeaders(createSuccessResponse(
        result.data || [],
        `Retrieved prices for ${result.data?.length || 0} symbols from portfolio`,
        {
          totalCount: result.data?.length || 0,
          processingTime: Date.now() - start
        } as any
      ));

    } catch (error) {
      console.error('Portfolio Prices API Error:', error);
      
      if (error instanceof SyntaxError) {
        return addSecurityHeaders(createValidationErrorResponse(
          'body',
          'Invalid JSON in request body'
        ));
      }
      
      return addSecurityHeaders(createErrorResponse(
        'Failed to process portfolio price request',
        500,
        'INTERNAL_ERROR'
      ));
    }
  }, 'POST /api/stock-prices');
}