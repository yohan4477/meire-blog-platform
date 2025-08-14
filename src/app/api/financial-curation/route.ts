import { NextRequest, NextResponse } from 'next/server';

// 🚀 AI 큐레이션 기능 비활성화 - 섹션 오류 방지 
// 모든 AI Agent 관련 import 제거하여 서버 에러 완전 차단

// GET /api/financial-curation - AI 큐레이션 비활성화
export async function GET(request: NextRequest) {
  // 🚀 비활성화된 상태로 기본 응답 반환
  return NextResponse.json({
    success: true,
    data: [],
    meta: {
      message: 'AI 큐레이션 기능이 비활성화되었습니다.',
      disabled: true,
      generated_at: new Date().toISOString()
    }
  });
}

// POST /api/financial-curation - AI 큐레이션 비활성화
export async function POST(request: NextRequest) {
  // 🚀 비활성화된 상태로 기본 응답 반환
  return NextResponse.json({
    success: true,
    data: { message: 'AI 큐레이션 POST 기능이 비활성화되었습니다.' },
    meta: {
      disabled: true,
      processed_at: new Date().toISOString()
    }
  });
}