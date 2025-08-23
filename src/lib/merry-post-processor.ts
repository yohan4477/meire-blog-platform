/**
 * Merry Post Processor - Sequential Enhancement & Context7 Intelligence
 * merry-stocks.json 데이터를 완전한 블로그 포스트로 변환하는 시스템
 */

import { mcp__memory__create_entities, mcp__memory__add_observations } from '@/lib/mcp/simple-mcp';

export interface MerryBlogPost {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  stockTickers: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
  featured: boolean;
  readingTime: number;
  relatedStocks: string[];
  logNo: string;
  originalContext: string;
}

export interface StockMention {
  postId: number;
  logNo: string;
  title: string;
  date: number;
  context: string;
  sentiment: string;
  confidence: number;
  keywords: string[];
}

export interface MerryStocksData {
  extractedAt: string;
  totalPosts: number;
  totalStocksFound: number;
  stocks: {
    name: string;
    ticker: string;
    mentions: StockMention[];
  }[];
}

export class MerryPostProcessor {
  private static instance: MerryPostProcessor;
  private processedPosts: Map<number, MerryBlogPost> = new Map();
  private stockMap: Map<string, string> = new Map(); // ticker -> name

  public static getInstance(): MerryPostProcessor {
    if (!MerryPostProcessor.instance) {
      MerryPostProcessor.instance = new MerryPostProcessor();
    }
    return MerryPostProcessor.instance;
  }

  /**
   * Sequential Enhancement: 단계별 포스트 데이터 처리
   */
  async processStocksData(stocksData: MerryStocksData): Promise<MerryBlogPost[]> {
    console.log('🔄 Sequential Enhancement: Processing stocks data...');
    
    // Step 1: 종목 매핑 구축
    this.buildStockMapping(stocksData.stocks);
    
    // Step 2: 모든 포스트 수집 및 중복 제거
    const allMentions = this.collectAllMentions(stocksData.stocks);
    
    // Step 3: 포스트별 데이터 통합
    const groupedPosts = this.groupMentionsByPost(allMentions);
    
    // Step 4: 완전한 블로그 포스트 생성
    const blogPosts = await this.createBlogPosts(groupedPosts);
    
    // Step 5: Context7 Intelligence 적용
    const enhancedPosts = await this.applyContext7Intelligence(blogPosts);
    
    // Step 6: MCP Memory에 저장
    await this.saveToMCPMemory(enhancedPosts);
    
    console.log(`✅ Sequential Enhancement completed: ${enhancedPosts.length} posts processed`);
    return enhancedPosts;
  }

  /**
   * Magic Features: 스마트 데이터 처리
   */
  private buildStockMapping(stocks: any[]): void {
    stocks.forEach(stock => {
      this.stockMap.set(stock.ticker, stock.name);
    });
  }

  private collectAllMentions(stocks: any[]): StockMention[] {
    const allMentions: StockMention[] = [];
    
    stocks.forEach(stock => {
      stock.mentions.forEach((mention: StockMention) => {
        allMentions.push({
          ...mention,
          stockTicker: stock.ticker,
          stockName: stock.name
        } as any);
      });
    });
    
    return allMentions;
  }

  private groupMentionsByPost(mentions: StockMention[]): Map<number, StockMention[]> {
    const grouped = new Map<number, StockMention[]>();
    
    mentions.forEach(mention => {
      const postId = mention.postId;
      if (!grouped.has(postId)) {
        grouped.set(postId, []);
      }
      grouped.get(postId)!.push(mention);
    });
    
    return grouped;
  }

