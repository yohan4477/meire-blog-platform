import { NextRequest, NextResponse } from 'next/server';
import FinancialNewsCurator, { 
  getCuratedFinancialNews, 
  getDailyFinancialDigest, 
  getBreakingFinancialNews,
  UserProfile 
} from '@/lib/financial-news-curator';

// GET /api/financial-curation - 큐레이션된 금융 콘텐츠 가져오기
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'curated';
    const userId = searchParams.get('userId');
    
    switch (action) {
      case 'curated': {
        // 사용자 프로필 처리
        let userProfile: UserProfile | undefined;
        
        if (userId) {
          // 실제 구현에서는 데이터베이스에서 사용자 프로필 가져오기
          userProfile = await getUserProfile(userId);
        }
        
        const curatedContent = await getCuratedFinancialNews(userProfile);
        
        return NextResponse.json({
          success: true,
          data: curatedContent,
          meta: {
            count: curatedContent.length,
            user_id: userId,
            generated_at: new Date().toISOString()
          }
        });
      }
      
      case 'digest': {
        const dailyDigest = await getDailyFinancialDigest();
        
        return NextResponse.json({
          success: true,
          data: dailyDigest,
          meta: {
            type: 'daily_digest',
            generated_at: new Date().toISOString()
          }
        });
      }
      
      case 'breaking': {
        const breakingNews = await getBreakingFinancialNews();
        
        return NextResponse.json({
          success: true,
          data: breakingNews,
          meta: {
            count: breakingNews.length,
            type: 'breaking_news',
            checked_at: new Date().toISOString()
          }
        });
      }
      
      case 'raw_news': {
        const curator = FinancialNewsCurator.getInstance();
        const rawNews = curator.getCachedNews();
        
        // 필터링 옵션
        const limit = parseInt(searchParams.get('limit') || '50');
        const source = searchParams.get('source');
        const sector = searchParams.get('sector');
        
        let filteredNews = rawNews;
        
        if (source) {
          filteredNews = filteredNews.filter(news => 
            news.source.toLowerCase().includes(source.toLowerCase())
          );
        }
        
        if (sector) {
          filteredNews = filteredNews.filter(news => 
            news.sector?.toLowerCase() === sector.toLowerCase()
          );
        }
        
        // 최신 순으로 정렬
        filteredNews.sort((a, b) => 
          new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
        );
        
        const limitedNews = filteredNews.slice(0, limit);
        
        return NextResponse.json({
          success: true,
          data: limitedNews,
          meta: {
            count: limitedNews.length,
            total_available: rawNews.length,
            filters: { source, sector, limit }
          }
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Financial curation API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/financial-curation - 사용자 프로필 업데이트 및 수동 콘텐츠 수집
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    
    switch (action) {
      case 'update_profile': {
        const { userId, profile } = params;
        
        if (!userId || !profile) {
          return NextResponse.json(
            { success: false, error: 'Missing userId or profile data' },
            { status: 400 }
          );
        }
        
        // 사용자 프로필 업데이트
        await updateUserProfile(userId, profile);
        
        // 업데이트된 프로필로 콘텐츠 재생성
        const updatedContent = await getCuratedFinancialNews(profile);
        
        return NextResponse.json({
          success: true,
          data: {
            profile: profile,
            curated_content: updatedContent
          },
          meta: {
            updated_at: new Date().toISOString()
          }
        });
      }
      
      case 'force_refresh': {
        const curator = FinancialNewsCurator.getInstance();
        
        // 수동 뉴스 수집
        const freshNews = await curator.collectNews();
        
        // AI 분석 수행
        const analyzedNews = await curator.analyzeNewsWithAI(freshNews);
        
        return NextResponse.json({
          success: true,
          data: {
            news_collected: freshNews.length,
            news_analyzed: analyzedNews.filter(n => n.analyzed).length,
            latest_news: analyzedNews.slice(0, 10)
          },
          meta: {
            refreshed_at: new Date().toISOString()
          }
        });
      }
      
      case 'analyze_portfolio_impact': {
        const { portfolioSymbols, newsIds } = params;
        
        if (!portfolioSymbols || !Array.isArray(portfolioSymbols)) {
          return NextResponse.json(
            { success: false, error: 'Invalid portfolio symbols' },
            { status: 400 }
          );
        }
        
        const curator = FinancialNewsCurator.getInstance();
        const allNews = curator.getCachedNews();
        
        // 지정된 뉴스 또는 최신 뉴스 분석
        const newsToAnalyze = newsIds 
          ? allNews.filter(news => newsIds.includes(news.id))
          : allNews.slice(0, 20);
        
        // 포트폴리오 영향 분석
        const portfolioImpact = await analyzePortfolioImpact(newsToAnalyze, portfolioSymbols);
        
        return NextResponse.json({
          success: true,
          data: portfolioImpact,
          meta: {
            portfolio_symbols: portfolioSymbols,
            news_analyzed: newsToAnalyze.length,
            analyzed_at: new Date().toISOString()
          }
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Financial curation POST API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 유틸리티 함수들
async function getUserProfile(userId: string): Promise<UserProfile | undefined> {
  try {
    // 실제 구현에서는 데이터베이스에서 가져오기
    // 여기서는 localStorage에서 가져오기 시도
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`user_profile_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    
    // 기본 프로필 반환
    return {
      id: userId,
      interests: ['technology', 'AI', 'market analysis'],
      sectors: ['Technology', 'Finance'],
      risk_tolerance: 'MEDIUM',
      news_frequency: 'HOURLY',
      content_types: ['NEWS', 'ANALYSIS', 'INSIGHTS']
    };
    
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return undefined;
  }
}

async function updateUserProfile(userId: string, profile: UserProfile): Promise<void> {
  try {
    // 실제 구현에서는 데이터베이스에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(profile));
    }
    
    console.log(`User profile updated for ${userId}`);
    
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
}

async function analyzePortfolioImpact(news: any[], portfolioSymbols: string[]): Promise<any> {
  try {
    // 포트폴리오에 영향을 주는 뉴스 필터링
    const relevantNews = news.filter(newsItem => 
      newsItem.related_stocks?.some((stock: string) => portfolioSymbols.includes(stock)) ||
      newsItem.keywords?.some((keyword: string) => 
        portfolioSymbols.some(symbol => 
          keyword.toLowerCase().includes(symbol.toLowerCase())
        )
      )
    );
    
    // 영향도 계산
    const impactAnalysis = {
      total_portfolio_exposure: relevantNews.length,
      high_impact_news: relevantNews.filter(news => news.investment_impact === 'HIGH').length,
      positive_sentiment: relevantNews.filter(news => (news.sentiment_score || 0) > 0.6).length,
      negative_sentiment: relevantNews.filter(news => (news.sentiment_score || 0) < 0.4).length,
      affected_symbols: portfolioSymbols.filter(symbol => 
        relevantNews.some(news => 
          news.related_stocks?.includes(symbol) ||
          news.keywords?.some((keyword: string) => 
            keyword.toLowerCase().includes(symbol.toLowerCase())
          )
        )
      ),
      risk_score: calculateRiskScore(relevantNews),
      recommendations: generatePortfolioRecommendations(relevantNews, portfolioSymbols)
    };
    
    return impactAnalysis;
    
  } catch (error) {
    console.error('Portfolio impact analysis failed:', error);
    throw error;
  }
}

function calculateRiskScore(news: any[]): number {
  if (news.length === 0) return 0;
  
  const highImpactCount = news.filter(n => n.investment_impact === 'HIGH').length;
  const negativeSentimentCount = news.filter(n => (n.sentiment_score || 0) < 0.4).length;
  
  const riskScore = Math.min(1.0, 
    (highImpactCount * 0.3 + negativeSentimentCount * 0.2) / news.length
  );
  
  return Math.round(riskScore * 100) / 100;
}

function generatePortfolioRecommendations(news: any[], portfolioSymbols: string[]): string[] {
  const recommendations: string[] = [];
  
  const highRiskNews = news.filter(n => 
    n.investment_impact === 'HIGH' && (n.sentiment_score || 0) < 0.4
  );
  
  if (highRiskNews.length > 0) {
    recommendations.push('높은 위험도를 가진 부정적 뉴스가 발견되었습니다. 포지션 조정을 고려해보세요.');
  }
  
  const positiveNews = news.filter(n => (n.sentiment_score || 0) > 0.7);
  if (positiveNews.length > 2) {
    recommendations.push('긍정적인 뉴스가 많습니다. 다음 매수 기회를 탐색해보세요.');
  }
  
  if (news.length < 3) {
    recommendations.push('포트폴리오 관련 뉴스가 제한적입니다. 다각화를 고려해보세요.');
  }
  
  return recommendations;
}