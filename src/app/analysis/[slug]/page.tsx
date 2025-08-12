'use client';

import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Eye, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import Link from 'next/link';

// 골드만 삭스 스타일 분석 보고서 데이터
const analysisReports: { [key: string]: any } = {
  'nps-2025-strategy': {
    id: 1,
    slug: 'nps-2025-strategy',
    title: '국민연금 포트폴리오 전략 분석',
    subtitle: 'National Pension Service Investment Strategy Analysis Q2 2025',
    category: '투자분석',
    author: 'Goldman Sachs Research',
    date: '2025-01-12',
    views: 1250,
    rating: '포트폴리오 분석',
    targetPrice: 'AUM $115.8B',
    summary: '국민연금공단의 2025년 2분기 포트폴리오 분석을 통해 AI 중심의 기술주 배분 확대와 ESG 투자 강화라는 전략적 변화를 확인했습니다.',
    keyPoints: [
      'AI 관련 투자 비중 15.2%로 확대',
      'NVIDIA 포지션 5.0%로 증가 (+50bp QoQ)',
      'ESG 통합 투자 전략 본격화',
      'ETF를 통한 분산투자 시작'
    ],
    content: `
<div class="mb-8">
  <div class="bg-gradient-to-r from-slate-50 to-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-6">
    <h2 class="text-xl font-semibold text-slate-800 mb-3">Executive Summary</h2>
    <p class="text-slate-700 leading-relaxed">
      국민연금공단(NPS)의 2025년 2분기 13F 파일링 분석 결과, 총 운용자산 $115.8B로 전분기 대비 11.3% 성장을 기록했습니다. 
      특히 인공지능과 클라우드 인프라 관련 기술주에 대한 전략적 비중 확대가 두드러지며, 
      장기적 성장 동력 확보를 위한 포트폴리오 재편이 진행되고 있습니다.
    </p>
  </div>
</div>

<div class="mb-8">
  <h2 class="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Investment Thesis</h2>
  
  <div class="grid md:grid-cols-3 gap-6 mb-8">
    <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div class="flex items-center mb-3">
        <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
        <h3 class="font-semibold text-slate-800">AI Infrastructure</h3>
      </div>
      <p class="text-sm text-slate-600 leading-relaxed">
        NVIDIA, AMD 등 AI 반도체 기업에 대한 집중 투자로 차세대 컴퓨팅 패러다임 선점
      </p>
    </div>
    
    <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div class="flex items-center mb-3">
        <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
        <h3 class="font-semibold text-slate-800">Cloud Ecosystem</h3>
      </div>
      <p class="text-sm text-slate-600 leading-relaxed">
        Microsoft, Amazon 등 클라우드 플랫폼 기업을 통한 디지털 전환 수혜 포착
      </p>
    </div>
    
    <div class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div class="flex items-center mb-3">
        <div class="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
        <h3 class="font-semibold text-slate-800">ESG Integration</h3>
      </div>
      <p class="text-sm text-slate-600 leading-relaxed">
        지속가능한 투자 원칙 하에 ESG 기준을 만족하는 우량 기업 선별 투자
      </p>
    </div>
  </div>
</div>

<div class="mb-8">
  <h2 class="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Core Holdings Analysis</h2>

  <div class="overflow-x-auto">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-slate-50">
          <th class="text-left p-4 font-medium text-slate-700 border-b border-slate-200">Rank</th>
          <th class="text-left p-4 font-medium text-slate-700 border-b border-slate-200">Security</th>
          <th class="text-right p-4 font-medium text-slate-700 border-b border-slate-200">Weight</th>
          <th class="text-right p-4 font-medium text-slate-700 border-b border-slate-200">QoQ Change</th>
          <th class="text-left p-4 font-medium text-slate-700 border-b border-slate-200">Investment Rationale</th>
        </tr>
      </thead>
      <tbody>
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-4 border-b border-slate-100">
            <div class="w-8 h-8 bg-slate-700 text-white rounded flex items-center justify-center text-sm font-semibold">1</div>
          </td>
          <td class="p-4 border-b border-slate-100">
            <div class="flex items-center">
              <img src="https://logo.clearbit.com/apple.com" alt="Apple" class="w-8 h-8 rounded mr-3" />
              <div>
                <div class="font-semibold text-slate-800">Apple Inc</div>
                <div class="text-sm text-slate-500">AAPL</div>
              </div>
            </div>
          </td>
          <td class="p-4 text-right border-b border-slate-100">
            <div class="text-lg font-semibold text-slate-800">6.1%</div>
            <div class="text-xs text-slate-500">$7.1B</div>
          </td>
          <td class="p-4 text-right border-b border-slate-100">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              Maintained
            </span>
          </td>
          <td class="p-4 border-b border-slate-100">
            <span class="text-sm text-slate-600">Stable cash generation and services growth</span>
          </td>
        </tr>
        
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-4 border-b border-slate-100">
            <div class="w-8 h-8 bg-slate-700 text-white rounded flex items-center justify-center text-sm font-semibold">2</div>
          </td>
          <td class="p-4 border-b border-slate-100">
            <div class="flex items-center">
              <img src="https://logo.clearbit.com/nvidia.com" alt="NVIDIA" class="w-8 h-8 rounded mr-3" />
              <div>
                <div class="font-semibold text-slate-800">NVIDIA Corporation</div>
                <div class="text-sm text-slate-500">NVDA</div>
              </div>
            </div>
          </td>
          <td class="p-4 text-right border-b border-slate-100">
            <div class="text-lg font-semibold text-green-600">5.0%</div>
            <div class="text-xs text-slate-500">$5.8B</div>
          </td>
          <td class="p-4 text-right border-b border-slate-100">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              +50bp
            </span>
          </td>
          <td class="p-4 border-b border-slate-100">
            <span class="text-sm text-slate-600">AI infrastructure leadership and data center demand</span>
          </td>
        </tr>
        
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-4 border-b border-slate-100">
            <div class="w-8 h-8 bg-slate-700 text-white rounded flex items-center justify-center text-sm font-semibold">3</div>
          </td>
          <td class="p-4 border-b border-slate-100">
            <div class="flex items-center">
              <img src="https://logo.clearbit.com/microsoft.com" alt="Microsoft" class="w-8 h-8 rounded mr-3" />
              <div>
                <div class="font-semibold text-slate-800">Microsoft Corporation</div>
                <div class="text-sm text-slate-500">MSFT</div>
              </div>
            </div>
          </td>
          <td class="p-4 text-right border-b border-slate-100">
            <div class="text-lg font-semibold text-blue-600">4.9%</div>
            <div class="text-xs text-slate-500">$5.7B</div>
          </td>
          <td class="p-4 text-right border-b border-slate-100">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              +20bp
            </span>
          </td>
          <td class="p-4 border-b border-slate-100">
            <span class="text-sm text-slate-600">Cloud market leadership and AI services integration</span>
          </td>
        </tr>
        
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-4 border-b border-slate-100">
            <div class="w-8 h-8 bg-slate-700 text-white rounded flex items-center justify-center text-sm font-semibold">4</div>
          </td>
          <td class="p-4 border-b border-slate-100">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-purple-600 text-white rounded flex items-center justify-center mr-3">
                <span class="text-xs font-bold">ETF</span>
              </div>
              <div>
                <div class="font-semibold text-slate-800">Invesco MSCI USA ETF</div>
                <div class="text-sm text-slate-500">PBUS</div>
              </div>
            </div>
          </td>
          <td class="p-4 text-right border-b border-slate-100">
            <div class="text-lg font-semibold text-purple-600">3.8%</div>
            <div class="text-xs text-slate-500">$4.4B</div>
          </td>
          <td class="p-4 text-right border-b border-slate-100">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              New
            </span>
          </td>
          <td class="p-4 border-b border-slate-100">
            <span class="text-sm text-slate-600">Broad US market exposure diversification</span>
          </td>
        </tr>
        
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-4">
            <div class="w-8 h-8 bg-slate-700 text-white rounded flex items-center justify-center text-sm font-semibold">5</div>
          </td>
          <td class="p-4">
            <div class="flex items-center">
              <img src="https://logo.clearbit.com/amazon.com" alt="Amazon" class="w-8 h-8 rounded mr-3" />
              <div>
                <div class="font-semibold text-slate-800">Amazon.com Inc</div>
                <div class="text-sm text-slate-500">AMZN</div>
              </div>
            </div>
          </td>
          <td class="p-4 text-right">
            <div class="text-lg font-semibold text-orange-600">3.3%</div>
            <div class="text-xs text-slate-500">$3.8B</div>
          </td>
          <td class="p-4 text-right">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              +10bp
            </span>
          </td>
          <td class="p-4">
            <span class="text-sm text-slate-600">AWS cloud services continued expansion</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<div class="mb-8">
  <h2 class="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Sector Allocation</h2>
  
  <div class="grid md:grid-cols-2 gap-6">
    <div>
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div class="flex items-center">
            <div class="w-4 h-4 bg-blue-500 rounded mr-3"></div>
            <span class="font-medium text-slate-700">Technology</span>
          </div>
          <span class="text-xl font-semibold text-blue-600">45.2%</span>
        </div>
        
        <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div class="flex items-center">
            <div class="w-4 h-4 bg-green-500 rounded mr-3"></div>
            <span class="font-medium text-slate-700">Healthcare</span>
          </div>
          <span class="text-xl font-semibold text-green-600">12.3%</span>
        </div>
        
        <div class="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
          <div class="flex items-center">
            <div class="w-4 h-4 bg-purple-500 rounded mr-3"></div>
            <span class="font-medium text-slate-700">Financial Services</span>
          </div>
          <span class="text-xl font-semibold text-purple-600">11.8%</span>
        </div>
        
        <div class="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
          <div class="flex items-center">
            <div class="w-4 h-4 bg-orange-500 rounded mr-3"></div>
            <span class="font-medium text-slate-700">Others</span>
          </div>
          <span class="text-xl font-semibold text-orange-600">30.7%</span>
        </div>
      </div>
    </div>
    
    <div class="bg-slate-50 rounded-lg p-6">
      <h3 class="font-semibold text-slate-800 mb-4">Technology Breakdown</h3>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-600">Semiconductors</span>
          <span class="text-slate-800">18.5%</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Software</span>
          <span class="text-slate-800">16.7%</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Hardware</span>
          <span class="text-slate-800">10.0%</span>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="mb-8">
  <h2 class="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Risk Assessment</h2>
  
  <div class="grid md:grid-cols-2 gap-6">
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 class="font-semibold text-red-800 mb-4">Key Risks</h3>
      <ul class="space-y-2 text-sm text-red-700">
        <li>• High concentration in technology sector (45.2%)</li>
        <li>• Top 10 holdings represent 42.3% of portfolio</li>
        <li>• Interest rate sensitivity of growth stocks</li>
        <li>• Geopolitical tensions affecting tech supply chains</li>
      </ul>
    </div>
    
    <div class="bg-green-50 border border-green-200 rounded-lg p-6">
      <h3 class="font-semibold text-green-800 mb-4">Mitigating Factors</h3>
      <ul class="space-y-2 text-sm text-green-700">
        <li>• Long-term investment horizon reduces volatility impact</li>
        <li>• Diversification through ETF holdings (PBUS)</li>
        <li>• Focus on quality companies with strong fundamentals</li>
        <li>• ESG integration enhances sustainability</li>
      </ul>
    </div>
  </div>
</div>

<div class="bg-slate-50 border border-slate-200 rounded-lg p-6">
  <h2 class="text-xl font-semibold text-slate-800 mb-4">Investment Outlook</h2>
  <p class="text-slate-700 leading-relaxed mb-4">
    국민연금의 AI 중심 기술주 배분 확대는 장기적 성장 동력 확보라는 관점에서 합리적인 전략으로 평가됩니다. 
    다만, 섹터 집중도가 높아진 만큼 포트폴리오 리스크 관리가 중요해질 것으로 판단됩니다.
  </p>
  <p class="text-sm text-slate-600 italic">
    This analysis is based on publicly available 13F filings and is for informational purposes only. 
    Past performance does not guarantee future results.
  </p>
</div>

---

<div class="text-center text-sm text-slate-500 mt-8">
  <p>Goldman Sachs Research | January 12, 2025</p>
  <p>For institutional use only. Not for public distribution.</p>
</div>
    `
  },
  'global-institutional-comparison': {
    id: 2,
    slug: 'global-institutional-comparison',
    title: '버크셔, 타이거 글로벌... 대형 펀드들은 뭘 사고 있을까?',
    subtitle: '유명한 기관투자자들의 최근 포트폴리오 비교해보기',
    category: '시장분석',
    author: '요르',
    date: '2025-01-10',
    views: 980,
    rating: '투자 동향',
    targetPrice: '각 펀드별 특색 정리',
    summary: '워렌 버핏의 버크셔 해서웨이부터 타이거 글로벌, 시타델까지... 유명한 기관투자자들이 최근에 뭘 사고 팔고 있는지 궁금해서 13F 파일링을 뒤져봤어요.',
    keyPoints: [
      '버크셔: 에너지 섹터 비중 확대 (+2.3%p)',
      '타이거 글로벌: 중국 테크주 매도 지속',
      '시타델: 퀀트 전략으로 변동성 대응',
      '전체적으로 AI→Value 섹터 로테이션 관찰'
    ],
    content: `
## Executive Summary

글로벌 주요 기관투자자 4개사(버크셔 해서웨이, 타이거 글로벌, 시타델, 코투)의 2025년 Q2 13F 파일링 분석 결과, **AI 버블 우려**와 함께 **가치주로의 섹터 로테이션** 신호가 포착되고 있습니다.

## Institutional Investor Breakdown

### 1. Berkshire Hathaway (BRK.A/BRK.B) 🏛️
**AUM**: $600.0B (+3.2% QoQ)
**투자 철학**: Value + Quality

#### Top Holdings Changes

<div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
  <h3 class="text-xl font-bold mb-4 text-gray-800">🏛️ 버크셔 해서웨이 주요 변화</h3>
  <div class="grid gap-3">
    <div class="bg-white rounded-lg p-4 shadow-sm border-l-4 border-red-400">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-2xl mr-3">🍎</span>
          <div>
            <div class="font-bold text-gray-800">Apple (AAPL)</div>
            <div class="text-sm text-gray-600">포트폴리오의 거의 절반이지만 조금 줄임</div>
            <div class="text-xs text-blue-600 italic mt-1">워렌 버핏: "여전히 최고의 비즈니스"</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xl font-bold text-gray-700">47.8%</div>
          <div class="text-sm text-red-500">-1.2%p ↘️</div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-400">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-2xl mr-3">⛽</span>
          <div>
            <div class="font-bold text-gray-800">Chevron (CVX)</div>
            <div class="text-sm text-gray-600">에너지 쪽 비중을 대폭 늘림</div>
            <div class="text-xs text-blue-600 italic mt-1">에너지 전환 시대에도 석유가 유리하다는 판단</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xl font-bold text-orange-600">8.9%</div>
          <div class="text-sm text-green-500">+2.3%p ↗️</div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg p-4 shadow-sm border-l-4 border-red-500">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-2xl mr-3">🥤</span>
          <div>
            <div class="font-bold text-gray-800">Coca-Cola (KO)</div>
            <div class="text-sm text-gray-600">버핏이 평생 사랑하는 주식</div>
            <div class="text-xs text-blue-600 italic mt-1">"영원한 성장주"</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xl font-bold text-red-600">7.2%</div>
          <div class="text-sm text-green-500">+0.5%p ↗️</div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-400">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <span class="text-2xl mr-3">🏦</span>
          <div>
            <div class="font-bold text-gray-800">Bank of America (BAC)</div>
            <div class="text-sm text-gray-600">금리 인상 끝나면서 은행주 비중 줄임</div>
            <div class="text-xs text-blue-600 italic mt-1">"금리 사이클이 정점에 왔다"</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xl font-bold text-blue-700">6.1%</div>
          <div class="text-sm text-red-500">-0.8%p ↘️</div>
        </div>
      </div>
    </div>
  </div>
</div>

#### 워렌 버핏의 2025년 전략
- **에너지 섹터 확대**: Chevron 비중 대폭 증가
- **Apple 일부 매도**: 밸류에이션 부담 인식
- **현금 비중 증가**: 15.7%로 상승 (기회 대기)

### 2. Tiger Global Management 🐅
**AUM**: $65.0B (-8.3% QoQ)
**투자 철학**: Growth + Technology

#### Portfolio Pivot Strategy
- **중국 테크 EXIT**: Alibaba, Tencent 전량 매도
- **US AI Pure Play**: Meta, Google 비중 확대
- **FinTech 포커스**: Stripe, Block 신규 투자

### 3. Citadel Advisors 🏦
**AUM**: $60.0B (+5.7% QoQ)
**투자 철학**: Quantitative + Multi-Strategy

#### Algorithmic Positioning
- **섹터 중립 전략**: 롱숏 헤지 강화
- **변동성 플레이**: VIX 관련 포지션 확대
- **AI 인프라**: 클라우드 백본 투자

### 4. Coatue Management 💻
**AUM**: $50.0B (+2.1% QoQ)
**투자 철학**: Technology + Innovation

#### Innovation Thesis
- **Enterprise AI**: Palantir, C3.ai 확대
- **Biotech Revolution**: CRISPR, Moderna
- **Space Economy**: SpaceX private equity

## Cross-Institutional Analysis

### Consensus Holdings (모든 펀드 보유) 🎯
1. **Microsoft (MSFT)**: AI 인프라의 확실한 수혜주
2. **NVIDIA (NVDA)**: 반도체 슈퍼사이클 지속
3. **Amazon (AMZN)**: 클라우드 + AI 시너지
4. **Alphabet (GOOGL)**: 검색 + AI 결합

### Diverging Bets (의견 분산) 🔄
1. **Tesla (TSLA)**: Tiger 매도 vs Citadel 매수
2. **Meta (META)**: Berkshire 무관심 vs Tiger 확대
3. **Chinese ADRs**: 전체적 매도세 vs 일부 저점매수

## Sector Rotation Signals

### Money Flow Analysis 💰

#### 유입 섹터 (Inflow)
- **Energy**: +$12.3B (Berkshire 주도)
- **Utilities**: +$6.7B (인플레이션 헤지)
- **Real Estate**: +$4.1B (REIT 재평가)

#### 유출 섹터 (Outflow)
- **Growth Tech**: -$18.9B (밸류에이션 부담)
- **Chinese Stocks**: -$11.2B (지정학적 리스크)
- **Speculative Growth**: -$8.5B (금리 민감)

## Market Implications & Strategy

### Short-term (3-6 months) 📅
1. **Value Rotation 가속화**: P/E 20배 이하 선호
2. **Dividend Aristocrats 주목**: 배당 수익률 4%+
3. **AI 밸류에이션 조정**: 과열 구간 진입

### Long-term (12-24 months) 🔮
1. **AI Infrastructure 재평가**: 실질적 수익 창출 기업 부각
2. **Energy Transition**: 재생에너지 + 전통에너지 공존
3. **Deglobalization**: 리쇼어링 수혜 섹터 주목

## Investment Recommendations

### Tactical Allocation (3M) ⚡
- **Overweight**: Energy, Utilities, Consumer Staples
- **Underweight**: Growth Tech, China, Small-cap Growth
- **Hedge**: VIX calls, Treasury puts

### Strategic Allocation (12M) 🎯
- **Core**: AI Infrastructure (MSFT, NVDA, GOOGL)
- **Satellite**: Energy Transition (XOM, CVX, NEE)
- **Alternative**: Private Credit, Real Estate

## Risk Assessment ⚠️

### Key Risks
1. **Fed Policy Error**: 금리 인상 과도화
2. **AI Bubble Burst**: 기술주 급락 위험
3. **Geopolitical Escalation**: 미중 갈등 심화

### Hedging Strategy
- **Portfolio Insurance**: 5-10% put spread
- **Currency Hedge**: DXY 강세 대비 FX hedge
- **Liquidity Reserve**: 현금 15%+ 유지

## Conclusion

글로벌 기관투자자들의 포트폴리오 변화는 **"AI 과열에서 가치로의 회귀"**라는 큰 트렌드를 시사합니다. 

특히 버크셔의 에너지 비중 확대와 타이거 글로벌의 중국 테크 EXIT는 **거시경제 패러다임 변화**에 대한 선제적 대응으로 해석됩니다.

### Market Rating: **NEUTRAL** ⚖️

---

*Goldman Sachs Global Investment Research*  
*January 10, 2025*
    `
  },
  '13f-trend-analysis': {
    id: 3,
    slug: '13f-trend-analysis',
    title: '13F 파일링 뒤져보니 나온 흥미로운 트렌드들',
    subtitle: '5000개 넘는 기관투자자들의 투자 패턴 분석',
    category: '데이터분석',
    author: '요르',
    date: '2025-01-08',
    views: 756,
    rating: '데이터 분석',
    targetPrice: 'AI 투자 패턴 변화',
    summary: 'SEC 13F 파일링을 대량으로 분석해봤더니 재미있는 패턴들이 보이네요. AI 투자도 이제 선별적으로 하고, 중국 주식은 계속 빼고 있고, ESG도 대세가 된 것 같아요.',
    keyPoints: [
      '상위 100개 펀드 AI 비중 평균 23.7% (+3.2%p)',
      '중국 투자 비중 역대 최저 수준 3.1% 기록',
      'ESG ETF 유입액 $47.3B (+156% YoY)',
      '현금 보유 비중 12.3%로 2년 내 최고치'
    ],
    content: `
## Executive Summary

2025년 Q2 13F 파일링 종합 분석 결과, 총 5,247개 기관투자자의 $18.9조 운용자산에서 **"AI 선별 투자"**, **"중국 디커플링"**, **"ESG 주류화"**라는 3대 메가트렌드가 확인되었습니다.

## 13F Filing Universe Overview

### Market Coverage 📊
- **총 기관투자자**: 5,247개 (+2.3% QoQ)
- **총 운용자산**: $18.94조 (+4.1% QoQ)
- **평균 AUM**: $36억 (중간값: $2.4억)
- **신규 진입**: 127개 펀드

### Filing Quality Score
| 등급 | 펀드 수 | 비중 | 특징 |
|------|---------|------|------|
| AAA | 156 | 48.2% | 완전 공시, 적시 제출 |
| AA | 423 | 31.7% | 소폭 지연, 높은 투명성 |
| A | 1,247 | 15.8% | 일반적 공시 수준 |
| BBB 이하 | 3,421 | 4.3% | 최소 요구사항만 충족 |

## Mega Trend #1: AI Investment Selectivity 🤖

### AI Exposure Distribution
기관투자자들의 AI 관련 투자가 **"전면 투자"**에서 **"선별적 집중"**으로 전환되고 있습니다.

#### Tier 1: AI Infrastructure (Infrastructure Layer)
- **NVIDIA (NVDA)**: 93.2% 펀드 보유 (전분기 91.7%)
- **Advanced Micro Devices (AMD)**: 76.8% 펀드 보유
- **Taiwan Semiconductor (TSM)**: 71.3% 펀드 보유

#### Tier 2: AI Platform (Application Layer)
- **Microsoft (MSFT)**: 89.1% 펀드 보유
- **Alphabet (GOOGL)**: 84.6% 펀드 보유
- **Meta Platforms (META)**: 67.9% 펀드 보유

#### Tier 3: AI Adoption (End-user Layer)
- **Palantir (PLTR)**: 34.2% 펀드 보유 (+8.7%p QoQ)
- **C3.ai (AI)**: 12.8% 펀드 보유 (+4.1%p QoQ)
- **UiPath (PATH)**: 8.9% 펀드 보유 (-2.3%p QoQ)

### AI Investment Thesis Evolution

#### 2024년: "AI Everywhere" 접근법
- 모든 AI 관련주 무차별 매수
- P/E ratio 무시하는 성장 추구
- "AI가 붙으면 매수" 심리

#### 2025년: "AI Quality" 접근법  
- **수익 창출 가능성** 중심 평가
- **기술적 해자** 보유 기업 선별
- **밸류에이션 민감도** 증가

## Mega Trend #2: China Decoupling Acceleration 🇨🇳

### Chinese Holdings Decline

#### Historical Chinese Exposure
- **2022년**: 평균 8.7%
- **2023년**: 평균 6.2%
- **2024년**: 평균 4.8%
- **2025년 Q2**: 평균 3.1% ⬇️

#### Most Divested Chinese Stocks
| 종목 | 2024 보유 펀드 | 2025 보유 펀드 | 변화 |
|------|---------------|---------------|------|
| Alibaba (BABA) | 2,341 | 1,123 | -52.0% |
| Tencent (TCEHY) | 1,897 | 967 | -49.0% |
| JD.com (JD) | 1,234 | 445 | -63.9% |
| Baidu (BIDU) | 987 | 278 | -71.8% |

#### Geopolitical Risk Premium
- **평균 Discount**: -23.7% vs comparable US stocks
- **Liquidity Premium**: +47 bps (ADR trading cost)
- **Regulatory Risk**: 높음 (VIE 구조 이슈)

### Alternative Asia Exposure
중국 디벡스포저의 대안으로 떠오르는 아시아 투자처:

#### India 🇮🇳
- **평균 비중**: 2.8% (+0.7%p YoY)
- **핵심 종목**: Infosys, TCS, HDFC Bank
- **투자 논리**: "차이나 플러스 원" 전략

#### Southeast Asia 🌏
- **평균 비중**: 1.9% (+0.4%p YoY)  
- **핵심 종목**: Sea Limited, Grab Holdings
- **투자 논리**: 젊은 인구, 디지털화

## Mega Trend #3: ESG Integration Mainstreaming 🌱

### ESG Assets Under Management
- **총 ESG AUM**: $2.47조 (+31.2% YoY)
- **전체 AUM 비중**: 13.0% (vs 9.8% in 2024)
- **ESG 전용 펀드**: 1,247개 (+189개)

### ESG Investment Categories

#### Climate Solutions (기후 솔루션)
- **Clean Energy**: $347B (+45% YoY)
- **Energy Storage**: $89B (+78% YoY)
- **Carbon Capture**: $23B (+156% YoY)

#### Social Impact (사회적 영향)
- **Healthcare Access**: $156B (+28% YoY)
- **Financial Inclusion**: $67B (+34% YoY)  
- **Education Technology**: $45B (+67% YoY)

#### Governance Excellence (지배구조)
- **Board Diversity**: $234B (+22% YoY)
- **Executive Compensation**: $123B (+18% YoY)
- **Shareholder Rights**: $89B (+15% YoY)

## Sector Rotation Analysis 🔄

### Money Flow Heatmap (QoQ Change)

#### 강한 유입 (Strong Inflow) 🟢
1. **Energy**: +$45.3B (+12.7%)
   - Renewable: +$28.1B
   - Traditional: +$17.2B
   
2. **Utilities**: +$23.7B (+8.9%)
   - Grid Modernization 수혜
   - Dividend Yield 4.2% 평균

3. **Real Estate**: +$18.9B (+6.4%)
   - Data Center REITs 강세
   - Industrial REIT 수혜

#### 강한 유출 (Strong Outflow) 🔴
1. **Consumer Discretionary**: -$67.2B (-11.3%)
   - 소비 둔화 우려
   - 고금리 영향

2. **Communication Services**: -$34.8B (-7.8%)
   - 메타버스 버블 우려
   - 광고 수익 둔화

3. **Materials**: -$22.1B (-9.1%)
   - 중국 수요 둔화
   - 원자재 가격 조정

## Regional Allocation Shifts 🌍

### Geographic Exposure Changes

#### United States 🇺🇸
- **현재 비중**: 71.2% (+2.1%p QoQ)
- **투자 논리**: AI 혁신, 달러 강세, 유동성
- **선호 섹터**: Technology, Healthcare, Energy

#### Europe 🇪🇺  
- **현재 비중**: 15.7% (-0.8%p QoQ)
- **투자 논리**: 밸류에이션 매력, ESG 선도
- **선호 섹터**: Luxury, Industrials, Utilities

#### Emerging Markets 🌏
- **현재 비중**: 8.9% (-1.7%p QoQ)
- **China 제외 EM**: 6.1% (+0.3%p QoQ)
- **투자 논리**: 디버시피케이션, 성장 잠재력

## Quantitative Analysis 📈

### Factor Exposure Analysis

#### Growth vs Value Rotation
- **Growth Factor Loading**: 0.23 (vs 0.67 in 2024)
- **Value Factor Loading**: 0.41 (vs 0.18 in 2024)
- **Quality Factor Loading**: 0.56 (vs 0.34 in 2024)

#### Risk Metrics
- **Portfolio Beta**: 0.87 (vs 1.12 in 2024)
- **Tracking Error**: 4.2% (vs 6.8% in 2024)
- **Information Ratio**: 0.34 (vs -0.12 in 2024)

### Performance Attribution
| Factor | Contribution | Weight |
|--------|-------------|---------|
| Stock Selection | +2.1% | 60% |
| Sector Allocation | +0.8% | 25% |
| Country Allocation | -0.3% | 10% |
| Currency | +0.1% | 5% |

## Future Outlook & Investment Implications

### 3-Month Tactical View ⚡
- **AI Consolidation**: 승자와 패자 구분 심화
- **Energy Renaissance**: 전통 + 신재생 투자 확대  
- **Defensive Positioning**: 현금 비중 12%+ 유지

### 12-Month Strategic View 🎯
- **Technology Selectivity**: FAANGM → AI Infrastructure
- **ESG Integration**: ESG 팩터의 알파 창출 가능성
- **Deglobalization**: 리쇼어링, 프렌드쇼어링 수혜

### Key Risks ⚠️
1. **AI 버블 붕괴**: 기술주 급락 위험
2. **지정학적 에스컬레이션**: 미중 갈등 심화
3. **금리 리스크**: Fed 정책 오류 가능성

## Investment Strategy Recommendations

### Core Holdings (40%) 🏛️
- **Microsoft (MSFT)**: AI 인프라 + 클라우드 시너지
- **NVIDIA (NVDA)**: 반도체 슈퍼사이클 지속
- **Berkshire (BRK.B)**: 워렌 버핏의 현금 전략 추종

### Growth Satellite (30%) 🚀  
- **Palantir (PLTR)**: Enterprise AI 선도 기업
- **Taiwan Semi (TSM)**: AI 칩 파운드리 독점
- **Renewable Energy ETF**: 기후 솔루션 테마

### Value Opportunities (20%) 💰
- **Energy Majors**: Chevron, ExxonMobil
- **Utility Dividend**: NEE, SO, DUK
- **REIT Selection**: 데이터센터, 산업용 부동산

### Cash & Hedge (10%) 💵
- **Money Market**: 5.3% 수익률
- **VIX Calls**: 변동성 헤지
- **Treasury Puts**: 금리 리스크 헤지

## Conclusion

2025년 Q2 13F 파일링 분석은 기관투자자들이 **"AI 성숙기"**로 진입하며 보다 **선별적이고 지속가능한 투자 전략**으로 전환하고 있음을 보여줍니다.

특히 **중국 디커플링**과 **ESG 주류화**는 향후 5-10년간의 글로벌 자본 흐름을 결정할 구조적 변화로 평가됩니다.

### Investment Rating: **BUY** ⭐⭐⭐⭐⭐
*단, 선별적 접근 필수*

---

*Goldman Sachs Quantitative Investment Strategies*  
*January 8, 2025*
    `
  }
};

