/**
 * API 엔드포인트: 에이전트 워크플로우 시스템
 * Agent Workflow System API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentCommunicationHub } from '@/lib/agents/agent-communication';
import { workflowOrchestrator } from '@/lib/agents/workflow-orchestrator';
import { triggerScheduler } from '@/lib/agents/trigger-scheduler';
import { reportIntegrationSystem } from '@/lib/agents/report-integration';
import { realTimeMarketAnalysisWorkflow } from '@/lib/agents/workflow-implementations';
import { portfolioOptimizationWorkflow, newsEventResponseWorkflow } from '@/lib/agents/workflow-implementations-extended';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          data: {
            agents: agentCommunicationHub.getAgentStatus(),
            system: agentCommunicationHub.getSystemHealth(),
            workflows: {
              active: workflowOrchestrator.getActiveExecutions(),
              available: workflowOrchestrator.getWorkflows()
            },
            triggers: {
              active: triggerScheduler.getActiveTriggers(),
              schedules: triggerScheduler.getActiveSchedules(),
              system: triggerScheduler.getSystemStatus()
            },
            reports: {
              recent: reportIntegrationSystem.getRecentReports(5),
              stats: reportIntegrationSystem.getSystemStats()
            }
          }
        });

      case 'workflows':
        const workflows = workflowOrchestrator.getWorkflows();
        return NextResponse.json({
          success: true,
          data: workflows
        });

      case 'executions':
        const executions = workflowOrchestrator.getActiveExecutions();
        return NextResponse.json({
          success: true,
          data: executions
        });

      case 'reports':
        const limit = parseInt(searchParams.get('limit') || '10');
        const reports = reportIntegrationSystem.getRecentReports(limit);
        return NextResponse.json({
          success: true,
          data: reports
        });

      case 'health':
        return NextResponse.json({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            agents: agentCommunicationHub.getSystemHealth(),
            triggers: triggerScheduler.getSystemStatus(),
            reports: reportIntegrationSystem.getSystemStats()
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent workflow API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'execute-workflow':
        const { workflowId, context = {} } = params;
        if (!workflowId) {
          return NextResponse.json({
            success: false,
            error: 'workflowId is required'
          }, { status: 400 });
        }

        const executionId = await workflowOrchestrator.executeWorkflow(workflowId, context);
        return NextResponse.json({
          success: true,
          data: { executionId }
        });

      case 'trigger-market-analysis':
        const { symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'] } = params;
        const marketResult = await realTimeMarketAnalysisWorkflow.collectMarketData(symbols);
        
        return NextResponse.json({
          success: true,
          data: {
            analysisId: marketResult.id,
            summary: marketResult.data.insights.join('. '),
            confidence: marketResult.confidence,
            priority: marketResult.priority
          }
        });

      case 'optimize-portfolio':
        const { portfolioData, riskPreferences = { riskTolerance: 'medium' } } = params;
        if (!portfolioData) {
          return NextResponse.json({
            success: false,
            error: 'portfolioData is required'
          }, { status: 400 });
        }

        const optimizationResult = await portfolioOptimizationWorkflow.analyzeCurrentPortfolio(portfolioData);
        
        return NextResponse.json({
          success: true,
          data: {
            analysisId: optimizationResult.id,
            healthScore: optimizationResult.data.healthScore,
            insights: optimizationResult.data.insights,
            recommendations: optimizationResult.data.allocation
          }
        });

      case 'process-news-event':
        const { newsEvent } = params;
        if (!newsEvent) {
          return NextResponse.json({
            success: false,
            error: 'newsEvent is required'
          }, { status: 400 });
        }

        const newsResult = await newsEventResponseWorkflow.analyzeNewsSentiment(newsEvent);
        
        return NextResponse.json({
          success: true,
          data: {
            analysisId: newsResult.id,
            sentiment: newsResult.data.sentimentScore,
            marketImpact: newsResult.data.marketImpact,
            affectedSectors: newsResult.data.affectedSectors,
            urgency: newsResult.data.urgencyLevel
          }
        });

      case 'manual-trigger':
        const { triggerId, context: triggerContext = {} } = params;
        if (!triggerId) {
          return NextResponse.json({
            success: false,
            error: 'triggerId is required'
          }, { status: 400 });
        }

        const triggerResult = await triggerScheduler.manualTrigger(triggerId, triggerContext);
        
        return NextResponse.json({
          success: true,
          data: { executionId: triggerResult }
        });

      case 'simulate-market-data':
        const { marketData } = params;
        if (!marketData) {
          return NextResponse.json({
            success: false,
            error: 'marketData is required'
          }, { status: 400 });
        }

        await triggerScheduler.processMarketData(marketData);
        
        return NextResponse.json({
          success: true,
          data: { message: 'Market data processed successfully' }
        });

      case 'cancel-execution':
        const { executionId: cancelExecutionId } = params;
        if (!cancelExecutionId) {
          return NextResponse.json({
            success: false,
            error: 'executionId is required'
          }, { status: 400 });
        }

        const cancelled = workflowOrchestrator.cancelExecution(cancelExecutionId);
        
        return NextResponse.json({
          success: true,
          data: { cancelled }
        });

      case 'subscribe-dashboard':
        const { subscriberId } = params;
        if (!subscriberId) {
          return NextResponse.json({
            success: false,
            error: 'subscriberId is required'
          }, { status: 400 });
        }

        reportIntegrationSystem.subscribeToDashboard(subscriberId);
        
        return NextResponse.json({
          success: true,
          data: { message: 'Dashboard subscription successful' }
        });

      case 'demo-workflow':
        // 데모용 통합 워크플로우 실행
        const demoResult = await executeDemoWorkflow();
        
        return NextResponse.json({
          success: true,
          data: demoResult
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent workflow POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * 데모용 통합 워크플로우 실행
 */
