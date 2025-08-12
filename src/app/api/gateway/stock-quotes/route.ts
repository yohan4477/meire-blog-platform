/**
 * 통합 주식 시세 API 엔드포인트
 * GET /api/gateway/stock-quotes?symbols=AAPL,MSFT,GOOGL
 * GET /api/gateway/stock-quotes/[symbol]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAPIGateway } from '@/lib/api-gateway/gateway';
import { z } from 'zod';

// 요청 파라미터 스키마
const QuerySchema = z.object({
  symbols: z.string().optional(),
  symbol: z.string().optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
  fields: z.string().optional(), // 특정 필드만 반환
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 쿼리 파라미터 파싱
    const url = new URL(request.url);
    const params = {
      symbols: url.searchParams.get('symbols') || undefined,
      symbol: url.searchParams.get('symbol') || undefined,
      format: url.searchParams.get('format') || 'json',
      fields: url.searchParams.get('fields') || undefined,
    };

    const validatedParams = QuerySchema.parse(params);
    
    // Client ID 생성 (IP 기반)
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';

    const gateway = getAPIGateway();

    let result;

    if (validatedParams.symbols) {
      // 여러 종목 시세 조회
      const symbolArray = validatedParams.symbols.split(',').map(s => s.trim().toUpperCase());
      
      if (symbolArray.length === 0 || symbolArray.length > 50) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_SYMBOLS',
            message: 'Symbols parameter must contain 1-50 valid stock symbols'
          }
        }, { status: 400 });
      }

      result = await gateway.getMultipleStockQuotes(symbolArray, clientId);
    } else if (validatedParams.symbol) {
      // 단일 종목 시세 조회
      const symbol = validatedParams.symbol.trim().toUpperCase();
      result = await gateway.getStockQuote(symbol, clientId);
    } else {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Either symbols or symbol parameter is required'
        }
      }, { status: 400 });
    }

    // 필드 필터링
    if (validatedParams.fields && result.success && result.data) {
      const requestedFields = validatedParams.fields.split(',').map(f => f.trim());
      
      if (Array.isArray(result.data)) {
        result.data = result.data.map(item => 
          filterFields(item, requestedFields)
        );
      } else {
        result.data = filterFields(result.data, requestedFields);
      }
    }

    // 응답 헤더 설정
    const headers = new Headers({
      'Content-Type': validatedParams.format === 'csv' ? 'text/csv' : 'application/json',
      'X-Processing-Time': `${Date.now() - startTime}ms`,
      'X-Request-ID': result.metadata.requestId,
      'X-Data-Source': result.metadata.dataSource,
      'X-Cached': result.metadata.cached.toString(),
    });

    // Rate limit 정보가 있으면 헤더에 추가
    if (result.metadata.rateLimit) {
      headers.set('X-RateLimit-Remaining', result.metadata.rateLimit.remaining.toString());
      headers.set('X-RateLimit-Reset', result.metadata.rateLimit.resetTime);
    }

    // CSV 형식 응답
    if (validatedParams.format === 'csv' && result.success && result.data) {
      const csvData = convertToCSV(Array.isArray(result.data) ? result.data : [result.data]);
      return new NextResponse(csvData, { headers });
    }

    // JSON 응답
    const status = result.success ? 200 : getErrorStatus(result.error?.code);
    return NextResponse.json(result, { status, headers });

  } catch (error) {
    console.error('Stock quotes API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error occurred',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      metadata: {
        requestId: `err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        dataSource: 'gateway',
        cached: false
      }
    }, { status: 500 });
  }
}

// 헬퍼 함수들

function filterFields(item: any, fields: string[]): any {
  if (!item || typeof item !== 'object') return item;
  
  const filtered: any = {};
  for (const field of fields) {
    if (field in item) {
      filtered[field] = item[field];
    }
  }
  return filtered;
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // CSV 특수문자 처리
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}

function getErrorStatus(errorCode?: string): number {
  switch (errorCode) {
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    case 'INVALID_SYMBOLS':
    case 'MISSING_PARAMETERS':
      return 400;
    case 'NOT_FOUND':
      return 404;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    default:
      return 500;
  }
}