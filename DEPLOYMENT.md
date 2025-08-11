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
# 포트 8080에서 실행
npm start -- -p 8080

# 또는 포트 80에서 실행 (sudo 필요)
sudo npm start -- -p 80
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

- 포트 8080: `http://[EC2-PUBLIC-IP]:8080`
- 포트 80: `http://[EC2-PUBLIC-IP]`

### 백그라운드 실행 (선택사항)

```bash
# PM2로 백그라운드 실행
npm install -g pm2
pm2 start npm --name "meire-blog" -- start -- -p 8080
pm2 save
pm2 startup
```

## 🛠️ 문제 해결

### 권한 에러 발생 시
```bash
sudo chown -R ubuntu:ubuntu /home/ubuntu/meire-blog-platform/
chmod -R 755 /home/ubuntu/meire-blog-platform/
```

### 포트가 이미 사용 중인 경우
```bash
# 사용 중인 프로세스 확인
sudo netstat -tlnp | grep :8080
sudo kill [PID]
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

## 🔄 업데이트 방법

새로운 코드가 있을 때:

```bash
# 로컬에서 빌드 후 GitHub에 업로드
npm run build
git add .next -f
git commit -m "Update build"
git push

# EC2에서 업데이트
cd /home/ubuntu/meire-blog-platform
git pull
rm -rf .next
wget https://github.com/johnn8n/meire-blog-platform/raw/main/nextjs-build.zip -O ../nextjs-build.zip
unzip -o ../nextjs-build.zip
chmod -R 755 .next/
pm2 restart meire-blog
```