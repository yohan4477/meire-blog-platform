# 🚀 Meire Blog Platform - 수퍼 클로드 개발 가이드라인

> **요르의 투자 블로그** 플랫폼을 위한 포괄적인 개발 가이드라인입니다.
> 모든 코드 작성 시 이 문서를 반드시 참고하여 일관성과 품질을 보장합니다.

---

## 📋 필수 개발 프로세스

### 1. 🛠️ 수퍼 클로드 커맨드 활용 (필수)

모든 개발 작업에서 **최대한 다양하고 시기 적절한** 수퍼 클로드 커맨드들을 적극 활용해야 합니다:

#### 🚀 **SuperClaude 슬래시 커맨드 (우선 사용)**
- **`/sc:analyze`**: 코드베이스 분석 및 시스템 이해 
- **`/sc:implement`**: 기능 및 컴포넌트 구현
- **`/sc:build`**: 프로젝트 빌드 및 배포 준비  
- **`/sc:improve`**: 코드 품질 및 성능 개선
- **`/sc:troubleshoot`**: 문제 조사 및 디버깅
- **`/sc:test`**: 테스트 실행 및 품질 보증
- **`/sc:document`**: 문서 생성 및 업데이트
- **`/sc:design`**: 시스템 설계 및 아키텍처
- **`/sc:workflow`**: 워크플로우 생성 및 관리
- **`/sc:cleanup`**: 기술 부채 정리
- **`/sc:git`**: Git 워크플로우 지원
- **`/sc:load`**: 프로젝트 컨텍스트 로드
- **`/sc:estimate`**: 작업 추정 및 계획
- **`/sc:spawn`**: 복잡한 워크플로우 오케스트레이션
- **`/sc:task`**: 장기 프로젝트 관리
- **`/sc:index`**: 명령어 네비게이션

#### 🎯 **시기 적절한 커맨드 사용법 (토큰 효율성 고려)**

**필수 사용 시점** (반드시 사용):
- **프로젝트 시작**: `/sc:load` (컨텍스트 이해 필수)
- **복잡한 구현**: `/sc:implement --persona-[domain]` (전문성 필요)
- **품질 문제**: `/sc:analyze --focus [issue]` (체계적 분석 필요)
- **배포 전**: `/sc:test --play` (E2E 검증 필수)

**선택적 사용 시점** (상황에 따라):
- **단순 수정**: 기본 도구로 충분할 때는 `/sc:` 생략 가능
- **반복 작업**: 패턴이 확실할 때는 간소화
- **문서 업데이트**: 내용이 단순할 때는 기본 편집

**토큰 절약 전략**:
- **`--uc`** 플래그로 30-50% 토큰 절약
- **복잡도 ≥0.7**일 때만 고급 기능 사용
- **단계별 접근**: 기본 → 필요시 고급 기능

**📌 효율적 활용 + 사용 내역 명시 (둘 다 필수):**
- **효율적 활용**: 토큰을 고려하여 시기 적절하게 사용
- **반드시 명시**: 사용한 `/sc:` 커맨드명, 플래그, 시점, 목적, 결과

### 2. 🔗 대표적인 MCP 활용 (필수)

프로젝트에서 다음 대표적인 MCP들을 적극 활용하고 사용 시 명시해야 합니다:

#### 📈 Sequential MCP 
- **순차적 작업 처리**: 복잡한 다단계 개발 프로세스
- **워크플로우 관리**: 코드 분석 → 설계 → 구현 → 테스트 순서
- **의존성 관리**: 컴포넌트 간 순서 보장
- **단계별 검증**: 각 단계 완료 후 다음 단계 진행

#### 🧠 Context7 MCP
- **컨텍스트 유지**: 7개 주요 컨텍스트 영역 관리
- **도메인 지식**: 투자/금융 도메인 전문성 유지
- **코드 패턴**: 기존 코드베이스 패턴 일관성
- **사용자 의도**: 요구사항 정확한 이해 및 반영

