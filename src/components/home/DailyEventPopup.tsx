'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Gift, Sparkles, MessageCircle } from 'lucide-react';

// 🎭 일일 이벤트 명언 시스템 - 슬라이드 캐러셀
const DAILY_QUOTES = [
  {
    id: 'yeoviking-insight',
    author: '여비킹',
    quote: '메르는 행간을 읽을 줄 알고, 민중은 현재만 본다.',
    theme: '통찰력',
    color: 'from-blue-500 to-purple-600',
    icon: '🧠'
  },
  {
    id: 'merry-daughter-dream',
    author: '메르 딸',
    quote: '아버지, 집을 사고 싶어요.',
    theme: '꿈과 목표',
    color: 'from-pink-500 to-rose-600',
    icon: '🏠'
  },
  {
    id: 'hyobeombao-praise',
    author: '효범바오',
    quote: '와 형 지린다.',
    theme: '감탄',
    color: 'from-green-500 to-emerald-600',
    icon: '🔥'
  }
];

// 🔒 오늘 그만 보기 상태 관리
function getDismissalKey() {
  const today = new Date().toISOString().split('T')[0];
  return `daily-event-dismissed-${today}`;
}

function isDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  const key = getDismissalKey();
  return localStorage.getItem(key) === 'true';
}

function dismissForToday() {
  if (typeof window === 'undefined') return;
  const key = getDismissalKey();
  localStorage.setItem(key, 'true');
}

export function DailyEventPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  // 🎬 초기 로딩 및 표시 로직
  useEffect(() => {
    // 오늘 이미 닫았는지 확인
    if (isDismissedToday()) {
      return;
    }

    // 1초 후에 팝업 표시 (페이지 로딩 완료 후)
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 1000);

    return () => clearTimeout(showTimer);
  }, []);

  // 🔄 3초마다 다음 메시지로 슬라이드 (위로 넘어가는 효과)
  useEffect(() => {
    if (!isVisible || !isAnimating) return;

    const slideTimer = setInterval(() => {
      setIsSliding(true);
      
      // 150ms 후 다음 인덱스로 변경 (슬라이드 중간 시점)
      setTimeout(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % DAILY_QUOTES.length);
        setIsSliding(false);
      }, 150);
    }, 4000); // 4초마다 변경

    return () => clearInterval(slideTimer);
  }, [isVisible, isAnimating]);

  // ❌ 팝업 닫기 함수
  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
    }, 300); // 애니메이션 완료 후 숨김
  };

  // 📅 오늘 그만 보기 함수
  const handleDismissToday = () => {
    dismissForToday();
    handleClose();
  };

  // 🚫 오늘 이미 닫았거나 표시하지 않는 경우
  if (!isVisible) return null;

  return (
    <>
      {/* 🌫️ 배경 오버레이 */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* 🎉 일일 이벤트 팝업 - 슬라이드 캐러셀 */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <Card className={`relative w-full max-w-md mx-auto bg-gradient-to-br ${DAILY_QUOTES[currentQuoteIndex].color} text-white shadow-2xl border-0 transition-all duration-500`}>
          {/* ✨ 배경 장식 */}
          <div className="absolute inset-0 bg-white/10 rounded-lg backdrop-blur-sm" />
          <div className="absolute top-2 right-2 text-white/30">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="absolute bottom-2 left-2 text-white/20">
            <Gift className="w-6 h-6" />
          </div>
          
          {/* 🎯 컨텐츠 - 슬라이드 효과 */}
          <div className="relative z-10 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-3xl transition-all duration-300 ${isSliding ? 'transform -translate-y-2 opacity-50' : 'transform translate-y-0 opacity-100'}`}>
                    {DAILY_QUOTES[currentQuoteIndex].icon}
                  </div>
                  <div className={`transition-all duration-300 ${isSliding ? 'transform -translate-y-2 opacity-50' : 'transform translate-y-0 opacity-100'}`}>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30 mb-1">
                      📅 오늘의 이벤트
                    </Badge>
                    <CardTitle className="text-xl font-bold text-white">
                      {DAILY_QUOTES[currentQuoteIndex].theme} • {DAILY_QUOTES[currentQuoteIndex].author}
                    </CardTitle>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClose}
                  className="text-white/80 hover:text-white hover:bg-white/20 -mt-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* 💬 슬라이드되는 명언 섹션 */}
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm relative">
                <div className={`flex items-start gap-3 transition-all duration-300 ${isSliding ? 'transform -translate-y-4 opacity-0' : 'transform translate-y-0 opacity-100'}`}>
                  <MessageCircle className="w-5 h-5 text-white/80 mt-1 flex-shrink-0" />
                  <blockquote className="text-lg font-medium leading-relaxed text-white">
                    "{DAILY_QUOTES[currentQuoteIndex].quote}"
                  </blockquote>
                </div>
                <div className={`text-right mt-3 text-white/80 text-sm transition-all duration-300 ${isSliding ? 'transform -translate-y-2 opacity-0' : 'transform translate-y-0 opacity-100'}`}>
                  — {DAILY_QUOTES[currentQuoteIndex].author}
                </div>
              </div>
              
              {/* 📊 페이지 인디케이터 - 3개 점 */}
              <div className="flex justify-center space-x-2 py-2">
                {DAILY_QUOTES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setIsSliding(true);
                      setTimeout(() => {
                        setCurrentQuoteIndex(index);
                        setIsSliding(false);
                      }, 150);
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentQuoteIndex 
                        ? 'bg-white scale-125' 
                        : 'bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`${DAILY_QUOTES[index].author} 메시지로 이동`}
                  />
                ))}
              </div>

              {/* 🎁 이벤트 안내 */}
              <div className="text-center space-y-3">
                <p className="text-white/90 text-sm leading-relaxed">
                  매일 새로운 투자 인사이트와 함께<br />
                  요르의 투자 플랫폼에서 성장하세요! 🚀
                </p>
                
                {/* 🔘 액션 버튼들 */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleDismissToday}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs"
                  >
                    📅 오늘 그만 보기
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleClose}
                    className="flex-1 bg-white text-gray-800 hover:bg-gray-100 text-xs font-medium"
                  >
                    ✨ 투자 시작하기
                  </Button>
                </div>

                {/* 💌 요르에게 메시지 남기기 안내 */}
                <div className="mt-3 pt-2 border-t border-white/20">
                  <p className="text-white/60 text-xs text-center">
                    요르에게 톡으로 원하시는 멘트를 남기세요
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </>
  );
}