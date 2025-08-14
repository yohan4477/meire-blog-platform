'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, 
  Filter, Calendar, Download, RefreshCw
} from 'lucide-react';
import { ErrorCategorizer, ErrorCategory, ErrorSeverity } from '@/lib/error-categorizer';

interface SectionError {
  id: number;
  error_hash: string;
  component_name: string;
  section_name: string;
  error_message: string;
  error_type: string;
  error_category: string;
  page_path: string;
  user_agent: string;
  device_type: string;
  browser_name: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  occurrence_count: number;
}

interface ErrorStats {
  total: number;
  new: number;
  investigating: number;
  fixed: number;
  ignored: number;
}

interface CategoryData {
  category: string;
  count: number;
  color: string;
  icon: string;
  severity: string;
}

interface TimeSeriesData {
  date: string;
  errors: number;
  resolved: number;
}

export default function ErrorVisualizationDashboard() {
  const [errors, setErrors] = useState<SectionError[]>([]);
  const [stats, setStats] = useState<ErrorStats>({
    total: 0, new: 0, investigating: 0, fixed: 0, ignored: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 데이터 로딩
  useEffect(() => {
    loadErrorData();
    const interval = setInterval(loadErrorData, 30000); // 30초마다 새로고침
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadErrorData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/section-errors?type=list&limit=1000&timeRange=${timeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setErrors(data.errors || []);
        setStats(data.stats || { total: 0, new: 0, investigating: 0, fixed: 0, ignored: 0 });
      }
    } catch (error) {
      console.error('에러 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 카테고리별 데이터 처리
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { count: number; severity: string }>();
    
    errors.forEach(error => {
      const classification = ErrorCategorizer.categorizeError({
        component_name: error.component_name,
        section_name: error.section_name,
        error_message: error.error_message,
        page_path: error.page_path,
        user_agent: error.user_agent
      });
      
      const key = classification.category;
      const current = categoryMap.get(key) || { count: 0, severity: classification.severity };
      categoryMap.set(key, { 
        count: current.count + 1,
        severity: classification.severity === ErrorSeverity.CRITICAL ? ErrorSeverity.CRITICAL : current.severity
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => {
      const colors = ErrorCategorizer.getCategoryColor(category as ErrorCategory);
      return {
        category,
        count: data.count,
        color: colors.primary,
        icon: colors.icon,
        severity: data.severity
      };
    }).sort((a, b) => b.count - a.count);
  }, [errors]);

  // 시간별 데이터 처리 
  const timeSeriesData = useMemo(() => {
    const dateMap = new Map<string, { errors: number; resolved: number }>();
    
    errors.forEach(error => {
      const date = new Date(error.created_at).toISOString().split('T')[0];
      const current = dateMap.get(date) || { errors: 0, resolved: 0 };
      
      current.errors += 1;
      if (error.status === 'fixed' && error.resolved_at) {
        const resolvedDate = new Date(error.resolved_at).toISOString().split('T')[0];
        const resolvedCurrent = dateMap.get(resolvedDate) || { errors: 0, resolved: 0 };
        resolvedCurrent.resolved += 1;
        dateMap.set(resolvedDate, resolvedCurrent);
      }
      
      dateMap.set(date, current);
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // 최근 2주 데이터
  }, [errors]);

  // 심각도별 데이터
  const severityData = useMemo(() => {
    const severityMap = new Map<string, number>();
    
    errors.forEach(error => {
      const classification = ErrorCategorizer.categorizeError({
        component_name: error.component_name,
        section_name: error.section_name,
        error_message: error.error_message,
        page_path: error.page_path,
        user_agent: error.user_agent
      });
      
      const current = severityMap.get(classification.severity) || 0;
      severityMap.set(classification.severity, current + 1);
    });

    return Object.values(ErrorSeverity).map(severity => {
      const colors = ErrorCategorizer.getSeverityColor(severity);
      return {
        severity,
        count: severityMap.get(severity) || 0,
        color: colors.primary,
        icon: colors.icon
      };
    }).filter(item => item.count > 0);
  }, [errors]);

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}개`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">섹션 오류 분석 대시보드</h1>
          <p className="text-gray-600 mt-1">실시간 오류 현황 및 트렌드 분석</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 시간 범위 선택 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1d">오늘</option>
              <option value="7d">최근 7일</option>
              <option value="30d">최근 30일</option>
              <option value="90d">최근 90일</option>
            </select>
          </div>
          
          {/* 새로고침 */}
          <Button 
            onClick={loadErrorData} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 오류</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">새로운 오류</p>
                <p className="text-2xl font-bold text-red-600">{stats.new}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">조사 중</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.investigating}</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">해결됨</p>
                <p className="text-2xl font-bold text-green-600">{stats.fixed}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">해결률</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total > 0 ? Math.round((stats.fixed / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 메인 차트 섹션 */}
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">카테고리별</TabsTrigger>
          <TabsTrigger value="timeline">시간별 트렌드</TabsTrigger>
          <TabsTrigger value="severity">심각도별</TabsTrigger>
          <TabsTrigger value="components">컴포넌트별</TabsTrigger>
        </TabsList>

        {/* 카테고리별 분석 */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 카테고리별 바 차트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔍 오류 카테고리별 분석
                  <Badge variant="outline">{categoryData.length}개 카테고리</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="category" 
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 카테고리 상세 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>카테고리 상세</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryData.map((item, index) => (
                    <div 
                      key={item.category}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => setSelectedCategory(item.category)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.icon} {item.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={item.severity === ErrorSeverity.CRITICAL ? "destructive" : "secondary"}
                        >
                          {item.severity}
                        </Badge>
                        <Badge variant="outline">{item.count}개</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 시간별 트렌드 */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📈 시간별 오류 발생 트렌드
                <Badge variant="outline">최근 14일</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="errors" 
                    stackId="1"
                    stroke="#ef4444" 
                    fill="#fecaca" 
                    name="발생한 오류"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resolved" 
                    stackId="2"
                    stroke="#10b981" 
                    fill="#a7f3d0" 
                    name="해결된 오류"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 심각도별 분석 */}
        <TabsContent value="severity">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>심각도별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ severity, count }) => `${severity}: ${count}개`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>심각도 상세</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {severityData.map((item) => (
                    <div key={item.severity} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm font-medium">{item.severity.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <Badge variant="outline">{item.count}개</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 컴포넌트별 분석 */}
        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>컴포넌트별 오류 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>컴포넌트별 분석이 준비 중입니다</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 로딩 상태 */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>데이터를 로딩 중입니다...</span>
          </div>
        </div>
      )}
    </div>
  );
}