# 📝 네이버 블로그 크롤링 파서 가이드

네이버 블로그 `blog.naver.com/PostView.naver?blogId=ranto28`의 글들을 크롤링하고 파싱하는 스크립트입니다.

## 🎯 주요 기능

### ✅ 구현된 기능
- **F12 Network 방식 활용**: 브라우저 개발자 도구의 Network 탭에서 확인되는 실제 API 호출 시뮬레이션
- **번호별 문장 파싱**: `1.` `2.` `3.` 형태의 번호가 있는 문장들을 정확히 추출
- **빈 문장 제거**: 의미 없는 빈 줄과 공백 제거
- **출처 표기 제거**: `@사용자명`, `네이버 블로그`, `출처: xxx` 등 불필요한 출처 표기 자동 제거
- **정확한 텍스트 정리**: HTML 태그 제거, 연속 공백 정리, 개행 정리

### 🔍 출처 표기 제거 패턴
```javascript
@[사용자명]           // @네이버블로그, @투자왕 등
네이버 블로그          // 네이버 블로그, 네이버블로그
출처: [내용]          // 출처: 어디서든, 출처：투자뉴스
[출처][내용]         // [출처]투자일보
참고: [내용]          // 참고: 경제신문
* 출처[내용]         // * 출처네이버
ⓒ[내용]             // ⓒ 2024 All rights reserved
Copyright[내용]       // Copyright 2024
```

## 📋 사용법

### 1. 기본 테스트
```bash
# 파싱 로직 테스트 (샘플 데이터)
node scripts/naver-blog-parser.js --test
```

### 2. 실제 파싱 실행
```bash
# 기본 실행 (최대 3개 포스트)
node scripts/run-parser.js

# 또는 직접 실행
node scripts/naver-blog-parser.js --max=5    # 최대 5개 포스트
node scripts/naver-blog-parser.js --no-save  # 파일 저장 안 함
```

### 3. 커스텀 파싱
```javascript
const NaverBlogParser = require('./scripts/naver-blog-parser');

const parser = new NaverBlogParser();

// 특정 포스트 파싱
const result = await parser.parsePost('https://blog.naver.com/PostView.naver?blogId=ranto28&logNo=123456');

// 샘플 텍스트 파싱
const sentences = parser.parseNumberedSentences(`
  1. 첫 번째 문장입니다.
  
  2. 두 번째 문장입니다.
  @네이버블로그 출처: 어디선가
  
  3. 세 번째 문장입니다.
`);
```

## 📊 파싱 결과 예시

### 입력 텍스트
```
1. 오늘은 테슬라에 대해 이야기해보겠습니다.

2. 테슬라의 주가가 최근 상승세를 보이고 있어요.
@네이버블로그 출처: 투자뉴스

3. 이는 전기차 시장의 성장과 관련이 있습니다.

4. 앞으로도 지켜볼 필요가 있겠네요.
ⓒ 2024 All rights reserved
```

### 출력 결과
```json
[
  {
    "number": 1,
    "sentence": "오늘은 테슬라에 대해 이야기해보겠습니다."
  },
  {
    "number": 2,
    "sentence": "테슬라의 주가가 최근 상승세를 보이고 있어요."
  },
  {
    "number": 3,
    "sentence": "이는 전기차 시장의 성장과 관련이 있습니다."
  },
  {
    "number": 4,
    "sentence": "앞으로도 지켜볼 필요가 있겠네요."
  }
]
```

## 🗂️ 파일 구조

```
scripts/
├── naver-blog-parser.js     # 메인 파서 클래스
├── run-parser.js           # 실행 스크립트
└── README-PARSER.md        # 이 문서

data/
└── parsed-posts/           # 파싱 결과 저장 폴더
    └── naver-blog-ranto28-[timestamp].json
```

## 🔧 기술적 특징

### 파싱 엔진
- **이중 파싱 시스템**: 정규식 매칭 → 라인별 처리 순차 시도
- **견고한 오류 처리**: 다양한 입력 형식에 대응
- **유연한 번호 인식**: 공백, 들여쓰기 변화에 관계없이 정확한 번호 인식

### 네트워크 처리
- **실제 브라우저 헤더 시뮬레이션**: User-Agent, Accept 등 실제 브라우저와 동일한 헤더
- **적절한 딜레이**: API 부하 방지를 위한 2초 간격 요청
- **오류 복구**: 네트워크 오류 시 재시도 메커니즘

### 텍스트 정리
- **스마트 공백 처리**: 연속 공백 → 단일 공백, 불필요한 개행 제거
- **출처 패턴 매칭**: 8가지 주요 출처 표기 패턴 자동 감지 및 제거
- **HTML 안전 처리**: cheerio를 통한 안전한 HTML 파싱

## 🚀 실제 사용 시나리오

### 1. 일회성 파싱
```bash
# 최근 5개 포스트 파싱하고 JSON으로 저장
node scripts/naver-blog-parser.js --max=5
```

### 2. 정기적 크롤링
```javascript
// cron job이나 스케줄러에서 사용
const parser = new NaverBlogParser();
setInterval(async () => {
  await parser.run({ maxPosts: 10, saveResults: true });
}, 60 * 60 * 1000); // 1시간마다
```

### 3. 데이터베이스 연동
```javascript
// 파싱 결과를 데이터베이스에 저장
const results = await parser.run({ maxPosts: 5, saveResults: false });
for (const result of results) {
  await database.saveBlogPost({
    title: result.title,
    url: result.url,
    sentences: result.sentences,
    timestamp: result.timestamp
  });
}
```

## ⚠️ 주의사항

1. **네트워크 제한**: 실제 네이버 블로그 접근 시 CORS, 차단 정책 등으로 제한될 수 있음
2. **사용량 제한**: 과도한 요청 시 IP 차단 가능성 (적절한 딜레이 필수)
3. **HTML 구조 변화**: 네이버 블로그 HTML 구조 변경 시 셀렉터 수정 필요
4. **저작권 준수**: 크롤링한 데이터 사용 시 저작권 및 이용약관 준수 필요

## 🛠️ 확장 가능성

- [ ] 다중 블로그 지원
- [ ] 이미지 다운로드
- [ ] 카테고리별 분류
- [ ] 자동 요약 기능
- [ ] 실시간 알림
- [ ] 데이터베이스 직접 연동
- [ ] 웹 인터페이스 제공

---

📝 **개발**: Claude Code SuperClaude 프레임워크  
🔧 **기술**: Node.js + Cheerio + HTTPS  
📅 **업데이트**: 2025-08-27