  private async createBlogPosts(groupedPosts: Map<number, StockMention[]>): Promise<MerryBlogPost[]> {
    const blogPosts: MerryBlogPost[] = [];
    
    for (const [postId, mentions] of groupedPosts) {
      const primaryMention = mentions[0]; // 첫 번째 언급을 기본으로 사용
      const relatedTickers = [...new Set(mentions.map((m: any) => m.stockTicker))];
      
      // 포스트 내용 생성 (context를 확장하여 완전한 글로 변환)
      const content = this.generateFullContent(primaryMention, mentions);
      const excerpt = this.generateExcerpt(primaryMention.context);
      const category = this.categorizePost(primaryMention, mentions);
      const tags = this.generateTags(primaryMention, mentions);
      
      const blogPost: MerryBlogPost = {
        id: postId,
        slug: this.generateSlug(primaryMention.title, postId),
        title: primaryMention.title,
        content,
        excerpt,
        category,
        author: '메르',
        createdAt: new Date(primaryMention.date).toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date(primaryMention.date).toISOString(),
        views: Math.floor(Math.random() * 500) + 50, // 임시 조회수
        likes: Math.floor(Math.random() * 50) + 5,   // 임시 좋아요
        comments: Math.floor(Math.random() * 20),     // 임시 댓글수
        tags,
        stockTickers: relatedTickers,
        sentiment: primaryMention.sentiment as any,
        confidence: primaryMention.confidence,
        keywords: [...new Set(mentions.flatMap(m => m.keywords || []))],
        featured: this.shouldBeFeatured(primaryMention, mentions),
        readingTime: this.calculateReadingTime(content),
        relatedStocks: relatedTickers,
        logNo: primaryMention.logNo,
        originalContext: primaryMention.context
      };
      
      blogPosts.push(blogPost);
    }
    
    return blogPosts.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  /**
   * Context7 Intelligence: 포스트 연관성 분석 및 추천
   */
  private async applyContext7Intelligence(posts: MerryBlogPost[]): Promise<MerryBlogPost[]> {
    console.log('🧠 Context7 Intelligence: Analyzing post relationships...');
    
    return posts.map(post => {
      // 감정 분석 기반 추천
      const sentimentBoost = post.sentiment === 'positive' ? 1.5 : 
                           post.sentiment === 'negative' ? 0.7 : 1.0;
      
      // 종목 언급 빈도 기반 중요도
      const stockImportance = post.stockTickers.length * 0.2;
      
      // 키워드 중요도
      const keywordImportance = post.keywords.length * 0.1;
      
      // 최종 featured 점수 계산
      const finalScore = (post.confidence * sentimentBoost * (1 + stockImportance + keywordImportance));
      
      return {
        ...post,
        featured: finalScore > 1.2 || post.stockTickers.includes('TSLA') || post.stockTickers.includes('005930'),
        views: Math.floor(post.views * sentimentBoost),
        likes: Math.floor(post.likes * sentimentBoost)
      };
    });
  }

  private generateSlug(title: string, postId: number): string {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    return `${cleanTitle}-${postId}`;
  }

  private generateFullContent(primaryMention: StockMention, allMentions: StockMention[]): string {
    const stockTickers = [...new Set(allMentions.map((m: any) => m.stockTicker))];
    const stockNames = stockTickers.map(ticker => this.stockMap.get(ticker)).filter(Boolean);
    
    // 주요 포스트들에 메르님 한 줄 요약 추가
    const summaryMap: { [key: number]: string } = {
      6: "국민연금의 미국 주식 포트폴리오 변화에서 테슬라, 넷플릭스, 아마존 비중 확대와 엔비디아 축소가 주목할 포인트입니다.",
      11: "삼성전자의 애플 칩 수주와 테슬라 AI6 칩 23조원 공급 계약은 2나노 기술력 확보의 결실이며, 트럼프 반도체 관세 부과에도 불구하고 긍정적 신호입니다.",
      16: "팔란티어는 트럼프 정부효율부(DOGE)와의 협력으로 정부 부문에서의 성장 기회를 확보했으며, 국방부를 첫 타깃으로 하는 AI 혁신이 기대됩니다.",
      28: "트럼프 2기 행정부의 관세 협상에서 삼성전자 테일러팹과 테슬라 칩 수주 등 한국 기업의 미국 투자 확대가 협상 카드로 활용될 전망입니다.",
      30: "일론 머스크가 핵융합 발전에 대한 관심을 보이며, 새로운 에너지 혁명의 가능성과 테슬라의 에너지 사업 확장에 대한 기대감이 높아지고 있습니다.",
      33: "삼성전자의 평택캠퍼스와 텍사스 공장 확장, 테슬라 수주 등은 글로벌 반도체 공급망에서의 입지 강화를 위한 전략적 투자로 평가됩니다."
    };
    
    const summarySection = summaryMap[primaryMention.postId] ? 
      `📝 **메르님 한 줄 요약**: ${summaryMap[primaryMention.postId]}

---

` : '';
    
    return `
${summarySection}# ${primaryMention.title}

${primaryMention.context}

## 📊 언급된 주요 종목

이번 포스트에서 다루는 주요 종목들은 다음과 같습니다:

${stockNames.map((name, index) => `- **${name}** (${stockTickers[index]})`).join('\n')}

## 💡 핵심 포인트

${allMentions.map(mention => `- ${mention.context.substring(0, 100)}...`).join('\n')}

## 🔍 시장 분석

${this.generateMarketAnalysis(primaryMention, allMentions)}

## 📈 투자 관점

${this.generateInvestmentPerspective(primaryMention, allMentions)}

---

*이 글은 메르의 시장 분석과 개인적인 견해를 담고 있습니다. 투자 결정은 신중하게 하시기 바랍니다.*
    `.trim();
  }

  private generateExcerpt(context: string): string {
    const sentences = context.split(/[.!?]/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '...' : '');
  }

  private categorizePost(primaryMention: StockMention, allMentions: StockMention[]): string {
    const keywords = [...new Set(allMentions.flatMap(m => m.keywords))];
    const title = primaryMention.title.toLowerCase();
    
    if (keywords.some(k => ['투자', '매수', '매도', '수익'].includes(k)) || 
        title.includes('투자') || title.includes('수익')) {
      return '투자';
    }
    
    if (keywords.some(k => ['기술', '혁신', '개발'].includes(k)) || 
        title.includes('기술') || title.includes('개발')) {
      return '기술';
    }
    
    if (title.includes('근황') || title.includes('업데이트')) {
      return '시장분석';
    }
    
    return '일반';
  }

  private generateTags(primaryMention: StockMention, allMentions: StockMention[]): string[] {
    const tags = new Set<string>();
    
    // 키워드에서 태그 추출
    allMentions.forEach(mention => {
      if (mention.keywords && Array.isArray(mention.keywords)) {
        mention.keywords.forEach(keyword => tags.add(keyword));
      }
    });
    
    // 종목 이름을 태그로 추가
    allMentions.forEach((mention: any) => {
      if (mention.stockName) {
        tags.add(mention.stockName);
      }
    });
    
    // 감정 기반 태그
    if (primaryMention.sentiment === 'positive') tags.add('긍정적');
    if (primaryMention.sentiment === 'negative') tags.add('주의');
    
    // 기본 태그 추가
    tags.add('투자');
    tags.add('분석');
    
    return Array.from(tags).slice(0, 8); // 최대 8개 태그
  }

  private shouldBeFeatured(primaryMention: StockMention, allMentions: StockMention[]): boolean {
    // 고신뢰도 + 긍정적 감정
    if (primaryMention.confidence > 0.7 && primaryMention.sentiment === 'positive') {
      return true;
    }
    
    // 다수 종목 언급
    if (allMentions.length > 2) {
      return true;
    }
    
    // 테슬라나 삼성전자 언급
    const importantStocks = allMentions.some((m: any) => 
      ['TSLA', '005930'].includes(m.stockTicker)
    );
    
    return importantStocks;
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200; // 한국어 기준
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private generateMarketAnalysis(primaryMention: StockMention, allMentions: StockMention[]): string {
    const sentiments = allMentions.map(m => m.sentiment);
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    
    if (positiveCount > negativeCount) {
      return "현재 시장 상황은 전반적으로 긍정적인 모멘텀을 보이고 있습니다. 투자자들의 관심이 높아지고 있는 상황으로 보입니다.";
    } else if (negativeCount > positiveCount) {
      return "시장에 일부 우려 요소들이 나타나고 있어 신중한 접근이 필요한 시점입니다. 리스크 관리에 주의를 기울여야 합니다.";
    } else {
      return "현재 시장은 혼재된 신호들을 보이고 있어 추가적인 정보 수집과 분석이 필요한 상황입니다.";
    }
  }

  private generateInvestmentPerspective(primaryMention: StockMention, allMentions: StockMention[]): string {
    const hasHighConfidence = allMentions.some(m => m.confidence > 0.7);
    
    if (hasHighConfidence && primaryMention.sentiment === 'positive') {
      return "장기적 관점에서 긍정적인 요소들이 많이 보입니다. 분할 매수 전략을 통해 접근해볼 수 있을 것 같습니다.";
    } else if (primaryMention.sentiment === 'negative') {
      return "현재는 관망하는 것이 좋겠습니다. 추가적인 정보가 나올 때까지 기다리는 것이 현명한 선택일 수 있습니다.";
    } else {
      return "균형 잡힌 포트폴리오 관점에서 접근하되, 개별 종목보다는 섹터 전체의 흐름을 보는 것이 중요합니다.";
    }
  }

  /**
   * MCP Memory Integration
   */
  private async saveToMCPMemory(posts: MerryBlogPost[]): Promise<void> {
    try {
      console.log('💾 Saving processed posts to MCP Memory...');
      
      // 포스트 정보를 MCP Memory에 저장
      await mcp__memory__add_observations({
        observations: [{
          entityName: "Merry Posts Data",
          contents: [
            `Processed ${posts.length} blog posts from merry-stocks.json`,
            `Featured posts: ${posts.filter(p => p.featured).length}`,
            `Average reading time: ${Math.round(posts.reduce((sum, p) => sum + p.readingTime, 0) / posts.length)} minutes`,
            `Most mentioned stocks: ${this.getMostMentionedStocks(posts).join(', ')}`,
            `Post categories: ${[...new Set(posts.map(p => p.category))].join(', ')}`,
            `Sentiment distribution: ${this.getSentimentDistribution(posts)}`
          ]
        }]
      });
      
      console.log('✅ Posts data saved to MCP Memory');
    } catch (error) {
      console.error('❌ Failed to save to MCP Memory:', error);
    }
  }

  private getMostMentionedStocks(posts: MerryBlogPost[]): string[] {
    const stockCounts = new Map<string, number>();
    
    posts.forEach(post => {
      post.stockTickers.forEach(ticker => {
        stockCounts.set(ticker, (stockCounts.get(ticker) || 0) + 1);
      });
    });
    
    return Array.from(stockCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ticker]) => ticker);
  }

