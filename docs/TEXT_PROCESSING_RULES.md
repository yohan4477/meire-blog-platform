# 텍스트 처리 원칙 보장 시스템

## 🚨 원칙 깨짐 방지 보장책

### 1. 런타임 자동 검증
```typescript
// 모든 텍스트 처리에서 자동으로 원칙 검증
const result = safeTextProcess(originalText, processor, 'operation');
```

### 2. ESLint 규칙 강제
```json
// .eslintrc.json에서 위험한 패턴 금지
"no-restricted-syntax": [
  "error",
  {
    "selector": "Literal[value=/\\.\\+/]",
    "message": ".+ 패턴은 위험합니다."
  }
]
```

### 3. 안전한 함수만 사용
```typescript
// ❌ 위험: 직접 처리
content.replace(/한줄?\s*코멘트\.?\s*.+$/s, '')

// ✅ 안전: 검증된 함수
import { extractContentParts } from '@/lib/text-utils-safe'
```

### 4. 긴급 수정시 보호장치
```typescript
// 급하게 고칠 때도 원칙 자동 검증
emergencyTextFix(text, quickFix, "한줄코멘트 추출 버그 수정");
```

## 📊 위반 모니터링

### 자동 위반 감지
- 원본 텍스트 80% 이상 보존 체크
- 과도한 축약 방지 (50% 이하 금지)
- 위험한 정규식 패턴 감지

### 개발자 알림
```javascript
// 브라우저 콘솔에서 확인
window.textProcessingMonitor.getViolationReport()
```

### 5회 위반시 경고
```
🚨🚨🚨 텍스트 처리 원칙 위반이 5회 이상 발생했습니다!
최근 위반 내역: [...]
```

## 🔧 급한 수정이 필요한 상황

### 1단계: 안전한 긴급 수정
```typescript
import { emergencyTextFix } from '@/lib/text-utils-safe';

const fixedText = emergencyTextFix(
  originalText, 
  (text) => text.replace(/문제패턴/g, '수정'),
  "포스트 표시 오류 긴급 수정"
);
```

### 2단계: 자동 fallback 작동
- 원칙 위반시 원본 텍스트 자동 반환
- 사용자가 빈 화면 보는 상황 방지

### 3단계: 위반 기록 및 알림
- 모든 위반사항 자동 기록
- 개발자에게 수정 필요 알림

## 🛡️ 보장 메커니즘

| 보장책 | 작동 방식 | 효과 |
|--------|----------|------|
| **런타임 검증** | 모든 처리 결과 자동 체크 | 원칙 위반 즉시 감지 |
| **ESLint 강제** | 코드 작성시 위험 패턴 차단 | 애초에 위험 코드 방지 |
| **안전 함수** | 검증된 함수만 제공 | 실수 가능성 원천 차단 |
| **자동 Fallback** | 실패시 안전한 대안 제공 | 사용자 경험 보호 |
| **위반 모니터링** | 패턴 분석으로 반복 방지 | 장기적 품질 개선 |

## 📝 사용 가이드

### 정상적인 개발시
```typescript
import { extractContentParts, formatForDisplay } from '@/lib/text-utils-safe';

const { summary, mainContent } = extractContentParts(rawText);
const displayText = formatForDisplay(mainContent);
```

### 긴급 수정시
```typescript
import { emergencyTextFix } from '@/lib/text-utils-safe';

const quickFix = emergencyTextFix(
  problemText,
  (text) => {
    // 최소한의 수정만
    return text.replace(/즉시수정필요패턴/g, '');
  },
  "사용자 보고 버그 긴급 수정"
);
```

### 위반 현황 체크
```javascript
// 개발자 도구에서
window.textProcessingMonitor.getViolationReport()
```

이 시스템으로 **개발자 실수가 발생해도 원칙이 자동으로 보장**됩니다.