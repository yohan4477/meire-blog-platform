import sqlite3
import json

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# ID 53: 포스트 512 분석 (원래 ID 268)
cursor.execute("""
    INSERT INTO sentiments (id, post_id, ticker, sentiment, sentiment_score, key_reasoning,
        supporting_evidence, investment_perspective, investment_timeframe,
        conviction_level, uncertainty_factors, mention_context, analysis_date)
    VALUES (53, 512, '005930', 'negative', -0.35, 
        '미국 정부의 인텔 지원으로 삼성전자 파운드리 사업에 경쟁 압력이 증가할 우려가 있습니다.',
        ?, ?, '중기', '보통', ?, '인텔 국영화 논의 중 삼성전자 경쟁 우려', '2025-08-16')
""", (
    json.dumps({"positive_factors": [], "negative_factors": ["인텔 국영기업화 가능성", "미국 정부 지원 집중", "파운드리 경쟁 심화"], "neutral_factors": ["트럼프 정책 변화", "반도체 산업 재편"]}, ensure_ascii=False),
    json.dumps(["파운드리", "경쟁 리스크", "정책 변화"], ensure_ascii=False),
    json.dumps(["미국 정책 불확실성", "인텔 구조조정 결과"], ensure_ascii=False)
))

# ID 54: 포스트 5 분석 (원래 ID 270)
cursor.execute("""
    INSERT INTO sentiments (id, post_id, ticker, sentiment, sentiment_score, key_reasoning,
        supporting_evidence, investment_perspective, investment_timeframe,
        conviction_level, uncertainty_factors, mention_context, analysis_date)
    VALUES (54, 5, '005930', 'positive', 0.45,
        '인텔 CEO 사임 압력과 트럼프-인텔 충돌로 삼성전자 파운드리 사업에 반사이익이 예상됩니다.',
        ?, ?, '단기', '보통', ?, '인텔 내부 갈등으로 인한 삼성전자 수혜 가능성', '2025-08-16')
""", (
    json.dumps({"positive_factors": ["인텔 리더십 불안정성", "트럼프-인텔 갈등", "파운드리 경쟁자 약화"], "negative_factors": [], "neutral_factors": ["미국 정치 상황", "화교 관련 이슈"]}, ensure_ascii=False),
    json.dumps(["파운드리", "경쟁 우위", "반사이익"], ensure_ascii=False),
    json.dumps(["트럼프 정책 변동성", "인텔 이사회 대응"], ensure_ascii=False)
))

# ID 55: 포스트 12 분석 (원래 ID 271)
cursor.execute("""
    INSERT INTO sentiments (id, post_id, ticker, sentiment, sentiment_score, key_reasoning,
        supporting_evidence, investment_perspective, investment_timeframe,
        conviction_level, uncertainty_factors, mention_context, analysis_date)
    VALUES (55, 12, '005930', 'positive', 0.55,
        'TSMC의 전력난과 비용 상승으로 삼성전자 파운드리 경쟁력이 상대적으로 개선되고 있습니다.',
        ?, ?, '중장기', '높음', ?, 'TSMC 전력난 분석 중 삼성전자 경쟁력 비교', '2025-08-16')
""", (
    json.dumps({"positive_factors": ["TSMC 전기료 상승", "대만 전력 부족 심화", "한국-대만 전기료 격차 축소", "TSMC 경쟁력 약화"], "negative_factors": [], "neutral_factors": ["인텔 파운드리 실패", "미국 정책 변화"]}, ensure_ascii=False),
    json.dumps(["파운드리", "원가 경쟁력", "인프라 우위"], ensure_ascii=False),
    json.dumps(["대만 지정학적 리스크", "TSMC 미국 이전 가능성"], ensure_ascii=False)
))

conn.commit()
print("Successfully inserted records with IDs 53, 54, 55")
conn.close()
