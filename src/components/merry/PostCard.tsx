'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, User, Tag, Eye, MessageSquare, Heart, Share2, 
  Clock, TrendingUp, BarChart3, Zap, Target
} from 'lucide-react';
import Link from 'next/link';

interface MerryBlogPost {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  stockTickers: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
  featured: boolean;
  readingTime: number;
  publishedAt: string;
}

interface PostCardProps {
  post: MerryBlogPost;
  featured?: boolean;
  compact?: boolean;
}

export function PostCard({ post, featured = false, compact = false }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '오늘';
    if (diffDays === 2) return '어제';
    if (diffDays <= 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      default: return '📊';
    }
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return { text: '높음', color: 'text-green-600', icon: '🎯' };
    if (confidence >= 0.6) return { text: '보통', color: 'text-yellow-600', icon: '⚡' };
    return { text: '낮음', color: 'text-gray-600', icon: '📍' };
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: `/merry/posts/${post.id}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/merry/posts/${post.id}`);
    }
  };

  const confidenceInfo = getConfidenceLevel(post.confidence);

  return (
    <Card className={`group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
      featured ? 'ring-2 ring-yellow-200 shadow-lg' : ''
    } ${compact ? 'h-auto' : 'h-full'}`}>
      <CardHeader className="pb-3">
        {/* Badges Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="font-medium">
              {post.category}
            </Badge>
            {(post.featured || featured) && (
              <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50">
                <Zap size={12} className="mr-1" />
                추천
              </Badge>
            )}
            <Badge className={`${getSentimentColor(post.sentiment)} border text-xs`}>
              {getSentimentIcon(post.sentiment)} {post.sentiment}
            </Badge>
          </div>
          
          <Badge variant="outline" className={`${confidenceInfo.color} border-0 bg-gray-50 text-xs`}>
            {confidenceInfo.icon} {confidenceInfo.text}
          </Badge>
        </div>

        {/* Title */}
        <CardTitle className={`group-hover:text-blue-600 transition-colors leading-tight ${
          compact ? 'text-lg' : 'text-xl'
        }`}>
          <Link href={`/merry/posts/${post.id}`} className="line-clamp-2">
            {post.title}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Excerpt */}
        <p className={`text-gray-600 line-clamp-3 ${compact ? 'text-sm' : ''}`}>
          {post.excerpt}
        </p>

        {/* Stock Tickers */}
        {post.stockTickers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.stockTickers.slice(0, 3).map((ticker) => (
              <Link key={ticker} href={`/merry/stocks/${ticker}`}>
                <Badge 
                  variant="outline" 
                  className="text-xs hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <TrendingUp size={10} className="mr-1" />
                  {ticker}
                </Badge>
              </Link>
            ))}
            {post.stockTickers.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{post.stockTickers.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Tags */}
        {!compact && (() => {
          let tagsArray: string[] = [];
          
          try {
            if (post.tags) {
              if (typeof post.tags === 'string') {
                // JSON 문자열 파싱 시도
                try {
                  const parsed = JSON.parse(post.tags);
                  if (Array.isArray(parsed)) {
                    tagsArray = parsed.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
                  }
                } catch (parseError) {
                  console.warn(`Failed to parse tags for post ${post.id}:`, parseError);
                  tagsArray = [];
                }
              } else if (Array.isArray(post.tags)) {
                // 이미 배열인 경우
                tagsArray = post.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
              }
            }
          } catch (error) {
            console.error(`Tag processing error for post ${post.id}:`, error);
            tagsArray = [];
          }
          
          // 최종 안전성 검증
          if (!Array.isArray(tagsArray)) {
            tagsArray = [];
          }
          
          return tagsArray.length > 0;
        })() && (
          <div className="flex flex-wrap gap-1">
            {(() => {
              let tagsArray: string[] = [];
              
              try {
                if (post.tags) {
                  if (typeof post.tags === 'string') {
                    // JSON 문자열 파싱 시도
                    try {
                      const parsed = JSON.parse(post.tags);
                      if (Array.isArray(parsed)) {
                        tagsArray = parsed.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
                      }
                    } catch (parseError) {
                      console.warn(`Failed to parse tags for post ${post.id}:`, parseError);
                      tagsArray = [];
                    }
                  } else if (Array.isArray(post.tags)) {
                    // 이미 배열인 경우
                    tagsArray = post.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
                  }
                }
              } catch (error) {
                console.error(`Tag processing error for post ${post.id}:`, error);
                tagsArray = [];
              }
              
              // 최종 안전성 검증
              if (!Array.isArray(tagsArray)) {
                tagsArray = [];
              }
              
              return (
                <>
                  {tagsArray.slice(0, 4).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      <Tag size={10} className="mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {tagsArray.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{tagsArray.length - 4}
                    </Badge>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Keywords Preview */}
        {!compact && post.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.keywords.slice(0, 3).map((keyword, index) => (
              <span key={index} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* Meta Information */}
        <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <User size={14} />
            {post.author}
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            {formatDate(post.publishedAt)}
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            {post.readingTime}분
          </div>
        </div>

        {/* Stats and Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Eye size={14} />
              {post.views.toLocaleString()}
            </div>
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${
                isLiked ? 'text-red-500' : 'hover:text-red-500'
              }`}
            >
              <Heart size={14} className={isLiked ? "fill-current" : ""} />
              {likeCount}
            </button>
            <div className="flex items-center gap-1">
              <MessageSquare size={14} />
              {post.comments}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleShare}
              className="h-8 w-8 p-0"
            >
              <Share2 size={14} />
            </Button>
            <Link href={`/merry/posts/${post.id}`}>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                읽기
              </Button>
            </Link>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>분석 신뢰도</span>
            <span>{Math.round(post.confidence * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                post.confidence >= 0.8 ? 'bg-green-500' :
                post.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-gray-400'
              }`}
              style={{ width: `${post.confidence * 100}%` }}
            />
          </div>
        </div>
      </CardContent>

      {/* Hover Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
    </Card>
  );
}