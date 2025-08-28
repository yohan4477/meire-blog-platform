# 🚀 Meire Blog Platform - 수퍼 클로드 개발 가이드라인

> **요르의 투자 블로그** 플랫폼을 위한 포괄적인 개발 가이드라인입니다.
> 모든 코드 작성 시 이 문서를 반드시 참고하여 일관성과 품질을 보장합니다.

---

## 📋 필수 개발 프로세스

### 1. 🛠️ SuperClaude vs Claude Code 명령어 구분 및 적극 활용 (필수)

**모든 개발 작업에서 SuperClaude 명령어를 우선적으로 사용해야 합니다!**

#### 🚀 **SuperClaude 슬래시 커맨드 (1순위 우선 사용) - `/sc:` 접두사**

**🔥 핵심 SuperClaude 명령어들 (반드시 적극 사용):**
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

#### 🛠️ **Claude Code 기본 도구들 (2순위 보조 사용)**

**기본 Claude Code 도구들은 SuperClaude 보완용으로만 사용:**
- **Read**: 파일 내용 읽기 (SuperClaude 명령어 실행 전 컨텍스트 파악용)
- **Edit/MultiEdit**: 파일 수정 (SuperClaude 명령어 실행 결과 적용용)
- **Write**: 새 파일 생성 (SuperClaude 설계 결과 구현용)
- **Glob/Grep**: 파일 검색 (SuperClaude 분석 보조용)
- **Bash**: 명령 실행 (SuperClaude 빌드/테스트 보조용)
- **TodoWrite**: 작업 추적 (SuperClaude 워크플로우 보조용)

#### ⚡ **명령어 사용 우선순위 원칙**

**🥇 1순위**: SuperClaude 명령어 (`/sc:`) 우선 사용
```bash
# ✅ 올바른 사용 예시
/sc:implement user authentication --persona-security
/sc:analyze performance issues --focus backend
/sc:build production deployment --validate
```

**🥈 2순위**: SuperClaude 실행 후 Claude Code 도구로 보완
```bash
# ✅ 올바른 워크플로우
1. /sc:design component architecture    # SuperClaude로 설계
2. Read existing files                  # 기존 코드 파악
3. Write new component                  # 설계 결과 구현
4. /sc:test component functionality     # SuperClaude로 테스트
```

**❌ 잘못된 사용**: Claude Code 도구만 사용
```bash
# ❌ 피해야 할 패턴
1. Read files
2. Edit files  
3. Write files
# → SuperClaude의 지능형 기능을 활용하지 못함
```

#### 🎯 **SuperClaude 필수 사용 시점**

**🔥 반드시 SuperClaude 사용 (절대 생략 불가):**
- **프로젝트 시작**: `/sc:load` (컨텍스트 이해 필수)
- **복잡한 구현**: `/sc:implement --persona-[domain]` (전문성 필요)
- **품질 문제**: `/sc:analyze --focus [issue]` (체계적 분석 필요)
- **시스템 설계**: `/sc:design architecture` (아키텍처 설계 필요)
- **성능 최적화**: `/sc:improve --performance` (최적화 전략 필요)
- **배포 전**: `/sc:test --play` (E2E 검증 필수)
- **기술 부채**: `/sc:cleanup technical-debt` (체계적 정리 필요)

**💡 선택적 SuperClaude 사용:**
- **단순 파일 수정**: 기본 Edit 도구 가능, 하지만 `/sc:improve` 권장
- **문서 업데이트**: 기본 Write 가능, 하지만 `/sc:document` 권장
- **반복 작업**: 패턴 확실시 기본 도구 가능

**📌 SuperClaude 사용 강제 원칙:**
- **복잡도 ≥0.5**: 무조건 SuperClaude 사용
- **새로운 기능**: 무조건 `/sc:implement` 사용
- **버그 수정**: 무조건 `/sc:troubleshoot` 사용
- **성능 이슈**: 무조건 `/sc:analyze --performance` 사용

**🚨 사용 내역 명시 의무 (절대 준수):**
- **사용한 SuperClaude 명령어**: `/sc:` 명령어명 및 플래그
- **사용 목적 및 시점**: 왜, 언제 사용했는지
- **결과 및 효과**: 어떤 결과를 얻었는지
- **Claude Code 보조 도구**: 어떤 기본 도구를 보완적으로 사용했는지

**🚨 날짜/타임스탬프 처리 원칙 (필수):**
- **Unix timestamp는 밀리초 단위**: JavaScript Date.now() 형식 (1755879515528)
- **2025년 8월 날짜는 정상**: 1755879515528 = 2025-08-23 01:18:35 (한국시간)
- **created_date는 올바른 형식**: 밀리초 타임스탬프로 저장됨
- **날짜 검증 금지**: 타임스탬프가 미래 날짜라고 오해하지 말 것

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

### 3. 🗄️ 데이터 캐싱 정책 (중요)

**절대 변경하지 않는 데이터 (영구 보존)**:
- **종가 데이터**: 한 번 저장된 종가는 절대 변경 불가
- **메르 포스트**: 작성된 포스트 내용은 불변

**실시간 업데이트 데이터 (캐시 무효화 지원)**:
- **메르's Pick**: 실시간 DB 연동으로 즉시 반영
- **주식 실시간 정보**: 현재가, 등락률 등
- **통계 데이터**: 집계 정보, 순위 등
- **UI 관련 데이터**: 레이아웃, 표시 설정 등

