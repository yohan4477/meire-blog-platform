/**
 * 에이전트 간 통신 및 데이터 공유 시스템
 * Agent Communication & Data Sharing System
 */

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification' | 'data';
  payload: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  correlationId?: string;
}

export interface AgentCapability {
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
  processingTime: number; // milliseconds
  reliability: number; // 0-1 scale
}

export interface AgentProfile {
  id: string;
  name: string;
  type: 'bloomberg-analyst' | 'goldman-sachs-analyst' | 'blackrock-portfolio-manager';
  version: string;
  capabilities: AgentCapability[];
  status: 'online' | 'offline' | 'busy' | 'error';
  load: number; // 0-100 percentage
  lastHeartbeat: Date;
}

export class AgentCommunicationHub {
  private agents: Map<string, AgentProfile> = new Map();
  private messageQueue: Map<string, AgentMessage[]> = new Map();
  private sharedDataStore: Map<string, any> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  
  constructor() {
    this.initializeDefaultAgents();
    this.startHeartbeatMonitoring();
  }

  private initializeDefaultAgents() {
    const agents: AgentProfile[] = [
      {
        id: 'bloomberg-analyst-v2',
        name: 'Bloomberg Market Data Analyst',
        type: 'bloomberg-analyst',
        version: '2.0.0',
        capabilities: [
          {
            name: 'realtime-market-data',
            description: '실시간 시장 데이터 수집 및 분석',
            inputTypes: ['ticker', 'market-request'],
            outputTypes: ['market-data', 'price-alert'],
            processingTime: 100,
            reliability: 0.99
          },
          {
            name: 'technical-analysis',
            description: '기술적 분석 및 차트 패턴 인식',
            inputTypes: ['price-data', 'volume-data'],
            outputTypes: ['technical-signals', 'chart-patterns'],
            processingTime: 500,
            reliability: 0.95
          },
          {
            name: 'news-sentiment',
            description: '뉴스 감성 분석 및 시장 영향 예측',
            inputTypes: ['news-feed', 'market-events'],
            outputTypes: ['sentiment-score', 'impact-forecast'],
            processingTime: 200,
            reliability: 0.90
          }
        ],
        status: 'online',
        load: 15,
        lastHeartbeat: new Date()
      },
      {
        id: 'goldman-sachs-analyst-v2',
        name: 'Goldman Sachs Stock Analyst',
        type: 'goldman-sachs-analyst',
        version: '2.0.0',
        capabilities: [
          {
            name: 'fundamental-analysis',
            description: '기업 펀더멘털 분석 및 밸류에이션',
            inputTypes: ['financial-statements', 'sec-filings'],
            outputTypes: ['valuation-model', 'investment-rating'],
            processingTime: 2000,
            reliability: 0.97
          },
          {
            name: 'earnings-forecast',
            description: '실적 예측 및 가이던스 분석',
            inputTypes: ['earnings-data', 'company-guidance'],
            outputTypes: ['earnings-forecast', 'eps-estimates'],
            processingTime: 1500,
            reliability: 0.92
          },
          {
            name: 'stock-recommendation',
            description: '종목 추천 및 투자 의견 제공',
            inputTypes: ['market-data', 'fundamental-data'],
            outputTypes: ['buy-sell-hold', 'price-target'],
            processingTime: 3000,
            reliability: 0.88
          }
        ],
        status: 'online',
        load: 25,
        lastHeartbeat: new Date()
      },
      {
        id: 'blackrock-portfolio-manager-v2',
        name: 'BlackRock Portfolio Manager',
        type: 'blackrock-portfolio-manager',
        version: '2.0.0',
        capabilities: [
          {
            name: 'portfolio-optimization',
            description: '포트폴리오 최적화 및 자산 배분',
            inputTypes: ['holdings-data', 'risk-preferences'],
            outputTypes: ['optimal-allocation', 'rebalancing-plan'],
            processingTime: 5000,
            reliability: 0.95
          },
          {
            name: 'risk-analysis',
            description: '포트폴리오 리스크 분석 및 측정',
            inputTypes: ['portfolio-data', 'market-data'],
            outputTypes: ['risk-metrics', 'var-analysis'],
            processingTime: 2000,
            reliability: 0.96
          },
          {
            name: 'performance-attribution',
            description: '성과 기여도 분석 및 벤치마크 비교',
            inputTypes: ['portfolio-returns', 'benchmark-data'],
            outputTypes: ['attribution-analysis', 'performance-report'],
            processingTime: 1000,
            reliability: 0.94
          }
        ],
        status: 'online',
        load: 30,
        lastHeartbeat: new Date()
      }
    ];

    agents.forEach(agent => {
      this.agents.set(agent.id, agent);
      this.messageQueue.set(agent.id, []);
    });
  }

  private startHeartbeatMonitoring() {
    setInterval(() => {
      this.agents.forEach((agent, id) => {
        const timeSinceLastHeartbeat = Date.now() - agent.lastHeartbeat.getTime();
        if (timeSinceLastHeartbeat > 30000) { // 30초
          agent.status = 'offline';
        }
      });
    }, 10000); // 10초마다 체크
  }

