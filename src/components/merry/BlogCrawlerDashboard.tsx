'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Database,
  BarChart3,
  Settings
} from 'lucide-react';
import { CrawlerStats } from '@/types';

interface CrawlerDashboardProps {
  className?: string;
}

export default function BlogCrawlerDashboard({ className }: CrawlerDashboardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<CrawlerStats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    maxPages: 10,
    delayRange: [1, 2] as [number, number],
    autoSchedule: false
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]); // 최대 50개 로그
  };

  const startCrawling = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('메르 블로그 크롤링 시작...');
    
    try {
      const response = await fetch('/api/merry/crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxPages: settings.maxPages,
          delayRange: settings.delayRange
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStats(result.data);
        addLog(`크롤링 완료 - 새 포스트: ${result.data.newPosts}개, 업데이트: ${result.data.updatedPosts}개`);
      } else {
        addLog(`크롤링 실패: ${result.error?.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      addLog(`크롤링 오류: ${error instanceof Error ? error.message : '네트워크 오류'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const stopCrawling = () => {
    setIsRunning(false);
    addLog('크롤링 중지됨');
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('로그가 초기화되었습니다');
  };

  const migrateMysqlData = async () => {
    addLog('MySQL 데이터 마이그레이션 요청...');
    
    try {
      const response = await fetch('/api/merry/migrate-mysql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        addLog(`마이그레이션 완료: ${result.message}`);
      } else {
        addLog(`마이그레이션 실패: ${result.error?.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      addLog(`마이그레이션 오류: ${error instanceof Error ? error.message : '네트워크 오류'}`);
    }
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">메르 블로그 크롤러</h1>
          <p className="text-muted-foreground">
            네이버 블로그 데이터를 자동으로 수집하고 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            {isRunning ? 'Running' : 'Stopped'}
          </Badge>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            크롤러 제어판
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 크롤링 컨트롤 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">크롤링 제어</label>
              <div className="flex gap-2">
                <Button 
                  onClick={startCrawling} 
                  disabled={isRunning}
                  size="sm"
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      실행 중
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      시작
                    </>
                  )}
                </Button>
                <Button 
                  onClick={stopCrawling} 
                  disabled={!isRunning}
                  variant="outline"
                  size="sm"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 페이지 설정 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">최대 페이지</label>
              <input 
                type="number" 
                value={settings.maxPages}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  maxPages: parseInt(e.target.value) || 10 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="1"
                max="200"
                disabled={isRunning}
              />
            </div>

            {/* 지연 설정 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">요청 간격 (초)</label>
              <div className="flex gap-1">
                <input 
                  type="number" 
                  value={settings.delayRange[0]}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    delayRange: [parseFloat(e.target.value) || 1, prev.delayRange[1]]
                  }))}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                  min="0.5"
                  max="10"
                  step="0.1"
                  disabled={isRunning}
                />
                <span className="text-sm self-center">~</span>
                <input 
                  type="number" 
                  value={settings.delayRange[1]}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    delayRange: [prev.delayRange[0], parseFloat(e.target.value) || 2]
                  }))}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                  min="0.5"
                  max="10"
                  step="0.1"
                  disabled={isRunning}
                />
              </div>
            </div>

            {/* 데이터 관리 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">데이터 관리</label>
              <Button 
                onClick={migrateMysqlData}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isRunning}
              >
                <Database className="h-4 w-4 mr-2" />
                MySQL 마이그레이션
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 대시보드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalFound}</p>
                  <p className="text-sm text-muted-foreground">발견</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.newPosts}</p>
                  <p className="text-sm text-muted-foreground">새 포스트</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.updatedPosts}</p>
                  <p className="text-sm text-muted-foreground">업데이트</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.errors}</p>
                  <p className="text-sm text-muted-foreground">오류</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.skippedOld}</p>
                  <p className="text-sm text-muted-foreground">건너뛰기</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 실시간 로그 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            실시간 로그
          </CardTitle>
          <Button 
            onClick={clearLogs} 
            variant="outline" 
            size="sm"
            disabled={isRunning}
          >
            로그 지우기
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">로그가 없습니다. 크롤링을 시작하세요.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 도움말 */}
      <Card>
        <CardHeader>
          <CardTitle>사용법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. 크롤링 시작</h4>
            <p className="text-sm text-muted-foreground">
              "시작" 버튼을 클릭하여 네이버 블로그 ranto28에서 최신 포스트를 수집합니다.
            </p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">2. MySQL 데이터 마이그레이션</h4>
            <p className="text-sm text-muted-foreground">
              기존 XAMPP MySQL의 메르 블로그 데이터를 SQLite로 이전합니다. 
              XAMPP가 실행 중이고 meire_blog 데이터베이스가 있어야 합니다.
            </p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium mb-2">3. 설정 조정</h4>
            <p className="text-sm text-muted-foreground">
              최대 페이지 수와 요청 간격을 조정하여 서버 부하를 관리할 수 있습니다.
              간격이 짧을수록 빠르지만 서버에 부담을 줄 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}