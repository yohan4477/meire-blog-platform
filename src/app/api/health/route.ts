import { NextResponse } from 'next/server';

/**
 * 🏥 Health Check API
 * 스케줄러에서 서버 상태를 확인하는 용도
 */
export async function GET(): Promise<NextResponse> {
  try {
    const now = new Date();
    
    const healthStatus = {
      success: true,
      status: 'healthy',
      timestamp: now.toISOString(),
      kstTime: now.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}),
      server: 'Meire Blog Platform',
      version: '1.0.0',
      uptime: process.uptime(),
      claudeScheduler: {
        enabled: true,
        endpoint: '/api/claude/auto-update'
      }
    };
    
    return NextResponse.json(healthStatus, { status: 200 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}