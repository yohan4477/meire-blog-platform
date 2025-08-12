import { NewsItem, CuratedContent } from './financial-news-curator';
import { ExtendedUserProfile } from './user-profile-manager';
import { mcpClient } from '@/types/mcp';

// 알림 타입 정의
export interface Notification {
  id: string;
  userId: string;
  type: 'BREAKING' | 'DIGEST' | 'PORTFOLIO' | 'INSIGHTS' | 'SYSTEM';
  title: string;
  message: string;
  data?: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  read: boolean;
  delivered: boolean;
  delivery_methods: ('IN_APP' | 'EMAIL' | 'PUSH')[];
  expires_at?: string;
}

// 알림 채널 인터페이스
export interface NotificationChannel {
  type: 'IN_APP' | 'EMAIL' | 'PUSH' | 'WEBHOOK';
  enabled: boolean;
  config: any;
}

// 실시간 알림 시스템
export class NotificationSystem {
  private static instance: NotificationSystem;
  private notifications: Map<string, Notification[]> = new Map(); // userId -> notifications
  private channels: Map<string, NotificationChannel[]> = new Map(); // userId -> channels
  private subscribers: Map<string, Set<(notification: Notification) => void>> = new Map();
  private digestSchedule: Map<string, NodeJS.Timeout> = new Map(); // userId -> timer
  
  private constructor() {
    this.initializeNotificationSystem();
  }

  static getInstance(): NotificationSystem {
    if (!NotificationSystem.instance) {
      NotificationSystem.instance = new NotificationSystem();
    }
    return NotificationSystem.instance;
  }

