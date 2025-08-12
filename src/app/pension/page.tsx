import { Metadata } from 'next';
import NationalPensionDashboard from '@/components/pension/NationalPensionDashboard';

export const metadata: Metadata = {
  title: '국민연금 투자현황 | 메르 금융정보 포털',
  description: '국민연금의 실시간 투자현황, 자산배분, 주요 보유종목을 Robinhood 스타일의 직관적인 대시보드로 확인하세요.',
  keywords: [
    '국민연금',
    '투자현황',
    '자산배분',
    '보유종목',
    '연기금',
    '포트폴리오',
    '수익률',
    '투자분석'
  ].join(', '),
  openGraph: {
    title: '국민연금 투자현황 대시보드',
    description: '912조원 규모의 국민연금 투자현황을 실시간으로 확인하고 나의 포트폴리오와 비교해보세요.',
    type: 'website',
    images: [
      {
        url: '/pension-dashboard-og.jpg',
        width: 1200,
        height: 630,
        alt: '국민연금 투자현황 대시보드',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '국민연금 투자현황 대시보드',
    description: '912조원 규모의 국민연금 투자현황을 실시간으로 확인하고 나의 포트폴리오와 비교해보세요.',
    images: ['/pension-dashboard-og.jpg'],
  },
};

export default function PensionPage() {
  return <NationalPensionDashboard />;
}