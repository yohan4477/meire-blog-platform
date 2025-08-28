'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'fomc' | 'boj' | 'earnings' | 'economic' | 'other';
  importance: 'high' | 'medium' | 'low';
}

// 메르 포스트 기반 주요 일정 (미장에 그날이 다가온다 포스트 반영)
const mockEvents: CalendarEvent[] = [
  // 기존 주요 일정들
  { id: '1', date: '2025-01-29', title: 'FOMC', type: 'fomc', importance: 'high' },
  { id: '2', date: '2025-01-29', title: '테슬라 실적', type: 'earnings', importance: 'high' },
  { id: '3', date: '2025-01-30', title: '애플 실적', type: 'earnings', importance: 'high' },
  { id: '4', date: '2025-01-31', title: 'PCE 발표', type: 'economic', importance: 'high' },
  { id: '5', date: '2025-02-27', title: '한은 금통위', type: 'boj', importance: 'medium' },
  { id: '6', date: '2025-03-19', title: 'BOJ 회의', type: 'boj', importance: 'high' },
  
  // 메르 포스트 "미장에 그날이 다가온다"에서 추출한 유대인 주요 일정
  { id: '7', date: '2025-08-15', title: '북클로징 시작', type: 'other', importance: 'medium' },
  { id: '8', date: '2025-09-22', title: '로쉬 하샤나 시작', type: 'other', importance: 'high' },
  { id: '9', date: '2025-09-23', title: '로쉬 하샤나', type: 'other', importance: 'high' },
  { id: '10', date: '2025-09-24', title: '로쉬 하샤나 종료', type: 'other', importance: 'high' },
  { id: '11', date: '2025-10-01', title: '욤 키푸르 시작', type: 'other', importance: 'high' },
  { id: '12', date: '2025-10-02', title: '욤 키푸르 종료', type: 'other', importance: 'high' },
  
  // 추가 중요 일정들
  { id: '13', date: '2025-08-29', title: '잭슨홀 미팅', type: 'fomc', importance: 'high' },
  { id: '14', date: '2025-09-18', title: '9월 FOMC', type: 'fomc', importance: 'high' },
  { id: '15', date: '2025-09-15', title: '법인세 납부', type: 'economic', importance: 'medium' },
];

