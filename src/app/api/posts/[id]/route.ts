import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { BlogPost } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(posts[0]);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}