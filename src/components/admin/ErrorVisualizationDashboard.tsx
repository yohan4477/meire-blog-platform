'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { AlertCircle, TrendingUp, Clock, Shield, Component, BarChart3, Calendar, AlertTriangle } from 'lucide-react';
import { ErrorCategorizer, ErrorCategory, ErrorSeverity } from '@/lib/error-categorizer';

interface ErrorData {
  id: string;
  component_name: string;
  section_name: string;
  error_message: string;
  page_path: string;
  user_agent: string;
  stack_trace: string;
  severity: string;
  timestamp: string;
  ip_address: string;
  session_id: string;
  user_id: string | null;
}

interface ErrorResponse {
  success: boolean;
  data: {
    errors: ErrorData[];
    stats: {
      total: number;
      today: number;
      last_week: number;
      resolved: number;
      critical: number;
    };
  };
}

export default function ErrorVisualizationDashboard() {
  const [errors, setErrors] = useState<ErrorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    last_week: 0,
    resolved: 0,
    critical: 0,
  });

  // 오류 데이터 로드
  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const response = await fetch('/api/section-errors');
        const data: ErrorResponse = await response.json();
        
        if (data.success && data.data) {
          setErrors(data.data.errors || []);
          setStats(data.data.stats || stats);
        }
      } catch (error) {
        console.error('Failed to fetch errors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
  }, []);

  // 컴포넌트별 분석 데이터
  const componentData = useMemo(() => {
    const componentMap = new Map<string, { count: number; lastOccurred: string; categories: Set<string>; severityLevel: string }>();
    
    errors.forEach(error => {
      const component = error.component_name || 'Unknown';
      const classification = ErrorCategorizer.categorizeError(error);
      const category = classification.category;
      const severityLevel = error.severity || 'medium';
      
      if (!componentMap.has(component)) {
        componentMap.set(component, {
          count: 0,
          lastOccurred: error.timestamp,
          categories: new Set(),
          severityLevel: severityLevel
        });
      }
      
      const componentStats = componentMap.get(component)!;
      componentStats.count++;
      componentStats.categories.add(category);
      
      // 더 높은 심각도로 업데이트
      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      if (severityOrder[severityLevel] > severityOrder[componentStats.severityLevel]) {
        componentStats.severityLevel = severityLevel;
      }
      
      // 가장 최근 발생 시간 업데이트
      if (new Date(error.timestamp) > new Date(componentStats.lastOccurred)) {
        componentStats.lastOccurred = error.timestamp;
      }
    });

    return Array.from(componentMap.entries()).map(([component, data]) => {
      // 심각도 레벨 확인 및 기본값 설정
      const severityLevel = data.severityLevel || 'medium';
      let colors;
      try {
        colors = ErrorCategorizer.getSeverityColor(severityLevel as ErrorSeverity);
      } catch (error) {
        console.warn('Severity color error:', error);
        colors = { primary: '#8884d8', background: '#f3f4f6', icon: '⚡' };
      }
      
      return {
        component,
        count: data.count,
        lastOccurred: data.lastOccurred,
        categories: Array.from(data.categories),
        severityLevel,
        color: colors.primary,
        icon: colors.icon
      };
    }).sort((a, b) => b.count - a.count);
  }, [errors]);

  // 디버깅: 컴포넌트 데이터 확인
  console.log('🔍 Component Data:', componentData);
  console.log('🔍 Component Data Length:', componentData.length);
  console.log('🔍 Errors Length:', errors.length);
  console.log('🔍 First few errors:', errors.slice(0, 3));

  // 카테고리별 분석 데이터 (세분화된 Logic 포함)
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    errors.forEach(error => {
      const classification = ErrorCategorizer.categorizeError(error);
      const category = classification.category;
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    return Array.from(categoryMap.entries()).map(([category, count]) => {
      const colors = ErrorCategorizer.getCategoryColor(category);
      return {
        category,
        count,
        color: colors.primary,
        icon: colors.icon
      };
    }).sort((a, b) => b.count - a.count);
  }, [errors]);

  // 시간별 분석 데이터
  const timelineData = useMemo(() => {
    const timeMap = new Map<string, number>();
    
    errors.forEach(error => {
      const date = new Date(error.timestamp).toISOString().split('T')[0];
      timeMap.set(date, (timeMap.get(date) || 0) + 1);
    });

    return Array.from(timeMap.entries()).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-30);
  }, [errors]);

  // 심각도별 분석 데이터
  const severityData = useMemo(() => {
    const severityMap = new Map<string, number>();
    
    errors.forEach(error => {
      const severity = error.severity || 'medium';
      severityMap.set(severity, (severityMap.get(severity) || 0) + 1);
    });

    return Array.from(severityMap.entries()).map(([severity, count]) => {
      const colors = ErrorCategorizer.getSeverityColor(severity as ErrorSeverity);
      return {
        severity,
        count,
        color: colors.primary,
        icon: colors.icon
      };
    });
  }, [errors]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">데이터를 로딩 중입니다...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">섹션 오류 분석 대시보드</h1>
          <p className="text-gray-600 mt-1">총 {errors.length}개 오류 분석 결과</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            실시간 업데이트
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {new Date().toLocaleDateString('ko-KR')}
          </Badge>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <AlertCircle className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">전체 오류</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">오늘 오류</p>
              <p className="text-2xl font-bold">{stats.today}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Clock className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">지난 주</p>
              <p className="text-2xl font-bold">{stats.last_week}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <Shield className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">해결됨</p>
              <p className="text-2xl font-bold">{stats.resolved}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">심각</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 분석 탭 */}
      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="components" className="flex items-center space-x-2">
            <Component className="h-4 w-4" />
            <span>컴포넌트별</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>카테고리별</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>시간별</span>
          </TabsTrigger>
          <TabsTrigger value="severity" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>심각도별</span>
          </TabsTrigger>
        </TabsList>

        {/* 컴포넌트별 분석 */}
        <TabsContent value="components" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 상위 5개 컴포넌트 요약 */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🏆 상위 5개 컴포넌트</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {componentData.length > 0 ? (
                      componentData.slice(0, 5).map((component, index) => (
                        <div key={component.component} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-lg">{component.icon}</span>
                              <span className="font-semibold">#{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{component.component}</p>
                              <p className="text-xs text-gray-500">
                                {component.categories.join(', ')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg" style={{ color: component.color }}>
                              {component.count}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(component.lastOccurred).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>컴포넌트 데이터를 로딩 중입니다...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 컴포넌트별 차트 */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📊 컴포넌트별 오류 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 bg-gray-50 p-4 rounded">
                    <div className="mb-4 text-sm text-gray-600">
                      데이터 개수: {componentData.length}개
                    </div>
                    {componentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="90%">
                        <BarChart 
                          data={componentData.slice(0, 10)} 
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="component" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            fontSize={11}
                            interval={0}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: any) => [`${value}건`, '오류 수']}
                            labelFormatter={(label: string) => `컴포넌트: ${label}`}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">
                          컴포넌트 데이터를 로딩 중입니다... (총 {errors.length}개 오류)
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 상세 컴포넌트 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📋 상세 컴포넌트 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        컴포넌트
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        오류 수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        카테고리
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        심각도
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        최근 발생
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {componentData.map((component) => (
                      <tr key={component.component} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{component.icon}</span>
                            <span className="font-medium">{component.component}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-lg" style={{ color: component.color }}>
                            {component.count}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {component.categories.map((category) => (
                              <Badge key={category} variant="outline" className="text-xs">
                                {category.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              component.severityLevel === 'critical' ? 'destructive' :
                              component.severityLevel === 'high' ? 'default' : 'secondary'
                            }
                            className="capitalize"
                          >
                            {component.severityLevel}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(component.lastOccurred).toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 카테고리별 분석 */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 카테고리별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, count, percent }) => 
                          `${category.replace('_', ' ')}: ${count}건 (${(percent * 100).toFixed(1)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📈 카테고리별 순위</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryData.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{category.icon}</span>
                        <div>
                          <p className="font-medium text-sm">
                            #{index + 1} {category.category.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg" style={{ color: category.color }}>
                          {category.count}건
                        </p>
                        <p className="text-xs text-gray-500">
                          {((category.count / errors.length) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 시간별 분석 */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📅 최근 30일 오류 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      strokeWidth={2} 
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 심각도별 분석 */}
        <TabsContent value="severity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {severityData.map((severity) => (
              <Card key={severity.severity}>
                <CardContent className="flex items-center p-6">
                  <div className="text-4xl mr-4">{severity.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">
                      {severity.severity}
                    </p>
                    <p className="text-3xl font-bold" style={{ color: severity.color }}>
                      {severity.count}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}