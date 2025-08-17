import sqlite3
import json

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# 포스트 12에 대한 삼성전자 감정 분석
post_id = 12
ticker = '005930'

analysis = {
    'sentiment': 'positive',
    'sentiment_score': 0.55,
    'key_reasoning': 'TSMC의 전력난과 비용 상승으로 삼성전자 파운드리 경쟁력이 상대적으로 개선되고 있습니다.',
    'supporting_evidence': {
        'positive_factors': [
            'TSMC 전기료 상승',
            '대만 전력 부족 심화',
            '한국-대만 전기료 격차 축소',
            'TSMC 경쟁력 약화'
        ],
        'negative_factors': [],
        'neutral_factors': [
            '인텔 파운드리 실패',
            '미국 정책 변화'
        ]
    },
    'investment_perspective': ['파운드리', '원가 경쟁력', '인프라 우위'],
    'investment_timeframe': '중장기',
    'conviction_level': '높음',
    'uncertainty_factors': ['대만 지정학적 리스크', 'TSMC 미국 이전 가능성'],
    'mention_context': 'TSMC 전력난 분석 중 삼성전자 경쟁력 비교'
}

try:
    cursor.execute("""
        INSERT INTO sentiments (
            post_id, ticker, sentiment, sentiment_score, key_reasoning,
            supporting_evidence, investment_perspective, investment_timeframe,
            conviction_level, uncertainty_factors, mention_context, analysis_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
    """, (
        post_id, ticker, analysis['sentiment'], analysis['sentiment_score'],
        analysis['key_reasoning'],
        json.dumps(analysis['supporting_evidence'], ensure_ascii=False),
        json.dumps(analysis['investment_perspective'], ensure_ascii=False),
        analysis['investment_timeframe'], analysis['conviction_level'],
        json.dumps(analysis['uncertainty_factors'], ensure_ascii=False),
        analysis['mention_context']
    ))
    
    conn.commit()
    print(f"Post {post_id} Samsung analysis completed")
    
except Exception as e:
    print(f"Error: {e}")

conn.close()
