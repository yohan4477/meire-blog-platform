import { NextRequest } from 'next/server';
import { query } from '@/lib/database';
import { BlogPost } from '@/types';
import {
  createSuccessResponse,
  createNotFoundResponse,
  createDatabaseErrorResponse,
  addSecurityHeaders,
  withPerformanceMonitoring
} from '@/lib/api-utils';

/**
 * GET /api/posts/[id]
 * Retrieve a specific blog post by ID or log_no
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPerformanceMonitoring(async () => {
    try {
      const { id } = await params;

      if (!id) {
        return addSecurityHeaders(createNotFoundResponse('Post'));
      }

      const posts = await query<BlogPost>(
        `SELECT id, log_no, title, content, category, 
                DATE_FORMAT(created_date, '%Y-%m-%d %H:%i:%s') as created_date,
                DATE_FORMAT(crawled_at, '%Y-%m-%d %H:%i:%s') as crawled_at,
                DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
         FROM blog_posts 
         WHERE id = ? OR log_no = ?`,
        [id, id]
      );

      if (posts.length === 0) {
        return addSecurityHeaders(createNotFoundResponse('Post'));
      }

      return addSecurityHeaders(createSuccessResponse(
        posts[0],
        `Retrieved post: ${posts[0].title}`
      ));

    } catch (error) {
      console.error('Post API Error:', error);
      return addSecurityHeaders(createDatabaseErrorResponse(error as Error));
    }
  }, `GET /api/posts/${(await params).id}`);
}