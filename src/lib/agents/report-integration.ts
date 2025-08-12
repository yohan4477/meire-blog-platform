/**
 * 결과 통합 및 리포팅 시스템
 * Results Integration & Reporting System
 */

import { agentCommunicationHub } from './agent-communication';
import { workflowOrchestrator, WorkflowExecution } from './workflow-orchestrator';

export interface AnalysisResult {
  id: string;
  type: 'market-analysis' | 'stock-analysis' | 'portfolio-optimization' | 'risk-assessment';
  agentId: string;
  timestamp: Date;
  data: any;
  confidence: number; // 0-1 scale
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface IntegratedReport {
  id: string;
  title: string;
  type: 'market-overview' | 'portfolio-analysis' | 'risk-report' | 'trading-signals';
  summary: string;
  keyInsights: string[];
  recommendations: Recommendation[];
  dataPoints: AnalysisResult[];
  generatedAt: Date;
  validUntil: Date;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface Recommendation {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'rebalance' | 'hedge';
  description: string;
  symbol?: string;
  allocation?: number;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  reasoning: string[];
  risks: string[];
}

export interface NotificationRule {
  id: string;
  name: string;
  condition: {
    reportType: string[];
    riskLevel: string[];
    confidence: number;
    keywords: string[];
  };
  recipients: string[];
  channels: ('email' | 'push' | 'sms' | 'dashboard')[];
  template: string;
  enabled: boolean;
}

export class ReportIntegrationSystem {
  private analysisResults: Map<string, AnalysisResult> = new Map();
  private integratedReports: Map<string, IntegratedReport> = new Map();
  private notificationRules: Map<string, NotificationRule> = new Map();
  private dashboardSubscribers: Set<string> = new Set();

  constructor() {
    this.initializeNotificationRules();
    this.startReportGeneration();
  }

  private initializeNotificationRules() {
    const defaultRules: NotificationRule[] = [
      {
        id: 'critical-market-alert',
        name: '중요 시장 알림',
        condition: {
          reportType: ['market-overview', 'risk-report'],
          riskLevel: ['critical', 'high'],
          confidence: 0.8,
          keywords: ['crash', 'volatility', 'urgent']
        },
        recipients: ['all-users'],
        channels: ['push', 'email', 'dashboard'],
        template: 'critical-alert',
        enabled: true
      },
      {
        id: 'portfolio-optimization-complete',
        name: '포트폴리오 최적화 완료',
        condition: {
          reportType: ['portfolio-analysis'],
          riskLevel: ['low', 'medium', 'high'],
          confidence: 0.7,
          keywords: ['optimization', 'rebalance']
        },
        recipients: ['portfolio-owners'],
        channels: ['push', 'dashboard'],
        template: 'optimization-complete',
        enabled: true
      },
      {
        id: 'high-confidence-signals',
        name: '고신뢰도 매매 신호',
        condition: {
          reportType: ['trading-signals'],
          riskLevel: ['low', 'medium'],
          confidence: 0.9,
          keywords: ['buy', 'sell', 'strong']
        },
        recipients: ['active-traders'],
        channels: ['push', 'email'],
        template: 'trading-signal',
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.notificationRules.set(rule.id, rule);
    });
  }

  private startReportGeneration() {
    // 주기적으로 분석 결과를 통합하여 리포트 생성
    setInterval(() => {
      this.generateAutomaticReports();
    }, 300000); // 5분마다
  }

  /**
   * 분석 결과 추가
   */
  addAnalysisResult(result: AnalysisResult): void {
    this.analysisResults.set(result.id, result);
    
    // 즉시 통합 가능한 결과가 있는지 확인
    this.checkForImmediateIntegration(result);
  }

  private checkForImmediateIntegration(newResult: AnalysisResult): void {
    // 중요도가 높은 결과는 즉시 리포트 생성
    if (newResult.priority === 'critical') {
      this.generateUrgentReport(newResult);
    }

    // 관련된 다른 결과들과 함께 분석
    const relatedResults = this.findRelatedResults(newResult);
    if (relatedResults.length >= 2) { // 2개 이상의 관련 결과가 있으면
      this.generateIntegratedReport(relatedResults);
    }
  }

  private findRelatedResults(targetResult: AnalysisResult): AnalysisResult[] {
    const related: AnalysisResult[] = [targetResult];
    const timeWindow = 10 * 60 * 1000; // 10분 윈도우

    this.analysisResults.forEach(result => {
      if (result.id === targetResult.id) return;

      const timeDiff = Math.abs(result.timestamp.getTime() - targetResult.timestamp.getTime());
      if (timeDiff > timeWindow) return;

      // 태그나 심볼이 겹치는지 확인
      const hasCommonTags = result.tags.some(tag => targetResult.tags.includes(tag));
      const hasCommonSymbol = result.data?.symbol === targetResult.data?.symbol;

      if (hasCommonTags || hasCommonSymbol) {
        related.push(result);
      }
    });

    return related.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private generateUrgentReport(result: AnalysisResult): void {
    const report: IntegratedReport = {
      id: `urgent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `긴급 ${this.getTypeLabel(result.type)} 알림`,
      type: 'risk-report',
      summary: this.generateUrgentSummary(result),
      keyInsights: this.extractKeyInsights([result]),
      recommendations: this.generateRecommendations([result]),
      dataPoints: [result],
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + 3600000), // 1시간 유효
      confidence: result.confidence,
      riskLevel: result.priority === 'critical' ? 'critical' : 'high'
    };

    this.integratedReports.set(report.id, report);
    this.processNotifications(report);
  }

  private generateIntegratedReport(results: AnalysisResult[]): void {
    if (results.length === 0) return;

    const reportType = this.determineReportType(results);
    const report: IntegratedReport = {
      id: `integrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.generateReportTitle(results, reportType),
      type: reportType,
      summary: this.generateComprehensiveSummary(results),
      keyInsights: this.extractKeyInsights(results),
      recommendations: this.generateRecommendations(results),
      dataPoints: results,
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + 24 * 3600000), // 24시간 유효
      confidence: this.calculateOverallConfidence(results),
      riskLevel: this.assessOverallRisk(results)
    };

    this.integratedReports.set(report.id, report);
    this.processNotifications(report);
  }

  private generateAutomaticReports(): void {
    const recentResults = this.getRecentResults(30 * 60 * 1000); // 30분 이내
    
    if (recentResults.length >= 3) {
      // 종류별로 그룹화
      const groupedResults = this.groupResultsByType(recentResults);
      
      Object.entries(groupedResults).forEach(([type, results]) => {
        if (results.length >= 2) {
          this.generateIntegratedReport(results);
        }
      });
    }
  }

  private getRecentResults(timeWindow: number): AnalysisResult[] {
    const cutoff = Date.now() - timeWindow;
    return Array.from(this.analysisResults.values())
      .filter(result => result.timestamp.getTime() > cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private groupResultsByType(results: AnalysisResult[]): { [key: string]: AnalysisResult[] } {
    const grouped: { [key: string]: AnalysisResult[] } = {};
    
    results.forEach(result => {
      if (!grouped[result.type]) {
        grouped[result.type] = [];
      }
      grouped[result.type].push(result);
    });

    return grouped;
  }

  private determineReportType(results: AnalysisResult[]): IntegratedReport['type'] {
    const types = results.map(r => r.type);
    
    if (types.includes('portfolio-optimization')) return 'portfolio-analysis';
    if (types.includes('risk-assessment')) return 'risk-report';
    if (types.includes('stock-analysis')) return 'trading-signals';
    return 'market-overview';
  }

  private generateReportTitle(results: AnalysisResult[], type: string): string {
    const timeLabel = this.getTimeLabel();
    const typeLabel = this.getTypeLabel(type);
    
    if (results.length === 1) {
      return `${timeLabel} ${typeLabel} - ${results[0].data?.symbol || '종합 분석'}`;
    }
    
    return `${timeLabel} ${typeLabel} - ${results.length}개 분석 통합`;
  }

  private generateUrgentSummary(result: AnalysisResult): string {
    const typeLabel = this.getTypeLabel(result.type);
    const confidence = Math.round(result.confidence * 100);
    
    return `긴급: ${typeLabel}에서 중요한 변화가 감지되었습니다. ` +
           `신뢰도 ${confidence}%로 즉시 확인이 필요합니다.`;
  }

  private generateComprehensiveSummary(results: AnalysisResult[]): string {
    const confidence = Math.round(this.calculateOverallConfidence(results) * 100);
    const timeSpan = this.calculateTimeSpan(results);
    
    return `${timeSpan} 동안 수집된 ${results.length}개의 분석 결과를 종합한 리포트입니다. ` +
           `전체 신뢰도는 ${confidence}%이며, ${this.getSummaryHighlights(results)}`;
  }

  private extractKeyInsights(results: AnalysisResult[]): string[] {
    const insights: string[] = [];
    
    results.forEach(result => {
      if (result.data?.insights) {
        insights.push(...result.data.insights);
      } else if (result.data?.summary) {
        insights.push(result.data.summary);
      }
    });

    // 중복 제거 및 중요도 순 정렬
    return Array.from(new Set(insights))
      .slice(0, 5); // 최대 5개
  }

  private generateRecommendations(results: AnalysisResult[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    results.forEach(result => {
      if (result.type === 'stock-analysis' && result.data?.recommendation) {
        recommendations.push({
          id: `rec_${result.id}`,
          type: result.data.recommendation.action,
          description: result.data.recommendation.description,
          symbol: result.data.symbol,
          confidence: result.confidence,
          priority: result.priority,
          timeframe: result.data.recommendation.timeframe || 'short-term',
          reasoning: result.data.recommendation.reasoning || [],
          risks: result.data.recommendation.risks || []
        });
      }
      
      if (result.type === 'portfolio-optimization' && result.data?.suggestions) {
        result.data.suggestions.forEach((suggestion: any) => {
          recommendations.push({
            id: `rec_${result.id}_${suggestion.id}`,
            type: 'rebalance',
            description: suggestion.description,
            allocation: suggestion.allocation,
            confidence: result.confidence,
            priority: 'medium',
            timeframe: 'medium-term',
            reasoning: suggestion.reasoning || [],
            risks: suggestion.risks || []
          });
        });
      }
    });

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // 최대 10개
  }

  private calculateOverallConfidence(results: AnalysisResult[]): number {
    if (results.length === 0) return 0;
    
    const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
    return totalConfidence / results.length;
  }

  private assessOverallRisk(results: AnalysisResult[]): IntegratedReport['riskLevel'] {
    const riskScores = results.map(result => {
      switch (result.priority) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 1;
      }
    });

    const avgRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    if (avgRiskScore >= 3.5) return 'critical';
    if (avgRiskScore >= 2.5) return 'high';
    if (avgRiskScore >= 1.5) return 'medium';
    return 'low';
  }

  private processNotifications(report: IntegratedReport): void {
    this.notificationRules.forEach(rule => {
      if (!rule.enabled) return;
      
      const shouldNotify = this.evaluateNotificationCondition(rule, report);
      if (shouldNotify) {
        this.sendNotification(rule, report);
      }
    });

    // 대시보드 구독자들에게 실시간 업데이트
    this.updateDashboard(report);
  }

  private evaluateNotificationCondition(rule: NotificationRule, report: IntegratedReport): boolean {
    // 리포트 타입 확인
    if (!rule.condition.reportType.includes(report.type)) return false;
    
    // 리스크 레벨 확인
    if (!rule.condition.riskLevel.includes(report.riskLevel)) return false;
    
    // 신뢰도 확인
    if (report.confidence < rule.condition.confidence) return false;
    
    // 키워드 확인
    if (rule.condition.keywords.length > 0) {
      const reportText = (report.title + ' ' + report.summary).toLowerCase();
      const hasKeyword = rule.condition.keywords.some(keyword => 
        reportText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }
    
    return true;
  }

  private sendNotification(rule: NotificationRule, report: IntegratedReport): void {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      reportId: report.id,
      recipients: rule.recipients,
      channels: rule.channels,
      template: rule.template,
      data: {
        title: report.title,
        summary: report.summary,
        riskLevel: report.riskLevel,
        confidence: Math.round(report.confidence * 100),
        recommendations: report.recommendations.slice(0, 3) // 상위 3개만
      },
      timestamp: new Date()
    };

    // 각 채널별로 알림 전송
    rule.channels.forEach(channel => {
      this.sendChannelNotification(channel, notification);
    });
  }

  private sendChannelNotification(channel: string, notification: any): void {
    switch (channel) {
      case 'push':
        this.sendPushNotification(notification);
        break;
      case 'email':
        this.sendEmailNotification(notification);
        break;
      case 'sms':
        this.sendSMSNotification(notification);
        break;
      case 'dashboard':
        this.sendDashboardNotification(notification);
        break;
    }
  }

  private sendPushNotification(notification: any): void {
    // 푸시 알림 구현
    console.log('📱 Push Notification:', notification.data.title);
  }

  private sendEmailNotification(notification: any): void {
    // 이메일 알림 구현
    console.log('📧 Email Notification:', notification.data.title);
  }

  private sendSMSNotification(notification: any): void {
    // SMS 알림 구현
    console.log('📱 SMS Notification:', notification.data.title);
  }

  private sendDashboardNotification(notification: any): void {
    // 대시보드 알림 구현
    console.log('📊 Dashboard Notification:', notification.data.title);
  }

  private updateDashboard(report: IntegratedReport): void {
    // 대시보드 구독자들에게 실시간 업데이트
    this.dashboardSubscribers.forEach(subscriberId => {
      // WebSocket 또는 Server-Sent Events로 실시간 업데이트
      console.log(`📊 Dashboard Update for ${subscriberId}:`, report.title);
    });
  }

  private getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'market-analysis': '시장 분석',
      'stock-analysis': '종목 분석',
      'portfolio-optimization': '포트폴리오 최적화',
      'risk-assessment': '리스크 평가',
      'market-overview': '시장 개요',
      'portfolio-analysis': '포트폴리오 분석',
      'risk-report': '리스크 리포트',
      'trading-signals': '매매 신호'
    };
    return labels[type] || type;
  }

  private getTimeLabel(): string {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour < 12) return '오전';
    if (hour < 18) return '오후';
    return '저녁';
  }

  private calculateTimeSpan(results: AnalysisResult[]): string {
    if (results.length === 0) return '최근';
    
    const timestamps = results.map(r => r.timestamp.getTime());
    const span = Math.max(...timestamps) - Math.min(...timestamps);
    
    if (span < 5 * 60 * 1000) return '최근 5분';
    if (span < 30 * 60 * 1000) return '최근 30분';
    if (span < 60 * 60 * 1000) return '최근 1시간';
    return '최근 몇 시간';
  }

  private getSummaryHighlights(results: AnalysisResult[]): string {
    const types = [...new Set(results.map(r => r.type))];
    const agents = [...new Set(results.map(r => r.agentId))];
    
    return `${types.length}개 분야에서 ${agents.length}개 에이전트가 분석한 결과입니다.`;
  }

  /**
   * API 메서드들
   */

  getRecentReports(limit: number = 10): IntegratedReport[] {
    return Array.from(this.integratedReports.values())
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  getReportById(reportId: string): IntegratedReport | null {
    return this.integratedReports.get(reportId) || null;
  }

  subscribeToDashboard(subscriberId: string): void {
    this.dashboardSubscribers.add(subscriberId);
  }

  unsubscribeFromDashboard(subscriberId: string): void {
    this.dashboardSubscribers.delete(subscriberId);
  }

  addNotificationRule(rule: NotificationRule): void {
    this.notificationRules.set(rule.id, rule);
  }

  updateNotificationRule(ruleId: string, updates: Partial<NotificationRule>): boolean {
    const rule = this.notificationRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    return false;
  }

  getSystemStats(): {
    totalReports: number;
    recentReports: number;
    totalAnalysisResults: number;
    activeNotificationRules: number;
    dashboardSubscribers: number;
  } {
    const oneHourAgo = Date.now() - 3600000;
    const recentReports = Array.from(this.integratedReports.values())
      .filter(report => report.generatedAt.getTime() > oneHourAgo).length;

    return {
      totalReports: this.integratedReports.size,
      recentReports,
      totalAnalysisResults: this.analysisResults.size,
      activeNotificationRules: Array.from(this.notificationRules.values())
        .filter(rule => rule.enabled).length,
      dashboardSubscribers: this.dashboardSubscribers.size
    };
  }
}

// 싱글톤 인스턴스
export const reportIntegrationSystem = new ReportIntegrationSystem();