'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, User, Eye, ArrowLeft, Clock, TrendingUp, 
  FileText, MessageSquare, Heart, Share2
} from 'lucide-react';
import Link from 'next/link';

interface PostAnalysis {
  summary?: string;          // 핵심 한줄 요약
  explanation?: string;      // 코멘트 풀이
  investment_insight?: string; // 투자 인사이트
  analyzed_at?: string;
}

interface PostData {
  log_no: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  created_date: string;
  views: number;
  category: string;
  tags?: string[];
  mentionedStocks?: string[];
  investmentTheme?: string;
  sentimentTone?: string;
  analysis?: PostAnalysis;  // Claude 분석 데이터
}

export default function MerryPostPage() {
  const params = useParams();
  const postId = params?.['id'] as string;
  
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/merry/${postId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setPost({
          log_no: result.data.id || postId,
          title: result.data.title,
          content: result.data.content,
          excerpt: result.data.excerpt,
          author: result.data.author || '메르',
          created_date: result.data.createdAt || new Date(result.data.created_date).toISOString(),
          views: result.data.views || 0,
          category: result.data.category || '투자분석',
          tags: result.data.tags || [],
          mentionedStocks: result.data.mentionedStocks || [],
          investmentTheme: result.data.investmentTheme || '',
          sentimentTone: result.data.sentimentTone || '',
          analysis: result.data.analysis // Claude 분석 데이터 추가
        });
      } else {
        setError(result.error?.message || '포스트를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('포스트 로딩 오류:', err);
      setError('포스트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatContent = (content: string) => {
    if (!content) return '';
    
    return content
      .replace(/\\n/g, '\n')
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
  };

  const extractSummaryAndContent = (content: string) => {
    let summary = '';
    let mainContent = content;
    
    // 메르님 한 줄 요약 추출
    const summaryMatch = content.match(/📝\s*\*\*메르님 한 줄 요약\*\*:\s*(.*?)(?=\n\n|$)/s);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
      mainContent = content.replace(/📝\s*\*\*메르님 한 줄 요약\*\*:.*?(?=\n\n|$)/s, '').trim();
    }
    
    // 한줄 코멘트 추출
    const commentMatch = content.match(/한줄\s*코멘트\s*\n+(.+)$/s);
    if (commentMatch && !summary) {
      summary = commentMatch[1].trim();
      mainContent = content.replace(/\n+한줄\s*코멘트\s*\n+.+$/s, '').trim();
    }
    
    // 시작 부분 정리
    mainContent = mainContent.replace(/^---\s*\n+/, '').trim();
    
    return { summary, content: mainContent };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">포스트를 찾을 수 없습니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{error || '요청하신 포스트가 존재하지 않거나 삭제되었습니다.'}</p>
        <Link href="/merry">
          <Button>
            <ArrowLeft className="mr-2" size={16} />
            전체 포스트로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const { summary, content } = extractSummaryAndContent(post.content);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/merry">
          <Button variant="outline">
            <ArrowLeft className="mr-2" size={16} />
            전체 포스트로
          </Button>
        </Link>
      </div>

      {/* Post Content */}
      <article className="mb-12">
        <header className="mb-8">
          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            {post.mentionedStocks && post.mentionedStocks.length > 0 && (
              post.mentionedStocks.map(ticker => (
                <Badge key={ticker} variant="outline" className="text-blue-600">
                  <TrendingUp size={12} className="mr-1" />
                  {ticker}
                </Badge>
              ))
            )}
          </div>
          
          {/* Title */}
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>
          
          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-1">
              <User size={16} />
              {post.author}
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              {formatDate(post.created_date)}
            </div>
            <div className="flex items-center gap-1">
              <Eye size={16} />
              조회 {post.views.toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              약 3분 읽기
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-sm">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* 메르님 한 줄 코멘트 - 항상 표시 (summary가 있을 때) */}
        {summary && (
          <div className="mb-8 relative overflow-hidden">
            {/* 무채색 배경 그라데이션 */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 via-slate-100/30 to-gray-100/50 dark:from-gray-900/30 dark:via-slate-900/20 dark:to-gray-900/30 rounded-2xl" />
            
            {/* 메인 카드 */}
            <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-6">
              {/* 헤더 섹션 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  {/* 아이콘 배경 - 차콜 그레이 그라데이션 */}
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 rounded-xl flex items-center justify-center shadow-lg border">
                    <span className="text-white text-lg">💡</span>
                  </div>
                </div>
                <div className="flex-1">
                  {/* 제목 - 차콜 그레이 그라데이션 텍스트 */}
                  <h3 className="text-lg font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
                    메르님 한 줄 코멘트
                  </h3>
                </div>
              </div>
              
              {/* 코멘트 내용 */}
              <div className="relative">
                {/* 좌측 액센트 라인 - 그레이 그라데이션 */}
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-600 rounded-full" />
                <blockquote className="pl-6 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <div className="text-base font-medium" dangerouslySetInnerHTML={{ __html: formatContent(summary) }} />
                </blockquote>
              </div>
            </div>
          </div>
        )}

        {/* 📝 코멘트 풀이 - 분석 데이터가 있을 때만 표시 */}
        {post.analysis?.explanation && (
          <div className="bg-card rounded-xl p-5 border mb-8">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <span>📝</span>
              <span>코멘트 풀이</span>
            </h3>
            <p 
              className="text-base text-foreground leading-relaxed break-keep"
              dangerouslySetInnerHTML={{ 
                __html: formatContent(post.analysis.explanation)
              }}
            />
          </div>
        )}

        {/* 💡 핵심 한줄 요약 - 분석 데이터가 있을 때만 표시 */}
        {post.analysis?.summary && (
          <div className="bg-card rounded-xl p-5 border mb-8">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <span>💡</span>
              <span>핵심 한줄 요약</span>
            </h3>
            <p className="text-base lg:text-lg leading-relaxed text-foreground font-medium break-keep">
              "{post.analysis.summary}"
            </p>
          </div>
        )}

        {/* 🎯 투자 인사이트 - 분석 데이터가 있을 때만 표시 */}
        {post.analysis?.investment_insight && (
          <div className="bg-card rounded-xl p-5 border mb-8">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>🎯 투자 인사이트</span>
            </h3>
            <p className="text-base text-foreground leading-relaxed break-keep">
              {post.analysis.investment_insight}
            </p>
          </div>
        )}

        <Separator className="my-8" />

        {/* Main Content */}
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <div className="bg-card rounded-xl p-6 border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              본문
            </h3>
            <div 
              className="text-base text-foreground leading-relaxed break-keep"
              dangerouslySetInnerHTML={{ __html: formatContent(content) }}
            />
          </div>
        </div>

        <Separator className="my-8" />

        {/* Actions */}
        <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Heart size={16} />
              좋아요
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare size={16} />
              댓글
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: post.title,
                  text: post.excerpt,
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('링크가 클립보드에 복사되었습니다!');
              }
            }}
          >
            <Share2 size={16} className="mr-2" />
            공유하기
          </Button>
        </div>
      </article>

      {/* Back to List */}
      <div className="text-center">
        <Link href="/merry">
          <Button variant="outline" size="lg">
            <ArrowLeft className="mr-2" size={16} />
            메르의 다른 글 보러가기
          </Button>
        </Link>
      </div>
    </div>
  );
}