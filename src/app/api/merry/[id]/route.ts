import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { BlogPost } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_POST_ID',
          message: '유효하지 않은 포스트 ID입니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // 포스트와 태그 정보 조회
    const postQuery = `
      SELECT 
        p.*,
        GROUP_CONCAT(t.name) as tags
      FROM posts p
      LEFT JOIN merry_post_tags pt ON p.id = pt.post_id
      LEFT JOIN merry_tags t ON pt.tag_id = t.id
      WHERE p.id = ? AND p.blog_type = 'merry'
      GROUP BY p.id
    `;

    const posts = await query<BlogPost & { tags?: string }>(postQuery, [postId]);

    if (posts.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: '포스트를 찾을 수 없습니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    const post = {
      ...posts[0],
      tags: posts[0].tags ? posts[0].tags.split(',') : []
    };

    // 조회수 증가
    await query('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
    post.views = (post.views || 0) + 1;

    return NextResponse.json({
      success: true,
      data: post
    });

  } catch (error) {
    console.error('메르 블로그 포스트 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'MERRY_POST_GET_ERROR',
        message: '메르 블로그 포스트 조회에 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    const body = await request.json();

    if (isNaN(postId)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_POST_ID',
          message: '유효하지 않은 포스트 ID입니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const { title, content, excerpt, category, tags = [], featured } = body;
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (title) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (content) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }
    if (excerpt !== undefined) {
      updateFields.push('excerpt = ?');
      updateValues.push(excerpt);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (featured !== undefined) {
      updateFields.push('featured = ?');
      updateValues.push(featured);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(postId);

      await query(`
        UPDATE posts SET ${updateFields.join(', ')}
        WHERE id = ? AND blog_type = 'merry'
      `, updateValues);
    }

    // 태그 업데이트
    if (Array.isArray(tags)) {
      // 기존 태그 관계 삭제
      await query('DELETE FROM merry_post_tags WHERE post_id = ?', [postId]);

      // 새 태그 추가
      if (tags.length > 0) {
        for (const tagName of tags) {
          await query('INSERT IGNORE INTO merry_tags (name) VALUES (?)', [tagName]);
        }

        const tagIds = await query<{ id: number }>(`
          SELECT id FROM merry_tags WHERE name IN (${tags.map(() => '?').join(',')})
        `, tags);

        for (const { id: tagId } of tagIds) {
          await query('INSERT INTO merry_post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: postId, message: '메르 블로그 포스트가 업데이트되었습니다' }
    });

  } catch (error) {
    console.error('메르 블로그 포스트 업데이트 오류:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'MERRY_POST_UPDATE_ERROR',
        message: '메르 블로그 포스트 업데이트에 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_POST_ID',
          message: '유효하지 않은 포스트 ID입니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // 포스트 삭제 (CASCADE로 관련 데이터도 자동 삭제)
    const result = await query(
      'DELETE FROM posts WHERE id = ? AND blog_type = \'merry\'',
      [postId]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: '삭제할 포스트를 찾을 수 없습니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { message: '메르 블로그 포스트가 삭제되었습니다' }
    });

  } catch (error) {
    console.error('메르 블로그 포스트 삭제 오류:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'MERRY_POST_DELETE_ERROR',
        message: '메르 블로그 포스트 삭제에 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}