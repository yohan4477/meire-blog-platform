# 📄 개별 포스트 페이지 요구사항 (`/merry/[id]`)

> **메르의 개별 블로그 포스트를 상세히 표시하는 포스트 페이지**

## 🎯 페이지 개요
- **페이지 경로**: `/merry/[id]` (동적 라우팅)
- **담당 파일**: `src/app/merry/[id]/page.tsx`  
- **목적**: 메르의 개별 블로그 포스트 상세 내용 표시 및 상호작용

## 🔗 연결 진입점
- **포스트 목록에서**: `/merry` 포스트 카드 클릭 시
- **종목 페이지에서**: `/merry/stocks/[ticker]` 관련 포스트 링크 클릭 시
- **검색 결과에서**: 검색 결과 포스트 클릭 시
- **직접 URL 접근**: 공유 링크나 북마크를 통한 직접 접근

## 🏷️ **동적 태그 표시 시스템** (핵심 기능)

### 🚨 **절대 원칙: 글이 없으면 태그를 생성하지 말라**
- **실제 내용 기반 표시**: 포스트에 실제로 존재하는 내용만 태그로 표시
- **가짜 태그 생성 절대 금지**: 포스트에 언급되지 않은 종목, 테마, 감정 절대 표시 금지
- **NULL 처리**: 해당 정보가 없으면 해당 태그 영역 자체를 표시하지 않음
- **투명성**: 사용자가 태그를 보고 실제 글 내용과 연결할 수 있어야 함

### 태그 데이터 소스 (blog_posts 테이블)
- **mentioned_stocks** (TEXT): 실제 언급된 종목명만 (쉼표 구분)
- **investment_theme** (TEXT): 글에서 다룬 실제 투자 테마
- **sentiment_tone** (TEXT): 글의 실제 감정 톤 (긍정적/중립적/부정적)

### 태그 표시 규칙
- **우선순위**: 언급 종목 (최대 2개) → 투자 테마 → 감정 톤 (이모지 포함)
- **감정 표시**: 😊긍정적, 😐중립적, 😰부정적 이모지와 함께 표시
- **NULL 처리**: 모든 필드가 비어있을 경우에만 기본 태그 ['투자', '분석'] 표시
- **클릭 기능**: 종목 태그 클릭 시 `/merry/stocks/[ticker]`로 이동

## 📝 포스트 콘텐츠 구조

### 📋 헤더 섹션
- **포스트 제목**: H1 태그, text-foreground, 다크 모드 지원
- **메타 정보**: 작성자(메르), 작성일, 조회수, 좋아요 수, 댓글 수
- **동적 태그**: 위 규칙에 따른 실제 내용 기반 태그 표시
- **공유 버튼**: 소셜 미디어 공유 (Twitter, 카카오톡, URL 복사)

### 💡 **Claude 직접 분석 카드 시스템** (핵심 신기능)

#### 🚨 **절대 원칙: Claude 직접 수동 분석만 허용**
- **Claude 직접 분석**: API, 키워드, 패턴 분석 절대 금지, Claude가 포스트를 읽고 직접 분석
- **post_analysis 테이블**: 3개 필드로 구성된 별도 분석 데이터 관리
- **수동 분석 시스템**: 자동화 금지, Claude가 포스트별로 수동 분석 수행
- **투명성**: 분석 결과가 없으면 해당 카드 자체를 표시하지 않음

#### 🎯 **올바른 카드 표시 순서 및 역할** (메르님 말씀 포맷 적용)

**📋 카드 표시 순서 (순차적 의존성)**:
1. **💬 메르님 한줄 코멘트** (기존 카드) → 본문에서 추출, 가장 핵심적 요약
2. **📝 코멘트 풀이** (신규) → 한줄 코멘트를 이해 못하는 독자를 위한 친절한 상세 설명
3. **💡 핵심 한줄 요약** (신규) → 코멘트+풀이+본문 종합하여 Claude가 재정리한 한 줄
4. **🎯 투자 인사이트** (신규) → 전체 내용을 토대로 투자 관점에서 도출한 통찰

**1️⃣ 💬 메르님 한줄 코멘트** (기존 - 전문적 무채색 카드, 본문에서 추출)

