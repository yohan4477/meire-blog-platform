import React from 'react';

interface StockTagsProps {
  tags: string[] | string;
  className?: string;
  maxTags?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function StockTags({ tags, className = '', maxTags = 6, size = 'md' }: StockTagsProps) {
  // tags가 문자열인 경우 JSON 파싱 시도
  let parsedTags: string[] = [];
  
  try {
    if (typeof tags === 'string') {
      parsedTags = JSON.parse(tags);
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
    }
  } catch (error) {
    console.warn('Failed to parse tags:', error);
    parsedTags = [];
  }

  if (!parsedTags || parsedTags.length === 0) {
    return null;
  }

  // 표시할 태그 개수 제한
  const displayTags = parsedTags.slice(0, maxTags);
  const remainingCount = parsedTags.length - displayTags.length;

  // 크기별 스타일
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  // 태그 색상 매핑 (다크모드 대응)
  const getTagColor = (tag: string): string => {
    // 다크모드 대응 회색 태그
    return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700';
  };

  return (
    <div className={`flex flex-wrap gap-1.5 items-center ${className}`}>
      {displayTags.map((tag, index) => (
        <span
          key={index}
          className={`
            inline-flex items-center rounded-full border font-medium
            transition-colors duration-200 cursor-default
            ${sizeClasses[size]}
            ${getTagColor(tag)}
          `}
          title={tag}
        >
          {tag}
        </span>
      ))}
      
      {remainingCount > 0 && (
        <span
          className={`
            inline-flex items-center rounded-full border font-medium
            bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600
            ${sizeClasses[size]}
          `}
          title={`${remainingCount}개 태그 더 있음`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

export default StockTags;