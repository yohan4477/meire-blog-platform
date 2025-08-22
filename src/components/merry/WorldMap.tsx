'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * 세계 지도 컴포넌트 - 지정학적 이벤트 표시
 * CLAUDE.md 준수: 실제 데이터만 사용, 더미 데이터 금지
 */

interface GeopoliticalEvent {
  id: string;
  country: string;
  region: string;
  title: string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  date: string;
  description: string;
  relatedStocks: string[];
  coordinates?: [number, number];
}

interface WorldMapProps {
  events?: GeopoliticalEvent[];
  className?: string;
}

export default function WorldMap({ events = [], className = '' }: WorldMapProps) {
  // 실제 데이터에서 파싱된 지정학적 이벤트들
  const realEvents: GeopoliticalEvent[] = events.length > 0 ? events : [
    // 실제 데이터가 없을 때는 "정보 없음" 표시
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <TrendingUp className="h-4 w-4" />;
      case 'negative': return <TrendingDown className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '미정';
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            🌍 세계 지정학적 이벤트
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          실시간 업데이트
        </Badge>
      </div>

      {realEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="h-12 w-12 text-gray-300 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            지정학적 이벤트 정보 없음
          </h4>
          <p className="text-sm text-gray-600">
            현재 분석된 지정학적 이벤트 데이터가 없습니다.<br />
            새로운 포스트가 분석되면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {realEvents.map((event) => (
            <div
              key={event.id}
              className={`p-4 rounded-lg border ${getImpactColor(event.impact)} transition-all hover:shadow-sm`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getImpactIcon(event.impact)}
                  <h4 className="font-medium text-sm">
                    {event.country} - {event.region}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    심각도: {getSeverityText(event.severity)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(event.date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
              
              <h5 className="font-medium text-gray-900 mb-2">
                {event.title}
              </h5>
              
              <p className="text-sm text-gray-700 mb-3">
                {event.description}
              </p>
              
              {event.relatedStocks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">
                    관련 종목:
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {event.relatedStocks.map((ticker, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {ticker}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 범례 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span>긍정적 영향</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-600" />
              <span>부정적 영향</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-blue-600" />
              <span>중립적 영향</span>
            </div>
          </div>
          <span className="text-gray-500">
            📊 메르 블로그 분석 기반
          </span>
        </div>
      </div>
    </Card>
  );
}