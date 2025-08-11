# EC2 + MySQL 배포 가이드

## 📋 준비사항
- AWS 계정 (프리티어)
- 생성된 백업 파일: `meire_blog_complete_backup.sql`
- SSH 클라이언트 (PuTTY 또는 터미널)

## 🚀 1단계: EC2 인스턴스 생성

### AWS 콘솔에서 EC2 생성
1. **AWS Management Console** → **EC2** 서비스
2. **Launch Instance** 클릭
3. **설정값:**
   - **Name**: `meire-blog-server`
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type**: t2.micro (Free tier eligible)
   - **Key pair**: 새로 생성 또는 기존 사용
   - **Security Group**:
     ```
     SSH (22)     → 0.0.0.0/0
     HTTP (80)    → 0.0.0.0/0
     HTTPS (443)  → 0.0.0.0/0
     MySQL (3306) → 0.0.0.0/0 (또는 특정 IP만)
     Custom (3000) → 0.0.0.0/0 (Next.js 개발용)
     ```

## 🔧 2단계: 서버 초기 설정

### SSH 접속
```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

### 시스템 업데이트
```bash
sudo apt update
sudo apt upgrade -y
```

## 🗄️ 3단계: MySQL 설치 및 설정

### MySQL 설치
```bash
# MySQL 설치
sudo apt install mysql-server -y

# MySQL 보안 설정
sudo mysql_secure_installation
# - Root password 설정 (강력한 비밀번호 사용)
# - 모든 보안 옵션에 'Y' 응답
```

### MySQL 설정
```bash
# MySQL 서비스 시작 및 자동시작 설정
sudo systemctl start mysql
sudo systemctl enable mysql

# MySQL 접속 테스트
sudo mysql -u root -p
```

### 데이터베이스 및 사용자 생성
```sql
-- MySQL 콘솔에서 실행
CREATE DATABASE meire_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 애플리케이션용 사용자 생성
CREATE USER 'meire_user'@'%' IDENTIFIED BY 'your-strong-password';
GRANT ALL PRIVILEGES ON meire_blog.* TO 'meire_user'@'%';
FLUSH PRIVILEGES;

-- 생성 확인
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'meire_user';

EXIT;
```

### 외부 접속 허용 (선택사항)
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# bind-address 주석처리 또는 변경
# bind-address = 127.0.0.1  → # bind-address = 127.0.0.1
# 또는
# bind-address = 0.0.0.0

# MySQL 재시작
sudo systemctl restart mysql
```

## 📤 4단계: 데이터 이관

### 백업 파일 업로드
```bash
# 로컬에서 EC2로 파일 전송
scp -i "your-key.pem" meire_blog_complete_backup.sql ubuntu@your-ec2-ip:~/
```

### 데이터 복원
```bash
# EC2에서 실행
mysql -u root -p meire_blog < meire_blog_complete_backup.sql

# 데이터 확인
mysql -u root -p -e "USE meire_blog; SELECT COUNT(*) FROM blog_posts;"
```

## 🚀 5단계: Node.js 및 애플리케이션 설정

### Node.js 설치 (NVM 사용 권장)
```bash
# NVM 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Node.js 설치 (LTS 버전)
nvm install --lts
nvm use --lts
node --version
npm --version
```

### PM2 설치 (프로세스 매니저)
```bash
npm install -g pm2
```

### 애플리케이션 배포
```bash
# Git clone (또는 파일 업로드)
git clone https://github.com/your-username/meire-blog-platform.git
cd meire-blog-platform

# 의존성 설치
npm install

# 환경변수 설정
nano .env.local
```

### 환경변수 설정 (.env.local)
```env
# MySQL 연결 정보
DATABASE_URL=mysql://meire_user:your-strong-password@localhost:3306/meire_blog

# Next.js 설정
NEXT_PUBLIC_BASE_URL=http://your-ec2-ip:3000
NODE_ENV=production
```

### 애플리케이션 빌드
```bash
npm run build
```

### PM2로 애플리케이션 실행
```bash
# Next.js 앱 시작
pm2 start npm --name "meire-blog" -- start

# PM2 상태 확인
pm2 status

# PM2 자동 시작 설정
pm2 startup
pm2 save
```

## 🌐 6단계: Nginx 리버스 프록시 (선택사항)

### Nginx 설치
```bash
sudo apt install nginx -y
```

### Nginx 설정
```bash
sudo nano /etc/nginx/sites-available/meire-blog
```

### Nginx 설정 파일 내용
```nginx
server {
    listen 80;
    server_name your-ec2-ip your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Nginx 활성화
```bash
# 설정 파일 링크
sudo ln -s /etc/nginx/sites-available/meire-blog /etc/nginx/sites-enabled/

# 기본 설정 제거
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 시작
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🔒 7단계: 보안 및 최적화

### 방화벽 설정
```bash
sudo ufw enable
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # 개발용 (나중에 제거)
```

### MySQL 보안 강화
```bash
# MySQL 로그 확인
sudo tail -f /var/log/mysql/error.log

# 불필요한 포트 차단 (3306 외부 접근 제한)
sudo ufw deny 3306
```

### 자동 백업 스크립트
```bash
# 백업 스크립트 생성
nano backup_script.sh
```

### 백업 스크립트 내용
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# MySQL 백업
mysqldump -u root -p메일이_비밀번호 meire_blog > $BACKUP_DIR/meire_blog_$TIMESTAMP.sql

# 7일 이상 된 백업 파일 삭제
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

### Cron 작업으로 자동 백업
```bash
crontab -e

# 매일 새벽 2시에 백업 실행
0 2 * * * /home/ubuntu/backup_script.sh
```

## 📊 8단계: 모니터링

### PM2 모니터링
```bash
# PM2 모니터링
pm2 monit

# 로그 확인
pm2 logs meire-blog

# 재시작
pm2 restart meire-blog
```

### 시스템 상태 확인
```bash
# 시스템 리소스 확인
htop
df -h
free -h

# MySQL 상태 확인
sudo systemctl status mysql

# Nginx 상태 확인
sudo systemctl status nginx
```

## 🎯 접속 확인

1. **직접 접속**: `http://your-ec2-ip:3000`
2. **Nginx를 통한 접속**: `http://your-ec2-ip`

## 🔧 트러블슈팅

### 자주 발생하는 문제들

1. **포트 3000이 차단된 경우**
   ```bash
   sudo ufw allow 3000
   netstat -tlnp | grep :3000
   ```

2. **MySQL 연결 오류**
   ```bash
   mysql -u meire_user -p -h localhost meire_blog
   sudo tail -f /var/log/mysql/error.log
   ```

3. **Next.js 빌드 오류**
   ```bash
   npm run build
   pm2 logs meire-blog
   ```

## 💰 비용 관리

- **EC2 t2.micro**: 프리티어 12개월 무료
- **데이터 전송**: 프리티어 15GB/월 무료
- **EBS 스토리지**: 30GB 무료

## 🎉 완료!

이제 완전 무료로 운영되는 Meire 블로그 플랫폼이 EC2에서 실행됩니다!

**접속 주소**: `http://your-ec2-public-ip`