**캐시 무효화 전략 (2단계)**:
```javascript
// 1단계: 짧은 캐시 (30초) - 일반 사용
'Cache-Control': 'public, max-age=30, s-maxage=30, must-revalidate'

// 2단계: 완전 무효화 - 실시간 업데이트 시
'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
'Pragma': 'no-cache'
'Expires': '0'

// 클라이언트 사이드 캐시 버스터
`/api/merry/picks?limit=${limit}&t=${Date.now()}`

// 캐시 비우기 불가능한 항목 (DB 직접 관리)
- stock_prices 테이블 (종가)
- blog_posts 테이블 (메르 포스트)
- post_stock_sentiments (감정 분석 결과)
```

### 4. 🤖 Claude 직접 업데이트 시스템 (중요)

**Claude가 직접 F12 네트워크 분석을 통해 자동으로 업데이트를 수행합니다:**

#### Claude 직접 업데이트 원칙:
- **크롤링 스크립트 금지**: 별도 스크립트 사용 안함 (automated-crawl.js, node-scheduler.js, claude-automated-scheduler.js 삭제됨)
- **Claude 직접 수행**: F12 네트워크 탭 방식으로 Claude가 직접 데이터 수집
- **자동 트리거**: 시스템이 자동으로 Claude에게 업데이트 요청
- **핵심 문서**: `@docs/update-requirements.md` - Claude가 이 문서를 참조하여 업데이트 수행
- **메르 블로그 URL**: https://m.blog.naver.com/ranto28 (모바일 버전 우선 사용)

#### Claude 업데이트 프로세스 (`update-requirements.md` 기준):
1. **포스트 크롤링**: Claude가 F12 네트워크 방식으로 메르 블로그 직접 분석
2. **종목 추출**: Claude가 포스트 내용에서 언급된 종목 직접 분석
3. **메르's Pick 갱신**: Claude가 최근 언급 종목 자동 업데이트
4. **종가 데이터 수집**: Claude가 메르가 언급한 종목의 주가 데이터 수집
5. **감정 분석**: Claude가 포스트 내용을 직접 분석하여 감정 판단
6. **🔥 메르님 한줄 코멘트 분석**: Claude가 메르님의 한줄 코멘트에서 핵심 투자 관점 추출
7. **💡 투자 인사이트 도출**: Claude가 포스트 전체에서 투자 테마, 리스크, 기회요인 분석

#### 🚨 **"분석해줘" 요청 시 필수 수행 8단계 (절대 생략 불가)**:

**📋 완전 분석 프로세스** (`post-analysis-automation.md` 참조):

1. **📝 포스트 크롤링**: RSS 피드에서 새 포스트 발견 및 database.db 저장
2. **🏢 종목 추출**: stocks 테이블에 종목 추가/업데이트, mention_count 갱신
3. **💭 감정 분석**: post_stock_analysis 테이블에 Claude 직접 분석 결과 저장
4. **🔥 메르님 한줄 코멘트**: 포스트 끝 "한 줄 코멘트:" 추출하여 excerpt 저장
5. **💡 투자 인사이트**: 투자 테마, 경쟁 구도, 기회/리스크 요소 분석
6. **🗄️ post_analysis 저장**: summary(한줄코멘트) + investment_insight 테이블 저장
7. **📈 메르's Pick 확인**: /api/merry/picks에서 새 종목 반영 검증
8. **🌐 웹사이트 검증**: /api/today-merry-quote에서 "오늘의 메르님 말씀" 표시 확인

**🎯 성공 기준**: `start http://localhost:3004` 메인 페이지에서 메르님 한줄 코멘트와 투자 인사이트 즉시 확인 가능

#### CLAUDE.md 철학 준수:
- **✅ 허용**: Claude 직접 분석, F12 네트워크 방식, 사용자 요청 및 자동 트리거 기반 작업
- **❌ 금지**: 별도 크롤링 스크립트, 외부 AI API, 키워드 기반 자동 분석

#### 자동 트리거 방식:
- **스케줄**: 3시간 20분마다 Claude가 업데이트 수행 (00:20, 03:20, 06:20, 09:20, 12:20, 15:20, 18:20, 21:20 KST)
- **업데이트 방향**: 
  1. 📊 **종목 종가 업데이트** - 15:20(국내장), 06:20(국외장)
  2. 📝 **포스트 업데이트** - 3시간 20분마다
- **모니터링**: Claude가 직접 데이터베이스 상태 확인 및 품질 검증

### 5. 🚨 데이터 정합성 검증 (필수)

**언급/분석 개수 불일치 방지를 위한 핵심 원칙:**

#### 🔍 **문제 진단 및 방지**
- **문제**: `post_stock_analysis` 테이블 분석 개수 > 실제 `blog_posts` 언급 개수
- **원인**: 중복 분석 데이터 또는 실제 언급 없는 분석 데이터 생성
- **해결**: 실제 blog_posts 기반 정확한 언급 수 계산 필수

#### ✅ **필수 SQL 패턴 (절대 준수)**
```sql
-- ❌ 잘못된 방식 (중복 허용)
COUNT(psa.id) as analyzed_count

-- ✅ 올바른 방식 (DISTINCT 사용)  
COUNT(DISTINCT psa.log_no) as analyzed_count,
(SELECT COUNT(DISTINCT bp.id) FROM blog_posts bp 
 WHERE bp.title LIKE '%' || s.ticker || '%' OR bp.content LIKE '%' || s.ticker || '%') as actual_mention_count
```

#### 🔧 **로직 규칙 (절대 준수)**
```typescript
// ✅ 정합성 보장 계산
mention_count: Math.max(stock.actual_mention_count, stock.analyzed_count)

// ❌ 금지: 기존 값 그대로 사용 (부정확)
mention_count: stock.mention_count
```

