/**
 * 고급 보안 미들웨어 시스템
 * Rate limiting, Input validation, Authentication, Authorization을 통합 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 보안 설정 인터페이스
export interface SecurityConfig {
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  cors: {
    origins: string[];
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
  };
  validation: {
    maxBodySize: number;
    sanitizeInput: boolean;
    allowXSS: boolean;
  };
  authentication: {
    required: boolean;
    allowAnonymous: string[];
  };
}

// Rate Limiting 관리자
export class RateLimitManager {
  private static instance: RateLimitManager;
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private blockedIPs: Set<string> = new Set();

  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  // Rate limit 확인
  checkRateLimit(
    identifier: string,
    config: SecurityConfig['rateLimit']
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    // IP가 차단되었는지 확인
    if (this.blockedIPs.has(identifier)) {
      return { allowed: false, remaining: 0, resetTime: now + config.windowMs };
    }

    // 첫 번째 요청이거나 윈도우가 리셋된 경우
    if (!record || now >= record.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    // 제한 초과 확인
    if (record.count >= config.maxRequests) {
      // 지속적인 남용 시 IP 차단
      if (record.count > config.maxRequests * 3) {
        this.blockIP(identifier, 60 * 60 * 1000); // 1시간 차단
      }
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    // 요청 수 증가
    record.count++;
    this.requests.set(identifier, record);

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  // IP 차단
  private blockIP(ip: string, durationMs: number): void {
    this.blockedIPs.add(ip);
    setTimeout(() => {
      this.blockedIPs.delete(ip);
    }, durationMs);
  }

  // 수동 IP 차단
  blockIPManually(ip: string, durationMs?: number): void {
    this.blockedIPs.add(ip);
    if (durationMs) {
      setTimeout(() => {
        this.blockedIPs.delete(ip);
      }, durationMs);
    }
  }

  // 통계 정보
  getStats(): {
    totalRequests: number;
    blockedIPs: number;
    activeWindows: number;
  } {
    return {
      totalRequests: Array.from(this.requests.values()).reduce((sum, record) => sum + record.count, 0),
      blockedIPs: this.blockedIPs.size,
      activeWindows: this.requests.size,
    };
  }
}

// 입력 검증 관리자
export class InputValidationManager {
  // XSS 방지
  static sanitizeHtml(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // SQL Injection 패턴 감지
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(UNION\s+SELECT)/i,
      /('|")\s*;\s*--/i,
      /('|")\s*;\s*\/\*/i,
      /(OR|AND)\s+\d+\s*=\s*\d+/i,
      /('|")\s*(OR|AND)\s+('|")/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // NoSQL Injection 감지
  static detectNoSQLInjection(input: any): boolean {
    if (typeof input === 'object' && input !== null) {
      const jsonString = JSON.stringify(input);
      const nosqlPatterns = [
        /\$where/i,
        /\$regex/i,
        /\$ne/i,
        /\$gt/i,
        /\$lt/i,
        /\$in/i,
        /\$nin/i,
        /javascript:/i,
      ];
      
      return nosqlPatterns.some(pattern => pattern.test(jsonString));
    }
    
    if (typeof input === 'string') {
      return this.detectSQLInjection(input);
    }
    
    return false;
  }

  // 파일 업로드 검증
  static validateFileUpload(file: File, config: {
    maxSize: number;
    allowedTypes: string[];
    allowedExtensions: string[];
  }): { valid: boolean; error?: string } {
    // 파일 크기 확인
    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `파일 크기가 ${config.maxSize / (1024 * 1024)}MB를 초과합니다.`,
      };
    }

    // MIME 타입 확인
    if (!config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: '허용되지 않는 파일 형식입니다.',
      };
    }

    // 확장자 확인
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !config.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: '허용되지 않는 파일 확장자입니다.',
      };
    }

    return { valid: true };
  }

  // 범용 입력 검증
  static validateInput(input: any, schema: z.ZodSchema): {
    valid: boolean;
    data?: any;
    errors?: string[];
  } {
    try {
      const validatedData = schema.parse(input);
      return { valid: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        };
      }
      return {
        valid: false,
        errors: ['입력 검증 중 오류가 발생했습니다.'],
      };
    }
  }
}

// CORS 관리자
export class CORSManager {
  static handleCORS(request: NextRequest, config: SecurityConfig['cors']): NextResponse | null {
    const origin = request.headers.get('origin');
    const method = request.method;

    // Preflight 요청 처리
    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      
      // Origin 확인
      if (origin && (config.origins.includes(origin) || config.origins.includes('*'))) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      
      response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      response.headers.set('Access-Control-Max-Age', '86400');
      
      return response;
    }

