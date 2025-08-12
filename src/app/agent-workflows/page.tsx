/**
 * 에이전트 워크플로우 페이지
 * Agent Workflows Page
 */

import AgentWorkflowDashboard from '@/components/agents/AgentWorkflowDashboard';

export default function AgentWorkflowsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AgentWorkflowDashboard />
    </div>
  );
}

export const metadata = {
  title: '에이전트 워크플로우 | 메이레 투자 플랫폼',
  description: 'AI 에이전트들의 협업 워크플로우를 모니터링하고 관리합니다.',
};