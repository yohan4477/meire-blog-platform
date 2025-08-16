const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const db = new sqlite3.Database(path.join(__dirname, '..', 'database.db'));

// 종목별 감정 분석 데이터 (Claude AI 분석 결과)
const sentimentAnalysisData = {
  '005930': [ // 삼성전자
    {
      post_id: 11,
      date: '2025-08-05',
      sentiment: 'positive',
      score: 0.75,
      confidence: 0.85,
      key_reasoning: '삼성전자가 애플 칩 수주와 테슬라 AI6 칩 23조원 계약을 체결하여 파운드리 사업의 대규모 전환점을 맞이했습니다.',
      supporting_evidence: {
        positive_factors: ['애플 칩 수주', '테슬라 AI6 23조원 계약', '텍사스 공장 가동'],
        negative_factors: ['TSMC와의 경쟁'],
        neutral_factors: ['파운드리 전략 전환']
      },
      investment_perspective: ['파운드리', '기술력', '대규모 계약'],
      investment_timeframe: '중장기',
      conviction_level: '높음'
    },
    {
      post_id: 33,
      date: '2025-07-30',
      sentiment: 'neutral',
      score: 0.0,
      confidence: 0.7,
      key_reasoning: '삼성전자의 3나노 공정 수율 문제가 지속되고 있으나, 기술 우위 전략을 통한 장기적 성장 가능성은 여전히 유효합니다.',
      supporting_evidence: {
        positive_factors: ['기술 우위 전략', '장기 투자'],
        negative_factors: ['3나노 수율 실패', '평택공장 문제'],
        neutral_factors: ['전략적 전환기']
      },
      investment_perspective: ['기술 투자', '파운드리'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    },
    {
      post_id: 58,
      date: '2025-07-19',
      sentiment: 'positive',
      score: 0.6,
      confidence: 0.75,
      key_reasoning: '삼성이 BOE의 애플 공급을 견제하며 디스플레이 시장에서의 경쟁력을 유지하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['애플 공급 유지', '기술 우위', '특허 방어'],
        negative_factors: ['중국 경쟁 심화'],
        neutral_factors: ['시장 재편']
      },
      investment_perspective: ['디스플레이', '경쟁력'],
      investment_timeframe: '중기',
      conviction_level: '보통'
    },
    {
      post_id: 61,
      date: '2025-07-18',
      sentiment: 'neutral',
      score: 0.0,
      confidence: 0.6,
      key_reasoning: '엔비디아 H20 칩 중국 수출과 관련하여 삼성전자의 반도체 경쟁 환경이 변화하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['반도체 수요 증가'],
        negative_factors: ['경쟁 심화'],
        neutral_factors: ['시장 변화', '규제 환경']
      },
      investment_perspective: ['반도체', '글로벌 경쟁'],
      investment_timeframe: '단기',
      conviction_level: '낮음'
    },
    {
      post_id: 82,
      date: '2025-07-09',
      sentiment: 'positive',
      score: 0.7,
      confidence: 0.8,
      key_reasoning: '삼성전자의 HBM 3E 양산은 위험하지만 성공 시 AI 메모리 시장에서 주도권을 확보할 수 있는 도전입니다.',
      supporting_evidence: {
        positive_factors: ['HBM 3E 양산', 'AI 메모리 시장', '기술 도전'],
        negative_factors: ['양산 리스크', 'SK하이닉스 경쟁'],
        neutral_factors: ['시장 수요']
      },
      investment_perspective: ['AI 메모리', 'HBM', '기술 혁신'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    },
    {
      post_id: 150,
      date: '2025-06-07',
      sentiment: 'positive',
      score: 0.5,
      confidence: 0.7,
      key_reasoning: '데이터센터 냉각 시장에서 삼성전자가 새로운 사업 기회를 모색하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['신사업 진출', '데이터센터 시장', '냉각 기술'],
        negative_factors: ['초기 단계'],
        neutral_factors: ['시장 성장']
      },
      investment_perspective: ['신사업', '데이터센터'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    },
    {
      post_id: 209,
      date: '2025-05-10',
      sentiment: 'neutral',
      score: 0.1,
      confidence: 0.65,
      key_reasoning: 'HBM 3E 양산의 자신감과 위험이 공존하는 상황으로 결과를 지켜봐야 합니다.',
      supporting_evidence: {
        positive_factors: ['기술 자신감'],
        negative_factors: ['양산 위험', '수율 우려'],
        neutral_factors: ['시장 관망']
      },
      investment_perspective: ['HBM', '리스크 관리'],
      investment_timeframe: '단기',
      conviction_level: '낮음'
    }
  ],
  
  'AAPL': [ // 애플
    {
      post_id: 11,
      date: '2025-08-05',
      sentiment: 'positive',
      score: 0.7,
      confidence: 0.8,
      key_reasoning: '애플이 삼성전자를 파운드리 파트너로 선택하여 공급망 다각화와 제조 비용 최적화를 달성했습니다.',
      supporting_evidence: {
        positive_factors: ['공급망 다각화', '제조 비용 절감', '삼성 파트너십'],
        negative_factors: [],
        neutral_factors: ['파운드리 전환']
      },
      investment_perspective: ['공급망 관리', '비용 효율성'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    },
    {
      post_id: 58,
      date: '2025-07-19',
      sentiment: 'neutral',
      score: 0.0,
      confidence: 0.7,
      key_reasoning: '애플의 디스플레이 공급처 다변화는 계속되며 BOE와 삼성 간 경쟁이 애플에게 유리합니다.',
      supporting_evidence: {
        positive_factors: ['공급처 협상력', '가격 경쟁력'],
        negative_factors: ['품질 리스크'],
        neutral_factors: ['공급처 다변화']
      },
      investment_perspective: ['공급망', '협상력'],
      investment_timeframe: '단기',
      conviction_level: '보통'
    },
    {
      post_id: 6,
      date: '2025-08-07',
      sentiment: 'positive',
      score: 0.6,
      confidence: 0.75,
      key_reasoning: '국민연금이 애플 주식 비중을 유지하며 안정적 투자처로 평가하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['기관 투자 유지', '안정성', '배당'],
        negative_factors: ['성장 둔화'],
        neutral_factors: ['포트폴리오 유지']
      },
      investment_perspective: ['가치주', '안정성'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    }
  ],
  
  'LLY': [ // 일라이릴리
    {
      post_id: 44,
      date: '2025-07-25',
      sentiment: 'positive',
      score: 0.9,
      confidence: 0.95,
      key_reasoning: '마운자로가 한국 출시를 앞두고 있으며 이미 미국에서 비만 치료제 1위를 차지했습니다.',
      supporting_evidence: {
        positive_factors: ['마운자로 한국 출시', '미국 시장 1위', '비만 치료제 끝판왕'],
        negative_factors: [],
        neutral_factors: ['경쟁 심화']
      },
      investment_perspective: ['바이오', '혁신 신약', '시장 독점'],
      investment_timeframe: '장기',
      conviction_level: '매우 높음'
    },
    {
      post_id: 253,
      date: '2025-04-19',
      sentiment: 'positive',
      score: 0.8,
      confidence: 0.85,
      key_reasoning: '일라이릴리가 경구용 비만치료제 오포글리프론으로 시장 접근성을 획기적으로 개선하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['경구용 신약', '시장 접근성', '기술 혁신'],
        negative_factors: ['개발 리스크'],
        neutral_factors: ['임상 진행']
      },
      investment_perspective: ['R&D', '혁신', '시장 확대'],
      investment_timeframe: '중장기',
      conviction_level: '높음'
    },
    {
      post_id: 512,
      date: '2025-08-15',
      sentiment: 'positive',
      score: 0.75,
      confidence: 0.8,
      key_reasoning: '일라이릴리가 인텔 위기 속에서도 헬스케어 섹터의 안정적 대안으로 주목받고 있습니다.',
      supporting_evidence: {
        positive_factors: ['섹터 강세', '실적 안정', '신약 파이프라인'],
        negative_factors: [],
        neutral_factors: ['밸류에이션']
      },
      investment_perspective: ['방어주', '헬스케어'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    },
    {
      post_id: 424,
      date: '2025-01-30',
      sentiment: 'positive',
      score: 0.85,
      confidence: 0.9,
      key_reasoning: 'AI 기술을 활용한 치매 치료제 개발로 일라이릴리가 차세대 신약 개발을 주도하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['AI 활용 신약', '치매 치료제', '기술 융합'],
        negative_factors: ['개발 기간'],
        neutral_factors: ['연구 단계']
      },
      investment_perspective: ['바이오테크', 'AI 융합'],
      investment_timeframe: '장기',
      conviction_level: '매우 높음'
    }
  ],
  
  'NVDA': [ // 엔비디아
    {
      post_id: 61,
      date: '2025-07-18',
      sentiment: 'positive',
      score: 0.75,
      confidence: 0.85,
      key_reasoning: '엔비디아 H20 칩 중국 수출 재개로 AI 반도체 시장 독점적 지위를 재확인했습니다.',
      supporting_evidence: {
        positive_factors: ['H20 중국 수출', 'B40 출시', 'RTX 5090', '시장 독점'],
        negative_factors: ['중국 규제'],
        neutral_factors: ['무역 협상']
      },
      investment_perspective: ['AI 칩', '시장 독점', '기술 우위'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    },
    {
      post_id: 139,
      date: '2025-06-13',
      sentiment: 'neutral',
      score: 0.0,
      confidence: 0.7,
      key_reasoning: '젠슨황이 양자컴퓨터 위협을 언급했으나 당분간 GPU 수요는 지속될 전망입니다.',
      supporting_evidence: {
        positive_factors: ['GPU 수요 지속'],
        negative_factors: ['양자컴퓨터 위협'],
        neutral_factors: ['기술 전환기']
      },
      investment_perspective: ['AI', '양자컴퓨팅'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    },
    {
      post_id: 171,
      date: '2025-05-28',
      sentiment: 'negative',
      score: -0.3,
      confidence: 0.75,
      key_reasoning: '젠슨황이 대만의 전력 부족 문제를 지적하며 TSMC 의존도에 대한 우려를 표명했습니다.',
      supporting_evidence: {
        positive_factors: [],
        negative_factors: ['대만 전력 문제', 'TSMC 의존', '공급망 리스크'],
        neutral_factors: ['대안 모색']
      },
      investment_perspective: ['공급망', '지정학'],
      investment_timeframe: '단기',
      conviction_level: '보통'
    },
    {
      post_id: 417,
      date: '2025-02-02',
      sentiment: 'neutral',
      score: 0.0,
      confidence: 0.65,
      key_reasoning: '딥시크 이슈로 AI 칩 시장 불확실성이 증가했으나 트럼프와 협력을 모색중입니다.',
      supporting_evidence: {
        positive_factors: ['정부 지원'],
        negative_factors: ['딥시크 위협', '중국 AI'],
        neutral_factors: ['정책 불확실성']
      },
      investment_perspective: ['AI 패권', '정책'],
      investment_timeframe: '단기',
      conviction_level: '보통'
    },
    {
      post_id: 420,
      date: '2025-02-01',
      sentiment: 'positive',
      score: 0.6,
      confidence: 0.8,
      key_reasoning: '미중 반도체 전쟁 속에서 엔비디아가 양국 모두에 필수적인 위치를 유지하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['필수 기업', '기술 독점', '양국 수요'],
        negative_factors: ['규제 리스크'],
        neutral_factors: ['지정학적 균형']
      },
      investment_perspective: ['반도체 패권', '독점력'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    }
  ],
  
  'TSLA': [ // 테슬라 (기존 데이터 활용)
    {
      post_id: 6,
      date: '2025-08-06',
      sentiment: 'positive',
      score: 0.85,
      confidence: 0.85,
      key_reasoning: '국민연금이 테슬라 비중을 늘린 것은 대형 기관투자자의 긍정적 전망을 시사합니다.',
      supporting_evidence: {
        positive_factors: ['국민연금 비중 확대', '기관 매수세'],
        negative_factors: [],
        neutral_factors: ['리밸런싱']
      },
      investment_perspective: ['기관투자', '포트폴리오'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    },
    {
      post_id: 11,
      date: '2025-08-05',
      sentiment: 'positive',
      score: 0.82,
      confidence: 0.82,
      key_reasoning: '테슬라와 삼성전자의 23조원 AI6 칩 계약은 테슬라의 AI 기술력을 입증합니다.',
      supporting_evidence: {
        positive_factors: ['23조원 계약', 'AI6 칩', '삼성 파트너십'],
        negative_factors: ['TSMC 이탈'],
        neutral_factors: ['공급처 변경']
      },
      investment_perspective: ['AI', '자율주행'],
      investment_timeframe: '장기',
      conviction_level: '높음'
    },
    {
      post_id: 33,
      date: '2025-07-30',
      sentiment: 'positive',
      score: 0.7,
      confidence: 0.85,
      key_reasoning: '삼성과의 AI6 칩 협력으로 테슬라 자율주행 기술이 가속화될 전망입니다.',
      supporting_evidence: {
        positive_factors: ['자율주행 발전', 'AI 칩 성능'],
        negative_factors: [],
        neutral_factors: ['개발 일정']
      },
      investment_perspective: ['자율주행', '기술 혁신'],
      investment_timeframe: '장기',
      conviction_level: '높음'
    },
    {
      post_id: 54,
      date: '2025-07-21',
      sentiment: 'negative',
      score: -0.4,
      confidence: 0.8,
      key_reasoning: 'CATL 나트륨 배터리가 테슬라 배터리 비용 경쟁력에 위협이 됩니다.',
      supporting_evidence: {
        positive_factors: [],
        negative_factors: ['나트륨 배터리 위협', '가격 경쟁력 하락'],
        neutral_factors: ['기술 대응']
      },
      investment_perspective: ['배터리 기술'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    },
    {
      post_id: 96,
      date: '2025-07-02',
      sentiment: 'negative',
      score: -0.6,
      confidence: 0.9,
      key_reasoning: '전기차 세제혜택 7,500달러 폐지로 테슬라 판매에 부정적 영향이 예상됩니다.',
      supporting_evidence: {
        positive_factors: [],
        negative_factors: ['세제혜택 폐지', '재생에너지 지원 축소'],
        neutral_factors: ['정책 변화']
      },
      investment_perspective: ['정책 리스크'],
      investment_timeframe: '단기',
      conviction_level: '높음'
    }
  ],
  
  'INTC': [ // 인텔
    {
      post_id: 512,
      date: '2025-08-15',
      sentiment: 'negative',
      score: -0.8,
      confidence: 0.9,
      key_reasoning: '인텔이 국유화 논의까지 나올 정도로 심각한 경영 위기를 겪고 있습니다.',
      supporting_evidence: {
        positive_factors: ['정부 지원 가능성'],
        negative_factors: ['국유화 논의', 'CEO 사임 압력', '경영 위기'],
        neutral_factors: []
      },
      investment_perspective: ['위기 관리', '구조조정'],
      investment_timeframe: '단기',
      conviction_level: '매우 높음'
    },
    {
      post_id: 5,
      date: '2025-08-10',
      sentiment: 'negative',
      score: -0.7,
      confidence: 0.85,
      key_reasoning: '트럼프가 직접 인텔 CEO 사임을 요구할 정도로 경영 실패가 명확합니다.',
      supporting_evidence: {
        positive_factors: [],
        negative_factors: ['CEO 사임 요구', '경영 실패', '정치적 압력'],
        neutral_factors: ['경영진 교체']
      },
      investment_perspective: ['경영 리스크'],
      investment_timeframe: '단기',
      conviction_level: '높음'
    },
    {
      post_id: 420,
      date: '2025-02-01',
      sentiment: 'negative',
      score: -0.5,
      confidence: 0.75,
      key_reasoning: '반도체 전쟁에서 인텔이 경쟁력을 잃고 있으며 정부 지원에 의존하는 상황입니다.',
      supporting_evidence: {
        positive_factors: ['정부 지원'],
        negative_factors: ['경쟁력 상실', '시장 점유율 하락'],
        neutral_factors: ['구조조정']
      },
      investment_perspective: ['반도체', '경쟁력'],
      investment_timeframe: '중기',
      conviction_level: '보통'
    }
  ],
  
  '267250': [ // HD현대
    {
      post_id: 2,
      date: '2025-08-12',
      sentiment: 'positive',
      score: 0.65,
      confidence: 0.75,
      key_reasoning: 'HD현대가 사우디 호위함 사업 등 방산 조선 분야에서 적극 참여하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['사우디 호위함', '코리아 원팀', '방산 진출'],
        negative_factors: ['호주 수주 실패'],
        neutral_factors: ['경쟁 심화']
      },
      investment_perspective: ['방산', '조선업'],
      investment_timeframe: '중장기',
      conviction_level: '보통'
    },
    {
      post_id: 10,
      date: '2025-08-08',
      sentiment: 'negative',
      score: -0.3,
      confidence: 0.7,
      key_reasoning: 'HD현대가 호주 군함 수주전에서 일본에 패배했으나 향후 기회는 존재합니다.',
      supporting_evidence: {
        positive_factors: ['기술력 보유'],
        negative_factors: ['호주 수주 실패', '일본 경쟁 패배'],
        neutral_factors: ['차기 프로젝트']
      },
      investment_perspective: ['방산', '조선업'],
      investment_timeframe: '단기',
      conviction_level: '낮음'
    },
    {
      post_id: 38,
      date: '2025-07-28',
      sentiment: 'positive',
      score: 0.7,
      confidence: 0.8,
      key_reasoning: 'HD현대중공업이 군산항 MRO 사업으로 새로운 수익원을 확보하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['MRO 사업', '군산항 활용', '신규 수익원'],
        negative_factors: [],
        neutral_factors: ['사업 초기']
      },
      investment_perspective: ['MRO', '서비스'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    },
    {
      post_id: 511,
      date: '2025-08-15',
      sentiment: 'positive',
      score: 0.6,
      confidence: 0.75,
      key_reasoning: '북극항로 개발로 HD현대의 특수선박 수요가 증가할 전망입니다.',
      supporting_evidence: {
        positive_factors: ['북극항로', '특수선박', '신규 시장'],
        negative_factors: ['기술 난이도'],
        neutral_factors: ['장기 프로젝트']
      },
      investment_perspective: ['특수선박', '신시장'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    }
  ],
  
  '042660': [ // 한화오션
    {
      post_id: 19,
      date: '2025-08-04',
      sentiment: 'positive',
      score: 0.7,
      confidence: 0.8,
      key_reasoning: '한화오션이 미국 필리조선소 인수로 글로벌 입지를 확대하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['필리조선소 인수', '미국 진출', 'LNG 기술'],
        negative_factors: ['인수 비용'],
        neutral_factors: ['협상 진행']
      },
      investment_perspective: ['M&A', '글로벌 확장'],
      investment_timeframe: '중장기',
      conviction_level: '높음'
    },
    {
      post_id: 42,
      date: '2025-07-26',
      sentiment: 'neutral',
      score: 0.0,
      confidence: 0.7,
      key_reasoning: '한화오션이 임단협 이슈를 겪고 있으나 수주 잔고는 견조합니다.',
      supporting_evidence: {
        positive_factors: ['수주 잔고'],
        negative_factors: ['임단협 갈등', '인력 부족'],
        neutral_factors: ['업계 공통']
      },
      investment_perspective: ['조선업', '노동'],
      investment_timeframe: '단기',
      conviction_level: '보통'
    },
    {
      post_id: 10,
      date: '2025-08-08',
      sentiment: 'negative',
      score: -0.2,
      confidence: 0.65,
      key_reasoning: '한화오션도 호주 군함 수주전에서 예선 탈락했습니다.',
      supporting_evidence: {
        positive_factors: ['경험 축적'],
        negative_factors: ['수주 실패', '경쟁 열세'],
        neutral_factors: ['차기 기회']
      },
      investment_perspective: ['방산', '수주'],
      investment_timeframe: '단기',
      conviction_level: '낮음'
    },
    {
      post_id: 2,
      date: '2025-08-12',
      sentiment: 'positive',
      score: 0.55,
      confidence: 0.7,
      key_reasoning: '한화오션이 코리아 원팀 전략으로 방산 조선 경쟁력을 강화하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['코리아 원팀', '기술 협력'],
        negative_factors: [],
        neutral_factors: ['경쟁 환경']
      },
      investment_perspective: ['협력', '방산'],
      investment_timeframe: '중기',
      conviction_level: '보통'
    }
  ],
  
  'GOOGL': [ // 구글
    {
      post_id: 6,
      date: '2025-08-07',
      sentiment: 'positive',
      score: 0.65,
      confidence: 0.75,
      key_reasoning: '국민연금이 구글 투자를 유지하며 AI 플랫폼 기업으로서의 가치를 인정하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['AI 플랫폼', '기관 투자', '검색 독점'],
        negative_factors: ['규제 리스크'],
        neutral_factors: ['성장 둔화']
      },
      investment_perspective: ['AI', '플랫폼'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    },
    {
      post_id: 420,
      date: '2025-02-01',
      sentiment: 'neutral',
      score: 0.0,
      confidence: 0.7,
      key_reasoning: '구글이 AI 경쟁에서 딥시크 등 신흥 기업들의 도전을 받고 있습니다.',
      supporting_evidence: {
        positive_factors: ['기술력', '자본력'],
        negative_factors: ['AI 경쟁 심화', '딥시크 위협'],
        neutral_factors: ['시장 재편']
      },
      investment_perspective: ['AI 경쟁', '혁신'],
      investment_timeframe: '중기',
      conviction_level: '보통'
    },
    {
      post_id: 424,
      date: '2025-01-30',
      sentiment: 'positive',
      score: 0.5,
      confidence: 0.7,
      key_reasoning: '구글이 AI 연구 분야에서 여전히 선도적 위치를 유지하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['AI 연구', 'DeepMind', '기술 선도'],
        negative_factors: ['경쟁 심화'],
        neutral_factors: ['연구 투자']
      },
      investment_perspective: ['AI', 'R&D'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    }
  ],
  
  'TSM': [ // TSMC
    {
      post_id: 12,
      date: '2025-08-07',
      sentiment: 'negative',
      score: -0.4,
      confidence: 0.8,
      key_reasoning: '대만 상호관세 20%와 지정학적 리스크가 TSMC에 부담으로 작용하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['기술 우위'],
        negative_factors: ['관세 20%', '지정학 리스크', '대만 긴장'],
        neutral_factors: ['정부 지분']
      },
      investment_perspective: ['지정학', '무역'],
      investment_timeframe: '단기',
      conviction_level: '높음'
    },
    {
      post_id: 171,
      date: '2025-05-28',
      sentiment: 'negative',
      score: -0.5,
      confidence: 0.75,
      key_reasoning: '젠슨황이 지적한 대만의 전력 부족이 TSMC 운영에 리스크가 됩니다.',
      supporting_evidence: {
        positive_factors: [],
        negative_factors: ['전력 부족', '원전 이슈', '인프라 한계'],
        neutral_factors: ['정부 대응']
      },
      investment_perspective: ['인프라', '운영 리스크'],
      investment_timeframe: '중기',
      conviction_level: '보통'
    },
    {
      post_id: 33,
      date: '2025-07-30',
      sentiment: 'positive',
      score: 0.6,
      confidence: 0.75,
      key_reasoning: 'TSMC가 3나노 공정에서 안정적인 접근으로 삼성을 앞서고 있습니다.',
      supporting_evidence: {
        positive_factors: ['3나노 안정성', '단계적 접근', '수율 우위'],
        negative_factors: [],
        neutral_factors: ['경쟁 지속']
      },
      investment_perspective: ['기술력', '파운드리'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    }
  ],
  
  'SK하이닉스': [ // SK하이닉스
    {
      post_id: 82,
      date: '2025-07-09',
      sentiment: 'positive',
      score: 0.8,
      confidence: 0.85,
      key_reasoning: 'SK하이닉스가 HBM 시장에서 선도적 위치를 유지하며 AI 메모리 수요를 독식하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['HBM 선도', 'AI 메모리', '엔비디아 공급'],
        negative_factors: ['삼성 추격'],
        neutral_factors: ['시장 성장']
      },
      investment_perspective: ['HBM', 'AI 메모리'],
      investment_timeframe: '중기',
      conviction_level: '매우 높음'
    },
    {
      post_id: 58,
      date: '2025-07-19',
      sentiment: 'positive',
      score: 0.7,
      confidence: 0.8,
      key_reasoning: 'SK하이닉스가 차세대 메모리 기술 개발에서 앞서가고 있습니다.',
      supporting_evidence: {
        positive_factors: ['기술 선도', 'HBM3E', '수율 우위'],
        negative_factors: [],
        neutral_factors: ['투자 지속']
      },
      investment_perspective: ['메모리', '기술'],
      investment_timeframe: '중장기',
      conviction_level: '높음'
    },
    {
      post_id: 209,
      date: '2025-05-10',
      sentiment: 'positive',
      score: 0.75,
      confidence: 0.8,
      key_reasoning: 'HBM 시장에서 SK하이닉스의 독점적 지위가 당분간 유지될 전망입니다.',
      supporting_evidence: {
        positive_factors: ['시장 독점', '기술 격차', '고객 신뢰'],
        negative_factors: [],
        neutral_factors: ['경쟁사 대응']
      },
      investment_perspective: ['HBM', '독점력'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    }
  ],
  
  'META': [ // 메타
    {
      post_id: 420,
      date: '2025-02-01',
      sentiment: 'positive',
      score: 0.6,
      confidence: 0.75,
      key_reasoning: '메타가 메타버스 투자를 지속하며 차세대 플랫폼 구축에 나서고 있습니다.',
      supporting_evidence: {
        positive_factors: ['메타버스 투자', 'VR/AR 기술', '플랫폼 전환'],
        negative_factors: ['수익성 압박'],
        neutral_factors: ['장기 투자']
      },
      investment_perspective: ['메타버스', '플랫폼'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    },
    {
      post_id: 6,
      date: '2025-08-07',
      sentiment: 'neutral',
      score: 0.0,
      confidence: 0.7,
      key_reasoning: '메타가 AI 경쟁과 메타버스 투자 사이에서 균형을 찾고 있습니다.',
      supporting_evidence: {
        positive_factors: ['AI 투자'],
        negative_factors: ['메타버스 손실'],
        neutral_factors: ['전략 조정']
      },
      investment_perspective: ['AI', '메타버스'],
      investment_timeframe: '중기',
      conviction_level: '낮음'
    }
  ],
  
  'BRK': [ // 버크셔 해서웨이
    {
      post_id: 6,
      date: '2025-08-07',
      sentiment: 'positive',
      score: 0.7,
      confidence: 0.85,
      key_reasoning: '버크셔가 국민연금 포트폴리오에서 안정적 투자처로 평가받고 있습니다.',
      supporting_evidence: {
        positive_factors: ['워런 버핏', '가치 투자', '안정성', '현금 보유'],
        negative_factors: ['성장 둔화'],
        neutral_factors: ['승계 계획']
      },
      investment_perspective: ['가치투자', '안정성'],
      investment_timeframe: '장기',
      conviction_level: '높음'
    },
    {
      post_id: 512,
      date: '2025-08-15',
      sentiment: 'positive',
      score: 0.65,
      confidence: 0.8,
      key_reasoning: '버크셔가 시장 변동성 속에서 안전자산으로 주목받고 있습니다.',
      supporting_evidence: {
        positive_factors: ['현금 보유', '방어적 포지션', '투자 기회'],
        negative_factors: [],
        neutral_factors: ['시장 관망']
      },
      investment_perspective: ['방어주', '현금'],
      investment_timeframe: '중기',
      conviction_level: '높음'
    }
  ],
  
  'UNH': [ // 유나이티드헬스
    {
      post_id: 512,
      date: '2025-08-15',
      sentiment: 'positive',
      score: 0.6,
      confidence: 0.75,
      key_reasoning: '유나이티드헬스가 미국 의료보험 시장을 주도하며 안정적 성장을 지속하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['시장 지배력', '안정적 수익', '인구 고령화'],
        negative_factors: ['규제 리스크'],
        neutral_factors: ['정책 변화']
      },
      investment_perspective: ['헬스케어', '보험'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    },
    {
      post_id: 6,
      date: '2025-08-07',
      sentiment: 'positive',
      score: 0.55,
      confidence: 0.7,
      key_reasoning: '국민연금이 유나이티드헬스를 헬스케어 섹터 핵심 투자처로 유지하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['기관 투자', '섹터 리더', '실적 안정'],
        negative_factors: [],
        neutral_factors: ['성장률']
      },
      investment_perspective: ['헬스케어', '방어주'],
      investment_timeframe: '장기',
      conviction_level: '보통'
    }
  ],
  
  'AMD': [ // AMD
    {
      post_id: 420,
      date: '2025-02-01',
      sentiment: 'positive',
      score: 0.65,
      confidence: 0.75,
      key_reasoning: 'AMD가 AI 칩 시장에서 엔비디아의 대안으로 부상하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['AI 칩 개발', '가격 경쟁력', '시장 점유율 상승'],
        negative_factors: ['엔비디아 격차'],
        neutral_factors: ['기술 개발']
      },
      investment_perspective: ['AI 칩', '경쟁력'],
      investment_timeframe: '중기',
      conviction_level: '보통'
    },
    {
      post_id: 139,
      date: '2025-06-13',
      sentiment: 'positive',
      score: 0.6,
      confidence: 0.7,
      key_reasoning: 'AMD가 데이터센터 시장에서 인텔을 대체하며 성장하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['데이터센터', '인텔 대체', 'EPYC 프로세서'],
        negative_factors: [],
        neutral_factors: ['시장 경쟁']
      },
      investment_perspective: ['데이터센터', 'CPU'],
      investment_timeframe: '중기',
      conviction_level: '보통'
    }
  ],
  
  'MSFT': [ // 마이크로소프트
    {
      post_id: 424,
      date: '2025-01-30',
      sentiment: 'positive',
      score: 0.8,
      confidence: 0.85,
      key_reasoning: '마이크로소프트가 OpenAI 파트너십으로 AI 시장을 선도하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['OpenAI 파트너십', 'Azure AI', 'Copilot 성공'],
        negative_factors: [],
        neutral_factors: ['투자 규모']
      },
      investment_perspective: ['AI', '클라우드'],
      investment_timeframe: '장기',
      conviction_level: '매우 높음'
    },
    {
      post_id: 420,
      date: '2025-02-01',
      sentiment: 'positive',
      score: 0.75,
      confidence: 0.8,
      key_reasoning: '마이크로소프트가 기업 AI 시장에서 독보적 위치를 구축하고 있습니다.',
      supporting_evidence: {
        positive_factors: ['기업 AI', 'Azure 성장', '생산성 도구'],
        negative_factors: [],
        neutral_factors: ['경쟁 심화']
      },
      investment_perspective: ['엔터프라이즈 AI', 'SaaS'],
      investment_timeframe: '중장기',
      conviction_level: '높음'
    }
  ]
};

