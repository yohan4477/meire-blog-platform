'use client';

import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';

// 의도적으로 에러를 발생시키는 컴포넌트
function BuggyComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    // 의도적으로 에러 발생
    throw new Error('테스트 에러: Cannot read property of undefined');
  }

  return (
    <div className="p-4 border border-gray-300 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">섹션 오류 테스트 컴포넌트</h3>
      <p className="text-gray-600 mb-4">
        이 컴포넌트는 섹션 오류 추적 시스템을 테스트하기 위해 만들어졌습니다.
      </p>
      <Button 
        onClick={() => setShouldThrow(true)}
        variant="destructive"
      >
        🚨 에러 발생시키기
      </Button>
    </div>
  );
}

export function ErrorTest() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">섹션 오류 추적 시스템 테스트</h2>
      
      <div className="space-y-4">
        <ErrorBoundary 
          level="section"
          componentName="ErrorTest"
          sectionName="test-buggy-component"
          showDetails={true}
        >
          <BuggyComponent />
        </ErrorBoundary>

        <div className="bg-gray-100 p-4 rounded-lg text-sm">
          <h4 className="font-medium mb-2">🔍 테스트 방법:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>위의 "에러 발생시키기" 버튼을 클릭하세요</li>
            <li>ErrorBoundary가 에러를 캐치하고 UI를 표시합니다</li>
            <li>에러 정보가 자동으로 데이터베이스에 저장됩니다</li>
            <li>콘솔에서 섹션 오류 리포팅 로그를 확인할 수 있습니다</li>
          </ol>
        </div>
      </div>
    </div>
  );
}