#### ✨ Magic MCP
- **자동 최적화**: 코드 성능 및 구조 자동 개선
- **스마트 제안**: 베스트 프랙티스 자동 적용
- **에러 예방**: 잠재적 문제 사전 감지 및 해결
- **코드 생성**: 패턴 기반 자동 코드 생성

**📌 MCP 효율적 활용 + 사용 내역 명시 (둘 다 필수):**
- **효율적 활용**: 필요에 따라 Sequential/Context7/Magic 선택적 사용
- **자동 활성화**: 복잡도나 도메인에 따라 자동 선택됨 (`--c7`, `--seq`, `--magic`)
- **반드시 명시**: 사용한 MCP명, 목적, 시나리오, 결과, 효과

### 3. 🧪 Playwright 테스트로 모든 테스트 완료 (필수)

**모든 테스트는 반드시 Playwright를 활용하여 끝내야 합니다:**

#### 테스트 실행 단계:
1. **개발 완료 후 즉시 테스트 실행**
   ```bash
   npx playwright test
   ```

2. **테스트 결과 확인**
   - HTML 리포트: `playwright-report/index.html`
   - JSON 결과: `test-results/results.json`

3. **테스트 통과 후 웹사이트 자동 오픈**
   - 로컬 서버: 상황에 따라 자동 포트 설정 (기본 3004, 필요시 다른 포트)
   - 개발된 페이지 직접 확인

#### 테스트 범위:
- 크로스 브라우저 (Chrome, Firefox, Safari)
- 모바일 반응형 (Pixel 5, iPhone 12)
- 핵심 사용자 플로우

### 4. 🌐 테스트 완료 후 웹사이트 자동 오픈 (필수)

**테스트가 종료되면 반드시 해당 서비스를 웹사이트에 열어서 보여줘야 합니다:**

```bash
# 포트는 상황에 따라 자동 설정 (기본값: 3004)
start http://localhost:[자동설정포트]
```

**확인해야 할 사항:**
- 기능 정상 동작
- **로딩 시간 < 3초** (필수 측정)
- UI/UX 일관성
- 반응형 디자인
- 접근성 (a11y)

---

## 🏗️ 프로젝트 아키텍처

### 기술 스택
- **Frontend**: Next.js 15.4.6, React 19.1.0
- **Styling**: TailwindCSS 4, Radix UI
- **Backend**: Next.js API Routes
- **Database**: SQLite3, MySQL2, Redis
- **Testing**: Jest, Playwright
- **Deployment**: Vercel, Cloudflare Pages

### 프로젝트 구조
```
src/
├── app/                 # Next.js App Router
│   ├── (routes)/       # 페이지 라우트
│   └── api/            # API 엔드포인트
├── components/         # 재사용 컴포넌트
│   ├── ui/            # 기본 UI 컴포넌트
│   ├── layout/        # 레이아웃 컴포넌트
│   └── [domain]/      # 도메인별 컴포넌트
├── lib/               # 유틸리티 및 라이브러리
├── hooks/             # 커스텀 React 훅
└── types/             # TypeScript 타입 정의
```

---

## 📄 페이지별 참고 내역 (CLAUDE.md에 반영)

**각 페이지마다 참고해야 할 내역을 이 CLAUDE.md에 적어 놓습니다:**

### 📋 **언제 추가해야 하는가?**
- **새 페이지/화면 개발 시**: 반드시 요구사항과 특이사항 기록
- **기존 화면 수정 시**: 변경된 요구사항 업데이트 
- **복잡한 로직/컴포넌트**: 특별한 처리가 필요한 경우
- **성능 요구사항**: 3초 로딩 제한 관련 특수 최적화
- **비즈니스 로직**: 투자/금융 도메인 특화 요구사항

### 📝 **작성해야 할 내용**
- **기능 요구사항**: 핵심 기능과 사용자 플로우
- **기술적 제약사항**: 성능, 보안, 호환성 요구사항  
- **UI/UX 가이드라인**: 디자인 시스템 적용 방법
- **데이터 연동**: API, 데이터베이스 연결 방법
- **테스트 시나리오**: Playwright 테스트 필수 케이스
- **성능 최적화**: 3초 로딩을 위한 특별 고려사항

