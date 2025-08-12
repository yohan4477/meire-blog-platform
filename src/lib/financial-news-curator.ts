import { AIAgentExecutor } from './ai-agents';
import { mcp__memory__create_entities, mcp__memory__add_observations, mcp__memory__search_nodes } from '../types/mcp';

// 뉴스 아이템 타입 정의
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  published_date: string;
  sector?: string;
  keywords: string[];
  sentiment_score?: number;
  importance_score?: number;
  analyzed: boolean;
  summary?: string;
  investment_impact?: 'HIGH' | 'MEDIUM' | 'LOW';
  related_stocks?: string[];
}

// 큐레이션된 콘텐츠 타입
export interface CuratedContent {
  id: string;
  type: 'NEWS' | 'ANALYSIS' | 'INSIGHT';
  title: string;
  content: string;
  source: string;
  created_date: string;
  relevance_score: number;
  user_match_score?: number;
  tags: string[];
  related_news: string[];
  ai_analysis?: {
    agent_type: string;
    confidence_score: number;
    key_insights: string[];
    investment_thesis: string;
  };
}

// 사용자 프로필 타입
export interface UserProfile {
  id: string;
  interests: string[];
  sectors: string[];
  portfolio_symbols?: string[];
  risk_tolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  news_frequency: 'REAL_TIME' | 'HOURLY' | 'DAILY';
  content_types: ('NEWS' | 'ANALYSIS' | 'INSIGHTS')[];
}

// 금융 뉴스 큐레이션 시스템
export class FinancialNewsCurator {
  private static instance: FinancialNewsCurator;
  private aiExecutor: AIAgentExecutor;
  private newsCache: Map<string, NewsItem> = new Map();
  private curatedCache: Map<string, CuratedContent> = new Map();
  
  // 뉴스 소스 설정
  private newsSources = [
    {
      name: 'Reuters Business',
      url: 'https://www.reuters.com/business/',
      selector: 'article',
      priority: 'HIGH'
    },
    {
      name: 'Bloomberg Markets',
      url: 'https://www.bloomberg.com/markets',
      selector: '.story-package-module__story',
      priority: 'HIGH'
    },
    {
      name: 'Financial Times',
      url: 'https://www.ft.com/markets',
      selector: 'article',
      priority: 'HIGH'
    },
    {
      name: 'MarketWatch',
      url: 'https://www.marketwatch.com/',
      selector: '.article__headline',
      priority: 'MEDIUM'
    },
    {
      name: 'Yahoo Finance',
      url: 'https://finance.yahoo.com/news/',
      selector: '[data-test-locator="mega"]',
      priority: 'MEDIUM'
    }
  ];

  private constructor() {
    this.aiExecutor = AIAgentExecutor.getInstance();
    this.initializeScheduler();
  }

  static getInstance(): FinancialNewsCurator {
    if (!FinancialNewsCurator.instance) {
      FinancialNewsCurator.instance = new FinancialNewsCurator();
    }
    return FinancialNewsCurator.instance;
  }

  // 실시간 뉴스 수집
  async collectNews(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];
    
    for (const source of this.newsSources) {
      try {
        console.log(`Fetching news from ${source.name}...`);
        
        // MCP fetch 서버를 활용한 뉴스 수집
        const response = await this.fetchFromSource(source);
        const newsItems = await this.parseNewsResponse(response, source);
        
        allNews.push(...newsItems);
        
        // 메모리 서버에 뉴스 데이터 저장
        await this.storeNewsInMemory(newsItems);
        
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
      }
    }

    // 중복 제거 및 캐시 업데이트
    const uniqueNews = this.deduplicateNews(allNews);
    uniqueNews.forEach(news => this.newsCache.set(news.id, news));

