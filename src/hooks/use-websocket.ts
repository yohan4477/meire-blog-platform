/**
 * WebSocket 연결을 관리하는 React Hook
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage } from '@/lib/websocket/websocket-manager';

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastMessage: WebSocketMessage | null;
  reconnectCount: number;
}

export interface WebSocketActions {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  subscribe: (channel: string, symbols?: string[]) => void;
  unsubscribe: (channel: string, symbols?: string[]) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): [WebSocketState, WebSocketActions] {
  const {
    url = process.env.NODE_ENV === 'production' 
      ? 'wss://your-domain.com/ws' 
      : 'ws://localhost:3001/ws',
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    lastMessage: null,
    reconnectCount: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // 연결 함수
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      connectionError: null,
    }));

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          connectionError: null,
        }));
        
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        wsRef.current = null;
        onClose?.();

        // 자동 재연결 시도
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setState(prev => ({
            ...prev,
            reconnectCount: reconnectAttemptsRef.current,
          }));

          console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setState(prev => ({
            ...prev,
            connectionError: 'Maximum reconnection attempts reached',
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({
          ...prev,
          isConnecting: false,
          connectionError: 'Connection error occurred',
        }));
        onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({
            ...prev,
            lastMessage: message,
          }));
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        connectionError: 'Failed to create WebSocket connection',
      }));
    }
  }, [url, maxReconnectAttempts, reconnectInterval, onOpen, onClose, onError, onMessage]);

  // 연결 해제 함수
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectAttemptsRef.current = maxReconnectAttempts; // 재연결 중지

    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
    }));
  }, [maxReconnectAttempts]);

  // 메시지 전송 함수
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, []);

  // 구독 함수
  const subscribe = useCallback((channel: string, symbols?: string[]) => {
    sendMessage({
      type: 'subscribe',
      data: { channel, symbols },
    });
  }, [sendMessage]);

  // 구독 해제 함수
  const unsubscribe = useCallback((channel: string, symbols?: string[]) => {
    sendMessage({
      type: 'unsubscribe',
      data: { channel, symbols },
    });
  }, [sendMessage]);

  // 컴포넌트 마운트/언마운트 시 연결 관리
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const actions: WebSocketActions = {
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
  };

  return [state, actions];
}

// 특정 주식 데이터 구독을 위한 편의 훅
export function useStockWebSocket(symbols: string[] = []) {
  const [stockData, setStockData] = useState<Record<string, any>>({});
  
  const [wsState, wsActions] = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'stock_update') {
        const { symbol, ...data } = message.data;
        if (symbol) {
          setStockData(prev => ({
            ...prev,
            [symbol]: data,
          }));
        }
      }
    },
  });

  // 심볼 목록이 변경될 때 구독 업데이트
  useEffect(() => {
    if (wsState.isConnected && symbols.length > 0) {
      wsActions.subscribe('stock_prices', symbols);
    }

    return () => {
      if (wsState.isConnected && symbols.length > 0) {
        wsActions.unsubscribe('stock_prices', symbols);
      }
    };
  }, [wsState.isConnected, symbols, wsActions]);

  return {
    stockData,
    wsState,
    wsActions,
  };
}

// 포트폴리오 업데이트를 위한 편의 훅
export function usePortfolioWebSocket(portfolioId?: string) {
  const [portfolioUpdates, setPortfolioUpdates] = useState<any[]>([]);
  
  const [wsState, wsActions] = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'portfolio_update') {
        // 특정 포트폴리오 ID 필터링
        if (!portfolioId || message.data.portfolioId === portfolioId) {
          setPortfolioUpdates(prev => [message.data, ...prev.slice(0, 9)]); // 최근 10개만 유지
        }
      }
    },
  });

  // 포트폴리오 업데이트 구독
  useEffect(() => {
    if (wsState.isConnected) {
      wsActions.subscribe('portfolio_updates');
    }

    return () => {
      if (wsState.isConnected) {
        wsActions.unsubscribe('portfolio_updates');
      }
    };
  }, [wsState.isConnected, wsActions]);

  return {
    portfolioUpdates,
    wsState,
    wsActions,
  };
}

// 시장 뉴스를 위한 편의 훅
export function useMarketNewsWebSocket() {
  const [marketNews, setMarketNews] = useState<any[]>([]);
  
  const [wsState, wsActions] = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'market_news') {
        setMarketNews(prev => [message.data, ...prev.slice(0, 19)]); // 최근 20개만 유지
      }
    },
  });

  // 시장 뉴스 구독
  useEffect(() => {
    if (wsState.isConnected) {
      wsActions.subscribe('market_news');
    }

    return () => {
      if (wsState.isConnected) {
        wsActions.unsubscribe('market_news');
      }
    };
  }, [wsState.isConnected, wsActions]);

  return {
    marketNews,
    wsState,
    wsActions,
  };
}