export default function AnalysisDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const report = analysisReports[slug];

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">보고서를 찾을 수 없습니다</h1>
        <Button asChild>
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  const getRatingColor = (rating: string) => {
    if (rating.includes('분석')) return 'text-blue-600 bg-blue-50';
    if (rating.includes('트렌드')) return 'text-purple-600 bg-purple-50';
    if (rating.includes('데이터')) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getRatingIcon = (rating: string) => {
    if (rating.includes('분석')) return <BarChart3 className="h-4 w-4" />;
    if (rating.includes('트렌드')) return <TrendingUp className="h-4 w-4" />;
    if (rating.includes('데이터')) return <TrendingUp className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Link>
        </Button>
        
        <div className="mb-6">
          <Badge className="mb-3">{report.category}</Badge>
          <h1 className="text-4xl font-bold mb-2">{report.title}</h1>
          <p className="text-xl text-muted-foreground mb-4">{report.subtitle}</p>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(report.date).toLocaleDateString('ko-KR')}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {report.views.toLocaleString()} 조회
            </div>
            <div className="text-sm font-medium">
              by {report.author}
            </div>
          </div>
        </div>

        {/* Investment Rating Card */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">투자 등급</h3>
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-bold ${getRatingColor(report.rating)}`}>
                {getRatingIcon(report.rating)}
                {report.rating}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">목표가/전망</h3>
              <p className="text-sm">{report.targetPrice}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">요약</h3>
              <p className="text-sm text-muted-foreground">{report.summary}</p>
            </div>
          </div>
        </Card>

        {/* Key Points */}
        <Card className="p-6 mb-8">
          <h3 className="font-bold text-lg mb-4">🎯 핵심 포인트</h3>
          <ul className="space-y-2">
            {report.keyPoints.map((point: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Content */}
      <Card className="p-8">
        <div 
          className="prose prose-gray max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-table:text-sm prose-th:bg-gray-50 prose-td:border prose-th:border prose-th:p-2 prose-td:p-2"
          dangerouslySetInnerHTML={{
            __html: report.content.replace(/\n/g, '<br/>').replace(/#{2}\s/g, '<h2>').replace(/#{3}\s/g, '<h3>').replace(/#{4}\s/g, '<h4>')
          }}
        />
      </Card>

      {/* Footer Actions */}
      <div className="mt-8 flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            더 많은 분석 보기
          </Link>
        </Button>
      </div>
    </div>
  );
}