**📋 카드 스타일링 (전문적 무채색 테마)**:
```tsx
{/* 전체 컨테이너 - 번쩍임 효과 */}
<div className="mb-8 relative overflow-hidden">
  {/* 무채색 배경 그라데이션 */}
  <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 via-slate-100/30 to-gray-100/50 dark:from-gray-900/30 dark:via-slate-900/20 dark:to-gray-900/30 rounded-2xl" />
  
  {/* 메인 카드 */}
  <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-6">
    {/* 헤더 섹션 */}
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-shrink-0">
        {/* 아이콘 배경 - 차콜 그레이 그라데이션 */}
        <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 rounded-xl flex items-center justify-center shadow-lg border">
          <span className="text-white text-lg">💡</span>
        </div>
      </div>
      <div className="flex-1">
        {/* 제목 - 차콜 그레이 그라데이션 텍스트 */}
        <h3 className="text-lg font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
          메르님 한 줄 코멘트
        </h3>
      </div>
    </div>
    
    {/* 코멘트 내용 */}
    <div className="relative">
      {/* 좌측 액센트 라인 - 그레이 그라데이션 */}
      <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-600 rounded-full" />
      <blockquote className="pl-6 text-gray-700 dark:text-gray-300 leading-relaxed">
        <div className="text-base font-medium">
          {/* 메르님 코멘트 텍스트 */}
        </div>
      </blockquote>
    </div>
  </div>
</div>
```

**🎨 무채색 테마 색상 시스템**:
- **배경 그라데이션**: `from-gray-100/50 via-slate-100/30 to-gray-100/50` (라이트)
- **다크 배경**: `from-gray-900/30 via-slate-900/20 to-gray-900/30` (다크)
- **카드 테두리**: `border-gray-200/50` (라이트), `border-gray-700/50` (다크)
- **아이콘 배경**: `from-slate-700 to-slate-900` (차콜 그레이 그라데이션)
- **제목 그라데이션**: `from-slate-700 to-slate-900` (라이트), `from-slate-300 to-slate-100` (다크)
- **액센트 라인**: `from-slate-600 to-slate-800` (그레이 그라데이션)

**💼 전문성 향상 포인트**:
- **신뢰감 있는 색상**: 금융/투자 업계 표준 차콜 그레이 사용
- **프리미엄 효과**: `shadow-lg`, `backdrop-blur-sm`, `border` 조합
- **일관된 톤**: 전체 무채색 그레이 톤으로 통일감
- **다크모드 최적화**: 라이트/다크 모드 완벽 호환

- **데이터 소스**: 포스트 본문의 "한줄 코멘트" 섹션
- **역할**: 메르가 작성한 가장 핵심적인 요약
- **번쩍임 효과**: 무채색 그레이 톤 번쩍임으로 전문적 느낌

**2️⃣ 📝 코멘트 풀이** (신규 - 표준 카드 스타일, 독자 이해 지원)

**📋 카드 스타일링 (표준 통일 스타일)**:
```tsx
{/* 표준 카드 스타일 - 모든 분석 카드 공통 */}
<div className="bg-card rounded-xl p-5 border">
  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
    <span>📝</span>
    <span>코멘트 풀이</span>
  </h3>
  <p 
    className="text-base text-foreground leading-relaxed break-keep"
    dangerouslySetInnerHTML={{
      __html: postData.analysis.explanation
        .replace(/\\n/g, '\n')
        .replace(/\n/g, '<br/>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
    }}
  />
</div>
```

**🎯 핵심 원칙: 한줄 코멘트의 핵심 용어/개념을 구체적으로 설명**

**📋 Claude 분석 방법론** (하드코딩 방지, 체계적 접근):

1. **🔍 핵심 용어 추출**: 한줄 코멘트에서 일반인이 모를 수 있는 전문 용어 식별
   - 예: "MMR", "SMR", "사용후 핵연료", "파이로프로세싱" 등
   
2. **📖 본문 컨텍스트 매칭**: 해당 용어가 본문에서 어떻게 설명되었는지 찾기
   - 본문의 관련 설명 문단 식별 
   - 핵심 정의와 중요성 파악
   
3. **🎯 연결 설명**: 왜 메르가 이 용어로 코멘트했는지 논리적 연결
   - 상황 배경 → 핵심 용어 의미 → 투자적 중요성

