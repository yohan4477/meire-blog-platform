/**
 * 고급 사용자 맞춤형 알림 시스템
 * 머신러닝 기반 개인화, 스마트 필터링, 다채널 전송을 지원합니다.
 */

import type { NewsItem, CuratedContent } from './financial-news-curator';
import type { ExtendedUserProfile } from './user-profile-manager';
import type { StockQuote, PortfolioHolding } from '@/types';
import { contextManager } from './ai-agents-enhanced';

// 고급 알림 타입 정의
export interface EnhancedNotification {
  id: string;
  userId: string;
  type: 'BREAKING' | 'DIGEST' | 'PORTFOLIO' | 'INSIGHTS' | 'SYSTEM' | 'PRICE_ALERT' | 'NEWS_ALERT';
  title: string;
  message: string;
  data?: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  read: boolean;
  delivered: boolean;
  delivery_methods: ('IN_APP' | 'EMAIL' | 'PUSH' | 'SMS' | 'WEBHOOK')[];
  expires_at?: string;
  
  // 개인화 및 스마트 기능
  personalization_score: number;
  relevance_score: number;
  user_preferences_match: string[];
  smart_timing?: string; // 최적 전송 시간
  actionable: boolean;
  suggested_actions?: NotificationAction[];
  
  // 추적 및 분석
  interaction_data?: {
    opened?: string;
    clicked?: string;
    dismissed?: string;
    shared?: string;
    feedback_rating?: number;
  };
  
  // 그룹화 및 관리
  group_id?: string;
  thread_id?: string;
  suppressed?: boolean;
  suppression_reason?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'OPEN_LINK' | 'VIEW_PORTFOLIO' | 'TRADE' | 'ANALYZE' | 'DISMISS' | 'SNOOZE';
  data?: any;
  primary?: boolean;
}

export interface NotificationRule {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  conditions: NotificationCondition[];
  actions: NotificationRuleAction[];
  priority_adjustment?: number;
  frequency_limit?: {
    max_per_hour?: number;
    max_per_day?: number;
    cooldown_minutes?: number;
  };
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface NotificationRuleAction {
  type: 'BLOCK' | 'BOOST' | 'DELAY' | 'REDIRECT' | 'AGGREGATE';
  parameters?: any;
}

// 개인화 프로파일
export interface PersonalizationProfile {
  userId: string;
  preferences: {
    risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
    investment_style: 'passive' | 'active' | 'swing' | 'day_trading';
    sectors_of_interest: string[];
    notification_timing: {
      morning: boolean;
      afternoon: boolean;
      evening: boolean;
      weekends: boolean;
    };
    content_types: {
      breaking_news: boolean;
      analysis: boolean;
      portfolio_updates: boolean;
      price_alerts: boolean;
      educational: boolean;
    };
  };
  behavior_history: {
    open_rate: number;
    click_rate: number;
    dismissal_rate: number;
    preferred_timing: string[];
    engagement_patterns: Record<string, number>;
  };
  learning_data: {
    topic_interests: Record<string, number>;
    sentiment_preferences: Record<string, number>;
    action_patterns: Record<string, number>;
  };
  last_updated: string;
}

// 스마트 필터링 엔진
export class SmartFilteringEngine {
  private userProfiles: Map<string, PersonalizationProfile> = new Map();
  private notificationHistory: Map<string, EnhancedNotification[]> = new Map();

  // 알림 관련성 점수 계산
  calculateRelevanceScore(
    notification: Partial<EnhancedNotification>,
    userId: string
  ): number {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 0.5; // 기본 점수

    let score = 0.5;

    // 사용자 관심 섹터 매칭
    if (notification.data?.sector && profile.preferences.sectors_of_interest) {
      const sectorMatch = profile.preferences.sectors_of_interest.some(sector =>
        notification.data.sector.toLowerCase().includes(sector.toLowerCase())
      );
      if (sectorMatch) score += 0.2;
    }

    // 투자 스타일 매칭
    if (notification.type === 'BREAKING' && profile.preferences.investment_style === 'day_trading') {
      score += 0.15;
    } else if (notification.type === 'DIGEST' && profile.preferences.investment_style === 'passive') {
      score += 0.15;
    }

    // 콘텐츠 타입 선호도
    const contentTypeMap: Record<string, keyof PersonalizationProfile['preferences']['content_types']> = {
      'BREAKING': 'breaking_news',
      'INSIGHTS': 'analysis',
      'PORTFOLIO': 'portfolio_updates',
      'PRICE_ALERT': 'price_alerts',
    };
    
    const contentType = contentTypeMap[notification.type!];
    if (contentType && profile.preferences.content_types[contentType]) {
      score += 0.1;
    }

    // 과거 행동 패턴 기반 조정
    if (profile.behavior_history.open_rate > 0.7) {
      score += 0.05;
    }

    // 최근 참여도 기반 조정
    const recentEngagement = this.getRecentEngagementScore(userId);
    score += recentEngagement * 0.1;

    return Math.min(1.0, Math.max(0.0, score));
  }

