import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { MerryPostProcessor, type MerryStocksData } from '@/lib/merry-post-processor';

let cachedPosts: any[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    
    if (isNaN(postId)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_POST_ID', message: '유효하지 않은 포스트 ID입니다' }
      }, { status: 400 });
    }

    console.log(`🚀 Loading post ${postId} with Sequential Enhancement...`);

    // 캐시 확인 및 데이터 로드
    const now = Date.now();
    if (!cachedPosts || (now - cacheTime) > CACHE_DURATION) {
      console.log('📊 Loading fresh posts data...');
      
      const stocksPath = path.join(process.cwd(), 'merry-stocks.json');
      const stocksData: MerryStocksData = JSON.parse(await fs.readFile(stocksPath, 'utf-8'));
      
      const processor = MerryPostProcessor.getInstance();
      cachedPosts = await processor.processStocksData(stocksData);
      cacheTime = now;
    }

    // 포스트 찾기
    const post = cachedPosts.find(p => p.id === postId);
    
    if (!post) {
      return NextResponse.json({
        success: false,
        error: { code: 'POST_NOT_FOUND', message: '포스트를 찾을 수 없습니다' }
      }, { status: 404 });
    }

    // Context7 Intelligence: 관련 포스트 추천
    const processor = MerryPostProcessor.getInstance();
    const relatedPosts = processor.getRelatedPosts(postId, 3);

    // 이전/다음 포스트 찾기 (날짜 순)
    const sortedPosts = cachedPosts.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    const currentIndex = sortedPosts.findIndex(p => p.id === postId);
    const prevPost = currentIndex > 0 ? {
      id: sortedPosts[currentIndex - 1].id,
      title: sortedPosts[currentIndex - 1].title,
      slug: sortedPosts[currentIndex - 1].slug
    } : null;
    
    const nextPost = currentIndex < sortedPosts.length - 1 ? {
      id: sortedPosts[currentIndex + 1].id,
      title: sortedPosts[currentIndex + 1].title,
      slug: sortedPosts[currentIndex + 1].slug
    } : null;

    // 조회수 증가 (실제 구현에서는 데이터베이스 업데이트)
    post.views += 1;

    return NextResponse.json({
      success: true,
      data: {
        post,
        relatedPosts,
        navigation: {
          prev: prevPost,
          next: nextPost
        }
      }
    });

  } catch (error) {
    console.error('❌ Individual post API error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'POST_FETCH_ERROR',
        message: '포스트를 가져오는데 실패했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}