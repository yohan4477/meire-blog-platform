'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, Sparkles, TrendingUp } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => void;
  loading?: boolean;
  remainingCount?: number;
  disabled?: boolean;
  variant?: 'default' | 'magic' | 'minimal';
}

export function LoadMoreButton({ 
  onClick, 
  loading = false, 
  remainingCount = 0,
  disabled = false,
  variant = 'default'
}: LoadMoreButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setAnimate(true), 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loading]);

  const getButtonContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin" size={18} />
          <span>로딩 중...</span>
        </div>
      );
    }

    switch (variant) {
      case 'magic':
        return (
          <div className="flex items-center gap-2">
            <Sparkles className={`transition-transform ${isHovered ? 'rotate-12 scale-110' : ''}`} size={18} />
            <span>더 많은 포스트 보기</span>
            {remainingCount > 0 && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-sm">
                +{remainingCount}
              </span>
            )}
            <Sparkles className={`transition-transform ${isHovered ? '-rotate-12 scale-110' : ''}`} size={18} />
          </div>
        );
      
      case 'minimal':
        return (
          <div className="flex items-center gap-2">
            <span>더보기</span>
            <ChevronDown className={`transition-transform ${isHovered ? 'translate-y-1' : ''}`} size={16} />
          </div>
        );
      
      default:
        return (
          <div className="flex items-center gap-2">
            <TrendingUp className={`transition-transform ${isHovered ? 'scale-110' : ''}`} size={18} />
            <span>더 많은 포스트 로드하기</span>
            {remainingCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-medium">
                {remainingCount}개 더
              </span>
            )}
          </div>
        );
    }
  };

  const getButtonStyles = () => {
    const baseStyles = "relative overflow-hidden transition-all duration-300 transform";
    
    switch (variant) {
      case 'magic':
        return `${baseStyles} bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl ${isHovered ? 'scale-105' : ''}`;
      
      case 'minimal':
        return `${baseStyles} bg-transparent border border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50`;
      
      default:
        return `${baseStyles} bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-md hover:shadow-lg ${isHovered ? 'scale-102' : ''}`;
    }
  };

  return (
    <div className="relative">
      {/* Animated background elements for magic variant */}
      {variant === 'magic' && animate && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-purple-300 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
          <div className="absolute top-0 right-1/4 w-1 h-1 bg-pink-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-0 left-1/3 w-1.5 h-1.5 bg-blue-300 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
        </div>
      )}

      <Button
        onClick={onClick}
        disabled={disabled || loading}
        className={getButtonStyles()}
        size="lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Shine effect for magic variant */}
        {variant === 'magic' && (
          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 transition-transform duration-1000 ${
            isHovered ? 'translate-x-full' : '-translate-x-full'
          }`} />
        )}
        
        {/* Button content */}
        <div className="relative z-10">
          {getButtonContent()}
        </div>
      </Button>

      {/* Progress indicator for remaining posts */}
      {remainingCount > 0 && variant === 'default' && (
        <div className="mt-3 text-center">
          <div className="text-sm text-gray-500 mb-2">
            {remainingCount}개의 포스트가 더 있습니다
          </div>
          <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (remainingCount / 50) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Magic sparkles animation */}
      {variant === 'magic' && isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}