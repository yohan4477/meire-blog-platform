#!/bin/bash

# Meire Blog Platform - 자동 배포 스크립트
# EC2에서 실행하세요

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 Meire Blog Platform 배포 시작..."

# 1. 기존 프로젝트 제거 및 새로 클론
echo "📁 프로젝트 클론 중..."
cd /home/ubuntu
rm -rf meire-blog-platform
git clone https://github.com/johnn8n/meire-blog-platform.git
cd meire-blog-platform

# 2. 빌드 파일 다운로드
echo "📦 빌드 파일 다운로드 중..."
cd /home/ubuntu
wget https://github.com/johnn8n/meire-blog-platform/raw/main/nextjs-build.zip -O nextjs-build.zip
cd meire-blog-platform
unzip -o ../nextjs-build.zip

# 3. 권한 설정
echo "🔐 권한 설정 중..."
chmod -R 755 .next/
sudo chown -R ubuntu:ubuntu /home/ubuntu/meire-blog-platform/

# 4. lockfile 충돌 해결
echo "🔧 설정 정리 중..."
rm -f /home/ubuntu/package-lock.json

# 5. 의존성 설치
echo "📚 의존성 설치 중..."
npm install

# 6. 서버 실행
echo "🌐 서버 실행 중..."
echo "포트 8080에서 실행됩니다."
echo "접속 주소: http://$(curl -s http://checkip.amazonaws.com):8080"
echo ""
echo "백그라운드 실행을 원한다면 Ctrl+C 후 다음 명령어를 실행하세요:"
echo "pm2 start npm --name 'meire-blog' -- start -- -p 8080"
echo ""

npm start -- -p 8080