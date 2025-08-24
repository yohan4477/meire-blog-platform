'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  FileText,
  Link as LinkIcon
} from 'lucide-react';

interface CrawlResult {
  success: boolean;
  stats: {
    crawledPosts: number;
    newPosts: number;
    updatedPosts: number;
    analyzedChains: number;
    updatedStocks: number;
    errors: number;
  };
  message: string;
  newPosts?: Array<{
    id: number;
    title: string;
    logNo: string;
    created_date: string;
  }>;
}

export default function CrawlAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [status, setStatus] = useState<any>(null);

  // 크롤링 상태 확인
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/crawl/latest');
      const data = await response.json();
      setStatus(data.status);
    } catch (error) {
      console.error('상태 확인 실패:', error);
    }
  };

  // 최신 글 크롤링 실행
  const runCrawling = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/crawl/latest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setResult(data);
      
      // 상태 갱신
      await checkStatus();

    } catch (error) {
      console.error('크롤링 실패:', error);
      setResult({
        success: false,
        stats: {
          crawledPosts: 0,
          newPosts: 0,
          updatedPosts: 0,
          analyzedChains: 0,
          updatedStocks: 0,
          errors: 1
        },
        message: '크롤링 요청 실패'
      });
    } finally {
      setLoading(false);
    }
  };

  // 페이지 로드시 상태 확인
  useEffect(() => {
    checkStatus();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">메르 블로그 크롤링 관리</h1>
        <p className="text-gray-600">최신 블로그 글 크롤링 및 메르's Pick 자동 업데이트</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24시간 내 크롤링</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.recentPosts || 0}개</div>
            <p className="text-xs text-muted-foreground">
              최근: {status?.latestCrawl ? formatDate(status.latestCrawl) : '없음'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">메르's Pick 종목</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.merryPickStocks || 0}개</div>
            <p className="text-xs text-muted-foreground">
              언급된 종목 수
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">정상</div>
            <p className="text-xs text-muted-foreground">
              모든 시스템 운영 중
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>크롤링 실행</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={runCrawling} 
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{loading ? '크롤링 중...' : '최신 글 크롤링 시작'}</span>
            </Button>

            <Button variant="outline" onClick={checkStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              상태 새로고침
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p>• 최신 3페이지의 블로그 글을 크롤링합니다</p>
            <p>• 새로운 글에 대해 자동으로 논리체인 분석을 실행합니다</p>
            <p>• 메르's Pick 종목 목록을 자동으로 업데이트합니다</p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>크롤링 결과</CardTitle>
              {result.success ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  성공
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  실패
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Message */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">{result.message}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{result.stats.crawledPosts}</div>
                <div className="text-sm text-blue-600">크롤링된 포스트</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.stats.newPosts}</div>
                <div className="text-sm text-green-600">새로운 포스트</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{result.stats.analyzedChains}</div>
                <div className="text-sm text-purple-600">논리체인 분석</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{result.stats.updatedStocks}</div>
                <div className="text-sm text-orange-600">업데이트된 종목</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{result.stats.updatedPosts}</div>
                <div className="text-sm text-yellow-600">업데이트된 포스트</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.stats.errors}</div>
                <div className="text-sm text-red-600">오류 수</div>
              </div>
            </div>

            {/* New Posts */}
            {result.newPosts && result.newPosts.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">새로 추가된 포스트</h4>
                <div className="space-y-3">
                  {result.newPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{post.title}</h5>
                        <p className="text-xs text-muted-foreground">
                          ID: {post.id} | logNo: {post.logNo} | 작성일: {formatDate(post.created_date)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/posts/${post.id}`, '_blank')}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          보기
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}