**✅ 올바른 풀이 예시** (OKLO 포스트 기준):
```
메르가 "MMR은 각각 장단점이 있다"라고 한 이유를 이해하려면 MMR이 무엇인지 알아야 합니다. 

MMR(마이크로 모듈 원자로)은 SMR보다 50배 작은 초소형 원자로로, 트럭 1대로 이동 가능하며 AI 데이터센터나 군사기지에 1대1로 매칭할 수 있습니다. 

핵심은 '사용후 핵연료를 재활용할 수 있다'는 점입니다. 기존 원전에서 나오는 방사성 폐기물을 새로운 연료로 재사용함으로써, 폐기물 처리 문제를 해결하면서 동시에 전력을 생산하는 혁신적 기술입니다.

이것이 중요한 이유는 한국에 4만4천톤의 사용후 핵연료가 쌓여있는 상황에서, MMR 기술이 성공하면 이 모든 폐기물이 귀중한 에너지 자원으로 바뀔 수 있기 때문입니다.
```

**❌ 피해야 할 추상적 설명**:
- "오클로의 비즈니스 모델이 변화하고 있다" (무엇이 어떻게?)
- "AI 데이터센터 업체로 주목받고 있다" (왜? 어떤 기술로?)
- "트럼프 정책의 수혜를 받는다" (구체적으로 어떤 정책?)

```tsx
{/* 한줄 코멘트의 핵심 용어/개념을 구체적으로 설명 */}
<div className="bg-card rounded-xl p-5 border">
  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
    <span>📝</span>
    <span>코멘트 풀이</span>
  </h3>
  <p className="text-base text-foreground leading-relaxed break-keep">
    {/* Claude 분석 방법론 적용:
         1. 핵심 용어 추출 (MMR, SMR 등)
         2. 본문 컨텍스트 매칭 (해당 용어 설명 찾기)  
         3. 연결 설명 (왜 그렇게 코멘트했는지)
    */}
  </p>
</div>
```

**3️⃣ 💡 핵심 한줄 요약** (신규 - 표준 카드 스타일, 종합 정리)

**📋 카드 스타일링 (투자 인사이트와 동일 스타일)**:
```tsx
{/* 표준 카드 스타일 - 투자 인사이트와 통일 */}
<div className="bg-card rounded-xl p-5 border">
  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
    <span>💡</span>
    <span>핵심 한줄 요약</span>
  </h3>
  <p className="text-base lg:text-lg leading-relaxed text-foreground font-medium break-keep">
    "{postData.analysis.summary}"
  </p>
</div>
```

**🎯 핵심 원칙: 코멘트의 핵심 용어를 중심으로 투자 포인트를 한 줄로 압축**

**📋 Claude 분석 방법론** (하드코딩 방지, 체계적 접근):

1. **🔍 핵심 기술/개념 식별**: 코멘트 풀이에서 설명한 가장 중요한 기술적 차별점
   - 예: MMR → "사용후 핵연료 재활용", SMR → "소형 모듈화", AI → "데이터센터 전력"
   
2. **💼 투자적 가치 연결**: 해당 기술이 왜 투자적으로 중요한지 핵심 이유
   - 시장 크기, 문제 해결, 경쟁 우위, 정책 지원 등
   
3. **⚡ 한 줄 압축**: 기술적 핵심 + 투자적 가치를 한 문장으로 결합
   - 형식: "[기업]은 [핵심기술]로 [투자가치]를 실현할 수 있는 포지션"

**✅ 올바른 요약 예시** (OKLO 포스트 기준):
```
오클로는 MMR 기술로 4만4천톤의 사용후 핵연료를 에너지 자원으로 전환하며, 폐기물 처리 문제 해결과 AI 전력 공급이라는 두 시장을 동시에 공략할 수 있는 유일한 포지션
```

**❌ 피해야 할 추상적 요약**:
- "트럼프 정책의 수혜를 받을 것" (구체적 기술 없음)
- "AI 데이터센터 업체로 포지셔닝" (차별점 없음)
- "원자력 정책과 AI 투자의 교집점" (기술적 우위 없음)

```tsx
{/* 코멘트의 핵심 용어를 중심으로 투자 포인트 압축 */}
<div className="relative">
  <div className="absolute left-0 top-0 w-1 h-full bg-primary rounded-full"></div>
  <div className="pl-6">
    <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1">
      <span>💡</span>
      <span>핵심 한줄 요약</span>
    </h3>
    <p className="text-base lg:text-lg leading-relaxed text-foreground font-medium break-keep">
      "{/* Claude 분석 방법론 적용:
           1. 핵심 기술/개념 식별 (MMR, 사용후 핵연료 재활용)
           2. 투자적 가치 연결 (폐기물 처리 + AI 전력)  
           3. 한 줄 압축 (유일한 포지션으로 결합)
      */}"
    </p>
  </div>
</div>
```

