export interface BlogPost {
  id: number;
  log_no: string;
  title: string;
  content: string;
  category: string | null;
  created_date: string;
  crawled_at: string;
  updated_at: string;
}

export interface PostFilters {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PostMetadata {
  totalCount: number;
  categories: { name: string; count: number }[];
  recentPosts: BlogPost[];
}