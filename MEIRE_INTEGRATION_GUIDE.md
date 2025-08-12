# 메르 블로그 파서 통합 가이드

## 🎯 개요

Meire 폴더의 네이버 블로그 크롤링 시스템을 meire-blog-platform에 성공적으로 통합했습니다. 
MySQL 데이터를 SQLite로 마이그레이션하고, Next.js 환경에서 사용할 수 있는 TypeScript 기반 크롤러를 제공합니다.

## 📁 통합된 파일들

### 1. 핵심 라이브러리
- `src/lib/blog-crawler.ts` - 메인 크롤링 엔진 (TypeScript 변환)
- `src/types/index.ts` - 타입 정의 추가 (PostData, CrawlerStats, MerryTag 등)

### 2. API 엔드포인트
- `src/app/api/merry/crawler/route.ts` - 크롤링 실행 API
- `src/app/api/merry/migrate-mysql/route.ts` - MySQL 데이터 마이그레이션 API

### 3. UI 컴포넌트
- `src/components/merry/BlogCrawlerDashboard.tsx` - 크롤러 관리 대시보드
- `src/app/merry/admin/page.tsx` - 관리자 페이지

### 4. 데이터베이스 & 스크립트
- `scripts/migrate-mysql-data.js` - MySQL→SQLite 마이그레이션 스크립트
- `database/merry_blog_schema.sql` - 메르 블로그 스키마

## 🚀 설정 및 사용법

### 1. 필요 패키지 설치

```bash
cd C:\Users\c3dyg\meire-blog-platform
npm install axios cheerio mysql2
```

### 2. XAMPP MySQL 준비 (선택사항)

기존 MySQL 데이터가 있다면:
```bash
# XAMPP 시작 후
# MySQL 서비스 실행 확인
# meire_blog 데이터베이스 존재 확인
```

### 3. MySQL 데이터 마이그레이션

```bash
# 방법 1: 스크립트 직접 실행
npm run db:migrate-mysql

# 방법 2: API를 통한 마이그레이션 (서버 실행 후)
curl -X POST http://localhost:3000/api/merry/migrate-mysql
```

### 4. 개발 서버 시작

```bash
npm run dev
```

### 5. 관리자 대시보드 접속

브라우저에서 접속:
```
http://localhost:3000/merry/admin
```

## 🔧 API 사용법

### 크롤링 API

#### 전체 크롤링 시작
```bash
POST /api/merry/crawler
Content-Type: application/json

{
  "maxPages": 10,
  "delayRange": [1, 2]
}
```

#### 단일 포스트 크롤링
```bash
GET /api/merry/crawler?logNo=223412345
```

#### 크롤러 상태 확인
```bash
GET /api/merry/crawler?action=status
```

### 마이그레이션 API

#### 데이터 마이그레이션 실행
```bash
POST /api/merry/migrate-mysql
```

#### 마이그레이션 상태 확인
```bash
GET /api/merry/migrate-mysql?action=status
```

#### MySQL 연결 상태 확인
```bash
GET /api/merry/migrate-mysql?action=mysql-check
```

## 📊 데이터베이스 스키마

### SQLite 테이블

#### blog_posts
```sql
CREATE TABLE blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_no TEXT UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category TEXT,
  created_date DATETIME NOT NULL,
  crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  author TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT 0,
  blog_type TEXT DEFAULT 'merry'
);
```

#### merry_tags (태그 시스템)
```sql
CREATE TABLE merry_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### merry_post_tags (포스트-태그 관계)
```sql
CREATE TABLE merry_post_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES merry_tags(id) ON DELETE CASCADE
);
```

## 🎮 대시보드 사용법

### 크롤링 실행
1. **설정 조정**: 최대 페이지 수, 요청 간격 설정
2. **시작 버튼**: 크롤링 프로세스 시작
3. **실시간 로그**: 진행 상황 모니터링
4. **통계 확인**: 발견/새로운/업데이트/오류 포스트 수

### 데이터 관리
1. **MySQL 마이그레이션**: 기존 데이터 이전
2. **로그 관리**: 실시간 로그 확인 및 정리
3. **상태 모니터링**: 시스템 상태 확인

## 🔍 트러블슈팅

### 크롤링 실패
1. **네트워크 연결** 확인
2. **요청 간격** 늘리기 (서버 부하 감소)
3. **사용자 에이전트** 변경

### MySQL 마이그레이션 실패
1. **XAMPP 실행** 여부 확인
2. **meire_blog 데이터베이스** 존재 여부
3. **MySQL 권한** 설정 확인

### 일반적인 오류
```bash
# SQLite 데이터베이스 확인
node check-db.js

# MySQL 연결 테스트
mysql -u root -p meire_blog
```

## 📈 성능 최적화

### 크롤링 최적화
- **배치 처리**: 여러 포스트 동시 처리
- **캐싱**: 중복 요청 방지
- **지연 설정**: 서버 부하 관리

### 데이터베이스 최적화
- **인덱싱**: log_no, category, created_date
- **정기 정리**: 오래된 로그 삭제
- **백업**: 정기적 데이터 백업

## 🔒 보안 고려사항

### API 보안
- 요청 빈도 제한 (Rate Limiting)
- 인증/권한 관리
- 입력 데이터 검증

### 크롤링 윤리
- 적절한 요청 간격 유지
- 서버 부하 모니터링
- 이용약관 준수

## 🚀 향후 개선사항

### 기능 개선
- [ ] 스케줄링 시스템 (cron job)
- [ ] 실시간 알림 시스템
- [ ] 크롤링 히스토리 관리
- [ ] 태그 자동 분류 AI

### UI/UX 개선
- [ ] 진행률 시각화
- [ ] 에러 로그 분석
- [ ] 성능 모니터링 차트
- [ ] 모바일 대응

## 📞 지원

문제가 발생하거나 개선사항이 있으면 언제든지 문의해주세요!

---

## 📝 체크리스트

### 설치 완료 체크
- [ ] 필요 패키지 설치 (`axios`, `cheerio`, `mysql2`)
- [ ] 개발 서버 실행 (`npm run dev`)
- [ ] 관리자 페이지 접속 (`/merry/admin`)

### 기능 테스트 체크
- [ ] 크롤링 실행 테스트
- [ ] MySQL 마이그레이션 테스트 (선택사항)
- [ ] API 엔드포인트 동작 확인
- [ ] 실시간 로그 확인

### 데이터 확인 체크
- [ ] SQLite 데이터베이스 생성 확인
- [ ] blog_posts 테이블 데이터 확인
- [ ] 태그 시스템 동작 확인

모든 체크가 완료되면 메르 블로그 크롤링 시스템을 사용할 준비가 되었습니다! 🎉