---

### 🏠 메인 페이지 (`/`)
**파일**: `src/app/page.tsx`
**기능 요구사항:**
- 요르의 투자 철학 강조 표시
- 최신 포스트 하이라이트 (상위 3개)
- 포트폴리오 성과 요약 위젯
**성능 요구사항:**
- 초기 로딩 < 2초 (메인 페이지 특별 기준)
- LCP < 1.5s (hero 섹션)
**SEO 요구사항:**
- 메타 태그 최적화 필수
- JSON-LD 구조화 데이터
- 소셜 미디어 OG 태그

### 🎯 메르's Pick 요구사항

**위치**: 메인 페이지 및 종목 관련 페이지
**기능**: 메르가 최근에 언급한 종목들을 우선순위로 표시

**표시 순서 (핵심 요구사항)**:
1. **메르가 언급한 최신 날짜 순으로 랭킹** (lastMention 기준 내림차순)
2. 언급 횟수 (postCount/mention_count) 참고
3. 메르가 언급한 종목만 표시 (postCount > 0)

**UI 요구사항**:
- 제목: "메르's Pick" 
- 최대 5-10개 종목 표시
- 각 종목당: 티커, 종목명, 최근 언급일, 현재가 (있는 경우)
- 배지는 종목 위에 작성 (종목 아래가 아님)
- 회사 소개는 포스트 개수가 아닌 회사 한줄 소개로 성의있게 작성
- 클릭 시 해당 종목 상세 페이지로 이동

**데이터 연동**:
- `merry_mentioned_stocks` 테이블에서 `last_mentioned_at DESC` 정렬
- 실시간 가격 정보 연동 (선택사항)
- 캐싱을 통한 빠른 로딩 (<500ms)

**성능 요구사항**:
- 로딩 시간 < 500ms
- 메인 페이지 전체 로딩에 영향 주지 않음
- 실시간 업데이트는 불필요 (페이지 새로고침시 갱신)

### 📊 종목 분석 화면 (`/merry/stocks/[ticker]`)
**파일**: `src/app/merry/stocks/[ticker]/page.tsx`

**기능 요구사항:**
- 종목 기본 정보 표시 (티커, 회사명, 현재가, 등락률)
- Recharts를 활용한 주식 차트 (일봉, 주봉, 월봉 전환)
- 실시간 주가 데이터 연동 (15분 지연 또는 실시간)
- 관련 포스트 자동 연결 및 표시
- 소셜 미디어 공유 기능 (Twitter, 카카오톡)
- 종목 즐겨찾기 추가/제거 기능
- 가격 알림 설정 기능

**차트 요구사항:**
- **6개월치 차트** 기본 표시 (180일 데이터)
- 캔들스틱 차트 기본 제공
- 거래량 차트 하단 표시  
- 이동평균선 (5일, 20일, 60일, 120일) 선택 표시
- 차트 확대/축소 및 드래그 스크롤 지원
- 반응형 차트 (모바일 최적화)

**메르 글 정보 표시:**
- **6개월치 메르 글** 데이터 연동
- **메르 글 언급 날짜 또는 당일**에만 정보 마커 표시
- **언급 없는 날들은 정보 표시 안 함** (깔끔한 차트 유지)
- 메르 글 마커 클릭 시 해당 글 요약 팝업 표시
- 마커 색상: 긍정적 언급(초록), 부정적 언급(빨강), 중립(회색)

**데이터 연동:**
- 주가 API 연동 (`/api/merry/stocks/[ticker]`) - 6개월치 데이터
- 메르 글 API (`/api/merry/stocks/[ticker]/posts`) - 6개월치 언급 데이터
- 메르 글 날짜 매칭 API (종목 언급 날짜 정보)
- 실시간 WebSocket 연결 (선택사항)
- 종목 즐겨찾기 로컬 스토리지 저장

