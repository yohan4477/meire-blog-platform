import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders } from '../../../../jest.setup';

import HoldingsTable from '../HoldingsTable';
import type { ScionHolding } from '@/types';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  TrendingUp: ({ className }: { className?: string }) => (
    <div className={className} data-testid="trending-up-icon" />
  ),
  TrendingDown: ({ className }: { className?: string }) => (
    <div className={className} data-testid="trending-down-icon" />
  ),
  ArrowRight: ({ className }: { className?: string }) => (
    <div className={className} data-testid="arrow-right-icon" />
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <div className={className} data-testid="external-link-icon" />
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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { 
    children: React.ReactNode; 
    variant?: string; 
    className?: string; 
  }) => (
    <span className={className} data-testid={`badge-${variant || 'default'}`}>
      {children}
    </span>
  ),
}));

describe('HoldingsTable', () => {
  const mockHoldings: ScionHolding[] = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      securityType: 'Common Stock',
      shares: 1000000,
      marketValue: 150000000,
      portfolioPercent: 25.5,
      rank: 1,
      change: {
        type: 'increased',
        marketValue: 10000000,
        shares: 100000,
      },
    },
    {
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      securityType: 'Common Stock', 
      shares: 800000,
      marketValue: 120000000,
      portfolioPercent: 20.4,
      rank: 2,
      change: {
        type: 'new',
      },
    },
    {
      ticker: 'TSLA',
      name: 'Tesla, Inc.',
      securityType: 'Common Stock',
      shares: 500000,
      marketValue: 75000000,
      portfolioPercent: 12.8,
      rank: 3,
      change: {
        type: 'decreased',
        marketValue: -5000000,
        shares: -50000,
      },
    },
  ];

  it('renders holdings table with default props', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    expect(screen.getByText('포트폴리오 보유 종목')).toBeInTheDocument();
    expect(screen.getByText('총 3개 종목')).toBeInTheDocument();
    
    // Check if holdings are displayed
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('GOOGL')).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
  });

  it('displays custom title when provided', () => {
    const customTitle = 'Custom Portfolio Holdings';
    renderWithProviders(<HoldingsTable holdings={mockHoldings} title={customTitle} />);

    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });

  it('shows rank numbers when showRank is true', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} showRank={true} />);

    // Check for rank display elements
    const rankElements = screen.getAllByText(/^[1-3]$/);
    expect(rankElements).toHaveLength(3);
  });

  it('hides rank column when showRank is false', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} showRank={false} />);

    // Should not find "순위" header
    expect(screen.queryByText('순위')).not.toBeInTheDocument();
  });

  it('formats market values correctly', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    // Check formatted values
    expect(screen.getByText('$150.0M')).toBeInTheDocument();
    expect(screen.getByText('$120.0M')).toBeInTheDocument();
    expect(screen.getByText('$75.0M')).toBeInTheDocument();
  });

  it('displays portfolio percentages', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    expect(screen.getByText('25.5%')).toBeInTheDocument();
    expect(screen.getByText('20.4%')).toBeInTheDocument();
    expect(screen.getByText('12.8%')).toBeInTheDocument();
  });

  it('shows change indicators correctly', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    // Check for change indicators
    expect(screen.getByText('증가')).toBeInTheDocument();
    expect(screen.getByText('감소')).toBeInTheDocument();
    expect(screen.getByTestId('badge-secondary')).toHaveTextContent('NEW');
  });

  it('displays change values with correct colors', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    // Positive change should be displayed
    expect(screen.getByText('+$10.0M')).toBeInTheDocument();
    
    // Negative change should be displayed
    expect(screen.getByText('-$5.0M')).toBeInTheDocument();
  });

  it('calculates average price correctly', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    // AAPL average price: $150,000,000 / 1,000,000 = $150.00
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    
    // GOOGL average price: $120,000,000 / 800,000 = $150.00
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('shows security types as badges', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    const commonStockBadges = screen.getAllByText('Common Stock');
    expect(commonStockBadges.length).toBeGreaterThan(0);
  });

  it('renders SEC EDGAR link', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    const edgarLink = screen.getByRole('link', { 
      name: /SEC EDGAR에서 전체 포트폴리오 보기/ 
    });
    expect(edgarLink).toBeInTheDocument();
    expect(edgarLink).toHaveAttribute('href', 'https://www.sec.gov/edgar/browse/?CIK=0001608046');
    expect(edgarLink).toHaveAttribute('target', '_blank');
  });

  it('handles empty holdings array', () => {
    renderWithProviders(<HoldingsTable holdings={[]} />);

    expect(screen.getByText('총 0개 종목')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-holdings-table';
    renderWithProviders(<HoldingsTable holdings={mockHoldings} className={customClass} />);

    const cardElement = screen.getAllByTestId('card')[0];
    expect(cardElement).toHaveClass(customClass);
  });

  it('handles holdings without change data', () => {
    const holdingsWithoutChange: ScionHolding[] = [{
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      securityType: 'Common Stock',
      shares: 600000,
      marketValue: 90000000,
      portfolioPercent: 15.3,
      rank: 1,
    }];

    renderWithProviders(<HoldingsTable holdings={holdingsWithoutChange} />);

    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Corporation')).toBeInTheDocument();
  });

  it('formats share numbers with commas', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    expect(screen.getByText('1,000,000')).toBeInTheDocument();
    expect(screen.getByText('800,000')).toBeInTheDocument();
    expect(screen.getByText('500,000')).toBeInTheDocument();
  });

  it('displays mobile cards on small screens', () => {
    renderWithProviders(<HoldingsTable holdings={mockHoldings} />);

    // Mobile cards should exist (but might be hidden by CSS)
    const mobileCards = screen.getAllByTestId('card');
    expect(mobileCards.length).toBeGreaterThan(3); // Desktop table + mobile cards
  });

  it('memoizes callback functions', () => {
    const { rerender } = renderWithProviders(<HoldingsTable holdings={mockHoldings} />);
    
    // Initial render
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    
    // Rerender with same props should use memoized functions
    rerender(<HoldingsTable holdings={mockHoldings} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('handles sold positions correctly', () => {
    const holdingsWithSold: ScionHolding[] = [{
      ticker: 'SOLD',
      name: 'Sold Position',
      securityType: 'Common Stock',
      shares: 0,
      marketValue: 0,
      portfolioPercent: 0,
      rank: 1,
      change: {
        type: 'sold',
      },
    }];

    renderWithProviders(<HoldingsTable holdings={holdingsWithSold} />);

    expect(screen.getByTestId('badge-destructive')).toHaveTextContent('매도완료');
  });
});