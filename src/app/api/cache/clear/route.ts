import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Cache clear request received');

    // 캐시 클리어 로직들
    const clearOperations = [];

    // 1. Next.js 캐시 클리어 (가능한 경우)
    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/', 'layout');
      clearOperations.push('Next.js cache');
    } catch (error) {
      console.log('Next.js cache clear not available:', error);
    }

    // 2. 브라우저 캐시 무효화를 위한 timestamp 갱신
    const timestamp = Date.now();
    clearOperations.push('Browser cache headers');

    // 3. 임시 캐시 파일 삭제 (있다면)
    const tempCacheDir = path.join(process.cwd(), '.cache');
    if (fs.existsSync(tempCacheDir)) {
      try {
        fs.rmSync(tempCacheDir, { recursive: true, force: true });
        clearOperations.push('Temporary cache files');
      } catch (error) {
        console.log('Temp cache clear failed:', error);
      }
    }

    console.log('✅ Cache cleared:', clearOperations.join(', '));

    const response = NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      clearedOperations: clearOperations,
      timestamp: new Date().toISOString()
    });

    // 응답에도 캐시 무력화 헤더 추가
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Cache clear failed' }
    }, { status: 500 });
  }
}