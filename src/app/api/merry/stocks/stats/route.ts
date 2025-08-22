import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Stats API: Using fallback calculation method...');

    // SQLite DB 연결
    const StockDB = require('../../../../../lib/stock-db-sqlite3');
    const stockDB = new StockDB();
    await stockDB.connect();

    try {
      // 🚀 ULTRA PERFORMANCE: 병렬 통계 계산
      const [
        totalStocksResult,
        domesticStocksResult,
        usStocksResult,
        totalPostsResult,
        analyzedPostsResult
      ] = await Promise.all([
        new Promise((resolve, reject) => {
          stockDB.db.get('SELECT COUNT(*) as count FROM stocks WHERE is_merry_mentioned = 1 AND mention_count > 0', (err: any, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        }),
        new Promise((resolve, reject) => {
          stockDB.db.get('SELECT COUNT(*) as count FROM stocks WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market IN ("KOSPI", "KOSDAQ", "KRX")', (err: any, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        }),
        new Promise((resolve, reject) => {
          stockDB.db.get('SELECT COUNT(*) as count FROM stocks WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market IN ("NASDAQ", "NYSE")', (err: any, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        }),
        new Promise((resolve, reject) => {
          stockDB.db.get('SELECT COUNT(*) as count FROM blog_posts', (err: any, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        }),
        new Promise((resolve, reject) => {
          stockDB.db.get('SELECT COUNT(DISTINCT post_id) as count FROM sentiments', (err: any, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        })
      ]);

      const stats = {
        totalStocks: (totalStocksResult as any)?.count || 0,
        domesticStocks: (domesticStocksResult as any)?.count || 0,
        usStocks: (usStocksResult as any)?.count || 0,
        totalPosts: (totalPostsResult as any)?.count || 0,
        analyzedPosts: (analyzedPostsResult as any)?.count || 0
      };

      console.log('✅ Fallback stats calculated:', stats);

      return NextResponse.json({
        success: true,
        data: stats,
        meta: {
          source: 'calculated_from_stocks',
          calculatedAt: new Date().toISOString()
        }
      });

    } finally {
      await stockDB.close();
    }

  } catch (error) {
    console.error('📊 Stats API Error:', error);
    return NextResponse.json({
      success: false,
      error: { message: '통계 데이터 조회 실패', details: error instanceof Error ? error.message : 'Unknown error' }
    }, { status: 500 });
  }
}