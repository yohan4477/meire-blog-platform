import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { formatKoreanDatetime, getKoreanDate } from '@/lib/date-utils';

const db = new Database('database.db');

// 오늘 날짜 포스트 조회
export async function GET() {
  try {
    const today = getKoreanDate();
    const todayStart = `${today} 00:00:00`;
    const todayEnd = `${today} 23:59:59`;
    
    const stmt = db.prepare(`
      SELECT 
        id,
        log_no,
        title,
        content,
        created_date,
        views
      FROM blog_posts 
      WHERE datetime(created_date/1000, 'unixepoch', 'localtime') BETWEEN ? AND ?
      ORDER BY created_date DESC
    `);
    
    const posts = stmt.all(todayStart, todayEnd);
    
    const formattedPosts = posts.map(post => {
      // 내용을 한줄로 요약 (첫 번째 줄 또는 100자 제한)
      const summary = post.content
        .replace(/<[^>]*>/g, '') // HTML 태그 제거
        .split('\n')[0] // 첫 번째 줄
        .substring(0, 100) // 100자 제한
        .trim();
      
      return {
        id: post.id,
        logNo: post.log_no,
        title: post.title,
        summary: summary + (summary.length === 100 ? '...' : ''),
        createdDate: formatKoreanDatetime(post.created_date),
        views: post.views || 0
      };
    });
    
    return NextResponse.json({
      date: today,
      count: formattedPosts.length,
      posts: formattedPosts
    });
    
  } catch (error) {
    console.error('오늘 포스트 조회 오류:', error);
    return NextResponse.json(
      { error: '오늘 포스트를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}