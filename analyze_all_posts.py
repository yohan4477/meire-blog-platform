#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Claude가 직접 모든 blog_posts를 분석하여 sentiments DB에 저장
API 없이 직접 분석 수행
"""

import sqlite3
import json
import re
from datetime import datetime

class DirectClaudeAnalyzer:
    def __init__(self):
        self.conn = sqlite3.connect('database.db')
        self.cursor = self.conn.cursor()
        # 현재 최대 ID 확인하여 시작점 설정
        self.cursor.execute("SELECT MAX(id) FROM sentiments")
        max_id = self.cursor.fetchone()[0]
        self.next_id = (max_id + 1) if max_id else 56
        
        # 종목명 매핑 (확장 가능)
        self.ticker_to_name_map = {
            # 한국 종목
            '005930': ['삼성전자', '삼성', 'Samsung'],
            '000660': ['SK하이닉스', 'SK Hynix', '하이닉스'],
            '042660': ['한화오션', '한화시스템', '한화에어로스페이스', '한화'],
            '267250': ['HD현대', 'HD한국조선해양', '현대중공업', '현대'],
            '010620': ['현대미포조선', '현대미포', '미포조선'],
# 제거: 네이버는 블로그 플랫폼명으로 오인식
            '207940': ['삼성바이오로직스', '삼성바이오'],
            '006400': ['삼성SDI', 'SDI'],
            '051910': ['LG화학', 'LG'],
            '068270': ['셀트리온', 'Celltrion'],
            '035720': ['카카오', 'Kakao'],
            '003550': ['LG', 'LG그룹'],
            '323410': ['카카오뱅크', '카뱅'],
            '096770': ['SK이노베이션', 'SK'],
            '018260': ['삼성에스디에스', 'SDS'],
            '066570': ['LG전자', 'LG Electronics'],
            '000270': ['기아', 'KIA'],
            '005380': ['현대차', '현대자동차'],
            '012330': ['현대모비스', '모비스'],
            '015760': ['한국전력', '한전'],
            '055550': ['신한지주', '신한은행'],
            '086790': ['하나금융지주', '하나은행'],
            '105560': ['KB금융', 'KB국민은행'],
            '316140': ['우리금융지주', '우리은행'],
            
            # 미국 종목
            'TSLA': ['테슬라', 'Tesla', '일론머스크', '머스크'],
            'AAPL': ['애플', 'Apple', '아이폰', 'iPhone'],
            'NVDA': ['엔비디아', 'NVIDIA', '엔디비아'],
            'INTC': ['인텔', 'Intel'],
            'MSFT': ['마이크로소프트', 'Microsoft', 'MS', '마소'],
            'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
            'AMZN': ['아마존', 'Amazon', '아마존닷컴'],
            'META': ['메타', 'Meta', '페이스북', 'Facebook'],
            'TSMC': ['TSMC', '대만반도체', '타이완반도체'],
            'LLY': ['일라이릴리', 'Eli Lilly', '릴리', 'Lilly'],
            'UNH': ['유나이티드헬스케어', 'UnitedHealth', '유나이티드헬스'],
            'BRK': ['버크셔해서웨이', 'Berkshire', '버핏', '워런버핏'],
            'AMD': ['AMD', '에이엠디'],
            'JPM': ['JP모건', 'JPMorgan', '제이피모건'],
            'JNJ': ['존슨앤존슨', 'Johnson', 'J&J'],
            'PG': ['P&G', '프록터앤갬블'],
# 제거: V는 vs, very 등으로 오인식 가능
            'MA': ['마스터카드', 'Mastercard'],
            'HD': ['HD현대중공업', 'HD Hyundai Heavy Industries'],
            'DIS': ['디즈니', 'Disney'],
            'NFLX': ['넷플릭스', 'Netflix'],
            'CRM': ['세일즈포스', 'Salesforce'],
            'ORCL': ['오라클', 'Oracle'],
            'BABA': ['알리바바', 'Alibaba'],
            'ASML': ['ASML'],
            'TSM': ['대만반도체', 'Taiwan Semiconductor'],
            'NVO': ['노보노디스크', 'Novo Nordisk'],
            'ADBE': ['어도비', 'Adobe'],
            'COP': ['코노코필립스', 'ConocoPhillips'],
            'XOM': ['엑손모빌', 'ExxonMobil'],
            'CVX': ['셰브론', 'Chevron'],
            'PFE': ['화이자', 'Pfizer'],
            'KO': ['코카콜라', 'Coca-Cola'],
            'PEP': ['펩시', 'PepsiCo'],
            'WMT': ['월마트', 'Walmart'],
            'BAC': ['뱅크오브아메리카', 'Bank of America'],
            'WFC': ['웰스파고', 'Wells Fargo'],
            'GS': ['골드만삭스', 'Goldman Sachs'],
            'MS': ['모건스탠리', 'Morgan Stanley']
        }
        
        # 감정 분석 키워드
        self.sentiment_keywords = {
            'positive': ['상승', '증가', '성장', '호재', '긍정적', '좋은', '유망', '전망', '기대', 
                        '투자', '추천', '매수', '수혜', '개선', '반사이익', '기회', '성공'],
            'negative': ['하락', '감소', '악재', '부정적', '나쁜', '우려', '위험', '리스크', 
                        '매도', '하향', '악화', '실패', '압력', '위협', '문제', '손실'],
            'neutral': ['유지', '보합', '관망', '중립', '분석', '검토', '평가', '현황', 
                       '발표', '공시', '지켜봐야', '불확실']
        }

    def find_mentioned_stocks(self, text):
        """텍스트에서 언급된 종목들 찾기"""
        mentioned_stocks = []
        text_lower = text.lower()
        
        for ticker, names in self.ticker_to_name_map.items():
            for name in names:
                if name.lower() in text_lower:
                    mentioned_stocks.append({
                        'ticker': ticker,
                        'name': names[0]  # 대표 이름 사용
                    })
                    break
        
        # 중복 제거
        unique_stocks = []
        seen_tickers = set()
        for stock in mentioned_stocks:
            if stock['ticker'] not in seen_tickers:
                unique_stocks.append(stock)
                seen_tickers.add(stock['ticker'])
        
        return unique_stocks

    def analyze_sentiment(self, ticker, company_name, title, content):
        """Claude가 직접 감정 분석 수행"""
        full_text = f"{title}\n{content}"
        text_lower = full_text.lower()
        
        # 종목 관련 문맥 추출
        context_sentences = []
        sentences = full_text.split('.')
        for sentence in sentences:
            if any(name.lower() in sentence.lower() for name in self.ticker_to_name_map.get(ticker, [])):
                context_sentences.append(sentence.strip())
        
        # 감정 점수 계산
        positive_score = sum(1 for keyword in self.sentiment_keywords['positive'] if keyword in text_lower)
        negative_score = sum(1 for keyword in self.sentiment_keywords['negative'] if keyword in text_lower)
        neutral_score = sum(1 for keyword in self.sentiment_keywords['neutral'] if keyword in text_lower)
        
        # 감정 결정
        if positive_score > negative_score and positive_score > neutral_score:
            sentiment = 'positive'
            sentiment_score = min(1.0, positive_score * 0.15)
        elif negative_score > positive_score and negative_score > neutral_score:
            sentiment = 'negative'
            sentiment_score = max(-1.0, -negative_score * 0.15)
        else:
            sentiment = 'neutral'
            sentiment_score = 0.0
        
        # 핵심 논리 생성
        key_reasoning = self.generate_key_reasoning(ticker, company_name, context_sentences, sentiment)
        
        # 근거 요인 추출
        supporting_evidence = self.extract_supporting_evidence(text_lower, context_sentences)
        
        # 투자 관점 및 기타 메타데이터
        investment_perspective = self.determine_investment_perspective(text_lower)
        investment_timeframe = self.determine_timeframe(text_lower)
        conviction_level = self.determine_conviction(sentiment_score)
        
        return {
            'sentiment': sentiment,
            'sentiment_score': round(sentiment_score, 3),
            'key_reasoning': key_reasoning,
            'supporting_evidence': supporting_evidence,
            'investment_perspective': investment_perspective,
            'investment_timeframe': investment_timeframe,
            'conviction_level': conviction_level,
            'uncertainty_factors': self.extract_uncertainty_factors(text_lower),
            'mention_context': context_sentences[0][:100] if context_sentences else ''
        }

    def generate_key_reasoning(self, ticker, company_name, context_sentences, sentiment):
        """핵심 투자 논리 생성"""
        if not context_sentences:
            return f"{company_name}이(가) 언급되었으나 구체적인 투자 의견은 제시되지 않았습니다."
        
        # 문맥에서 핵심 내용 추출
        key_sentence = context_sentences[0] if context_sentences else ""
        
        # 감정에 따른 논리 생성
        if sentiment == 'positive':
            return f"{company_name}의 {key_sentence[:50]}... 긍정적 전망이 예상됩니다."
        elif sentiment == 'negative':
            return f"{company_name}의 {key_sentence[:50]}... 우려가 제기됩니다."
        else:
            return f"{company_name}의 {key_sentence[:50]}... 추이를 지켜볼 필요가 있습니다."

    def extract_supporting_evidence(self, text_lower, context_sentences):
        """근거 요인 추출"""
        positive_factors = []
        negative_factors = []
        neutral_factors = []
        
        # 키워드 기반 요인 추출
        for keyword in self.sentiment_keywords['positive']:
            if keyword in text_lower:
                positive_factors.append(keyword)
        
        for keyword in self.sentiment_keywords['negative']:
            if keyword in text_lower:
                negative_factors.append(keyword)
        
        if not positive_factors and not negative_factors:
            neutral_factors.append("명확한 방향성 없음")
        
        return {
            'positive_factors': positive_factors[:5],  # 최대 5개
            'negative_factors': negative_factors[:5],
            'neutral_factors': neutral_factors[:3]
        }

    def determine_investment_perspective(self, text_lower):
        """투자 관점 결정"""
        perspectives = []
        
        if '파운드리' in text_lower or '반도체' in text_lower:
            perspectives.append('반도체')
        if '배터리' in text_lower or '전기차' in text_lower:
            perspectives.append('전기차')
        if 'AI' in text_lower or '인공지능' in text_lower:
            perspectives.append('AI')
        if '조선' in text_lower or '선박' in text_lower:
            perspectives.append('조선')
        if '제약' in text_lower or '바이오' in text_lower:
            perspectives.append('바이오')
        
        return perspectives[:3] if perspectives else ['일반']

    def determine_timeframe(self, text_lower):
        """투자 기간 결정"""
        if '단기' in text_lower or '즉시' in text_lower:
            return '단기'
        elif '장기' in text_lower or '미래' in text_lower:
            return '장기'
        elif '중기' in text_lower:
            return '중기'
        else:
            return '중장기'

    def determine_conviction(self, sentiment_score):
        """확신 수준 결정"""
        abs_score = abs(sentiment_score)
        if abs_score > 0.7:
            return '매우 높음'
        elif abs_score > 0.5:
            return '높음'
        elif abs_score > 0.3:
            return '보통'
        else:
            return '낮음'

    def extract_uncertainty_factors(self, text_lower):
        """불확실성 요인 추출"""
        factors = []
        
        uncertainty_keywords = ['불확실', '리스크', '변동', '우려', '가능성', '예상', '전망']
        for keyword in uncertainty_keywords:
            if keyword in text_lower:
                factors.append(keyword)
        
        return factors[:3] if factors else []

    def save_to_db(self, log_no, ticker, analysis):
        """분석 결과를 DB에 저장"""
        try:
            self.cursor.execute("""
                INSERT INTO sentiments (
                    id, log_no, ticker, sentiment, sentiment_score, key_reasoning,
                    supporting_evidence, investment_perspective, investment_timeframe,
                    conviction_level, uncertainty_factors, mention_context, analysis_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'))
            """, (
                self.next_id,
                log_no,
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
            
            self.next_id += 1
            return True
        except Exception as e:
            print(f"Error saving to DB: {e}")
            return False

    def analyze_all_posts(self):
        """모든 미분석 포스트 분석"""
        print("Claude direct analysis starting...")
        
        # 미분석 포스트 조회
        self.cursor.execute("""
            SELECT DISTINCT bp.id, bp.title, bp.content, bp.created_date
            FROM blog_posts bp
            WHERE bp.id NOT IN (
                SELECT DISTINCT log_no FROM sentiments
            )
            ORDER BY bp.created_date DESC
        """)
        
        posts = self.cursor.fetchall()
        print(f"Analysis target posts: {len(posts)}")
        
        total_analyses = 0
        
        for i, (log_no, title, content, created_date) in enumerate(posts):
            print(f"\n[{i+1}/{len(posts)}] 분석 중: {title[:50]}...")
            
            # 종목 찾기
            mentioned_stocks = self.find_mentioned_stocks(f"{title} {content}")
            
            if mentioned_stocks:
                for stock in mentioned_stocks:
                    # 이미 분석된 종목인지 확인
                    self.cursor.execute(
                        "SELECT id FROM sentiments WHERE log_no = ? AND ticker = ?",
                        (log_no, stock['ticker'])
                    )
                    if self.cursor.fetchone():
                        continue
                    
                    # 감정 분석 수행
                    analysis = self.analyze_sentiment(
                        stock['ticker'],
                        stock['name'],
                        title,
                        content
                    )
                    
                    # DB 저장
                    if self.save_to_db(log_no, stock['ticker'], analysis):
                        total_analyses += 1
                        print(f"  - {stock['ticker']}: {analysis['sentiment']} ({analysis['sentiment_score']})")
        
        self.conn.commit()
        print(f"\nAnalysis complete: Total {total_analyses} saved")
        
    def close(self):
        """DB 연결 종료"""
        self.conn.close()

if __name__ == "__main__":
    analyzer = DirectClaudeAnalyzer()
    try:
        analyzer.analyze_all_posts()
    finally:
        analyzer.close()