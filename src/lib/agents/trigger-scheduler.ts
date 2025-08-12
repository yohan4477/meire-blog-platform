/**
 * 실시간 트리거 및 스케줄링 시스템
 * Real-time Trigger & Scheduling System
 */

import { workflowOrchestrator } from './workflow-orchestrator';
import { agentCommunicationHub } from './agent-communication';

export interface TriggerRule {
  id: string;
  name: string;
  type: 'market_data' | 'news_event' | 'price_change' | 'volume_spike' | 'time_based' | 'user_action';
  condition: {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'contains' | 'threshold_breach';
    value: any;
    timeframe?: string;
  };
  workflowId: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod: number; // 재트리거 방지 (milliseconds)
  lastTriggered?: Date;
}

export interface ScheduleRule {
  id: string;
  name: string;
  workflowId: string;
  schedule: {
    type: 'cron' | 'interval' | 'market_hours';
    expression: string; // cron 표현식 또는 interval (ms)
    timezone?: string;
  };
  enabled: boolean;
  context?: any;
  nextRun?: Date;
}

export interface MarketDataPoint {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

export interface NewsEvent {
  id: string;
  title: string;
  content: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedSymbols: string[];
  timestamp: Date;
}

export class TriggerScheduler {
  private triggerRules: Map<string, TriggerRule> = new Map();
  private scheduleRules: Map<string, ScheduleRule> = new Map();
  private activeSchedules: Map<string, NodeJS.Timeout> = new Map();
  private marketDataSubscriptions: Set<string> = new Set();
  private isMarketHours: boolean = false;

  constructor() {
    this.initializeDefaultTriggers();
    this.initializeDefaultSchedules();
    this.startMarketHoursMonitoring();
  }

  private initializeDefaultTriggers() {
    const defaultTriggers: TriggerRule[] = [
      {
        id: 'large-price-movement',
        name: '대형 주가 변동 감지',
        type: 'price_change',
        condition: {
          field: 'changePercent',
          operator: 'gt',
          value: 5, // 5% 이상 변동
          timeframe: '1m'
        },
        workflowId: 'real-time-market-analysis',
        enabled: true,
        priority: 'high',
        cooldownPeriod: 300000 // 5분
      },
      {
        id: 'volume-spike-detection',
        name: '거래량 급증 감지',
        type: 'volume_spike',
        condition: {
          field: 'volume',
          operator: 'gt',
          value: 200, // 평균 대비 200% 이상
          timeframe: '5m'
        },
        workflowId: 'real-time-market-analysis',
        enabled: true,
        priority: 'medium',
        cooldownPeriod: 600000 // 10분
      },
      {
        id: 'critical-news-event',
        name: '중요 뉴스 이벤트',
        type: 'news_event',
        condition: {
          field: 'impact',
          operator: 'eq',
          value: 'critical'
        },
        workflowId: 'news-event-response',
        enabled: true,
        priority: 'critical',
        cooldownPeriod: 0 // 즉시 재트리거 가능
      },
      {
        id: 'market-crash-detection',
        name: '시장 급락 감지',
        type: 'market_data',
        condition: {
          field: 'marketIndex',
          operator: 'lt',
          value: -3, // S&P 500 3% 이상 하락
          timeframe: '1h'
        },
        workflowId: 'news-event-response',
        enabled: true,
        priority: 'critical',
        cooldownPeriod: 1800000 // 30분
      }
    ];

    defaultTriggers.forEach(trigger => {
      this.triggerRules.set(trigger.id, trigger);
    });
  }

  private initializeDefaultSchedules() {
    const defaultSchedules: ScheduleRule[] = [
      {
        id: 'daily-portfolio-review',
        name: '일일 포트폴리오 리뷰',
        workflowId: 'portfolio-optimization',
        schedule: {
          type: 'cron',
          expression: '0 9 * * 1-5', // 평일 오전 9시
          timezone: 'Asia/Seoul'
        },
        enabled: true,
        context: { type: 'daily-review' }
      },
      {
        id: 'market-open-analysis',
        name: '장 개장 전 분석',
        workflowId: 'real-time-market-analysis',
        schedule: {
          type: 'market_hours',
          expression: 'pre-market', // 프리마켓 30분 전
          timezone: 'America/New_York'
        },
        enabled: true,
        context: { type: 'pre-market-analysis' }
      },
      {
        id: 'weekly-performance-report',
        name: '주간 성과 리포트',
        workflowId: 'portfolio-optimization',
        schedule: {
          type: 'cron',
          expression: '0 18 * * 5', // 금요일 오후 6시
          timezone: 'Asia/Seoul'
        },
        enabled: true,
        context: { type: 'weekly-report' }
      },
      {
        id: 'earnings-season-monitoring',
        name: '실적 발표 시즌 모니터링',
        workflowId: 'real-time-market-analysis',
        schedule: {
          type: 'interval',
          expression: '1800000', // 30분마다
          timezone: 'America/New_York'
        },
        enabled: false, // 실적 시즌에만 활성화
        context: { type: 'earnings-monitoring' }
      }
    ];

    defaultSchedules.forEach(schedule => {
      this.scheduleRules.set(schedule.id, schedule);
      if (schedule.enabled) {
        this.activateSchedule(schedule);
      }
    });
  }

