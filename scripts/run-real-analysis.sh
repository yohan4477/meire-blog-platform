#!/bin/bash

# 실제 Claude AI 감정분석 실행 스크립트
# API 키 설정 후 이 스크립트 실행

echo "🚀 실제 Claude AI 감정분석 시작..."

# 1. API 키 확인
echo "1️⃣ Claude AI API 연결 테스트..."
node scripts/check-claude-api.js
if [ $? -ne 0 ]; then
    echo "❌ API 키 설정이 필요합니다!"
    exit 1
fi

# 2. 기존 더미 데이터 삭제 확인
echo "2️⃣ 기존 데이터 정리 확인..."
sqlite3 database.db "SELECT COUNT(*) as count FROM post_stock_sentiments_claude;" | head -1

# 3. 실제 감정분석 실행
echo "3️⃣ 6개월치 포스트 Claude AI 분석 실행..."
node scripts/analyze-claude-sentiment-6months.js

# 4. 결과 확인
echo "4️⃣ 분석 결과 확인..."
sqlite3 database.db "SELECT ticker, sentiment, confidence, key_reasoning FROM post_stock_sentiments_claude LIMIT 5;"

# 5. API 응답 테스트
echo "5️⃣ API 응답 테스트..."
curl -s "http://localhost:3005/api/merry/stocks/TSLA/sentiments?period=6mo" | head -10

echo "✅ 실제 감정분석 완료!"