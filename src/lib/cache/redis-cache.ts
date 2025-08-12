/**
 * Redis 캐싱 시스템
 * 고성능 캐싱, 분산 캐싱, TTL 관리, 캐시 전략 구현
 */

import { z } from 'zod';

// Redis 클라이언트 인터페이스 (실제 Redis 라이브러리에 맞게 조정)
interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(key: string | string[]): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushall(): Promise<string>;
  ping(): Promise<string>;
  
  // Hash operations
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string | string[]): Promise<number>;
  
  // List operations
  lpush(key: string, ...values: string[]): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;
  lpop(key: string): Promise<string | null>;
  rpop(key: string): Promise<string | null>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  llen(key: string): Promise<number>;
  
  // Set operations
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: string): Promise<number>;
}

// 캐시 설정 타입
export interface CacheConfig {
  defaultTTL: number; // 기본 TTL (초)
  keyPrefix: string; // 키 접두사
  compressionThreshold: number; // 압축 임계값 (바이트)
  maxKeyLength: number; // 최대 키 길이
  enableCompression: boolean; // 압축 활성화
  enableMetrics: boolean; // 메트릭 수집 활성화
  retryAttempts: number; // 재시도 횟수
  retryDelay: number; // 재시도 지연 시간 (ms)
}

// 캐시 메트릭
export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
  averageResponseTime: number;
}

// 캐시 전략 열거형
export enum CacheStrategy {
  WRITE_THROUGH = 'write_through', // 쓰기 즉시 캐시에도 저장
  WRITE_BEHIND = 'write_behind', // 쓰기 후 비동기로 캐시 저장
  CACHE_ASIDE = 'cache_aside', // 캐시 미스 시 DB 조회 후 캐시 저장
  REFRESH_AHEAD = 'refresh_ahead', // TTL 만료 전 미리 갱신
}

// 압축 유틸리티
class CompressionUtils {
  static async compress(data: string): Promise<string> {
    // 실제 구현에서는 gzip, lz4 등 사용
    try {
      // Node.js built-in zlib 모듈 사용 가정
      return Buffer.from(data).toString('base64');
    } catch (error) {
      console.warn('Compression failed, using original data:', error);
      return data;
    }
  }

  static async decompress(compressedData: string): Promise<string> {
    try {
      return Buffer.from(compressedData, 'base64').toString('utf-8');
    } catch (error) {
      console.warn('Decompression failed, using data as-is:', error);
      return compressedData;
    }
  }

  static shouldCompress(data: string, threshold: number): boolean {
    return Buffer.byteLength(data, 'utf8') > threshold;
  }
}

// 메트릭 수집기
class CacheMetricsCollector {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalRequests: 0,
    hitRate: 0,
    averageResponseTime: 0
  };

  private responseTimes: number[] = [];

  recordHit(responseTime: number): void {
    this.metrics.hits++;
    this.metrics.totalRequests++;
    this.recordResponseTime(responseTime);
    this.updateHitRate();
  }

  recordMiss(responseTime: number): void {
    this.metrics.misses++;
    this.metrics.totalRequests++;
    this.recordResponseTime(responseTime);
    this.updateHitRate();
  }

  recordSet(): void {
    this.metrics.sets++;
  }

  recordDelete(): void {
    this.metrics.deletes++;
  }

  recordError(): void {
    this.metrics.errors++;
  }

  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    
    // 최근 1000개 응답 시간만 유지
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
    
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0,
      averageResponseTime: 0
    };
    this.responseTimes = [];
  }
}

// 키 생성 유틸리티
class CacheKeyUtils {
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    const key = [prefix, ...parts].join(':');
    
    // 키 길이 제한 확인
    if (key.length > 250) { // Redis 키 길이 제한
      // 해시를 사용하여 키 단축
      const hash = this.simpleHash(key);
      return `${prefix}:hash:${hash}`;
    }
    
    return key;
  }

  static extractPattern(key: string): string {
    // 특정 패턴 추출 (예: user:123:profile -> user:*:profile)
    return key.replace(/:\d+:/g, ':*:').replace(/:\d+$/g, ':*');
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash).toString(36);
  }
}

// 메인 Redis 캐시 클래스
export class RedisCache {
  private client: RedisClientInterface | null = null;
  private config: CacheConfig;
  private metrics: CacheMetricsCollector;
  private isConnected = false;

  constructor(
    client: RedisClientInterface,
    config: Partial<CacheConfig> = {}
  ) {
    this.client = client;
    this.config = {
      defaultTTL: 3600, // 1시간
      keyPrefix: 'meire_blog',
      compressionThreshold: 1024, // 1KB
      maxKeyLength: 250,
      enableCompression: true,
      enableMetrics: true,
      retryAttempts: 3,
      retryDelay: 100,
      ...config
    };
    
    this.metrics = new CacheMetricsCollector();
    this.isConnected = true; // Redis 연결 상태 확인 로직 필요
  }

  /**
   * 데이터 조회
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const fullKey = CacheKeyUtils.generateKey(this.config.keyPrefix, key);
      const rawData = await this.client!.get(fullKey);
      
      if (rawData === null) {
        if (this.config.enableMetrics) {
          this.metrics.recordMiss(Date.now() - startTime);
        }
        return null;
      }

      // 압축 해제
      let data = rawData;
      if (this.config.enableCompression && rawData.startsWith('compressed:')) {
        data = await CompressionUtils.decompress(rawData.substring(11));
      }

      const result = JSON.parse(data) as T;
      
      if (this.config.enableMetrics) {
        this.metrics.recordHit(Date.now() - startTime);
      }
      
      return result;
    } catch (error) {
      if (this.config.enableMetrics) {
        this.metrics.recordError();
      }
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * 데이터 저장
   */
  async set<T>(
    key: string, 
    value: T, 
    ttl: number = this.config.defaultTTL
  ): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const fullKey = CacheKeyUtils.generateKey(this.config.keyPrefix, key);
      let data = JSON.stringify(value);

