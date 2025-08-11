# AWS EC2 실제 설정 가이드

## 📋 1단계: AWS 콘솔에서 EC2 인스턴스 생성

### AWS Management Console 접속
1. https://console.aws.amazon.com/ 접속
2. **EC2** 서비스 클릭
3. **Launch Instance** 버튼 클릭

### 인스턴스 설정

**Name and tags**
```
Name: meire-blog-server
```

**Application and OS Images (Amazon Machine Image)**
- **Quick Start** 탭 선택
- **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type** 선택
- ✅ **Free tier eligible** 표시 확인

**Instance type**
- **t2.micro** 선택 (✅ Free tier eligible)

**Key pair (login)**
- **Create new key pair** 클릭
  - Key pair name: `meire-blog-key`
  - Key pair type: RSA
  - Private key file format: .pem
  - **Create key pair** 클릭
  - 📁 키 파일을 안전한 위치에 저장

**Network settings**
- **Edit** 버튼 클릭
- **Security group name**: `meire-blog-security-group`
- **Description**: `Security group for Meire blog platform`

**Inbound Security Group Rules**:
```
Type        Protocol    Port Range    Source
SSH         TCP         22           0.0.0.0/0
HTTP        TCP         80           0.0.0.0/0
HTTPS       TCP         443          0.0.0.0/0
Custom TCP  TCP         3000         0.0.0.0/0
Custom TCP  TCP         3306         0.0.0.0/0 (MySQL - 나중에 제한)
```

**Configure storage**
- **1 x 30 GiB gp3** (Free tier: 30GB)
- **Delete on termination**: ✅ 체크

### 인스턴스 실행
1. **Launch instance** 클릭
2. 생성 완료까지 약 2-3분 대기
3. **Public IPv4 address** 확인 및 복사

---

## 🔐 2단계: SSH 연결 설정

### Windows (PuTTY 사용)
1. **PuTTY Key Generator** 실행
2. **Load** → .pem 파일 선택
3. **Save private key** → .ppk 파일로 저장
4. **PuTTY** 실행
   - Host Name: `ubuntu@YOUR_EC2_PUBLIC_IP`
   - Port: 22
   - Connection → SSH → Auth → Private key file: .ppk 파일 선택
   - **Open** 클릭

### Windows (WSL/Git Bash 사용)
```bash
# 키 파일 권한 설정
chmod 400 meire-blog-key.pem

# SSH 접속
ssh -i "meire-blog-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

### macOS/Linux
```bash
# 키 파일 권한 설정
chmod 400 meire-blog-key.pem

# SSH 접속
ssh -i "meire-blog-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 🔧 3단계: 서버 초기 설정

### 시스템 업데이트
```bash
sudo apt update && sudo apt upgrade -y
```

### 필수 패키지 설치
```bash
sudo apt install -y curl wget unzip git htop
```

---

## 🗄️ 4단계: MySQL 설치 및 설정

### MySQL 설치
```bash
# MySQL 서버 설치
sudo apt install mysql-server -y

# MySQL 서비스 시작
sudo systemctl start mysql
sudo systemctl enable mysql

# MySQL 보안 설정
sudo mysql_secure_installation
```

### MySQL 보안 설정 응답
```
Would you like to setup VALIDATE PASSWORD component? Y
Please enter 0 = LOW, 1 = MEDIUM and 2 = STRONG: 1
New password: [강력한 비밀번호 입력]
Re-enter new password: [동일한 비밀번호 재입력]
Do you wish to continue with the password provided? Y
Remove anonymous users? Y
Disallow root login remotely? N
Remove test database and access to it? Y
Reload privilege tables now? Y
```

### 데이터베이스 및 사용자 생성
```bash
# MySQL 접속
sudo mysql -u root -p
```

```sql
-- 데이터베이스 생성
CREATE DATABASE meire_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 애플리케이션용 사용자 생성
CREATE USER 'meire_user'@'%' IDENTIFIED BY 'MeireBlog2024!';
GRANT ALL PRIVILEGES ON meire_blog.* TO 'meire_user'@'%';
FLUSH PRIVILEGES;

-- 생성 확인
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'meire_user';

EXIT;
```

