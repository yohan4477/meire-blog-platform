-- 📊 섹션 오류 추적 및 방지 시스템 데이터베이스 스키마
-- 목적: 모든 섹션 오류를 기록하고 분석하여 재발 방지

-- 1. 섹션 오류 로그 테이블
CREATE TABLE IF NOT EXISTS section_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 🔍 오류 식별 정보
    error_hash TEXT UNIQUE NOT NULL,  -- 오류의 고유 해시값 (중복 방지)
    component_name TEXT NOT NULL,     -- 오류 발생 컴포넌트명
    section_name TEXT NOT NULL,       -- 섹션명 (예: StockChart, MerryPick)
    page_path TEXT NOT NULL,          -- 페이지 경로 (예: /merry/stocks/TSLA)
    
    -- 📝 오류 상세 정보
    error_message TEXT NOT NULL,      -- 오류 메시지
    error_stack TEXT,                 -- 스택 트레이스
    error_type TEXT NOT NULL,         -- 오류 타입 (TypeError, ReferenceError 등)
    error_category TEXT NOT NULL,     -- 오류 분류 (데이터, API, 렌더링, 로직)
    
    -- 🌐 환경 정보
    user_agent TEXT,                  -- 브라우저 정보
    browser_name TEXT,                -- 브라우저명 (Chrome, Firefox 등)
    device_type TEXT,                 -- 디바이스 타입 (Desktop, Mobile, Tablet)
    screen_resolution TEXT,           -- 화면 해상도
    
    -- 📊 컨텍스트 정보
    user_action TEXT,                 -- 오류 발생 직전 사용자 행동
    api_calls TEXT,                   -- 관련 API 호출 내역 (JSON)
    component_props TEXT,             -- 컴포넌트 props 정보 (JSON)
    state_snapshot TEXT,              -- 오류 발생 시 상태 스냅샷 (JSON)
    
    -- ⏰ 시간 정보
    first_occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    occurrence_count INTEGER DEFAULT 1,
    
    -- 🎯 해결 상태
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'fixed', 'ignored')),
    assigned_to TEXT,                 -- 담당 개발자
    resolution_notes TEXT,            -- 해결 방법 메모
    fixed_at DATETIME,                -- 수정 완료 시간
    
    -- 🔄 재발 방지
    prevention_applied BOOLEAN DEFAULT FALSE,
    prevention_method TEXT,           -- 적용된 방지 방법
    test_case_created BOOLEAN DEFAULT FALSE,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 오류 해결 방법 템플릿 테이블
CREATE TABLE IF NOT EXISTS error_solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_pattern TEXT UNIQUE NOT NULL,     -- 오류 패턴 (정규식)
    solution_title TEXT NOT NULL,           -- 해결 방법 제목
    solution_steps TEXT NOT NULL,           -- 해결 단계 (JSON 배열)
    code_template TEXT,                     -- 수정 코드 템플릿
    prevention_code TEXT,                   -- 방지 코드
    test_code TEXT,                         -- 테스트 코드
    priority INTEGER DEFAULT 1,            -- 우선순위 (1=높음, 5=낮음)
    success_rate DECIMAL(5,2) DEFAULT 0.0, -- 해결 성공률
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 컴포넌트별 오류 통계 뷰
CREATE VIEW IF NOT EXISTS component_error_stats AS
SELECT 
    component_name,
    section_name,
    COUNT(*) as total_errors,
    COUNT(DISTINCT error_hash) as unique_errors,
    SUM(occurrence_count) as total_occurrences,
    MAX(last_occurred_at) as latest_error,
    COUNT(CASE WHEN status = 'fixed' THEN 1 END) as fixed_count,
    COUNT(CASE WHEN status = 'new' THEN 1 END) as pending_count,
    ROUND(
        COUNT(CASE WHEN status = 'fixed' THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as fix_rate
FROM section_errors
GROUP BY component_name, section_name
ORDER BY total_occurrences DESC;

-- 4. 일별 오류 트렌드 뷰
CREATE VIEW IF NOT EXISTS daily_error_trends AS
SELECT 
    DATE(created_at) as error_date,
    COUNT(*) as new_errors,
    SUM(occurrence_count) as total_occurrences,
    COUNT(DISTINCT component_name) as affected_components,
    COUNT(CASE WHEN error_category = '데이터' THEN 1 END) as data_errors,
    COUNT(CASE WHEN error_category = 'API' THEN 1 END) as api_errors,
    COUNT(CASE WHEN error_category = '렌더링' THEN 1 END) as render_errors,
    COUNT(CASE WHEN error_category = '로직' THEN 1 END) as logic_errors
FROM section_errors
WHERE created_at >= DATE('now', '-30 days')
GROUP BY DATE(created_at)
ORDER BY error_date DESC;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_section_errors_hash ON section_errors(error_hash);
CREATE INDEX IF NOT EXISTS idx_section_errors_component ON section_errors(component_name, section_name);
CREATE INDEX IF NOT EXISTS idx_section_errors_status ON section_errors(status);
CREATE INDEX IF NOT EXISTS idx_section_errors_date ON section_errors(created_at);
CREATE INDEX IF NOT EXISTS idx_section_errors_category ON section_errors(error_category);

-- 6. 초기 해결 방법 템플릿 데이터
INSERT OR REPLACE INTO error_solutions (error_pattern, solution_title, solution_steps, code_template, prevention_code) VALUES
(
    'Cannot read propert.*of (null|undefined)',
    '객체 속성 접근 오류',
    '["1. 객체 null 체크 추가", "2. Optional chaining 사용", "3. 기본값 설정", "4. 타입 가드 추가"]',
    'const safeValue = obj?.property ?? defaultValue;',
    'if (!obj || typeof obj !== "object") return null;'
),
(
    'TypeError.*is not a function',
    '함수 호출 오류',
    '["1. 함수 존재 여부 확인", "2. 타입 검증 추가", "3. 기본 함수 제공", "4. 에러 바운더리 설정"]',
    'if (typeof func === "function") func();',
    'const safeFunction = func && typeof func === "function" ? func : () => {};'
),
(
    'ReferenceError.*is not defined',
    '변수 미정의 오류',  
    '["1. 변수 선언 확인", "2. 임포트 구문 점검", "3. 스코프 확인", "4. 의존성 설치 확인"]',
    'const variable = typeof someVar !== "undefined" ? someVar : defaultValue;',
    'if (typeof variable === "undefined") { console.warn("Variable not defined:", "variable"); }'
);

-- 7. 트리거: 오류 업데이트 시간 자동 갱신
CREATE TRIGGER IF NOT EXISTS update_section_errors_timestamp 
AFTER UPDATE ON section_errors
BEGIN
    UPDATE section_errors 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- 8. 트리거: 중복 오류 발생 시 카운트 증가
CREATE TRIGGER IF NOT EXISTS increment_error_count
BEFORE INSERT ON section_errors
WHEN EXISTS (SELECT 1 FROM section_errors WHERE error_hash = NEW.error_hash)
BEGIN
    UPDATE section_errors 
    SET 
        occurrence_count = occurrence_count + 1,
        last_occurred_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE error_hash = NEW.error_hash;
    SELECT RAISE(IGNORE); -- 새로운 레코드 삽입 방지
END;