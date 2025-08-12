#!/bin/bash
# SQLite 데이터베이스 S3 백업 스크립트

# 변수 설정
DB_PATH="/app/database.db"
S3_BUCKET="your-bucket-name"
BACKUP_NAME="database-backup-$(date +%Y%m%d-%H%M%S).db"

# SQLite 백업 생성 (무결성 보장)
sqlite3 $DB_PATH ".backup /tmp/backup.db"

# S3에 업로드
aws s3 cp /tmp/backup.db s3://$S3_BUCKET/backups/$BACKUP_NAME

# 로컬 임시 파일 삭제
rm /tmp/backup.db

echo "백업 완료: s3://$S3_BUCKET/backups/$BACKUP_NAME"