### MySQL 외부 접속 허용
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# bind-address = 127.0.0.1 라인을 찾아서 주석 처리
# bind-address = 127.0.0.1

# MySQL 재시작
sudo systemctl restart mysql

# 포트 확인
sudo netstat -tlnp | grep :3306
```

---

## 📤 5단계: 데이터 이관

### 로컬에서 EC2로 백업 파일 전송
```bash
# Windows (Git Bash/WSL)
scp -i "meire-blog-key.pem" C:/Users/c3dyg/meire-blog-platform/meire_blog_complete_backup.sql ubuntu@YOUR_EC2_PUBLIC_IP:~/

# macOS/Linux
scp -i "meire-blog-key.pem" ./meire_blog_complete_backup.sql ubuntu@YOUR_EC2_PUBLIC_IP:~/
```

### EC2에서 데이터 복원
```bash
# EC2 서버에서 실행
mysql -u root -p meire_blog < ~/meire_blog_complete_backup.sql

# 데이터 확인
mysql -u root -p -e "USE meire_blog; SELECT COUNT(*) FROM blog_posts; SELECT * FROM blog_posts LIMIT 3;"
```

---

## 🚀 6단계: Node.js 및 애플리케이션 배포

### Node.js 설치
```bash
# NVM 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Node.js LTS 설치
nvm install --lts
nvm use --lts
node --version
npm --version
```

### PM2 설치
```bash
npm install -g pm2
```

### 애플리케이션 클론 및 설정
```bash
# Git clone
git clone https://github.com/YOUR_USERNAME/meire-blog-platform.git
cd meire-blog-platform

# 의존성 설치
npm install

# 환경변수 설정
nano .env.local
```

### .env.local 파일 내용
```env
DATABASE_URL=mysql://meire_user:MeireBlog2024!@localhost:3306/meire_blog
NEXT_PUBLIC_BASE_URL=http://YOUR_EC2_PUBLIC_IP
NODE_ENV=production
```

### 애플리케이션 빌드 및 실행
```bash
# 빌드
npm run build

# PM2로 실행
pm2 start npm --name "meire-blog" -- start

# PM2 상태 확인
pm2 status
pm2 logs meire-blog

# 자동 시작 설정
pm2 startup
pm2 save
```

---

## 🔒 7단계: 보안 설정

### 방화벽 설정
```bash
sudo ufw enable
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw status
```

### MySQL 보안 강화
```bash
# MySQL 로그 확인
sudo tail -f /var/log/mysql/error.log

# 3306 포트 제한 (나중에 적용)
# sudo ufw deny 3306
```

---

## 🎯 8단계: 접속 테스트

### 웹 브라우저에서 확인
```
http://YOUR_EC2_PUBLIC_IP:3000
```

### API 테스트
```bash
# EC2에서 직접 테스트
curl http://localhost:3000/api/posts

# 로컬에서 원격 테스트
curl http://YOUR_EC2_PUBLIC_IP:3000/api/posts
```

---

## 📊 9단계: 모니터링

### PM2 모니터링
```bash
pm2 monit
pm2 logs meire-blog --lines 50
```

### 시스템 리소스 확인
```bash
htop
df -h
free -h
sudo systemctl status mysql
```

---

## 🔧 트러블슈팅

### 자주 발생하는 문제

1. **포트 3000 접속 불가**
   ```bash
   sudo ufw allow 3000
   netstat -tlnp | grep :3000
   ```

2. **MySQL 연결 오류**
   ```bash
   mysql -u meire_user -p -h localhost meire_blog
   sudo systemctl status mysql
   ```

3. **빌드 오류**
   ```bash
   npm run build
   pm2 logs meire-blog
   ```

---

## 🎉 배포 완료!

성공적으로 배포되면:
- **메인 사이트**: `http://YOUR_EC2_PUBLIC_IP:3000`
- **API**: `http://YOUR_EC2_PUBLIC_IP:3000/api/posts`
- **블로그 포스트**: 500개 포스트 접근 가능

---

## 💰 비용 관리

- **EC2 t2.micro**: 프리티어 12개월 무료
- **EBS 스토리지**: 30GB 무료  
- **데이터 전송**: 월 15GB 무료
- **예상 비용**: 12개월 후 월 $10-15