  /**
   * 에이전트 등록
   */
  registerAgent(agent: AgentProfile): boolean {
    try {
      this.agents.set(agent.id, agent);
      this.messageQueue.set(agent.id, []);
      this.subscriptions.set(agent.id, new Set());
      return true;
    } catch (error) {
      console.error(`Failed to register agent ${agent.id}:`, error);
      return false;
    }
  }

  /**
   * 에이전트 상태 업데이트
   */
  updateAgentStatus(agentId: string, status: AgentProfile['status'], load?: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastHeartbeat = new Date();
      if (load !== undefined) {
        agent.load = load;
      }
    }
  }

  /**
   * 메시지 전송
   */
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullMessage: AgentMessage = {
      id: messageId,
      timestamp: new Date(),
      ...message
    };

    // 수신자 에이전트 확인
    const recipient = this.agents.get(message.to);
    if (!recipient || recipient.status === 'offline') {
      throw new Error(`Agent ${message.to} is not available`);
    }

    // 메시지 큐에 추가
    const queue = this.messageQueue.get(message.to);
    if (queue) {
      queue.push(fullMessage);
      
      // 우선순위에 따라 정렬
      queue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    }

    // 구독자들에게 알림
    this.notifySubscribers('message-sent', fullMessage);

    return messageId;
  }

  /**
   * 메시지 수신
   */
  getMessages(agentId: string, limit: number = 10): AgentMessage[] {
    const queue = this.messageQueue.get(agentId);
    if (!queue) return [];

    return queue.splice(0, limit);
  }

  /**
   * 공유 데이터 저장
   */
  setSharedData(key: string, value: any, expiry?: number): void {
    const data = {
      value,
      timestamp: Date.now(),
      expiry: expiry ? Date.now() + expiry : null
    };
    this.sharedDataStore.set(key, data);
  }

  /**
   * 공유 데이터 조회
   */
  getSharedData(key: string): any {
    const data = this.sharedDataStore.get(key);
    if (!data) return null;

    // 만료 확인
    if (data.expiry && Date.now() > data.expiry) {
      this.sharedDataStore.delete(key);
      return null;
    }

    return data.value;
  }

  /**
   * 에이전트 능력 조회
   */
  findAgentsByCapability(capabilityName: string): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities.some(cap => cap.name === capabilityName) &&
      agent.status === 'online'
    );
  }

  /**
   * 최적 에이전트 선택
   */
  selectBestAgent(capabilityName: string): AgentProfile | null {
    const candidates = this.findAgentsByCapability(capabilityName);
    if (candidates.length === 0) return null;

    // 부하가 낮고 신뢰도가 높은 에이전트 선택
    return candidates.reduce((best, current) => {
      const bestScore = (1 - best.load / 100) * 
        best.capabilities.find(cap => cap.name === capabilityName)?.reliability || 0;
      const currentScore = (1 - current.load / 100) * 
        current.capabilities.find(cap => cap.name === capabilityName)?.reliability || 0;
      
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * 이벤트 구독
   */
  subscribe(agentId: string, eventType: string): void {
    let subscriptions = this.subscriptions.get(eventType);
    if (!subscriptions) {
      subscriptions = new Set();
      this.subscriptions.set(eventType, subscriptions);
    }
    subscriptions.add(agentId);
  }

  /**
   * 구독자들에게 알림
   */
  private notifySubscribers(eventType: string, data: any): void {
    const subscribers = this.subscriptions.get(eventType);
    if (subscribers) {
      subscribers.forEach(agentId => {
        this.sendMessage({
          from: 'system',
          to: agentId,
          type: 'notification',
          payload: { eventType, data },
          priority: 'medium'
        });
      });
    }
  }

  /**
   * 에이전트 상태 조회
   */
  getAgentStatus(): { [key: string]: AgentProfile } {
    const status: { [key: string]: AgentProfile } = {};
    this.agents.forEach((agent, id) => {
      status[id] = { ...agent };
    });
    return status;
  }

  /**
   * 시스템 헬스 체크
   */
  getSystemHealth(): {
    totalAgents: number;
    onlineAgents: number;
    averageLoad: number;
    messageQueueSize: number;
    sharedDataSize: number;
  } {
    const totalAgents = this.agents.size;
    const onlineAgents = Array.from(this.agents.values()).filter(
      agent => agent.status === 'online'
    ).length;
    
    const totalLoad = Array.from(this.agents.values()).reduce(
      (sum, agent) => sum + agent.load, 0
    );
    const averageLoad = totalAgents > 0 ? totalLoad / totalAgents : 0;

    const messageQueueSize = Array.from(this.messageQueue.values()).reduce(
      (sum, queue) => sum + queue.length, 0
    );

    return {
      totalAgents,
      onlineAgents,
      averageLoad,
      messageQueueSize,
      sharedDataSize: this.sharedDataStore.size
    };
  }
}

// 싱글톤 인스턴스
export const agentCommunicationHub = new AgentCommunicationHub();