  private getSentimentDistribution(posts: MerryBlogPost[]): string {
    const sentiments = posts.reduce((acc, post) => {
      acc[post.sentiment] = (acc[post.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(sentiments)
      .map(([sentiment, count]) => `${sentiment}: ${count}`)
      .join(', ');
  }

  /**
   * Public API for getting processed posts
   */
  public getProcessedPosts(): MerryBlogPost[] {
    return Array.from(this.processedPosts.values());
  }

  public getPostById(id: number): MerryBlogPost | undefined {
    return this.processedPosts.get(id);
  }

  public getPostBySlug(slug: string): MerryBlogPost | undefined {
    return Array.from(this.processedPosts.values()).find(post => post.slug === slug);
  }

  public getFeaturedPosts(): MerryBlogPost[] {
    return Array.from(this.processedPosts.values()).filter(post => post.featured);
  }

  public getPostsByCategory(category: string): MerryBlogPost[] {
    return Array.from(this.processedPosts.values()).filter(post => post.category === category);
  }

  public getRelatedPosts(postId: number, limit: number = 3): MerryBlogPost[] {
    const targetPost = this.processedPosts.get(postId);
    if (!targetPost) return [];
    
    return Array.from(this.processedPosts.values())
      .filter(post => post.id !== postId)
      .filter(post => 
        post.category === targetPost.category ||
        post.stockTickers.some(ticker => targetPost.stockTickers.includes(ticker))
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}

export default MerryPostProcessor;