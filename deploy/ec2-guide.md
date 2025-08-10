# 🚀 AWS EC2 배포 가이드

## 1단계: EC2 인스턴스 생성

### AWS 계정 설정
1. [AWS 콘솔](https://aws.amazon.com/console/) 로그인
2. 서울 리전 (ap-northeast-2) 선택

### EC2 인스턴스 설정
```
인스턴스 타입: t2.micro (프리티어)
운영체제: Ubuntu Server 22.04 LTS
스토리지: 8GB (프리티어 기본값)
키 페어: meire-blog-key (새로 생성)
```

### 보안 그룹 설정
```
SSH (22): 내 IP만 허용
HTTP (80): 모든 곳 (0.0.0.0/0)
HTTPS (443): 모든 곳 (0.0.0.0/0)  
Custom TCP (3000): 모든 곳 (0.0.0.0/0) - 개발용
```

## 2단계: 서버 접속 및 기본 설정

### SSH 접속
```cmd
REM 배치 파일로 간편 접속
deploy\ssh-connect.bat YOUR_EC2_PUBLIC_IP

REM 또는 직접 명령어
ssh -i "C:\Users\c3dyg\Meire\meire.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

### 서버 설정 스크립트 업로드 및 실행
```cmd
REM 로컬에서 파일 업로드 (배치 파일 사용)
deploy\upload-files.bat YOUR_EC2_PUBLIC_IP

REM 또는 직접 업로드
scp -i "C:\Users\c3dyg\Meire\meire.pem" deploy/server-setup.sh ubuntu@YOUR_EC2_PUBLIC_IP:~/
```

```bash
# EC2 서버에서 실행
chmod +x server-setup.sh
sudo ./server-setup.sh
```

## 3단계: 애플리케이션 배포

### GitHub에서 소스 코드 클론
```bash
git clone https://github.com/johnn8n/meire-blog-platform.git
cd meire-blog-platform
```

### 환경 변수 설정
```bash
# .env.local 파일 생성
cat > .env.local << EOF
DATABASE_URL="mysql://meire:meire2025!@#@localhost:3306/meire_blog"
NEXT_PUBLIC_BASE_URL="http://YOUR_EC2_PUBLIC_IP"
NODE_ENV=production
EOF
```

### 의존성 설치 및 빌드
```bash
npm install
npm run build
```

## 4단계: 데이터베이스 마이그레이션

### MySQL 데이터 가져오기
```bash
# 로컬 데이터를 서버로 전송 (로컬에서 실행)
mysqldump -u root -p meire_db blog_posts > blog_data.sql
scp -i meire-blog-key.pem blog_data.sql ubuntu@YOUR_EC2_PUBLIC_IP:~/

# 서버에서 데이터 가져오기 (EC2에서 실행)
mysql -u meire -p meire_blog < blog_data.sql
```

## 5단계: PM2로 프로덕션 실행

```bash
# PM2로 앱 시작
pm2 start npm --name "meire-blog" -- start
pm2 save
pm2 startup
```

## 6단계: Nginx 설정

### Nginx 설정 파일 생성
```bash
sudo tee /etc/nginx/sites-available/meire-blog << EOF
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/meire-blog /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7단계: 보안 설정

### SSL 인증서 설정 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d YOUR_DOMAIN
```

### 방화벽 재설정
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

## 배포 완료 체크리스트

- [ ] EC2 인스턴스 생성 및 접속 확인
- [ ] Node.js, MySQL, Nginx 설치 완료
- [ ] 소스 코드 클론 및 빌드 성공
- [ ] 데이터베이스 마이그레이션 완료
- [ ] PM2로 앱 실행 확인
- [ ] Nginx 프록시 설정 완료
- [ ] 브라우저에서 사이트 접속 확인

## 주요 명령어

```bash
# 앱 상태 확인
pm2 status
pm2 logs meire-blog

# Nginx 상태 확인
sudo systemctl status nginx
sudo nginx -t

# 시스템 상태 확인
htop
df -h
free -h
```

## 비용 최적화 팁

- t2.micro는 월 750시간 무료 (24/7 실행 가능)
- 8GB EBS 스토리지 무료
- 데이터 전송량 15GB/월 무료
- 12개월간 프리티어 혜택 적용

## 문제 해결

### 메모리 부족 시
```bash
# 스왑 파일 생성
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 포트 확인
```bash
# 포트 사용 현황 확인
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
```

### 로그 확인
```bash
# PM2 로그
pm2 logs meire-blog

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
```