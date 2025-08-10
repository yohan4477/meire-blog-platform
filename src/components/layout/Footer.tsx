import { Separator } from '@/components/ui/separator';

export default function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 사이트 정보 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Meire Blog</h3>
            <p className="text-sm text-muted-foreground">
              경제, 투자, 일상의 이야기를 담은 개인 블로그입니다.
              다양한 주제의 글을 통해 유익한 정보를 전달합니다.
            </p>
          </div>

          {/* 카테고리 */}
          <div>
            <h4 className="font-medium mb-4">주요 카테고리</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/posts?category=경제/주식/국제정세/사회" 
                   className="text-muted-foreground hover:text-foreground transition-colors">
                  경제 & 투자
                </a>
              </li>
              <li>
                <a href="/posts?category=주절주절" 
                   className="text-muted-foreground hover:text-foreground transition-colors">
                  주절주절
                </a>
              </li>
              <li>
                <a href="/posts?category=건강/의학/맛집/일상/기타" 
                   className="text-muted-foreground hover:text-foreground transition-colors">
                  일상 & 기타
                </a>
              </li>
            </ul>
          </div>

          {/* 통계 */}
          <div>
            <h4 className="font-medium mb-4">블로그 현황</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>총 포스트: 101개</div>
              <div>마지막 업데이트: 2025년 8월</div>
              <div>운영 기간: 2025년 ~</div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Meire Blog. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}