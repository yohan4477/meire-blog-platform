'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, Tag, Eye, MessageSquare, Heart, Share2, ArrowLeft, ArrowRight, Brain, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import CausalChainViewer from '@/components/merry/CausalChainViewer';

interface MerryPost {
  id: number;
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
  featured: boolean;
}

interface Comment {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
}

export default function MerryPostPage() {
  const params = useParams();
  const postId = params['id'] as string;
  
  const [post, setPost] = useState<MerryPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<MerryPost[]>([]);

  useEffect(() => {
    // 실제 API에서 포스트 데이터 가져오기
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/merry/${postId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setPost(result.data);
          
          // 관련 포스트는 나중에 구현 예정
          setRelatedPosts([]);
          setComments([]);
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error('포스트 로딩 실패:', error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLike = () => {
    if (post) {
      setPost({
        ...post,
        likes: liked ? post.likes - 1 : post.likes + 1
      });
      setLiked(!liked);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">포스트를 찾을 수 없습니다</h1>
        <p className="text-gray-600 mb-8">요청하신 포스트가 존재하지 않거나 삭제되었습니다.</p>
        <Link href="/merry">
          <Button>
            <ArrowLeft className="mr-2" size={16} />
            메르 홈으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            {post.featured && (
              <Badge variant="outline" className="text-amber-600">추천</Badge>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
          
          <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <User size={16} />
              {post.author}
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              {formatDate(post.createdAt)}
            </div>
            <div className="flex items-center gap-1">
              <Eye size={16} />
              조회 {post.views}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-sm">
                <Tag size={12} className="mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </header>

        <div className="prose max-w-none">
          <div 
            className="text-gray-800 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br>') }}
          />
        </div>

        <Separator className="my-8" />

        {/* Macro Trend Analysis */}
        <div className="mb-8">
          <CausalChainViewer postId={parseInt(postId)} className="mb-8" />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant={liked ? "default" : "outline"} 
              onClick={handleLike}
              className="flex items-center gap-2"
            >
              <Heart size={16} className={liked ? "fill-current" : ""} />
              좋아요 ({post.likes})
            </Button>
            <div className="flex items-center gap-1 text-gray-500">
              <MessageSquare size={16} />
              댓글 {post.comments}
            </div>
          </div>
          
          <Button variant="outline">
            <Share2 size={16} className="mr-2" />
            공유하기
          </Button>
        </div>
      </article>

      {/* Comments */}
      <section className="mb-12">
        <h3 className="text-xl font-bold text-gray-900 mb-6">댓글 ({post.comments})</h3>
        
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {comment.author.slice(0, 1)}
                    </div>
                    <span className="font-medium">{comment.author}</span>
                    <span className="text-gray-500 text-sm">{formatDate(comment.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <Heart size={14} />
                    {comment.likes}
                  </div>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
            <p>아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
          </div>
        )}
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-6">관련 포스트</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {relatedPosts.map((relatedPost) => (
              <Card key={relatedPost.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit">{relatedPost.category}</Badge>
                  <CardTitle className="group-hover:text-blue-600 transition-colors">
                    <Link href={`/merry/${relatedPost.id}`}>
                      {relatedPost.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4 line-clamp-2">{relatedPost.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(relatedPost.createdAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      {relatedPost.views}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}