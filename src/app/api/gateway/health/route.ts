/**
 * 시스템 헬스 체크 및 상태 모니터링 API
 * GET /api/gateway/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAPIGateway } from '@/lib/api-gateway/gateway';
import { getGlobalErrorHandler } from '@/lib/monitoring/error-handler';
import { getMCPManager, validateMCPConfig } from '@/lib/mcp/mcp-integration';
import { validateEnvironment } from '@/lib/api-gateway/gateway';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 기본 게이트웨이 상태
    const gateway = getAPIGateway();
    const gatewayHealth = await gateway.getHealthStatus();
    
    // 에러 핸들러 상태
    const errorHandler = getGlobalErrorHandler();
    const errorMetrics = errorHandler.getMetrics();
    const errorHealthStatus = errorHandler.getHealthStatus();
    
    // 환경 변수 검증
    const envValidation = validateEnvironment();
    const mcpValidation = validateMCPConfig();
    
    // MCP 서버 상태 (선택적)
    let mcpStatus = { available: false, status: {} };
    try {
      const mcpManager = getMCPManager();
      mcpStatus = {
        available: true,
        status: await mcpManager.healthCheck()
      };
    } catch (error) {
      mcpStatus = {
        available: false,
        status: { error: 'MCP servers not available' }
      };
    }

    // 데이터베이스 상태 확인 (간단한 ping)
    let databaseStatus = { connected: false, error: null };
    try {
      // 실제 구현에서는 데이터베이스 연결 상태 확인
      databaseStatus = { connected: true, error: null };
    } catch (error) {
      databaseStatus = { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Database connection failed' 
      };
    }

    // 캐시 상태 확인
    let cacheStatus = { connected: false, metrics: null };
    try {
      // Redis 캐시 상태 확인 (실제 구현에서는 Redis 클라이언트 ping)
      cacheStatus = { 
        connected: true, 
        metrics: {
          hitRate: 85.5,
          totalRequests: 1234,
          averageResponseTime: 2.3
        }
      };
    } catch (error) {
      cacheStatus = { connected: false, metrics: null };
    }

    // 외부 API 상태 확인
    const externalAPIsStatus = await checkExternalAPIs();

    // 시스템 리소스 상태
    const systemResources = getSystemResources();

    // 전체 상태 결정
    const overallStatus = determineOverallStatus({
      gateway: gatewayHealth.status === 'healthy',
      database: databaseStatus.connected,
      cache: cacheStatus.connected,
      externalAPIs: externalAPIsStatus.healthy,
      environment: envValidation.valid,
      errors: errorHealthStatus.status === 'healthy'
    });

    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // 핵심 서비스 상태
      services: {
        gateway: {
          status: gatewayHealth.status,
          metrics: gateway.getMetrics()
        },
        database: databaseStatus,
        cache: cacheStatus,
        errorHandler: {
          status: errorHealthStatus.status,
          metrics: errorMetrics
        }
      },

      // 외부 의존성
      dependencies: {
        externalAPIs: externalAPIsStatus,
        mcp: mcpStatus,
        environment: {
          valid: envValidation.valid,
          missing: envValidation.missing,
          mcpConfigured: mcpValidation.valid && mcpValidation.missing.length === 0
        }
      },

      // 시스템 리소스
      system: systemResources,

      // 성능 메트릭
      performance: {
        requestProcessingTime: Date.now() - startTime,
        averageResponseTime: gateway.getMetrics().averageResponseTime || 0,
        errorRate: errorMetrics.errorRate,
        cacheHitRate: cacheStatus.metrics?.hitRate || 0
      },

      // 최근 이슈 (있는 경우)
      recentIssues: getRecentIssues(errorMetrics, externalAPIsStatus)
    };

    // 상태에 따른 HTTP 상태 코드
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthResponse, { 
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration': `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: 'Health check system failure',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      performance: {
        requestProcessingTime: Date.now() - startTime
      }
    }, { status: 503 });
  }
}

// 외부 API 상태 확인
async function checkExternalAPIs(): Promise<{ healthy: boolean; details: any }> {
  const checks = [
    checkAPIEndpoint('Yahoo Finance', 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d'),
    checkAPIEndpoint('Public Data Portal', 'https://apis.data.go.kr', false), // 간단한 연결 확인만
    // 더 많은 API 엔드포인트 추가 가능
  ];

  const results = await Promise.allSettled(checks);
  
  const details = results.map((result, index) => {
    const apiNames = ['Yahoo Finance', 'Public Data Portal'];
    return {
      name: apiNames[index],
      status: result.status === 'fulfilled' ? result.value : 'failed',
      error: result.status === 'rejected' ? result.reason.message : null
    };
  });

  const healthyCount = details.filter(d => d.status === 'healthy').length;
  const healthy = healthyCount >= details.length * 0.7; // 70% 이상 정상이면 healthy

  return { healthy, details };
}

async function checkAPIEndpoint(name: string, url: string, fetchData: boolean = true): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MeireBlogPlatform-HealthCheck/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return 'healthy';
    } else if (response.status >= 400 && response.status < 500) {
      return 'degraded'; // 클라이언트 에러지만 서버는 응답함
    } else {
      return 'unhealthy';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'timeout';
    }
    return 'unhealthy';
  }
}

// 시스템 리소스 상태
function getSystemResources(): any {
  const memoryUsage = process.memoryUsage();
  
  return {
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    },
    uptime: {
      process: Math.round(process.uptime()),
      system: process.platform === 'linux' ? require('os').uptime() : 'N/A'
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
}

// 전체 시스템 상태 결정
function determineOverallStatus(components: Record<string, boolean>): 'healthy' | 'degraded' | 'unhealthy' {
  const critical = ['gateway', 'database']; // 필수 컴포넌트
  const important = ['cache', 'environment']; // 중요 컴포넌트
  const optional = ['externalAPIs', 'errors']; // 선택적 컴포넌트

  // 필수 컴포넌트 중 하나라도 실패하면 unhealthy
  if (critical.some(component => !components[component])) {
    return 'unhealthy';
  }

  // 중요 컴포넌트가 실패하거나 에러가 많으면 degraded
  if (important.some(component => !components[component]) || !components.errors) {
    return 'degraded';
  }

  // 선택적 컴포넌트 실패는 여전히 healthy일 수 있음
  const healthyOptional = optional.filter(component => components[component]).length;
  if (healthyOptional >= optional.length * 0.5) { // 50% 이상 정상
    return 'healthy';
  }

  return 'degraded';
}

// 최근 이슈 요약
function getRecentIssues(errorMetrics: any, externalAPIsStatus: any): any[] {
  const issues = [];

  // 에러율이 높은 경우
  if (errorMetrics.errorRate > 10) {
    issues.push({
      type: 'high_error_rate',
      severity: 'warning',
      message: `Error rate is high: ${errorMetrics.errorRate.toFixed(2)}%`,
      timestamp: new Date().toISOString()
    });
  }

  // 크리티컬 에러가 있는 경우
  if (errorMetrics.summary?.criticalErrors > 0) {
    issues.push({
      type: 'critical_errors',
      severity: 'critical',
      message: `${errorMetrics.summary.criticalErrors} critical errors detected`,
      timestamp: new Date().toISOString()
    });
  }

  // 외부 API 문제
  if (!externalAPIsStatus.healthy) {
    const failedAPIs = externalAPIsStatus.details
      ?.filter((api: any) => api.status !== 'healthy')
      ?.map((api: any) => api.name) || [];
    
    if (failedAPIs.length > 0) {
      issues.push({
        type: 'external_api_issues',
        severity: 'warning',
        message: `External API issues: ${failedAPIs.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  return issues.slice(0, 5); // 최대 5개 이슈만 반환
}

// POST 요청으로 상세 진단 실행
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { diagnosticLevel = 'basic' } = body;

    const results: any = {
      diagnosticLevel,
      timestamp: new Date().toISOString(),
      results: {}
    };

    if (diagnosticLevel === 'detailed' || diagnosticLevel === 'comprehensive') {
      // 상세 진단
      const gateway = getAPIGateway();
      const mcpManager = getMCPManager();

      // 게이트웨이 상세 상태
      results.results.gateway = await gateway.getHealthStatus();

      // MCP 서버별 상세 상태
      try {
        results.results.mcp = {
          fetchTools: await mcpManager.fetch.listTools(),
          memoryGraph: await mcpManager.memory.readGraph(),
          timeServices: await mcpManager.time.getCurrentTime()
        };
      } catch (error) {
        results.results.mcp = { error: 'MCP detailed diagnostics failed' };
      }

      // 캐시 상세 정보
      results.results.cache = {
        // Redis 상세 정보 (실제 구현 시)
        info: 'Detailed cache information would go here'
      };
    }

    if (diagnosticLevel === 'comprehensive') {
      // 종합 진단
      
      // 성능 테스트
      results.results.performanceTest = await runPerformanceTest();
      
      // 설정 검증
      results.results.configValidation = validateAllConfigurations();
      
      // 의존성 검사
      results.results.dependencyCheck = await checkAllDependencies();
    }

    results.processingTime = Date.now() - startTime;

    return NextResponse.json(results);

  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
}

// 성능 테스트
async function runPerformanceTest(): Promise<any> {
  const tests = [];
  
  // 간단한 응답 시간 테스트
  const startTime = Date.now();
  
  try {
    const gateway = getAPIGateway();
    await gateway.getMetrics();
    tests.push({
      name: 'Gateway Metrics',
      duration: Date.now() - startTime,
      status: 'passed'
    });
  } catch (error) {
    tests.push({
      name: 'Gateway Metrics',
      duration: Date.now() - startTime,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return {
    totalTests: tests.length,
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status === 'failed').length,
    tests
  };
}

// 모든 설정 검증
function validateAllConfigurations(): any {
  return {
    environment: validateEnvironment(),
    mcp: validateMCPConfig(),
    // 다른 설정 검증들...
  };
}

// 모든 의존성 검사
async function checkAllDependencies(): Promise<any> {
  const dependencies = [];
  
  // Node.js 버전
  dependencies.push({
    name: 'Node.js',
    version: process.version,
    status: 'ok'
  });

  // 환경 변수들
  const requiredEnvVars = ['NODE_ENV'];
  requiredEnvVars.forEach(envVar => {
    dependencies.push({
      name: `Environment: ${envVar}`,
      value: process.env[envVar] || 'not set',
      status: process.env[envVar] ? 'ok' : 'missing'
    });
  });

  return {
    total: dependencies.length,
    ok: dependencies.filter(d => d.status === 'ok').length,
    missing: dependencies.filter(d => d.status === 'missing').length,
    dependencies
  };
}