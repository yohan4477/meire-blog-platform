#!/usr/bin/env node
/**
 * 메르 블로그 크롤링 시스템 - TypeScript 버전
 * Next.js 플랫폼용으로 변환
 */

import axios, { AxiosResponse } from 'axios';
import { load } from 'cheerio';
import { query } from './database';
import { BlogPost, CrawlerStats, PostData } from '../types';

interface BlogCrawlerConfig {
  blogId: string;
  maxPages: number;
  delayRange: [number, number];
  userAgent: string;
}

const DEFAULT_CONFIG: BlogCrawlerConfig = {
  blogId: 'ranto28',
  maxPages: 200,
  delayRange: [0.8, 1.5],
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

export class BlogCrawler {
  private config: BlogCrawlerConfig;
  private stats: CrawlerStats;

  constructor(config: Partial<BlogCrawlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalFound: 0,
      newPosts: 0,
      updatedPosts: 0,
      errors: 0,
      skippedOld: 0
    };
  }

  /**
   * 포스트 목록 페이지에서 포스트 URL들 추출
   */
  async getPostListFromPage(page: number = 1): Promise<Array<{log_no: string, url: string, title_preview: string}>> {
    const desktopUrl = `https://blog.naver.com/PostList.naver?blogId=${this.config.blogId}&currentPage=${page}`;
    
    try {
      console.log(`DEBUG: 데스크톱 목록 페이지 접근 - ${desktopUrl}`);
      
      const response = await axios.get(desktopUrl, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: 15000
      });

      const $ = load(response.data);
      const postUrls: Array<{log_no: string, url: string, title_preview: string}> = [];
      
      // 페이지에서 모든 logNo 패턴 찾기 (정규식으로 직접)
      const pageText = response.data;
      const logPatterns = pageText.match(/logNo[=:](\d+)/g) || [];
      const uniqueLogs = [...new Set(logPatterns.map(pattern => pattern.match(/\d+/)?.[0]).filter(Boolean))];
      
      console.log(`DEBUG: 페이지 ${page}에서 logNo 패턴 ${uniqueLogs.length}개 발견`);
      console.log(`DEBUG: 발견된 logNo들:`, uniqueLogs);
      
      // 각 logNo로 포스트 URL 생성
      for (const logNo of uniqueLogs) {
        const postUrl = `https://m.blog.naver.com/${this.config.blogId}/${logNo}`;
        
        // 해당 logNo와 연결된 링크에서 제목 추출 시도
        let title = "";
        const titleLink = $(`a[href*="logNo=${logNo}"]`).first();
        if (titleLink.length) {
          title = titleLink.text().trim();
          if (!title && titleLink.parent().length) {
            title = titleLink.parent().text().trim().substring(0, 100);
          }
        }
        
        postUrls.push({
          log_no: logNo,
          url: postUrl,
          title_preview: title.substring(0, 50) || `Post-${logNo}`
        });
        
        console.log(`DEBUG: logNo ${logNo} 추가 - ${title.substring(0, 30) || 'No title'}`);
      }
      
      console.log(`DEBUG: 페이지 ${page}에서 최종 고유 포스트 ${postUrls.length}개 추출`);
      return postUrls;
      
    } catch (error) {
      console.log(`데스크톱 포스트 목록 페이지 ${page} 오류:`, error);
      
      // 대안: 모바일 PostList.naver 시도
      try {
        console.log(`DEBUG: 모바일 PostList.naver로 재시도...`);
        const mobileListUrl = `https://m.blog.naver.com/PostList.naver?blogId=${this.config.blogId}${page > 1 ? `&currentPage=${page}` : ''}`;
        
        const response = await axios.get(mobileListUrl, {
          headers: { 'User-Agent': this.config.userAgent },
          timeout: 15000
        });
        
        // logNo 패턴으로 직접 추출
        const logPatterns = response.data.match(/logNo[=:](\d+)/g) || [];
        const uniqueLogs = [...new Set(logPatterns.map((pattern: string) => pattern.match(/\d+/)?.[0]).filter(Boolean))];
        
        console.log(`DEBUG: 모바일 버전에서 logNo ${uniqueLogs.length}개 발견`);
        
        const postUrls: Array<{log_no: string, url: string, title_preview: string}> = [];
        for (const logNo of uniqueLogs) {
          const postUrl = `https://m.blog.naver.com/${this.config.blogId}/${logNo}`;
          postUrls.push({
            log_no: logNo,
            url: postUrl,
            title_preview: `Post-${logNo}`
          });
        }
        
        return postUrls;
        
      } catch (error2) {
        console.log(`모바일 버전도 실패:`, error2);
        return [];
      }
    }
  }

  /**
   * 제목 중복 여부 판단 (강화된 로직)
   */
  private shouldSkipDuplicateTitle(text: string, title: string, lineIndex: number): boolean {
    // 첫 3줄 내에서만 중복 검사
    if (lineIndex >= 3) return false;
    
    // 1. 완전히 같은 경우
    if (text === title) return true;
    
    // 2. 공백과 특수문자 제거 후 비교
    const normalizeText = (str: string) => str.replace(/[\s\u200b\u00a0]/g, '').toLowerCase();
    if (normalizeText(text) === normalizeText(title)) return true;
    
    // 3. 제목이 본문 텍스트에 완전히 포함되어 있는 경우 (첫 2줄만)
    if (lineIndex < 2 && text.includes(title) && text.length < title.length * 1.5) return true;
    
    // 4. 본문 텍스트가 제목에 완전히 포함되어 있는 경우 (첫 2줄만)  
    if (lineIndex < 2 && title.includes(text) && text.length > 5) return true;
    
    // 5. 유사도가 매우 높은 경우 (편집 거리 기반)
    if (lineIndex < 2 && this.calculateSimilarity(text, title) > 0.8) return true;
    
    return false;
  }
  
  /**
   * 두 문자열의 유사도 계산 (0-1 사이 값)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * 레벤슈타인 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 포스트의 카테고리 정보 추출
   */
  async extractCategory(logNo: string): Promise<string | null> {
    try {
      // 데스크톱 버전에서 카테고리 정보 가져오기
      const desktopUrl = `https://blog.naver.com/PostView.naver?blogId=${this.config.blogId}&logNo=${logNo}`;
      const response = await axios.get(desktopUrl, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: 10000
      });
      
      if (response.status === 200) {
        // JavaScript에서 categoryName 패턴 찾기
        const categoryMatches = response.data.match(/categoryName['"]?\s*[:\=]\s*['"]([^'"\}]+)['"]/g);
        
        if (categoryMatches) {
          for (const match of categoryMatches) {
            const categoryMatch = match.match(/['"]([^'"\}]+)['"]/);
            if (categoryMatch) {
              let category = categoryMatch[1];
              
              // URL 디코딩
              try {
                category = decodeURIComponent(category);
              } catch {
                // 디코딩 실패시 원본 사용
              }
              
              // "전체보기" 제외
              if (category && category !== "전체보기" && category.trim().length > 0) {
                return category.trim();
              }
            }
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.log(`카테고리 추출 오류 (logNo: ${logNo}):`, error);
      return null;
    }
  }

  /**
   * 개별 포스트 내용 추출
   */
  async extractPostContent(postUrl: string): Promise<PostData | null> {
    try {
      const response = await axios.get(postUrl, {
        headers: { 'User-Agent': this.config.userAgent },
        timeout: 15000
      });
      
      const $ = load(response.data);
      
      // logNo 추출
      const logNoMatch = postUrl.match(/\/(\d+)/);
      const logNo = logNoMatch ? logNoMatch[1] : null;
      
      // 제목 추출
      const titleMeta = $('meta[property="og:title"]');
      const title = titleMeta.attr('content') || '';
      
      // 본문 추출 (빈 단락 제외)
      const paragraphs = $('p.se-text-paragraph');
      const contentLines: string[] = [];
      
      paragraphs.each((_, elem) => {
        const text = $(elem).text().trim();
        if (text && !['​', '\u200b', '﻿', ' ', '\t', '\n'].includes(text)) {
          // 제목 중복 제거 로직 강화
          const shouldSkip = this.shouldSkipDuplicateTitle(text, title, contentLines.length);
          if (!shouldSkip) {
            contentLines.push(text);
          }
        }
      });
      
      const content = contentLines.join('\n');
      
      // 작성 날짜 추출
      const createdDate = await this.extractPostDateFromSoup($, response.data, logNo);
      
      // 카테고리 추출
      const category = logNo ? await this.extractCategory(logNo) : null;
      
      return {
        logNo,
        title,
        content,
        category,
        created_date: createdDate,
        url: postUrl
      };
      
    } catch (error) {
      console.log(`포스트 추출 오류 (${postUrl}):`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * 이미 로드된 soup에서 날짜 추출
   */
  async extractPostDateFromSoup($: any, pageText: string, logNo: string | null): Promise<string> {
    const now = new Date();
    
    try {
      // 1. 점 구분 날짜 패턴 (YYYY. MM. DD. HH:MM) - 최우선
      const dotDateTimeMatch = pageText.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{1,2})/);
      if (dotDateTimeMatch) {
        const [, year, month, day, hour, minute] = dotDateTimeMatch.map(Number);
        if (year >= 2020 && year <= 2025 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const postTime = new Date(year, month - 1, day, hour, minute, 0);
          return postTime.toISOString().replace('T', ' ').substring(0, 19);
        }
      }
      
      // 2. 점 구분 날짜 패턴 (YYYY. MM. DD) - 시간 없음
      const dotDateMatch = pageText.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
      if (dotDateMatch) {
        const [, year, month, day] = dotDateMatch.map(Number);
        if (year >= 2020 && year <= 2025 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const postTime = new Date(year, month - 1, day, 12, 0, 0);
          return postTime.toISOString().replace('T', ' ').substring(0, 19);
        }
      }

      // 3. 한국어 날짜 패턴 (YYYY년 MM월 DD일)
      const koreanDateMatch = pageText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (koreanDateMatch) {
        const [, year, month, day] = koreanDateMatch.map(Number);
        if (year >= 2020 && year <= 2025 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const postTime = new Date(year, month - 1, day, 12, 0, 0);
          return postTime.toISOString().replace('T', ' ').substring(0, 19);
        }
      }
      
      // 4. meta 태그에서 날짜 찾기
      const dateMeta = $('meta[property="article:published_time"]');
      if (dateMeta.length) {
        const dateStr = dateMeta.attr('content');
        if (dateStr) {
          try {
            const parsedDate = new Date(dateStr.replace('Z', '+00:00'));
            return parsedDate.toISOString().replace('T', ' ').substring(0, 19);
          } catch {
            // 파싱 실패시 계속
          }
        }
      }
      
      // 기본값: 현재 시간
      return now.toISOString().replace('T', ' ').substring(0, 19);
      
    } catch (error) {
      console.log(`날짜 추출 오류 (logNo: ${logNo}):`, error);
      return now.toISOString().replace('T', ' ').substring(0, 19);
    }
  }

  /**
   * 포스트를 데이터베이스에 저장
   */
  async savePostToDb(postData: PostData): Promise<boolean> {
    try {
      // 먼저 기존 포스트 확인
      const existing = await query(
        'SELECT id FROM blog_posts WHERE log_no = ? AND blog_type = ?',
        [postData.logNo, 'merry']
      );

      if (existing.length > 0) {
        // 업데이트
        const updateSql = `
          UPDATE blog_posts SET 
            title = ?, content = ?, category = ?, 
            updated_at = datetime('now')
          WHERE log_no = ? AND blog_type = ?
        `;
        
        await query(updateSql, [
          postData.title,
          postData.content,
          postData.category,
          postData.logNo,
          'merry'
        ]);
        
        this.stats.updatedPosts++;
        console.log(`포스트 업데이트 - logNo: ${postData.logNo}${postData.category ? ` | 카테고리: ${postData.category}` : ''}`);
      } else {
        // 새 포스트 삽입
        const insertSql = `
          INSERT INTO blog_posts (
            log_no, title, content, category, created_date, 
            author, views, likes, comments_count, featured, blog_type, crawled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        await query(insertSql, [
          postData.logNo,
          postData.title,
          postData.content,
          postData.category,
          postData.created_date,
          '메르',
          Math.floor(Math.random() * 300) + 50, // 임시 조회수
          Math.floor(Math.random() * 20) + 1,   // 임시 좋아요
          Math.floor(Math.random() * 5),        // 임시 댓글수
          Math.random() > 0.8 ? 1 : 0,         // 20% 확률로 추천글
          'merry'
        ]);
        
        this.stats.newPosts++;
        console.log(`새 포스트 저장 - logNo: ${postData.logNo}${postData.category ? ` | 카테고리: ${postData.category}` : ''}`);
      }
      
      console.log(`  제목: ${postData.title.substring(0, 50)}...`);
      
      return true;
      
    } catch (error) {
      console.log(`DB 저장 오류:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * 2024년 포스트 10개만 크롤링
   */
  async crawl2024Posts(maxPosts: number = 10): Promise<CrawlerStats> {
    console.log(`=== ${this.config.blogId} 2024년 블로그 크롤링 시작 ===`);
    console.log(`목표: 2024년 포스트 최대 ${maxPosts}개`);
    console.log('');
    
    const allPosts: Array<{log_no: string, url: string, title_preview: string}> = [];
    const found2024Posts: Array<{log_no: string, url: string, title_preview: string}> = [];
    let page = 1;
    let consecutiveNon2024Count = 0;
    const maxConsecutiveNon2024 = 5; // 연속으로 5페이지 2024년 글이 없으면 중단
    
    // 2024년 글을 찾을 때까지 페이지 탐색
    while (found2024Posts.length < maxPosts && page <= 50 && consecutiveNon2024Count < maxConsecutiveNon2024) {
      console.log(`[PAGE ${page}] 2024년 포스트 검색 중...`);
      
      const pagePosts = await this.getPostListFromPage(page);
      
      if (pagePosts.length === 0) {
        console.log(`페이지 ${page}에서 포스트를 찾을 수 없음. 검색 종료.`);
        break;
      }
      
      let page2024Count = 0;
      
      // 각 포스트의 날짜 확인
      for (const postInfo of pagePosts) {
        const postData = await this.extractPostContent(postInfo.url);
        
        if (postData && postData.created_date) {
          const postYear = new Date(postData.created_date).getFullYear();
          
          if (postYear === 2024) {
            found2024Posts.push(postInfo);
            page2024Count++;
            console.log(`✅ 2024년 포스트 발견 (${found2024Posts.length}/${maxPosts}): ${postData.title}`);
            
            if (found2024Posts.length >= maxPosts) {
              break;
            }
          }
        }
        
        // 포스트 간 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (page2024Count === 0) {
        consecutiveNon2024Count++;
        console.log(`⚠️ 페이지 ${page}에서 2024년 포스트 없음 (연속 ${consecutiveNon2024Count}회)`);
      } else {
        consecutiveNon2024Count = 0; // 2024년 글을 찾으면 카운터 리셋
      }
      
      page++;
      
      // 페이지 간 대기
      const waitTime = Math.random() * (1.5 - 0.8) + 0.8;
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
    
    this.stats.totalFound = found2024Posts.length;
    console.log(`\n총 2024년 포스트 ${found2024Posts.length}개 발견`);
    
    if (found2024Posts.length === 0) {
      console.log('2024년 포스트를 찾지 못했습니다.');
      return this.stats;
    }
    
    // 각 포스트 내용 추출 및 저장
    console.log('\n[EXTRACT] 2024년 포스트 내용 추출 및 저장 시작...');
    
    for (let i = 0; i < found2024Posts.length; i++) {
      const postInfo = found2024Posts[i];
      
      // 프로그레스 바 계산
      const progress = Math.floor(((i + 1) / found2024Posts.length) * 100);
      const barLength = 30;
      const filledLength = Math.floor(barLength * (i + 1) / found2024Posts.length);
      const bar = '#'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
      
      console.log(`\n[${i + 1}/${found2024Posts.length}] [${bar}] ${progress}%`);
      console.log(`처리 중: ${postInfo.title_preview}`);
      
      // 포스트 내용 추출 (이미 한 번 추출했지만 다시 추출해서 저장)
      const postData = await this.extractPostContent(postInfo.url);
      
      if (postData && new Date(postData.created_date).getFullYear() === 2024) {
        // DB에 저장
        const success = await this.savePostToDb(postData);
        
        if (success) {
          console.log(`SUCCESS: 2024년 포스트 저장 완료 - ${postData.title}`);
        } else {
          console.log(`ERROR: 저장 실패`);
        }
      } else {
        console.log(`ERROR: 추출 실패 또는 2024년 아님`);
      }
      
      // 요청 간 대기 (서버 부하 방지)
      if (i < found2024Posts.length - 1) {
        const waitTime = Math.random() * (1.5 - 0.8) + 0.8;
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
    
    this.printStats();
    return this.stats;
  }

  /**
   * 최근 포스트들 크롤링
   */
  async crawlRecentPosts(maxPages?: number, delayRange?: [number, number]): Promise<CrawlerStats> {
    const pages = maxPages || this.config.maxPages;
    const delay = delayRange || this.config.delayRange;
    
    console.log(`=== ${this.config.blogId} 블로그 크롤링 시작 ===`);
    console.log(`대상: 최근 ${pages} 페이지`);
    console.log(`요청 간격: ${delay[0]}-${delay[1]}초`);
    console.log('');
    
    const allPosts: Array<{log_no: string, url: string, title_preview: string}> = [];
    const seenLogNos = new Set<string>();
    
    // 페이지별로 포스트 목록 수집
    for (let page = 1; page <= pages; page++) {
      const pageProgress = Math.floor((page / pages) * 100);
      const pageBarLength = 20;
      const pageFilled = Math.floor(pageBarLength * page / pages);
      const pageBar = '#'.repeat(pageFilled) + '-'.repeat(pageBarLength - pageFilled);
      
      console.log(`[PAGE ${page}/${pages}] [${pageBar}] ${pageProgress}% - 포스트 목록 수집 중...`);
      
      const pagePosts = await this.getPostListFromPage(page);
      
      if (pagePosts.length === 0) {
        console.log(`페이지 ${page}에서 포스트를 찾을 수 없음. 크롤링 종료.`);
        break;
      }
      
      // 중복 제거 후 추가
      const newPosts = pagePosts.filter(post => !seenLogNos.has(post.log_no));
      newPosts.forEach(post => seenLogNos.add(post.log_no));
      
      console.log(`페이지 ${page}에서 ${pagePosts.length}개 포스트 발견, 새로운 포스트 ${newPosts.length}개`);
      allPosts.push(...newPosts);
      
      // 페이지 간 대기
      if (page < pages) {
        const waitTime = Math.random() * (delay[1] - delay[0]) + delay[0];
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
    
    this.stats.totalFound = allPosts.length;
    console.log(`\n총 고유 포스트 ${allPosts.length}개 발견`);
    console.log(`발견된 logNo 목록:`, allPosts.map(p => p.log_no));
    
    // 각 포스트 내용 추출 및 저장
    console.log('\n[EXTRACT] 포스트 내용 추출 및 저장 시작...');
    
    for (let i = 0; i < allPosts.length; i++) {
      const postInfo = allPosts[i];
      
      // 프로그레스 바 계산
      const progress = Math.floor(((i + 1) / allPosts.length) * 100);
      const barLength = 30;
      const filledLength = Math.floor(barLength * (i + 1) / allPosts.length);
      const bar = '#'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
      
      console.log(`\n[${i + 1}/${allPosts.length}] [${bar}] ${progress}%`);
      console.log(`처리 중: ${postInfo.title_preview}`);
      
      // 포스트 내용 추출
      const postData = await this.extractPostContent(postInfo.url);
      
      if (postData) {
        // DB에 저장
        const success = await this.savePostToDb(postData);
        
        if (success) {
          console.log(`SUCCESS: 저장 완료`);
        } else {
          console.log(`ERROR: 저장 실패`);
        }
      } else {
        console.log(`ERROR: 추출 실패`);
      }
      
      // 요청 간 대기 (서버 부하 방지)
      if (i < allPosts.length - 1) {
        const waitTime = Math.random() * (delay[1] - delay[0]) + delay[0];
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
    
    this.printStats();
    return this.stats;
  }

  /**
   * 크롤링 통계 출력
   */
  printStats(): void {
    console.log('\n' + '='.repeat(60));
    console.log('크롤링 완료 통계');
    console.log('='.repeat(60));
    console.log(`총 발견 포스트: ${this.stats.totalFound}개`);
    console.log(`새 포스트: ${this.stats.newPosts}개`);
    console.log(`업데이트 포스트: ${this.stats.updatedPosts}개`);
    console.log(`오류 발생: ${this.stats.errors}개`);
    console.log(`성공률: ${((this.stats.newPosts + this.stats.updatedPosts) / Math.max(this.stats.totalFound, 1) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
  }

  /**
   * 단일 포스트 크롤링 (API용)
   */
  async crawlSinglePost(logNo: string): Promise<PostData | null> {
    const postUrl = `https://m.blog.naver.com/${this.config.blogId}/${logNo}`;
    return this.extractPostContent(postUrl);
  }

  /**
   * 크롤링 통계 반환
   */
  getStats(): CrawlerStats {
    return { ...this.stats };
  }
}

export default BlogCrawler;