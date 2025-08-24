#!/usr/bin/env node

/**
 * 🤖 메르 블로그 크롤링 스크립트 (JavaScript 버전)
 * CLAUDE.md 준수: 크롤링만 자동화, 분석은 Claude 직접 수행
 */

const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class BlogCrawler {
    constructor() {
        this.config = {
            blogId: 'ranto28',
            maxPages: 10, // 최신 포스트 위주로 제한
            delayRange: [1000, 2000], // 1-2초 딜레이
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            baseUrl: 'https://blog.naver.com/ranto28'
        };
        
        this.stats = {
            totalFound: 0,
            newPosts: 0,
            updatedPosts: 0,
            errors: 0,
            skippedOld: 0
        };

        this.db = new sqlite3.Database(path.resolve(__dirname, '../database.db'));
    }

    /**
     * 최신 블로그 포스트 크롤링 (간단 버전)
     */
    async crawlLatestPosts() {
        console.log('🚀 메르 블로그 최신 포스트 크롤링 시작...');
        
        try {
            // 1. 메인 블로그 페이지에서 최신 포스트 목록 가져오기
            const response = await axios.get(this.config.baseUrl, {
                headers: {
                    'User-Agent': this.config.userAgent
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            
            // 네이버 블로그 구조에 따른 포스트 링크 추출 (개선된 방식)
            const postLinks = [];
            
            // 다양한 링크 패턴 확인
            $('a').each((i, elem) => {
                const href = $(elem).attr('href');
                if (href) {
                    // 네이버 블로그 포스트 URL 패턴들
                    const patterns = [
                        /ranto28.*PostView/,
                        /ranto28.*logNo=/,
                        /blog\.naver\.com\/ranto28/,
                        /PostView.*ranto28/
                    ];
                    
                    if (patterns.some(pattern => pattern.test(href))) {
                        const fullUrl = href.startsWith('http') ? href : `https://blog.naver.com${href}`;
                        if (!postLinks.includes(fullUrl)) {
                            postLinks.push(fullUrl);
                        }
                    }
                }
            });

            console.log(`📊 발견된 포스트 링크: ${postLinks.length}개`);
            this.stats.totalFound = postLinks.length;

            // 2. 최신 포스트 몇 개만 크롤링 (시간 절약)
            const latestPosts = postLinks.slice(0, Math.min(5, postLinks.length));
            
            for (const link of latestPosts) {
                try {
                    await this.crawlSinglePost(link);
                    
                    // 딜레이 추가 (네이버 서버 보호)
                    const delay = Math.random() * (this.config.delayRange[1] - this.config.delayRange[0]) + this.config.delayRange[0];
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                } catch (error) {
                    console.warn(`⚠️ 포스트 크롤링 실패: ${link}`, error.message);
                    this.stats.errors++;
                }
            }

            console.log('✅ 크롤링 완료:', this.stats);
            return this.stats;

        } catch (error) {
            console.error('❌ 크롤링 오류:', error.message);
            this.stats.errors++;
            throw error;
        } finally {
            this.db.close();
        }
    }

    /**
     * 개별 포스트 크롤링 및 저장
     */
    async crawlSinglePost(postUrl) {
        try {
            const response = await axios.get(postUrl, {
                headers: {
                    'User-Agent': this.config.userAgent
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            
            // 포스트 정보 추출 (간단 버전)
            const title = $('title').text().trim() || '제목 없음';
            const content = $('body').text().substring(0, 1000); // 첫 1000자만
            const postId = this.extractPostId(postUrl);

            if (!postId) {
                console.warn('⚠️ 포스트 ID 추출 실패:', postUrl);
                return;
            }

            // 데이터베이스에 저장
            await this.savePost({
                log_no: postId,
                title: title.replace(/\s+/g, ' ').trim(),
                content: content.replace(/\s+/g, ' ').trim(),
                url: postUrl,
                created_date: Date.now(), // 현재 시간으로 설정 (실제 날짜 추출은 복잡)
                crawled_at: Date.now()
            });

            console.log(`✅ 포스트 저장: ${title.substring(0, 50)}...`);

        } catch (error) {
            console.error('❌ 개별 포스트 크롤링 오류:', error.message);
            throw error;
        }
    }

    /**
     * URL에서 포스트 ID 추출
     */
    extractPostId(url) {
        const match = url.match(/logNo=(\d+)/);
        return match ? match[1] : null;
    }

    /**
     * 데이터베이스에 포스트 저장
     */
    async savePost(postData) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO blog_posts (
                    log_no, title, content, url, created_date, 
                    updated_at, crawled_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                postData.log_no,
                postData.title,
                postData.content,
                postData.url,
                postData.created_date,
                Date.now(),
                postData.crawled_at
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
}

// 스크립트 직접 실행시
async function main() {
    try {
        console.log('🤖 메르 블로그 자동 크롤링 시작...');
        
        const crawler = new BlogCrawler();
        const stats = await crawler.crawlLatestPosts();
        
        console.log('🎉 크롤링 성공 완료');
        console.log('📊 최종 통계:', stats);
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 크롤링 실패:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { BlogCrawler };