# Meire Blog Platform - EC2 배포 가이드

## 🚀 EC2에서 Next.js 앱 배포하기

### 전제 조건
- AWS EC2 인스턴스 (Ubuntu)
- Node.js 설치됨
- Git 설치됨
- AWS 보안 그룹에서 필요한 포트 열려있음

### 1단계: 프로젝트 클론 및 설정

```bash
# EC2에서 실행
cd /home/ubuntu

# 기존 프로젝트 제거 (있다면)
rm -rf meire-blog-platform

# GitHub에서 프로젝트 클론
git clone https://github.com/johnn8n/meire-blog-platform.git
cd meire-blog-platform
```

### 2단계: 빌드 파일 다운로드

```bash
# GitHub에서 미리 빌드된 Next.js 파일 다운로드
cd /home/ubuntu
wget https://github.com/johnn8n/meire-blog-platform/raw/main/nextjs-build.zip

# 프로젝트 폴더로 이동
cd meire-blog-platform

# 빌드 파일 압축 해제
unzip -o ../nextjs-build.zip

# 권한 설정
chmod -R 755 .next/
```

### 3단계: 의존성 설치

```bash
# Node.js 의존성 설치
npm install

# lockfile 충돌 해결 (있다면)
rm /home/ubuntu/package-lock.json
```

### 4단계: 서버 실행

```bash
# ⚠️ 중요: Next.js IPv6 바인딩 문제 해결을 위해 반드시 IPv4로 명시

# 방법 1: 환경변수로 IPv4 바인딩 (권장)
HOST=0.0.0.0 npm start -- --hostname 0.0.0.0

# 방법 2: Next.js 설정으로 IPv4 바인딩
npm start -- --hostname 0.0.0.0 --port 3000

# 포트 80에서 실행 (sudo 필요)
sudo HOST=0.0.0.0 npm start -- --hostname 0.0.0.0 --port 80
```

### 4-1단계: 백그라운드 실행 (터미널 종료 후에도 계속 실행)

```bash
# screen 사용 (권장 방법)
screen -S meire-blog
cd /home/ubuntu/meire-blog-platform
HOST=0.0.0.0 npm start -- --hostname 0.0.0.0

# 서버 시작 후 Ctrl+A, D로 detach
# 나중에 재연결: screen -r meire-blog

# 또는 nohup 사용
nohup HOST=0.0.0.0 npm start -- --hostname 0.0.0.0 > server.log 2>&1 &
```

### 5단계: AWS 보안 그룹 설정

1. AWS Console → EC2 → Security Groups
2. 해당 보안 그룹 선택
3. Inbound rules → Edit inbound rules
4. Add rule:
   - Type: Custom TCP
   - Port: 8080 (또는 80)
   - Source: 0.0.0.0/0

### 6단계: 접속 확인

- 포트 3000: `http://[EC2-PUBLIC-IP]:3000` (예: http://13.209.18.57:3000)
- 포트 8080: `http://[EC2-PUBLIC-IP]:8080`
- 포트 80: `http://[EC2-PUBLIC-IP]`

**⚠️ 중요**: AWS 콘솔에서 실제 퍼블릭 IP 주소를 확인하세요!

### 백그라운드 실행 (선택사항)

```bash
# PM2로 백그라운드 실행
npm install -g pm2
pm2 start npm --name "meire-blog" -- start -- -p 8080
pm2 save
pm2 startup
```

## 🛠️ 문제 해결

### 외부 접속이 안 될 때
1. **퍼블릭 IP 확인**: AWS 콘솔에서 실제 퍼블릭 IPv4 주소 확인
2. **IPv4 바인딩 확인**: `sudo netstat -tlnp | grep :3000` 결과가 `0.0.0.0:3000`인지 확인
   - `:::3000` (IPv6)이면 브라우저 접속 불가 → `--hostname 0.0.0.0` 추가 필요
3. **올바른 실행 명령어**: `HOST=0.0.0.0 npm start -- --hostname 0.0.0.0`
4. **보안 그룹**: 해당 포트가 0.0.0.0/0으로 열려있는지 확인
5. **ufw 방화벽**: `sudo ufw allow [포트번호]`
6. **내부 테스트**: `curl http://localhost:3000` (HTML이 나와야 함)
7. **간단 네트워크 테스트**: `python3 -m http.server 3000` 으로 기본 연결 확인

### 일반적인 문제와 해결책
- **IPv6 바인딩 문제**: `:::3000` → `--hostname 0.0.0.0` 추가
- **브라우저 캐시**: Ctrl+Shift+R 강제 새로고침 또는 시크릿 모드
- **잘못된 IP**: 실제 퍼블릭 IP와 접속 IP가 다름
- **screen 중복**: `screen -ls`로 확인 후 `screen -d [ID]`로 detach

### 권한 에러 발생 시
```bash
sudo chown -R ubuntu:ubuntu /home/ubuntu/meire-blog-platform/
chmod -R 755 /home/ubuntu/meire-blog-platform/
```

### 포트가 이미 사용 중인 경우
```bash
# 사용 중인 프로세스 확인
sudo netstat -tlnp | grep :3000
sudo kill [PID]

# Nginx가 실행 중이라면
sudo systemctl stop nginx
```

### TypeScript 에러 발생 시
```bash
npm install typescript --save-dev
```

## 📝 주의사항

1. EC2 t2.micro에서는 빌드 시간이 오래 걸리므로 미리 빌드된 파일 사용
2. Next.js는 서버 사이드 렌더링을 하므로 정적 파일 서버로는 실행 불가
3. API 라우트가 있으므로 Node.js 서버가 필요
4. 보안 그룹 설정 없이는 외부 접속 불가

## 🚀 한 번에 실행하기 (권장)

**자동화 스크립트 사용**:
```bash
# EC2에서 한 번에 모든 설정 완료
cd /home/ubuntu/meire-blog-platform
chmod +x scripts/start-server.sh
./scripts/start-server.sh
```

이 스크립트가 자동으로 처리하는 것들:
- 의존성 설치
- 기존 프로세스 정리  
- 퍼블릭 IP 확인
- 방화벽 설정
- IPv4로 서버 시작
- 접속 상태 확인

## 🔄 업데이트 방법

새로운 코드가 있을 때:

```bash
# 1. EC2에서 코드 업데이트
cd /home/ubuntu/meire-blog-platform
git pull

# 2. 새 빌드 파일 다운로드 (필요한 경우)
wget https://github.com/yohan4477/meire-blog-platform/raw/main/nextjs-build.zip -O ../nextjs-build.zip
unzip -o ../nextjs-build.zip
chmod -R 755 .next/

# 3. 서버 재시작
./scripts/start-server.sh
```