  // 개인화 점수 계산
  calculatePersonalizationScore(
    notification: Partial<EnhancedNotification>,
    userId: string
  ): number {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 0.3; // 기본 점수

    let score = 0.3;

    // 학습된 토픽 관심도
    if (notification.data?.topics) {
      const topicInterests = notification.data.topics
        .map((topic: string) => profile.learning_data.topic_interests[topic] || 0)
        .reduce((sum: number, interest: number) => sum + interest, 0) / notification.data.topics.length;
      
      score += topicInterests * 0.3;
    }

    // 시간대 선호도
    const currentHour = new Date().getHours();
    const timePreference = this.getTimePreferenceScore(currentHour, profile);
    score += timePreference * 0.2;

    // 빈도 선호도 (너무 많은 알림 방지)
    const frequencyPenalty = this.calculateFrequencyPenalty(userId);
    score -= frequencyPenalty;

    return Math.min(1.0, Math.max(0.0, score));
  }

  // 스마트 타이밍 계산
  calculateOptimalTiming(userId: string): string {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 'immediate';

    const now = new Date();
    const currentHour = now.getHours();

    // 사용자 선호 시간대 확인
    const preferredTimes = profile.behavior_history.preferred_timing;
    if (preferredTimes && preferredTimes.length > 0) {
      // 가장 가까운 선호 시간 찾기
      const nextPreferredTime = this.findNextPreferredTime(currentHour, preferredTimes);
      if (nextPreferredTime) {
        return nextPreferredTime;
      }
    }

    // 기본 시간대 규칙
    if (profile.preferences.notification_timing.morning && currentHour >= 9 && currentHour <= 11) {
      return 'immediate';
    } else if (profile.preferences.notification_timing.afternoon && currentHour >= 13 && currentHour <= 17) {
      return 'immediate';
    } else if (profile.preferences.notification_timing.evening && currentHour >= 18 && currentHour <= 21) {
      return 'immediate';
    }

    // 다음 선호 시간까지 지연
    return this.getNextAvailableTime(profile);
  }

  // 알림 그룹화 제안
  suggestGrouping(notifications: EnhancedNotification[]): Map<string, EnhancedNotification[]> {
    const groups = new Map<string, EnhancedNotification[]>();

    notifications.forEach(notification => {
      let groupKey = notification.type;

      // 같은 심볼/회사 관련 알림 그룹화
      if (notification.data?.symbol) {
        groupKey = `${notification.type}_${notification.data.symbol}`;
      }

      // 같은 섹터 관련 알림 그룹화
      else if (notification.data?.sector) {
        groupKey = `${notification.type}_${notification.data.sector}`;
      }

      // 우선순위별 그룹화
      else if (notification.priority === 'URGENT') {
        groupKey = 'URGENT_ALERTS';
      }

      const group = groups.get(groupKey) || [];
      group.push(notification);
      groups.set(groupKey, group);
    });

    return groups;
  }

  // 개인화 프로파일 업데이트
  updatePersonalizationProfile(userId: string, interaction: {
    notificationId: string;
    action: 'open' | 'click' | 'dismiss' | 'share';
    timestamp: string;
    data?: any;
  }): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    const notification = this.findNotificationById(userId, interaction.notificationId);
    if (!notification) return;

    // 행동 패턴 업데이트
    this.updateBehaviorHistory(profile, interaction, notification);

    // 학습 데이터 업데이트
    this.updateLearningData(profile, interaction, notification);

    profile.last_updated = new Date().toISOString();
    this.userProfiles.set(userId, profile);
  }

