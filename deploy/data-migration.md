# 📊 데이터베이스 마이그레이션 가이드

## 로컬 → EC2 MySQL 데이터 이전

### 1단계: 로컬 데이터 백업

#### Windows 환경에서 MySQL 덤프 생성
```cmd
REM XAMPP MySQL 사용 시
"C:\xampp\mysql\bin\mysqldump.exe" -u root -p meire_db blog_posts > blog_data.sql

REM 또는 일반 MySQL 설치 시
mysqldump -u root -p meire_db blog_posts > blog_data.sql
```

#### 백업 파일 확인
```cmd
dir blog_data.sql
type blog_data.sql | more
```

### 2단계: EC2 서버로 파일 전송

```cmd
REM SCP로 덤프 파일 업로드
scp -i "C:\Users\c3dyg\Meire\meire.pem" blog_data.sql ubuntu@YOUR_EC2_IP:~/
```

### 3단계: EC2에서 데이터 복원

```bash
# SSH로 EC2 접속 (또는 ssh-connect.bat 사용)
ssh -i "C:\Users\c3dyg\Meire\meire.pem" ubuntu@YOUR_EC2_IP

# 백업 파일 확인
ls -la blog_data.sql
head -20 blog_data.sql

# MySQL 데이터베이스에 데이터 가져오기
mysql -u meire -p meire_blog < blog_data.sql

# 비밀번호: meire2025!@#
```

### 4단계: 데이터 검증

```sql
-- MySQL 접속
mysql -u meire -p meire_blog

-- 테이블 확인
SHOW TABLES;

-- 포스트 수 확인
SELECT COUNT(*) FROM blog_posts;

-- 카테고리별 포스트 수
SELECT category, COUNT(*) as count 
FROM blog_posts 
GROUP BY category 
ORDER BY count DESC;

-- 최신 포스트 5개 확인
SELECT log_no, title, category, created_date 
FROM blog_posts 
ORDER BY created_date DESC 
LIMIT 5;

-- 한글 인코딩 확인
SELECT title FROM blog_posts WHERE title LIKE '%경제%' LIMIT 3;
```

### 5단계: 테이블 구조 최적화 (필요시)

```sql
-- 현재 테이블 구조 확인
DESCRIBE blog_posts;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_category ON blog_posts(category);
CREATE INDEX idx_created_date ON blog_posts(created_date);
CREATE INDEX idx_title ON blog_posts(title);

-- 인덱스 확인
SHOW INDEX FROM blog_posts;
```

## 데이터 검증 체크리스트

- [ ] **포스트 수량 확인**: 총 101개 포스트
- [ ] **카테고리 분포**: 
  - 경제/주식/국제정세/사회: 48개
  - 주절주절: 39개
  - 건강/의학/맛집/일상/기타: 14개
- [ ] **한글 인코딩**: 한글 제목과 내용 정상 출력
- [ ] **날짜 형식**: YYYY-MM-DD HH:MM:SS 형식
- [ ] **내용 길이**: 평균 3,896자 정도

## 문제 해결

### UTF-8 인코딩 문제
```sql
-- 데이터베이스 문자셋 확인
SHOW VARIABLES LIKE 'character_set%';

-- 테이블 문자셋 변경 (필요시)
ALTER TABLE blog_posts CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 권한 문제
```bash
# MySQL 사용자 권한 재설정
sudo mysql -e "GRANT ALL PRIVILEGES ON meire_blog.* TO 'meire'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### 대용량 파일 임포트
```bash
# 큰 파일의 경우 분할 처리
split -l 1000 blog_data.sql blog_data_part_

# 각 파일 순서대로 임포트
for file in blog_data_part_*; do
    echo "Importing $file..."
    mysql -u meire -p meire_blog < "$file"
done
```

### 백업 파일 압축
```cmd
REM 대용량 데이터의 경우 압축
"C:\xampp\mysql\bin\mysqldump.exe" -u root -p meire_db blog_posts | gzip > blog_data.sql.gz
```

```bash
# EC2에서 압축 해제 후 임포트
gunzip blog_data.sql.gz
mysql -u meire -p meire_blog < blog_data.sql
```

## 마이그레이션 완료 후 테스트

### Next.js 앱에서 데이터베이스 연결 테스트
```bash
# .env.local 설정 확인
cat .env.local

# 앱 실행
npm run build
npm start

# 브라우저에서 확인
# http://YOUR_EC2_IP:3000
```

### API 엔드포인트 테스트
```bash
# 포스트 목록 API
curl "http://localhost:3000/api/posts"

# 특정 포스트 API  
curl "http://localhost:3000/api/posts/YOUR_LOG_NO"

# 검색 API
curl "http://localhost:3000/api/posts?search=경제"
```