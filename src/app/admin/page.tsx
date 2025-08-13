'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StockPriceService } from '@/services/StockPriceService';
import { Trash2, RefreshCw, TestTube, Database, Activity } from 'lucide-react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTestingStocks, setIsTestingStocks] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [stockService] = useState(() => new StockPriceService());

  const authenticate = () => {
    if (password === 'admin123') { // 실제로는 환경변수나 더 안전한 방법 사용
      setIsAuthenticated(true);
    } else {
      alert('잘못된 비밀번호입니다.');
    }
  };

  const clearCache = () => {
    stockService.clearCache();
    alert('캐시가 삭제되었습니다.');
  };

  const testStockPrices = async () => {
    setIsTestingStocks(true);
    setTestResults([]);

    const testStocks = [
      { ticker: '005930', name: '삼성전자' },
      { ticker: '000660', name: 'SK하이닉스' },
      { ticker: 'AAPL', name: '애플' },
      { ticker: 'TSLA', name: '테슬라' }
    ];

    const results = [];

    for (const stock of testStocks) {
      try {
        const result = await stockService.getStockPrice(stock.ticker, true);
        results.push({
          ...stock,
          success: true,
          price: result.price.price,
          currency: result.price.currency,
          change: result.price.changePercent,
          responseTime: result.responseTime,
          validation: result.validation
        });
      } catch (error) {
        results.push({
          ...stock,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setTestResults(results);
    setIsTestingStocks(false);
  };

  const getCacheStats = () => {
    return stockService.getCacheStats();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>관리자 로그인</CardTitle>
            <CardDescription>관리자 비밀번호를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && authenticate()}
            />
            <Button onClick={authenticate} className="w-full">
              로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cacheStats = getCacheStats();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">관리자 페이지</h1>
        <Badge variant="secondary">인증됨</Badge>
      </div>

      {/* 시스템 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">캐시 상태</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats.size}</div>
            <p className="text-xs text-muted-foreground">
              저장된 항목 수
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">서비스 상태</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">정상</div>
            <p className="text-xs text-muted-foreground">
              주식 가격 서비스
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">환경</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {process.env.NODE_ENV === 'development' ? '개발' : '프로덕션'}
            </div>
            <p className="text-xs text-muted-foreground">
              현재 실행 환경
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 관리 도구 */}
      <Card>
        <CardHeader>
          <CardTitle>관리 도구</CardTitle>
          <CardDescription>시스템 관리 및 유지보수 도구</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={clearCache} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              캐시 삭제
            </Button>
            
            <Button 
              onClick={testStockPrices} 
              disabled={isTestingStocks}
              variant="outline" 
              size="sm"
            >
              <TestTube className={`h-4 w-4 mr-2 ${isTestingStocks ? 'animate-spin' : ''}`} />
              {isTestingStocks ? '테스트 중...' : '주가 서비스 테스트'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 테스트 결과 */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>주가 서비스 테스트 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "성공" : "실패"}
                    </Badge>
                    <div>
                      <div className="font-medium">{result.name} ({result.ticker})</div>
                      {result.success ? (
                        <div className="text-sm text-muted-foreground">
                          {result.currency === 'KRW' ? '₩' : '$'}
                          {result.currency === 'KRW' ? result.price.toLocaleString() : result.price.toFixed(2)}
                          {' '}({result.change >= 0 ? '+' : ''}{result.change.toFixed(2)}%)
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">{result.error}</div>
                      )}
                    </div>
                  </div>
                  {result.success && (
                    <div className="text-right">
                      <div className="text-sm">{result.responseTime}ms</div>
                      {result.validation && (
                        <div className="text-xs text-muted-foreground">
                          신뢰도: {(result.validation.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 에러 로그 (개발 환경에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle>시스템 정보</CardTitle>
            <CardDescription>개발 환경에서만 표시됩니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2 font-mono bg-muted p-4 rounded-lg">
              <div>Node 환경: {process.env.NODE_ENV}</div>
              <div>캐시 TTL: 1분</div>
              <div>지원 시장: KOSPI, KOSDAQ, NASDAQ, NYSE</div>
              <div>데이터 소스: Yahoo Finance</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}