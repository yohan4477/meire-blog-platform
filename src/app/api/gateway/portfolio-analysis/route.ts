/**
 * 통합 포트폴리오 분석 API 엔드포인트
 * GET /api/gateway/portfolio-analysis?symbols=AAPL,MSFT&includeNPS=true
 * POST /api/gateway/portfolio-analysis (상세 분석)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAPIGateway } from '@/lib/api-gateway/gateway';
import { z } from 'zod';

// GET 요청 스키마
const GetQuerySchema = z.object({
  symbols: z.string().min(1, 'At least one symbol is required'),
  includeNPS: z.coerce.boolean().optional().default(true),
  includeKRX: z.coerce.boolean().optional().default(false),
  includeFSS: z.coerce.boolean().optional().default(false),
  period: z.enum(['1d', '5d', '1m', '3m', '6m', '1y', '2y', '5y']).optional().default('1y'),
  analysisType: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('basic'),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

// POST 요청 스키마
const PostBodySchema = z.object({
  portfolio: z.object({
    holdings: z.array(z.object({
      symbol: z.string(),
      shares: z.number().positive(),
      avgPurchasePrice: z.number().positive().optional(),
      purchaseDate: z.string().optional(),
    })),
    name: z.string().optional(),
    currency: z.enum(['USD', 'KRW']).optional().default('USD'),
  }),
  analysisOptions: z.object({
    includeNPS: z.boolean().optional().default(true),
    includeKRX: z.boolean().optional().default(false),
    includeFSS: z.boolean().optional().default(false),
    includeNews: z.boolean().optional().default(false),
    includeFinancials: z.boolean().optional().default(false),
    riskAnalysis: z.boolean().optional().default(true),
    performanceComparison: z.boolean().optional().default(true),
    rebalancingRecommendations: z.boolean().optional().default(false),
  }).optional().default({
    includeNPS: true,
    includeKRX: false,
    includeFSS: false,
    includeNews: false,
    includeFinancials: false,
    riskAnalysis: true,
    performanceComparison: true,
    rebalancingRecommendations: false,
  }),
  timeframe: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    period: z.enum(['1d', '5d', '1m', '3m', '6m', '1y', '2y', '5y']).optional().default('1y'),
  }).optional().default({
    period: '1y'
  }),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const validatedParams = GetQuerySchema.parse(params);
    
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';

    const gateway = getAPIGateway();
    
    // 심볼 배열 파싱
    const symbols = validatedParams.symbols.split(',').map(s => s.trim().toUpperCase());
    
    if (symbols.length > 20) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TOO_MANY_SYMBOLS',
          message: 'Maximum 20 symbols allowed for portfolio analysis'
        }
      }, { status: 400 });
    }

    // 기본 포트폴리오 분석 실행
    const result = await gateway.getPortfolioAnalysis(symbols, clientId);
    
    if (!result.success) {
      const status = getErrorStatus(result.error?.code);
      return NextResponse.json(result, { status });
    }

    // 추가 데이터 수집 (옵션에 따라)
    const additionalData: any = {};
    
    if (validatedParams.includeKRX) {
      try {
        const krxResult = await gateway.getKRXMarketData({
          numOfRows: 100
        }, clientId);
        if (krxResult.success) {
          additionalData.krxData = krxResult.data;
        }
      } catch (error) {
        console.warn('Failed to fetch KRX data:', error);
      }
    }

    if (validatedParams.includeFSS) {
      try {
        // 최근 7일간의 공시 정보
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const fssResult = await gateway.getFSSDisclosureData({
          bgn_de: formatDate(startDate),
          end_de: formatDate(endDate),
          page_count: 50
        }, clientId);
        
        if (fssResult.success) {
          additionalData.recentDisclosures = fssResult.data;
        }
      } catch (error) {
        console.warn('Failed to fetch FSS data:', error);
      }
    }

    // 분석 결과 강화
    const enhancedAnalysis = enhanceAnalysis(result.data, additionalData, validatedParams);

    // 응답 헤더 설정
    const headers = new Headers({
      'Content-Type': validatedParams.format === 'csv' ? 'text/csv' : 'application/json',
      'X-Processing-Time': `${Date.now() - startTime}ms`,
      'X-Request-ID': result.metadata.requestId,
      'X-Analysis-Type': validatedParams.analysisType,
      'X-Symbols-Count': symbols.length.toString(),
    });

    // CSV 응답
    if (validatedParams.format === 'csv') {
      const csvData = convertAnalysisToCSV(enhancedAnalysis);
      return new NextResponse(csvData, { headers });
    }

    return NextResponse.json({
      ...result,
      data: enhancedAnalysis,
      metadata: {
        ...result.metadata,
        analysisType: validatedParams.analysisType,
        symbolsAnalyzed: symbols,
        additionalDataSources: Object.keys(additionalData)
      }
    }, { headers });

  } catch (error) {
    console.error('Portfolio analysis API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: 'Portfolio analysis failed',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const validatedBody = PostBodySchema.parse(body);
    
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous';

    const gateway = getAPIGateway();
    
    // 포트폴리오에서 심볼 추출
    const symbols = validatedBody.portfolio.holdings.map(h => h.symbol.toUpperCase());
    
    // 병렬로 여러 데이터 소스에서 정보 수집
    const dataPromises = [];
    
    // 기본 포트폴리오 분석
    dataPromises.push(
      gateway.getPortfolioAnalysis(symbols, clientId)
        .then(result => ({ type: 'portfolio', data: result }))
    );

    // 주식 시세 정보
    dataPromises.push(
      gateway.getMultipleStockQuotes(symbols, clientId)
        .then(result => ({ type: 'quotes', data: result }))
    );

    // 옵션에 따른 추가 데이터
    if (validatedBody.analysisOptions.includeNPS) {
      dataPromises.push(
        gateway.getNPSInvestmentData({ numOfRows: 200 }, clientId)
          .then(result => ({ type: 'nps', data: result }))
      );
    }

    if (validatedBody.analysisOptions.includeFinancials) {
      // 각 종목의 재무제표 정보
      symbols.forEach(symbol => {
        dataPromises.push(
          gateway.getCompanyFinancials(symbol, 'annual', clientId)
            .then(result => ({ type: 'financials', symbol, data: result }))
        );
      });
    }

    if (validatedBody.analysisOptions.includeNews) {
      // 각 종목의 뉴스 정보
      symbols.forEach(symbol => {
        dataPromises.push(
          gateway.getStockNews(symbol, clientId)
            .then(result => ({ type: 'news', symbol, data: result }))
        );
      });
    }

    // 모든 데이터 수집 완료 대기
    const results = await Promise.allSettled(dataPromises);
    
    // 결과 정리
    const collectedData: any = {
      portfolio: null,
      quotes: null,
      nps: null,
      financials: {},
      news: {},
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { type, data } = result.value;
        const symbol = (result.value as any).symbol;
        
        if (symbol) {
          // 심볼별 데이터
          if (!collectedData[type]) collectedData[type] = {};
          collectedData[type][symbol] = data;
        } else {
          // 전역 데이터
          collectedData[type] = data;
        }
      }
    });

    // 포트폴리오 상세 분석 수행
    const comprehensiveAnalysis = performComprehensiveAnalysis(
      validatedBody.portfolio,
      collectedData,
      validatedBody.analysisOptions
    );

    return NextResponse.json({
      success: true,
      data: comprehensiveAnalysis,
      metadata: {
        requestId: `portfolio_analysis_${Date.now()}`,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        dataSource: 'comprehensive_analysis',
        cached: false,
        symbolsAnalyzed: symbols,
        holdingsCount: validatedBody.portfolio.holdings.length,
        analysisOptions: validatedBody.analysisOptions
      }
    });

  } catch (error) {
    console.error('Detailed portfolio analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'DETAILED_ANALYSIS_ERROR',
        message: 'Detailed portfolio analysis failed',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

// 헬퍼 함수들

function enhanceAnalysis(baseAnalysis: any, additionalData: any, params: any): any {
  const enhanced = {
    ...baseAnalysis,
    additionalInsights: {},
    marketContext: {},
    recommendations: []
  };

  // KRX 데이터 기반 시장 컨텍스트 추가
  if (additionalData.krxData) {
    enhanced.marketContext.koreanMarket = analyzeKRXContext(additionalData.krxData);
  }

  // FSS 공시 데이터 기반 리스크 분석
  if (additionalData.recentDisclosures) {
    enhanced.additionalInsights.recentDisclosures = analyzeDisclosures(additionalData.recentDisclosures);
  }

  // 분석 타입에 따른 추가 처리
  if (params.analysisType === 'detailed' || params.analysisType === 'comprehensive') {
    enhanced.technicalAnalysis = performTechnicalAnalysis(baseAnalysis.stocks);
  }

  if (params.analysisType === 'comprehensive') {
    enhanced.riskMetrics = calculateRiskMetrics(baseAnalysis.stocks);
    enhanced.diversificationScore = calculateDiversificationScore(baseAnalysis.stocks);
  }

  return enhanced;
}

function performComprehensiveAnalysis(portfolio: any, collectedData: any, options: any): any {
  const analysis: any = {
    portfolioOverview: calculatePortfolioOverview(portfolio, collectedData.quotes?.data),
    performance: {},
    risk: {},
    diversification: {},
    recommendations: [],
    marketComparison: {}
  };

  // 포트폴리오 성과 분석
  if (collectedData.quotes?.success) {
    analysis.performance = calculatePortfolioPerformance(portfolio.holdings, collectedData.quotes.data);
  }

  // 리스크 분석
  if (options.riskAnalysis) {
    analysis.risk = calculateRiskAnalysis(portfolio.holdings, collectedData.quotes?.data);
  }

  // NPS 비교 분석
  if (options.includeNPS && collectedData.nps?.success) {
    analysis.marketComparison.npsComparison = compareWithNPS(portfolio.holdings, collectedData.nps.data);
  }

  // 재무제표 기반 분석
  if (options.includeFinancials && Object.keys(collectedData.financials).length > 0) {
    analysis.fundamentalAnalysis = analyzeFundamentals(collectedData.financials);
  }

  // 뉴스 기반 센티멘트 분석
  if (options.includeNews && Object.keys(collectedData.news).length > 0) {
    analysis.sentimentAnalysis = analyzeNewsSentiment(collectedData.news);
  }

  // 리밸런싱 추천
  if (options.rebalancingRecommendations) {
    analysis.recommendations = generateRebalancingRecommendations(analysis);
  }

  return analysis;
}

function calculatePortfolioOverview(portfolio: any, quotes: any[]): any {
  if (!quotes || quotes.length === 0) {
    return { error: 'No quote data available' };
  }

  let totalValue = 0;
  const holdings = portfolio.holdings.map((holding: any) => {
    const quote = quotes.find(q => q.symbol === holding.symbol);
    if (quote) {
      const currentValue = holding.shares * quote.price;
      totalValue += currentValue;
      
      return {
        ...holding,
        currentPrice: quote.price,
        currentValue,
        unrealizedGain: holding.avgPurchasePrice 
          ? currentValue - (holding.shares * holding.avgPurchasePrice)
          : null,
        unrealizedGainPercent: holding.avgPurchasePrice
          ? ((quote.price - holding.avgPurchasePrice) / holding.avgPurchasePrice) * 100
          : null
      };
    }
    return holding;
  });

  return {
    totalValue,
    totalHoldings: holdings.length,
    currency: portfolio.currency || 'USD',
    holdings,
    lastUpdated: new Date().toISOString()
  };
}

function calculatePortfolioPerformance(holdings: any[], quotes: any[]): any {
  // 간단한 성과 계산 로직
  const performance = {
    totalReturn: 0,
    totalReturnPercent: 0,
    weightedReturn: 0,
    bestPerformer: null,
    worstPerformer: null
  };

  let totalCost = 0;
  let totalValue = 0;
  const returns: any[] = [];

  holdings.forEach(holding => {
    const quote = quotes.find(q => q.symbol === holding.symbol);
    if (quote && holding.avgPurchasePrice) {
      const cost = holding.shares * holding.avgPurchasePrice;
      const value = holding.shares * quote.price;
      const returnPercent = ((quote.price - holding.avgPurchasePrice) / holding.avgPurchasePrice) * 100;
      
      totalCost += cost;
      totalValue += value;
      
      returns.push({
        symbol: holding.symbol,
        returnPercent,
        returnAmount: value - cost
      });
    }
  });

  if (totalCost > 0) {
    performance.totalReturn = totalValue - totalCost;
    performance.totalReturnPercent = (performance.totalReturn / totalCost) * 100;
  }

  if (returns.length > 0) {
    returns.sort((a, b) => b.returnPercent - a.returnPercent);
    performance.bestPerformer = returns[0];
    performance.worstPerformer = returns[returns.length - 1];
  }

  return performance;
}

function calculateRiskAnalysis(holdings: any[], quotes: any[]): any {
  // 간단한 리스크 분석
  return {
    diversificationScore: holdings.length >= 10 ? 'High' : holdings.length >= 5 ? 'Medium' : 'Low',
    concentrationRisk: holdings.length < 5 ? 'High' : 'Low',
    sectorDiversification: 'Unknown', // 실제로는 섹터 정보 필요
    recommendations: [
      holdings.length < 10 ? 'Consider adding more holdings for better diversification' : null,
      holdings.length < 5 ? 'High concentration risk detected' : null
    ].filter(Boolean)
  };
}

function compareWithNPS(holdings: any[], npsData: any[]): any {
  // NPS와의 비교 분석
  const comparison: {
    commonHoldings: any[];
    uniqueHoldings: any[];
    npsTopHoldings: any[];
    analysis: string;
  } = {
    commonHoldings: [],
    uniqueHoldings: [],
    npsTopHoldings: npsData.slice(0, 10),
    analysis: 'Basic comparison completed'
  };

  holdings.forEach(holding => {
    const npsHolding = npsData.find(nps => 
      nps.stockCode === holding.symbol || 
      nps.stockName?.toLowerCase().includes(holding.symbol.toLowerCase())
    );
    
    if (npsHolding) {
      comparison.commonHoldings.push({
        symbol: holding.symbol,
        npsMarketValue: npsHolding.marketValue,
        npsRatio: npsHolding.ratio
      });
    } else {
      comparison.uniqueHoldings.push(holding.symbol);
    }
  });

  return comparison;
}

function analyzeFundamentals(financialsData: any): any {
  // 재무제표 분석
  const analysis: {
    averageMetrics: any;
    valueStocks: any[];
    growthStocks: any[];
    riskStocks: any[];
  } = {
    averageMetrics: {},
    valueStocks: [],
    growthStocks: [],
    riskStocks: []
  };

  // 각 종목의 재무지표 분석
  Object.entries(financialsData).forEach(([symbol, data]: [string, any]) => {
    if (data.success && data.data && data.data.length > 0) {
      const latest = data.data[0];
      
      if (latest.peRatio && latest.peRatio < 15) {
        analysis.valueStocks.push({ symbol, peRatio: latest.peRatio });
      }
      
      if (latest.roe && latest.roe > 15) {
        analysis.growthStocks.push({ symbol, roe: latest.roe });
      }
      
      if (latest.debtToEquity && latest.debtToEquity > 2) {
        analysis.riskStocks.push({ symbol, debtToEquity: latest.debtToEquity });
      }
    }
  });

  return analysis;
}

function analyzeNewsSentiment(newsData: any): any {
  // 뉴스 센티멘트 분석
  const analysis: {
    overallSentiment: string;
    positiveStories: number;
    negativeStories: number;
    neutralStories: number;
    keyTopics: any[];
    riskAlerts: any[];
  } = {
    overallSentiment: 'neutral',
    positiveStories: 0,
    negativeStories: 0,
    neutralStories: 0,
    keyTopics: [],
    riskAlerts: []
  };

  Object.entries(newsData).forEach(([symbol, data]: [string, any]) => {
    if (data.success && data.data) {
      data.data.forEach((article: any) => {
        if (article.sentiment > 0.1) {
          analysis.positiveStories++;
        } else if (article.sentiment < -0.1) {
          analysis.negativeStories++;
        } else {
          analysis.neutralStories++;
        }
        
        // 리스크 키워드 검사
        const riskKeywords = ['lawsuit', 'investigation', 'fraud', 'bankruptcy', 'loss'];
        const hasRiskKeyword = riskKeywords.some(keyword => 
          article.title?.toLowerCase().includes(keyword) ||
          article.summary?.toLowerCase().includes(keyword)
        );
        
        if (hasRiskKeyword) {
          analysis.riskAlerts.push({
            symbol,
            title: article.title,
            publishedAt: article.publishedAt
          });
        }
      });
    }
  });

  const totalStories = analysis.positiveStories + analysis.negativeStories + analysis.neutralStories;
  if (totalStories > 0) {
    const positiveRatio = analysis.positiveStories / totalStories;
    const negativeRatio = analysis.negativeStories / totalStories;
    
    if (positiveRatio > 0.6) {
      analysis.overallSentiment = 'positive';
    } else if (negativeRatio > 0.6) {
      analysis.overallSentiment = 'negative';
    }
  }

  return analysis;
}

function generateRebalancingRecommendations(analysis: any): any[] {
  const recommendations = [];
  
  // 간단한 리밸런싱 추천 로직
  if (analysis.risk?.concentrationRisk === 'High') {
    recommendations.push({
      type: 'diversification',
      priority: 'high',
      description: 'Consider diversifying your portfolio by adding more holdings',
      action: 'Add 5-10 additional stocks from different sectors'
    });
  }

  if (analysis.fundamentalAnalysis?.riskStocks?.length > 0) {
    recommendations.push({
      type: 'risk_management',
      priority: 'medium',
      description: 'Some holdings have high debt levels',
      action: `Review positions in: ${analysis.fundamentalAnalysis.riskStocks.map((s: any) => s.symbol).join(', ')}`
    });
  }

  if (analysis.sentimentAnalysis?.riskAlerts?.length > 0) {
    recommendations.push({
      type: 'news_based',
      priority: 'high',
      description: 'Negative news detected for some holdings',
      action: 'Monitor recent developments closely'
    });
  }

  return recommendations;
}

function analyzeKRXContext(krxData: any[]): any {
  // KRX 시장 컨텍스트 분석
  return {
    totalRecords: krxData.length,
    markets: [...new Set(krxData.map(item => item.marketType))],
    averageVolume: krxData.reduce((sum, item) => sum + (item.volume || 0), 0) / krxData.length,
    analysis: 'Korean market context analysis'
  };
}

function analyzeDisclosures(disclosures: any[]): any {
  // 공시 분석
  return {
    totalDisclosures: disclosures.length,
    recentCount: disclosures.filter(d => {
      const disclosureDate = new Date(d.disclosureDate);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return disclosureDate > dayAgo;
    }).length,
    types: [...new Set(disclosures.map(d => d.disclosureType))],
    analysis: 'Recent disclosure analysis'
  };
}

function performTechnicalAnalysis(stocks: any[]): any {
  // 기술적 분석 (간단한 버전)
  return {
    analysisType: 'basic_technical',
    stockCount: stocks.length,
    analysis: 'Technical analysis requires historical price data'
  };
}

function calculateRiskMetrics(stocks: any[]): any {
  // 리스크 메트릭 계산
  return {
    portfolioRisk: 'medium',
    volatilityEstimate: 'unknown',
    analysis: 'Risk metrics require historical data for accurate calculation'
  };
}

function calculateDiversificationScore(stocks: any[]): any {
  // 다각화 점수 계산
  const score = Math.min(stocks.length / 10, 1) * 100; // 10개 종목을 100% 다각화로 가정
  
  return {
    score: Math.round(score),
    level: score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low',
    recommendation: score < 80 ? 'Consider adding more diverse holdings' : 'Well diversified portfolio'
  };
}

function convertAnalysisToCSV(analysis: any): string {
  // 분석 결과를 CSV로 변환 (기본 구현)
  const rows = [];
  
  if (analysis.stocks) {
    rows.push('Symbol,Company,Price,Change,ChangePercent,Volume');
    analysis.stocks.forEach((stock: any) => {
      rows.push(`${stock.symbol},${stock.companyName},${stock.price},${stock.change},${stock.changePercent},${stock.volume}`);
    });
  }
  
  return rows.join('\n');
}

function formatDate(date: Date): string {
  const parts = date.toISOString().split('T');
  return (parts[0] || '').replace(/-/g, '');
}

function getErrorStatus(errorCode?: string): number {
  switch (errorCode) {
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    case 'TOO_MANY_SYMBOLS':
    case 'INVALID_PARAMETERS':
      return 400;
    case 'NOT_FOUND':
      return 404;
    case 'UNAUTHORIZED':
      return 401;
    default:
      return 500;
  }
}