    // 실제 요청 CORS 헤더 설정은 응답에서 처리
    return null;
  }

  static setCORSHeaders(response: NextResponse, config: SecurityConfig['cors'], origin?: string): void {
    if (origin && (config.origins.includes(origin) || config.origins.includes('*'))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

// 인증 관리자
export class AuthenticationManager {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24시간

  // JWT 토큰 검증
  static async verifyJWT(token: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
    try {
      // 실제 구현에서는 jose 또는 jsonwebtoken 라이브러리 사용
      const [header, payload, signature] = token.split('.');
      
      if (!header || !payload || !signature) {
        return { valid: false, error: '잘못된 토큰 형식' };
      }

      const decodedPayload = JSON.parse(atob(payload));
      
      // 만료 시간 확인
      if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
        return { valid: false, error: '토큰이 만료됨' };
      }

      return { valid: true, payload: decodedPayload };
    } catch (error) {
      return { valid: false, error: '토큰 검증 실패' };
    }
  }

  // API 키 검증
  static verifyAPIKey(apiKey: string): { valid: boolean; metadata?: any } {
    // 환경변수에서 유효한 API 키 목록 가져오기
    const validAPIKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
    if (validAPIKeys.includes(apiKey)) {
      return {
        valid: true,
        metadata: {
          keyType: 'standard',
          rateLimit: 1000,
        },
      };
    }

    return { valid: false };
  }

  // 세션 검증
  static verifySession(sessionId: string): { valid: boolean; userId?: string; error?: string } {
    // 실제 구현에서는 Redis 또는 데이터베이스에서 세션 확인
    try {
      // Mock implementation
      if (sessionId.startsWith('sess_')) {
        return {
          valid: true,
          userId: 'user_123',
        };
      }
      
      return { valid: false, error: '유효하지 않은 세션' };
    } catch (error) {
      return { valid: false, error: '세션 검증 실패' };
    }
  }
}

// 보안 미들웨어 팩토리
export class SecurityMiddlewareFactory {
  static create(config: SecurityConfig) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const rateLimiter = RateLimitManager.getInstance();
      const clientIP = this.getClientIP(request);
      const userAgent = request.headers.get('user-agent') || '';

      try {
        // 1. CORS 처리
        const corsResponse = CORSManager.handleCORS(request, config.cors);
        if (corsResponse) {
          return corsResponse;
        }

        // 2. Rate Limiting
        const rateCheck = rateLimiter.checkRateLimit(clientIP, config.rateLimit);
        if (!rateCheck.allowed) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              resetTime: rateCheck.resetTime,
            },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': config.rateLimit.maxRequests.toString(),
                'X-RateLimit-Remaining': rateCheck.remaining.toString(),
                'X-RateLimit-Reset': rateCheck.resetTime.toString(),
                'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
              },
            }
          );
        }

        // 3. 보안 헤더 설정
        const response = await this.processRequest(request, config);
        
        this.setSecurityHeaders(response);
        
        // Rate limit 헤더 추가
        response.headers.set('X-RateLimit-Limit', config.rateLimit.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', rateCheck.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateCheck.resetTime.toString());

        // CORS 헤더 설정
        const origin = request.headers.get('origin');
        if (origin) {
          CORSManager.setCORSHeaders(response, config.cors, origin);
        }

        return response;

      } catch (error) {
        console.error('Security middleware error:', error);
        
        return NextResponse.json(
          { error: 'Internal security error' },
          { status: 500 }
        );
      }
    };
  }

  // 요청 처리
  private static async processRequest(
    request: NextRequest,
    config: SecurityConfig
  ): Promise<NextResponse> {
    // 4. 인증 확인
    if (config.authentication.required) {
      const authResult = await this.checkAuthentication(request);
      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: 'Authentication required', details: authResult.error },
          { status: 401 }
        );
      }
    }

    // 5. 입력 검증
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      const validationResult = await this.validateRequestBody(request, config.validation);
      if (!validationResult.valid) {
        return NextResponse.json(
          {
            error: 'Input validation failed',
            details: validationResult.errors,
          },
          { status: 400 }
        );
      }
    }

    // 6. 다음 미들웨어 또는 핸들러로 진행
    return NextResponse.next();
  }

  // 클라이언트 IP 추출
  private static getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.ip;

    return forwardedFor?.split(',')[0] || realIP || clientIP || 'unknown';
  }

  // 인증 확인
  private static async checkAuthentication(request: NextRequest): Promise<{
    authenticated: boolean;
    userId?: string;
    error?: string;
  }> {
    // Bearer Token 확인
    const authorization = request.headers.get('authorization');
    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice(7);
      const jwtResult = await AuthenticationManager.verifyJWT(token);
      
      if (jwtResult.valid) {
        return {
          authenticated: true,
          userId: jwtResult.payload?.userId,
        };
      }
    }

    // API Key 확인
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      const apiKeyResult = AuthenticationManager.verifyAPIKey(apiKey);
      if (apiKeyResult.valid) {
        return {
          authenticated: true,
          userId: 'api_user',
        };
      }
    }

    // 세션 쿠키 확인
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) {
      const sessionResult = AuthenticationManager.verifySession(sessionCookie);
      if (sessionResult.valid) {
        return {
          authenticated: true,
          userId: sessionResult.userId,
        };
      }
    }

    return {
      authenticated: false,
      error: 'No valid authentication method found',
    };
  }

  // 요청 본문 검증
  private static async validateRequestBody(
    request: NextRequest,
    config: SecurityConfig['validation']
  ): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const body = await request.json();
        
        // Body 크기 확인
        const bodySize = JSON.stringify(body).length;
        if (bodySize > config.maxBodySize) {
          return {
            valid: false,
            errors: [`요청 본문 크기가 최대 허용 크기(${config.maxBodySize} bytes)를 초과합니다.`],
          };
        }

        // XSS 및 SQL Injection 검사
        const errors: string[] = [];
        this.validateObjectRecursive(body, errors, config);
        
        if (errors.length > 0) {
          return { valid: false, errors };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: ['요청 본문 파싱 실패'],
      };
    }
  }

  // 객체 재귀적 검증
  private static validateObjectRecursive(
    obj: any,
    errors: string[],
    config: SecurityConfig['validation'],
    path: string = ''
  ): void {
    if (typeof obj === 'string') {
      // SQL Injection 검사
      if (InputValidationManager.detectSQLInjection(obj)) {
        errors.push(`SQL Injection 패턴이 감지됨: ${path}`);
      }

      // XSS 검사 (필요시)
      if (!config.allowXSS && /<script|javascript:|on\w+=/i.test(obj)) {
        errors.push(`XSS 패턴이 감지됨: ${path}`);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.validateObjectRecursive(item, errors, config, `${path}[${index}]`);
      });
    } else if (obj && typeof obj === 'object') {
      // NoSQL Injection 검사
      if (InputValidationManager.detectNoSQLInjection(obj)) {
        errors.push(`NoSQL Injection 패턴이 감지됨: ${path}`);
      }

      Object.entries(obj).forEach(([key, value]) => {
        this.validateObjectRecursive(value, errors, config, path ? `${path}.${key}` : key);
      });
    }
  }

  // 보안 헤더 설정
  private static setSecurityHeaders(response: NextResponse): void {
    // HSTS (HTTP Strict Transport Security)
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // XSS Protection
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Content Type Options
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // Frame Options
    response.headers.set('X-Frame-Options', 'DENY');
    
    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
    );
    
    // Permissions Policy
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );
  }
}

