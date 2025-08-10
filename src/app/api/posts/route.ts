import { NextRequest } from 'next/server';
import { query } from '@/lib/database';
import { BlogPost } from '@/types';
import {
  createSuccessResponse,
  createErrorResponse,
  createDatabaseErrorResponse,
  createValidationErrorResponse,
  createPaginationMeta,
  addSecurityHeaders,
  withPerformanceMonitoring
} from '@/lib/api-utils';
import { postFiltersSchema, validateQueryParams } from '@/lib/validation';

/**
 * GET /api/posts
 * Retrieve blog posts with filtering and pagination
 * Query params: category, search, limit, offset
 */
export async function GET(request: NextRequest) {
  return withPerformanceMonitoring(async () => {
    try {
      const { searchParams } = new URL(request.url);
      
      // Validate query parameters using Zod schema
      const validation = validateQueryParams(postFiltersSchema, searchParams);
      if (!validation.success) {
        return addSecurityHeaders(createValidationErrorResponse(
          validation.field || 'query',
          validation.error
        ));
      }
      
      const { category, search, limit, offset } = validation.data;

      // Build query with parameterized statements (SQL injection protection)
      let sql = `
        SELECT id, log_no, title, content, category, 
               DATE_FORMAT(created_date, '%Y-%m-%d %H:%i:%s') as created_date,
               DATE_FORMAT(crawled_at, '%Y-%m-%d %H:%i:%s') as crawled_at,
               DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
        FROM blog_posts 
        WHERE 1=1
      `;
      
      const params: any[] = [];

      if (category) {
        sql += ` AND category = ?`;
        params.push(category);
      }

      if (search) {
        sql += ` AND (title LIKE ? OR content LIKE ?)`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
      }

      sql += ` ORDER BY created_date DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      // Execute main query
      const posts = await query<BlogPost>(sql, params);

      // Build count query
      let countSql = `SELECT COUNT(*) as count FROM blog_posts WHERE 1=1`;
      const countParams: any[] = [];

      if (category) {
        countSql += ` AND category = ?`;
        countParams.push(category);
      }

      if (search) {
        countSql += ` AND (title LIKE ? OR content LIKE ?)`;
        const searchParam = `%${search}%`;
        countParams.push(searchParam, searchParam);
      }

      // Execute count query
      const [{ count }] = await query<{ count: number }>(countSql, countParams);

      // Create pagination metadata
      const meta = createPaginationMeta(count, limit, offset);

      // Return standardized success response
      return addSecurityHeaders(createSuccessResponse(
        posts,
        posts.length > 0 ? `Retrieved ${posts.length} posts` : 'No posts found',
        meta
      ));

    } catch (error) {
      console.error('Posts API Error:', error);
      
      // Return standardized database error response
      if (error instanceof Error && error.message.includes('connect')) {
        return addSecurityHeaders(createErrorResponse(
          'Database connection failed',
          503,
          'DATABASE_CONNECTION_ERROR'
        ));
      }
      
      return addSecurityHeaders(createDatabaseErrorResponse(error as Error));
    }
  }, 'GET /api/posts');
}