**4️⃣ 🎯 투자 인사이트** (신규 - 표준 카드 스타일, 투자 통찰)

**📋 카드 스타일링 (핵심 요약과 동일 스타일)**:
```tsx
{/* 표준 카드 스타일 - 핵심 요약과 통일 */}
<div className="bg-card rounded-xl p-5 border">
  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
    <TrendingUp className="w-4 h-4" />
    <span>🎯 투자 인사이트</span>
  </h3>
  <p className="text-base text-foreground leading-relaxed break-keep">
    {/* 2문장 이내 간결한 투자 통찰 */}
    {postData.analysis.investment_insight}
  </p>
</div>
```

**📝 투자 인사이트 내용 형식**:
- **문장 길이**: 최대 2문장, 핵심 요약과 동일한 간결함
- **렌더링**: `dangerouslySetInnerHTML` 사용하지 않고 단순 텍스트
- **포맷**: 핵심 한줄 요약과 동일한 텍스트 스타일

#### post_analysis 테이블 구조
```sql
CREATE TABLE post_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_no INTEGER NOT NULL,
    summary TEXT,          -- 한줄 정리 (메르님 말씀용)
    explanation TEXT,      -- 설명 (독자 이해용)  
    investment_insight TEXT, -- 투자 인사이트 (메르님 말씀 + 포스트용)
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_no) REFERENCES blog_posts(log_no) ON DELETE CASCADE,
    UNIQUE(log_no)
);
```

#### 데이터 연동 규칙
- **한줄 정리 + 투자 인사이트**: 메르님 말씀 (`/api/today-merry-quote`) 연동
- **설명 + 투자 인사이트**: 포스트 페이지 (`/api/merry/posts/[id]`) 연동
- **NULL 처리**: 분석 데이터 없으면 해당 카드 표시하지 않음
- **Claude 직접**: 스크립트나 API 없이 Claude가 포스트 읽고 수동 분석

### 📄 본문 섹션

**📋 본문 카드 스타일링 (표준 통일 스타일)**:
```tsx
{/* 📖 본문 카드 - 통일된 스타일링 */}
<div className="bg-card rounded-xl p-5 border mb-8">
  <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
    <span>📖</span>
    <span>본문</span>
  </h3>
  <div className="prose prose-lg dark:prose-invert max-w-none">
    {/* 파싱된 본문 내용 - "메르님 한 줄 요약" 텍스트 제거됨 */}
    {cleanedContent}
  </div>
</div>
```

**🧹 본문 전처리 규칙**:
- **요약 텍스트 제거**: `parseContentWithSummary()` 함수로 "메르님 한 줄 요약" 섹션 자동 제거
- **중복 방지**: 한 줄 코멘트 카드에 표시된 내용이 본문에 중복 표시되지 않음
- **깔끔한 본문**: 순수한 본문 내용만 카드로 표시

**📝 콘텐츠 처리**:
- **Markdown 지원**: HTML 렌더링 및 마크다운 구문 지원
- **이미지 최적화**: Next.js Image 컴포넌트 사용
- **코드 하이라이팅**: 코드 블록에 syntax highlighting 적용
- **링크 처리**: 외부 링크는 새 탭 열기, 내부 링크는 SPA 네비게이션
- **목차 생성**: 긴 포스트의 경우 자동 목차 생성 (H2, H3 태그 기반)

### 🔗 관련 정보 섹션
- **언급된 종목**: 포스트에서 실제 언급된 종목 목록 및 차트 링크
- **관련 포스트**: 같은 종목이나 테마를 다룬 다른 포스트 추천
- **네비게이션**: 이전/다음 포스트 이동 버튼

## 🎨 UI/UX 요구사항

### 📋 **카드 시스템 통일성 (핵심 디자인 원칙)**

**🎯 카드 스타일 분류**:
1. **💬 메르님 한 줄 코멘트**: 특별한 프리미엄 스타일 (무채색 번쩍임 효과)
2. **📝📖💡🎯 분석 카드들**: 표준 통일 스타일 (`bg-card rounded-xl p-5 border`)