#### 📋 **개발 시 필수 체크리스트**
1. **DISTINCT 사용**: 모든 COUNT 쿼리에서 중복 제거
2. **실제 언급 수 확인**: blog_posts에서 직접 조회
3. **논리적 일관성**: `mention_count >= analyzed_count` 항상 보장
4. **중복 방지**: 같은 log_no + ticker 조합 중복 금지
5. **테스트 검증**: API 응답에서 데이터 정합성 확인

### 6. 🧪 Playwright 테스트로 모든 테스트 완료 (필수)

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

#### 🧹 **테스트 페이지 정리 요구사항 (필수)**
**테스트를 위해 열어버린 사이트는 테스트를 끝내고 다 닫는다!**

```javascript
test.describe('테스트 그룹', () => {
  let openedPages = []; // 테스트 중 열린 페이지들 추적

  test.afterEach(async ({ page }) => {
    // 🧹 테스트 중 열린 모든 페이지 정리
    for (const openedPage of openedPages) {
      try {
        if (!openedPage.isClosed()) {
          await openedPage.close();
          console.log('✅ 테스트 페이지 정리 완료');
        }
      } catch (error) {
        console.log('⚠️ 페이지 정리 중 오류:', error.message);
      }
    }
    openedPages = []; // 배열 초기화
  });
});
```

**정리 대상**: 외부 링크, 팝업, 모달, iframe, 임시 페이지 등 모든 열린 페이지
**참조 문서**: `@docs/testing-requirements.md` (테스트 정리 섹션 참조)

### 7. 🛡️ 시스템 안전성 및 프로세스 관리 (필수)

**시스템 안정성 및 Claude Code 자체 보호를 위한 핵심 안전 원칙:**

#### 🚨 **프로세스 관리 안전 규칙 (절대 준수)**
- **프로세스 종료 시 신중함**: `taskkill`, `pkill` 명령어 사용 전 반드시 PID 확인
- **Claude Code 보호**: Claude Code 자체 프로세스는 절대 종료하지 않음
- **포트 정리 우선**: `lsof -ti:[포트] | xargs kill -9` 대신 `npx kill-port [포트]` 사용
- **안전한 서버 재시작**: `Ctrl+C` → 새 터미널 → `npm run dev` 순서

#### 🔍 **프로세스 진단 단계 (필수)**
```bash
# 1단계: 포트 사용 확인
netstat -ano | findstr :[포트번호]

# 2단계: 프로세스 상세 정보
tasklist | findstr [프로세스ID]

# 3단계: 안전한 포트 정리 (권장)
npx kill-port [포트번호]

# ❌ 위험한 명령어 (사용 금지)
taskkill /F /IM node.exe  # 모든 Node.js 프로세스 종료 위험
```

#### 🛡️ **Claude Code 자체 보호 (필수)**
- **자체 프로세스 보호**: Claude Code 실행 프로세스 종료 절대 금지
- **메모리 사용량 모니터링**: 과도한 메모리 사용 시 안전한 재시작 방법 안내
- **다중 프로세스 방지**: 개발 서버 중복 실행 방지
- **안전한 종료**: 작업 완료 후 정상 종료 절차 준수

#### 📊 **시스템 상태 모니터링 (권장)**
```bash
# 메모리 사용량 확인
wmic process where name="node.exe" get ProcessId,PageFileUsage

# 포트 점유 상황 확인
netstat -ano | findstr LISTENING

# 현재 실행 중인 개발 서버 확인
curl -s http://localhost:3004/api/health || echo "서버 미실행"
```

#### 🔄 **안전한 개발 서버 관리 (필수)**
- **서버 시작 전**: 포트 사용 여부 확인 (`npx kill-port 3004`)
- **서버 종료 시**: Ctrl+C로 정상 종료 후 프로세스 확인
- **포트 변경 시**: `DEV_PORT` 환경변수 활용
- **충돌 방지**: 동일 포트 중복 실행 방지

### 8. 🚨 실제 사용자 문제 근본 해결 원칙 (필수)

**실제 운영 환경에서 발생하는 사용자 문제를 완전히 근절하기 위한 핵심 원칙:**

#### 🔍 **Next.js 15 호환성 (필수)**
- **async params 규칙**: Next.js 15에서 모든 dynamic route params는 반드시 await 필요
- **적용 코드**: `{ params }: { params: Promise<{ ticker: string }> }` → `const { ticker } = await params;`
- **검증 명령어**: `grep -r "params\." src/app/api/ | grep -v "await"` (이 명령어로 위반사항 0건 유지)

#### 🗄️ **데이터 무결성 보장 (필수)**
- **JSON 파일 검증**: 모든 JSON 파일은 `JSON.parse()` 전에 유효성 검증 필수
- **DB 테이블 존재 확인**: 모든 SQL 쿼리 전에 테이블 존재 여부 확인
- **에러 핸들링**: 데이터 로딩 실패 시 사용자에게 명확한 안내 메시지 표시
- **Fallback 데이터**: 실제 데이터 없을 때 "정보 없음" 표시, 절대 빈 화면 금지

#### ⚡ **성능 최적화 (필수)**
- **3초 로딩 한계**: 모든 페이지는 3초 이내 로딩 완료 (CLAUDE.md 핵심 원칙)
- **API 응답 시간**: 500ms 이내 응답 필수
- **차트 렌더링**: 1.5초 이내 완료
- **캐시 전략**: 12시간 캐시로 성능 보장