// 기본 보안 설정
export const defaultSecurityConfig: SecurityConfig = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15분
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  cors: {
    origins: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  },
  validation: {
    maxBodySize: 1024 * 1024, // 1MB
    sanitizeInput: true,
    allowXSS: false,
  },
  authentication: {
    required: false,
    allowAnonymous: ['/api/health', '/api/public'],
  },
};

// 높은 보안 수준 설정
export const highSecurityConfig: SecurityConfig = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15분
    maxRequests: 50,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  cors: {
    origins: [], // 특정 도메인만 허용
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit'],
  },
  validation: {
    maxBodySize: 512 * 1024, // 512KB
    sanitizeInput: true,
    allowXSS: false,
  },
  authentication: {
    required: true,
    allowAnonymous: ['/api/health'],
  },
};

// 편의 함수들
export function createSecurityMiddleware(config?: Partial<SecurityConfig>) {
  const finalConfig = { ...defaultSecurityConfig, ...config };
  return SecurityMiddlewareFactory.create(finalConfig);
}

export function createHighSecurityMiddleware(config?: Partial<SecurityConfig>) {
  const finalConfig = { ...highSecurityConfig, ...config };
  return SecurityMiddlewareFactory.create(finalConfig);
}

export default SecurityMiddlewareFactory;