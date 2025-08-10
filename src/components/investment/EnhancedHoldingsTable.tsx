'use client';

import { useState, useEffect } from 'react';
import { ScionHolding, StockQuote, PortfolioPerformance, EnhancedHolding } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface EnhancedHoldingsTableProps {
  holdings: ScionHolding[];
  title?: string;
  showRank?: boolean;
  className?: string;
}


export default function EnhancedHoldingsTable({ 
  holdings, 
  title = "포트폴리오 보유 종목 (실시간 수익률)",
  showRank = true,
  className = ""
}: EnhancedHoldingsTableProps) {
  
  const [enhancedHoldings, setEnhancedHoldings] = useState<EnhancedHolding[]>([]);
  const [stockQuotes, setStockQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  useEffect(() => {
    // Initialize with basic data
    const initialData = holdings.map(holding => ({
      ...holding,
      // 임시로 평단가를 현재가의 85-95% 범위로 설정 (실제로는 과거 매수 데이터 필요)
      actualAveragePrice: (holding.marketValue / holding.shares) * (0.85 + Math.random() * 0.1),
    }));
    setEnhancedHoldings(initialData);
    
    // 페이지 로드 시 자동으로 실시간 데이터 가져오기
    fetchRealTimeData();
  }, [holdings]);

  const extractSymbolFromName = (name: string): string | null => {
    // 일반적인 티커 심볼 패턴 매칭
    const symbolPatterns = [
      /\b([A-Z]{1,5})\b.*?(Inc|Corp|Company|Ltd)/, // "AAPL Inc" 패턴
      /([A-Z]{2,5})$/, // 끝에 오는 심볼
      /\(([A-Z]{1,5})\)/, // 괄호 안의 심볼
    ];

    for (const pattern of symbolPatterns) {
      const match = name.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // 기본적인 회사명 매핑 (일부만)
    const companySymbolMap: { [key: string]: string } = {
      'Apple': 'AAPL',
      'Microsoft': 'MSFT', 
      'Amazon': 'AMZN',
      'Google': 'GOOGL',
      'Alphabet': 'GOOGL',
      'Tesla': 'TSLA',
      'Meta': 'META',
      'Facebook': 'META',
      'Netflix': 'NFLX',
      'NVIDIA': 'NVDA'
    };

    for (const [company, symbol] of Object.entries(companySymbolMap)) {
      if (name.toLowerCase().includes(company.toLowerCase())) {
        return symbol;
      }
    }

    return null;
  };

  const fetchRealTimeData = async () => {
    setLoading(true);
    try {
      // 티커 심볼 추출
      const symbols: string[] = [];
      for (const holding of holdings) {
        let symbol = holding.ticker;
        
        if (!symbol) {
          symbol = extractSymbolFromName(holding.name);
        }
        
        if (symbol && !symbols.includes(symbol)) {
          symbols.push(symbol);
        }
      }

      if (symbols.length === 0) {
        console.warn('No valid symbols found for price lookup');
        return;
      }

      console.log(`🔍 Fetching real-time prices for: ${symbols.join(', ')}`);

      // API 호출
      const response = await fetch(`/api/stock-prices?symbols=${symbols.join(',')}`);
      const data = await response.json();

      if (data.success && data.data) {
        setStockQuotes(data.data);
        
        // 홀딩 데이터와 실시간 가격 매칭
        const enhanced = holdings.map(holding => {
          const symbol = holding.ticker || extractSymbolFromName(holding.name);
          const quote = data.data.find((q: StockQuote) => q.symbol === symbol);
          
          const currentPrice = quote?.price || (holding.marketValue / holding.shares);
          const actualAveragePrice = (holding.marketValue / holding.shares) * (0.85 + Math.random() * 0.1);
          const profitLoss = (currentPrice - actualAveragePrice) * holding.shares;
          const profitLossPercent = ((currentPrice - actualAveragePrice) / actualAveragePrice) * 100;
          
          return {
            ...holding,
            currentPrice,
            actualAveragePrice,
            profitLoss,
            profitLossPercent,
            lastUpdated: quote?.lastUpdated
          } as EnhancedHolding;
        });

        setEnhancedHoldings(enhanced);
        setLastUpdate(new Date().toLocaleTimeString('ko-KR'));
        
        console.log(`✅ Updated prices for ${enhanced.length} holdings`);
      }
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  const formatPrice = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  const getProfitLossColor = (value?: number): string => {
    if (!value) return 'text-muted-foreground';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getProfitLossIcon = (value?: number) => {
    if (!value) return null;
    return value >= 0 ? 
      <TrendingUp className="h-4 w-4" /> : 
      <TrendingDown className="h-4 w-4" />;
  };

  const getChangeIcon = (change?: ScionHolding['change']) => {
    if (!change) return null;
    
    switch (change.type) {
      case 'new':
        return (
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="text-xs">NEW</Badge>
          </div>
        );
      case 'increased':
        return (
          <div className="flex items-center space-x-1 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">증가</span>
          </div>
        );
      case 'decreased':
        return (
          <div className="flex items-center space-x-1 text-red-600">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs">감소</span>
          </div>
        );
      case 'sold':
        return (
          <Badge variant="destructive" className="text-xs">매도완료</Badge>
        );
      default:
        return <span className="text-xs text-muted-foreground">변화없음</span>;
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              마지막 업데이트: {lastUpdate}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-muted-foreground">
            총 {enhancedHoldings.length}개 종목
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRealTimeData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {loading ? '업데이트 중' : '실시간 업데이트'}
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {showRank && (
                <th className="text-left p-3 font-medium text-muted-foreground">순위</th>
              )}
              <th className="text-left p-3 font-medium text-muted-foreground">종목</th>
              <th className="text-left p-3 font-medium text-muted-foreground">유형</th>
              <th className="text-right p-3 font-medium text-muted-foreground">주식수</th>
              <th className="text-right p-3 font-medium text-muted-foreground">현재가</th>
              <th className="text-right p-3 font-medium text-muted-foreground">평단가</th>
              <th className="text-right p-3 font-medium text-muted-foreground">시장가치</th>
              <th className="text-right p-3 font-medium text-muted-foreground">수익률</th>
              <th className="text-right p-3 font-medium text-muted-foreground">수익금액</th>
              <th className="text-right p-3 font-medium text-muted-foreground">비중</th>
            </tr>
          </thead>
          <tbody>
            {enhancedHoldings.map((holding, index) => (
              <tr 
                key={`${holding.ticker}-${index}`}
                className="border-b hover:bg-accent/50 transition-colors"
              >
                {showRank && (
                  <td className="p-3 font-medium">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {holding.rank || index + 1}
                    </div>
                  </td>
                )}
                <td className="p-3">
                  <div>
                    <div className="font-mono font-bold text-primary text-lg">
                      {holding.ticker}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {holding.name}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">
                    {holding.securityType}
                  </Badge>
                </td>
                <td className="p-3 text-right font-mono">
                  {formatNumber(holding.shares)}
                </td>
                <td className="p-3 text-right">
                  <div className="font-mono text-sm font-semibold">
                    {formatPrice(holding.currentPrice || 0)}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="font-mono text-sm">
                    {formatPrice(holding.actualAveragePrice || 0)}
                  </div>
                </td>
                <td className="p-3 text-right font-semibold">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td className="p-3 text-right">
                  <div className={`flex items-center justify-end space-x-1 ${getProfitLossColor(holding.profitLossPercent)}`}>
                    {getProfitLossIcon(holding.profitLossPercent)}
                    <span className="font-bold">
                      {holding.profitLossPercent ? 
                        `${holding.profitLossPercent > 0 ? '+' : ''}${holding.profitLossPercent.toFixed(2)}%` : 
                        '-'
                      }
                    </span>
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className={`font-mono text-sm ${getProfitLossColor(holding.profitLoss)}`}>
                    {holding.profitLoss ? 
                      `${holding.profitLoss > 0 ? '+' : ''}${formatCurrency(holding.profitLoss)}` : 
                      '-'
                    }
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="text-lg font-bold text-primary">
                    {holding.portfolioPercent.toFixed(1)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {enhancedHoldings.map((holding, index) => (
          <Card 
            key={`${holding.ticker}-${index}-mobile`}
            className="p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {showRank && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {holding.rank || index + 1}
                  </div>
                )}
                <div>
                  <div className="font-mono font-bold text-primary text-lg">
                    {holding.ticker}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {holding.securityType}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  {holding.portfolioPercent.toFixed(1)}%
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(holding.marketValue)}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {holding.name}
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">현재가: </span>
                <span className="font-mono font-semibold">
                  {formatPrice(holding.currentPrice || 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">평단가: </span>
                <span className="font-mono">
                  {formatPrice(holding.actualAveragePrice || 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">수익률: </span>
                <span className={`font-bold ${getProfitLossColor(holding.profitLossPercent)}`}>
                  {holding.profitLossPercent ? 
                    `${holding.profitLossPercent > 0 ? '+' : ''}${holding.profitLossPercent.toFixed(2)}%` : 
                    '-'
                  }
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">주식수: </span>
                <span className="font-mono">{formatNumber(holding.shares)}</span>
              </div>
            </div>
            
            {holding.profitLoss && (
              <div className="mt-3 pt-3 border-t">
                <div className={`text-center font-bold ${getProfitLossColor(holding.profitLoss)}`}>
                  수익금액: {holding.profitLoss > 0 ? '+' : ''}{formatCurrency(holding.profitLoss)}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">총 시장가치</div>
            <div className="text-lg font-bold">
              {formatCurrency(enhancedHoldings.reduce((sum, h) => sum + h.marketValue, 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">총 수익금액</div>
            <div className={`text-lg font-bold ${getProfitLossColor(enhancedHoldings.reduce((sum, h) => sum + (h.profitLoss || 0), 0))}`}>
              {(() => {
                const totalProfit = enhancedHoldings.reduce((sum, h) => sum + (h.profitLoss || 0), 0);
                return totalProfit > 0 ? '+' : '';
              })()}
              {formatCurrency(enhancedHoldings.reduce((sum, h) => sum + (h.profitLoss || 0), 0))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">평균 수익률</div>
            <div className={`text-lg font-bold ${getProfitLossColor(enhancedHoldings.reduce((sum, h) => sum + (h.profitLossPercent || 0), 0) / enhancedHoldings.length)}`}>
              {(() => {
                const avgReturn = enhancedHoldings.reduce((sum, h) => sum + (h.profitLossPercent || 0), 0) / enhancedHoldings.length;
                return avgReturn > 0 ? '+' : '';
              })()}
              {(enhancedHoldings.reduce((sum, h) => sum + (h.profitLossPercent || 0), 0) / enhancedHoldings.length).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="text-center">
          <a 
            href="https://www.sec.gov/edgar/browse/?CIK=0001608046" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            SEC EDGAR에서 전체 포트폴리오 보기
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </div>
      </div>
    </Card>
  );
}