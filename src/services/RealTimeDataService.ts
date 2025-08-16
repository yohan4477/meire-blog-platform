/**
 * ⚡ 실시간 주가 데이터 파이프라인
 * WebSocket + Server-Sent Events 기반 실시간 스트리밍
 * 목표: 1분 간격 실시간 업데이트, 지연시간 < 500ms
 */

import { StockPriceService } from './StockPriceService';
import { cacheService } from './CacheService';
import { batchProcessor } from './BatchProcessorService';
import { StockPrice } from '../types/stock';

interface StreamSubscription {
  id: string;
  tickers: string[];
  callback: (data: RealTimeUpdate) => void;
  filters?: {
    priceChangeThreshold?: number;
    volumeThreshold?: number;
    sentimentThreshold?: number;
  };
  lastUpdate: number;
}

interface RealTimeUpdate {
  type: 'price' | 'volume' | 'sentiment' | 'news' | 'alert';
  ticker: string;
  data: any;
  timestamp: number;
  source: string;
}

interface MarketAlert {
  type: 'price_spike' | 'volume_surge' | 'sentiment_shift' | 'breaking_news';
  ticker: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  timestamp: number;
}

interface DataStreamConfig {
  updateInterval: number; // ms
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  enableAlerts: boolean;
  priceChangeThreshold: number; // %
  volumeChangeThreshold: number; // %
}

export class RealTimeDataService {
  private stockPriceService: StockPriceService;
  private subscriptions = new Map<string, StreamSubscription>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private isRunning = false;
  
  private config: DataStreamConfig = {
    updateInterval: 60000, // 1분
    maxRetries: 3,
    retryDelay: 5000,
    batchSize: 50,
    enableAlerts: true,
    priceChangeThreshold: 2.0, // 2% 이상 변동시 알림
    volumeChangeThreshold: 50.0 // 50% 이상 거래량 증가시 알림
  };

  private lastPrices = new Map<string, StockPrice>();
  private activeStreams = new Set<string>();
  private alertSubscribers = new Set<(alert: MarketAlert) => void>();

  constructor() {
    this.stockPriceService = new StockPriceService();
    this.startMainDataPipeline();
  }

  /**
   * 🚀 메인 데이터 파이프라인 시작
   */
  private startMainDataPipeline(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Starting real-time data pipeline');

    // 메인 업데이트 루프
    const mainInterval = setInterval(async () => {
      try {
        await this.updateAllSubscriptions();
      } catch (error) {
        console.error('❌ Main pipeline error:', error);
      }
    }, this.config.updateInterval);

    this.intervals.set('main', mainInterval);

    // 알림 체크 루프 (더 자주)
    const alertInterval = setInterval(async () => {
      if (this.config.enableAlerts) {
        await this.checkForAlerts();
      }
    }, this.config.updateInterval / 4); // 15초마다

    this.intervals.set('alerts', alertInterval);

    // 캐시 정리 루프
    const cleanupInterval = setInterval(() => {
      cacheService.cleanup();
    }, 5 * 60 * 1000); // 5분마다

    this.intervals.set('cleanup', cleanupInterval);
  }

  /**
   * 실시간 구독 시작
   */
  subscribe(
    id: string, 
    tickers: string[], 
    callback: (data: RealTimeUpdate) => void,
    filters?: StreamSubscription['filters']
  ): void {
    const subscription: StreamSubscription = {
      id,
      tickers,
      callback,
      filters,
      lastUpdate: Date.now()
    };

    this.subscriptions.set(id, subscription);
    this.activeStreams.add(id);

    console.log(`📡 Started subscription ${id} for ${tickers.length} tickers`);

    // 즉시 초기 데이터 전송
    this.sendInitialData(subscription);
  }

  /**
   * 구독 해제
   */
  unsubscribe(id: string): void {
    this.subscriptions.delete(id);
    this.activeStreams.delete(id);
    console.log(`📡 Unsubscribed ${id}`);
  }

  /**
   * 알림 구독
   */
  subscribeToAlerts(callback: (alert: MarketAlert) => void): void {
    this.alertSubscribers.add(callback);
  }

