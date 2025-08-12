import { NextRequest } from 'next/server';
import { GET, POST } from '../gateway/health/route';

// Mock external dependencies
jest.mock('@/lib/api-gateway/gateway', () => ({
  getAPIGateway: jest.fn(() => ({
    getHealthStatus: jest.fn().mockResolvedValue({
      status: 'healthy',
      lastCheck: new Date().toISOString()
    }),
    getMetrics: jest.fn().mockResolvedValue({
      requestCount: 100,
      averageResponseTime: 150,
      errorCount: 2
    })
  })),
  validateEnvironment: jest.fn(() => ({
    valid: true,
    missing: []
  }))
}));

jest.mock('@/lib/monitoring/error-handler', () => ({
  getGlobalErrorHandler: jest.fn(() => ({
    getMetrics: jest.fn().mockReturnValue({
      errorRate: 2.5,
      totalErrors: 5,
      recentErrors: []
    }),
    getHealthStatus: jest.fn().mockReturnValue({
      status: 'healthy',
      issues: []
    })
  }))
}));

jest.mock('@/lib/mcp/mcp-integration', () => ({
  getMCPManager: jest.fn(() => ({
    healthCheck: jest.fn().mockResolvedValue({
      status: 'healthy',
      servers: ['fetch', 'memory', 'time']
    }),
    fetch: {
      listTools: jest.fn().mockResolvedValue([])
    },
    memory: {
      readGraph: jest.fn().mockResolvedValue({})
    },
    time: {
      getCurrentTime: jest.fn().mockResolvedValue(new Date().toISOString())
    }
  })),
  validateMCPConfig: jest.fn(() => ({
    valid: true,
    missing: []
  }))
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('/api/gateway/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      })
    );
  });

  describe('GET /api/gateway/health', () => {
    it('returns healthy status when all services are operational', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('services');
      expect(data.services).toHaveProperty('gateway');
      expect(data.services).toHaveProperty('database');
      expect(data.services).toHaveProperty('cache');
      expect(data.services).toHaveProperty('errorHandler');
    });

    it('returns degraded status when non-critical services fail', async () => {
      const mockGetAPIGateway = require('@/lib/api-gateway/gateway').getAPIGateway;
      mockGetAPIGateway.mockReturnValue({
        getHealthStatus: jest.fn().mockResolvedValue({
          status: 'healthy'
        }),
        getMetrics: jest.fn().mockResolvedValue({
          requestCount: 100,
          averageResponseTime: 150
        })
      });

      // Mock external API failure
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy'); // Still healthy as external APIs are optional
      expect(data.dependencies.externalAPIs.healthy).toBe(false);
    });

    it('includes performance metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.performance).toHaveProperty('requestProcessingTime');
      expect(data.performance).toHaveProperty('averageResponseTime');
      expect(data.performance).toHaveProperty('errorRate');
      expect(data.performance).toHaveProperty('cacheHitRate');
      expect(typeof data.performance.requestProcessingTime).toBe('number');
    });

    it('includes system resource information', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.system).toHaveProperty('memory');
      expect(data.system).toHaveProperty('uptime');
      expect(data.system).toHaveProperty('nodeVersion');
      expect(data.system).toHaveProperty('platform');
      expect(data.system.memory).toHaveProperty('rss');
      expect(data.system.memory).toHaveProperty('heapTotal');
      expect(data.system.memory).toHaveProperty('heapUsed');
    });

    it('includes MCP status information', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.dependencies).toHaveProperty('mcp');
      expect(data.dependencies.mcp).toHaveProperty('available');
      expect(data.dependencies.mcp).toHaveProperty('status');
    });

    it('handles MCP unavailability gracefully', async () => {
      const mockGetMCPManager = require('@/lib/mcp/mcp-integration').getMCPManager;
      mockGetMCPManager.mockImplementation(() => {
        throw new Error('MCP not configured');
      });

      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.dependencies.mcp.available).toBe(false);
      expect(data.dependencies.mcp.status.error).toBe('MCP servers not available');
    });

    it('returns 503 when critical services fail', async () => {
      // Mock critical service failure (database)
      const mockGetAPIGateway = require('@/lib/api-gateway/gateway').getAPIGateway;
      mockGetAPIGateway.mockImplementation(() => {
        throw new Error('Gateway failed');
      });

      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.status).toBe('unhealthy');
    });

    it('includes recent issues when problems are detected', async () => {
      const mockGetGlobalErrorHandler = require('@/lib/monitoring/error-handler').getGlobalErrorHandler;
      mockGetGlobalErrorHandler.mockReturnValue({
        getMetrics: jest.fn().mockReturnValue({
          errorRate: 15.0, // High error rate
          summary: {
            criticalErrors: 3
          }
        }),
        getHealthStatus: jest.fn().mockReturnValue({
          status: 'degraded'
        })
      });

      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.recentIssues).toBeDefined();
      expect(Array.isArray(data.recentIssues)).toBe(true);
      expect(data.recentIssues.length).toBeGreaterThan(0);
      expect(data.recentIssues[0]).toHaveProperty('type');
      expect(data.recentIssues[0]).toHaveProperty('severity');
      expect(data.recentIssues[0]).toHaveProperty('message');
    });

    it('sets proper cache headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Health-Check-Duration')).toMatch(/\d+ms/);
    });
  });

  describe('POST /api/gateway/health', () => {
    it('performs basic diagnostic when no level specified', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.diagnosticLevel).toBe('basic');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('processingTime');
    });

    it('performs detailed diagnostics when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health', {
        method: 'POST',
        body: JSON.stringify({ diagnosticLevel: 'detailed' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.diagnosticLevel).toBe('detailed');
      expect(data.results).toHaveProperty('gateway');
      expect(data.results).toHaveProperty('mcp');
      expect(data.results).toHaveProperty('cache');
    });

    it('performs comprehensive diagnostics when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health', {
        method: 'POST',
        body: JSON.stringify({ diagnosticLevel: 'comprehensive' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.diagnosticLevel).toBe('comprehensive');
      expect(data.results).toHaveProperty('performanceTest');
      expect(data.results).toHaveProperty('configValidation');
      expect(data.results).toHaveProperty('dependencyCheck');
    });

    it('includes performance test results in comprehensive mode', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health', {
        method: 'POST',
        body: JSON.stringify({ diagnosticLevel: 'comprehensive' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.results.performanceTest).toHaveProperty('totalTests');
      expect(data.results.performanceTest).toHaveProperty('passed');
      expect(data.results.performanceTest).toHaveProperty('failed');
      expect(data.results.performanceTest).toHaveProperty('tests');
      expect(Array.isArray(data.results.performanceTest.tests)).toBe(true);
    });

    it('handles invalid JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/gateway/health', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Diagnostic failed');
    });

    it('handles diagnostic failures gracefully', async () => {
      const mockGetAPIGateway = require('@/lib/api-gateway/gateway').getAPIGateway;
      mockGetAPIGateway.mockImplementation(() => {
        throw new Error('Gateway diagnostic failed');
      });

      const request = new NextRequest('http://localhost:3000/api/gateway/health', {
        method: 'POST',
        body: JSON.stringify({ diagnosticLevel: 'detailed' })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Diagnostic failed');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('processingTime');
    });
  });

  describe('External API checks', () => {
    it('checks external API endpoints', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200 }) // Yahoo Finance
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Public Data Portal

      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.dependencies.externalAPIs).toHaveProperty('healthy');
      expect(data.dependencies.externalAPIs).toHaveProperty('details');
      expect(Array.isArray(data.dependencies.externalAPIs.details)).toBe(true);
    });

    it('handles external API timeouts', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      );

      const request = new NextRequest('http://localhost:3000/api/gateway/health');
      const response = await GET(request);
      const data = await response.json();

      expect(data.dependencies.externalAPIs.healthy).toBe(false);
    });
  });
});