  // 알림 시스템 초기화
  private initializeNotificationSystem(): void {
    // 브라우저 알림 권한 요청
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // 서비스 워커 등록 (실제 구현에서)
    this.registerServiceWorker();
    
    // 주기적 정리 작업
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 60 * 60 * 1000); // 1시간마다
  }

  // 사용자 알림 채널 설정
  async setupUserChannels(userId: string, profile: ExtendedUserProfile): Promise<void> {
    const channels: NotificationChannel[] = [
      {
        type: 'IN_APP',
        enabled: true,
        config: {}
      },
      {
        type: 'PUSH',
        enabled: profile.preferences.push_notifications,
        config: {
          endpoint: null // 실제 구현에서 설정
        }
      },
      {
        type: 'EMAIL',
        enabled: profile.preferences.email_notifications,
        config: {
          email: profile.email || null
        }
      }
    ];

    this.channels.set(userId, channels);
    
    // 일일 다이제스트 스케줄 설정
    this.scheduleDigestNotification(userId, profile.preferences.digest_time);
  }

  // 브레이킹 뉴스 알림
  async sendBreakingNewsNotification(
    userId: string, 
    news: NewsItem
  ): Promise<void> {
    const notification: Notification = {
      id: `breaking_${news.id}_${Date.now()}`,
      userId,
      type: 'BREAKING',
      title: '🚨 브레이킹 뉴스',
      message: news.title,
      data: {
        news_id: news.id,
        url: news.url,
        importance_score: news.importance_score,
        investment_impact: news.investment_impact
      },
      priority: 'URGENT',
      created_at: new Date().toISOString(),
      read: false,
      delivered: false,
      delivery_methods: ['IN_APP', 'PUSH'],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24시간 후 만료
    };

    await this.deliverNotification(notification);
  }

  // 일일 다이제스트 알림
  async sendDailyDigestNotification(
    userId: string,
    digest: {
      summary: string;
      top_stories: NewsItem[];
      curated_count: number;
    }
  ): Promise<void> {
    const notification: Notification = {
      id: `digest_${userId}_${new Date().toISOString().split('T')[0]}`,
      userId,
      type: 'DIGEST',
      title: '📰 오늘의 금융 뉴스 다이제스트',
      message: `주요 뉴스 ${digest.top_stories.length}건, 큐레이션된 콘텐츠 ${digest.curated_count}건이 있습니다.`,
      data: {
        summary: digest.summary,
        story_count: digest.top_stories.length,
        curated_count: digest.curated_count
      },
      priority: 'MEDIUM',
      created_at: new Date().toISOString(),
      read: false,
      delivered: false,
      delivery_methods: ['IN_APP', 'EMAIL'],
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후 만료
    };

    await this.deliverNotification(notification);
  }

  // 포트폴리오 영향 알림
  async sendPortfolioImpactNotification(
    userId: string,
    impact: {
      risk_score: number;
      affected_symbols: string[];
      high_impact_news: number;
      recommendations: string[];
    }
  ): Promise<void> {
    const severity = impact.risk_score > 0.7 ? 'HIGH' : 
                   impact.risk_score > 0.4 ? 'MEDIUM' : 'LOW';
    
    const priority = severity === 'HIGH' ? 'HIGH' : 'MEDIUM';
    
    const notification: Notification = {
      id: `portfolio_${userId}_${Date.now()}`,
      userId,
      type: 'PORTFOLIO',
      title: `📈 포트폴리오 영향 알림`,
      message: `위험도 ${(impact.risk_score * 100).toFixed(0)}% - ${impact.affected_symbols.length}개 종목에 영향`,
      data: {
        risk_score: impact.risk_score,
        affected_symbols: impact.affected_symbols,
        high_impact_news: impact.high_impact_news,
        recommendations: impact.recommendations
      },
      priority,
      created_at: new Date().toISOString(),
      read: false,
      delivered: false,
      delivery_methods: severity === 'HIGH' ? ['IN_APP', 'PUSH', 'EMAIL'] : ['IN_APP'],
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3일 후 만료
    };

    await this.deliverNotification(notification);
  }

  // AI 인사이트 알림
  async sendInsightNotification(
    userId: string,
    insight: {
      title: string;
      summary: string;
      confidence_score: number;
      agent_type: string;
    }
  ): Promise<void> {
    const notification: Notification = {
      id: `insight_${userId}_${Date.now()}`,
      userId,
      type: 'INSIGHTS',
      title: `🤖 AI 인사이트`,
      message: insight.title,
      data: {
        summary: insight.summary,
        confidence_score: insight.confidence_score,
        agent_type: insight.agent_type
      },
      priority: insight.confidence_score > 0.8 ? 'HIGH' : 'MEDIUM',
      created_at: new Date().toISOString(),
      read: false,
      delivered: false,
      delivery_methods: ['IN_APP'],
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5일 후 만료
    };

    await this.deliverNotification(notification);
  }

  // 시스템 알림
  async sendSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'
  ): Promise<void> {
    const notification: Notification = {
      id: `system_${userId}_${Date.now()}`,
      userId,
      type: 'SYSTEM',
      title,
      message,
      priority,
      created_at: new Date().toISOString(),
      read: false,
      delivered: false,
      delivery_methods: ['IN_APP'],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24시간 후 만료
    };

    await this.deliverNotification(notification);
  }

  // 알림 전송
  private async deliverNotification(notification: Notification): Promise<void> {
    try {
      // 사용자별 알림 목록에 추가
      const userNotifications = this.notifications.get(notification.userId) || [];
      userNotifications.unshift(notification); // 최신 알림을 맨 앞에
      this.notifications.set(notification.userId, userNotifications);

      // 알림 전송
      const channels = this.channels.get(notification.userId) || [];
      
      for (const method of notification.delivery_methods) {
        const channel = channels.find(c => c.type === method && c.enabled);
        if (channel) {
          await this.sendToChannel(notification, channel);
        }
      }

      notification.delivered = true;
      
      // 실시간 구독자들에게 알림
      this.notifySubscribers(notification);
      
      // MCP 메모리에 저장
      await this.saveNotificationToMemory(notification);
      
    } catch (error) {
      console.error('Failed to deliver notification:', error);
    }
  }

  // 채널별 알림 전송
  private async sendToChannel(
    notification: Notification, 
    channel: NotificationChannel
  ): Promise<void> {
    switch (channel.type) {
      case 'IN_APP':
        // 인앱 알림은 이미 처리됨
        break;
        
      case 'PUSH':
        await this.sendPushNotification(notification, channel.config);
        break;
        
      case 'EMAIL':
        await this.sendEmailNotification(notification, channel.config);
        break;
        
      case 'WEBHOOK':
        await this.sendWebhookNotification(notification, channel.config);
        break;
    }
  }

  // 푸시 알림 전송
  private async sendPushNotification(
    notification: Notification, 
    config: any
  ): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: notification.type,
            data: notification.data,
            requireInteraction: notification.priority === 'URGENT',
            timestamp: new Date(notification.created_at).getTime()
          });
        }
      }
      
      // 실제 구현에서는 서비스 워커를 통한 푸시 알림
      
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  // 이메일 알림 전송
  private async sendEmailNotification(
    notification: Notification, 
    config: any
  ): Promise<void> {
    try {
      if (!config.email) {
        console.warn('No email address configured for user');
        return;
      }
      
      // 실제 구현에서는 이메일 서비스 API 호출
      console.log(`Email notification sent to ${config.email}:`, notification.title);
      
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  // 웹훅 알림 전송
  private async sendWebhookNotification(
    notification: Notification, 
    config: any
  ): Promise<void> {
    try {
      if (!config.url) {
        console.warn('No webhook URL configured');
        return;
      }
      
      await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify({
          notification,
          timestamp: new Date().toISOString()
        })
      });
      
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  // 알림 구독
  subscribe(
    userId: string, 
    callback: (notification: Notification) => void
  ): () => void {
    const userSubscribers = this.subscribers.get(userId) || new Set();
    userSubscribers.add(callback);
    this.subscribers.set(userId, userSubscribers);
    
    // 구독 취소 함수 반환
    return () => {
      userSubscribers.delete(callback);
      if (userSubscribers.size === 0) {
        this.subscribers.delete(userId);
      }
    };
  }

  // 구독자들에게 알림
  private notifySubscribers(notification: Notification): void {
    const userSubscribers = this.subscribers.get(notification.userId);
    if (userSubscribers) {
      userSubscribers.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }

  // 사용자의 알림 목록 가져오기
  getUserNotifications(
    userId: string, 
    options: {
      limit?: number;
      unreadOnly?: boolean;
      types?: string[];
    } = {}
  ): Notification[] {
    const userNotifications = this.notifications.get(userId) || [];
    
    let filtered = userNotifications;
    
    if (options.unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }
    
    if (options.types && options.types.length > 0) {
      filtered = filtered.filter(n => options.types!.includes(n.type));
    }
    
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  // 알림 읽음 처리
  markAsRead(userId: string, notificationIds: string[]): void {
    const userNotifications = this.notifications.get(userId) || [];
    
    userNotifications.forEach(notification => {
      if (notificationIds.includes(notification.id)) {
        notification.read = true;
      }
    });
  }

  // 알림 삭제
  deleteNotifications(userId: string, notificationIds: string[]): void {
    const userNotifications = this.notifications.get(userId) || [];
    const filtered = userNotifications.filter(n => !notificationIds.includes(n.id));
    this.notifications.set(userId, filtered);
  }

  // 다이제스트 스케줄 설정
  private scheduleDigestNotification(userId: string, digestTime: string): void {
    // 기존 스케줄 취소
    const existingTimeout = this.digestSchedule.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 다음 다이제스트 시간 계산
    const [hours, minutes] = digestTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // 오늘 시간이 지나았으면 내일로 설정
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();
    
    const timeout = setTimeout(async () => {
      try {
        // 다이제스트 생성 및 전송 로직
        await this.generateAndSendDigest(userId);
        
        // 다음 날 스케줄 재설정
        this.scheduleDigestNotification(userId, digestTime);
        
      } catch (error) {
        console.error('Failed to send scheduled digest:', error);
      }
    }, delay);
    
    this.digestSchedule.set(userId, timeout);
  }

  // 다이제스트 생성 및 전송
  private async generateAndSendDigest(userId: string): Promise<void> {
    try {
      // 다이제스트 데이터 가져오기 (API 호출)
      const response = await fetch('/api/financial-curation?action=digest');
      const digestData = await response.json();
      
      if (digestData.success) {
        await this.sendDailyDigestNotification(userId, {
          summary: digestData.data.summary,
          top_stories: digestData.data.top_stories,
          curated_count: digestData.data.curated_content?.length || 0
        });
      }
    } catch (error) {
      console.error('Failed to generate digest for user:', userId, error);
    }
  }

  // 만료된 알림 정리
  private cleanupExpiredNotifications(): void {
    const now = new Date();
    
    for (const [userId, notifications] of this.notifications.entries()) {
      const validNotifications = notifications.filter(notification => {
        if (!notification.expires_at) return true;
        return new Date(notification.expires_at) > now;
      });
      
      if (validNotifications.length !== notifications.length) {
        this.notifications.set(userId, validNotifications);
      }
    }
  }

  // 서비스 워커 등록
  private async registerServiceWorker(): Promise<void> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        // 실제 구현에서는 서비스 워커 파일 등록
        console.log('Service worker registration would happen here');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  // MCP 메모리에 알림 저장
  private async saveNotificationToMemory(notification: Notification): Promise<void> {
    try {
      await mcpClient.memory.createEntities([{
        name: `notification_${notification.id}`,
        entityType: 'notification',
        observations: [
          `User ID: ${notification.userId}`,
          `Type: ${notification.type}`,
          `Title: ${notification.title}`,
          `Priority: ${notification.priority}`,
          `Created: ${notification.created_at}`,
          `Read: ${notification.read}`,
          `Delivered: ${notification.delivered}`
        ]
      }]);
    } catch (error) {
      console.error('Failed to save notification to memory:', error);
    }
  }

  // 통계 정보 가져오기
  getNotificationStats(userId: string): {
    total: number;
    unread: number;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  } {
    const notifications = this.notifications.get(userId) || [];
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      by_type: {} as Record<string, number>,
      by_priority: {} as Record<string, number>
    };
    
    notifications.forEach(notification => {
      stats.by_type[notification.type] = (stats.by_type[notification.type] || 0) + 1;
      stats.by_priority[notification.priority] = (stats.by_priority[notification.priority] || 0) + 1;
    });
    
    return stats;
  }
}

// 편의 함수들
export function getNotificationSystem(): NotificationSystem {
  return NotificationSystem.getInstance();
}

export async function sendBreakingNews(userId: string, news: NewsItem): Promise<void> {
  const system = NotificationSystem.getInstance();
  return system.sendBreakingNewsNotification(userId, news);
}

export async function sendDailyDigest(userId: string, digest: any): Promise<void> {
  const system = NotificationSystem.getInstance();
  return system.sendDailyDigestNotification(userId, digest);
}

export async function sendPortfolioAlert(userId: string, impact: any): Promise<void> {
  const system = NotificationSystem.getInstance();
  return system.sendPortfolioImpactNotification(userId, impact);
}

export async function sendSystemAlert(userId: string, title: string, message: string): Promise<void> {
  const system = NotificationSystem.getInstance();
  return system.sendSystemNotification(userId, title, message);
}

export function subscribeToNotifications(
  userId: string, 
  callback: (notification: Notification) => void
): () => void {
  const system = NotificationSystem.getInstance();
  return system.subscribe(userId, callback);
}

export default NotificationSystem;