  private startMarketHoursMonitoring() {
    // 시장 시간 모니터링 (간단한 구현)
    setInterval(() => {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const seoulTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      
      // 미국 시장 시간 (9:30 AM - 4:00 PM ET, 월-금)
      const hour = nyTime.getHours();
      const day = nyTime.getDay();
      const isWeekday = day >= 1 && day <= 5;
      const isDuringMarketHours = hour >= 9 && hour < 16;
      
      this.isMarketHours = isWeekday && isDuringMarketHours;
    }, 60000); // 1분마다 체크
  }

  /**
   * 시장 데이터 트리거 처리
   */
  async processMarketData(data: MarketDataPoint): Promise<void> {
    const applicableTriggers = Array.from(this.triggerRules.values()).filter(
      trigger => trigger.enabled && 
                 (trigger.type === 'market_data' || trigger.type === 'price_change' || trigger.type === 'volume_spike')
    );

    for (const trigger of applicableTriggers) {
      if (this.shouldSkipTrigger(trigger)) continue;

      const isTriggered = this.evaluateCondition(trigger, data);
      if (isTriggered) {
        await this.executeTrigger(trigger, { marketData: data });
      }
    }
  }

  /**
   * 뉴스 이벤트 트리거 처리
   */
  async processNewsEvent(event: NewsEvent): Promise<void> {
    const applicableTriggers = Array.from(this.triggerRules.values()).filter(
      trigger => trigger.enabled && trigger.type === 'news_event'
    );

    for (const trigger of applicableTriggers) {
      if (this.shouldSkipTrigger(trigger)) continue;

      const isTriggered = this.evaluateCondition(trigger, event);
      if (isTriggered) {
        await this.executeTrigger(trigger, { newsEvent: event });
      }
    }
  }

  private shouldSkipTrigger(trigger: TriggerRule): boolean {
    // 쿨다운 기간 체크
    if (trigger.lastTriggered && trigger.cooldownPeriod > 0) {
      const timeSinceLastTrigger = Date.now() - trigger.lastTriggered.getTime();
      if (timeSinceLastTrigger < trigger.cooldownPeriod) {
        return true;
      }
    }

    // 시장 시간 체크 (필요한 경우)
    if (trigger.type === 'market_data' || trigger.type === 'price_change') {
      return !this.isMarketHours;
    }

    return false;
  }

  private evaluateCondition(trigger: TriggerRule, data: any): boolean {
    const { field, operator, value } = trigger.condition;
    const fieldValue = this.getFieldValue(data, field);

    switch (operator) {
      case 'gt':
        return fieldValue > value;
      case 'lt':
        return fieldValue < value;
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'threshold_breach':
        return Math.abs(fieldValue) > Math.abs(value);
      default:
        return false;
    }
  }

