import fs from 'fs/promises';
import path from 'path';

interface FileCacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  quarter: string; // Track quarter to detect new filings
}

class FileCache {
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache');
    this.ensureCacheDir();
  }

  private async ensureCacheDir() {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  private getCachePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  async set<T>(key: string, data: T, ttl: number, quarter?: string): Promise<void> {
    await this.ensureCacheDir();
    
    const cacheItem: FileCacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      quarter: quarter || 'unknown'
    };

    const cachePath = this.getCachePath(key);
    await fs.writeFile(cachePath, JSON.stringify(cacheItem, null, 2));
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cachePath = this.getCachePath(key);
      const content = await fs.readFile(cachePath, 'utf-8');
      const cacheItem: FileCacheItem<T> = JSON.parse(content);

      // Check if expired
      if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
        await this.delete(key);
        return null;
      }

      return cacheItem.data;
    } catch {
      return null;
    }
  }

  async getStale<T>(key: string): Promise<T | null> {
    try {
      const cachePath = this.getCachePath(key);
      const content = await fs.readFile(cachePath, 'utf-8');
      const cacheItem: FileCacheItem<T> = JSON.parse(content);
      return cacheItem.data;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const cachePath = this.getCachePath(key);
      await fs.unlink(cachePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const cachePath = this.getCachePath(key);
      const content = await fs.readFile(cachePath, 'utf-8');
      const cacheItem: FileCacheItem<any> = JSON.parse(content);
      
      return Date.now() - cacheItem.timestamp <= cacheItem.ttl;
    } catch {
      return false;
    }
  }

  async getCacheInfo(key: string): Promise<{ 
    exists: boolean; 
    expired: boolean; 
    quarter?: string; 
    age?: number 
  }> {
    try {
      const cachePath = this.getCachePath(key);
      const content = await fs.readFile(cachePath, 'utf-8');
      const cacheItem: FileCacheItem<any> = JSON.parse(content);
      
      const age = Date.now() - cacheItem.timestamp;
      const expired = age > cacheItem.ttl;

      return {
        exists: true,
        expired,
        quarter: cacheItem.quarter,
        age
      };
    } catch {
      return { exists: false, expired: true };
    }
  }

  async cleanup(): Promise<number> {
    let deletedCount = 0;
    try {
      const files = await fs.readdir(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = file.replace('.json', '');
          const info = await this.getCacheInfo(key);
          
          if (info.expired) {
            await this.delete(key);
            deletedCount++;
          }
        }
      }
    } catch {
      // Ignore cleanup errors
    }
    
    return deletedCount;
  }
}

// Singleton instance
export const fileCache = new FileCache();

// Cache keys for file cache
export const FILE_CACHE_KEYS = {
  SCION_HOLDINGS: 'scion-holdings-persistent',
  SCION_BACKUP: 'scion-holdings-backup',
} as const;