**📏 표준 카드 스타일 규격**:
```css
/* 모든 분석 카드 공통 스타일 */
.analysis-card {
  background: bg-card;           /* 시맨틱 카드 배경 */
  border-radius: rounded-xl;     /* 12px 모서리 */
  padding: p-5;                  /* 20px 내부 여백 */
  border: border;                /* 시맨틱 테두리 */
}

/* 카드 헤더 공통 스타일 */
.card-header {
  font-size: text-sm;            /* 14px */
  font-weight: font-semibold;    /* 600 */
  color: text-primary;           /* 시맨틱 primary */
  margin-bottom: mb-3;           /* 12px */
  gap: gap-2;                    /* 8px */
}

/* 카드 콘텐츠 공통 스타일 */
.card-content {
  font-size: text-base;          /* 16px */
  color: text-foreground;        /* 시맨틱 전경색 */
  line-height: leading-relaxed;  /* 1.625 */
  word-break: break-keep;        /* 한글 줄바꿈 */
}
```

**🎨 시각적 일관성 규칙**:
- **간격 통일**: 모든 카드 `mb-8` (32px 하단 여백)
- **아이콘 통일**: 이모지(16px) + Lucide 아이콘(16px) 조합
- **색상 통일**: 시맨틱 색상 (`text-primary`, `text-foreground`, `bg-card`, `border`)
- **타이포그래피**: 헤더 `text-sm font-semibold`, 내용 `text-base`

**🌈 다크 모드 호환성**:
- **시맨틱 색상**: 모든 카드 Tailwind 시맨틱 색상 사용
- **자동 적응**: 라이트/다크 모드 자동 색상 전환
- **테두리 일관성**: 모든 카드 동일한 `border` 클래스

### 📱 반응형 디자인
- **데스크톱**: 최대 너비 800px, 중앙 정렬
- **태블릿**: 좌우 패딩 24px, 읽기 최적화
- **모바일**: 좌우 패딩 16px, 터치 최적화된 버튼 크기

### 🌈 다크 모드 지원
- **색상 시스템** (필수):
  ```css
  /* ✅ 다크 모드 호환 색상 */
  text-foreground        /* 포스트 제목, 본문 텍스트 */
  text-muted-foreground  /* 메타 정보, 부가 설명 */
  bg-card                /* 포스트 배경 */
  border                 /* 구분선, 테두리 */
  
  /* ❌ 사용 금지 색상 */
  text-gray-900         /* 하드코딩된 회색 */
  bg-white             /* 하드코딩된 배경 */
  text-gray-600        /* 하드코딩된 회색 */
  ```

### ⚡ 읽기 경험 최적화
- **타이포그래피**: 가독성 높은 폰트 크기 및 줄 간격
- **스크롤 진행률**: 페이지 상단에 읽기 진행률 표시
- **예상 읽기 시간**: 글자 수 기반 예상 읽기 시간 표시
- **접근성**: 키보드 네비게이션, 스크린 리더 지원

## 📡 API 연동

### 🔗 메인 API: `/api/merry/posts/[id]`

**요청 파라미터**:
```typescript
interface PostRequest {
  id: string;          // 포스트 log_no
}
```

**응답 형식** (post_analysis 테이블 연동):
```typescript
interface PostResponse {
  success: boolean;
  data: {
    log_no: number;              // blog_posts 테이블의 primary key
    title: string;
    content: string;
    excerpt: string;
    author: string;
    created_date: number;        // Unix timestamp (밀리초)
    views: number;
    likes: number;
    comments: number;
    tags: string[];              // 동적 생성된 태그
    mentionedStocks?: string[];  // 실제 언급된 종목 목록
    investmentTheme?: string;    // 실제 투자 테마
    sentimentTone?: string;      // 실제 감정 톤
    
    // 🆕 Claude 직접 분석 결과 (post_analysis 테이블)
    analysis?: {
      summary?: string;          // 한줄 정리 (메르님 말씀용)
      explanation?: string;      // 설명 (독자 이해용)
      investment_insight?: string; // 투자 인사이트
      analyzed_at?: string;      // 분석 일시
    };
  };
}
```

### 🔗 관련 포스트 API: `/api/merry/posts/related?id=[log_no]`

**요청 파라미터**:
```typescript
interface RelatedPostsRequest {
  id: number;            // 현재 포스트 log_no
  limit?: number;        // 추천 포스트 수 (기본: 5)
}
```