      // 압축 적용
      if (this.config.enableCompression && 
          CompressionUtils.shouldCompress(data, this.config.compressionThreshold)) {
        const compressed = await CompressionUtils.compress(data);
        data = `compressed:${compressed}`;
      }

      const result = await this.client!.setex(fullKey, ttl, data);
      
      if (this.config.enableMetrics) {
        this.metrics.recordSet();
      }
      
      return result === 'OK';
    } catch (error) {
      if (this.config.enableMetrics) {
        this.metrics.recordError();
      }
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * 조건부 저장 (키가 존재하지 않을 때만)
   */
  async setNX<T>(
    key: string, 
    value: T, 
    ttl: number = this.config.defaultTTL
  ): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const fullKey = CacheKeyUtils.generateKey(this.config.keyPrefix, key);
      let data = JSON.stringify(value);

      if (this.config.enableCompression && 
          CompressionUtils.shouldCompress(data, this.config.compressionThreshold)) {
        const compressed = await CompressionUtils.compress(data);
        data = `compressed:${compressed}`;
      }

      const result = await this.client!.set(fullKey, data, { EX: ttl, NX: true });
      return result === 'OK';
    } catch (error) {
      console.error('Redis setNX error:', error);
      return false;
    }
  }

  /**
   * 데이터 삭제
   */
  async del(key: string | string[]): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const keys = Array.isArray(key) ? key : [key];
      const fullKeys = keys.map(k => CacheKeyUtils.generateKey(this.config.keyPrefix, k));
      
      const result = await this.client!.del(fullKeys);
      
      if (this.config.enableMetrics) {
        this.metrics.recordDelete();
      }
      
      return result;
    } catch (error) {
      if (this.config.enableMetrics) {
        this.metrics.recordError();
      }
      console.error('Redis del error:', error);
      return 0;
    }
  }

  /**
   * 키 존재 확인
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const fullKey = CacheKeyUtils.generateKey(this.config.keyPrefix, key);
      const result = await this.client!.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * TTL 확인
   */
  async getTTL(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        return -1;
      }

      const fullKey = CacheKeyUtils.generateKey(this.config.keyPrefix, key);
      return await this.client!.ttl(fullKey);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  }

  /**
   * TTL 갱신
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const fullKey = CacheKeyUtils.generateKey(this.config.keyPrefix, key);
      const result = await this.client!.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }

  /**
   * 패턴 매칭 키 검색
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) {
        return [];
      }

      const fullPattern = CacheKeyUtils.generateKey(this.config.keyPrefix, pattern);
      const keys = await this.client!.keys(fullPattern);
      
      // 접두사 제거
      return keys.map(key => key.replace(`${this.config.keyPrefix}:`, ''));
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  }

  /**
   * 캐시 or 함수 실행 패턴
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.config.defaultTTL
  ): Promise<T> {
    // 캐시에서 먼저 확인
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 캐시 미스 시 함수 실행
    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * 캐시 워밍 (미리 데이터 적재)
   */
  async warmUp<T>(
    keys: string[],
    fetchFn: (key: string) => Promise<T>,
    ttl: number = this.config.defaultTTL
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      const exists = await this.exists(key);
      if (!exists) {
        try {
          const data = await fetchFn(key);
          await this.set(key, data, ttl);
        } catch (error) {
          console.warn(`Failed to warm up cache for key ${key}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 배치 삭제 (패턴 기반)
   */
  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await this.del(keys);
    } catch (error) {
      console.error('Redis deleteByPattern error:', error);
      return 0;
    }
  }

  /**
   * 캐시 초기화
   */
  async flush(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client!.flushall();
      return true;
    } catch (error) {
      console.error('Redis flush error:', error);
      return false;
    }
  }

  /**
   * 연결 상태 확인
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 메트릭 조회
   */
  getMetrics(): CacheMetrics {
    return this.metrics.getMetrics();
  }

  /**
   * 메트릭 리셋
   */
  resetMetrics(): void {
    this.metrics.reset();
  }

  /**
   * 캐시 정보 조회
   */
  async getInfo(): Promise<any> {
    return {
      connected: this.isConnected,
      config: this.config,
      metrics: this.getMetrics(),
      serverTime: new Date().toISOString()
    };
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    // 실제 Redis 클라이언트 연결 종료 로직
  }
}

// 캐시 팩토리
export class CacheFactory {
  private static instance: RedisCache | null = null;

  static createRedisCache(
    client: RedisClientInterface,
    config?: Partial<CacheConfig>
  ): RedisCache {
    return new RedisCache(client, config);
  }

  static getInstance(
    client?: RedisClientInterface,
    config?: Partial<CacheConfig>
  ): RedisCache {
    if (!this.instance && client) {
      this.instance = new RedisCache(client, config);
    }
    
    if (!this.instance) {
      throw new Error('Redis cache not initialized. Provide client on first call.');
    }
    
    return this.instance;
  }

  static destroyInstance(): void {
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
    }
  }
}

// 데코레이터 패턴을 위한 캐시 래퍼
export function withCache<T extends any[], R>(
  keyGenerator: (...args: T) => string,
  ttl: number = 3600
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (...args: T): Promise<R> {
      const cache = CacheFactory.getInstance();
      const cacheKey = keyGenerator(...args);

      return cache.getOrSet(cacheKey, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}

// 환경 변수 검증
export function validateRedisConfig(): { valid: boolean; missing: string[] } {
  const required = ['REDIS_URL', 'REDIS_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}

export default RedisCache;