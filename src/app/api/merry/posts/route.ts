import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { MerryPostProcessor, type MerryStocksData } from '@/lib/merry-post-processor';

let cachedPosts: any[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const slug = searchParams.get('slug');

    console.log('🚀 Sequential Enhancement: Loading Merry posts...');

    // 캐시 확인
    const now = Date.now();
    if (!cachedPosts || (now - cacheTime) > CACHE_DURATION) {
      console.log('📊 Loading fresh posts data...');
      
      // merry-stocks.json 파일 읽기
      const stocksPath = path.join(process.cwd(), 'merry-stocks.json');
      const stocksData: MerryStocksData = JSON.parse(await fs.readFile(stocksPath, 'utf-8'));
      
      // MerryPostProcessor로 데이터 처리
      const processor = MerryPostProcessor.getInstance();
      cachedPosts = await processor.processStocksData(stocksData);
      cacheTime = now;
      
      console.log(`✅ Processed ${cachedPosts.length} posts with Sequential Enhancement`);
    } else {
      console.log('⚡ Using cached posts data');
    }

    let filteredPosts = [...cachedPosts];

    // 필터링 적용
    if (slug) {
      const post = filteredPosts.find(p => p.slug === slug);
      if (!post) {
        return NextResponse.json({
          success: false,
          error: { code: 'POST_NOT_FOUND', message: '포스트를 찾을 수 없습니다' }
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        data: post
      });
    }

    if (category && category !== 'all') {
      filteredPosts = filteredPosts.filter(post => post.category === category);
    }

    if (featured === 'true') {
      filteredPosts = filteredPosts.filter(post => post.featured);
    }

    // 페이지네이션 적용
    const total = filteredPosts.length;
    const paginatedPosts = filteredPosts.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedPosts,
      meta: {
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrev: offset > 0,
        categories: [...new Set(cachedPosts.map(p => p.category))],
        featuredCount: cachedPosts.filter(p => p.featured).length
      }
    });

  } catch (error) {
    console.error('❌ Merry posts API error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'MERRY_POSTS_ERROR',
        message: '메르 포스트를 가져오는데 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}