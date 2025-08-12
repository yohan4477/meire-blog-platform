/**
 * 워크플로우 오케스트레이션 엔진
 * Workflow Orchestration Engine for Multi-Agent Collaboration
 */

import { agentCommunicationHub, AgentMessage, AgentProfile } from './agent-communication';

export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  capability: string;
  inputs: string[];
  outputs: string[];
  timeout: number;
  retryCount: number;
  dependencies: string[]; // 의존하는 다른 스텝들의 ID
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: 'manual' | 'scheduled' | 'event' | 'market_hours';
  steps: WorkflowStep[];
  maxExecutionTime: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  stepResults: Map<string, any>;
  errors: Array<{ stepId: string; error: string; timestamp: Date }>;
  context: any;
}

export class WorkflowOrchestrator {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeStandardWorkflows();
  }

  private initializeStandardWorkflows() {
    // 실시간 시장 분석 워크플로우
    const realTimeMarketAnalysis: WorkflowDefinition = {
      id: 'real-time-market-analysis',
      name: '실시간 시장 분석 워크플로우',
      description: 'Bloomberg → Goldman Sachs → BlackRock 순서로 실시간 시장 데이터를 분석하고 포트폴리오 영향도를 평가',
      trigger: 'event',
      maxExecutionTime: 30000, // 30초
      priority: 'high',
      steps: [
        {
          id: 'collect-market-data',
          name: '실시간 시장 데이터 수집',
          agentId: 'bloomberg-analyst-v2',
          capability: 'realtime-market-data',
          inputs: ['market-symbols'],
          outputs: ['market-data', 'price-changes'],
          timeout: 5000,
          retryCount: 2,
          dependencies: []
        },
        {
          id: 'analyze-individual-stocks',
          name: '개별 종목 분석',
          agentId: 'goldman-sachs-analyst-v2',
          capability: 'stock-recommendation',
          inputs: ['market-data'],
          outputs: ['stock-analysis', 'investment-signals'],
          timeout: 10000,
          retryCount: 1,
          dependencies: ['collect-market-data']
        },
        {
          id: 'assess-portfolio-impact',
          name: '포트폴리오 영향도 분석',
          agentId: 'blackrock-portfolio-manager-v2',
          capability: 'risk-analysis',
          inputs: ['stock-analysis', 'portfolio-holdings'],
          outputs: ['impact-assessment', 'rebalancing-suggestions'],
          timeout: 8000,
          retryCount: 1,
          dependencies: ['analyze-individual-stocks']
        },
        {
          id: 'generate-alerts',
          name: '통합 알림 생성',
          agentId: 'system',
          capability: 'notification-generation',
          inputs: ['impact-assessment', 'investment-signals'],
          outputs: ['user-notifications', 'dashboard-updates'],
          timeout: 2000,
          retryCount: 0,
          dependencies: ['assess-portfolio-impact']
        }
      ]
    };

    // 포트폴리오 최적화 워크플로우
    const portfolioOptimization: WorkflowDefinition = {
      id: 'portfolio-optimization',
      name: '포트폴리오 최적화 워크플로우',
      description: '사용자 포트폴리오를 분석하고 최적화 방안을 제시',
      trigger: 'manual',
      maxExecutionTime: 60000, // 1분
      priority: 'medium',
      steps: [
        {
          id: 'analyze-current-portfolio',
          name: '현재 포트폴리오 분석',
          agentId: 'blackrock-portfolio-manager-v2',
          capability: 'portfolio-optimization',
          inputs: ['user-portfolio'],
          outputs: ['portfolio-analysis', 'current-allocation'],
          timeout: 15000,
          retryCount: 1,
          dependencies: []
        },
        {
          id: 'evaluate-holdings',
          name: '보유 종목 평가',
          agentId: 'goldman-sachs-analyst-v2',
          capability: 'fundamental-analysis',
          inputs: ['current-allocation'],
          outputs: ['stock-evaluations', 'recommendations'],
          timeout: 20000,
          retryCount: 1,
          dependencies: ['analyze-current-portfolio']
        },
        {
          id: 'get-market-context',
          name: '시장 상황 분석',
          agentId: 'bloomberg-analyst-v2',
          capability: 'technical-analysis',
          inputs: ['portfolio-symbols'],
          outputs: ['market-trends', 'technical-signals'],
          timeout: 10000,
          retryCount: 2,
          dependencies: []
        },
        {
          id: 'optimize-allocation',
          name: '자산 배분 최적화',
          agentId: 'blackrock-portfolio-manager-v2',
          capability: 'portfolio-optimization',
          inputs: ['stock-evaluations', 'market-trends', 'risk-preferences'],
          outputs: ['optimal-allocation', 'rebalancing-plan'],
          timeout: 12000,
          retryCount: 1,
          dependencies: ['evaluate-holdings', 'get-market-context']
        },
        {
          id: 'generate-report',
          name: '최적화 리포트 생성',
          agentId: 'system',
          capability: 'report-generation',
          inputs: ['optimal-allocation', 'rebalancing-plan'],
          outputs: ['optimization-report'],
          timeout: 3000,
          retryCount: 0,
          dependencies: ['optimize-allocation']
        }
      ]
    };

    // 뉴스 이벤트 대응 워크플로우
    const newsEventResponse: WorkflowDefinition = {
      id: 'news-event-response',
      name: '뉴스 이벤트 대응 워크플로우',
      description: '중요 뉴스 감지 시 자동으로 영향 분석 및 대응방안 제시',
      trigger: 'event',
      maxExecutionTime: 45000, // 45초
      priority: 'critical',
      steps: [
        {
          id: 'analyze-news-sentiment',
          name: '뉴스 감성 분석',
          agentId: 'bloomberg-analyst-v2',
          capability: 'news-sentiment',
          inputs: ['news-event'],
          outputs: ['sentiment-analysis', 'affected-sectors'],
          timeout: 8000,
          retryCount: 1,
          dependencies: []
        },
        {
          id: 'identify-affected-stocks',
          name: '영향 받는 종목 식별',
          agentId: 'goldman-sachs-analyst-v2',
          capability: 'stock-recommendation',
          inputs: ['affected-sectors', 'news-event'],
          outputs: ['affected-stocks', 'impact-severity'],
          timeout: 12000,
          retryCount: 1,
          dependencies: ['analyze-news-sentiment']
        },
        {
          id: 'assess-portfolio-exposure',
          name: '포트폴리오 노출도 분석',
          agentId: 'blackrock-portfolio-manager-v2',
          capability: 'risk-analysis',
          inputs: ['affected-stocks', 'user-portfolios'],
          outputs: ['exposure-analysis', 'risk-metrics'],
          timeout: 10000,
          retryCount: 1,
          dependencies: ['identify-affected-stocks']
        },
        {
          id: 'generate-action-plan',
          name: '대응 방안 생성',
          agentId: 'blackrock-portfolio-manager-v2',
          capability: 'portfolio-optimization',
          inputs: ['exposure-analysis', 'impact-severity'],
          outputs: ['action-recommendations', 'hedging-strategies'],
          timeout: 12000,
          retryCount: 1,
          dependencies: ['assess-portfolio-exposure']
        },
        {
          id: 'send-urgent-alerts',
          name: '긴급 알림 발송',
          agentId: 'system',
          capability: 'urgent-notification',
          inputs: ['action-recommendations', 'affected-portfolios'],
          outputs: ['urgent-notifications'],
          timeout: 3000,
          retryCount: 0,
          dependencies: ['generate-action-plan']
        }
      ]
    };

    // 워크플로우 등록
    this.workflows.set(realTimeMarketAnalysis.id, realTimeMarketAnalysis);
    this.workflows.set(portfolioOptimization.id, portfolioOptimization);
    this.workflows.set(newsEventResponse.id, newsEventResponse);
  }

  /**
   * 워크플로우 실행
   */
  async executeWorkflow(
    workflowId: string, 
    context: any = {}
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      startTime: new Date(),
      stepResults: new Map(),
      errors: [],
      context
    };

    this.executions.set(executionId, execution);

    // 비동기로 워크플로우 실행
    this.runWorkflow(execution, workflow).catch(error => {
      console.error(`Workflow execution failed: ${error.message}`);
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.errors.push({
        stepId: 'workflow',
        error: error.message,
        timestamp: new Date()
      });
    });

    return executionId;
  }

  private async runWorkflow(
    execution: WorkflowExecution, 
    workflow: WorkflowDefinition
  ): Promise<void> {
    execution.status = 'running';
    
    try {
      // 실행 타임아웃 설정
      const timeoutId = setTimeout(() => {
        execution.status = 'failed';
        execution.endTime = new Date();
        execution.errors.push({
          stepId: 'workflow',
          error: 'Workflow execution timeout',
          timestamp: new Date()
        });
      }, workflow.maxExecutionTime);

      // 스텝 실행 계획 생성 (토폴로지 정렬)
      const executionPlan = this.createExecutionPlan(workflow.steps);
      
      // 스텝별 실행
      for (const stepGroup of executionPlan) {
        // 병렬 실행 가능한 스텝들을 동시에 실행
        const stepPromises = stepGroup.map(step => 
          this.executeStep(execution, step)
        );
        
        await Promise.all(stepPromises);
        
        // 실행 중 실패 시 중단
        if (execution.status === 'failed') {
          break;
        }
      }

      clearTimeout(timeoutId);
      
      if (execution.status !== 'failed') {
        execution.status = 'completed';
        execution.endTime = new Date();
      }

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.errors.push({
        stepId: 'workflow',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  private createExecutionPlan(steps: WorkflowStep[]): WorkflowStep[][] {
    const stepMap = new Map(steps.map(step => [step.id, step]));
    const visited = new Set<string>();
    const plan: WorkflowStep[][] = [];
    const currentLevel = new Set<string>();

    // 의존성이 없는 스텝들부터 시작
    const findRootSteps = () => {
      return steps.filter(step => 
        step.dependencies.length === 0 && !visited.has(step.id)
      );
    };

    while (visited.size < steps.length) {
      const availableSteps = steps.filter(step => {
        if (visited.has(step.id)) return false;
        return step.dependencies.every(dep => visited.has(dep));
      });

      if (availableSteps.length === 0) {
        throw new Error('Circular dependency detected in workflow');
      }

      plan.push(availableSteps);
      availableSteps.forEach(step => visited.add(step.id));
    }

    return plan;
  }

  private async executeStep(
    execution: WorkflowExecution, 
    step: WorkflowStep
  ): Promise<void> {
    try {
      // 에이전트 선택
      let targetAgent: AgentProfile | null = null;
      
      if (step.agentId === 'system') {
        // 시스템 작업 (알림, 리포트 생성 등)
        await this.executeSystemStep(execution, step);
        return;
      } else {
        targetAgent = agentCommunicationHub.findAgentsByCapability(step.capability)
          .find(agent => agent.id === step.agentId) || null;
      }

      if (!targetAgent) {
        targetAgent = agentCommunicationHub.selectBestAgent(step.capability);
      }

      if (!targetAgent) {
        throw new Error(`No available agent for capability: ${step.capability}`);
      }

      // 입력 데이터 준비
      const inputs = this.prepareStepInputs(execution, step);

      // 에이전트에게 메시지 전송
      const messageId = await agentCommunicationHub.sendMessage({
        from: 'workflow-orchestrator',
        to: targetAgent.id,
        type: 'request',
        payload: {
          stepId: step.id,
          capability: step.capability,
          inputs,
          executionId: execution.id
        },
        priority: 'high'
      });

      // 응답 대기
      const result = await this.waitForStepResult(
        targetAgent.id, 
        step.id, 
        step.timeout
      );

      execution.stepResults.set(step.id, result);

    } catch (error) {
      execution.errors.push({
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      // 재시도 로직
      if (step.retryCount > 0) {
        step.retryCount--;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        await this.executeStep(execution, step);
      } else {
        execution.status = 'failed';
        throw error;
      }
    }
  }

  private async executeSystemStep(
    execution: WorkflowExecution, 
    step: WorkflowStep
  ): Promise<void> {
    const inputs = this.prepareStepInputs(execution, step);
    
    switch (step.capability) {
      case 'notification-generation':
        const notifications = this.generateNotifications(inputs);
        execution.stepResults.set(step.id, notifications);
        break;
        
      case 'report-generation':
        const report = this.generateReport(inputs);
        execution.stepResults.set(step.id, report);
        break;
        
      case 'urgent-notification':
        const urgentAlerts = this.sendUrgentNotifications(inputs);
        execution.stepResults.set(step.id, urgentAlerts);
        break;
        
      default:
        throw new Error(`Unknown system capability: ${step.capability}`);
    }
  }

  private prepareStepInputs(execution: WorkflowExecution, step: WorkflowStep): any {
    const inputs: any = {};
    
    // 의존성 스텝의 결과물을 입력으로 사용
    step.dependencies.forEach(depId => {
      const depResult = execution.stepResults.get(depId);
      if (depResult) {
        Object.assign(inputs, depResult);
      }
    });

    // 컨텍스트 데이터 추가
    Object.assign(inputs, execution.context);

    return inputs;
  }

  private async waitForStepResult(
    agentId: string, 
    stepId: string, 
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step ${stepId} timeout`));
      }, timeout);

      const checkMessages = () => {
        const messages = agentCommunicationHub.getMessages(agentId, 1);
        const responseMessage = messages.find(msg => 
          msg.type === 'response' && 
          msg.payload?.stepId === stepId
        );

        if (responseMessage) {
          clearTimeout(timeoutId);
          resolve(responseMessage.payload.result);
        } else {
          setTimeout(checkMessages, 100); // 100ms마다 체크
        }
      };

      checkMessages();
    });
  }

  private generateNotifications(inputs: any): any {
    // 사용자 알림 생성 로직
    return {
      notifications: [
        {
          type: 'market-update',
          message: '시장 분석이 완료되었습니다.',
          data: inputs,
          timestamp: new Date()
        }
      ]
    };
  }

  private generateReport(inputs: any): any {
    // 리포트 생성 로직
    return {
      report: {
        title: '포트폴리오 최적화 리포트',
        content: inputs,
        generatedAt: new Date()
      }
    };
  }

  private sendUrgentNotifications(inputs: any): any {
    // 긴급 알림 발송 로직
    return {
      urgentAlerts: [
        {
          level: 'critical',
          message: '중요 시장 이벤트가 감지되었습니다.',
          actionRequired: true,
          data: inputs,
          timestamp: new Date()
        }
      ]
    };
  }

  /**
   * 워크플로우 상태 조회
   */
  getExecutionStatus(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * 실행 중인 워크플로우 목록
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(
      execution => execution.status === 'running'
    );
  }

  /**
   * 워크플로우 취소
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      return true;
    }
    return false;
  }

  /**
   * 스케줄된 워크플로우 등록
   */
  scheduleWorkflow(
    workflowId: string,
    cronExpression: string,
    context: any = {}
  ): void {
    // 간단한 스케줄링 (실제로는 node-cron 등 사용)
    const intervalId = setInterval(() => {
      this.executeWorkflow(workflowId, context);
    }, 60000); // 1분마다 체크 (실제 구현에서는 cron 표현식 파싱 필요)

    this.scheduledTasks.set(workflowId, intervalId);
  }

  /**
   * 워크플로우 목록 조회
   */
  getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * 커스텀 워크플로우 등록
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }
}

// 싱글톤 인스턴스
export const workflowOrchestrator = new WorkflowOrchestrator();