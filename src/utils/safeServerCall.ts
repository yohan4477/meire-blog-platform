/**
 * 🛡️ Server-side Safe API Call Utility
 * Super Claude + 3종 MCP 구현: 서버사이드 에러 방지 시스템
 */

export async function safeServerCall<T>(
  apiCall: () => Promise<T>,
  retries: number = 3,
  fallback?: T
): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      console.warn(`🔄 Retry attempt ${i + 1}/${retries} after ${1000 * (i + 1)}ms`);
      if (i === retries - 1) {
        console.error('❌ All retries failed:', error);
        if (fallback !== undefined) {
          return fallback;
        }
        return null;
      }
      // 재시도 전 잠깐 대기 (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
}

export function safeServerJsonParse<T>(jsonString: string, fallback?: T): T | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON 파싱 실패:', error);
    return fallback ?? null;
  }
}