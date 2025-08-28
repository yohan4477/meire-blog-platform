import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { BlogPost } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const logNo = parseInt(id);

    if (isNaN(logNo)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_POST_ID',
          message: '유효하지 않은 포스트 ID입니다',
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // 포스트 정보 조회 (blog_posts 테이블 - log_no 필드 사용)
    const postQuery = `
      SELECT 
        log_no as id, title, content, excerpt, category, created_date, views, featured
      FROM blog_posts
      WHERE log_no = ?
    `;

    const posts = await query<BlogPost & { tags?: string }>(postQuery, [id]);

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

    const firstPost = posts[0];
    
    // post_analysis 테이블에서 분석 데이터 조회
    const analysisQuery = `
      SELECT 
        summary,
        explanation, 
        investment_insight,
        analyzed_at
      FROM post_analysis
      WHERE log_no = ?
    `;
    
    const analysisResults = await query<any>(analysisQuery, [id]);
    const analysis = analysisResults.length > 0 ? analysisResults[0] : null;
    
    const post = {
      ...firstPost,
      author: '메르', // 기본 작성자
      createdAt: firstPost?.created_date || new Date().toISOString(),
      likes: 0, // 기본값
      comments: 0, // 기본값  
      tags: [], // 태그는 추후 구현
      analysis: analysis ? {
        summary: analysis.summary,
        explanation: analysis.explanation,
        investment_insight: analysis.investment_insight,
        analyzed_at: analysis.analyzed_at
      } : undefined
    };

    // 조회수 증가 - log_no 기반
    await query('UPDATE blog_posts SET views = views + 1 WHERE log_no = ?', [id]);
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
    const logNo = parseInt(id);
    const body = await request.json();

    if (isNaN(logNo)) {
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
      updateValues.push(logNo);

      await query(`
        UPDATE posts SET ${updateFields.join(', ')}
        WHERE id = ? AND blog_type = 'merry'
      `, updateValues);
    }

    // 태그 업데이트
    if (Array.isArray(tags)) {
      // 기존 태그 관계 삭제
      await query('DELETE FROM merry_post_tags WHERE post_id = ?', [logNo]);

      // 새 태그 추가
      if (tags.length > 0) {
        for (const tagName of tags) {
          await query('INSERT IGNORE INTO merry_tags (name) VALUES (?)', [tagName]);
        }

        const tagIds = await query<{ id: number }>(`
          SELECT id FROM merry_tags WHERE name IN (${tags.map(() => '?').join(',')})
        `, tags);

        for (const { id: tagId } of tagIds) {
          await query('INSERT INTO merry_post_tags (post_id, tag_id) VALUES (?, ?)', [logNo, tagId]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: logNo, message: '메르 블로그 포스트가 업데이트되었습니다' }
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
    const logNo = parseInt(id);

    if (isNaN(logNo)) {
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
      [logNo]
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