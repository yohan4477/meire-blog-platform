'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockPriceService } from '@/services/StockPriceService';
import { Trash2, RefreshCw, TestTube, Database, Activity, Brain, Workflow, Target, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTestingStocks, setIsTestingStocks] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [stockService] = useState(() => new StockPriceService());
  const [activeTab, setActiveTab] = useState('system');

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">관리자 페이지</h1>
        <Badge variant="secondary">인증됨</Badge>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system">시스템 관리</TabsTrigger>
          <TabsTrigger value="merry-ai">메르 AI 분석</TabsTrigger>
          <TabsTrigger value="monitoring">모니터링</TabsTrigger>
        </TabsList>
        
        <TabsContent value="system" className="space-y-6 mt-6">
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
        </TabsContent>
        
        <TabsContent value="merry-ai" className="space-y-6 mt-6">
          <div className="space-y-6">
            {/* 메르 AI 개요 */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Brain className="h-6 w-6 text-purple-600" />
                  <div>
                    <CardTitle>메르 AI 분석 시스템 개요</CardTitle>
                    <CardDescription>메르의 블로그 글에서 논리체인을 추출하는 AI 시스템</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground">
                    메르 AI 분석 시스템은 메르의 독특한 사고 패턴과 논리 전개 방식을 학습하여,
                    복잡한 글로벌 이벤트들 사이의 숨은 연결고리를 발견하고 투자 기회를 식별합니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 분석 단계 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Workflow className="h-5 w-5" />
                  <span>분석 단계 및 매커니즘</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 1단계 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">키워드 패턴 매칭</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        메르의 글에서 지정학적, 경제적, 기술적 이벤트 키워드를 감지합니다.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Badge variant="outline">지정학: 전쟁, 제재, 무역분쟁, 외교</Badge>
                        <Badge variant="outline">공급망: 차단, 항만, 해상로, 공급부족</Badge>
                        <Badge variant="outline">경제: 인플레이션, 가격급등, 금리</Badge>
                        <Badge variant="outline">투자: 수혜, 대안, 성장, 기회</Badge>
                      </div>
                    </div>
                  </div>

                  {/* 2단계 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">논리체인 구조 분석</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        메르식 논리 전개를 분석하여 트리거 → 중간 단계 → 결과로 연결고리를 추출합니다.
                      </p>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span>트리거</span>
                          <span>→</span>
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                          <span>중간 단계</span>
                          <span>→</span>
                          <Target className="h-4 w-4 text-green-500" />
                          <span>최종 결과</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3단계 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">3</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">종목 연관성 분석</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        논리체인에서 영향을 받을 수 있는 종목들을 식별하고 연관성을 분석합니다.
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <Badge variant="secondary">직접적 영향</Badge>
                        <Badge variant="secondary">공급업체</Badge>
                        <Badge variant="secondary">경쟁사</Badge>
                        <Badge variant="secondary">섹터 영향</Badge>
                      </div>
                    </div>
                  </div>

                  {/* 4단계 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-red-600">4</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">신뢰도 및 예측 기간 계산</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        각 논리체인의 신뢰도를 평가하고 예측이 유효한 시간 범위를 계산합니다.
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>1주 → 1개월 → 3개월 → 6개월 → 1년</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 데이터베이스 구조 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>데이터베이스 구조</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">핵심 테이블</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">causal_chains</span>
                        <Badge variant="outline">논리체인</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">causal_steps</span>
                        <Badge variant="outline">논리 단계</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">macro_events</span>
                        <Badge variant="outline">매크로 이벤트</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">stock_correlations</span>
                        <Badge variant="outline">주식 연관성</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">부가 테이블</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">merry_predictions</span>
                        <Badge variant="outline">예측 추적</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">market_reactions</span>
                        <Badge variant="outline">시장 반응</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">supply_chain_mappings</span>
                        <Badge variant="outline">공급망 매핑</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">user_profiles</span>
                        <Badge variant="outline">사용자 프로필</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API 엔드포인트 */}
            <Card>
              <CardHeader>
                <CardTitle>주요 API 엔드포인트</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-mono text-sm">GET /api/merry/analysis</div>
                      <div className="text-xs text-muted-foreground">기존 분석 결과 조회</div>
                    </div>
                    <Badge variant="secondary">GET</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-mono text-sm">POST /api/merry/analysis</div>
                      <div className="text-xs text-muted-foreground">새로운 포스트 분석 실행</div>
                    </div>
                    <Badge variant="secondary">POST</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-mono text-sm">/merry/analysis</div>
                      <div className="text-xs text-muted-foreground">분석 대시보드 페이지</div>
                    </div>
                    <Badge variant="secondary">PAGE</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="monitoring" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>모니터링 대시보드</CardTitle>
              <CardDescription>시스템 성능 및 상태 모니터링</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                모니터링 기능은 개발 예정입니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}