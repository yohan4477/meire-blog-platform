-- Claude AI 감정 분석 데모 데이터 생성
-- 실제 Claude AI API 호출 없이 테스트용 데이터 삽입

-- TSLA 관련 Claude AI 분석 데모 데이터
INSERT OR REPLACE INTO post_stock_sentiments_claude 
(post_id, ticker, sentiment, sentiment_score, confidence, 
 key_reasoning, supporting_evidence, key_keywords, context_quotes,
 investment_perspective, investment_timeframe, conviction_level,
 mention_context, analysis_focus, uncertainty_factors, analyzed_at)
VALUES 
-- 긍정적 분석 사례 (3분기 실적 관련)
(33, 'TSLA', 'positive', 0.75, 0.87,
 '테슬라의 3분기 실적이 예상을 뛰어넘으며 자율주행 기술 상용화 가능성과 함께 장기 성장 전망이 매우 긍정적',
 '{"positive_factors": ["3분기 실적 예상 초과", "자율주행 기술 진전", "중국 시장 강세"], "negative_factors": ["경쟁 심화"], "neutral_factors": []}',
 '["실적", "성장", "자율주행", "상용화", "전망"]',
 '["3분기 실적이 예상을 뛰어넘었다", "자율주행 기술 상용화 가능성이 높아지고 있어 장기적으로 매우 긍정적"]',
 '["실적", "전망"]',
 '장기',
 '높음',
 '실적 발표 분석',
 '실적 개선과 기술 전망',
 '["경쟁 환경 변화", "원자재 가격 변동성"]',
 '2025-07-29 10:30:00'),

-- 부정적 분석 사례 (리스크 요인 관련)  
(6, 'TSLA', 'negative', -0.65, 0.78,
 '국민연금 매도 움직임과 함께 고평가 우려가 지속되고 있어 단기적으로는 조정 압력이 예상됨',
 '{"positive_factors": [], "negative_factors": ["국민연금 매도", "고평가 우려", "시장 불확실성"], "neutral_factors": ["기술적 펀더멘털"]}',
 '["매도", "고평가", "조정", "리스크"]',
 '["국민연금의 매도 움직임이 관찰되고 있다", "현재 밸류에이션 수준에서는 조정이 불가피해 보인다"]',
 '["리스크", "밸류에이션"]',
 '단기',
 '보통',
 '투자기관 동향 분석',
 '기관 투자자 매도와 밸류에이션',
 '["시장 변동성", "금리 변화", "정책 리스크"]',
 '2025-08-09 14:20:00'),

-- 중립적 분석 사례 (관망 입장)
(35, 'TSLA', 'neutral', 0.1, 0.65,
 '삼성전자와의 협력 관계는 긍정적이나 전체적인 시장 상황을 고려할 때 신중한 접근이 필요한 시점',
 '{"positive_factors": ["삼성전자 협력"], "negative_factors": ["시장 불확실성"], "neutral_factors": ["관망 필요", "추가 지켜볼 요소"]}',
 '["협력", "삼성전자", "관망", "신중"]',
 '["삼성전자와의 협력은 긍정적 요소", "전체적인 시장 상황을 고려할 때 신중한 접근이 필요"]',
 '["기회"]',
 '중기',
 '보통',
 '기업간 협력 분석',
 '파트너십과 시장 환경',
 '["협력 진전도", "시장 수용성", "경쟁사 대응"]',
 '2025-07-29 16:45:00');

-- INTC 관련 Claude AI 분석 데모 데이터
INSERT OR REPLACE INTO post_stock_sentiments_claude 
(post_id, ticker, sentiment, sentiment_score, confidence, 
 key_reasoning, supporting_evidence, key_keywords, context_quotes,
 investment_perspective, investment_timeframe, conviction_level,
 mention_context, analysis_focus, uncertainty_factors, analyzed_at)
VALUES 
-- 인텔 국유화 관련 긍정적 분석
(1, 'INTC', 'positive', 0.82, 0.91,
 '트럼프 정부의 인텔 국유화 검토는 반도체 자립화 정책의 핵심으로 대규모 정부 지원이 예상되어 매우 긍정적',
 '{"positive_factors": ["정부 국유화 검토", "대규모 정부 지원", "반도체 자립화 정책", "전략적 중요성"], "negative_factors": ["불확실성"], "neutral_factors": []}',
 '["국유화", "정부지원", "반도체", "자립화", "트럼프"]',
 '["트럼프 정부가 인텔 국유화를 검토하고 있다", "반도체 자립화를 위한 전략적 결정으로 보인다"]',
 '["정책", "기회"]',
 '장기',
 '높음',
 '정책 변화 분석',
 '정부 정책과 전략적 가치',
 '["정치적 변수", "실행 가능성", "주주 반응"]',
 '2025-08-15 16:44:00');

-- GOOGL 관련 데모 데이터도 추가
INSERT OR REPLACE INTO post_stock_sentiments_claude 
(post_id, ticker, sentiment, sentiment_score, confidence, 
 key_reasoning, supporting_evidence, key_keywords, context_quotes,
 investment_perspective, investment_timeframe, conviction_level,
 mention_context, analysis_focus, uncertainty_factors, analyzed_at)
VALUES 
(50, 'GOOGL', 'neutral', 0.05, 0.55,
 '희토류 공급망 이슈는 구글의 하드웨어 사업에 일부 영향을 줄 수 있으나 전체 비즈니스 모델에는 제한적 영향',
 '{"positive_factors": ["다각화된 비즈니스"], "negative_factors": ["공급망 리스크"], "neutral_factors": ["제한적 영향", "모니터링 필요"]}',
 '["희토류", "공급망", "하드웨어", "제한적"]',
 '["희토류 공급망 이슈가 일부 영향을 줄 수 있다", "전체 비즈니스에는 제한적 영향으로 예상"]',
 '["리스크"]',
 '중기',
 '보통',
 '공급망 리스크 분석',
 '원자재 공급과 사업 영향',
 '["지정학적 리스크", "공급처 다변화", "비용 증가"]',
 '2025-07-22 15:30:00');