import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { BlogPost } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = "WHERE blog_type = 'merry'";
    const params: any[] = [];

    if (category && category !== 'all') {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (featured === 'true') {
      whereClause += ' AND featured = TRUE';
    }

    // 메르 블로그 포스트와 태그 정보 조회
    const postsQuery = `
      SELECT 
        p.*,
        GROUP_CONCAT(t.name) as tags
      FROM posts p
      LEFT JOIN merry_post_tags pt ON p.id = pt.post_id
      LEFT JOIN merry_tags t ON pt.tag_id = t.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_date DESC
      LIMIT ? OFFSET ?
    `;

    const posts = await query<BlogPost & { tags?: string }>(
      postsQuery, 
      [...params, limit, offset]
    );

    // 태그 문자열을 배열로 변환
    const postsWithTags = posts.map(post => ({
      ...post,
      tags: post.tags ? post.tags.split(',') : []
    }));

    // 총 개수 조회
    const countQuery = `SELECT COUNT(*) as total FROM posts ${whereClause}`;
    const [{ total }] = await query<{ total: number }>(countQuery, params);

    return NextResponse.json({
      success: true,
      data: postsWithTags,
      meta: {
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrev: offset > 0
      }
    });

  } catch (error) {
    console.error('메르 블로그 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'MERRY_POSTS_ERROR',
        message: '메르 블로그 포스트를 가져오는데 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { title, content, excerpt, category, tags = [], featured = false } = body;

    if (!title || !content) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '제목과 내용은 필수입니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // 포스트 생성
    const [result] = await query(`
      INSERT INTO posts (title, content, excerpt, category, author, blog_type, featured, created_date)
      VALUES (?, ?, ?, ?, ?, 'merry', ?, NOW())
    `, [title, content, excerpt, category || null, '메르', featured]);

    const postId = (result as any).insertId;

    // 태그 처리
    if (tags.length > 0) {
      // 태그가 없으면 생성
      for (const tagName of tags) {
        await query(`
          INSERT IGNORE INTO merry_tags (name) VALUES (?)
        `, [tagName]);
      }

      // 포스트-태그 관계 생성
      const tagIds = await query<{ id: number }>(`
        SELECT id FROM merry_tags WHERE name IN (${tags.map(() => '?').join(',')})
      `, tags);

      for (const { id: tagId } of tagIds) {
        await query(`
          INSERT INTO merry_post_tags (post_id, tag_id) VALUES (?, ?)
        `, [postId, tagId]);
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: postId, message: '메르 블로그 포스트가 생성되었습니다' }
    });

  } catch (error) {
    console.error('메르 블로그 포스트 생성 오류:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'MERRY_POST_CREATE_ERROR',
        message: '메르 블로그 포스트 생성에 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}