/**
 * 포스트 내용에서 종목별 감정 분석을 수행하는 유틸리티
 * 실제 구현에서는 OpenAI API나 다른 NLP 서비스를 사용할 수 있음
 */

export type Sentiment = 'positive' | 'negative' | 'neutral';

interface SentimentAnalysisResult {
  sentiment: Sentiment;
  confidence: number;
  keywords: string[];
}

// 긍정적 키워드들
const POSITIVE_KEYWORDS = [
  '상승', '증가', '성장', '호재', '긍정적', '좋은', '성공', '수주', '계약', '투자',
  '확대', '개선', '향상', '발전', '혁신', '돌파', '성과', '수익', '이익', '전망',
  '기대', '유망', '강세', '상향', '플러스', '긍정', '좋아', '훌륭', '우수',
  '최고', '최대', '신기록', '도약', '부상', '급등', '상승세'
];

// 부정적 키워드들
const NEGATIVE_KEYWORDS = [
  '하락', '감소', '악재', '부정적', '나쁜', '실패', '손실', '적자', '위험',
  '우려', '걱정', '문제', '어려움', '타격', '충격', '급락', '폭락', '하향',
  '마이너스', '부정', '안좋', '최악', '최저', '침체', '위기', '불안',
  '취소', '연기', '지연', '중단', '철회'
];

// 중립적 키워드들 (분석에 영향을 주지 않음)
const NEUTRAL_KEYWORDS = [
  '발표', '공개', '계획', '예정', '진행', '상황', '현재', '기존', '일반',
  '보통', '평균', '유지', '지속', '안정', '정상'
];

/**
 * 텍스트에서 감정을 분석합니다
 */
export function analyzeSentiment(
  text: string, 
  stockName: string, 
  ticker: string
): SentimentAnalysisResult {
  if (!text || text.trim().length === 0) {
    return {
      sentiment: 'neutral',
      confidence: 0,
      keywords: []
    };
  }

  const normalizedText = text.toLowerCase();
  const stockKeywords = [stockName.toLowerCase(), ticker.toLowerCase()];
  
  // 해당 종목이 언급되지 않은 경우
  const hasStockMention = stockKeywords.some(keyword => 
    normalizedText.includes(keyword)
  );
  
  if (!hasStockMention) {
    return {
      sentiment: 'neutral',
      confidence: 0,
      keywords: []
    };
  }

  let positiveScore = 0;
  let negativeScore = 0;
  const foundKeywords: string[] = [];

  // 긍정적 키워드 검색
  POSITIVE_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = normalizedText.match(regex);
    if (matches) {
      positiveScore += matches.length;
      foundKeywords.push(...matches);
    }
  });

  // 부정적 키워드 검색
  NEGATIVE_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = normalizedText.match(regex);
    if (matches) {
      negativeScore += matches.length;
      foundKeywords.push(...matches);
    }
  });

  // 감정 결정
  let sentiment: Sentiment = 'neutral';
  let confidence = 0;

  if (positiveScore > negativeScore) {
    sentiment = 'positive';
    confidence = Math.min(positiveScore / (positiveScore + negativeScore + 1), 0.9);
  } else if (negativeScore > positiveScore) {
    sentiment = 'negative';
    confidence = Math.min(negativeScore / (positiveScore + negativeScore + 1), 0.9);
  } else {
    sentiment = 'neutral';
    confidence = 0.5;
  }

  // 최소 신뢰도 적용
  if (foundKeywords.length === 0) {
    confidence = 0;
  } else if (confidence < 0.3) {
    confidence = 0.3;
  }

  return {
    sentiment,
    confidence: Math.round(confidence * 100) / 100,
    keywords: [...new Set(foundKeywords)] // 중복 제거
  };
}

/**
 * 문맥 윈도우를 이용해 종목별 독립적 감정 분석
 */
export function analyzeStockSentimentWithContext(
  text: string,
  stockName: string,
  ticker: string,
  windowSize: number = 80
): SentimentAnalysisResult {
  const keywords = [stockName.toLowerCase(), ticker.toLowerCase()];
  const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
  const contextWindows: string[] = [];

  // 종목이 언급된 문장과 그 앞뒤 문장들을 추출
  sentences.forEach((sentence, index) => {
    const normalizedSentence = sentence.toLowerCase();
    
    if (keywords.some(keyword => normalizedSentence.includes(keyword))) {
      // 현재 문장 + 전후 1문장씩 (총 3문장)
      const start = Math.max(0, index - 1);
      const end = Math.min(sentences.length, index + 2);
      const window = sentences.slice(start, end).join('. ').trim();
      contextWindows.push(window);
    }
  });

  if (contextWindows.length === 0) {
    return {
      sentiment: 'neutral',
      confidence: 0,
      keywords: []
    };
  }

  // 모든 문맥 윈도우를 결합해서 분석
  const combinedContext = contextWindows.join(' ');
  return analyzeSentiment(combinedContext, stockName, ticker);
}

/**
 * 포스트의 모든 종목 언급에 대해 개별적 감정 분석을 수행합니다 (하이브리드 방식)
 */
export function analyzePostSentiments(
  postContent: string,
  mentionedStocks: Array<{ name: string; ticker: string }>
): Record<string, SentimentAnalysisResult> {
  const results: Record<string, SentimentAnalysisResult> = {};

  mentionedStocks.forEach(stock => {
    // 문맥 윈도우 기반 분석으로 정확도 향상
    const analysis = analyzeStockSentimentWithContext(
      postContent, 
      stock.name, 
      stock.ticker
    );
    results[stock.ticker] = analysis;
  });

  return results;
}

/**
 * 감정 분석 결과를 기반으로 색상을 반환합니다
 */
export function getSentimentColor(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'positive':
      return '#10b981'; // green-500
    case 'negative':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * 감정 분석 결과를 한국어로 변환합니다
 */
export function getSentimentLabel(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'positive':
      return '긍정적';
    case 'negative':
      return '부정적';
    default:
      return '중립적';
  }
}