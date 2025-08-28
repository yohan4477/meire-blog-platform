import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { formatKoreanDatetime, getKoreanDate } from '@/lib/date-utils';
import { formatCreatedDate } from '@/lib/date-format-utils';

const db = new Database('database.db');

interface BlogPost {
  id: number;
  log_no: string;
  title: string;
  content: string | null;
  created_date: number;
  views: number;
}

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
        typeof(created_date) as date_type,
        views
      FROM blog_posts 
      WHERE (
        -- Unix timestamp 형식인 경우 (밀리초)
        (typeof(created_date) = 'integer' AND datetime(created_date/1000, 'unixepoch', 'localtime') BETWEEN ? AND ?) OR
        -- 문자열 형식인 경우 (YYYY-MM-DD HH:MM:SS)
        (typeof(created_date) = 'text' AND created_date BETWEEN ? AND ?)
      )
      ORDER BY 
        CASE 
          WHEN typeof(created_date) = 'integer' THEN created_date 
          ELSE strftime('%s', created_date) * 1000
        END DESC
    `);
    
    const posts = stmt.all(todayStart, todayEnd, todayStart, todayEnd) as any[];
    
    const formattedPosts = posts.filter(Boolean).map(post => {
      // 내용을 한줄로 요약 (첫 번째 줄 또는 100자 제한)
      const summary = (post.content || '')
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