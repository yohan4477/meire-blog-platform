'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, User, Tag, Eye, MessageSquare, Heart, Share2, 
  ArrowLeft, ArrowRight, Clock, TrendingUp, BarChart3 
} from 'lucide-react';
import Link from 'next/link';
import { mcp__time__get_current_time } from '@/lib/mcp/simple-mcp';

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
  relatedStocks: string[];
  publishedAt: string;
}

interface NavigationPost {
  id: number;
  title: string;
  slug: string;
}

interface PostAnalysis {
  summary?: string;           // 한줄 정리 (메르님 말씀용)
  explanation?: string;       // 설명 (독자 이해용)
  investment_insight?: string; // 투자 인사이트
  analyzed_at?: string;       // 분석 일시
}

interface PostData {
  log_no: number;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  created_date: number;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  mentionedStocks?: string[];
  investmentTheme?: string;
  sentimentTone?: string;
  
  // 🆕 Claude 직접 분석 결과
  analysis?: PostAnalysis;
  
  // 기존 데이터 유지 (호환성)
  post: MerryBlogPost;
  relatedPosts: MerryBlogPost[];
  navigation: {
    prev: NavigationPost | null;
    next: NavigationPost | null;
  };
}

export default function MerryPostDetailPage() {
  const params = useParams();
  const postId = params['id'] as string;
  
  const [postData, setPostData] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    fetchPostData();
    fetchCurrentTime();
  }, [postId]);

  const fetchPostData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/merry/posts/${postId}`);
      const result = await response.json();

      if (result.success) {
        setPostData(result.data);
      } else {
        console.error('포스트 로드 실패:', result.error);
      }
    } catch (error) {
      console.error('포스트 데이터 가져오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentTime = async () => {
    try {
      const time = await mcp__time__get_current_time({ timezone: 'Asia/Seoul' });
      setCurrentTime(time.datetime);
    } catch (error) {
      console.error('현재 시간 가져오기 실패:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30';
      case 'negative': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800/50';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      default: return '📊';
    }
  };

  const handleLike = async () => {
    if (postData) {
      setPostData({
        ...postData,
        post: {
          ...postData.post,
          likes: liked ? postData.post.likes - 1 : postData.post.likes + 1
        }
      });
      setLiked(!liked);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: postData?.post.title || '메르 포스트',
          text: postData?.post.excerpt || '메르의 투자 인사이트',
          url: window.location.href
        });
      } catch (error) {
        console.log('공유 취소됨');
      }
    } else {
      // fallback: 클립보드에 복사
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다!');
    }
  };

  // 메르님 한 줄 요약 또는 한줄 코멘트를 파싱하고 스타일링하는 함수
  const parseContentWithSummary = (content: string) => {
    let processedContent = content;
    let hasSummary = false;
    let summary = '';
    let summaryType = null;
    
    // 1. 메르님 한 줄 요약 패턴 감지 및 본문에서 제거
    const summaryMatch = content.match(/📝\s*\*\*메르님 한 줄 요약\*\*:\s*(.*?)(?=\n\n---|\n\n|$)/s);
    
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
      // 본문에서 메르님 한 줄 요약 섹션 완전 제거
      processedContent = content.replace(/📝\s*\*\*메르님 한 줄 요약\*\*:.*?(?=\n\n---|\n\n|$)/s, '').replace(/^---\n\n/, '').trim();
      hasSummary = true;
      summaryType = 'summary';
    } else {
      // 2. 한줄 코멘트 패턴 감지 및 본문에서 제거
      const commentMatch = content.match(/한줄\s*코멘트\s*\n+(.+)$/s);
      
      if (commentMatch) {
        summary = commentMatch[1].trim();
        // 본문에서 한줄 코멘트 섹션 완전 제거
        processedContent = content.replace(/\n+한줄\s*코멘트\s*\n+.+$/s, '').trim();
        hasSummary = true;
        summaryType = 'comment';
      }
    }
    
    // 3. "메르님 한 줄 요약" 텍스트로 시작하는 경우 제거
    if (processedContent.startsWith('메르님 한 줄 요약')) {
      processedContent = processedContent.replace(/^메르님 한 줄 요약\s*\n*/, '').trim();
    }
    
    return {
      hasSummary,
      summary,
      content: processedContent, // 요약/코멘트가 제거된 본문
      summaryType
    };
  };

  const { hasSummary, summary, content, summaryType } = postData ? parseContentWithSummary(postData.post.content) : { hasSummary: false, summary: '', content: '', summaryType: null };

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
              <Skeleton key={`skeleton-${i}`} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!postData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">포스트를 찾을 수 없습니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">요청하신 포스트가 존재하지 않거나 삭제되었습니다.</p>
        <Link href="/merry">
          <Button>
            <ArrowLeft className="mr-2" size={16} />
            메르 홈으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const { post, relatedPosts, navigation } = postData;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/merry">
          <Button variant="outline">
            <ArrowLeft className="mr-2" size={16} />
            메르 홈으로
          </Button>
        </Link>
      </div>

      {/* Post Content */}
      <article className="mb-12">
        <header className="mb-8">
          {/* Category and Featured Badge */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            {post.featured && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                ✨ 추천
              </Badge>
            )}
            <Badge className={`${getSentimentColor(post.sentiment)} border-0`}>
              {getSentimentIcon(post.sentiment)} {post.sentiment}
            </Badge>
            <Badge variant="outline" className="text-blue-600">
              신뢰도 {Math.round(post.confidence * 100)}%
            </Badge>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
            {post.title}
          </h1>
          
          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <div className="flex items-center gap-1">
              <User size={16} />
              {post.author}
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              {formatDate(post.publishedAt)}
            </div>
            <div className="flex items-center gap-1">
              <Eye size={16} />
              조회 {post.views.toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              {post.readingTime}분 읽기
            </div>
          </div>

          {/* Stock Tickers */}
          {post.stockTickers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📊 관련 종목</h3>
              <div className="flex flex-wrap gap-2">
                {post.stockTickers.map((ticker) => (
                  <Link key={ticker} href={`/merry/stocks/${ticker}`}>
                    <Badge variant="outline" className="hover:bg-blue-50 cursor-pointer">
                      <TrendingUp size={12} className="mr-1" />
                      {ticker}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-sm">
                <Tag size={12} className="mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </header>

        {/* 메르님 한 줄 요약 또는 한줄 코멘트 - Beautiful Display */}
        {hasSummary && summaryType === 'summary' && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📝</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <span className="text-blue-600">💡</span>
                  메르님 한 줄 요약
                </h3>
                <blockquote className="text-gray-700 text-lg leading-relaxed font-medium italic border-l-2 border-blue-300 pl-4 bg-white/60 rounded-r-lg p-3 whitespace-pre-line">
                  "{summary}"
                </blockquote>
              </div>
            </div>
          </div>
        )}

        {/* 한줄 코멘트 카드 - Premium Style with Navy Gradient */}
        {hasSummary && summaryType === 'comment' && (
          <div className="mb-8 relative overflow-hidden">
            {/* Background gradient effect - Neutral theme */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 via-slate-100/30 to-gray-100/50 dark:from-gray-900/30 dark:via-slate-900/20 dark:to-gray-900/30 rounded-2xl" />
            
            {/* Main card content - Dark mode compatible */}
            <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-6">
              {/* Header with icon */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 rounded-xl flex items-center justify-center shadow-lg border">
                    <span className="text-white text-lg">💡</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
                    메르님 한 줄 코멘트
                  </h3>
                </div>
              </div>
              
              {/* Comment content with formatted text - Dark mode compatible */}
              <div className="relative">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-600 rounded-full" />
                <blockquote className="pl-6 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <div 
                    className="text-base font-medium"
                    dangerouslySetInnerHTML={{
                      __html: summary
                        .replace(/^한줄 코멘트\s*/g, '')
                        .replace(/\\n/g, '\n') // 먼저 \\n을 실제 줄바꿈으로 변환
                        .replace(/\n/g, '<br/>') // 그 다음 모든 줄바꿈을 <br/>로 변환
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    }}
                  />
                </blockquote>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 Claude 직접 분석 카드들 - 올바른 순서 */}
        {postData.analysis && (
          <div className="space-y-6 mb-8">
            
            {/* 1️⃣ 📝 코멘트 풀이 카드 (투자 인사이트 스타일) */}
            {postData.analysis.explanation && (
              <div className="bg-card rounded-xl p-5 border">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span>📝</span>
                  <span>코멘트 풀이</span>
                </h3>
                <p 
                  className="text-base text-foreground leading-relaxed break-keep"
                  dangerouslySetInnerHTML={{
                    __html: postData.analysis.explanation
                      .replace(/\\n/g, '\n')
                      .replace(/\n/g, '<br/>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  }}
                />
              </div>
            )}

            {/* 2️⃣ 💡 핵심 한줄 요약 카드 (투자 인사이트 스타일) */}
            {postData.analysis.summary && (
              <div className="bg-card rounded-xl p-5 border">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span>💡</span>
                  <span>핵심 한줄 요약</span>
                </h3>
                <p className="text-base lg:text-lg leading-relaxed text-foreground font-medium break-keep">
                  "{postData.analysis.summary}"
                </p>
              </div>
            )}

            {/* 3️⃣ 🎯 투자 인사이트 카드 (메르님 말씀 스타일 - 투자 통찰) */}
            {postData.analysis.investment_insight && (
              <div className="bg-card rounded-xl p-5 border">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>🎯 투자 인사이트</span>
                </h3>
                <p className="text-base text-foreground leading-relaxed break-keep">
                  {postData.analysis.investment_insight}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 📖 본문 카드 - 통일된 스타일링 */}
        <div className="bg-card rounded-xl p-5 border mb-8">
          <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <span>📖</span>
            <span>본문</span>
          </h3>
          <div 
            className="text-base text-foreground leading-relaxed break-keep"
            dangerouslySetInnerHTML={{
              __html: content
                .replace(/\\n/g, '\n') // 먼저 \\n을 실제 줄바꿈으로 변환
                .replace(/\n/g, '<br/>') // 그 다음 모든 줄바꿈을 <br/>로 변환
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
            }}
          />
        </div>

        <Separator className="my-8" />

        {/* Keywords */}
        {post.keywords.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">🔍 핵심 키워드</h3>
            <div className="flex flex-wrap gap-2">
              {post.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-sm">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <Button 
              variant={liked ? "default" : "outline"} 
              onClick={handleLike}
              className="flex items-center gap-2"
            >
              <Heart size={16} className={liked ? "fill-current" : ""} />
              좋아요 ({post.likes.toLocaleString()})
            </Button>
            <div className="flex items-center gap-1 text-gray-500">
              <MessageSquare size={16} />
              댓글 {post.comments}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <BarChart3 size={16} />
              분석
            </div>
          </div>
          
          <Button variant="outline" onClick={handleShare}>
            <Share2 size={16} className="mr-2" />
            공유하기
          </Button>
        </div>
      </article>

      {/* Post Navigation */}
      <section className="mb-12">
        <div className="grid gap-4 md:grid-cols-2">
          {navigation.prev && (
            <Link href={`/merry/posts/${navigation.prev.id}`}>
              <Card className="group hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <ArrowLeft size={14} />
                    이전 포스트
                  </div>
                  <h4 className="font-medium group-hover:text-blue-600 transition-colors line-clamp-2">
                    {navigation.prev.title}
                  </h4>
                </CardContent>
              </Card>
            </Link>
          )}
          
          {navigation.next && (
            <Link href={`/merry/posts/${navigation.next.id}`}>
              <Card className="group hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2 text-sm text-gray-500 mb-2">
                    다음 포스트
                    <ArrowRight size={14} />
                  </div>
                  <h4 className="font-medium group-hover:text-blue-600 transition-colors line-clamp-2">
                    {navigation.next.title}
                  </h4>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">🔗 관련 포스트</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((relatedPost) => (
              <Card key={relatedPost.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{relatedPost.category}</Badge>
                    <Badge className={`${getSentimentColor(relatedPost.sentiment)} border-0 text-xs`}>
                      {getSentimentIcon(relatedPost.sentiment)}
                    </Badge>
                  </div>
                  <CardTitle className="group-hover:text-blue-600 transition-colors">
                    <Link href={`/merry/posts/${relatedPost.id}`}>
                      {relatedPost.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4 line-clamp-2">{relatedPost.excerpt}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(relatedPost.publishedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      {relatedPost.views.toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Current Time Display (MCP Time Integration) */}
      {currentTime && (
        <div className="mt-8 text-center text-sm text-gray-400">
          현재 시간: {currentTime}
        </div>
      )}
    </div>
  );
}