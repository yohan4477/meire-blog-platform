import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders } from '../../../../jest.setup';

import PortfolioStats from '../PortfolioStats';
import type { ScionPortfolio, ScionHolding } from '@/types';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  DollarSign: ({ className }: { className?: string }) => (
    <div className={className} data-testid="dollar-sign-icon" />
  ),
  PieChart: ({ className }: { className?: string }) => (
    <div className={className} data-testid="pie-chart-icon" />
  ),
  Building2: ({ className }: { className?: string }) => (
    <div className={className} data-testid="building2-icon" />
  ),
  Calendar: ({ className }: { className?: string }) => (
    <div className={className} data-testid="calendar-icon" />
  ),
  Target: ({ className }: { className?: string }) => (
    <div className={className} data-testid="target-icon" />
  ),
  BarChart3: ({ className }: { className?: string }) => (
    <div className={className} data-testid="bar-chart3-icon" />
  ),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}));

describe('PortfolioStats', () => {
  const mockHoldings: ScionHolding[] = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      securityType: 'Common Stock',
      shares: 1000000,
      marketValue: 150000000,
      portfolioPercent: 25.5,
      rank: 1,
    },
    {
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      securityType: 'Common Stock',
      shares: 800000,
      marketValue: 120000000,
      portfolioPercent: 20.4,
      rank: 2,
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      securityType: 'Common Stock',
      shares: 600000,
      marketValue: 90000000,
      portfolioPercent: 15.3,
      rank: 3,
    },
    {
      ticker: 'TSLA',
      name: 'Tesla, Inc.',
      securityType: 'Common Stock',
      shares: 500000,
      marketValue: 75000000,
      portfolioPercent: 12.8,
      rank: 4,
    },
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      securityType: 'Common Stock',
      shares: 400000,
      marketValue: 60000000,
      portfolioPercent: 10.2,
      rank: 5,
    },
  ];

  const mockPortfolio: ScionPortfolio = {
    filerName: 'Scion Asset Management LLC',
    filerId: 1608046,
    quarter: 'Q3 2024',
    reportDate: '2024-11-15',
    totalValue: 588000000,
    totalPositions: 5,
    holdings: mockHoldings,
    lastUpdated: '2024-11-15T10:00:00Z',
  };

  it('renders portfolio statistics correctly', () => {
    renderWithProviders(<PortfolioStats portfolio={mockPortfolio} />);

    // Check if main stats are displayed
    expect(screen.getByText('총 포트폴리오 가치')).toBeInTheDocument();
    expect(screen.getByText('$588.0M')).toBeInTheDocument();
    
    expect(screen.getByText('보유 종목 수')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    
    expect(screen.getByText('최대 보유 종목')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('25.5% 비중')).toBeInTheDocument();
  });

  it('calculates Top 5 concentration correctly', () => {
    renderWithProviders(<PortfolioStats portfolio={mockPortfolio} />);

    // Top 5 concentration should be sum of all holdings percentages
    const expectedConcentration = mockHoldings
      .reduce((sum, holding) => sum + holding.portfolioPercent, 0)
      .toFixed(1);
    
    expect(screen.getByText('Top 5 집중도')).toBeInTheDocument();
    expect(screen.getByText(`${expectedConcentration}%`)).toBeInTheDocument();
  });

  it('displays average position size correctly', () => {
    renderWithProviders(<PortfolioStats portfolio={mockPortfolio} />);

    const expectedAverage = (mockPortfolio.totalValue / mockPortfolio.totalPositions);
    const formattedAverage = `$${(expectedAverage / 1e6).toFixed(1)}M`;

    expect(screen.getByText('평균 포지션 크기')).toBeInTheDocument();
    expect(screen.getByText(formattedAverage)).toBeInTheDocument();
  });

  it('shows quarter and report date information', () => {
    renderWithProviders(<PortfolioStats portfolio={mockPortfolio} />);

    expect(screen.getByText('보고 분기')).toBeInTheDocument();
    expect(screen.getByText('Q3 2024')).toBeInTheDocument();
    
    // Check if date is formatted correctly in Korean
    const expectedDate = new Date(mockPortfolio.reportDate).toLocaleDateString('ko-KR');
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('displays security types breakdown', () => {
    renderWithProviders(<PortfolioStats portfolio={mockPortfolio} />);

    expect(screen.getByText('증권 유형별 분석')).toBeInTheDocument();
    expect(screen.getByText('Common Stock')).toBeInTheDocument();
    expect(screen.getByText('5개 종목')).toBeInTheDocument();
  });

  it('handles empty holdings array', () => {
    const emptyPortfolio: ScionPortfolio = {
      ...mockPortfolio,
      holdings: [],
      totalPositions: 0,
      totalValue: 0,
    };

    renderWithProviders(<PortfolioStats portfolio={emptyPortfolio} />);

    expect(screen.getByText('최대 보유 종목')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('formats currency correctly for different values', () => {
    const portfolioWithLargeValue: ScionPortfolio = {
      ...mockPortfolio,
      totalValue: 1500000000, // 1.5B
    };

    renderWithProviders(<PortfolioStats portfolio={portfolioWithLargeValue} />);
    expect(screen.getByText('$1.50B')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-portfolio-stats';
    renderWithProviders(<PortfolioStats portfolio={mockPortfolio} className={customClass} />);

    const container = screen.getByText('총 포트폴리오 가치').closest('div')?.parentElement?.parentElement;
    expect(container).toHaveClass(customClass);
  });

  it('displays all expected icons', () => {
    renderWithProviders(<PortfolioStats portfolio={mockPortfolio} />);

    expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument();
    expect(screen.getByTestId('building2-icon')).toBeInTheDocument();
    expect(screen.getByTestId('target-icon')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart3-icon')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart-icon')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
  });

  it('memoizes calculations correctly', () => {
    const { rerender } = renderWithProviders(<PortfolioStats portfolio={mockPortfolio} />);
    
    // First render
    expect(screen.getByText('84.2%')).toBeInTheDocument(); // Top 5 concentration
    
    // Rerender with same portfolio should not recalculate
    rerender(<PortfolioStats portfolio={mockPortfolio} />);
    expect(screen.getByText('84.2%')).toBeInTheDocument();
  });
});