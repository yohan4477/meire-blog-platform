'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Tag, Eye, MessageSquare, Heart, Share2, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
  const postId = params.id as string;
  
  const [post, setPost] = useState<MerryPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<MerryPost[]>([]);

  useEffect(() => {
    // Mock 데이터 - 실제로는 API에서 가져올 데이터
    const mockPosts: MerryPost[] = [
      {
        id: 1,
        title: '우리형 메르의 첫 번째 이야기',
        content: `
안녕하세요, 우리형 메르입니다! 🎭

이곳은 제가 일상 속에서 경험하고 느낀 다양한 이야기들을 나누는 공간입니다. 

## 왜 블로그를 시작하게 되었나요?

평소에 책을 읽거나 투자를 공부하면서 느낀 점들을 정리하고 싶었어요. 그리고 무엇보다 제 이야기를 들어줄 누군가가 있다면 얼마나 좋을까 하는 생각에서 시작하게 되었습니다.

## 어떤 내용을 다룰 예정인가요?

- 📚 **독서 노트**: 읽은 책들에 대한 감상과 인사이트
- 💰 **투자 이야기**: 주식, 경제에 대한 개인적인 생각들  
- 🍳 **일상 이야기**: 요리, 취미, 일상 속 소소한 이야기들
- 🎯 **자기계발**: 성장과 배움에 대한 기록들

## 마치며

앞으로 이곳에서 많은 이야기를 나누고 싶어요. 제 이야기가 누군가에게는 작은 도움이 되기를, 또 누군가에게는 재미있는 읽을거리가 되기를 바랍니다.

댓글로 여러분의 생각도 많이 들려주세요! 🙏
        `,
        excerpt: '메르의 첫 번째 포스트입니다. 앞으로 재미있는 이야기들을 많이 공유할 예정이에요.',
        category: '일상',
        author: '메르',
        createdAt: '2025-01-10',
        views: 156,
        likes: 12,
        comments: 3,
        tags: ['소개', '첫글', '일상'],
        featured: true
      },
      {
        id: 2,
        title: '투자에 대한 메르의 생각',
        content: `
최근 시장 상황을 보면서 든 생각들을 정리해봅니다.

## 현재 시장 상황

지금의 시장은 정말 변동성이 큽니다. 하루아침에 몇 퍼센트씩 오르내리는 걸 보면 마음이 조급해지기도 해요.

## 나의 투자 원칙

1. **장기 투자**: 단기적인 변동에 일희일비하지 않기
2. **분산 투자**: 한 곳에 모든 것을 걸지 않기  
3. **꾸준한 공부**: 투자하는 회사와 산업 이해하기

## 마치며

투자는 결국 인내의 게임인 것 같아요. 조급해하지 말고 꾸준히 해나가려고 합니다.
        `,
        excerpt: '현재 시장 상황과 투자 전략에 대한 메르의 개인적인 견해를 담았습니다.',
        category: '투자',
        author: '메르',
        createdAt: '2025-01-08',
        views: 234,
        likes: 18,
        comments: 7,
        tags: ['투자', '시장분석', '개인견해'],
        featured: false
      },
      {
        id: 3,
        title: '메르의 독서 노트 - 피터 린치의 투자 철학',
        content: `
피터 린치의 "전설로 떠나는 월가의 영웅"을 읽고 느낀 점들을 정리해보았습니다.

## 인상 깊었던 구절들

> "당신이 이해할 수 없는 회사에는 투자하지 말라"

이 말이 정말 인상 깊었어요. 아무리 좋다고 해도 내가 이해할 수 없는 회사라면 투자하지 않는 것이 맞다고 생각해요.

## 피터 린치의 투자 원칙

1. **자신이 아는 분야에 투자하라**
2. **기업의 기본기를 보라**  
3. **인내심을 가져라**
4. **다양한 정보를 수집하라**

## 현재 시장에 적용할 점

피터 린치가 말한 "자신이 아는 분야"라는 것이 특히 와닿았어요. 
요즘은 너무 많은 정보와 추천종목들이 넘쳐나다 보니 정작 내가 무엇을 하고 있는지 모를 때가 많거든요.

## 마치며

좋은 책을 읽으며 많은 것을 배웠습니다. 앞으로도 꾸준히 공부하며 현명한 투자자가 되고 싶어요.
        `,
        excerpt: '피터 린치의 투자 철학 중 인상 깊었던 부분들과 현재 시장에 적용 가능한 교훈들을 소개합니다.',
        category: '독서',
        author: '메르',
        createdAt: '2025-01-05',
        views: 187,
        likes: 15,
        comments: 5,
        tags: ['독서', '피터린치', '투자철학', '책리뷰'],
        featured: true
      },
      {
        id: 4,
        title: '메르의 주말 요리 도전기',
        content: `
주말마다 새로운 요리에 도전하고 있는 메르입니다! 

## 이번 주말의 도전: 까르보나라

이번 주말에는 까르보나라에 도전해봤어요. 생각보다 어려웠던 점들을 공유해드릴게요.

### 준비 재료
- 스파게티면
- 베이컨  
- 달걀
- 파마산 치즈
- 후추

### 도전 과정

1. **면 삶기**: 이건 쉬워요!
2. **베이컨 굽기**: 바삭하게 구우는 게 포인트
3. **달걀물 만들기**: 여기서 실패했어요 😭
4. **섞기**: 달걀이 익어버렸어요...

## 실패에서 배운 것

첫 번째 시도에서는 달걀이 완전히 익어서 스크램블 에그 파스타가 되어버렸어요. 
온도 조절이 정말 중요하다는 걸 깨달았습니다.

## 두 번째 도전

다음 주에는 온도를 낮춰서 다시 도전해볼 예정입니다!

## 마치며

요리는 정말 어려워요. 하지만 실패할 때마다 배우는 게 있어서 재미있기도 해요. 
다음 주말에는 뭘 만들어볼까요? 🤔
        `,
        excerpt: '요리 초보 메르의 좌충우돌 요리 도전기! 실패와 성공이 공존하는 유쾌한 이야기입니다.',
        category: '라이프스타일',
        author: '메르',
        createdAt: '2025-01-03',
        views: 98,
        likes: 8,
        comments: 2,
        tags: ['요리', '주말', '도전', '라이프'],
        featured: false
      }
    ];

    const mockComments: Comment[] = [
      {
        id: 1,
        author: '독자1',
        content: '메르님의 글 정말 재미있게 읽었어요! 앞으로도 좋은 글 부탁드립니다.',
        createdAt: '2025-01-11',
        likes: 3
      },
      {
        id: 2,
        author: '블로그팬',
        content: '첫 글부터 이렇게 정성스럽게 쓰시니 기대가 됩니다. 구독했어요!',
        createdAt: '2025-01-11',
        likes: 2
      },
      {
        id: 3,
        author: '메르친구',
        content: '메르야 화이팅! 너의 글 항상 응원해 🎉',
        createdAt: '2025-01-12',
        likes: 5
      }
    ];

    const currentPost = mockPosts.find(p => p.id === parseInt(postId));
    const related = mockPosts.filter(p => p.id !== parseInt(postId) && p.category === currentPost?.category).slice(0, 2);
    
    setTimeout(() => {
      setPost(currentPost || null);
      setComments(mockComments.slice(0, currentPost?.comments || 0));
      setRelatedPosts(related);
      setLoading(false);
    }, 500);
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