**데이터베이스 요구사항:**
- **메르가 언급한 종목만** 종가 데이터 저장 (선별적 저장)
- **6개월치 종가** 데이터 유지 (180일 기준)
- 종목 테이블: 메르 언급 여부 플래그 관리
- 종가 테이블: ticker, date, close_price, volume 저장
- 자동 데이터 정리: 6개월 이전 데이터 삭제 스케줄링
- 메르 글 연동: 언급된 종목 자동 추가, 미언급 종목 저장 중단

**성능 요구사항:**
- 초기 로딩 < 3초 (차트 포함)
- 차트 렌더링 < 1초
- API 응답 < 500ms
- 차트 상호작용 지연 < 100ms

**UI/UX 요구사항:**
- 종목명과 티커 명확히 표시
- 등락률에 따른 색상 표시 (상승: 빨강, 하락: 파랑)
- 모바일에서 차트 터치 조작 지원
- 로딩 상태 스켈레톤 UI 제공
- 에러 상태 처리 (종목 없음, API 오류 등)

**테스트 시나리오 (Playwright):**
- 유효한 티커로 페이지 접근 테스트
- 6개월치 차트 로딩 및 상호작용 테스트  
- 메르 글 마커 표시 및 클릭 테스트
- 메르 글 없는 날짜에 마커 미표시 확인 테스트
- 메르 언급 종목만 차트 데이터 표시 확인 테스트
- 미언급 종목 접근 시 적절한 안내 메시지 테스트
- 잘못된 티커 에러 처리 테스트
- 모바일 반응형 테스트
- 소셜 공유 기능 테스트
- 즐겨찾기 추가/제거 테스트

**SEO 요구사항:**
- 동적 메타 태그 (종목명, 현재가 포함)
- JSON-LD 구조화 데이터 (Organization, Article)
- 소셜 미디어 OG 태그 (종목 정보 포함)

### 💼 포트폴리오 (`/portfolio`)
**파일**: `src/app/portfolio/page.tsx`
**참고사항:**
- 국민연금 비교 분석
- 성과 지표 시각화
- 리밸런싱 추천
- 리스크 분석 차트

### 📝 블로그 포스트 (`/posts/[id]`)
**파일**: `src/app/posts/[id]/page.tsx`
**참고사항:**
- Markdown 지원 (react-markdown)
- 목차 자동 생성
- 관련 주식 자동 태깅
- 댓글 시스템 연동

### 🏛️ 연기금 분석 (`/pension`)
**파일**: `src/app/pension/page.tsx`
**참고사항:**
- 국민연금 포트폴리오 분석
- 분기별 성과 추이
- 자산 배분 파이차트
- 상위 보유 종목 테이블

### 🤖 관리자 (`/admin`)
**파일**: `src/app/admin/page.tsx`
**참고사항:**
- 성과 대시보드
- 크롤러 관리
- 캐시 제어
- 시스템 모니터링

---

## 💻 코딩 스타일 가이드

### TypeScript
```typescript
// ✅ 좋은 예시
interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

export async function getStockData(ticker: string): Promise<StockData> {
  // 구현
}

// ❌ 피해야 할 패턴
function getData(t: any): any {
  // 타입 정의 없음
}
```

### React 컴포넌트
```tsx
// ✅ 좋은 예시 - 함수형 컴포넌트
interface StockChartProps {
  data: StockData[];
  height?: number;
  showVolume?: boolean;
}

export function StockChart({ data, height = 400, showVolume = true }: StockChartProps) {
  return (
    <div className="w-full">
      {/* 구현 */}
    </div>
  );
}

// ❌ 피해야 할 패턴 - 익명 컴포넌트
export default ({ data }: any) => <div>{data}</div>;
```