  // 프라이빗 메서드들
  private getRecentEngagementScore(userId: string): number {
    const history = this.notificationHistory.get(userId) || [];
    const recentNotifications = history.filter(n => 
      new Date(n.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (recentNotifications.length === 0) return 0.5;

    const engagementRate = recentNotifications.filter(n => 
      n.interaction_data?.opened || n.interaction_data?.clicked
    ).length / recentNotifications.length;

    return engagementRate;
  }

  private getTimePreferenceScore(currentHour: number, profile: PersonalizationProfile): number {
    const preferredTimes = profile.behavior_history.preferred_timing;
    if (!preferredTimes || preferredTimes.length === 0) return 0.5;

    // 현재 시간이 선호 시간과 얼마나 가까운지 계산
    const timeScores = preferredTimes.map(timeStr => {
      const [hour] = timeStr.split(':').map(Number);
      const timeDiff = Math.abs(currentHour - hour);
      return Math.max(0, 1 - (timeDiff / 12)); // 12시간 차이면 0점
    });

    return Math.max(...timeScores);
  }

  private calculateFrequencyPenalty(userId: string): number {
    const history = this.notificationHistory.get(userId) || [];
    const last24Hours = history.filter(n => 
      new Date(n.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (last24Hours.length > 20) return 0.3; // 하루 20개 초과시 페널티
    if (last24Hours.length > 10) return 0.2; // 하루 10개 초과시 페널티
    if (last24Hours.length > 5) return 0.1; // 하루 5개 초과시 페널티

    return 0;
  }

  private findNextPreferredTime(currentHour: number, preferredTimes: string[]): string | null {
    const preferredHours = preferredTimes.map(timeStr => {
      const [hour] = timeStr.split(':').map(Number);
      return hour;
    }).sort((a, b) => a - b);

    // 오늘 남은 선호 시간 찾기
    const remainingToday = preferredHours.filter(hour => hour > currentHour);
    if (remainingToday.length > 0) {
      return `${remainingToday[0].toString().padStart(2, '0')}:00`;
    }

    // 내일 첫 번째 선호 시간
    if (preferredHours.length > 0) {
      return `tomorrow_${preferredHours[0].toString().padStart(2, '0')}:00`;
    }

    return null;
  }

  private getNextAvailableTime(profile: PersonalizationProfile): string {
    const now = new Date();
    const currentHour = now.getHours();

    // 다음 선호 시간대 찾기
    if (profile.preferences.notification_timing.evening && currentHour < 18) {
      return '18:00';
    } else if (profile.preferences.notification_timing.morning && currentHour >= 21) {
      return 'tomorrow_09:00';
    } else if (profile.preferences.notification_timing.afternoon && currentHour < 13) {
      return '13:00';
    }

    return 'immediate';
  }

  private findNotificationById(userId: string, notificationId: string): EnhancedNotification | null {
    const history = this.notificationHistory.get(userId) || [];
    return history.find(n => n.id === notificationId) || null;
  }

  private updateBehaviorHistory(
    profile: PersonalizationProfile,
    interaction: any,
    notification: EnhancedNotification
  ): void {
    // 오픈율 업데이트
    if (interaction.action === 'open') {
      profile.behavior_history.open_rate = this.calculateNewRate(
        profile.behavior_history.open_rate,
        true
      );
    }

    // 클릭율 업데이트
    if (interaction.action === 'click') {
      profile.behavior_history.click_rate = this.calculateNewRate(
        profile.behavior_history.click_rate,
        true
      );
    }

    // 무시율 업데이트
    if (interaction.action === 'dismiss') {
      profile.behavior_history.dismissal_rate = this.calculateNewRate(
        profile.behavior_history.dismissal_rate,
        true
      );
    }

    // 선호 시간대 업데이트
    const interactionTime = new Date(interaction.timestamp);
    const timeKey = `${interactionTime.getHours().toString().padStart(2, '0')}:00`;
    
    if (interaction.action === 'open' || interaction.action === 'click') {
      if (!profile.behavior_history.preferred_timing.includes(timeKey)) {
        profile.behavior_history.preferred_timing.push(timeKey);
      }
    }
  }

  private updateLearningData(
    profile: PersonalizationProfile,
    interaction: any,
    notification: EnhancedNotification
  ): void {
    // 토픽 관심도 업데이트
    if (notification.data?.topics) {
      const weight = interaction.action === 'click' ? 0.1 : 
                    interaction.action === 'open' ? 0.05 : -0.02;
      
      notification.data.topics.forEach((topic: string) => {
        const currentInterest = profile.learning_data.topic_interests[topic] || 0.5;
        profile.learning_data.topic_interests[topic] = Math.max(0, Math.min(1, currentInterest + weight));
      });
    }

    // 액션 패턴 업데이트
    const actionKey = `${notification.type}_${interaction.action}`;
    profile.learning_data.action_patterns[actionKey] = 
      (profile.learning_data.action_patterns[actionKey] || 0) + 1;
  }

  private calculateNewRate(currentRate: number, success: boolean): number {
    // 지수적 이동 평균을 사용한 비율 업데이트
    const alpha = 0.1; // 학습률
    return currentRate * (1 - alpha) + (success ? 1 : 0) * alpha;
  }
}

// 고급 알림 시스템
export class EnhancedNotificationSystem {
  private static instance: EnhancedNotificationSystem;
  private smartFilter: SmartFilteringEngine;
  private notifications: Map<string, EnhancedNotification[]> = new Map();
  private rules: Map<string, NotificationRule[]> = new Map();
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.smartFilter = new SmartFilteringEngine();
    this.initializeEnhancedSystem();
  }

  static getInstance(): EnhancedNotificationSystem {
    if (!EnhancedNotificationSystem.instance) {
      EnhancedNotificationSystem.instance = new EnhancedNotificationSystem();
    }
    return EnhancedNotificationSystem.instance;
  }

  // 스마트 알림 생성
  async createSmartNotification(
    userId: string,
    baseNotification: Partial<EnhancedNotification>
  ): Promise<EnhancedNotification> {
    // 관련성 점수 계산
    const relevanceScore = this.smartFilter.calculateRelevanceScore(baseNotification, userId);
    
    // 개인화 점수 계산
    const personalizationScore = this.smartFilter.calculatePersonalizationScore(baseNotification, userId);
    
    // 최적 타이밍 계산
    const smartTiming = this.smartFilter.calculateOptimalTiming(userId);
    
    // 사용자 선호도 매칭
    const userPreferencesMatch = this.findPreferenceMatches(userId, baseNotification);
    
    // 제안 액션 생성
    const suggestedActions = await this.generateSuggestedActions(baseNotification);

    const enhancedNotification: EnhancedNotification = {
      id: baseNotification.id || `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: baseNotification.type || 'SYSTEM',
      title: baseNotification.title || '',
      message: baseNotification.message || '',
      data: baseNotification.data,
      priority: this.calculateSmartPriority(baseNotification, relevanceScore, personalizationScore),
      created_at: new Date().toISOString(),
      read: false,
      delivered: false,
      delivery_methods: this.selectOptimalChannels(userId, relevanceScore, personalizationScore),
      expires_at: baseNotification.expires_at,
      
      // 스마트 기능
      personalization_score: personalizationScore,
      relevance_score: relevanceScore,
      user_preferences_match: userPreferencesMatch,
      smart_timing: smartTiming,
      actionable: suggestedActions.length > 0,
      suggested_actions: suggestedActions,
    };

    return enhancedNotification;
  }

  // 스마트 전송
  async sendSmartNotification(notification: EnhancedNotification): Promise<void> {
    // 규칙 기반 필터링
    const shouldSend = await this.applyNotificationRules(notification);
    if (!shouldSend) {
      notification.suppressed = true;
      notification.suppression_reason = 'Rule-based filtering';
      return;
    }

    // 스마트 타이밍 적용
    if (notification.smart_timing && notification.smart_timing !== 'immediate') {
      await this.scheduleSmartDelivery(notification);
      return;
    }

    // 즉시 전송
    await this.deliverEnhancedNotification(notification);
  }

  // 배치 알림 처리 (중복 제거 및 그룹화)
  async processBatchNotifications(
    userId: string,
    notifications: Partial<EnhancedNotification>[]
  ): Promise<void> {
    // 스마트 알림으로 변환
    const enhancedNotifications = await Promise.all(
      notifications.map(n => this.createSmartNotification(userId, n))
    );

    // 중복 제거
    const deduped = this.deduplicateNotifications(enhancedNotifications);

    // 그룹화 제안
    const groups = this.smartFilter.suggestGrouping(deduped);

    // 그룹별 처리
    for (const [groupId, groupNotifications] of groups) {
      if (groupNotifications.length > 3) {
        // 다중 알림을 하나의 요약 알림으로 통합
        const summaryNotification = await this.createSummaryNotification(groupId, groupNotifications);
        await this.sendSmartNotification(summaryNotification);
      } else {
        // 개별 알림 전송
        for (const notification of groupNotifications) {
          await this.sendSmartNotification(notification);
        }
      }
    }
  }

  // 알림 상호작용 추적
  trackInteraction(
    userId: string,
    notificationId: string,
    action: 'open' | 'click' | 'dismiss' | 'share',
    data?: any
  ): void {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification) {
      if (!notification.interaction_data) {
        notification.interaction_data = {};
      }
      
      notification.interaction_data[action] = new Date().toISOString();
      
      // 스마트 필터링 엔진에 학습 데이터 제공
      this.smartFilter.updatePersonalizationProfile(userId, {
        notificationId,
        action,
        timestamp: new Date().toISOString(),
        data,
      });

      // 컨텍스트 매니저에 상호작용 추가
      contextManager.addContext(`notification_${userId}`, {
        type: 'notification_interaction',
        data: { notificationId, action, timestamp: new Date().toISOString() },
      });
    }
  }

  // 사용자 맞춤 규칙 추가
  addNotificationRule(userId: string, rule: NotificationRule): void {
    const userRules = this.rules.get(userId) || [];
    userRules.push(rule);
    this.rules.set(userId, userRules);
  }

  // 알림 분석 리포트
  generateInsightsReport(userId: string): {
    engagement_summary: any;
    preferences_insights: any;
    optimization_suggestions: string[];
  } {
    const userNotifications = this.notifications.get(userId) || [];
    const recentNotifications = userNotifications.filter(n => 
      new Date(n.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // 참여도 요약
    const engagementSummary = this.calculateEngagementSummary(recentNotifications);
    
    // 선호도 인사이트
    const preferencesInsights = this.analyzePreferences(recentNotifications);
    
    // 최적화 제안
    const optimizationSuggestions = this.generateOptimizationSuggestions(
      engagementSummary,
      preferencesInsights
    );

    return {
      engagement_summary: engagementSummary,
      preferences_insights: preferencesInsights,
      optimization_suggestions: optimizationSuggestions,
    };
  }

  // 프라이빗 메서드들
  private initializeEnhancedSystem(): void {
    // 정기적 최적화 작업
    setInterval(() => {
      this.optimizeNotificationSystem();
    }, 60 * 60 * 1000); // 1시간마다

    // 지연된 알림 처리
    setInterval(() => {
      this.processScheduledNotifications();
    }, 60 * 1000); // 1분마다
  }

  private calculateSmartPriority(
    notification: Partial<EnhancedNotification>,
    relevanceScore: number,
    personalizationScore: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    const combinedScore = (relevanceScore + personalizationScore) / 2;
    const basePriority = notification.priority || 'MEDIUM';

    // 기본 우선순위 점수화
    const priorityScores = { 'LOW': 0.25, 'MEDIUM': 0.5, 'HIGH': 0.75, 'URGENT': 1.0 };
    const baseScore = priorityScores[basePriority];

    // 스마트 점수와 결합
    const finalScore = (baseScore + combinedScore) / 2;

    if (finalScore >= 0.85) return 'URGENT';
    if (finalScore >= 0.65) return 'HIGH';
    if (finalScore >= 0.35) return 'MEDIUM';
    return 'LOW';
  }

  private selectOptimalChannels(
    userId: string,
    relevanceScore: number,
    personalizationScore: number
  ): ('IN_APP' | 'EMAIL' | 'PUSH' | 'SMS' | 'WEBHOOK')[] {
    const channels: ('IN_APP' | 'EMAIL' | 'PUSH' | 'SMS' | 'WEBHOOK')[] = ['IN_APP'];
    const combinedScore = (relevanceScore + personalizationScore) / 2;

    if (combinedScore > 0.7) {
      channels.push('PUSH');
    }
    
    if (combinedScore > 0.8) {
      channels.push('EMAIL');
    }

    return channels;
  }

  private findPreferenceMatches(
    userId: string,
    notification: Partial<EnhancedNotification>
  ): string[] {
    const matches: string[] = [];
    
    // 실제 구현에서는 사용자 프로필과 매칭
    if (notification.type === 'BREAKING') {
      matches.push('breaking_news_enabled');
    }
    
    if (notification.data?.sector) {
      matches.push(`sector_${notification.data.sector}`);
    }

    return matches;
  }

  private async generateSuggestedActions(
    notification: Partial<EnhancedNotification>
  ): Promise<NotificationAction[]> {
    const actions: NotificationAction[] = [];

    if (notification.type === 'PORTFOLIO') {
      actions.push({
        id: 'view_portfolio',
        label: '포트폴리오 보기',
        type: 'VIEW_PORTFOLIO',
        primary: true,
      });
    }

    if (notification.type === 'BREAKING' && notification.data?.symbol) {
      actions.push({
        id: 'analyze_stock',
        label: '분석 보기',
        type: 'ANALYZE',
        data: { symbol: notification.data.symbol },
        primary: true,
      });
    }

    // 공통 액션들
    actions.push({
      id: 'dismiss',
      label: '무시',
      type: 'DISMISS',
    });

    return actions;
  }

  private async applyNotificationRules(notification: EnhancedNotification): Promise<boolean> {
    const userRules = this.rules.get(notification.userId) || [];
    
    for (const rule of userRules) {
      if (!rule.enabled) continue;
      
      const matches = rule.conditions.every(condition => 
        this.evaluateCondition(notification, condition)
      );
      
      if (matches) {
        for (const action of rule.actions) {
          if (action.type === 'BLOCK') {
            return false;
          }
          // 다른 액션들 처리...
        }
      }
    }
    
    return true;
  }

  private evaluateCondition(
    notification: EnhancedNotification,
    condition: NotificationCondition
  ): boolean {
    const fieldValue = this.getFieldValue(notification, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(notification: EnhancedNotification, field: string): any {
    const fields = field.split('.');
    let value: any = notification;
    
    for (const f of fields) {
      value = value?.[f];
    }
    
    return value;
  }

  private async scheduleSmartDelivery(notification: EnhancedNotification): Promise<void> {
    let deliveryTime = new Date();
    
    if (notification.smart_timing?.startsWith('tomorrow_')) {
      const [, timeStr] = notification.smart_timing.split('_');
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      deliveryTime = new Date();
      deliveryTime.setDate(deliveryTime.getDate() + 1);
      deliveryTime.setHours(hours, minutes, 0, 0);
    } else if (notification.smart_timing?.match(/^\d{2}:\d{2}$/)) {
      const [hours, minutes] = notification.smart_timing.split(':').map(Number);
      deliveryTime.setHours(hours, minutes, 0, 0);
    }

    const delay = deliveryTime.getTime() - Date.now();
    
    if (delay > 0) {
      const timeoutId = setTimeout(async () => {
        await this.deliverEnhancedNotification(notification);
        this.scheduledNotifications.delete(notification.id);
      }, delay);
      
      this.scheduledNotifications.set(notification.id, timeoutId);
    } else {
      // 시간이 이미 지났으면 즉시 전송
      await this.deliverEnhancedNotification(notification);
    }
  }

  private async deliverEnhancedNotification(notification: EnhancedNotification): Promise<void> {
    // 기본 전송 로직 + 향상된 기능들
    const userNotifications = this.notifications.get(notification.userId) || [];
    userNotifications.unshift(notification);
    this.notifications.set(notification.userId, userNotifications);

    notification.delivered = true;

    // 채널별 전송...
    // (기존 알림 시스템의 deliverNotification 로직 활용)
  }

  private deduplicateNotifications(notifications: EnhancedNotification[]): EnhancedNotification[] {
    const seen = new Set<string>();
    return notifications.filter(notification => {
      const key = this.generateDeduplicationKey(notification);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private generateDeduplicationKey(notification: EnhancedNotification): string {
    return `${notification.type}_${notification.data?.symbol || 'general'}_${notification.title}`;
  }

  private async createSummaryNotification(
    groupId: string,
    notifications: EnhancedNotification[]
  ): Promise<EnhancedNotification> {
    const firstNotification = notifications[0];
    
    return {
      ...firstNotification,
      id: `summary_${groupId}_${Date.now()}`,
      title: `📊 ${notifications.length}개의 알림 요약`,
      message: `${firstNotification.type} 관련 ${notifications.length}개의 업데이트가 있습니다.`,
      group_id: groupId,
      data: {
        ...firstNotification.data,
        grouped_notifications: notifications.map(n => ({
          id: n.id,
          title: n.title,
          created_at: n.created_at,
        })),
      },
    };
  }

  private calculateEngagementSummary(notifications: EnhancedNotification[]): any {
    const total = notifications.length;
    const opened = notifications.filter(n => n.interaction_data?.opened).length;
    const clicked = notifications.filter(n => n.interaction_data?.clicked).length;
    const dismissed = notifications.filter(n => n.interaction_data?.dismissed).length;

    return {
      total,
      open_rate: total > 0 ? (opened / total) * 100 : 0,
      click_rate: total > 0 ? (clicked / total) * 100 : 0,
      dismissal_rate: total > 0 ? (dismissed / total) * 100 : 0,
      engagement_score: total > 0 ? ((opened + clicked) / total) * 100 : 0,
    };
  }

  private analyzePreferences(notifications: EnhancedNotification[]): any {
    const typeEngagement: Record<string, { sent: number; engaged: number }> = {};
    const timeEngagement: Record<string, { sent: number; engaged: number }> = {};

    notifications.forEach(notification => {
      // 타입별 분석
      if (!typeEngagement[notification.type]) {
        typeEngagement[notification.type] = { sent: 0, engaged: 0 };
      }
      typeEngagement[notification.type].sent++;
      
      if (notification.interaction_data?.opened || notification.interaction_data?.clicked) {
        typeEngagement[notification.type].engaged++;
      }

      // 시간대별 분석
      const hour = new Date(notification.created_at).getHours();
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      
      if (!timeEngagement[timeSlot]) {
        timeEngagement[timeSlot] = { sent: 0, engaged: 0 };
      }
      timeEngagement[timeSlot].sent++;
      
      if (notification.interaction_data?.opened || notification.interaction_data?.clicked) {
        timeEngagement[timeSlot].engaged++;
      }
    });

    return {
      by_type: typeEngagement,
      by_time: timeEngagement,
    };
  }

  private generateOptimizationSuggestions(
    engagementSummary: any,
    preferencesInsights: any
  ): string[] {
    const suggestions: string[] = [];

    if (engagementSummary.open_rate < 30) {
      suggestions.push('알림 제목을 더 매력적으로 개선해보세요');
    }

    if (engagementSummary.click_rate < 10) {
      suggestions.push('실행 가능한 액션을 더 명확하게 제시해보세요');
    }

    if (engagementSummary.dismissal_rate > 50) {
      suggestions.push('알림 빈도를 줄이거나 더 관련성 높은 콘텐츠로 개선해보세요');
    }

    return suggestions;
  }

  private optimizeNotificationSystem(): void {
    // 시스템 전체 최적화 로직
    console.log('Running notification system optimization...');
  }

  private processScheduledNotifications(): void {
    // 예약된 알림 처리 로직
    console.log('Processing scheduled notifications...');
  }
}

// 편의 함수들
export function getEnhancedNotificationSystem(): EnhancedNotificationSystem {
  return EnhancedNotificationSystem.getInstance();
}

export async function sendSmartBreakingNews(
  userId: string,
  news: NewsItem
): Promise<void> {
  const system = EnhancedNotificationSystem.getInstance();
  const smartNotification = await system.createSmartNotification(userId, {
    type: 'BREAKING',
    title: '🚨 브레이킹 뉴스',
    message: news.title,
    data: {
      news_id: news.id,
      url: news.url,
      importance_score: news.importance_score,
      topics: news.tags || [],
    },
    priority: 'URGENT',
  });

  await system.sendSmartNotification(smartNotification);
}

export async function sendSmartPortfolioAlert(
  userId: string,
  holdings: PortfolioHolding[],
  marketUpdate: any
): Promise<void> {
  const system = EnhancedNotificationSystem.getInstance();
  
  const affectedSymbols = holdings
    .filter(holding => marketUpdate.affected_stocks?.includes(holding.stock.symbol))
    .map(holding => holding.stock.symbol);

  if (affectedSymbols.length === 0) return;

  const smartNotification = await system.createSmartNotification(userId, {
    type: 'PORTFOLIO',
    title: '📈 포트폴리오 영향 알림',
    message: `${affectedSymbols.length}개 보유 종목에 시장 변화가 감지되었습니다`,
    data: {
      affected_symbols: affectedSymbols,
      market_change: marketUpdate.change,
      estimated_impact: marketUpdate.estimated_impact,
      topics: ['portfolio', 'market_update'],
    },
    priority: 'HIGH',
  });

  await system.sendSmartNotification(smartNotification);
}

export default EnhancedNotificationSystem;