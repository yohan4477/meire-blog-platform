'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Calendar, Eye, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface NavigationPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  publishedAt?: string;
  views?: number;
  featured?: boolean;
}

interface PostNavigationProps {
  prevPost?: NavigationPost | null;
  nextPost?: NavigationPost | null;
  className?: string;
}

export function PostNavigation({ prevPost, nextPost, className = '' }: PostNavigationProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (!prevPost && !nextPost) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🧭 포스트 네비게이션</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Previous Post */}
        <div className="flex">
          {prevPost ? (
            <Link href={`/merry/posts/${prevPost.id}`} className="w-full">
              <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 h-full">
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <ArrowLeft size={16} className="text-blue-500" />
                    <span className="font-medium">이전 포스트</span>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                      {prevPost.title}
                    </h4>
                    
                    {prevPost.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {prevPost.excerpt}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {prevPost.category && (
                          <Badge variant="secondary" className="text-xs">
                            {prevPost.category}
                          </Badge>
                        )}
                        {prevPost.featured && (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            ✨
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {prevPost.publishedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(prevPost.publishedAt)}
                          </div>
                        )}
                        {prevPost.views && (
                          <div className="flex items-center gap-1">
                            <Eye size={12} />
                            {prevPost.views.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <ArrowLeft size={14} className="mr-1" />
                      이전 글 읽기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="w-full opacity-50">
              <CardContent className="p-4 text-center">
                <div className="text-gray-400 mb-2">
                  <ArrowLeft size={24} className="mx-auto mb-2" />
                </div>
                <p className="text-sm text-gray-500">이전 포스트가 없습니다</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Next Post */}
        <div className="flex">
          {nextPost ? (
            <Link href={`/merry/posts/${nextPost.id}`} className="w-full">
              <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 h-full">
                <CardContent className="p-4 h-full flex flex-col text-right">
                  <div className="flex items-center justify-end gap-2 text-sm text-gray-500 mb-3">
                    <span className="font-medium">다음 포스트</span>
                    <ArrowRight size={16} className="text-blue-500" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                      {nextPost.title}
                    </h4>
                    
                    {nextPost.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {nextPost.excerpt}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {nextPost.publishedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(nextPost.publishedAt)}
                          </div>
                        )}
                        {nextPost.views && (
                          <div className="flex items-center gap-1">
                            <Eye size={12} />
                            {nextPost.views.toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {nextPost.featured && (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            ✨
                          </Badge>
                        )}
                        {nextPost.category && (
                          <Badge variant="secondary" className="text-xs">
                            {nextPost.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      다음 글 읽기
                      <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="w-full opacity-50">
              <CardContent className="p-4 text-center">
                <div className="text-gray-400 mb-2">
                  <ArrowRight size={24} className="mx-auto mb-2" />
                </div>
                <p className="text-sm text-gray-500">다음 포스트가 없습니다</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
        <Link href="/merry">
          <Button variant="outline" size="sm">
            <TrendingUp size={14} className="mr-1" />
            전체 포스트 보기
          </Button>
        </Link>
        
        <Link href="/merry?featured=true">
          <Button variant="outline" size="sm">
            ✨ 추천 포스트
          </Button>
        </Link>
      </div>
    </div>
  );
}