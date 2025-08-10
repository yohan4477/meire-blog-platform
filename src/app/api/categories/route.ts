import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    const categories = await query<{ name: string; count: number }>(
      `SELECT 
         category as name, 
         COUNT(*) as count 
       FROM blog_posts 
       WHERE category IS NOT NULL 
       GROUP BY category 
       ORDER BY count DESC`
    );

    return NextResponse.json(categories);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}