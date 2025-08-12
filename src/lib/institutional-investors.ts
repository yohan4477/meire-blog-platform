/**
 * 주요 기관투자자 SEC 13F 데이터 관리
 * WhaleWisdom 수준의 데이터 커버리지 구현
 */

export interface InstitutionalInvestor {
  cik: string;
  name: string;
  nameKo: string;
  type: 'hedge-fund' | 'pension-fund' | 'sovereign-wealth' | 'mutual-fund' | 'insurance' | 'endowment';
  country: string;
  founded: number;
  aum: number; // Assets Under Management (USD)
  description: string;
  descriptionKo: string;
  website?: string;
  logo?: string;
}

export const INSTITUTIONAL_INVESTORS: InstitutionalInvestor[] = [
  {
    cik: '0001608046',
    name: 'National Pension Service',
    nameKo: '국민연금공단',
    type: 'pension-fund',
    country: 'South Korea',
    founded: 1988,
    aum: 115800000000, // $115.8B
    description: 'South Korea\'s national pension fund, one of the world\'s largest pension funds',
    descriptionKo: '세계 최대 규모의 국민연금기금, 한국의 국가연금',
    website: 'https://www.nps.or.kr'
  },
  {
    cik: '0001067983',
    name: 'Berkshire Hathaway Inc',
    nameKo: '버크셔 해서웨이',
    type: 'hedge-fund',
    country: 'United States',
    founded: 1965,
    aum: 600000000000, // ~$600B market cap
    description: 'Warren Buffett\'s conglomerate and investment vehicle',
    descriptionKo: '워렌 버핏의 투자 지주회사, 세계 최고 가치투자 전문가',
    website: 'https://www.berkshirehathaway.com'
  },
  {
    cik: '0001167483',
    name: 'Tiger Global Management LLC',
    nameKo: '타이거 글로벌',
    type: 'hedge-fund',
    country: 'United States',
    founded: 2001,
    aum: 65000000000, // ~$65B
    description: 'Growth-focused investment firm specializing in technology and consumer companies',
    descriptionKo: '성장주 중심 헤지펀드, 기술주 및 소비재 전문 투자회사',
    website: 'https://www.tigerglobal.com'
  },
  {
    cik: '0001135730',
    name: 'Coatue Management LLC',
    nameKo: '코투 매니지먼트',
    type: 'hedge-fund',
    country: 'United States',
    founded: 1999,
    aum: 50000000000, // ~$50B
    description: 'Technology-focused investment manager with public and private market strategies',
    descriptionKo: '기술주 전문 투자회사, 공개/비공개 시장 모두 투자',
    website: 'https://www.coatue.com'
  },
  {
    cik: '0001423053',
    name: 'Citadel Advisors LLC',
    nameKo: '시타델 어드바이저스',
    type: 'hedge-fund',
    country: 'United States',
    founded: 1990,
    aum: 60000000000, // ~$60B
    description: 'Multi-strategy hedge fund focusing on quantitative and fundamental strategies',
    descriptionKo: '멀티 전략 헤지펀드, 퀀트/펀더멘털 분석 전문',
    website: 'https://www.citadel.com'
  },
  // 추가 주요 기관투자자들
  {
    cik: '0001374170',
    name: 'Norges Bank',
    nameKo: '노르웨이 국부펀드',
    type: 'sovereign-wealth',
    country: 'Norway',
    founded: 1816,
    aum: 1400000000000, // ~$1.4T - 세계 최대 국부펀드
    description: 'Norwegian sovereign wealth fund, the world\'s largest sovereign wealth fund',
    descriptionKo: '세계 최대 국부펀드, 노르웨이 오일머니 운용',
    website: 'https://www.nbim.no'
  },
  {
    cik: '0000915191',
    name: 'Canada Pension Plan Investment Board',
    nameKo: '캐나다 연금',
    type: 'pension-fund',
    country: 'Canada',
    founded: 1997,
    aum: 570000000000, // ~$570B
    description: 'Canadian national pension fund investment board',
    descriptionKo: '캐나다 국민연금 투자위원회',
    website: 'https://www.cppinvestments.com'
  },
  {
    cik: '0001649339',
    name: 'Government of Singapore Investment Corporation',
    nameKo: '싱가포르 국부펀드',
    type: 'sovereign-wealth',
    country: 'Singapore',
    founded: 1981,
    aum: 690000000000, // ~$690B
    description: 'Singapore\'s sovereign wealth fund managing government reserves',
    descriptionKo: '싱가포르 정부투자공사, 국가 외환보유액 운용',
    website: 'https://www.gic.com.sg'
  }
];

export const getFundByCik = (cik: string): InstitutionalInvestor | undefined => {
  return INSTITUTIONAL_INVESTORS.find(fund => fund.cik === cik);
};

export const getFundsByType = (type: InstitutionalInvestor['type']): InstitutionalInvestor[] => {
  return INSTITUTIONAL_INVESTORS.filter(fund => fund.type === type);
};

export const getFundsByCountry = (country: string): InstitutionalInvestor[] => {
  return INSTITUTIONAL_INVESTORS.filter(fund => fund.country === country);
};

export const getTopFundsByAUM = (limit: number = 10): InstitutionalInvestor[] => {
  return INSTITUTIONAL_INVESTORS
    .sort((a, b) => b.aum - a.aum)
    .slice(0, limit);
};

// 펀드 타입별 한국어 라벨
export const FUND_TYPE_LABELS: Record<InstitutionalInvestor['type'], string> = {
  'hedge-fund': '헤지펀드',
  'pension-fund': '연기금',
  'sovereign-wealth': '국부펀드',
  'mutual-fund': '뮤추얼펀드',
  'insurance': '보험사',
  'endowment': '기부금'
};

// 주요 벤치마크 지수
export const BENCHMARK_INDICES = {
  SPY: 'S&P 500',
  QQQ: 'NASDAQ-100',
  IWM: 'Russell 2000',
  VTI: 'Total Stock Market',
  VEA: 'Developed Markets',
  VWO: 'Emerging Markets'
};