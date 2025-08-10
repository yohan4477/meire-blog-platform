import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { BlogPost } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

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
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY created_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const posts = await query<BlogPost>(sql, params);

    // 총 개수 조회
    let countSql = `SELECT COUNT(*) as count FROM blog_posts WHERE 1=1`;
    const countParams: any[] = [];

    if (category) {
      countSql += ` AND category = ?`;
      countParams.push(category);
    }

    if (search) {
      countSql += ` AND (title LIKE ? OR content LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [{ count }] = await query<{ count: number }>(countSql, countParams);

    return NextResponse.json({
      posts,
      totalCount: count,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}