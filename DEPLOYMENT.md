# Meire Blog Platform - EC2 배포 가이드

## 🚀 한 번에 실행하기 (권장)

```bash
# EC2에서 한 번의 명령어로 배포 완료
cd /home/ubuntu/meire-blog-platform
git pull origin main
chmod +x scripts/start-server.sh
./scripts/start-server.sh
```

## 📋 배포 단계

### 1. 프로젝트 클론
```bash
cd /home/ubuntu
git clone https://github.com/yohan4477/meire-blog-platform.git
cd meire-blog-platform
```

### 2. 빌드 파일 다운로드
```bash
cd /home/ubuntu
wget https://github.com/yohan4477/meire-blog-platform/raw/main/nextjs-build.zip
cd meire-blog-platform
unzip -o ../nextjs-build.zip
chmod -R 755 .next/
```

### 3. 의존성 설치 및 서버 실행
```bash
npm install
./scripts/start-server.sh
```

## 🌐 접속 확인

### 현재 IP 확인 (중요!)
```bash
curl http://checkip.amazonaws.com/
```

**⚠️ EC2 재시작 시 IP가 변경됩니다!**

접속 주소: `http://[현재-IP]` (포트 번호 없음)

## 🛠 서버 관리

### 기본 명령어
```bash
# 서버 상태 확인
screen -ls

# 서버 로그 보기
screen -r meire-blog

# 서버 중지
screen -S meire-blog -X quit

# 서버 재시작
./scripts/start-server.sh
```

## 🔧 문제 해결

### 외부 접속이 안 될 때
1. `curl http://checkip.amazonaws.com/` - 현재 IP 확인
2. 새 IP로 브라우저 접속
3. `curl http://localhost` - 내부 접속 테스트
4. AWS 보안 그룹에서 포트 80 허용 확인

### 포트 사용 중 에러
```bash
sudo fuser -k 80/tcp
./scripts/start-server.sh
```

### 빌드 파일 없음 에러
```bash
cd /home/ubuntu
wget https://github.com/yohan4477/meire-blog-platform/raw/main/nextjs-build.zip
cd meire-blog-platform
unzip -o ../nextjs-build.zip
chmod -R 755 .next/
```

---

**완료!** 터미널을 꺼도 서버가 계속 실행됩니다.