### API 라우트
```typescript
// ✅ 좋은 예시
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchStockData();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 UI/UX 가이드라인

### 컬러 시스템
- **Primary**: 투자 관련 색상 (파랑/초록 계열)
- **Success**: 수익 표시 (초록)
- **Danger**: 손실 표시 (빨강)
- **Warning**: 주의 사항 (노랑)

### 반응형 디자인
```tsx
// ✅ Tailwind CSS 반응형 클래스 사용
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 컨텐츠 */}
</div>
```

### 접근성 (a11y)
- 모든 이미지에 alt 텍스트
- 키보드 네비게이션 지원
- 스크린 리더 호환성
- 색상 대비 준수

---

## 🔧 개발 워크플로우

### 데이터 표시 원칙 (필수)
- **절대 금지**: Dummy data, 가짜 데이터, 샘플 데이터 사용 금지
- **필수**: 실제 데이터 없을 때 "정보 없음" 명확히 표기
- **예시**: 
  - ❌ "예시 데이터: $100", "샘플: 3개 포스트"
  - ✅ "가격 정보 없음", "관련 포스트 없음"

### 1. 개발 시작 전
```bash
# 사용한 커맨드: Bash
npm run dev
```

### 2. 코드 작성
- **사용한 수퍼 클로드 @커맨드들을 반드시 명시**
- **Sequential/Context7/Magic MCP 활용 내역 문서화**
- 컴포넌트 단위 개발
- 타입 안정성 보장

### 3. 테스트 실행
```bash
# 사용한 커맨드: Bash
npm run test          # Jest 유닛 테스트
npm run lint          # ESLint 검사
npx playwright test   # E2E 테스트
```

### 4. 빌드 확인
```bash
# 사용한 커맨드: Bash
npm run build
npm start
```

### 5. 웹사이트 확인
```bash
# 사용한 커맨드: Bash
# 포트는 상황에 따라 자동 설정 (기본값: 3004)
start http://localhost:[자동설정포트]
```

---

## 📚 참고 문서

### 필수 참고 사항
1. **Next.js 15 문서**: App Router 패턴
2. **React 19 문서**: 최신 기능 활용
3. **Tailwind CSS 4**: 스타일링 가이드
4. **Playwright**: E2E 테스트 작성법

### 프로젝트 특화 문서
- `BACKEND_API_DOCUMENTATION.md`: API 스펙
- `PENSION_DASHBOARD_ARCHITECTURE.md`: 연기금 아키텍처
- `components/pension/STYLING_GUIDE.md`: 스타일 가이드

---

## ⚡ 성능 최적화

### 성능 기준 (필수 준수)
- **로딩 시간**: < 3초 (절대 한계)
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

### 필수 최적화 방법 (3초 로딩 달성)
1. **이미지 최적화**: Next.js Image 컴포넌트, WebP 포맷
2. **코드 스플리팅**: 동적 import, 라우트별 분할
3. **캐싱**: Redis 데이터 캐싱, CDN 활용
4. **번들 최적화**: Tree shaking, 불필요한 라이브러리 제거
5. **서버 최적화**: API 응답 시간 < 500ms
6. **리소스 압축**: Gzip/Brotli 압축 활성화
7. **프리로딩**: Critical CSS, 폰트 preload
8. **지연 로딩**: 뷰포트 외부 컨텐츠 lazy loading

---

## 🚨 에러 처리

### ErrorBoundary 사용
```tsx
// 모든 페이지에서 ErrorBoundary 적용
<ErrorBoundary level="section">
  <YourComponent />