#### 🧪 **실제 환경 테스트 (필수)**
- **실제 데이터 확인**: Dummy 데이터 사용 금지, 실제 DB 데이터만 사용
- **에러 ID 추적**: 모든 에러에 고유 ID 부여하여 사용자 문제 추적 가능
- **종목 다양성**: 1개 종목(TSLA)만이 아닌 다양한 종목 데이터 확보
- **브라우저 호환성**: Chrome, Firefox, Safari 모든 브라우저에서 동일한 경험

#### 📋 **개발 워크플로우 개선 (필수)**
- **코드 작성 전 검증**: Next.js 15 규칙, 데이터 구조, API 스펙 사전 확인
- **실제 환경 테스트**: 로컬 개발 서버에서 실제 사용자 시나리오 테스트
- **에러 로그 모니터링**: 개발 중 에러 로그 실시간 확인 및 즉시 수정
- **점진적 개선**: 완벽한 기능 개발 후 다음 기능 진행

## 📄 영역별 상세 요구사항 

**각 영역을 개발하거나 수정할 때는 반드시 해당 문서를 먼저 확인하세요:**

### 📋 **메르 블로그 개발 시** (`/merry`)
- **참조 문서**: `@docs/post-list-page-requirements.md`
- **담당 컴포넌트**: `src/app/merry/page.tsx`
- **관련 API**: `/api/merry/posts`, `/api/merry/stocks`
- **핵심 기능**: 포스트 필터링, 검색, 다크모드, 페이지네이션

#### 🎨 **UI/UX 핵심 요구사항**
- **제목**: "🎭 우리형 메르" (text-foreground)
- **부제목**: "일상, 투자, 독서, 그리고 삶의 다양한 이야기들..." (text-muted-foreground)
- **필터 섹션**: 기간/종목/매크로/특정종목 필터 (bg-muted/50 border)
- **포스트 카드**: 그리드 레이아웃 (md:grid-cols-2 lg:grid-cols-3)
- **📝 메르님 한줄 요약**: 포스트 미리보기 대신 메르님의 직접 작성한 한줄 요약 표시 (필수)
- **페이지네이션**: 10개씩 "더보기" 버튼

#### 🌈 **다크 모드 필수 지원**
```css
/* ✅ 다크 모드 호환 색상 */
text-foreground        /* 주요 텍스트 */
text-muted-foreground  /* 보조 텍스트 */
bg-muted/50           /* 필터 배경 */
bg-card               /* 카드 배경 */
border                /* 테두리 */

/* ❌ 사용 금지 색상 */
text-gray-900         /* 하드코딩된 회색 */
bg-gray-50           /* 하드코딩된 배경 */
```

#### 🏷️ **동적 태그 시스템**
- **🚨 가짜 태그 생성 절대 금지**: 포스트에 실제로 없는 내용으로 태그 생성 금지
- **데이터 기반**: mentioned_stocks, investment_theme, sentiment_tone 필드 활용
- **우선순위**: 언급 종목 (최대 2개) → 투자 테마 → 감정 톤
- **Fallback**: 모든 필드 비어있을 경우 기본 태그 ['투자', '분석'] 사용

#### ⚡ **성능 요구사항**
- **초기 로딩**: < 3초 (CLAUDE.md 핵심 원칙)
- **API 응답**: < 500ms
- **필터 적용**: < 800ms
- **실제 총 개수**: `result.meta.total`로 DB 기반 정확한 포스트 수 표시

### 📄 **개별 포스트 개발 시** (`/merry/[id]`)
- **참조 문서**: `@docs/post-page-requirements.md`
- **담당 컴포넌트**: `src/app/merry/[id]/page.tsx`
- **관련 API**: `/api/merry/[id]`

### 🎯 **메르's Pick 개발 시**
- **참조 문서**: `@docs/merry-picks-requirements.md`
- **담당 컴포넌트**: `src/components/merry/MerryPicks.tsx`
- **관련 API**: `/api/merry/picks`

### 📊 **종목 페이지 개발 시** (`/merry/stocks/[ticker]`)
- **참조 문서**: `@docs/stock-page-requirements.md` (필수 참조)
- **담당 컴포넌트**: `src/app/merry/stocks/[ticker]/page.tsx`, `src/components/merry/StockPriceChart.tsx`
- **관련 API**: `/api/merry/stocks/[ticker]`, `/api/merry/stocks/[ticker]/sentiments`

### 📊 **종목 차트 개발 시**  
- **참조 문서**: `@docs/stock-page-requirements.md` 차트 섹션 (필수 참조)
- **담당 컴포넌트**: `src/components/merry/StockPriceChart.tsx`
- **관련 API**: `/api/stock-price`, `/api/merry/stocks/[ticker]/posts`, `/api/merry/stocks/[ticker]/sentiments`

### 🎯 **감정 분석 시스템 개발 시**
- **참조 문서**: `@docs/stock-page-requirements.md` 감정 분석 섹션 (필수)
- **담당 컴포넌트**: Claude 직접 분석 로직, `src/components/merry/StockPriceChart.tsx`
- **관련 API**: `/api/merry/stocks/[ticker]/sentiments`

### 📈 **메르 주간보고 개발 시**
- **참조 문서**: `@docs/weekly-report-requirements.md` (필수 참조)
- **담당 컴포넌트**: `src/app/merry/weekly-report/page.tsx`
- **관련 API**: `/api/merry/weekly-reports`
- **분석 엔진**: `src/lib/claude-weekly-analyzer.ts`

