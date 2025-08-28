import { ScionPortfolio } from '@/types';

// Mock data representing Korean National Pension Service (NPS) portfolio
// Market value based on actual 13F filing data
export const mockScionPortfolio: ScionPortfolio = {
  filerName: '국민연금',
  filerId: 1649579,
  quarter: 'Q1 2025',
  reportDate: '2025-03-31',
  totalValue: 175200000, // $175.2M based on previous close
  totalPositions: 8,
  lastUpdated: new Date().toISOString(),
  holdings: [
    {
      ticker: 'NVDA PUT',
      name: 'NVIDIA Corp PUT Options',
      securityType: 'PUT',
      shares: 100000,
      marketValue: 85792000,
      portfolioPercent: 48.96,
      rank: 1,
      change: {
        shares: 25000,
        marketValue: 15000000,
        type: 'increased',
        quarterlyTrend: {
          Q4_2024: { shares: 75000, marketValue: 70792000 },
          Q1_2025: { shares: 100000, marketValue: 85792000 },
          Q2_2025: { shares: 120000, marketValue: 98000000 }
        }
      }
    },
    {
      ticker: 'BABA PUT',
      name: 'Alibaba Group Holding PUT Options',
      securityType: 'PUT',
      shares: 300000,
      marketValue: 23244800,
      portfolioPercent: 13.27,
      rank: 2,
      change: {
        shares: 0,
        marketValue: -2000000,
        type: 'decreased',
        quarterlyTrend: {
          Q4_2024: { shares: 350000, marketValue: 28244800 },
          Q1_2025: { shares: 300000, marketValue: 23244800 },
          Q2_2025: { shares: 280000, marketValue: 21000000 }
        }
      }
    },
    {
      ticker: 'KKR',
      name: 'KKR & Co Inc',
      securityType: 'Stock',
      shares: 200000,
      marketValue: 21024000,
      portfolioPercent: 12.00,
      rank: 3,
      change: {
        shares: 50000,
        marketValue: 5250000,
        type: 'increased',
        quarterlyTrend: {
          Q4_2024: { shares: 150000, marketValue: 16024000 },
          Q1_2025: { shares: 200000, marketValue: 21024000 },
          Q2_2025: { shares: 250000, marketValue: 26500000 }
        }
      }
    },
    {
      ticker: 'TPG',
      name: 'TPG Inc',
      securityType: 'Stock',
      shares: 350000,
      marketValue: 17520000,
      portfolioPercent: 10.00,
      rank: 4,
      change: {
        shares: 350000,
        marketValue: 17520000,
        type: 'new'
      }
    },
    {
      ticker: 'BRK.B',
      name: 'Berkshire Hathaway Inc Class B',
      securityType: 'Stock',
      shares: 25000,
      marketValue: 10512000,
      portfolioPercent: 6.00,
      rank: 5,
      change: {
        shares: 0,
        marketValue: 800000,
        type: 'unchanged'
      }
    },
    {
      ticker: 'JD',
      name: 'JD.com Inc',
      securityType: 'Stock', 
      shares: 180000,
      marketValue: 7008000,
      portfolioPercent: 4.00,
      rank: 6,
      change: {
        shares: -20000,
        marketValue: -500000,
        type: 'decreased'
      }
    },
    {
      ticker: 'GOLD',
      name: 'Barrick Gold Corp',
      securityType: 'Stock',
      shares: 400000,
      marketValue: 7008000,
      portfolioPercent: 4.00,
      rank: 7,
      change: {
        shares: 100000,
        marketValue: 1750000,
        type: 'increased'
      }
    },
    {
      ticker: 'GOOGL PUT',
      name: 'Alphabet Inc PUT Options',
      securityType: 'PUT',
      shares: 50000,
      marketValue: 3091200,
      portfolioPercent: 1.77,
      rank: 8,
      change: {
        shares: 50000,
        marketValue: 3091200,
        type: 'new'
      }
    }
  ]
};

// Function to create mock data with current timestamp
export function createMockScionData(): ScionPortfolio {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const reportDate = lastMonth.toISOString().split('T')[0] || lastMonth.toISOString().substring(0, 10);
  
  return {
    ...mockScionPortfolio,
    lastUpdated: new Date().toISOString(),
    reportDate
  };
}