// 데이터 삽입 함수
async function insertSentimentData() {
  console.log('🚀 3개월치 감정 분석 데이터 생성 시작...\n');
  
  let totalInserted = 0;
  let totalSkipped = 0;
  
  for (const [ticker, sentiments] of Object.entries(sentimentAnalysisData)) {
    console.log(`\n📊 ${ticker} 종목 처리 중...`);
    let tickerInserted = 0;
    let tickerSkipped = 0;
    
    for (const sentiment of sentiments) {
      // 기존 데이터 확인
      const exists = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM post_stock_sentiments WHERE post_id = ? AND ticker = ?',
          [sentiment.post_id, ticker],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (!exists) {
        // 기본 감정 데이터 삽입
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO post_stock_sentiments 
             (post_id, ticker, sentiment, sentiment_score, confidence, keywords, context_snippet)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              sentiment.post_id,
              ticker,
              sentiment.sentiment,
              sentiment.score,
              sentiment.confidence,
              JSON.stringify(sentiment.supporting_evidence),
              sentiment.key_reasoning
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        // 상세 데이터 테이블 생성 (없으면)
        await new Promise((resolve, reject) => {
          db.run(
            `CREATE TABLE IF NOT EXISTS sentiment_details (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              post_id INTEGER,
              ticker TEXT,
              key_reasoning TEXT,
              supporting_evidence TEXT,
              investment_perspective TEXT,
              investment_timeframe TEXT,
              conviction_level TEXT,
              uncertainty_factors TEXT,
              mention_context TEXT,
              analysis_date DATE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (post_id) REFERENCES blog_posts(id)
            )`,
            (err) => {
              if (err && !err.message.includes('already exists')) reject(err);
              else resolve();
            }
          );
        });
        
        // 상세 데이터 삽입
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO sentiment_details 
             (post_id, ticker, key_reasoning, supporting_evidence, investment_perspective, 
              investment_timeframe, conviction_level, uncertainty_factors, analysis_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              sentiment.post_id,
              ticker,
              sentiment.key_reasoning,
              JSON.stringify(sentiment.supporting_evidence),
              JSON.stringify(sentiment.investment_perspective),
              sentiment.investment_timeframe,
              sentiment.conviction_level,
              JSON.stringify(sentiment.uncertainty_factors || []),
              sentiment.date
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        tickerInserted++;
        console.log(`  ✅ Post ${sentiment.post_id} (${sentiment.date}): ${sentiment.sentiment} (${(sentiment.score * 100).toFixed(0)}%)`);
      } else {
        tickerSkipped++;
      }
    }
    
    console.log(`  📊 ${ticker}: ${tickerInserted}개 추가, ${tickerSkipped}개 스킵`);
    totalInserted += tickerInserted;
    totalSkipped += tickerSkipped;
  }
  
  // 전체 통계
  const stats = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        ticker,
        COUNT(*) as total,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
        AVG(confidence) as avg_confidence
       FROM post_stock_sentiments
       GROUP BY ticker
       ORDER BY total DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  console.log('\n📈 전체 감정 분석 통계:');
  console.log('=====================================');
  stats.forEach(stat => {
    console.log(`${stat.ticker.padEnd(12)} | 총 ${String(stat.total).padStart(3)}개 | 긍정 ${String(stat.positive).padStart(2)} | 부정 ${String(stat.negative).padStart(2)} | 중립 ${String(stat.neutral).padStart(2)} | 신뢰도 ${(stat.avg_confidence * 100).toFixed(0)}%`);
  });
  
  console.log('\n=====================================');
  console.log(`✅ 총 ${totalInserted}개 새로운 감정 분석 추가`);
  console.log(`⏭️  총 ${totalSkipped}개 기존 데이터 스킵`);
  
  db.close();
  console.log('\n🎉 3개월치 감정 분석 데이터 생성 완료!');
}

// 실행
insertSentimentData().catch(console.error);