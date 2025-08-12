-- 메르 블로그 데이터베이스 스키마
-- 기존 posts 테이블에 메르 블로그용 컬럼 추가

-- 기존 posts 테이블 구조 (참고용)
/*
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_no VARCHAR(255) UNIQUE,
  title VARCHAR(500) NOT NULL,
  content LONGTEXT NOT NULL,
  category VARCHAR(100),
  created_date DATETIME NOT NULL,
  crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  author VARCHAR(100),
  views INT DEFAULT 0,
  INDEX idx_category (category),
  INDEX idx_created_date (created_date),
  INDEX idx_author (author)
);
*/

-- 메르 블로그용 컬럼 추가
ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT COMMENT '포스트 요약';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0 COMMENT '좋아요 수';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0 COMMENT '댓글 수';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE COMMENT '추천 포스트 여부';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS blog_type ENUM('main', 'merry') DEFAULT 'main' COMMENT '블로그 타입';

-- 메르 블로그 태그 테이블
CREATE TABLE IF NOT EXISTS merry_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) COMMENT='메르 블로그 태그';

-- 메르 블로그 포스트-태그 관계 테이블
CREATE TABLE IF NOT EXISTS merry_post_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES merry_tags(id) ON DELETE CASCADE,
  UNIQUE KEY unique_post_tag (post_id, tag_id),
  INDEX idx_post_id (post_id),
  INDEX idx_tag_id (tag_id)
) COMMENT='메르 블로그 포스트-태그 관계';

-- 메르 블로그 댓글 테이블
CREATE TABLE IF NOT EXISTS merry_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  author_email VARCHAR(255),
  content TEXT NOT NULL,
  parent_id INT NULL COMMENT '대댓글용 부모 댓글 ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES merry_comments(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_created_at (created_at),
  INDEX idx_parent_id (parent_id)
) COMMENT='메르 블로그 댓글';

-- 메르 블로그 좋아요 테이블
CREATE TABLE IF NOT EXISTS merry_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_ip VARCHAR(45) NOT NULL COMMENT 'IP 주소로 중복 방지',
  user_agent TEXT COMMENT '브라우저 정보',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_post_ip (post_id, user_ip),
  INDEX idx_post_id (post_id),
  INDEX idx_created_at (created_at)
) COMMENT='메르 블로그 좋아요';

-- 샘플 메르 블로그 포스트 데이터
INSERT INTO posts (
  title, content, excerpt, category, created_date, author, views, likes, comments_count, featured, blog_type
) VALUES 
(
  '우리형 메르의 첫 번째 이야기',
  '안녕하세요, 우리형 메르입니다. 이곳에서 다양한 이야기를 공유하려고 해요. 일상의 소소한 이야기부터 투자에 대한 생각, 독서 후기까지 다양한 주제로 글을 써볼 예정입니다.',
  '메르의 첫 번째 포스트입니다. 앞으로 재미있는 이야기들을 많이 공유할 예정이에요.',
  '일상',
  '2025-01-10 10:00:00',
  '메르',
  156,
  12,
  3,
  TRUE,
  'merry'
),
(
  '투자에 대한 메르의 생각',
  '최근 시장 상황에 대한 나의 관점을 공유해보려고 합니다. 특히 국민연금의 포트폴리오 변화와 글로벌 기관투자자들의 움직임을 보면서 느낀 점들이 많습니다.',
  '현재 시장 상황과 투자 전략에 대한 메르의 개인적인 견해를 담았습니다.',
  '투자',
  '2025-01-08 14:30:00',
  '메르',
  234,
  18,
  7,
  FALSE,
  'merry'
),
(
  '메르의 독서 노트 - 피터 린치의 투자 철학',
  '피터 린치의 "전설로 떠나는 월가의 영웅"을 읽고 느낀 점들을 정리해보았습니다. 특히 개인투자자가 기관투자자보다 유리할 수 있는 부분들이 인상적이었어요.',
  '피터 린치의 투자 철학 중 인상 깊었던 부분들과 현재 시장에 적용 가능한 교훈들을 소개합니다.',
  '독서',
  '2025-01-05 16:20:00',
  '메르',
  187,
  15,
  5,
  TRUE,
  'merry'
),
(
  '메르의 주말 요리 도전기',
  '주말에 도전해본 새로운 요리와 그 과정에서 있었던 에피소드들을 공유합니다. 요리 초보의 좌충우돌 도전기!',
  '요리 초보 메르의 좌충우돌 요리 도전기! 실패와 성공이 공존하는 유쾌한 이야기입니다.',
  '라이프스타일',
  '2025-01-03 11:15:00',
  '메르',
  98,
  8,
  2,
  FALSE,
  'merry'
);

-- 샘플 태그 데이터
INSERT INTO merry_tags (name) VALUES 
('소개'), ('첫글'), ('일상'), ('투자'), ('시장분석'), ('개인견해'), 
('독서'), ('피터린치'), ('투자철학'), ('책리뷰'), ('요리'), ('주말'), ('도전'), ('라이프');

-- 포스트-태그 관계 샘플 데이터
INSERT INTO merry_post_tags (post_id, tag_id) SELECT 
  p.id, t.id 
FROM posts p, merry_tags t 
WHERE p.blog_type = 'merry' AND p.title = '우리형 메르의 첫 번째 이야기' 
  AND t.name IN ('소개', '첫글', '일상');

INSERT INTO merry_post_tags (post_id, tag_id) SELECT 
  p.id, t.id 
FROM posts p, merry_tags t 
WHERE p.blog_type = 'merry' AND p.title = '투자에 대한 메르의 생각' 
  AND t.name IN ('투자', '시장분석', '개인견해');

INSERT INTO merry_post_tags (post_id, tag_id) SELECT 
  p.id, t.id 
FROM posts p, merry_tags t 
WHERE p.blog_type = 'merry' AND p.title = '메르의 독서 노트 - 피터 린치의 투자 철학' 
  AND t.name IN ('독서', '피터린치', '투자철학', '책리뷰');

INSERT INTO merry_post_tags (post_id, tag_id) SELECT 
  p.id, t.id 
FROM posts p, merry_tags t 
WHERE p.blog_type = 'merry' AND p.title = '메르의 주말 요리 도전기' 
  AND t.name IN ('요리', '주말', '도전', '라이프');