### ⚡ **성능 최적화 작업 시**
- **참조 문서**: `@docs/performance-requirements.md`
- **핵심 기준**: 로딩 < 3초 (절대 한계), API 응답 < 500ms, 차트 렌더링 < 1.5초
- **필수 최적화**: Next.js Image, 코드 스플리팅, 캐싱, 번들 최적화

### 🧪 **테스트 작성 시**
- **참조 문서**: `@docs/testing-requirements.md`
- **테스트 도구**: Playwright (필수), 크로스 브라우저 지원
- **핵심 요구사항**: Dummy 데이터 금지 검증, 3초 로딩 제한, 섹션 오류 방지

### 🔄 **포스트 갱신 작업 시**
- **참조 문서**: `@docs/update-requirements.md`
- **핵심 워크플로우**: 자동 갱신 → 수동 갱신 → 페이지 검증
- **필수 확인사항**: 메르's Pick, 논리체인 분석, 감정 분석, 차트 마커

### 🔗 **서비스 의존성 관리 시**
- **참조 문서**: `@docs/service-dependencies.md`
- **시스템 아키텍처**: 데이터베이스 의존성, 서비스 갱신 체인, 장애 대응
- **핵심 모니터링**: 테이블 관계, 갱신 순서, 성능 최적화

### 🌐 테스트 완료 후 웹사이트 자동 오픈 (필수)

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

## 🔄 최근 업데이트 내역 (2025-08-23)

### ✅ Today Merry Quote 기능 개선 완료
- **가짜 `/posts` 페이지 삭제**: 더미 데이터를 사용하는 가짜 페이지 완전 제거
- **실제 포스트 연결**: 각 한줄 코멘트 클릭 시 해당 메르 포스트(`/merry/posts/{id}`)로 이동
- **상호작용 개선**: 카드 전체가 클릭 가능하며 호버 효과 추가
- **링크 수정**: "전체 포스트 보기" → "메르님 포스트 모아보기" (`/merry` 경로)

### 🗄️ 데이터베이스 현황 (2025-08-23 확인)
- **블로그 포스트**: 520개 (정상)
- **감정 분석**: 269개 (주요 종목별 완료)
- **종목 언급**: 14개 (동기화 완료)
- **종가 데이터**: 2,290개 (최신 2025-08-22까지)
- **메르's Pick**: 10개 종목 (API 정상 동작)

### 📊 API 검증 완료
- **Today Merry Quote API**: 정상 동작 (최신 포스트 반영)
- **메르's Pick API**: 10개 종목 정상 반환
- **감정 분석 API**: TSLA 기준 24개 언급 정상 처리
- **종가 API**: 주요 종목 최신 데이터 유지

### 🔧 테스트 환경 개선
- **동적 포트 설정**: `DEV_PORT` 환경변수 기반 테스트
- **하드코딩 제거**: 모든 테스트 파일에서 포트 동적 설정
- **테스트 성공률**: 주요 기능 테스트 통과

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

### 🏠 **메인 페이지 개발 시**
- **참조 문서**: `@docs/main-page-requirements.md` (필수 참조)
- **담당 파일**: `src/app/page.tsx`
- **핵심 기능**: 3개 네비게이션 버튼, 오늘의 메르님 말씀 (Claude 직접 분석), 메르's Pick
- **성능 기준**: 초기 로딩 < 2초, LCP < 1.5s
- **주요 텍스트**: "니가 뭘 알아. 니가 뭘 아냐고." (마침표 필수), "요르가 전하는 날카로운 투자 인사이트"

### 💬 **오늘의 메르님 말씀 개발 시**
- **참조 문서**: `@docs/today-merry-quote-requirements.md` (필수 참조)
- **담당 컴포넌트**: `src/components/home/TodayMerryQuote.tsx`
- **관련 API**: `/api/today-merry-quote`
- **핵심 원칙**: Claude 직접 수동 분석, "글이 없으면 분석하지 말라"
- **금지 사항**: 외부 AI API, 키워드 매칭, 패턴 분석, 하드코딩 절대 금지
- **성능 기준**: Claude 분석 < 3초, API 응답 < 5초

---

## 📄 영역별 상세 요구사항 

**각 영역을 개발하거나 수정할 때는 반드시 해당 문서를 먼저 확인하세요:**

### 📈 **메르 주간보고 개발 시**
- **참조 문서**: `@docs/weekly-report-requirements.md` (필수 참조)
- **담당 컴포넌트**: `src/app/merry/weekly-report/page.tsx`
- **관련 API**: `/api/merry/weekly-reports`
- **분석 엔진**: `src/lib/claude-weekly-analyzer.ts`

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

**메르 글 정보 표시 (시간 범위별 필수 요구사항):**
- **시간 범위별 모든 메르 글** 데이터 연동 필수
  - **1M 선택**: 최근 30일 내 모든 언급 포스트 마커 표시
  - **3M 선택**: 최근 90일 내 모든 언급 포스트 마커 표시  
  - **6M 선택**: 최근 180일 내 모든 언급 포스트 마커 표시