</ErrorBoundary>
```

### API 에러 처리
```typescript
// 일관된 에러 응답 형식
return NextResponse.json(
  { 
    error: 'Error message',
    code: 'ERROR_CODE',
    timestamp: new Date().toISOString()
  },
  { status: 500 }
);
```

---

## 📈 모니터링 및 분석

### 필수 추적 지표
- 페이지 로딩 시간
- API 응답 시간
- 에러 발생률
- 사용자 행동 패턴

### 로깅
- 개발 환경: 상세 로그
- 프로덕션 환경: 에러 로그만

---

## 🔒 보안 가이드라인

### API 보안
- 입력 값 검증 (Zod 사용)
- SQL 인젝션 방지
- XSS 방지
- CORS 설정

### 환경 변수
- `.env.local` 사용
- 민감 정보 암호화
- 프로덕션 키 별도 관리

---

**🎯 기억하세요**: 모든 개발 작업에서 위의 6가지 필수 사항을 반드시 준수해야 합니다:

1. **최대한 다양하고 시기 적절한 수퍼 클로드 커맨드들을 사용하고 어떤 커맨드를 사용했는지 밝혀라**
2. **대표적인 MCP(Sequential, Context7, Magic)를 적극 활용하고 사용하면 밝혀라**
3. **모든 테스트는 Playwright를 활용하여 끝낸다**
4. **테스트가 종료되면 해당 서비스를 웹사이트에 열어서 보여준다** 
5. **각 페이지마다 참고해야할 내역을 CLAUDE.md에 적는다**
6. **로딩은 3초를 넘으면 안 된다** (절대 성능 기준)

---

## 🚀 SuperClaude 시스템 통합

### SuperClaude Entry Point

SuperClaude 프레임워크가 자동으로 다음 시스템들을 로드합니다:

- `@COMMANDS.md` - 16개 슬래시 명령어 시스템
- `@FLAGS.md` - 플래그 시스템 및 자동 활성화  
- `@PERSONAS.md` - 11개 전문가 페르소나 시스템
- `@ORCHESTRATOR.md` - 지능형 라우팅 시스템
- `@MCP.md` - MCP 서버 통합 (Context7, Sequential, Magic, Playwright)
- `@PRINCIPLES.md` - 개발 원칙 및 철학
- `@RULES.md` - 실행 가능한 운영 규칙
- `@MODES.md` - 3가지 운영 모드 (Task Management, Introspection, Token Efficiency)

### SuperClaude `/sc:` 명령어 활용

SuperClaude v3.0.0.2가 설치되어 있으므로 다음 명령어들도 활용할 수 있습니다:

#### 🔍 **분석 명령어**
- `/sc:analyze` - 코드 및 시스템 분석 (사용 시 명시 필요)
- `/sc:troubleshoot` - 문제 조사 및 디버깅 (사용 시 명시 필요)
- `/sc:explain` - 교육적 설명 및 가이드 (사용 시 명시 필요)

#### 🏗️ **개발 명령어**  
- `/sc:implement` - 기능 및 컴포넌트 구현 (사용 시 명시 필요)
- `/sc:build` - 프로젝트 빌드 및 배포 준비 (사용 시 명시 필요)
- `/sc:design` - 시스템 설계 및 아키텍처 (사용 시 명시 필요)

#### ✨ **품질 개선 명령어**
- `/sc:improve` - 코드 품질 및 성능 개선 (사용 시 명시 필요)
- `/sc:cleanup` - 기술 부채 정리 및 정리 (사용 시 명시 필요)
- `/sc:test` - 테스트 실행 및 품질 보증 (사용 시 명시 필요)

#### 📝 **문서화 및 관리**
- `/sc:document` - 문서 생성 및 업데이트 (사용 시 명시 필요)
- `/sc:git` - Git 워크플로우 지원 (사용 시 명시 필요)
- `/sc:workflow` - 워크플로우 생성 및 관리 (사용 시 명시 필요)

#### 📊 **메타 명령어**
- `/sc:index` - 명령어 네비게이션 (사용 시 명시 필요)
- `/sc:load` - 프로젝트 컨텍스트 로드 (사용 시 명시 필요)
- `/sc:estimate` - 작업 추정 및 계획 (사용 시 명시 필요)
- `/sc:task` - 장기 프로젝트 관리 (사용 시 명시 필요)
- `/sc:spawn` - 복잡한 워크플로우 오케스트레이션 (사용 시 명시 필요)

### SuperClaude 플래그 활용

#### 🧠 **분석 플래그**
- `--think` - 다중 파일 분석 (~4K 토큰)
- `--think-hard` - 깊은 아키텍처 분석 (~10K 토큰)  
- `--ultrathink` - 최대 깊이 분석 (~32K 토큰)

#### 🔗 **MCP 서버 플래그**
- `--c7` / `--context7` - Context7 MCP 활성화
- `--seq` / `--sequential` - Sequential MCP 활성화
- `--magic` - Magic MCP 활성화 (UI 컴포넌트)
- `--play` / `--playwright` - Playwright MCP 활성화

#### ⚡ **효율성 플래그**
- `--uc` / `--ultracompressed` - 토큰 압축 모드 (30-50% 절약)
- `--safe-mode` - 보수적 실행 모드
- `--validate` - 사전 검증 및 위험 평가

#### 🎯 **페르소나 플래그**
- `--persona-architect` - 시스템 아키텍처 전문가
- `--persona-frontend` - UX 및 접근성 전문가
- `--persona-backend` - 안정성 및 API 전문가
- `--persona-security` - 보안 및 위협 모델링 전문가
- `--persona-performance` - 최적화 전문가
- `--persona-scribe=ko` - 전문 문서화 (한국어)

### 통합 워크플로우 예시

```bash
# 1. 프로젝트 분석 및 이해
/sc:load --deep --summary

