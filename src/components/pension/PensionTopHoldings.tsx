'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Holding {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
  change: number;
  country: string;
}

interface PensionTopHoldingsProps {
  holdings: Holding[];
}

export function PensionTopHoldings({ holdings }: PensionTopHoldingsProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  const displayedHoldings = showAll ? holdings : holdings.slice(0, 10);
  const filteredHoldings = selectedCountry === 'all' 
    ? displayedHoldings 
    : displayedHoldings.filter(h => h.country === selectedCountry);

  const countries = [...new Set(holdings.map(h => h.country))];
  
  const getCountryFlag = (countryCode: string) => {
    const flags: { [key: string]: string } = {
      'KR': '🇰🇷',
      'US': '🇺🇸',
      'TW': '🇹🇼',
      'CN': '🇨🇳',
      'JP': '🇯🇵',
      'DE': '🇩🇪',
      'NL': '🇳🇱'
    };
    return flags[countryCode] || '🌍';
  };

  const getCompanyEmoji = (symbol: string) => {
    const emojis: { [key: string]: string } = {
      '005930': '📱', // 삼성전자
      '000660': '🧠', // SK하이닉스
      'AAPL': '🍎',   // Apple
      'TSM': '💻',    // TSMC
      'MSFT': '💼',   // Microsoft
      'GOOGL': '🔍',  // Google
      'NVDA': '🎮',   // NVIDIA
      'AMZN': '📦'    // Amazon
    };
    return emojis[symbol] || '🏢';
  };

  const formatValue = (value: number, country: string) => {
    if (country === 'KR') {
      return `₩${(value / 1000000000000).toFixed(1)}조원`;
    } else {
      return `$${(value / 1000000000).toFixed(1)}B`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🏆 주요 보유종목
            <Badge variant="secondary">Top {filteredHoldings.length}</Badge>
          </CardTitle>
          
          {/* 국가 필터 */}
          <div className="flex gap-2">
            <Button
              variant={selectedCountry === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCountry('all')}
            >
              🌍 전체
            </Button>
            {countries.map(country => (
              <Button
                key={country}
                variant={selectedCountry === country ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCountry(country)}
              >
                {getCountryFlag(country)} {country}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {filteredHoldings.map((holding, index) => (
            <div
              key={holding.symbol}
              className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-[1.02] cursor-pointer group"
            >
              {/* 좌측: 순위, 회사 정보 */}
              <div className="flex items-center gap-4">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white
                  ${index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-amber-600' : 'bg-blue-500'}
                `}>
                  {index + 1}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getCompanyEmoji(holding.symbol)}</div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {holding.name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span>{holding.symbol}</span>
                      <span>{getCountryFlag(holding.country)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 우측: 금액 및 수익률 */}
              <div className="text-right">
                <div className="font-bold text-lg text-gray-900 dark:text-white">
                  {formatValue(holding.value, holding.country)}
                </div>
                <div className="text-sm text-gray-500">
                  {holding.percentage}% of portfolio
                </div>
                <div className={`text-sm font-medium ${
                  holding.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {holding.change >= 0 ? '+' : ''}{holding.change}%
                  <span className="ml-1">
                    {holding.change >= 0 ? '📈' : '📉'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 더보기 버튼 */}
        {!showAll && holdings.length > 10 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              className="w-full"
            >
              더 많은 종목 보기 ({holdings.length - 10}개 추가) 📋
            </Button>
          </div>
        )}

        {/* 포트폴리오 집중도 분석 */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            📊 포트폴리오 분석
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top 10 집중도 */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300">Top 10 집중도</div>
              <div className="text-2xl font-bold text-blue-600">
                {holdings.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0).toFixed(1)}%
              </div>
            </div>

            {/* 국가별 분산 */}
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300">국가 분산</div>
              <div className="text-2xl font-bold text-green-600">
                {countries.length}개국
              </div>
            </div>

            {/* 평균 수익률 */}
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300">평균 수익률</div>
              <div className={`text-2xl font-bold ${
                (holdings.reduce((sum, h) => sum + h.change, 0) / holdings.length) >= 0 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {((holdings.reduce((sum, h) => sum + h.change, 0) / holdings.length) >= 0 ? '+' : '')}
                {(holdings.reduce((sum, h) => sum + h.change, 0) / holdings.length).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 섹터별 인사이트 */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-yellow-600 text-xl">💻</div>
              <div className="text-sm">
                <strong>기술주 집중:</strong> 삼성전자, Apple, TSMC 등 기술주가 상위권을 차지하며 혁신 성장에 투자
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-green-600 text-xl">🌍</div>
              <div className="text-sm">
                <strong>글로벌 분산:</strong> 한국, 미국, 대만 등 주요 시장에 균형있게 투자하여 지역 리스크 분산
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-orange-600 text-xl">📈</div>
              <div className="text-sm">
                <strong>성장주 선호:</strong> 평균 수익률 +{(holdings.reduce((sum, h) => sum + h.change, 0) / holdings.length).toFixed(1)}%로 성장성 높은 우량주 중심 운용
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}