**응답 형식**:
```typescript
interface RelatedPostsResponse {
  success: boolean;
  data: {
    byStocks: MerryPost[];       // 같은 종목 언급 포스트
    byTheme: MerryPost[];        // 같은 테마 포스트
    bySentiment: MerryPost[];    // 같은 감정 톤 포스트
  };
}
```

## 🎯 성능 요구사항

### ⚡ 로딩 성능
- **초기 로딩**: < 2초 (CLAUDE.md 성능 기준)
- **API 응답**: < 300ms
- **이미지 로딩**: 지연 로딩으로 초기 렌더링 방해하지 않음
- **코드 하이라이팅**: 비동기 로딩으로 성능 영향 최소화

### 🔄 최적화 전략
- **메타 데이터 우선 로딩**: 제목, 태그, 메타 정보 먼저 표시
- **본문 점진적 로딩**: 본문 내용은 메타 데이터 이후 로딩
- **관련 포스트 지연 로딩**: 본문 로딩 완료 후 관련 포스트 로딩
- **이미지 최적화**: WebP 포맷, 적절한 크기 조정
- **캐싱**: 포스트 내용 12시간 캐시, 조회수는 실시간 업데이트

## 📊 상호작용 기능

### 💬 사용자 참여
- **좋아요 기능**: 클릭으로 좋아요 토글, 실시간 반영
- **공유 기능**: 
  - Twitter: 제목 + URL 자동 포함
  - 카카오톡: 썸네일, 제목, 설명 포함
  - URL 복사: 클립보드 복사 및 성공 알림
- **북마크**: 로컬 스토리지 기반 개인 북마크 기능

### 🔍 검색 및 네비게이션
- **페이지 내 검색**: Ctrl+F 지원, 검색 결과 하이라이팅
- **목차 네비게이션**: 긴 포스트의 섹션 간 빠른 이동
- **브레드크럼**: 홈 > 메르 블로그 > 포스트 제목
- **이전/다음**: 시간순 또는 관련성 기반 포스트 네비게이션

## 📈 SEO 및 메타데이터

### 🔍 검색 엔진 최적화
- **동적 메타 태그**: 포스트 제목, 설명, 키워드 자동 생성
- **Open Graph**: 소셜 미디어 공유 시 미리보기 최적화
- **구조화 데이터**: JSON-LD 형식으로 Article 스키마 적용
- **Canonical URL**: 중복 콘텐츠 방지를 위한 정규 URL 설정

### 🎭 **시각적 계층 구조 (Claude 분석 카드 시스템)**

**📊 중요도별 시각적 가중치**:
1. **💬 메르님 한 줄 코멘트** (최고 중요도)
   - **특별 스타일**: 무채색 번쩍임 효과, 프리미엄 그라데이션
   - **크기**: 가장 큰 카드, 시각적 주목도 최대
   - **위치**: 최상단 배치

2. **📝 코멘트 풀이** (높은 중요도)
   - **표준 스타일**: 통일된 카드 스타일
   - **순서**: 두 번째 배치 (코멘트 직후)

3. **💡 핵심 한줄 요약** (중간 중요도)
   - **표준 스타일**: 투자 인사이트와 동일
   - **순서**: 세 번째 배치

4. **🎯 투자 인사이트** (중간 중요도)
   - **표준 스타일**: 핵심 요약과 동일
   - **순서**: 네 번째 배치

5. **📖 본문** (기본 중요도)
   - **표준 스타일**: 분석 카드와 동일
   - **순서**: 마지막 배치

**🎨 시각적 차별화 전략**:
- **메르님 코멘트**: 유일한 특별 스타일로 차별화
- **분석 카드들**: 통일된 스타일로 일관성 확보
- **아이콘 다양성**: 각 카드마다 고유한 이모지/아이콘 사용
- **내용 길이**: 코멘트(짧음) → 요약(중간) → 풀이(긴 설명)

### 📱 소셜 미디어 최적화
- **Twitter Card**: 제목, 설명, 이미지 포함
- **Facebook OG**: 썸네일, 제목, 설명, 사이트명
- **카카오톡 공유**: 한국어 사용자를 위한 최적화된 공유 정보

## 🧪 테스트 요구사항

