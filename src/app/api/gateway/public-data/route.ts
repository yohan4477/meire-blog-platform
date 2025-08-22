/**
 * 공공데이터 통합 API 엔드포인트
 * GET /api/gateway/public-data?type=nps&params=...
 * GET /api/gateway/public-data?type=krx&params=...
 * GET /api/gateway/public-data?type=fss&params=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAPIGateway } from '@/lib/api-gateway/gateway';
import { z } from 'zod';

// 요청 파라미터 스키마
const QuerySchema = z.object({
  type: z.enum(['nps', 'krx', 'fss']),
  format: z.enum(['json', 'csv']).optional().default('json'),
  
  // 공통 파라미터
  pageNo: z.coerce.number().optional().default(1),
  numOfRows: z.coerce.number().optional().default(100),
  
  // NPS 특화 파라미터
  basDt: z.string().optional(), // 기준일자 (YYYYMMDD)
  fundNm: z.string().optional(), // 펀드명
  
  // KRX 특화 파라미터
  mrktCls: z.enum(['KOSPI', 'KOSDAQ', 'KONEX']).optional(), // 시장구분
  
  // FSS 특화 파라미터
  corp_code: z.string().optional(), // 회사코드
  bgn_de: z.string().optional(), // 시작일자
  end_de: z.string().optional(), // 종료일자
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 쿼리 파라미터 파싱
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    
    const validatedParams = QuerySchema.parse(searchParams);
    
    // Client ID 생성
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';

    const gateway = getAPIGateway();
    let result;

    // 데이터 타입에 따른 API 호출
    switch (validatedParams.type) {
      case 'nps':
        result = await gateway.getNPSInvestmentData({
          pageNo: validatedParams.pageNo,
          numOfRows: Math.min(validatedParams.numOfRows, 1000), // 최대 1000개 제한
          basDt: validatedParams.basDt,
          fundNm: validatedParams.fundNm,
        }, clientId);
        break;

      case 'krx':
        result = await gateway.getKRXMarketData({
          pageNo: validatedParams.pageNo,
          numOfRows: Math.min(validatedParams.numOfRows, 1000),
          basDt: validatedParams.basDt,
          mrktCls: validatedParams.mrktCls,
        }, clientId);
        break;

      case 'fss':
        result = await gateway.getFSSDisclosureData({
          page_no: validatedParams.pageNo,
          page_count: Math.min(validatedParams.numOfRows, 100), // FSS는 최대 100개
          corp_code: validatedParams.corp_code,
          bgn_de: validatedParams.bgn_de,
          end_de: validatedParams.end_de,
        }, clientId);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: 'Invalid data type. Must be one of: nps, krx, fss'
          }
        }, { status: 400 });
    }

    // 응답 헤더 설정
    const headers = new Headers({
      'Content-Type': validatedParams.format === 'csv' ? 'text/csv' : 'application/json',
      'X-Processing-Time': `${Date.now() - startTime}ms`,
      'X-Request-ID': result.metadata.requestId,
      'X-Data-Source': result.metadata.dataSource,
      'X-Cached': result.metadata.cached.toString(),
      'X-Data-Type': validatedParams.type.toUpperCase(),
    });

    // Rate limit 정보 헤더 추가
    if (result.metadata.rateLimit) {
      headers.set('X-RateLimit-Remaining', result.metadata.rateLimit.remaining.toString());
      headers.set('X-RateLimit-Reset', result.metadata.rateLimit.resetTime);
    }

    // CSV 형식 응답
    if (validatedParams.format === 'csv' && result.success && result.data) {
      const csvData = convertToCSV(result.data, validatedParams.type);
      return new NextResponse(csvData, { headers });
    }

    // JSON 응답에 추가 메타데이터 포함
    if (result.success && result.data) {
      (result as any).metadata = {
        ...result.metadata,
        dataType: validatedParams.type,
        totalRecords: Array.isArray(result.data) ? result.data.length : 1,
        pagination: {
          page: validatedParams.pageNo,
          size: validatedParams.numOfRows,
          hasMore: Array.isArray(result.data) && result.data.length === validatedParams.numOfRows
        }
      };
    }

    const status = result.success ? 200 : getErrorStatus(result.error?.code);
    return NextResponse.json(result, { status, headers });

  } catch (error) {
    console.error('Public data API error:', error);
    
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

// POST 엔드포인트 - 복잡한 쿼리나 배치 처리용
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // 배치 요청 스키마
    const BatchSchema = z.object({
      requests: z.array(z.object({
        type: z.enum(['nps', 'krx', 'fss']),
        params: z.record(z.string(), z.any()).optional().default({}),
        id: z.string().optional() // 요청 식별자
      })).max(10) // 최대 10개 배치 요청
    });

    const validatedBody = BatchSchema.parse(body);
    
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';

    const gateway = getAPIGateway();
    
    // 배치 요청 병렬 처리
    const batchResults = await Promise.allSettled(
      validatedBody.requests.map(async (req, index) => {
        const reqId = req.id || `batch_${index}`;
        
        try {
          let result;
          switch (req.type) {
            case 'nps':
              result = await gateway.getNPSInvestmentData(req.params, `${clientId}_${reqId}`);
              break;
            case 'krx':
              result = await gateway.getKRXMarketData(req.params, `${clientId}_${reqId}`);
              break;
            case 'fss':
              result = await gateway.getFSSDisclosureData(req.params, `${clientId}_${reqId}`);
              break;
          }
          
          return {
            id: reqId,
            type: req.type,
            ...result
          };
        } catch (error) {
          return {
            id: reqId,
            type: req.type,
            success: false,
            error: {
              code: 'BATCH_REQUEST_FAILED',
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
      })
    );

    // 결과 정리
    const results = batchResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const request = validatedBody.requests[index];
        return {
          id: request?.id || `batch_${index}`,
          type: request?.type || 'unknown',
          success: false,
          error: {
            code: 'BATCH_REQUEST_REJECTED',
            message: result.reason.message || 'Request was rejected'
          }
        };
      }
    });

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount > 0,
      batchResults: results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      },
      metadata: {
        requestId: `batch_${Date.now()}`,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        dataSource: 'gateway_batch',
        cached: false
      }
    });

  } catch (error) {
    console.error('Public data batch API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'BATCH_ERROR',
        message: 'Batch request processing failed',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

// 헬퍼 함수들

function convertToCSV(data: any[], dataType: string): string {
  if (!Array.isArray(data) || data.length === 0) return '';
  
  // 데이터 타입별 컬럼 순서 정의
  const columnOrders: Record<string, string[]> = {
    nps: ['dataDate', 'fundCode', 'fundName', 'stockCode', 'stockName', 'shares', 'marketValue', 'ratio'],
    krx: ['dataDate', 'marketType', 'stockCode', 'stockName', 'closingPrice', 'volume', 'marketCap'],
    fss: ['disclosureId', 'companyCode', 'companyName', 'disclosureType', 'disclosureTitle', 'disclosureDate']
  };

  const preferredOrder = columnOrders[dataType] || Object.keys(data[0]);
  const allColumns = Array.from(new Set([...preferredOrder, ...Object.keys(data[0])]));
  
  const csvRows = [
    allColumns.join(','),
    ...data.map(row => 
      allColumns.map(col => {
        const value = row[col];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}

function getErrorStatus(errorCode?: string): number {
  switch (errorCode) {
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    case 'INVALID_TYPE':
    case 'INVALID_PARAMETERS':
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