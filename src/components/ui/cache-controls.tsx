'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2 } from 'lucide-react';

export function CacheControls() {
  const [isClearing, setIsClearing] = useState(false);

  const clearCache = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        cache: 'no-store'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 페이지 새로고침으로 캐시된 컴포넌트들도 갱신
        window.location.reload();
      } else {
        console.error('Cache clear failed:', result);
        alert('캐시 삭제 실패: ' + result.error?.message);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      alert('캐시 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={clearCache}
        disabled={isClearing}
        className="text-xs"
      >
        {isClearing ? (
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3 mr-1" />
        )}
        {isClearing ? '캐시 삭제 중...' : '캐시 삭제'}
      </Button>
    </div>
  );
}