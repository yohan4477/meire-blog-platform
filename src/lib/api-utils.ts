import { NextResponse } from 'next/server';
import { ApiResponse, ApiError, ApiMeta } from '@/types';

/**
 * Standardized API Response Utilities
 * Provides consistent response formatting across all API endpoints
 */

// Generate unique request ID for tracking
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create standardized success response
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: ApiMeta,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    meta: {
      ...meta,
      requestId: generateRequestId(),
      processingTime: performance.now()
    }
  };

  return NextResponse.json(response, { status });
}

// Create standardized error response
export function createErrorResponse(
  error: string | Error | ApiError,
  statusCode: number = 500,
  code?: string,
  field?: string
): NextResponse<ApiResponse<null>> {
  let apiError: ApiError;

  if (typeof error === 'string') {
    apiError = {
      code: code || getErrorCodeFromStatus(statusCode),
      message: error,
      statusCode,
      timestamp: new Date().toISOString(),
      field
    };
  } else if (error instanceof Error) {
    apiError = {
      code: code || 'INTERNAL_ERROR',
      message: error.message,
      details: error.stack,
      statusCode,
      timestamp: new Date().toISOString(),
      field
    };
  } else {
    apiError = {
      ...error,
      timestamp: error.timestamp || new Date().toISOString(),
      statusCode: error.statusCode || statusCode
    };
  }

  const response: ApiResponse<null> = {
    success: false,
    error: apiError,
    meta: {
      requestId: generateRequestId(),
      processingTime: performance.now()
    }
  };

  return NextResponse.json(response, { status: statusCode });
}

// Get standard error codes from HTTP status
function getErrorCodeFromStatus(statusCode: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT'
  };

  return codes[statusCode] || 'UNKNOWN_ERROR';
}

// Validation error response helper
export function createValidationErrorResponse(
  field: string,
  message: string
): NextResponse<ApiResponse<null>> {
  return createErrorResponse(message, 422, 'VALIDATION_ERROR', field);
}

// Database error response helper
export function createDatabaseErrorResponse(
  error: Error
): NextResponse<ApiResponse<null>> {
  console.error('Database Error:', error);
  
  // Don't expose database details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Database operation failed'
    : error.message;

  return createErrorResponse(message, 500, 'DATABASE_ERROR');
}

// Rate limiting error response
export function createRateLimitErrorResponse(
  retryAfter?: number
): NextResponse<ApiResponse<null>> {
  const response = createErrorResponse(
    'Rate limit exceeded. Please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED'
  );

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

// Authentication error response
export function createAuthErrorResponse(
  message: string = 'Authentication required'
): NextResponse<ApiResponse<null>> {
  return createErrorResponse(message, 401, 'UNAUTHORIZED');
}

// Not found error response
export function createNotFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse<null>> {
  return createErrorResponse(`${resource} not found`, 404, 'NOT_FOUND');
}

// Pagination metadata helper
export function createPaginationMeta(
  totalCount: number,
  limit: number,
  offset: number
): ApiMeta {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    totalCount,
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    limit,
    offset
  };
}

// Performance monitoring wrapper
export async function withPerformanceMonitoring<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    if (operationName && process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${operationName}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    if (operationName) {
      console.error(`[PERF] ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
    }
    
    throw error;
  }
}

// Request validation helper
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): string | null {
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      return `${field} is required`;
    }
  }
  return null;
}

// Security headers helper
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}