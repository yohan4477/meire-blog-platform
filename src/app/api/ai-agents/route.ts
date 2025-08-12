import { NextRequest, NextResponse } from 'next/server';
import { AIAgentExecutor, getAvailableAgents, isAgentAvailable } from '@/lib/ai-agents';
import { AIAgentRequest, ApiResponse } from '@/types';

// 사용 가능한 AI 에이전트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const agents = getAvailableAgents();
    
    const agentInfo = agents.map(agentType => ({
      type: agentType,
      available: isAgentAvailable(agentType),
      capabilities: getAgentCapabilities(agentType)
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: agentInfo,
      meta: {
        totalCount: agents.length,
        requestId: crypto.randomUUID(),
        processingTime: Date.now()
      }
    });

  } catch (error) {
    console.error('AI Agents GET error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'AGENTS_FETCH_ERROR',
        message: 'Failed to fetch available agents',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// AI 에이전트 실행
export async function POST(request: NextRequest) {
  try {
    const body: AIAgentRequest = await request.json();

    // 입력 검증
    if (!body.agent_type) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'MISSING_AGENT_TYPE',
          message: 'Agent type is required',
          field: 'agent_type',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!body.action) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'MISSING_ACTION',
          message: 'Action is required',
          field: 'action',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    if (!isAgentAvailable(body.agent_type)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'AGENT_NOT_AVAILABLE',
          message: `Agent ${body.agent_type} is not available`,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // AI 에이전트 실행
    const executor = AIAgentExecutor.getInstance();
    const result = await executor.executeAgent(body);

    if (!result.success) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          code: 'AGENT_EXECUTION_ERROR',
          message: result.error || 'Agent execution failed',
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
      message: 'AI agent executed successfully'
    });

  } catch (error) {
    console.error('AI Agents POST error:', error);
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        code: 'AGENT_REQUEST_ERROR',
        message: 'Failed to process AI agent request',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 에이전트별 기능 정보
function getAgentCapabilities(agentType: string): string[] {
  const capabilities = {
    goldman_sachs: [
      'analyze_stock',
      'generate_investment_recommendation',
      'market_outlook',
      'compare_stocks'
    ],
    bloomberg: [
      'get_market_data',
      'technical_analysis',
      'news_sentiment',
      'market_summary'
    ],
    blackrock: [
      'optimize_portfolio',
      'rebalancing_recommendation',
      'risk_analysis',
      'asset_allocation'
    ],
    robinhood: [
      'design_dashboard',
      'optimize_user_flow',
      'gamification_suggestions',
      'mobile_optimization'
    ]
  };

  return capabilities[agentType as keyof typeof capabilities] || [];
}