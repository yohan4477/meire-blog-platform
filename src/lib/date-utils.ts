/**
 * 날짜 유틸리티 함수들
 * 한국 시간대 기반 날짜 처리
 */

/**
 * 한국 시간대 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getKoreanDate(date?: Date): string {
  const targetDate = date || new Date();
  
  // 한국 시간대로 변환 (UTC+9)
  const koreanDate = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000));
  
  const year = koreanDate.getUTCFullYear();
  const month = String(koreanDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreanDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Unix timestamp를 한국 시간대 기준으로 포맷팅
 * @param timestamp - Unix timestamp (밀리초)
 * @returns YYYY-MM-DD HH:mm:ss 형식 문자열
 */
export function formatKoreanDatetime(timestamp: number): string {
  const date = new Date(timestamp);
  
  // 한국 시간대로 변환 (UTC+9)
  const koreanDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  const year = koreanDate.getUTCFullYear();
  const month = String(koreanDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(koreanDate.getUTCDate()).padStart(2, '0');
  const hours = String(koreanDate.getUTCHours()).padStart(2, '0');
  const minutes = String(koreanDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(koreanDate.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 한국 시간대 기준 현재 시간을 YYYY-MM-DD HH:mm:ss 형식으로 반환
 */
export function getCurrentKoreanDatetime(): string {
  return formatKoreanDatetime(Date.now());
}

/**
 * 날짜 문자열을 한국어 형식으로 변환
 * @param dateString - YYYY-MM-DD 형식 날짜 문자열
 * @returns YYYY년 MM월 DD일 형식 문자열
 */
export function formatKoreanDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

/**
 * 상대적인 날짜 표현 (예: 3일 전, 1시간 전)
 * @param timestamp - Unix timestamp (밀리초)
 * @returns 상대 시간 문자열
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  
  if (years > 0) {
    return `${years}년 전`;
  } else if (months > 0) {
    return `${months}개월 전`;
  } else if (weeks > 0) {
    return `${weeks}주 전`;
  } else if (days > 0) {
    return `${days}일 전`;
  } else if (hours > 0) {
    return `${hours}시간 전`;
  } else if (minutes > 0) {
    return `${minutes}분 전`;
  } else {
    return '방금 전';
  }
}

/**
 * 날짜 범위 검증
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @returns 유효한 날짜 범위인지 여부
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime());
}