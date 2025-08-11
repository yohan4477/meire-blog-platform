#!/bin/bash

# PM2로 백그라운드 배포 스크립트
# 브라우저를 꺼도 서버가 계속 실행됩니다

set -e

echo "🚀 Meire Blog Platform PM2 백그라운드 배포..."

# 기본 배포 과정
cd /home/ubuntu
rm -rf meire-blog-platform
git clone https://github.com/johnn8n/meire-blog-platform.git
cd meire-blog-platform

wget https://github.com/johnn8n/meire-blog-platform/raw/main/nextjs-build.zip -O ../nextjs-build.zip
unzip -o ../nextjs-build.zip
chmod -R 755 .next/
rm -f /home/ubuntu/package-lock.json
npm install

# PM2 설치 (없다면)
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 설치 중..."
    npm install -g pm2
fi

# 기존 PM2 프로세스 중단 (있다면)
pm2 delete meire-blog 2>/dev/null || true

# PM2로 백그라운드 실행
echo "🌐 PM2로 백그라운드 서버 실행..."
pm2 start npm --name "meire-blog" -- start -- -p 8080

# PM2 설정 저장
pm2 save

# 시스템 부팅 시 자동 시작 설정
pm2 startup

echo "✅ 배포 완료!"
echo "📍 접속 주소: http://$(curl -s http://checkip.amazonaws.com):8080"
echo ""
echo "📊 서버 상태 확인: pm2 status"
echo "📋 로그 확인: pm2 logs meire-blog"
echo "🔄 서버 재시작: pm2 restart meire-blog"
echo "🛑 서버 중단: pm2 stop meire-blog"
echo ""
echo "✨ 브라우저를 꺼도 서버가 계속 실행됩니다!"