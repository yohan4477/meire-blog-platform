#!/bin/bash
# 로컬에서 완성된 데이터베이스를 S3에 업로드

echo "=== 메르 블로그 데이터베이스 S3 업로드 ==="

DB_FILE="database.db"
S3_BUCKET="your-bucket-name"

# 파일 존재 확인
if [ ! -f "$DB_FILE" ]; then
    echo "❌ $DB_FILE 파일이 없습니다."
    exit 1
fi

# 파일 정보 출력
SIZE=$(du -h $DB_FILE | cut -f1)
POSTS=$(sqlite3 $DB_FILE "SELECT COUNT(*) FROM blog_posts;")
echo "📊 업로드할 데이터: 크기 $SIZE, 포스트 $POSTS개"

# S3 업로드 (프로덕션용)
echo "S3에 업로드 중..."
aws s3 cp $DB_FILE s3://$S3_BUCKET/production/database.db

# 백업도 생성
BACKUP_NAME="database-$(date +%Y%m%d-%H%M%S).db"
aws s3 cp $DB_FILE s3://$S3_BUCKET/backups/$BACKUP_NAME

echo "✅ 업로드 완료!"
echo "   프로덕션: s3://$S3_BUCKET/production/database.db"
echo "   백업: s3://$S3_BUCKET/backups/$BACKUP_NAME"