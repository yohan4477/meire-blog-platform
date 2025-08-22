import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 임시 리다이렉트 API - 올바른 엔드포인트로 리다이렉트
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  
  // /api/merry?limit=2 → /api/merry/posts?limit=2 로 리다이렉트
  const limit = searchParams.get('limit') || '2';
  const redirectUrl = new URL(`/api/merry/posts?limit=${limit}`, url.origin);
  
  return NextResponse.redirect(redirectUrl, 301);
}