    return uniqueNews;
  }

  // MCP fetch 서버를 통한 뉴스 소스 접근
  private async fetchFromSource(source: any): Promise<string> {
    try {
      // 실제 구현에서는 MCP fetch 서버 API 호출
      // 여기서는 시뮬레이션된 응답 반환
      const mockResponse = await this.generateMockNewsData(source.name);
      return JSON.stringify(mockResponse);
    } catch (error) {
      console.error(`Fetch error for ${source.name}:`, error);
      throw error;
    }
  }

  // 뉴스 응답 파싱
  private async parseNewsResponse(response: string, source: any): Promise<NewsItem[]> {
    try {
      const data = JSON.parse(response);
      
      return data.articles?.map((article: any, index: number) => ({
        id: `${source.name.toLowerCase().replace(' ', '_')}_${Date.now()}_${index}`,
        title: article.title,
        content: article.description || article.content,
        url: article.url,
        source: source.name,
        published_date: article.publishedAt || new Date().toISOString(),
        keywords: this.extractKeywords(article.title + ' ' + (article.description || '')),
        analyzed: false
      })) || [];
    } catch (error) {
      console.error('Failed to parse news response:', error);
      return [];
    }
  }

  // AI 에이전트를 활용한 뉴스 분석
  async analyzeNewsWithAI(newsItems: NewsItem[]): Promise<NewsItem[]> {
    const analyzedNews: NewsItem[] = [];

    for (const news of newsItems) {
      if (news.analyzed) {
        analyzedNews.push(news);
        continue;
      }

      try {
        // Goldman Sachs 에이전트로 중요도 평가
        const importanceAnalysis = await this.aiExecutor.executeAgent({
          agent_type: 'goldman_sachs',
          action: 'analyze_news_importance',
          parameters: {
            title: news.title,
            content: news.content,
            source: news.source
          }
        });

        // Bloomberg 에이전트로 감정 분석
        const sentimentAnalysis = await this.aiExecutor.executeAgent({
          agent_type: 'bloomberg',
          action: 'analyze_sentiment',
          parameters: {
            content: news.content,
            title: news.title
          }
        });

        // 분석 결과 통합
        const analyzedNewsItem: NewsItem = {
          ...news,
          analyzed: true,
          importance_score: importanceAnalysis.data?.importance_score || 0.5,
          sentiment_score: sentimentAnalysis.data?.sentiment_score || 0.5,
          summary: importanceAnalysis.data?.summary,
          investment_impact: this.determineInvestmentImpact(
            importanceAnalysis.data?.importance_score || 0.5
          ),
          related_stocks: importanceAnalysis.data?.related_stocks || [],
          sector: this.identifySector(news.keywords)
        };

        analyzedNews.push(analyzedNewsItem);
        
        // 캐시 업데이트
        this.newsCache.set(news.id, analyzedNewsItem);

      } catch (error) {
        console.error(`Failed to analyze news ${news.id}:`, error);
        analyzedNews.push({ ...news, analyzed: false });
      }
    }

    return analyzedNews;
  }

  // 개인화된 콘텐츠 큐레이션
  async curateContentForUser(userProfile: UserProfile): Promise<CuratedContent[]> {
    try {
      // 최신 뉴스 수집
      const latestNews = await this.collectNews();
      
      // AI 분석 수행
      const analyzedNews = await this.analyzeNewsWithAI(latestNews);
      
      // 사용자 관심사에 맞는 필터링
      const relevantNews = this.filterByUserInterests(analyzedNews, userProfile);
      
      // AI 인사이트 생성
      const insights = await this.generateAIInsights(relevantNews, userProfile);
      
      // 큐레이션된 콘텐츠 생성
      const curatedContent = await this.createCuratedContent(relevantNews, insights, userProfile);
      
      // 메모리 서버에 저장
      await this.storeCuratedContentInMemory(curatedContent);
      
      return curatedContent;
      
    } catch (error) {
      console.error('Content curation failed:', error);
      return [];
    }
  }

  // 오늘의 주요 뉴스 요약 생성
  async generateDailyDigest(): Promise<{
    summary: string;
    top_stories: NewsItem[];
    market_outlook: any;
    sectors_in_focus: string[];
  }> {
    try {
      // 지난 24시간 뉴스 수집
      const recentNews = Array.from(this.newsCache.values())
        .filter(news => {
          const newsDate = new Date(news.published_date);
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return newsDate > yesterday;
        })
        .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0));

      // 상위 5개 뉴스 선정
      const topStories = recentNews.slice(0, 5);

      // Goldman Sachs 에이전트로 시장 전망 생성
      const marketOutlook = await this.aiExecutor.executeAgent({
        agent_type: 'goldman_sachs',
        action: 'market_outlook',
        parameters: {
          timeframe: '1D',
          news_context: topStories.map(story => ({
            title: story.title,
            impact: story.investment_impact
          }))
        }
      });

      // 섹터 분석
      const sectorsInFocus = this.analyzeSectorTrends(recentNews);

      // 종합 요약 생성
      const summary = await this.generateSummary(topStories, marketOutlook.data);

      return {
        summary,
        top_stories: topStories,
        market_outlook: marketOutlook.data,
        sectors_in_focus: sectorsInFocus
      };

    } catch (error) {
      console.error('Failed to generate daily digest:', error);
      throw error;
    }
  }

  // 실시간 알림 시스템
  async checkForBreakingNews(): Promise<NewsItem[]> {
    const breakingNews: NewsItem[] = [];
    
    try {
      // 최근 30분간의 뉴스 확인
      const recentNews = Array.from(this.newsCache.values())
        .filter(news => {
          const newsDate = new Date(news.published_date);
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          return newsDate > thirtyMinutesAgo;
        });

      // 높은 중요도 뉴스 필터링
      for (const news of recentNews) {
        if ((news.importance_score || 0) > 0.8 && news.investment_impact === 'HIGH') {
          breakingNews.push(news);
        }
      }

      return breakingNews;
      
    } catch (error) {
      console.error('Failed to check breaking news:', error);
      return [];
    }
  }

  // 메모리 서버에 뉴스 저장
  private async storeNewsInMemory(newsItems: NewsItem[]): Promise<void> {
    try {
      const entities = newsItems.map(news => ({
        name: news.id,
        entityType: 'financial_news',
        observations: [
          `Title: ${news.title}`,
          `Source: ${news.source}`,
          `Published: ${news.published_date}`,
          `Keywords: ${news.keywords.join(', ')}`,
          `URL: ${news.url}`
        ]
      }));

      await mcp__memory__create_entities({ entities });
      
    } catch (error) {
      console.error('Failed to store news in memory:', error);
    }
  }

  // 큐레이션된 콘텐츠를 메모리에 저장
  private async storeCuratedContentInMemory(content: CuratedContent[]): Promise<void> {
    try {
      const entities = content.map(item => ({
        name: item.id,
        entityType: 'curated_content',
        observations: [
          `Type: ${item.type}`,
          `Title: ${item.title}`,
          `Relevance Score: ${item.relevance_score}`,
          `Tags: ${item.tags.join(', ')}`,
          `Created: ${item.created_date}`
        ]
      }));

      await mcp__memory__create_entities({ entities });
      
    } catch (error) {
      console.error('Failed to store curated content in memory:', error);
    }
  }

  // 유틸리티 메서드들
  private extractKeywords(text: string): string[] {
    const commonKeywords = [
      'earnings', 'revenue', 'profit', 'loss', 'acquisition', 'merger',
      'IPO', 'dividend', 'buyback', 'guidance', 'forecast', 'outlook',
      'AI', 'artificial intelligence', 'technology', 'innovation',
      'federal reserve', 'interest rate', 'inflation', 'GDP',
      'market', 'stock', 'shares', 'trading', 'investment'
    ];

    const words = text.toLowerCase().split(/\W+/);
    return commonKeywords.filter(keyword => 
      words.some(word => keyword.includes(word) || word.includes(keyword))
    );
  }

  private deduplicateNews(newsItems: NewsItem[]): NewsItem[] {
    const seen = new Set<string>();
    return newsItems.filter(news => {
      const key = `${news.title.slice(0, 50)}_${news.source}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private determineInvestmentImpact(importanceScore: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (importanceScore >= 0.8) return 'HIGH';
    if (importanceScore >= 0.5) return 'MEDIUM';
    return 'LOW';
  }

  private identifySector(keywords: string[]): string {
    const sectorKeywords = {
      'Technology': ['tech', 'ai', 'software', 'cloud', 'digital'],
      'Healthcare': ['health', 'medical', 'pharma', 'biotech', 'drug'],
      'Finance': ['bank', 'financial', 'credit', 'loan', 'payment'],
      'Energy': ['oil', 'gas', 'energy', 'renewable', 'solar'],
      'Consumer': ['retail', 'consumer', 'brand', 'shopping']
    };

    for (const [sector, sectorKeys] of Object.entries(sectorKeywords)) {
      if (keywords.some(keyword => 
        sectorKeys.some(sectorKey => keyword.toLowerCase().includes(sectorKey))
      )) {
        return sector;
      }
    }

    return 'General';
  }

  private filterByUserInterests(news: NewsItem[], userProfile: UserProfile): NewsItem[] {
    return news.filter(item => {
      // 섹터 매칭
      if (userProfile.sectors.length > 0 && item.sector) {
        if (!userProfile.sectors.includes(item.sector)) {
          return false;
        }
      }

      // 포트폴리오 종목 관련 뉴스
      if (userProfile.portfolio_symbols && item.related_stocks) {
        const hasPortfolioMatch = item.related_stocks.some(stock => 
          userProfile.portfolio_symbols!.includes(stock)
        );
        if (hasPortfolioMatch) return true;
      }

      // 키워드 매칭
      const hasKeywordMatch = item.keywords.some(keyword => 
        userProfile.interests.some(interest => 
          keyword.toLowerCase().includes(interest.toLowerCase())
        )
      );

      return hasKeywordMatch;
    });
  }

  private async generateAIInsights(news: NewsItem[], userProfile: UserProfile): Promise<any[]> {
    try {
      // BlackRock 에이전트로 포트폴리오 영향 분석
      const portfolioImpact = await this.aiExecutor.executeAgent({
        agent_type: 'blackrock',
        action: 'analyze_news_impact',
        parameters: {
          news_items: news.slice(0, 10), // 상위 10개 뉴스
          portfolio_symbols: userProfile.portfolio_symbols || []
        }
      });

      return [portfolioImpact.data];
      
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return [];
    }
  }

  private async createCuratedContent(
    news: NewsItem[], 
    insights: any[], 
    userProfile: UserProfile
  ): Promise<CuratedContent[]> {
    const curatedContent: CuratedContent[] = [];

    // 뉴스를 큐레이션된 콘텐츠로 변환
    for (const newsItem of news.slice(0, 10)) {
      curatedContent.push({
        id: `curated_${newsItem.id}`,
        type: 'NEWS',
        title: newsItem.title,
        content: newsItem.summary || newsItem.content,
        source: newsItem.source,
        created_date: new Date().toISOString(),
        relevance_score: this.calculateRelevanceScore(newsItem, userProfile),
        tags: [newsItem.sector || 'General', ...newsItem.keywords.slice(0, 3)],
        related_news: []
      });
    }

    // AI 인사이트를 큐레이션된 콘텐츠로 추가
    for (const insight of insights) {
      if (insight) {
        curatedContent.push({
          id: `insight_${Date.now()}_${Math.random()}`,
          type: 'INSIGHT',
          title: 'AI 포트폴리오 영향 분석',
          content: JSON.stringify(insight),
          source: 'AI Analysis',
          created_date: new Date().toISOString(),
          relevance_score: 0.9,
          tags: ['AI', 'Portfolio', 'Analysis'],
          related_news: news.slice(0, 5).map(n => n.id)
        });
      }
    }

    return curatedContent.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  private calculateRelevanceScore(news: NewsItem, userProfile: UserProfile): number {
    let score = 0.5; // 기본 점수

    // 중요도 점수 반영
    score += (news.importance_score || 0) * 0.3;

    // 포트폴리오 관련성
    if (userProfile.portfolio_symbols && news.related_stocks) {
      const portfolioMatch = news.related_stocks.some(stock => 
        userProfile.portfolio_symbols!.includes(stock)
      );
      if (portfolioMatch) score += 0.4;
    }

    // 섹터 관련성
    if (userProfile.sectors.includes(news.sector || '')) {
      score += 0.2;
    }

    // 키워드 매칭
    const keywordMatches = news.keywords.filter(keyword => 
      userProfile.interests.some(interest => 
        keyword.toLowerCase().includes(interest.toLowerCase())
      )
    ).length;
    score += Math.min(0.3, keywordMatches * 0.1);

    return Math.min(1.0, score);
  }

  private analyzeSectorTrends(news: NewsItem[]): string[] {
    const sectorCounts: { [key: string]: number } = {};
    
    news.forEach(item => {
      if (item.sector) {
        sectorCounts[item.sector] = (sectorCounts[item.sector] || 0) + 1;
      }
    });

    return Object.entries(sectorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([sector]) => sector);
  }

  private async generateSummary(topStories: NewsItem[], marketOutlook: any): Promise<string> {
    const summaryPoints = [
      `오늘의 주요 뉴스 ${topStories.length}건 중 투자 영향도가 높은 뉴스가 ${topStories.filter(s => s.investment_impact === 'HIGH').length}건 확인되었습니다.`,
      `시장 전망: ${marketOutlook?.overall_sentiment || '중립적'} 분위기를 보이고 있습니다.`,
      `주요 테마: ${topStories.slice(0, 3).map(s => s.title).join(', ')}`
    ];

    return summaryPoints.join(' ');
  }

  // 모의 뉴스 데이터 생성 (개발/테스트용)
  private async generateMockNewsData(sourceName: string): Promise<any> {
    const mockArticles = [
      {
        title: `${sourceName}: AI 칩 수요 급증으로 반도체 주식 상승세`,
        description: '인공지능 붐으로 인한 칩 수요 증가가 반도체 업계 전반에 긍정적 영향을 미치고 있습니다.',
        url: `https://${sourceName.toLowerCase()}.com/ai-chip-demand`,
        publishedAt: new Date().toISOString()
      },
      {
        title: `${sourceName}: 연준 금리 결정 앞두고 시장 관망세`,
        description: '다음 주 연방준비제도 회의를 앞두고 투자자들이 신중한 접근을 보이고 있습니다.',
        url: `https://${sourceName.toLowerCase()}.com/fed-rates`,
        publishedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        title: `${sourceName}: 테슬라 신모델 출시 발표로 주가 급등`,
        description: '테슬라가 새로운 전기차 모델 라인업을 발표하면서 주가가 크게 상승했습니다.',
        url: `https://${sourceName.toLowerCase()}.com/tesla-new-model`,
        publishedAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    return { articles: mockArticles };
  }

  // 스케줄러 초기화
  private initializeScheduler(): void {
    // 실시간 뉴스 수집 (30분마다)
    setInterval(async () => {
      try {
        await this.collectNews();
        console.log('📰 News collection completed');
      } catch (error) {
        console.error('Scheduled news collection failed:', error);
      }
    }, 30 * 60 * 1000);

    // 브레이킹 뉴스 체크 (5분마다)
    setInterval(async () => {
      try {
        const breakingNews = await this.checkForBreakingNews();
        if (breakingNews.length > 0) {
          console.log(`🚨 Breaking news detected: ${breakingNews.length} items`);
          // 여기서 실시간 알림을 보낼 수 있습니다
        }
      } catch (error) {
        console.error('Breaking news check failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  // 캐시된 뉴스 가져오기
  getCachedNews(): NewsItem[] {
    return Array.from(this.newsCache.values());
  }

  // 캐시된 큐레이션 콘텐츠 가져오기
  getCachedCuratedContent(): CuratedContent[] {
    return Array.from(this.curatedCache.values());
  }
}

// 편의 함수들
export async function getCuratedFinancialNews(userProfile?: UserProfile): Promise<CuratedContent[]> {
  const curator = FinancialNewsCurator.getInstance();
  
  if (userProfile) {
    return curator.curateContentForUser(userProfile);
  }
  
  // 기본 사용자 프로필
  const defaultProfile: UserProfile = {
    id: 'default',
    interests: ['technology', 'AI', 'market analysis'],
    sectors: ['Technology', 'Finance'],
    risk_tolerance: 'MEDIUM',
    news_frequency: 'HOURLY',
    content_types: ['NEWS', 'ANALYSIS', 'INSIGHTS']
  };
  
  return curator.curateContentForUser(defaultProfile);
}

export async function getDailyFinancialDigest() {
  const curator = FinancialNewsCurator.getInstance();
  return curator.generateDailyDigest();
}

export async function getBreakingFinancialNews(): Promise<NewsItem[]> {
  const curator = FinancialNewsCurator.getInstance();
  return curator.checkForBreakingNews();
}

export default FinancialNewsCurator;