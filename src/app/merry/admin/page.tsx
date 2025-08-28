import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '메르 블로그 관리자 - Meire Blog Platform',
  description: '메르 블로그 데이터 관리 및 시스템 설정',
};

export default function MerryAdminPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="bg-card p-6 rounded-lg border">
        <h1 className="text-2xl font-bold mb-4">메르 블로그 관리자</h1>
        <p className="text-muted-foreground">
          관리자 기능은 새로운 시스템으로 재구축 예정입니다.
        </p>
      </div>
    </div>
  );
}