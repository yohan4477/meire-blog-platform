#!/bin/bash
# EC2 배포용 데이터베이스 다운로드 스크립트

echo "=== 메르 블로그 데이터베이스 배포 ==="

# S3에서 최신 데이터베이스 다운로드
echo "S3에서 데이터베이스 다운로드 중..."
aws s3 cp s3://your-bucket-name/production/database.db ./database.db

# 파일 존재 확인
if [ -f "database.db" ]; then
    # 파일 크기 확인
    SIZE=$(du -h database.db | cut -f1)
    echo "✅ 데이터베이스 다운로드 완료 (크기: $SIZE)"
    
    # 포스트 수 확인 (간단한 검증)
    POSTS=$(sqlite3 database.db "SELECT COUNT(*) FROM blog_posts;")
    echo "📊 총 포스트 수: $POSTS개"
    
    echo "🚀 서비스 시작 준비 완료!"
else
    echo "❌ 데이터베이스 다운로드 실패"
    exit 1
fi