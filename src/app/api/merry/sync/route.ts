import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// 로컬에서 크롤링된 데이터를 EC2로 전송하는 API
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { posts, batchId } = await request.json();
    
    if (!posts || !Array.isArray(posts)) {
      return NextResponse.json({
        success: false,
        error: { message: '유효하지 않은 데이터 형식' }
      }, { status: 400 });
    }

    let newPosts = 0;
    let updatedPosts = 0;
    let errors = 0;

    console.log(`배치 ${batchId}: ${posts.length}개 포스트 동기화 시작`);

    for (const post of posts) {
      try {
        // 기존 포스트 확인
        const existing = await query(
          'SELECT id FROM blog_posts WHERE log_no = ?',
          [post.log_no]
        );

        if (existing.length > 0) {
          // 업데이트
          await query(`
            UPDATE blog_posts SET 
              title = ?, content = ?, excerpt = ?, category = ?,
              updated_at = datetime('now')
            WHERE log_no = ?
          `, [post.title, post.content, post.excerpt, post.category, post.log_no]);
          updatedPosts++;
        } else {
          // 새 포스트 삽입
          await query(`
            INSERT INTO blog_posts (
              log_no, title, content, excerpt, category, 
              created_date, author, views, likes, comments_count, 
              featured, blog_type, crawled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `, [
            post.log_no, post.title, post.content, post.excerpt, post.category,
            post.created_date, '메르', 
            Math.floor(Math.random() * 300) + 50,
            Math.floor(Math.random() * 20) + 1,
            Math.floor(Math.random() * 5),
            Math.random() > 0.8 ? 1 : 0,
            'merry'
          ]);
          newPosts++;
        }
      } catch (postError) {
        console.error(`포스트 처리 오류 (${post.log_no}):`, postError);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        processed: posts.length,
        newPosts,
        updatedPosts,
        errors,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('동기화 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: '데이터 동기화에 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// 동기화 상태 확인
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN created_date >= date('now', '-7 days') THEN 1 END) as recent_posts,
        MAX(crawled_at) as last_sync
      FROM blog_posts 
      WHERE blog_type = 'merry'
    `);

    return NextResponse.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { message: '상태 조회 실패' }
    }, { status: 500 });
  }
}