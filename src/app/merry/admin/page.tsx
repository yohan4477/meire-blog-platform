import React from 'react';
import BlogCrawlerDashboard from '@/components/merry/BlogCrawlerDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '메르 블로그 관리자 - Meire Blog Platform',
  description: '메르 블로그 크롤링, 데이터 관리 및 시스템 설정',
};

export default function MerryAdminPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <BlogCrawlerDashboard />
    </div>
  );
}