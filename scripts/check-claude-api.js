#!/usr/bin/env node

/**
 * Claude AI API 연결 테스트 스크립트
 * 실제 API 키가 설정되어 있는지 확인하고 간단한 테스트 수행
 */

require('dotenv').config();

async function testClaudeAPI() {
  console.log('🔍 Claude AI API 연결 테스트 시작...');
  
  const apiKey = process.env.CLAUDE_API_KEY;
  
  if (!apiKey || apiKey === 'demo-mode-placeholder') {
    console.log('❌ Claude AI API 키가 설정되지 않았습니다.');
    console.log('💡 .env.local 파일에 실제 Claude API 키를 설정해주세요:');
    console.log('   CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here');
    process.exit(1);
  }
  
  console.log('✅ Claude API 키 확인됨');
  console.log(`🔑 키 시작부분: ${apiKey.substring(0, 20)}...`);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: '안녕하세요! 간단한 연결 테스트입니다. "연결 성공"이라고 답변해주세요.'
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Claude AI API 연결 성공!');
    console.log('📝 테스트 응답:', data.content[0].text);
    
    return true;
  } catch (error) {
    console.error('❌ Claude AI API 연결 실패:', error.message);
    console.log('💡 API 키를 확인하거나 네트워크 연결을 점검해주세요.');
    return false;
  }
}

// 스크립트 실행
if (require.main === module) {
  testClaudeAPI().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testClaudeAPI };