export default function CompactCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    const startDay = start.getDay();
    const previousMonthDays = [];
    if (startDay > 0) {
      for (let i = startDay - 1; i >= 0; i--) {
        const date = new Date(start);
        date.setDate(date.getDate() - (i + 1));
        previousMonthDays.push(date);
      }
    }

    return [...previousMonthDays, ...days];
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return mockEvents.filter(event => event.date === dateStr);
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'fomc': return 'bg-red-500';
      case 'boj': return 'bg-yellow-500';
      case 'earnings': return 'bg-blue-500';
      case 'economic': return 'bg-green-500';
      case 'other': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // 연속된 이벤트를 그룹화하는 함수
  const groupConsecutiveEvents = (events: CalendarEvent[]) => {
    if (events.length <= 1) return events;

    const groups: { [key: string]: CalendarEvent[] } = {};
    
    events.forEach(event => {
      const baseTitle = event.title.replace(/\s?(시작|종료)$/, '');
      if (!groups[baseTitle]) {
        groups[baseTitle] = [];
      }
      groups[baseTitle].push(event);
    });

    // 각 그룹에서 연속된 이벤트가 있으면 하나로 합치기
    const result: CalendarEvent[] = [];
    Object.entries(groups).forEach(([baseTitle, groupEvents]) => {
      if (groupEvents.length > 1) {
        // 연속된 이벤트들을 정렬
        groupEvents.sort((a, b) => a.date.localeCompare(b.date));
        const firstEvent = groupEvents[0];
        const lastEvent = groupEvents[groupEvents.length - 1];
        
        // 첫 번째와 마지막 이벤트만 표시 (시작/종료)
        if (firstEvent && lastEvent && (firstEvent.title.includes('시작') || lastEvent.title.includes('종료'))) {
          result.push({
            ...firstEvent,
            title: baseTitle,
            id: `${firstEvent.id}-group`
          });
        } else {
          result.push(...groupEvents);
        }
      } else {
        result.push(...groupEvents);
      }
    });

    return result;
  };

  // 연속된 날짜인지 확인하는 함수
  const getEventSpan = (date: Date, event: CalendarEvent) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const eventDate = new Date(event.date);
    const currentDate = new Date(date);
    
    // 같은 이벤트 그룹의 연속된 날짜들 찾기
    const baseTitle = event.title.replace(/\s?(시작|종료)$/, '');
    const relatedEvents = mockEvents.filter(e => {
      const eBaseTitle = e.title.replace(/\s?(시작|종료)$/, '');
      return eBaseTitle === baseTitle && e.type === event.type;
    }).sort((a, b) => a.date.localeCompare(b.date));

    if (relatedEvents.length <= 1) return null;

    const firstEvent = relatedEvents[0];
    const lastEvent = relatedEvents[relatedEvents.length - 1];
    
    if (!firstEvent || !lastEvent) return null;
    
    const firstDate = new Date(firstEvent.date);
    const lastDate = new Date(lastEvent.date);
    
    // 현재 날짜가 이벤트 기간 내에 있는지 확인
    if (currentDate >= firstDate && currentDate <= lastDate) {
      const isFirst = format(currentDate, 'yyyy-MM-dd') === format(firstDate, 'yyyy-MM-dd');
      const isLast = format(currentDate, 'yyyy-MM-dd') === format(lastDate, 'yyyy-MM-dd');
      const isMiddle = !isFirst && !isLast;

      return {
        isFirst,
        isLast,
        isMiddle,
        baseTitle,
        totalDays: Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      };
    }

    return null;
  };

  return (
    <div className="bg-card rounded-lg p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          >
            오늘
          </button>
          <button
            onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div
            key={day}
            className={`text-center text-xs font-medium p-1 ${
              idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-muted-foreground'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-0.5 overflow-visible">
        {calendarDays.map((day, idx) => {
          const events = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          
          return (
            <div
              key={idx}
              className={`
                min-h-[60px] p-1 border rounded text-xs overflow-visible
                ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                ${isCurrentDay ? 'border-primary border-2' : 'border-border'}
                hover:bg-muted/50 transition-colors cursor-pointer
              `}
            >
              <div className={`
                font-medium mb-1
                ${!isCurrentMonth ? 'text-muted-foreground' : 
                  day.getDay() === 0 ? 'text-red-500' : 
                  day.getDay() === 6 ? 'text-blue-500' : 
                  'text-foreground'}
              `}>
                {format(day, 'd')}
              </div>
              
              {/* 이벤트 표시 (최대 2개) */}
              <div className="space-y-0.5">
                {events.slice(0, 2).map(event => {
                  const span = getEventSpan(day, event);
                  
                  if (span) {
                    // 연속된 이벤트의 경우 - 완전한 연결선 구현
                    let displayTitle = span.baseTitle;
                    let bgClass = getEventColor(event.type);
                    
                    if (span.isFirst && span.isLast) {
                      // 하루짜리 이벤트
                      displayTitle = span.baseTitle;
                      return (
                        <div
                          key={event.id}
                          className={`${bgClass} text-white px-1 py-0.5 rounded text-[10px] truncate h-4 flex items-center justify-center relative`}
                          title={`${span.baseTitle} (${span.totalDays}일간)`}
                        >
                          <span className="truncate">{displayTitle}</span>
                        </div>
                      );
                    } else if (span.isFirst) {
                      // 시작일 - 실제로 다음 칸까지 연결되는 선
                      displayTitle = span.baseTitle;
                      return (
                        <div
                          key={event.id}
                          className={`${bgClass} text-white px-1 py-0.5 rounded-l text-[10px] truncate h-4 flex items-center justify-center relative`}
                          title={`${span.baseTitle} (${span.totalDays}일간)`}
                          style={{
                            position: 'relative',
                            zIndex: 10,
                            marginRight: '-6px',
                            paddingRight: '10px'
                          }}
                        >
                          <span className="truncate">{displayTitle}</span>
                          {/* 다음 칸으로 연결하는 선 */}
                          <div 
                            className={`absolute top-0 right-0 h-full ${bgClass.replace('bg-', 'bg-')}`}
                            style={{
                              width: '8px',
                              transform: 'translateX(100%)',
                              zIndex: 9
                            }}
                          ></div>
                        </div>
                      );
                    } else if (span.isLast) {
                      // 종료일 - 이전 칸에서 연결되어 오는 선
                      displayTitle = span.baseTitle;
                      return (
                        <div
                          key={event.id}
                          className={`${bgClass} text-white px-1 py-0.5 rounded-r text-[10px] truncate h-4 flex items-center justify-center relative`}
                          title={`${span.baseTitle} (${span.totalDays}일간)`}
                          style={{
                            position: 'relative',
                            zIndex: 10,
                            marginLeft: '-6px',
                            paddingLeft: '10px'
                          }}
                        >
                          <span className="truncate">{displayTitle}</span>
                          {/* 이전 칸에서 연결되어 오는 선 */}
                          <div 
                            className={`absolute top-0 left-0 h-full ${bgClass.replace('bg-', 'bg-')}`}
                            style={{
                              width: '8px',
                              transform: 'translateX(-100%)',
                              zIndex: 9
                            }}
                          ></div>
                        </div>
                      );
                    } else {
                      // 중간일 - 양쪽에서 연결되는 완전한 선
                      return (
                        <div
                          key={event.id}
                          className={`${bgClass} text-white px-1 py-0.5 text-[10px] h-4 flex items-center justify-center relative`}
                          title={`${span.baseTitle} (${span.totalDays}일간)`}
                          style={{
                            position: 'relative',
                            zIndex: 10,
                            marginLeft: '-6px',
                            marginRight: '-6px',
                            paddingLeft: '10px',
                            paddingRight: '10px'
                          }}
                        >
                          <div className="w-1 h-1 bg-white rounded-full"></div>
                          {/* 왼쪽 연결선 */}
                          <div 
                            className={`absolute top-0 left-0 h-full ${bgClass.replace('bg-', 'bg-')}`}
                            style={{
                              width: '8px',
                              transform: 'translateX(-100%)',
                              zIndex: 9
                            }}
                          ></div>
                          {/* 오른쪽 연결선 */}
                          <div 
                            className={`absolute top-0 right-0 h-full ${bgClass.replace('bg-', 'bg-')}`}
                            style={{
                              width: '8px',
                              transform: 'translateX(100%)',
                              zIndex: 9
                            }}
                          ></div>
                        </div>
                      );
                    }
                  } else {
                    // 일반 이벤트
                    return (
                      <div
                        key={event.id}
                        className={`${getEventColor(event.type)} text-white px-1 py-0.5 rounded text-[10px] truncate h-4 flex items-center justify-center`}
                        title={event.title}
                      >
                        <span className="truncate">{event.title}</span>
                      </div>
                    );
                  }
                })}
                {events.length > 2 && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    +{events.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded"></div>
          <span className="text-muted-foreground">FOMC</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded"></div>
          <span className="text-muted-foreground">중앙은행</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded"></div>
          <span className="text-muted-foreground">실적</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded"></div>
          <span className="text-muted-foreground">경제지표</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-purple-500 rounded"></div>
          <span className="text-muted-foreground">유대인 일정</span>
        </div>
      </div>
    </div>
  );
}