### 📋 필수 테스트 시나리오 (Playwright)
1. **포스트 로딩**: 유효한 ID로 포스트 페이지 접근
2. **동적 태그 표시**: 실제 포스트 내용 기반 태그 정확성 확인
3. **가짜 태그 방지**: 내용 없는 포스트에 잘못된 태그 표시되지 않음
4. **카드 시스템 표시**: 모든 Claude 분석 카드 정상 렌더링 확인
5. **메르님 코멘트 스타일**: 무채색 번쩍임 효과 및 프리미엄 스타일 확인
6. **카드 스타일 통일성**: 분석 카드들(`📝📖💡🎯`) 동일한 스타일 확인
7. **본문 전처리**: "메르님 한 줄 요약" 텍스트가 본문에서 제거되었는지 확인
8. **다크 모드**: 모든 텍스트와 배경 색상 정상 표시
9. **반응형**: 모바일/태블릿/데스크톱 레이아웃 확인
10. **공유 기능**: 각 소셜 미디어 공유 버튼 동작
11. **네비게이션**: 이전/다음 포스트 이동 기능
12. **관련 포스트**: 같은 종목/테마 기반 추천 정확성
13. **접근성**: 키보드 네비게이션, 스크린 리더 호환성
14. **성능**: 2초 이내 초기 로딩 완료

### 🎯 특별 테스트 케이스

```typescript
// 카드 시스템 통일성 테스트
test('분석 카드들의 스타일 통일성 확인', async ({ page }) => {
  await page.goto('/merry/223977895361'); // OKLO 포스트
  
  // 모든 분석 카드들이 동일한 클래스 사용하는지 확인
  const analysisCards = page.locator('.bg-card.rounded-xl.p-5.border');
  const cardCount = await analysisCards.count();
  
  // 최소 4개 분석 카드 (코멘트 풀이, 핵심 요약, 투자 인사이트, 본문)
  expect(cardCount).toBeGreaterThanOrEqual(4);
  
  // 각 카드의 헤더 스타일 확인
  const cardHeaders = page.locator('.text-sm.font-semibold.text-primary');
  expect(await cardHeaders.count()).toBeGreaterThanOrEqual(4);
});

// 메르님 한 줄 코멘트 특별 스타일 테스트
test('메르님 한 줄 코멘트의 무채색 번쩍임 효과 확인', async ({ page }) => {
  await page.goto('/merry/223977895361');
  
  // 무채색 배경 그라데이션 확인
  const gradientBg = page.locator('.bg-gradient-to-br.from-gray-100\\/50');
  await expect(gradientBg).toBeVisible();
  
  // 차콜 그레이 아이콘 배경 확인
  const iconBg = page.locator('.bg-gradient-to-br.from-slate-700.to-slate-900');
  await expect(iconBg).toBeVisible();
  
  // 차콜 그레이 제목 텍스트 확인
  const titleText = page.locator('.bg-gradient-to-r.from-slate-700.to-slate-900.bg-clip-text.text-transparent');
  await expect(titleText).toBeVisible();
});

// 본문 전처리 테스트
test('본문에서 메르님 한 줄 요약 텍스트 제거 확인', async ({ page }) => {
  await page.goto('/merry/223977895361');
  
  // 본문 카드 내용 확인
  const mainContent = page.locator('div:has-text("📖") + div');
  
  // "메르님 한 줄 요약", "한줄 코멘트" 텍스트가 본문에 없어야 함
  await expect(mainContent).not.toContainText('메르님 한 줄 요약');
  await expect(mainContent).not.toContainText('한줄 코멘트');
});

// 투자 인사이트 간결성 테스트
test('투자 인사이트의 2문장 제한 확인', async ({ page }) => {
  await page.goto('/merry/223977895361');
  
  // 투자 인사이트 내용 가져오기
  const insightText = await page.locator('div:has-text("🎯 투자 인사이트") + p').textContent();
  
  // 문장 수 계산 (마침표 개수로 추정)
  const sentenceCount = (insightText?.match(/\./g) || []).length;
  expect(sentenceCount).toBeLessThanOrEqual(2);
});
```
```typescript
// 가짜 태그 생성 방지 테스트
test('포스트에 실제 언급되지 않은 종목 태그가 표시되지 않음', async ({ page }) => {
  await page.goto('/merry/1019'); // 파월 잭슨홀 포스트
  
  // 암호화폐 관련 태그가 표시되지 않아야 함
  await expect(page.locator('text=BTC')).not.toBeVisible();
  await expect(page.locator('text=ETH')).not.toBeVisible();
  await expect(page.locator('text=암호화폐')).not.toBeVisible();
});

// 실제 내용 기반 태그만 표시 테스트
test('실제 포스트 내용에 기반한 태그만 표시', async ({ page }) => {
  await page.goto('/merry/[실제_종목_언급_포스트_ID]');
  
  // 실제 언급된 종목만 태그로 표시되어야 함
  const tags = page.locator('[data-testid="post-tags"] span');
  const tagTexts = await tags.allTextContents();
  
  // 각 태그가 실제 포스트 내용과 연관성 있는지 확인
  for (const tag of tagTexts) {
    if (tag !== '투자' && tag !== '분석') {
      await expect(page.locator('article')).toContainText(tag);
    }
  }
});
```