- **blog_posts 테이블 활용 필수**: 508개 포스트에서 시간 범위별 필터링
- **메르 글 언급 날짜 또는 당일**에만 정보 마커 표시
- **언급 없는 날들은 정보 표시 안 함** (깔끔한 차트 유지)
- 메르 글 마커 클릭 시 해당 글 요약 팝업 표시
- **마커 색상**: 감정 분석 결과에 따른 색상 표시
  - 🟢 **긍정적 감정**: 초록색 (#16a34a, stroke-width=3)
  - 🔴 **부정적 감정**: 빨간색 (#dc2626, stroke-width=3)  
  - 🔵 **중립적 감정**: 파란색 (#2563eb, stroke-width=2)
  - **기본 마커**: 파란색 빈 원 (fill="none")
- **마커 개수 검증**: 선택된 기간 내 실제 포스트 수와 일치해야 함

**데이터 연동:**
- 주가 API 연동 (`/api/merry/stocks/[ticker]`) - 6개월치 데이터
- 메르 글 API (`/api/merry/stocks/[ticker]/posts`) - 6개월치 언급 데이터
- **감정 분석 API** (`/api/merry/stocks/[ticker]/sentiments`) - 종목별 감정 분석 데이터
- 메르 글 날짜 매칭 API (종목 언급 날짜 정보)
- 실시간 WebSocket 연결 (선택사항)
- 종목 즐겨찾기 로컬 스토리지 저장

**데이터베이스 요구사항:**
- **메르가 언급한 종목만** 종가 데이터 저장 (선별적 저장)
- **6개월치 종가** 데이터 유지 (180일 기준)
- 종목 테이블: 메르 언급 여부 플래그 관리
- 종가 테이블: ticker, date, close_price, volume 저장
- **감정 분석 테이블** (`post_stock_sentiments`): 포스트별 종목별 감정 분석 결과 저장
  - log_no, ticker, sentiment, sentiment_score, confidence, keywords, context_snippet
- 자동 데이터 정리: 6개월 이전 데이터 삭제 스케줄링
- 메르 글 연동: 언급된 종목 자동 추가, 미언급 종목 저장 중단

**블로그 포스트 데이터베이스 연동 (필수):**
- **blog_posts 테이블**: 508개 포스트 데이터 활용
- **종목별 관련 포스트**: title, content, excerpt에서 ticker/회사명 검색
- **시간 범위별 포스트**: 1M/3M/6M 선택된 기간에 해당하는 모든 언급 포스트 가져오기
- **차트 마커 표시**: blog_posts에서 검색된 포스트의 created_date를 차트에 마커로 표시
- **포스트 팝업**: 마커 클릭 시 blog_posts의 실제 데이터(제목, 내용, 날짜, 조회수) 표시
- **검색 로직**: ticker명과 회사명 양쪽으로 검색 (예: 'TSLA' + '테슬라', '005930' + '삼성전자')
- **기간별 필터링**: 선택된 time range (1M=30일, 3M=90일, 6M=180일) 기간 내 created_date 필터링
- **성능 최적화**: LIKE 검색 최적화, 날짜 인덱스 활용, 캐싱 적용

**성능 요구사항:**
- 초기 로딩 < 3초 (차트 포함)
- 차트 렌더링 < 1.5초
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
- **감정 분석 마커 색상 표시 테스트** (긍정=초록, 부정=빨강, 중립=파랑)
- **감정 분석 API 연동 테스트** (`/api/merry/stocks/[ticker]/sentiments`)
- **감정 분석 툴팁 표시 테스트** (감정 아이콘, 신뢰도, 컨텍스트)
- **시간 범위별 감정 데이터 로딩 테스트** (1M/3M/6M)
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

## 📋 과제 관리 요구사항

### 필수 워크플로우
1. **Git Push 시 자동 문서화**
   - 모든 git push 후에는 반드시 옵시디언에도 업데이트
   - 업데이트 경로: `C:\Users\y\Documents\Obsidian\Product-Planning\Engineering-Checklists\`
   - 업데이트할 파일들:
     - `메르_블로그_플랫폼_개발가이드.md` (CLAUDE.md 복사)
     - `메르_블로그_플랫폼_YYYY-MM-DD_업데이트.md` (당일 작업 요약)

2. **문서 동기화 규칙**
   - 개발 가이드라인 변경 시 즉시 옵시디언 동기화
   - 주요 기능 개발 완료 시 작업 요약 문서 생성
   - 테스트 요구사항 변경 시 옵시디언 업데이트

3. **작업 추적**
   - TodoWrite 도구를 활용한 작업 진행 상황 관리
   - 복잡한 작업은 반드시 할일 목록으로 관리
   - 완료된 작업은 즉시 완료 표시

### 문서화 템플릿
```markdown
# 메르 블로그 플랫폼 업데이트 (YYYY-MM-DD)

## 📋 완료된 작업 목록
- 작업 1
- 작업 2

## 🎯 주요 요구사항 반영
- 요구사항 1
- 요구사항 2

## 🚀 Git 커밋 정보
- **커밋 해시**: [해시]
- **커밋 메시지**: "[메시지]"

## 🔧 사용된 기술 스택
- 기술 1
- 기술 2
```

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
- **절대 금지**: Dummy data, 가짜 데이터, 샘플 데이터, 임시 분석 결과 사용 금지
- **필수**: 실제 데이터 없을 때 "정보 없음" 명확히 표기
- **가짜 코드 금지**: "임시 분석 결과", "샘플 데이터", "더미 값" 등 모든 가짜 코드 작성 금지
- **예시**: 
  - ❌ "예시 데이터: $100", "샘플: 3개 포스트", "임시 분석 결과"
  - ✅ "가격 정보 없음", "관련 포스트 없음", "Claude 직접 분석 기능이 구현되지 않았습니다"

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

### 6. Git Push 및 문서화 (필수)
```bash
# Git 커밋 및 푸시
git add .
git commit -m "작업 내용 요약"
git push

# 옵시디언 동기화 (반드시 실행)
cp CLAUDE.md "C:\Users\y\Documents\Obsidian\Product-Planning\Engineering-Checklists\메르_블로그_플랫폼_개발가이드.md"
# 당일 작업 요약 문서 생성
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

## 📚 핵심 참고 문서

### 📋 **필수 워크플로우 문서**
- **`@docs/update-requirements.md`**: 새 포스트 추가 시 갱신 프로세스 완전 가이드
- **`@docs/service-dependencies.md`**: 서비스 간 의존성 관계 및 데이터 흐름 매핑

### 🔄 **포스트 갱신 시 필수 확인**
1. **자동 갱신 확인**: 메르's Pick, 논리체인 분석
2. **수동 갱신 실행**: 감정 분석 배치 (`node scripts/analyze-sentiment.js`)
3. **페이지 검증**: `/`, `/merry`, `/merry/stocks/[ticker]`, `/merry/analysis`
4. **성능 확인**: 로딩 시간 < 3초, API 응답 < 500ms

### 🔗 **의존성 관리 원칙**
- **데이터베이스**: `blog_posts` → 모든 서비스의 기반
- **갱신 순서**: 포스트 저장 → 종목 갱신 → 논리체인 분석 → 감정 분석
- **장애 대응**: 백업 시스템, 읽기 전용 모드, 데이터 동기화

---

**🎯 기억하세요**: 모든 개발 작업에서 위의 8가지 필수 사항을 반드시 준수해야 합니다:

1. **최대한 다양하고 시기 적절한 수퍼 클로드 커맨드들을 사용하고 어떤 커맨드를 사용했는지 명시한다**
2. **대표적인 MCP(Sequential, Context7, Magic)를 적극 활용하고 사용하면 명시한다**
3. **모든 테스트는 Playwright를 활용하여 끝내고 사용했음을 명시한다**
4. **테스트가 종료되면 해당 서비스를 웹사이트에 열어서 보여준다** 
5. **각 페이지마다 참고해야할 내역을 CLAUDE.md에 적는다**
6. **로딩은 3초를 넘으면 안 된다** (절대 성능 기준)
7. **시스템 안전성을 최우선으로 하고 Claude Code 자체 프로세스는 절대 종료하지 않는다** (안전성 필수)
8. **Git Push 시 반드시 옵시디언에도 업데이트** (과제 관리 필수)

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

## 🎯 감정 분석 시스템 요구사항

### 📊 **시스템 개요**
**목적**: 메르의 블로그 포스트에서 언급된 각 종목에 대한 감정(긍정/부정/중립)을 Claude가 직접 분석하여 차트에 색상 마커로 표시

**분석 방식**: **🚨 AI API 사용 절대 금지! Claude가 수동으로 직접 분석만 허용** (stock-page-requirements.md 준수)

### 🗄️ **데이터베이스 구조**

#### post_stock_analysis 테이블 (필수)
```sql
-- Claude 직접 분석 전용 테이블 (stock-page-requirements.md 규격)
CREATE TABLE post_stock_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_no INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(4,3) NOT NULL,
    confidence DECIMAL(4,3) NOT NULL,
    reasoning TEXT NOT NULL, -- 핵심 근거 (필수) - 포스트별로 독립적이어야 함
    context_snippet TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_no) REFERENCES blog_posts(id) ON DELETE CASCADE,
    UNIQUE(log_no, ticker)
);
```

#### 🚫 **금지된 자동화 방식들 (절대 사용 금지)**
- ❌ **키워드 사전 사용 금지**: 키워드 리스트나 사전 기반 분석 절대 금지
- ❌ **패턴 매칭 금지**: 정규식이나 패턴 매칭을 통한 자동 분석 금지  
- ❌ **AI API 호출 금지**: OpenAI, Anthropic, Claude API 등 모든 AI API 사용 금지
- ❌ **규칙 기반 시스템 금지**: if-else 규칙이나 알고리즘 기반 분석 금지
- ✅ **유일한 허용 방식**: Claude가 포스트 내용을 읽고 수동으로 직접 분석

#### 🎯 **데이터 품질 규칙 (필수)**
- **📝 Reasoning 독립성**: 각 포스트의 `reasoning` 필드는 해당 포스트만의 고유한 분석 근거를 포함해야 함
  - ❌ **금지**: 다른 포스트와 동일하거나 유사한 reasoning 사용
  - ❌ **금지**: 일반적이고 포괄적인 reasoning ("메모리 반도체는 중요하다" 등)
  - ✅ **필수**: 해당 포스트의 구체적인 내용과 맥락을 반영한 독립적 reasoning
  - ✅ **예시**: "트럼프의 반도체 관세 정책으로 삼성전자가 애플 수주에서 유리한 위치"
- **🔗 Post-Log 매칭**: `log_no`는 `blog_posts.log_no`와 매칭되어야 함 (ID 기반이 아닌 log_no 기반)

### 📈 **차트 통합 표시**

#### 마커 색상 규칙 (엄격 준수)
- 🟢 **긍정적 감정**: `#16a34a` (초록색), `stroke-width=3`
- 🔴 **부정적 감정**: `#dc2626` (빨간색), `stroke-width=3`
- 🔵 **중립적 감정**: `#2563eb` (파란색), `stroke-width=2`
- **기본 마커**: 파란색 빈 원 (`fill="none"`)

#### 툴팁 표시 내용 (필수)
```tsx
{/* 감정 분석 정보 표시 */}
{data.sentiments && data.sentiments.length > 0 && (
  <div>
    <p className="text-xs font-medium text-gray-700 mb-1">🎯 감정 분석</p>
    {data.sentiments.slice(0, 2).map((sentiment, index) => (
      <div key={index} className="text-xs text-gray-600 mb-1">
        <span className={sentimentColor}>
          {sentimentIcon} {sentiment.sentiment}
        </span>
        <br />
        신뢰도: {(sentiment.confidence * 100).toFixed(0)}%
      </div>
    ))}
  </div>
)}
```

### 🌐 **API 엔드포인트**

#### `/api/merry/stocks/[ticker]/sentiments` (GET)
**파라미터**:
- `ticker`: 종목 코드 (예: TSLA, 005930)
- `period`: 시간 범위 (1mo, 3mo, 6mo)

**응답 구조**:
```json
{
  "ticker": "TSLA",
  "period": "6mo", 
  "sentimentByDate": {
    "2025-08-09": {
      "date": "2025-08-09",
      "sentiments": [
        {
          "sentiment": "neutral",
          "score": 0,
          "confidence": 0.3,
          "keywords": {"positive": [], "negative": [], "neutral": []},
          "context": "..."
        }
      ],
      "posts": [...]
    }
  },
  "summary": {
    "positive": 0,
    "negative": 0,
    "neutral": 8,
    "total": 8
  },
  "totalMentions": 8,
  "averageConfidence": 0.3
}
```

### 🧪 **테스트 요구사항**

#### Playwright 테스트 시나리오 (필수)
1. **감정 분석 API 연동 테스트**
   ```typescript
   const sentimentResponse = await page.request.get('http://localhost:3004/api/merry/stocks/TSLA/sentiments?period=6mo');
   expect(sentimentResponse.status()).toBe(200);
   ```

2. **마커 색상 표시 테스트**
   ```typescript
   const greenMarkers = await page.locator('circle[stroke="#16a34a"]').count(); // 긍정
   const redMarkers = await page.locator('circle[stroke="#dc2626"]').count();   // 부정
   const blueMarkers = await page.locator('circle[stroke="#2563eb"]').count();  // 중립
   ```

3. **툴팁 감정 정보 표시 테스트**
   ```typescript
   await firstMarker.hover();
   const sentimentText = page.locator('text=감정 분석').or(page.locator('text=😊'));
   await expect(sentimentText.first()).toBeVisible();
   ```

### ⚡ **성능 요구사항**

#### API 성능 기준 (엄격 준수)
- **감정 분석 API 응답**: < 500ms
- **배치 분석 속도**: 100개 포스트 < 60초
- **차트 로딩 (감정 포함)**: < 3초
- **감정 데이터 통합**: 차트와 병렬 로딩

#### 캐싱 전략
- **감정 분석 결과**: 영구 저장 (재분석 불필요)
- **API 응답**: 12시간 캐시
- **차트 데이터**: 감정 + 가격 데이터 통합 캐싱

### 🔧 **Claude 직접 분석 실행**

#### 수동 감정 분석 실행 방법 (유일한 허용 방식)
```bash
# Claude가 직접 분석하는 수동 방식만 허용
cd meire-blog-platform
node scripts/claude-direct-analysis.js

# 사용자가 포스트 ID와 종목 입력 → Claude가 직접 분석 → 수동 결과 입력
# 🚨 자동화된 배치 분석 스크립트는 모두 삭제됨
```

#### 분석 결과 확인
```bash
# 특정 종목의 감정 분석 결과 확인  
curl "http://localhost:3004/api/merry/stocks/TSLA/sentiments?period=6mo"

# 데이터베이스 직접 확인
sqlite3 database.db "SELECT * FROM post_stock_sentiments LIMIT 10;"
```

### 📋 **운영 및 유지보수**

#### 정기 작업 (권장)
1. **수동 감정 분석**: 새로운 포스트에 대해 Claude가 직접 수동 분석
2. **종목명 매핑 확인**: 새로운 종목 언급시 수동으로 확인 및 추가
3. **분석 품질 검토**: Claude의 분석 근거와 논리 검토

#### 🚫 **금지된 확장 계획들**
- ❌ **AI 모델 자동화**: GPT, Claude API 등 자동화 분석 절대 금지
- ❌ **자동 감정 스코어링**: 알고리즘 기반 점수 계산 금지
- ❌ **자동 추천 시스템**: 감정 기반 자동 추천 시스템 금지
- ✅ **허용 확장**: 수동 분석 결과의 시각화, 차트 개선, UI/UX 향상

### 🎯 **품질 보증**

#### 완료 검증 기준
- ✅ 감정 분석 API 응답 정상 (TSLA: 8건, GOOGL: 5건 확인)
- ✅ 차트 마커 색상 표시 정상 (21개 파란색 중립 마커 확인)
- ✅ 툴팁 감정 정보 표시 기능
- ✅ 시간 범위별 데이터 필터링 (1M/3M/6M)
- ✅ Playwright 테스트 통과 (API 연동, 마커 표시)

---

> 📝 **마지막 업데이트**: 2025-08-24  
> 💬 **문의사항**: 이 가이드라인에 대한 질문이나 개선사항이 있으면 언제든지 알려주세요.
> 🚀 **SuperClaude 통합**: v3.0.0.2 설치 완료 및 가이드라인 통합
> 🛡️ **시스템 안전성**: Claude Code 자체 보호 및 프로세스 관리 안전 가이드라인 추가
> 🚨 **AI API 완전 금지**: 모든 자동화 AI API 제거, Claude 직접 수동 분석만 허용