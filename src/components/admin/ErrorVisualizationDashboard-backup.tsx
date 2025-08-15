'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ErrorVisualizationDashboard() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">섹션 오류 분석 대시보드</h1>
          <p className="text-gray-600 mt-1">임시 테스트 버전</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>테스트 페이지</CardTitle>
        </CardHeader>
        <CardContent>
          <p>ErrorVisualizationDashboard가 정상적으로 로드되었습니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}