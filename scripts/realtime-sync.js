#!/usr/bin/env node
/**
 * 실시간 웹훅 방식 동기화
 * 로컬에서 크롤링하면 즉시 EC2로 전송
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class RealtimeSync {
  constructor(ec2Endpoint) {
    this.ec2Endpoint = ec2Endpoint || process.env.EC2_ENDPOINT;
    this.syncQueue = [];
    this.isProcessing = false;
  }

  // 단일 포스트 즉시 동기화
  async syncPost(post) {
    try {
      console.log(`🔄 실시간 동기화: ${post.title?.substring(0, 30)}...`);
      
      const response = await axios.post(`${this.ec2Endpoint}/api/merry/sync`, {
        posts: [post],
        batchId: `realtime-${Date.now()}`
      }, {
        timeout: 10000
      });

      if (response.data.success) {
        console.log('✅ 동기화 성공');
        return true;
      } else {
        console.error('❌ 동기화 실패:', response.data.error?.message);
        return false;
      }
    } catch (error) {
      console.error('❌ 동기화 오류:', error.message);
      
      // 실패 시 큐에 추가 (나중에 재시도)
      this.syncQueue.push(post);
      return false;
    }
  }

  // 실패한 동기화 재시도
  async retryFailed() {
    if (this.syncQueue.length === 0 || this.isProcessing) return;
    
    this.isProcessing = true;
    console.log(`🔄 실패한 ${this.syncQueue.length}개 포스트 재시도 중...`);
    
    const failed = [];
    for (const post of this.syncQueue) {
      const success = await this.syncPost(post);
      if (!success) {
        failed.push(post);
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
    }
    
    this.syncQueue = failed;
    this.isProcessing = false;
    
    if (failed.length > 0) {
      console.log(`⚠️ ${failed.length}개 포스트 재시도 실패`);
    }
  }

  // 크롤러에서 호출할 함수
  async onNewPost(post) {
    const success = await this.syncPost(post);
    
    // 10초 후 재시도 (실패한 경우)
    if (!success) {
      setTimeout(() => this.retryFailed(), 10000);
    }
    
    return success;
  }
}

module.exports = RealtimeSync;