/**
 * 에이전트 워크플로우 대시보드 컴포넌트
 * Agent Workflow Dashboard Component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  load: number;
  lastHeartbeat: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
}

interface TriggerRule {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: string;
  lastTriggered?: string;
}

interface SystemHealth {
  totalAgents: number;
  onlineAgents: number;
  averageLoad: number;
  messageQueueSize: number;
}

interface DashboardData {
  agents: { [key: string]: AgentStatus };
  system: SystemHealth;
  workflows: {
    active: WorkflowExecution[];
    available: any[];
  };
  triggers: {
    active: TriggerRule[];
    system: any;
  };
  reports: {
    recent: any[];
    stats: any;
  };
}

export default function AgentWorkflowDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // 5초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/agent-workflows?action=status');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const executeDemo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agent-workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'demo-workflow' })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('데모 워크플로우가 성공적으로 실행되었습니다!');
        fetchDashboardData();
      } else {
        alert(`데모 실행 실패: ${result.error}`);
      }
    } catch (err) {
      alert('데모 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTrigger = async (triggerId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/agent-workflows', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-trigger',
          triggerId,
          enabled
        })
      });
      
      const result = await response.json();
      if (result.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to toggle trigger:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* 시스템 개요 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 탭 스켈레톤 */}
        <div className="space-y-4">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-9 flex-1" />
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="w-3 h-3 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-8 mb-1" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">오류: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">에이전트 워크플로우 대시보드</h1>
          <p className="text-gray-600">주식투자 AI 에이전트들의 협업 상태를 모니터링합니다</p>
        </div>
        <Button 
          onClick={executeDemo}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? '실행 중...' : '데모 워크플로우 실행'}
        </Button>
      </div>

      {/* 시스템 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">총 에이전트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.system.totalAgents}</div>
            <div className="text-xs text-green-600">
              {data.system.onlineAgents}개 온라인
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">평균 부하</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.system.averageLoad)}%</div>
            <div className="text-xs text-gray-600">시스템 리소스</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">활성 워크플로우</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.workflows.active.length}</div>
            <div className="text-xs text-blue-600">실행 중</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">메시지 큐</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.system.messageQueueSize}</div>
            <div className="text-xs text-gray-600">대기 중 메시지</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="agents">에이전트</TabsTrigger>
          <TabsTrigger value="workflows">워크플로우</TabsTrigger>
          <TabsTrigger value="triggers">트리거</TabsTrigger>
          <TabsTrigger value="reports">리포트</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 에이전트 상태 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>에이전트 상태</CardTitle>
                <CardDescription>각 AI 에이전트의 현재 상태</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.values(data.agents).map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
                        <span className="font-medium">{agent.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{agent.load}%</div>
                        <div className="text-xs text-gray-500">{agent.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 최근 활동 */}
            <Card>
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>최근 실행된 분석 및 리포트</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.reports.recent.slice(0, 5).map((report, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{report.title}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(report.generatedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge className={getPriorityColor(report.riskLevel)}>
                        {report.riskLevel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(data.agents).map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(agent.status)}`} />
                  </div>
                  <CardDescription>{agent.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>상태:</span>
                      <span className="font-medium">{agent.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>부하:</span>
                      <span className="font-medium">{agent.load}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>마지막 응답:</span>
                      <span className="text-sm text-gray-500">
                        {new Date(agent.lastHeartbeat).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 활성 워크플로우 */}
            <Card>
              <CardHeader>
                <CardTitle>활성 워크플로우</CardTitle>
                <CardDescription>현재 실행 중인 워크플로우</CardDescription>
              </CardHeader>
              <CardContent>
                {data.workflows.active.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    현재 실행 중인 워크플로우가 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.workflows.active.map((workflow) => (
                      <div key={workflow.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{workflow.workflowId}</div>
                            <div className="text-sm text-gray-500">
                              시작: {new Date(workflow.startTime).toLocaleTimeString()}
                            </div>
                          </div>
                          <Badge variant={workflow.status === 'running' ? 'default' : 'secondary'}>
                            {workflow.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 사용 가능한 워크플로우 */}
            <Card>
              <CardHeader>
                <CardTitle>사용 가능한 워크플로우</CardTitle>
                <CardDescription>실행 가능한 워크플로우 목록</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.workflows.available.map((workflow) => (
                    <div key={workflow.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{workflow.name}</div>
                          <div className="text-sm text-gray-500">{workflow.description}</div>
                        </div>
                        <Badge className={getPriorityColor(workflow.priority)}>
                          {workflow.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>트리거 규칙</CardTitle>
              <CardDescription>자동 워크플로우 실행 규칙</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.triggers.active.map((trigger) => (
                  <div key={trigger.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="font-medium">{trigger.name}</div>
                          <Badge variant="outline">{trigger.type}</Badge>
                          <Badge className={getPriorityColor(trigger.priority)}>
                            {trigger.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {trigger.lastTriggered 
                            ? `마지막 실행: ${new Date(trigger.lastTriggered).toLocaleString()}`
                            : '실행 기록 없음'
                          }
                        </div>
                      </div>
                      <Button
                        variant={trigger.enabled ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleTrigger(trigger.id, !trigger.enabled)}
                      >
                        {trigger.enabled ? '비활성화' : '활성화'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>최근 리포트</CardTitle>
              <CardDescription>에이전트가 생성한 분석 리포트</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.reports.recent.map((report, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="font-medium">{report.title}</div>
                          <Badge className={getPriorityColor(report.riskLevel)}>
                            {report.riskLevel}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">{report.summary}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          생성: {new Date(report.generatedAt).toLocaleString()} | 
                          신뢰도: {Math.round(report.confidence * 100)}%
                        </div>
                      </div>
                    </div>
                    {report.keyInsights && report.keyInsights.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium mb-2">주요 인사이트:</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {report.keyInsights.slice(0, 3).map((insight: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}