# 2. 보안 중심 코드 분석
/sc:analyze --focus security --persona-security --seq

# 3. UI 컴포넌트 구현
/sc:implement dashboard component --persona-frontend --magic

# 4. 성능 최적화
/sc:improve --focus performance --persona-performance --validate

# 5. 문서화
/sc:document --persona-scribe=ko --type guide

# 6. 테스트 및 검증
/sc:test --play --coverage
```

### SuperClaude 지능형 시스템

#### 🧠 **페르소나 시스템 (11개 전문가)**
- `--persona-architect` - 시스템 아키텍처 전문가
- `--persona-frontend` - UX 및 접근성 전문가  
- `--persona-backend` - 안정성 및 API 전문가
- `--persona-security` - 보안 및 위협 모델링 전문가
- `--persona-performance` - 최적화 전문가
- `--persona-analyzer` - 근본원인 분석 전문가
- `--persona-qa` - 품질보증 및 테스트 전문가
- `--persona-refactorer` - 코드품질 및 기술부채 전문가
- `--persona-devops` - 인프라 및 배포 전문가
- `--persona-mentor` - 교육 및 지식전수 전문가
- `--persona-scribe=ko` - 전문 문서화 (한국어)

#### 🎯 **지능형 라우팅 시스템**
- **자동 활성화**: 작업 복잡도와 도메인에 따른 페르소나 자동 선택
- **MCP 조정**: Context7, Sequential, Magic, Playwright 서버 지능형 선택
- **품질 게이트**: 8단계 검증 사이클 (구문 → 타입 → 린트 → 보안 → 테스트 → 성능 → 문서 → 통합)
- **Wave 오케스트레이션**: 복잡도 ≥0.7일 때 다단계 지능형 실행

#### 🔧 **운영 모드**
- **Task Management**: 구조화된 워크플로우 실행 (TodoRead/TodoWrite)
- **Introspection**: 추론과정 투명성 (`--introspect`)  
- **Token Efficiency**: 지능형 압축 (`--uc`, 30-50% 절약)

**📌 SuperClaude 시스템 적극 활용 + 사용 내역 명시 (둘 다 필수):**
- **적극 활용**: 모든 SuperClaude 기능을 최대한 활용
- **반드시 명시**: `/sc:` 명령어, 플래그, 페르소나, MCP 서버, 라우팅 결과, 품질 게이트

---

> 📝 **마지막 업데이트**: 2025-08-13  
> 💬 **문의사항**: 이 가이드라인에 대한 질문이나 개선사항이 있으면 언제든지 알려주세요.
> 🚀 **SuperClaude 통합**: v3.0.0.2 설치 완료 및 가이드라인 통합