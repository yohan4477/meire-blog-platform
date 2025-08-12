/**
 * WebSocket 연결 관리자
 * 실시간 데이터 스트림을 관리하고 클라이언트 연결을 처리합니다.
 */

import { WebSocket as WSWebSocket } from 'ws';
import type { StockQuote } from '@/types';

export interface WebSocketMessage {
  type: 'stock_update' | 'portfolio_update' | 'market_news' | 'system_notification';
  data: any;
  timestamp: string;
  clientId?: string;
}

export interface WebSocketClient {
  id: string;
  ws: WSWebSocket;
  subscriptions: Set<string>;
  lastPing: number;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    connectedAt: number;
  };
}

export class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private dataUpdateInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  private static instance: WebSocketManager;

  constructor() {
    this.startHeartbeat();
    this.startDataUpdates();
    
    // Graceful shutdown handling
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * 새 클라이언트 연결 추가
   */
  addClient(
    ws: WSWebSocket, 
    clientId: string, 
    metadata: Partial<WebSocketClient['metadata']> = {}
  ): void {
    if (this.isShuttingDown) {
      ws.close(1013, 'Server shutting down');
      return;
    }

    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastPing: Date.now(),
      metadata: {
        connectedAt: Date.now(),
        ...metadata,
      },
    };

    this.clients.set(clientId, client);

    // 웹소켓 이벤트 핸들러 설정
    ws.on('message', (message: Buffer) => {
      this.handleMessage(clientId, message);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`Client ${clientId} disconnected: ${code} ${reason.toString()}`);
      this.removeClient(clientId);
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.removeClient(clientId);
    });

    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
      }
    });

    // 환영 메시지 전송
    this.sendToClient(clientId, {
      type: 'system_notification',
      data: {
        message: 'WebSocket 연결이 성공적으로 설정되었습니다.',
        clientId,
        serverTime: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`Client ${clientId} connected. Total clients: ${this.clients.size}`);
  }

  /**
   * 클라이언트 연결 제거
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.ws.terminate();
      } catch (error) {
        console.error(`Error terminating WebSocket for client ${clientId}:`, error);
      }
      this.clients.delete(clientId);
      console.log(`Client ${clientId} removed. Total clients: ${this.clients.size}`);
    }
  }

  /**
   * 메시지 처리
   */
  private handleMessage(clientId: string, message: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const parsedMessage = JSON.parse(message.toString());
      
      switch (parsedMessage.type) {
        case 'subscribe':
          this.handleSubscription(clientId, parsedMessage.data);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientId, parsedMessage.data);
          break;
        case 'ping':
          client.lastPing = Date.now();
          this.sendToClient(clientId, {
            type: 'system_notification',
            data: { message: 'pong' },
            timestamp: new Date().toISOString(),
          });
          break;
        case 'get_subscriptions':
          this.sendToClient(clientId, {
            type: 'system_notification',
            data: { 
              subscriptions: Array.from(client.subscriptions),
              clientId,
            },
            timestamp: new Date().toISOString(),
          });
          break;
        default:
          console.log(`Unknown message type from client ${clientId}:`, parsedMessage.type);
      }
    } catch (error) {
      console.error(`Error parsing message from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'system_notification',
        data: { error: 'Invalid message format' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 구독 처리
   */
  private handleSubscription(clientId: string, subscription: { channel: string; symbols?: string[] }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channel, symbols = [] } = subscription;
    
    if (channel === 'stock_prices' && symbols.length > 0) {
      symbols.forEach(symbol => {
        client.subscriptions.add(`stock_prices:${symbol.toUpperCase()}`);
      });
    } else {
      client.subscriptions.add(channel);
    }

    this.sendToClient(clientId, {
      type: 'system_notification',
      data: {
        message: `구독이 완료되었습니다: ${channel}`,
        subscriptions: Array.from(client.subscriptions),
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`Client ${clientId} subscribed to ${channel}${symbols.length > 0 ? ` (${symbols.join(', ')})` : ''}`);
  }

  /**
   * 구독 해제 처리
   */
  private handleUnsubscription(clientId: string, subscription: { channel: string; symbols?: string[] }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channel, symbols = [] } = subscription;

    if (channel === 'stock_prices' && symbols.length > 0) {
      symbols.forEach(symbol => {
        client.subscriptions.delete(`stock_prices:${symbol.toUpperCase()}`);
      });
    } else {
      client.subscriptions.delete(channel);
    }

    this.sendToClient(clientId, {
      type: 'system_notification',
      data: {
        message: `구독이 해제되었습니다: ${channel}`,
        subscriptions: Array.from(client.subscriptions),
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`Client ${clientId} unsubscribed from ${channel}${symbols.length > 0 ? ` (${symbols.join(', ')})` : ''}`);
  }

  /**
   * 특정 클라이언트에게 메시지 전송
   */
  sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== client.ws.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * 구독자에게 브로드캐스트
   */
  broadcast(channel: string, message: Omit<WebSocketMessage, 'timestamp'>): number {
    let sentCount = 0;
    const timestampedMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        if (this.sendToClient(clientId, timestampedMessage)) {
          sentCount++;
        }
      }
    });

    return sentCount;
  }

  /**
   * 주식 가격 업데이트 브로드캐스트
   */
  broadcastStockUpdate(quotes: StockQuote[]): void {
    quotes.forEach(quote => {
      const channel = `stock_prices:${quote.symbol.toUpperCase()}`;
      const sentCount = this.broadcast(channel, {
        type: 'stock_update',
        data: quote,
      });

      if (sentCount > 0) {
        console.log(`Broadcasted ${quote.symbol} update to ${sentCount} clients`);
      }
    });

    // 일반 주식 가격 채널 구독자에게도 전송
    const generalSentCount = this.broadcast('stock_prices', {
      type: 'stock_update',
      data: quotes,
    });

    if (generalSentCount > 0) {
      console.log(`Broadcasted stock updates to ${generalSentCount} general subscribers`);
    }
  }

  /**
   * 포트폴리오 업데이트 브로드캐스트
   */
  broadcastPortfolioUpdate(portfolioData: any): void {
    const sentCount = this.broadcast('portfolio_updates', {
      type: 'portfolio_update',
      data: portfolioData,
    });

    console.log(`Broadcasted portfolio update to ${sentCount} clients`);
  }

  /**
   * 시장 뉴스 브로드캐스트
   */
  broadcastMarketNews(news: any): void {
    const sentCount = this.broadcast('market_news', {
      type: 'market_news',
      data: news,
    });

    console.log(`Broadcasted market news to ${sentCount} clients`);
  }

  /**
   * 하트비트 시작
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 60000; // 60초

      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > staleThreshold) {
          console.log(`Client ${clientId} is stale, removing...`);
          this.removeClient(clientId);
        } else if (client.ws.readyState === client.ws.OPEN) {
          // Ping 전송
          try {
            client.ws.ping();
          } catch (error) {
            console.error(`Error pinging client ${clientId}:`, error);
            this.removeClient(clientId);
          }
        }
      });
    }, 30000); // 30초마다 실행
  }

  /**
   * 데이터 업데이트 시작
   */
  private startDataUpdates(): void {
    // 실제 주식 데이터를 가져와서 업데이트하는 로직
    this.dataUpdateInterval = setInterval(async () => {
      try {
        // 여기에 실제 주식 데이터 API 호출 로직을 구현
        // 예시로 mock 데이터 생성
        const mockQuotes: StockQuote[] = [
          {
            symbol: 'AAPL',
            price: 150 + (Math.random() - 0.5) * 10,
            change: (Math.random() - 0.5) * 5,
            changePercent: (Math.random() - 0.5) * 3,
            previousClose: 150,
            volume: Math.floor(Math.random() * 1000000),
            lastUpdated: new Date().toISOString(),
          },
          {
            symbol: 'GOOGL',
            price: 2500 + (Math.random() - 0.5) * 100,
            change: (Math.random() - 0.5) * 50,
            changePercent: (Math.random() - 0.5) * 2,
            previousClose: 2500,
            volume: Math.floor(Math.random() * 500000),
            lastUpdated: new Date().toISOString(),
          },
        ];

        this.broadcastStockUpdate(mockQuotes);
      } catch (error) {
        console.error('Error updating stock data:', error);
      }
    }, 5000); // 5초마다 업데이트
  }

  /**
   * 연결 상태 정보 가져오기
   */
  getConnectionStats(): {
    totalClients: number;
    clientsBySubscription: Record<string, number>;
    averageConnectionTime: number;
  } {
    const subscriptionCounts: Record<string, number> = {};
    let totalConnectionTime = 0;
    const now = Date.now();

    this.clients.forEach(client => {
      client.subscriptions.forEach(subscription => {
        subscriptionCounts[subscription] = (subscriptionCounts[subscription] || 0) + 1;
      });
      totalConnectionTime += now - client.metadata.connectedAt;
    });

    return {
      totalClients: this.clients.size,
      clientsBySubscription: subscriptionCounts,
      averageConnectionTime: this.clients.size > 0 ? totalConnectionTime / this.clients.size : 0,
    };
  }

  /**
   * 정상 종료 처리
   */
  private async shutdown(): Promise<void> {
    console.log('WebSocketManager shutting down...');
    this.isShuttingDown = true;

    // 모든 클라이언트에게 종료 알림 전송
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, {
        type: 'system_notification',
        data: { message: 'Server is shutting down' },
        timestamp: new Date().toISOString(),
      });
      
      setTimeout(() => {
        client.ws.close(1001, 'Server shutdown');
      }, 100);
    });

    // 인터벌 정리
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
    }

    // 모든 클라이언트 연결 대기
    await new Promise<void>(resolve => {
      const checkClients = setInterval(() => {
        if (this.clients.size === 0) {
          clearInterval(checkClients);
          resolve();
        }
      }, 100);

      // 최대 5초 대기
      setTimeout(() => {
        clearInterval(checkClients);
        this.clients.clear();
        resolve();
      }, 5000);
    });

    console.log('WebSocketManager shutdown complete');
  }
}

export default WebSocketManager;