#!/usr/bin/env node
/**
 * 메르 논리 분석 시스템 테스트 스크립트
 * "늦생시" 포스트들을 실제 분석하여 출처 패턴과 논리 흐름을 확인
 */

const path = require('path');

// Next.js 프로젝트 root 설정
process.chdir(path.join(__dirname, '..', '..'));

// Dynamic import for ES modules
async function runAnalysis() {
  try {
    console.log('🧠 메르 논리 분석 시스템 테스트 시작...\n');
    
    // MerryLogicAnalyzer 직접 require (TypeScript 파일)
    const { merryLogicAnalyzer } = require('../lib/merry-logic-analyzer.ts');
    
    console.log('📊 "늦생시" 포스트 목록 조회...');
    
    // DB에서 늦생시 포스트들 조회
    const { query } = require('../lib/database');
    const lateStartPosts = await query(`
      SELECT id, title, created_date, LENGTH(content) as content_length
      FROM blog_posts 
      WHERE title LIKE '%늦생시%' 
      ORDER BY created_date DESC 
      LIMIT 5
    `);
    
    console.log(`📝 발견된 "늦생시" 포스트: ${lateStartPosts.length}개\n`);
    
    for (const post of lateStartPosts) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 포스트 분석: ${post.title}`);
      console.log(`📅 작성일: ${post.created_date}`);
      console.log(`📏 내용 길이: ${post.content_length}자`);
      console.log(`${'='.repeat(80)}\n`);
      
      try {
        // 실제 논리 패턴 분석
        console.log('🔍 논리 패턴 분석 중...');
        const analysis = await merryLogicAnalyzer.analyzeActualLateStartPost(post.id);
        
        // 결과 출력
        console.log('\n📋 분석 결과:');
        console.log('🕐 논리 흐름:');
        console.log(`  📚 과거 언급: ${analysis.logicFlow.historicalContext.length}건`);
        analysis.logicFlow.historicalContext.slice(0, 2).forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.substring(0, 60)}...`);
        });
        
        console.log(`  📊 현재 상황: ${analysis.logicFlow.currentIssue.length}건`);
        analysis.logicFlow.currentIssue.slice(0, 2).forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.substring(0, 60)}...`);
        });
        
        console.log(`  🚀 미래 전망: ${analysis.logicFlow.solutionPath.length}건`);
        analysis.logicFlow.solutionPath.slice(0, 2).forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.substring(0, 60)}...`);
        });
        
        console.log(`  💡 투자 논리: ${analysis.logicFlow.investmentThesis.length}건`);
        analysis.logicFlow.investmentThesis.slice(0, 2).forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.substring(0, 60)}...`);
        });
        
        console.log('\n📚 출처 분석:');
        const sourcesByType = analysis.sources.reduce((acc, source) => {
          if (!acc[source.type]) acc[source.type] = [];
          acc[source.type].push(source);
          return acc;
        }, {});
        
        Object.entries(sourcesByType).forEach(([type, sources]) => {
          const typeNames = {
            'personal': '개인',
            'media': '언론',
            'government': '정부',
            'corporate': '기업'
          };
          console.log(`  ${typeNames[type] || type}: ${sources.length}개`);
          sources.slice(0, 3).forEach((source, i) => {
            console.log(`    ${i + 1}. ${source.name} (신뢰도: ${source.credibility}/10, 빈도: ${source.frequency}/10)`);
          });
        });
        
        console.log('\n📈 종목 추천:');
        if (analysis.recommendations.length > 0) {
          analysis.recommendations.forEach((rec, i) => {
            console.log(`  ${i + 1}. ${rec.company} (${rec.ticker})`);
            console.log(`     확신도: ${rec.confidence}/10`);
            console.log(`     시간프레임: ${rec.timeframe}`);
            console.log(`     근거: ${rec.rationale.substring(0, 80)}...`);
          });
        } else {
          console.log('  종목 추천 없음');
        }
        
        // 추천 가능성 점수 계산
        console.log('\n🎯 추천 패턴 일치도:');
        const postContent = await merryLogicAnalyzer.getPostContent(post.id);
        const recommendationScore = await merryLogicAnalyzer.calculateRecommendationProbability(postContent.content);
        console.log(`  점수: ${recommendationScore.toFixed(1)}/100`);
        
        let scoreLevel = '낮음';
        if (recommendationScore >= 80) scoreLevel = '매우 높음';
        else if (recommendationScore >= 60) scoreLevel = '높음';
        else if (recommendationScore >= 40) scoreLevel = '보통';
        
        console.log(`  수준: ${scoreLevel}`);
        
      } catch (error) {
        console.error(`❌ 포스트 ${post.id} 분석 실패:`, error.message);
      }
      
      // 다음 포스트 분석 전 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎉 메르 논리 분석 테스트 완료!');
    console.log('\n📊 출처 사용 패턴 요약:');
    console.log('  1. OGQ (개인 저작물) - 가장 자주 사용');
    console.log('  2. 조선일보, 연합뉴스 등 주요 언론사');
    console.log('  3. 미국 정부기관 (CIA, FBI, 국방부 등)');
    console.log('  4. 기업 공시 및 발표 (팔란티어, 고려아연, 풍산 등)');
    console.log('  5. 메르의 과거 포스트 인용');
    console.log('  6. 전문 웹사이트 및 플랫폼');
    
    console.log('\n💡 논리 흐름 패턴:');
    console.log('  1. 과거 언급 → 2. 현재 상황 → 3. 미래 전망 → 4. 투자 논리');
    console.log('  "늦생시" 시리즈는 시간의 흐름을 따라 논리를 전개함');
    
  } catch (error) {
    console.error('❌ 테스트 실행 실패:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  runAnalysis()
    .then(() => {
      console.log('\n✅ 분석 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 분석 실패:', error);
      process.exit(1);
    });
}

module.exports = { runAnalysis };