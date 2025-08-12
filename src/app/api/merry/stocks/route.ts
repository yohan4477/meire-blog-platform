import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // 메르가 언급한 주요 종목 데이터 (언급 횟수 기반)
    const stockData = [
      { 
        ticker: 'TSLA', 
        name: '테슬라', 
        market: 'NASDAQ',
        mentions: 42,
        firstMention: '2024-12-20',
        lastMention: '2025-08-09',
        sentiment: 'positive',
        tags: ['전기차', 'AI', '자율주행'],
        description: '일론 머스크가 이끄는 전기차 및 에너지 기업'
      },
      { 
        ticker: '005930', 
        name: '삼성전자', 
        market: 'KOSPI',
        mentions: 35,
        firstMention: '2024-12-25',
        lastMention: '2025-08-09',
        sentiment: 'neutral',
        tags: ['반도체', 'HBM', '파운드리'],
        description: '글로벌 반도체 및 전자제품 제조 기업'
      },
      { 
        ticker: '042660', 
        name: '한화오션', 
        market: 'KOSPI',
        mentions: 29,
        firstMention: '2024-12-28',
        lastMention: '2025-08-11',
        sentiment: 'positive',
        tags: ['조선업', 'LNG선', '방위산업'],
        description: '대형 선박 및 해양플랜트 건조 기업'
      },
      { 
        ticker: 'AAPL', 
        name: '애플', 
        market: 'NASDAQ',
        mentions: 26,
        firstMention: '2024-12-22',
        lastMention: '2025-08-09',
        sentiment: 'neutral',
        tags: ['빅테크', '아이폰', '워런버핏'],
        description: '세계 최대 시가총액 IT 기업'
      },
      { 
        ticker: '010140', 
        name: '삼성중공업', 
        market: 'KOSPI',
        mentions: 26,
        firstMention: '2024-12-26',
        lastMention: '2025-07-31',
        sentiment: 'positive',
        tags: ['조선업', 'LNG선', '해양플랜트'],
        description: '조선 및 해양플랜트 전문 기업'
      },
      { 
        ticker: 'NVDA', 
        name: '엔비디아', 
        market: 'NASDAQ',
        mentions: 22,
        firstMention: '2024-12-28',
        lastMention: '2025-08-09',
        sentiment: 'positive',
        tags: ['AI', 'GPU', '반도체'],
        description: 'AI 시대를 이끄는 GPU 선도 기업'
      },
      { 
        ticker: '329180', 
        name: 'HD현대중공업', 
        market: 'KOSPI',
        mentions: 20,
        firstMention: '2025-01-05',
        lastMention: '2025-08-11',
        sentiment: 'positive',
        tags: ['조선업', 'LNG선', '군함'],
        description: '세계 최대 조선소 운영 기업'
      },
      { 
        ticker: '000660', 
        name: 'SK하이닉스', 
        market: 'KOSPI',
        mentions: 15,
        firstMention: '2025-01-10',
        lastMention: '2025-07-29',
        sentiment: 'positive',
        tags: ['메모리반도체', 'HBM', 'AI메모리'],
        description: '메모리 반도체 전문 기업'
      },
      { 
        ticker: 'BRK.B', 
        name: '버크셔해서웨이', 
        market: 'NYSE',
        mentions: 15,
        firstMention: '2025-02-10',
        lastMention: '2025-07-26',
        sentiment: 'positive',
        tags: ['워런버핏', '투자회사', '가치투자'],
        description: '워런 버핏의 투자 지주회사'
      },
      { 
        ticker: 'TSM', 
        name: 'TSMC', 
        market: 'NYSE',
        mentions: 14,
        firstMention: '2025-02-15',
        lastMention: '2025-08-06',
        sentiment: 'neutral',
        tags: ['파운드리', '반도체', '대만'],
        description: '세계 최대 반도체 파운드리 기업'
      },
      { 
        ticker: '8058.T', 
        name: '미쓰비시상사', 
        market: 'TSE',
        mentions: 13,
        firstMention: '2025-03-01',
        lastMention: '2025-07-06',
        sentiment: 'positive',
        tags: ['종합상사', '일본', '워런버핏'],
        description: '일본 5대 종합상사 중 하나'
      },
      { 
        ticker: 'PLTR', 
        name: '팔란티어', 
        market: 'NYSE',
        mentions: 8,
        firstMention: '2025-03-15',
        lastMention: '2025-08-05',
        sentiment: 'positive',
        tags: ['빅데이터', 'AI', '국방'],
        description: '빅데이터 분석 플랫폼 기업'
      }
    ];

    // 페이지네이션 적용
    const paginatedStocks = stockData.slice(offset, offset + limit);
    
    // 최근 언급된 포스트 정보 추가
    for (const stock of paginatedStocks) {
      const recentPosts = await query(`
        SELECT id, log_no, title, created_date, excerpt
        FROM blog_posts
        WHERE blog_type = 'merry' 
          AND (title LIKE ? OR content LIKE ?)
        ORDER BY created_date DESC
        LIMIT 3
      `, [`%${stock.name}%`, `%${stock.name}%`]);
      
      stock['recentPosts'] = recentPosts;
    }

    return NextResponse.json({
      success: true,
      data: {
        stocks: paginatedStocks,
        total: stockData.length,
        page,
        limit,
        hasMore: offset + limit < stockData.length
      }
    });

  } catch (error) {
    console.error('종목 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '종목 데이터 조회 실패' }
    }, { status: 500 });
  }
}