#!/bin/bash

# Meire Blog Platform - Production Server Startup Script
# 이 스크립트를 실행하면 모든 설정이 자동으로 완료됩니다.

echo "🚀 Meire Blog Platform 서버 시작 스크립트"
echo "========================================="

# 1. 프로젝트 디렉토리로 이동
cd /home/ubuntu/meire-blog-platform

echo "📁 프로젝트 디렉토리: $(pwd)"

# 2. 의존성 설치
echo "📦 의존성 설치 중..."
npm install

# 3. 기존 screen 세션 정리
echo "🧹 기존 서버 프로세스 정리 중..."
screen -S meire-blog -X quit 2>/dev/null || true

# 4. 포트 확인 및 정리
echo "🔍 포트 3000 사용 프로세스 확인 중..."
EXISTING_PID=$(sudo lsof -t -i:3000 2>/dev/null)
if [ ! -z "$EXISTING_PID" ]; then
    echo "⚠️  포트 3000이 사용 중입니다. 프로세스 종료 중... (PID: $EXISTING_PID)"
    sudo kill -9 $EXISTING_PID 2>/dev/null || true
    sleep 2
fi

# 5. 퍼블릭 IP 확인
echo "🌐 퍼블릭 IP 주소 확인 중..."
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ || curl -s http://ipv4.icanhazip.com/)
if [ ! -z "$PUBLIC_IP" ]; then
    echo "✅ 현재 퍼블릭 IP: $PUBLIC_IP"
    echo "⚠️  재시작 시 IP가 변경될 수 있습니다!"
    echo "🔧 IP 확인 명령어: curl http://checkip.amazonaws.com/"
else
    echo "⚠️  퍼블릭 IP를 자동으로 확인할 수 없습니다."
    echo "🔧 수동 확인: curl http://checkip.amazonaws.com/"
fi

# 6. 방화벽 설정 확인
echo "🔥 방화벽 설정 확인 중..."
sudo ufw allow 3000 2>/dev/null || true

# 7. Screen으로 서버 시작
echo "🖥️  Screen 세션에서 서버 시작 중..."
screen -dmS meire-blog bash -c "cd /home/ubuntu/meire-blog-platform && HOST=0.0.0.0 npm start -- --hostname 0.0.0.0"

# 8. 서버 시작 확인
echo "⏳ 서버 시작 대기 중..."
sleep 5

# 9. 서버 상태 확인
echo "🔍 서버 상태 확인 중..."
if sudo netstat -tlnp | grep -q ":3000"; then
    BIND_INFO=$(sudo netstat -tlnp | grep ":3000")
    echo "✅ 서버가 성공적으로 시작되었습니다!"
    echo "📊 바인딩 정보: $BIND_INFO"
    
    # IPv4 바인딩 확인
    if echo "$BIND_INFO" | grep -q "0.0.0.0:3000"; then
        echo "✅ IPv4로 올바르게 바인딩되었습니다."
    elif echo "$BIND_INFO" | grep -q ":::3000"; then
        echo "⚠️  IPv6로 바인딩되었습니다. 일부 브라우저에서 접속 문제가 있을 수 있습니다."
    fi
    
    # 내부 접속 테스트
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ 내부 접속 테스트 성공"
    else
        echo "❌ 내부 접속 테스트 실패"
    fi
else
    echo "❌ 서버 시작에 실패했습니다."
    echo "🔍 로그를 확인하세요: screen -r meire-blog"
    exit 1
fi

echo ""
echo "========================================="
echo "🎉 서버 시작 완료!"
echo ""
if [ ! -z "$PUBLIC_IP" ]; then
    echo "🌍 브라우저에서 접속하세요: http://$PUBLIC_IP"
    echo "⚠️  IP 변경 시: curl http://checkip.amazonaws.com/ 으로 새 IP 확인"
else
    echo "🌍 브라우저에서 접속하세요: http://[EC2-PUBLIC-IP]"
fi
echo ""
echo "📋 유용한 명령어:"
echo "  - 서버 로그 보기: screen -r meire-blog"
echo "  - Screen에서 나가기: Ctrl+A, D"
echo "  - 서버 중지: screen -S meire-blog -X quit"
echo "  - 서버 재시작: $0"
echo "========================================="