import sqlite3
import json

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# 포스트 5에 대한 삼성전자 감정 분석
log_no = 5
ticker = '005930'

analysis = {
    'sentiment': 'positive',
    'sentiment_score': 0.45,
    'key_reasoning': '인텔 CEO 사임 압력과 트럼프-인텔 충돌로 삼성전자 파운드리 사업에 반사이익이 예상됩니다.',
    'supporting_evidence': {
        'positive_factors': [
            '인텔 리더십 불안정성',
            '트럼프-인텔 갈등',
            '파운드리 경쟁자 약화'
        ],
        'negative_factors': [],
        'neutral_factors': [
            '미국 정치 상황',
            '화교 관련 이슈'
        ]
    },
    'investment_perspective': ['파운드리', '경쟁 우위', '반사이익'],
    'investment_timeframe': '단기',
    'conviction_level': '보통',
    'uncertainty_factors': ['트럼프 정책 변동성', '인텔 이사회 대응'],
    'mention_context': '인텔 내부 갈등으로 인한 삼성전자 수혜 가능성'
}

try:
    cursor.execute("""
        INSERT INTO sentiments (
            log_no, ticker, sentiment, sentiment_score, key_reasoning,
            supporting_evidence, investment_perspective, investment_timeframe,
            conviction_level, uncertainty_factors, mention_context, analysis_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
    """, (
        log_no, ticker, analysis['sentiment'], analysis['sentiment_score'],
        analysis['key_reasoning'],
        json.dumps(analysis['supporting_evidence'], ensure_ascii=False),
        json.dumps(analysis['investment_perspective'], ensure_ascii=False),
        analysis['investment_timeframe'], analysis['conviction_level'],
        json.dumps(analysis['uncertainty_factors'], ensure_ascii=False),
        analysis['mention_context']
    ))
    
    conn.commit()
    print(f"Post {log_no} Samsung analysis completed")
    
except Exception as e:
    print(f"Error: {e}")

conn.close()
