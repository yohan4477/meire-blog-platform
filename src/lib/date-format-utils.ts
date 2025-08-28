/**
 * 날짜 형식 통일 유틸리티
 * 모든 created_date는 반드시 이 함수를 사용해야 함
 */

/**
 * 표준 날짜 형식으로 변환
 * @param date - Date 객체, 문자열, 또는 undefined
 * @returns "YYYY-MM-DD HH:MM:SS" 형식의 문자열
 */
export function formatCreatedDate(date?: Date | string | number): string {
  let targetDate: Date;
  
  if (date === undefined || date === null) {
    targetDate = new Date();
  } else if (typeof date === 'string') {
    targetDate = new Date(date);
  } else if (typeof date === 'number') {
    targetDate = new Date(date);
  } else if (date instanceof Date) {
    targetDate = date;
  } else {
    targetDate = new Date();
  }
  
  // 유효하지 않은 날짜인 경우 현재 시간 사용
  if (isNaN(targetDate.getTime())) {
    targetDate = new Date();
  }
  
  // "YYYY-MM-DD HH:MM:SS" 형식으로 변환
  return targetDate.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 현재 시간을 표준 형식으로 반환
 * @returns "YYYY-MM-DD HH:MM:SS" 형식의 문자열
 */
export function getCurrentTimestamp(): string {
  return formatCreatedDate();
}

/**
 * Unix timestamp를 표준 형식으로 변환
 * @param timestamp - Unix timestamp (밀리초)
 * @returns "YYYY-MM-DD HH:MM:SS" 형식의 문자열
 */
export function formatUnixTimestamp(timestamp: number): string {
  return formatCreatedDate(new Date(timestamp));
}