## 🚨 주의사항

### ❌ 금지 사항
- **가짜 태그 생성**: 포스트에 없는 내용 기반 태그 생성 금지
- **하드코딩된 색상**: 다크 모드 비호환 색상 사용 금지
- **더미 데이터**: 실제 포스트 데이터만 사용
- **자동 태그 생성**: AI API나 키워드 매칭으로 태그 자동 생성 금지

### ✅ 필수 준수사항
- **실제 데이터만 표시**: API에서 가져온 실제 포스트 데이터만 사용
- **2초 로딩 제한**: 성능 최적화로 빠른 로딩 보장
- **다크 모드 완전 지원**: 모든 UI 요소 다크 모드 호환
- **접근성 준수**: WCAG 2.1 AA 기준 접근성 보장
- **SEO 최적화**: 검색 엔진 및 소셜 미디어 최적화

---

## 🔗 연결 관계

### 📄 상위 문서
- **`@docs/post-list-page-requirements.md`**: 포스트 목록 페이지에서 개별 포스트로 연결

### 📄 관련 문서
- **`@docs/stock-page-requirements.md`**: 종목 페이지에서 관련 포스트로 연결
- **`@CLAUDE.md`**: 전체 프로젝트 개발 가이드라인

### 📄 데이터 의존성
- **blog_posts 테이블**: 포스트 기본 정보 및 동적 태그 데이터
- **post_analysis 테이블**: Claude 직접 분석 결과 (summary, explanation, investment_insight)
- **post_stock_analysis 테이블**: 감정 분석 결과 (종목별)
- **merry_mentioned_stocks 테이블**: 포스트-종목 연결 관계

### 🎨 **주요 컴포넌트 및 함수**
- **parseContentWithSummary()**: 본문에서 "메르님 한 줄 요약" 섹션 제거
- **메르님 한 줄 코멘트 카드**: 무채색 번쩍임 효과 프리미엄 스타일
- **분석 카드 시스템**: 4개 카드 통일된 표준 스타일
- **동적 태그 시스템**: 실제 포스트 내용 기반 태그 생성
- **다크 모드 호환**: 모든 UI 시맨틱 색상 사용

---

## 📝 요약

**개별 포스트 페이지는 "글이 없으면 태그를 생성하지 말라" 원칙을 준수하여 실제 포스트 내용만을 기반으로 한 동적 태그 시스템과 Claude 직접 분석 카드 시스템을 통한 최적화된 읽기 경험을 제공합니다.**

핵심 기능:
1. 🏷️ **실제 내용 기반 태그**: 포스트에 실제 존재하는 정보만 태그로 표시
2. 🧠 **Claude 분석 카드 시스템**: 4단계 분석 카드로 포스트 이해도 극대화
3. 🎨 **통일된 카드 디자인**: 메르님 코멘트 특별 스타일 + 분석 카드 표준 스타일
4. 📄 **최적화된 읽기**: 2초 이내 로딩, 반응형 디자인, 접근성 지원
5. 🔗 **스마트 연결**: 관련 포스트, 종목 페이지 연결
6. 🌙 **완벽한 다크 모드**: 시맨틱 색상으로 라이트/다크 모드 완전 호환
7. 📱 **소셜 최적화**: 검색 엔진 및 소셜 미디어 최적화

**🎯 Claude 분석 시스템의 혁신**:
- **💬 메르님 한 줄 코멘트**: 전문적 무채색 프리미엄 스타일
- **📝 코멘트 풀이**: 독자 이해를 위한 친절한 설명
- **💡 핵심 한줄 요약**: Claude가 종합 정리한 핵심 포인트
- **🎯 투자 인사이트**: 투자 관점의 핵심 통찰
- **📖 본문**: 깔끔하게 전처리된 원본 내용