#!/usr/bin/env node
/**
 * 스마트 동기화 - 상황에 따라 최적 방법 선택
 */

const EC2Syncer = require('./sync-to-ec2');
const axios = require('axios');

class SmartSync {
  constructor() {
    this.ec2Endpoint = process.env.EC2_ENDPOINT || 'http://your-ec2-domain.com';
  }

  async getEC2Status() {
    try {
      const response = await axios.get(`${this.ec2Endpoint}/api/merry/sync`, {
        timeout: 5000
      });
      return response.data.data;
    } catch (error) {
      console.error('EC2 상태 확인 실패:', error.message);
      return null;
    }
  }

  async autoSync() {
    console.log('🧠 스마트 동기화 시작...\n');

    // EC2 상태 확인
    const ec2Status = await this.getEC2Status();
    
    if (!ec2Status) {
      console.log('❌ EC2에 연결할 수 없습니다. 나중에 다시 시도하세요.');
      return false;
    }

    console.log(`📊 EC2 현재 상태:`);
    console.log(`   총 포스트: ${ec2Status.total_posts}개`);
    console.log(`   최근 7일: ${ec2Status.recent_posts}개`);
    console.log(`   마지막 동기화: ${ec2Status.last_sync || '없음'}\n`);

    // 동기화 전략 결정
    let hours = 24; // 기본값

    if (!ec2Status.last_sync) {
      // 첫 동기화 - 전체 데이터
      console.log('🔄 첫 동기화 감지 - 전체 데이터 동기화');
      hours = 8760; // 1년
    } else {
      // 마지막 동기화 시간 계산
      const lastSync = new Date(ec2Status.last_sync);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync > 24) {
        console.log('🔄 오래된 동기화 감지 - 48시간 데이터 동기화');
        hours = 48;
      } else if (hoursSinceSync > 6) {
        console.log('🔄 정기 동기화 - 24시간 데이터 동기화');
        hours = 24;
      } else {
        console.log('🔄 빠른 동기화 - 6시간 데이터 동기화');
        hours = 6;
      }
    }

    // 동기화 실행
    const syncer = new EC2Syncer();
    return await syncer.sync(hours);
  }
}

// 메인 실행
async function main() {
  const smartSync = new SmartSync();
  const success = await smartSync.autoSync();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SmartSync;