  /**
   * 모든 구독자 업데이트
   */
  private async updateAllSubscriptions(): Promise<void> {
    if (this.subscriptions.size === 0) return;

    const startTime = Date.now();
    
    // 모든 구독된 종목 수집
    const allTickers = new Set<string>();
    this.subscriptions.forEach(sub => {
      sub.tickers.forEach(ticker => allTickers.add(ticker));
    });

    if (allTickers.size === 0) return;

    console.log(`🔄 Updating ${allTickers.size} tickers for ${this.subscriptions.size} subscriptions`);

    // 배치로 주가 데이터 조회
    const priceResults = await batchProcessor.processStocksBatch(Array.from(allTickers));

    // 각 구독자에게 업데이트 전송
    for (const [subId, subscription] of this.subscriptions) {
      try {
        await this.sendUpdatesToSubscription(subscription, priceResults);
      } catch (error) {
        console.error(`❌ Failed to update subscription ${subId}:`, error);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Updated all subscriptions in ${totalTime}ms`);
  }

  /**
   * 특정 구독자에게 업데이트 전송
   */
  private async sendUpdatesToSubscription(
    subscription: StreamSubscription,
    priceResults: Record<string, any>
  ): Promise<void> {
    const updates: RealTimeUpdate[] = [];

    for (const ticker of subscription.tickers) {
      const currentData = priceResults[ticker];
      if (!currentData?.price) continue;

      const currentPrice = currentData.price;
      const lastPrice = this.lastPrices.get(ticker);

      // 가격 변화 체크
      const priceChanged = !lastPrice || 
        Math.abs(currentPrice.price - lastPrice.price) > 0.01;

      if (priceChanged) {
        // 필터 조건 체크
        if (this.passesFilters(subscription.filters, currentPrice, lastPrice)) {
          updates.push({
            type: 'price',
            ticker,
            data: currentPrice,
            timestamp: Date.now(),
            source: 'realtime'
          });
        }

        // 가격 저장
        this.lastPrices.set(ticker, currentPrice);
      }
    }

    // 업데이트 전송
    if (updates.length > 0) {
      for (const update of updates) {
        subscription.callback(update);
      }
      subscription.lastUpdate = Date.now();
    }
  }

  /**
   * 초기 데이터 전송
   */
  private async sendInitialData(subscription: StreamSubscription): Promise<void> {
    try {
      const priceResults = await batchProcessor.processStocksBatch(subscription.tickers);
      
      for (const ticker of subscription.tickers) {
        const priceData = priceResults[ticker];
        if (priceData?.price) {
          subscription.callback({
            type: 'price',
            ticker,
            data: priceData.price,
            timestamp: Date.now(),
            source: 'initial'
          });

          this.lastPrices.set(ticker, priceData.price);
        }
      }
    } catch (error) {
      console.error('❌ Failed to send initial data:', error);
    }
  }

  /**
   * 필터 조건 확인
   */
  private passesFilters(
    filters: StreamSubscription['filters'],
    currentPrice: StockPrice,
    lastPrice?: StockPrice
  ): boolean {
    if (!filters) return true;

    // 가격 변화 임계값
    if (filters.priceChangeThreshold && lastPrice) {
      const changePercent = Math.abs(
        ((currentPrice.price - lastPrice.price) / lastPrice.price) * 100
      );
      if (changePercent < filters.priceChangeThreshold) return false;
    }

    // 거래량 임계값
    if (filters.volumeThreshold) {
      if (currentPrice.volume < filters.volumeThreshold) return false;
    }

    return true;
  }

  /**
   * 시장 알림 체크
   */
  private async checkForAlerts(): Promise<void> {
    if (this.alertSubscribers.size === 0) return;

    const alerts: MarketAlert[] = [];

    // 각 종목별 알림 조건 체크
    for (const [ticker, currentPrice] of this.lastPrices) {
      const lastPrice = this.getPreviousPrice(ticker);
      
      if (lastPrice) {
        // 급등/급락 알림
        const changePercent = ((currentPrice.price - lastPrice.price) / lastPrice.price) * 100;
        
        if (Math.abs(changePercent) >= this.config.priceChangeThreshold) {
          alerts.push({
            type: 'price_spike',
            ticker,
            message: `${ticker} ${changePercent > 0 ? '급등' : '급락'}: ${changePercent.toFixed(2)}%`,
            severity: Math.abs(changePercent) > 5 ? 'high' : 'medium',
            data: { changePercent, currentPrice: currentPrice.price, lastPrice: lastPrice.price },
            timestamp: Date.now()
          });
        }

        // 거래량 급증 알림
        if (lastPrice.volume > 0) {
          const volumeChangePercent = ((currentPrice.volume - lastPrice.volume) / lastPrice.volume) * 100;
          
          if (volumeChangePercent >= this.config.volumeChangeThreshold) {
            alerts.push({
              type: 'volume_surge',
              ticker,
              message: `${ticker} 거래량 급증: ${volumeChangePercent.toFixed(1)}%`,
              severity: volumeChangePercent > 100 ? 'high' : 'medium',
              data: { volumeChangePercent, currentVolume: currentPrice.volume },
              timestamp: Date.now()
            });
          }
        }
      }
    }

    // 알림 전송
    if (alerts.length > 0) {
      for (const alert of alerts) {
        this.alertSubscribers.forEach(callback => {
          try {
            callback(alert);
          } catch (error) {
            console.error('❌ Alert callback error:', error);
          }
        });
      }
      
      console.log(`🚨 Sent ${alerts.length} alerts`);
    }
  }

  /**
   * 이전 가격 조회 (캐시에서)
   */
  private getPreviousPrice(ticker: string): StockPrice | null {
    // 실제 구현에서는 시계열 데이터에서 조회
    // 현재는 메모리에서 조회
    return this.lastPrices.get(`${ticker}_prev`) || null;
  }

  /**
   * 웹소켓 연결 관리
   */
  async handleWebSocketConnection(ws: any, tickers: string[]): Promise<void> {
    const subscriptionId = `ws_${Date.now()}_${Math.random()}`;
    
    console.log(`🔌 WebSocket connected for ${tickers.length} tickers`);

    // 구독 시작
    this.subscribe(subscriptionId, tickers, (update) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(JSON.stringify(update));
      }
    });

    // 연결 종료 처리
    ws.on('close', () => {
      this.unsubscribe(subscriptionId);
      console.log(`🔌 WebSocket disconnected: ${subscriptionId}`);
    });

    // 에러 처리
    ws.on('error', (error: Error) => {
      console.error(`❌ WebSocket error: ${error.message}`);
      this.unsubscribe(subscriptionId);
    });
  }

  /**
   * Server-Sent Events 스트림
   */
  createSSEStream(tickers: string[]): ReadableStream {
    const subscriptionId = `sse_${Date.now()}_${Math.random()}`;
    let controller: ReadableStreamDefaultController;

    const stream = new ReadableStream({
      start: (c) => {
        controller = c;
        
        // 구독 시작
        this.subscribe(subscriptionId, tickers, (update) => {
          const sseData = `data: ${JSON.stringify(update)}\n\n`;
          controller.enqueue(new TextEncoder().encode(sseData));
        });

        // 연결 유지용 heartbeat
        const heartbeat = setInterval(() => {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        }, 30000);

        // 정리 함수 설정
        return () => {
          clearInterval(heartbeat);
          this.unsubscribe(subscriptionId);
        };
      },
      
      cancel: () => {
        this.unsubscribe(subscriptionId);
      }
    });

    return stream;
  }

  /**
   * 과거 데이터 스트리밍
   */
  async streamHistoricalData(
    ticker: string, 
    days: number,
    callback: (data: any) => void
  ): Promise<void> {
    try {
      const historicalData = await this.stockPriceService.getHistoricalData(ticker, Math.ceil(days / 30));
      
      // 청크 단위로 스트리밍
      const chunkSize = 50;
      for (let i = 0; i < historicalData.length; i += chunkSize) {
        const chunk = historicalData.slice(i, i + chunkSize);
        callback({
          type: 'historical_chunk',
          ticker,
          data: chunk,
          progress: ((i + chunk.length) / historicalData.length) * 100,
          timestamp: Date.now()
        });
        
        // 부하 분산을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      callback({
        type: 'historical_complete',
        ticker,
        data: null,
        progress: 100,
        timestamp: Date.now()
      });
      
    } catch (error) {
      callback({
        type: 'historical_error',
        ticker,
        data: { error: error.message },
        progress: 0,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<DataStreamConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Real-time config updated:', newConfig);
    
    // 인터벌 재시작이 필요한 경우
    if (newConfig.updateInterval) {
      this.stopDataPipeline();
      this.startMainDataPipeline();
    }
  }

  /**
   * 통계 조회
   */
  getStats(): {
    activeSubscriptions: number;
    totalTickers: number;
    averageLatency: number;
    alertsSent: number;
    dataPoints: number;
  } {
    const totalTickers = new Set();
    this.subscriptions.forEach(sub => {
      sub.tickers.forEach(ticker => totalTickers.add(ticker));
    });

    return {
      activeSubscriptions: this.subscriptions.size,
      totalTickers: totalTickers.size,
      averageLatency: 250, // Mock value
      alertsSent: 0, // Mock value
      dataPoints: this.lastPrices.size
    };
  }

  /**
   * 서비스 중지
   */
  stop(): void {
    this.stopDataPipeline();
    this.subscriptions.clear();
    this.activeStreams.clear();
    this.alertSubscribers.clear();
    this.lastPrices.clear();
    console.log('🛑 Real-time data service stopped');
  }

  /**
   * 데이터 파이프라인 중지
   */
  private stopDataPipeline(): void {
    this.isRunning = false;
    
    this.intervals.forEach((interval, key) => {
      clearInterval(interval);
      console.log(`🛑 Stopped ${key} interval`);
    });
    
    this.intervals.clear();
  }
}

// 싱글톤 인스턴스
export const realTimeDataService = new RealTimeDataService();