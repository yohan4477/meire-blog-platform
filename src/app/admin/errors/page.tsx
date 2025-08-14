'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import ErrorVisualizationDashboard from '@/components/admin/ErrorVisualizationDashboard';

interface SectionError {
  id: number;
  error_hash: string;
  component_name: string;
  section_name: string;
  page_path: string;
  error_message: string;
  error_type: string;
  error_category: string;
  browser_name: string;
  device_type: string;
  occurrence_count: number;
  status: 'new' | 'investigating' | 'fixed' | 'ignored';
  first_occurred_at: string;
  last_occurred_at: string;
}

const statusIcons = {
  new: <AlertTriangle className="w-4 h-4 text-red-500" />,
  investigating: <Clock className="w-4 h-4 text-yellow-500" />,
  fixed: <CheckCircle className="w-4 h-4 text-green-500" />,
  ignored: <XCircle className="w-4 h-4 text-gray-500" />
};

const statusColors = {
  new: 'bg-red-50 text-red-700 border-red-200',
  investigating: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  fixed: 'bg-green-50 text-green-700 border-green-200',
  ignored: 'bg-gray-50 text-gray-700 border-gray-200'
};

export default function ErrorsAdminPage() {
  const [errors, setErrors] = useState<SectionError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchErrors();
  }, []);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/section-errors?type=list&limit=100');
      const data = await response.json();
      
      if (data.success) {
        setErrors(data.data.errors);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateErrorStatus = async (errorHash: string, status: string) => {
    try {
      const response = await fetch('/api/section-errors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorHash,
          status,
          resolutionNotes: status === 'fixed' ? '관리자에 의해 수동 해결됨' : undefined
        })
      });

      if (response.ok) {
        fetchErrors(); // 목록 새로고침
      }
    } catch (error) {
      console.error('Failed to update error status:', error);
    }
  };

  const filteredErrors = errors.filter(error => {
    if (filter === 'all') return true;
    return error.status === filter;
  });

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">섹션 오류 관리 시스템</h1>
        <p className="text-gray-600">
          애플리케이션에서 발생한 모든 섹션 오류를 추적하고 관리합니다.
        </p>
      </div>

      {/* 탭 메뉴 - 시각화 대시보드와 오류 목록 */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">📊 시각화 대시보드</TabsTrigger>
          <TabsTrigger value="list">📋 오류 목록 관리</TabsTrigger>
        </TabsList>

        {/* 시각화 대시보드 탭 */}
        <TabsContent value="dashboard">
          <ErrorVisualizationDashboard />
        </TabsContent>

        {/* 오류 목록 관리 탭 */}
        <TabsContent value="list">
          <div className="bg-white rounded-lg border">

            {/* 헤더 */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold mb-2">오류 목록 관리</h2>
              <p className="text-sm text-gray-600">개별 오류의 상태 변경 및 상세 정보 확인</p>
            </div>

            {/* 필터 및 통계 */}
            <div className="p-6">
              <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    전체 ({errors.length})
                  </Button>
                  <Button
                    variant={filter === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('new')}
                  >
                    신규 ({errors.filter(e => e.status === 'new').length})
                  </Button>
                  <Button
                    variant={filter === 'investigating' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('investigating')}
                  >
                    조사 중 ({errors.filter(e => e.status === 'investigating').length})
                  </Button>
                  <Button
                    variant={filter === 'fixed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('fixed')}
                  >
                    해결됨 ({errors.filter(e => e.status === 'fixed').length})
                  </Button>
                </div>
                
                <Button onClick={fetchErrors} variant="outline" size="sm">
                  새로고침
                </Button>
              </div>

              {/* 에러 목록 */}
              <div className="space-y-4">
                {filteredErrors.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">표시할 섹션 오류가 없습니다.</p>
                  </div>
                ) : (
                  filteredErrors.map((error) => (
                    <div 
                      key={error.id} 
                      className={`border rounded-lg p-4 ${statusColors[error.status]}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {statusIcons[error.status]}
                            <span className="font-medium">
                              {error.component_name}/{error.section_name}
                            </span>
                            <span className="text-xs bg-white px-2 py-1 rounded">
                              {error.error_type}
                            </span>
                            <span className="text-xs bg-white px-2 py-1 rounded">
                              {error.error_category}
                            </span>
                          </div>
                          
                          <p className="text-sm mb-2 font-mono">
                            {error.error_message}
                          </p>
                          
                          <div className="text-xs space-y-1">
                            <div><strong>경로:</strong> {error.page_path}</div>
                            <div><strong>브라우저:</strong> {error.browser_name} / {error.device_type}</div>
                            <div><strong>발생 횟수:</strong> {error.occurrence_count}회</div>
                            <div><strong>최초 발생:</strong> {new Date(error.first_occurred_at).toLocaleString()}</div>
                            <div><strong>최근 발생:</strong> {new Date(error.last_occurred_at).toLocaleString()}</div>
                            <div><strong>해시:</strong> <code>{error.error_hash}</code></div>
                          </div>
                        </div>
                        
                        <div className="ml-4 flex gap-2">
                          {error.status === 'new' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateErrorStatus(error.error_hash, 'investigating')}
                              >
                                조사 시작
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateErrorStatus(error.error_hash, 'fixed')}
                              >
                                해결됨
                              </Button>
                            </>
                          )}
                          
                          {error.status === 'investigating' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateErrorStatus(error.error_hash, 'fixed')}
                              >
                                해결됨
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateErrorStatus(error.error_hash, 'ignored')}
                              >
                                무시
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}