import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import {
  createSuccessResponse,
  createDatabaseErrorResponse,
  addSecurityHeaders,
  withPerformanceMonitoring
} from '@/lib/api-utils';

export async function GET() {
  return withPerformanceMonitoring(async () => {
    try {
      const categories = await query<{ name: string; count: number }>(
        `SELECT 
           category as name, 
           COUNT(*) as count 
         FROM blog_posts 
         WHERE category IS NOT NULL 
         GROUP BY category 
         ORDER BY count DESC`
      );

      return addSecurityHeaders(createSuccessResponse(
        categories,
        categories.length > 0 ? `Retrieved ${categories.length} categories` : 'No categories found'
      ));

    } catch (error) {
      console.error('Categories API Error:', error);
      return addSecurityHeaders(createDatabaseErrorResponse(error as Error));
    }
  }, 'GET /api/categories');
}