  private getFieldValue(data: any, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private async executeTrigger(trigger: TriggerRule, context: any): Promise<void> {
    try {
      console.log(`🚨 Trigger activated: ${trigger.name}`);
      
      // 트리거 실행 기록
      trigger.lastTriggered = new Date();
      
      // 워크플로우 실행
      const executionId = await workflowOrchestrator.executeWorkflow(
        trigger.workflowId,
        { 
          ...context, 
          trigger: trigger.name,
          priority: trigger.priority 
        }
      );

      // 에이전트들에게 알림
      await agentCommunicationHub.sendMessage({
        from: 'trigger-scheduler',
        to: 'system',
        type: 'notification',
        payload: {
          event: 'trigger-activated',
          triggerId: trigger.id,
          triggerName: trigger.name,
          executionId,
          context
        },
        priority: trigger.priority === 'critical' ? 'critical' : 'high'
      });

    } catch (error) {
      console.error(`Failed to execute trigger ${trigger.id}:`, error);
    }
  }

  /**
   * 스케줄 활성화
   */
  private activateSchedule(schedule: ScheduleRule): void {
    if (this.activeSchedules.has(schedule.id)) {
      clearTimeout(this.activeSchedules.get(schedule.id)!);
    }

    let timeoutId: NodeJS.Timeout;

    switch (schedule.schedule.type) {
      case 'interval':
        const interval = parseInt(schedule.schedule.expression);
        timeoutId = setInterval(() => {
          this.executeScheduledWorkflow(schedule);
        }, interval);
        break;

      case 'cron':
        // 간단한 cron 구현 (실제로는 node-cron 사용 권장)
        timeoutId = this.scheduleCronJob(schedule);
        break;

      case 'market_hours':
        timeoutId = this.scheduleMarketHoursJob(schedule);
        break;

      default:
        console.error(`Unknown schedule type: ${schedule.schedule.type}`);
        return;
    }

    this.activeSchedules.set(schedule.id, timeoutId);
  }

  private scheduleCronJob(schedule: ScheduleRule): NodeJS.Timeout {
    // 간단한 구현 - 실제로는 node-cron 사용
    const nextRun = this.calculateNextCronRun(schedule.schedule.expression);
    const delay = nextRun.getTime() - Date.now();

    return setTimeout(() => {
      this.executeScheduledWorkflow(schedule);
      // 다음 실행 스케줄링
      this.activateSchedule(schedule);
    }, delay);
  }

  private scheduleMarketHoursJob(schedule: ScheduleRule): NodeJS.Timeout {
    // 시장 시간 기반 스케줄링
    const nextMarketEvent = this.calculateNextMarketEvent(schedule.schedule.expression);
    const delay = nextMarketEvent.getTime() - Date.now();

    return setTimeout(() => {
      this.executeScheduledWorkflow(schedule);
      this.activateSchedule(schedule);
    }, delay);
  }

  private async executeScheduledWorkflow(schedule: ScheduleRule): Promise<void> {
    try {
      console.log(`⏰ Scheduled workflow executing: ${schedule.name}`);
      
      const executionId = await workflowOrchestrator.executeWorkflow(
        schedule.workflowId,
        {
          ...schedule.context,
          scheduledExecution: true,
          scheduleId: schedule.id
        }
      );

      console.log(`✅ Scheduled workflow started: ${executionId}`);

    } catch (error) {
      console.error(`Failed to execute scheduled workflow ${schedule.id}:`, error);
    }
  }

  private calculateNextCronRun(cronExpression: string): Date {
    // 간단한 cron 파싱 (실제로는 cron-parser 라이브러리 사용)
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression');
    }

    const [minute, hour, day, month, weekday] = parts;
    const now = new Date();
    const next = new Date();

    // 기본적인 시간 설정 (매우 간단한 구현)
    if (minute !== '*') next.setMinutes(parseInt(minute));
    if (hour !== '*') next.setHours(parseInt(hour));

    // 다음 날로 넘어가는 경우
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  private calculateNextMarketEvent(eventType: string): Date {
    const now = new Date();
    const next = new Date();

    switch (eventType) {
      case 'pre-market':
        // 프리마켓 30분 전 (8:00 AM ET)
        next.setHours(8, 0, 0, 0);
        break;
      case 'market-open':
        // 장 개장 (9:30 AM ET)
        next.setHours(9, 30, 0, 0);
        break;
      case 'market-close':
        // 장 마감 (4:00 PM ET)
        next.setHours(16, 0, 0, 0);
        break;
      default:
        next.setHours(now.getHours() + 1);
    }

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * 트리거 규칙 추가
   */
  addTriggerRule(rule: TriggerRule): void {
    this.triggerRules.set(rule.id, rule);
  }

  /**
   * 스케줄 규칙 추가
   */
  addScheduleRule(rule: ScheduleRule): void {
    this.scheduleRules.set(rule.id, rule);
    if (rule.enabled) {
      this.activateSchedule(rule);
    }
  }

  /**
   * 트리거 활성화/비활성화
   */
  toggleTrigger(triggerId: string, enabled: boolean): boolean {
    const trigger = this.triggerRules.get(triggerId);
    if (trigger) {
      trigger.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * 스케줄 활성화/비활성화
   */
  toggleSchedule(scheduleId: string, enabled: boolean): boolean {
    const schedule = this.scheduleRules.get(scheduleId);
    if (schedule) {
      schedule.enabled = enabled;
      
      if (enabled) {
        this.activateSchedule(schedule);
      } else {
        const timeoutId = this.activeSchedules.get(scheduleId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.activeSchedules.delete(scheduleId);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * 활성 트리거 목록
   */
  getActiveTriggers(): TriggerRule[] {
    return Array.from(this.triggerRules.values()).filter(trigger => trigger.enabled);
  }

  /**
   * 활성 스케줄 목록
   */
  getActiveSchedules(): ScheduleRule[] {
    return Array.from(this.scheduleRules.values()).filter(schedule => schedule.enabled);
  }

  /**
   * 시장 데이터 구독
   */
  subscribeToMarketData(symbols: string[]): void {
    symbols.forEach(symbol => {
      this.marketDataSubscriptions.add(symbol);
    });
  }

  /**
   * 수동 워크플로우 트리거
   */
  async manualTrigger(workflowId: string, context: any = {}): Promise<string> {
    return await workflowOrchestrator.executeWorkflow(workflowId, {
      ...context,
      manualTrigger: true,
      triggeredAt: new Date()
    });
  }

  /**
   * 시스템 상태 조회
   */
  getSystemStatus(): {
    marketHours: boolean;
    activeTriggers: number;
    activeSchedules: number;
    marketSubscriptions: number;
  } {
    return {
      marketHours: this.isMarketHours,
      activeTriggers: this.getActiveTriggers().length,
      activeSchedules: this.getActiveSchedules().length,
      marketSubscriptions: this.marketDataSubscriptions.size
    };
  }
}

// 싱글톤 인스턴스
export const triggerScheduler = new TriggerScheduler();