async function executeDemoWorkflow() {
  const steps = [];
  
  try {
    // 1. 실시간 시장 분석
    steps.push('🔄 Starting real-time market analysis...');
    const marketAnalysis = await realTimeMarketAnalysisWorkflow.collectMarketData(['AAPL', 'MSFT', 'GOOGL']);
    steps.push(`✅ Market analysis completed (Confidence: ${Math.round(marketAnalysis.confidence * 100)}%)`);

    // 2. 포트폴리오 최적화
    steps.push('🔄 Starting portfolio optimization...');
    const demoPortfolio = {
      id: 'demo-portfolio',
      totalValue: 100000,
      holdings: [
        { symbol: 'AAPL', shares: 100, currentPrice: 150, weight: 0.3, assetClass: 'equity' },
        { symbol: 'MSFT', shares: 80, currentPrice: 250, weight: 0.4, assetClass: 'equity' },
        { symbol: 'GOOGL', shares: 50, currentPrice: 120, weight: 0.3, assetClass: 'equity' }
      ]
    };
    
    const portfolioAnalysis = await portfolioOptimizationWorkflow.analyzeCurrentPortfolio(demoPortfolio);
    steps.push(`✅ Portfolio analysis completed (Health Score: ${portfolioAnalysis.data.healthScore}/100)`);

    // 3. 뉴스 이벤트 처리
    steps.push('🔄 Processing sample news event...');
    const demoNews = {
      id: 'demo-news',
      title: 'Federal Reserve announces interest rate decision',
      content: 'The Federal Reserve has decided to maintain current interest rates at 5.25-5.50%, citing concerns about inflation and economic stability.',
      source: 'Reuters',
      sentiment: 'neutral' as const,
      impact: 'high' as const,
      affectedSymbols: ['SPY', 'QQQ', 'IWM'],
      timestamp: new Date()
    };
    
    const newsAnalysis = await newsEventResponseWorkflow.analyzeNewsSentiment(demoNews);
    steps.push(`✅ News analysis completed (Sentiment: ${newsAnalysis.data.sentimentScore.label})`);

    // 4. 통합 리포트 생성
    steps.push('🔄 Generating integrated report...');
    const reports = reportIntegrationSystem.getRecentReports(3);
    steps.push(`✅ Generated ${reports.length} integrated reports`);

    return {
      success: true,
      executionTime: Date.now(),
      steps,
      results: {
        marketAnalysis: {
          id: marketAnalysis.id,
          insights: marketAnalysis.data.insights.slice(0, 3)
        },
        portfolioAnalysis: {
          id: portfolioAnalysis.id,
          healthScore: portfolioAnalysis.data.healthScore,
          insights: portfolioAnalysis.data.insights.slice(0, 3)
        },
        newsAnalysis: {
          id: newsAnalysis.id,
          sentiment: newsAnalysis.data.sentimentScore,
          impact: newsAnalysis.data.marketImpact
        },
        systemHealth: {
          agents: agentCommunicationHub.getSystemHealth(),
          triggers: triggerScheduler.getSystemStatus(),
          reports: reportIntegrationSystem.getSystemStats()
        }
      }
    };

  } catch (error) {
    steps.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'update-trigger':
        const { triggerId, enabled } = params;
        if (!triggerId || enabled === undefined) {
          return NextResponse.json({
            success: false,
            error: 'triggerId and enabled status are required'
          }, { status: 400 });
        }

        const triggerUpdated = triggerScheduler.toggleTrigger(triggerId, enabled);
        
        return NextResponse.json({
          success: true,
          data: { updated: triggerUpdated }
        });

      case 'update-schedule':
        const { scheduleId, enabled: scheduleEnabled } = params;
        if (!scheduleId || scheduleEnabled === undefined) {
          return NextResponse.json({
            success: false,
            error: 'scheduleId and enabled status are required'
          }, { status: 400 });
        }

        const scheduleUpdated = triggerScheduler.toggleSchedule(scheduleId, scheduleEnabled);
        
        return NextResponse.json({
          success: true,
          data: { updated: scheduleUpdated }
        });

      case 'update-notification-rule':
        const { ruleId, updates } = params;
        if (!ruleId || !updates) {
          return NextResponse.json({
            success: false,
            error: 'ruleId and updates are required'
          }, { status: 400 });
        }

        const ruleUpdated = reportIntegrationSystem.updateNotificationRule(ruleId, updates);
        
        return NextResponse.json({
          success: true,
          data: { updated: ruleUpdated }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent workflow PUT error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'unsubscribe-dashboard':
        const subscriberId = searchParams.get('subscriberId');
        if (!subscriberId) {
          return NextResponse.json({
            success: false,
            error: 'subscriberId is required'
          }, { status: 400 });
        }

        reportIntegrationSystem.unsubscribeFromDashboard(subscriberId);
        
        return NextResponse.json({
          success: true,
          data: { message: 'Dashboard unsubscription successful' }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent workflow DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}