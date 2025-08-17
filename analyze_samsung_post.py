import sqlite3
import json
from datetime import datetime

# 데이터베이스 연결
conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# 포스트 512에 대한 삼성전자 감정 분석
post_id = 512
ticker = '005930'

# Claude AI 스타일 분석 결과
analysis = {
    'sentiment': 'negative',
    'sentiment_score': -0.35,
    'key_reasoning': '미국 정부의 인텔 지원으로 삼성전자 파운드리 사업에 경쟁 압력이 증가할 우려가 있습니다.',
    'supporting_evidence': {
        'positive_factors': [],
        'negative_factors': [
            '인텔 국영기업화 가능성',
            '미국 정부 지원 집중',
            '파운드리 경쟁 심화'
        ],
        'neutral_factors': [
            '트럼프 정책 변화',
            '반도체 산업 재편'
        ]
    },
    'investment_perspective': ['파운드리', '경쟁 리스크', '정책 변화'],
    'investment_timeframe': '중기',
    'conviction_level': '보통',
    'uncertainty_factors': ['미국 정책 불확실성', '인텔 구조조정 결과'],
    'mention_context': '인텔 국영화 논의 중 삼성전자 경쟁 우려'
}

# 데이터 삽입
try:
    cursor.execute("""
        INSERT INTO sentiments (
            post_id, ticker, sentiment, sentiment_score, key_reasoning,
            supporting_evidence, investment_perspective, investment_timeframe,
            conviction_level, uncertainty_factors, mention_context, analysis_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
    """, (
        post_id,
        ticker,
        analysis['sentiment'],
        analysis['sentiment_score'],
        analysis['key_reasoning'],
        json.dumps(analysis['supporting_evidence'], ensure_ascii=False),
        json.dumps(analysis['investment_perspective'], ensure_ascii=False),
        analysis['investment_timeframe'],
        analysis['conviction_level'],
        json.dumps(analysis['uncertainty_factors'], ensure_ascii=False),
        analysis['mention_context']
    ))
    
    conn.commit()
    print(f"Post {post_id} Samsung analysis completed")
    print(f"   Sentiment: {analysis['sentiment']} (Score: {analysis['sentiment_score']})")
    print(f"   Key reasoning: {analysis['key_reasoning']}")
    
except Exception as e:
    print(f"Error: {e}")

conn.close()
