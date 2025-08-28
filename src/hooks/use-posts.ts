'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BlogPost, 
  PostsApiResponse, 
  PostApiResponse, 
  PostFilters,
  ApiResponse 
} from '@/types';
import { queryKeys, handleQueryError } from '@/components/providers/query-provider';

/**
 * API Functions
 */
async function fetchPosts(filters: PostFilters = {}): Promise<PostsApiResponse> {
  const params = new URLSearchParams();
  
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  
  const response = await fetch(`/api/posts?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchPost(id: string | number): Promise<PostApiResponse> {
  const response = await fetch(`/api/posts/${id}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Post not found');
    }
    throw new Error(`Failed to fetch post: ${response.statusText}`);
  }
  
  return response.json();
}

async function createPost(data: { 
  title: string; 
  content: string; 
  category?: string; 
}): Promise<PostApiResponse> {
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to create post');
  }
  
  return response.json();
}

async function updatePost(
  id: string | number,
  data: Partial<{ title: string; content: string; category: string }>
): Promise<PostApiResponse> {
  const response = await fetch(`/api/posts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to update post');
  }
  
  return response.json();
}

async function deletePost(id: string | number): Promise<ApiResponse> {
  const response = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to delete post');
  }
  
  return response.json();
}

/**
 * Custom Hooks
 */

// Hook for fetching posts list
export function usePosts(filters: PostFilters = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.postsList(filters),
    queryFn: () => fetchPosts(filters),
    enabled,
    
    // Transform the data to extract posts and metadata
    select: (data) => ({
      posts: data.data || [],
      meta: data.meta,
      success: data.success,
      message: data.message
    }),
    
    // Handle errors
    throwOnError: false,
    
    // Optimization: Keep data fresh for 2 minutes for posts list
    staleTime: 1000 * 60 * 2,
    
    // Cache for 10 minutes
    gcTime: 1000 * 60 * 10,
  });
}

// Hook for fetching a single post
export function usePost(id: string | number, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.postsDetail(id),
    queryFn: () => fetchPost(id),
    enabled: enabled && !!id,
    
    select: (data) => ({
      post: data.data,
      success: data.success,
      message: data.message
    }),
    
    throwOnError: false,
    
    // Keep individual posts fresh for 5 minutes
    staleTime: 1000 * 60 * 5,
    
    // Cache for 30 minutes
    gcTime: 1000 * 60 * 30,
  });
}

// Hook for creating a post
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPost,
    
    onSuccess: (data) => {
      // Invalidate and refetch posts list
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      
      // Optionally add the new post to the cache
      if (data.data) {
        queryClient.setQueryData(
          queryKeys.postsDetail(data.data.id),
          data
        );
      }
    },
    
    onError: (error) => {
      console.error('Failed to create post:', error);
    },
  });
}

// Hook for updating a post
export function useUpdatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { 
      id: string | number; 
      data: Partial<{ title: string; content: string; category: string }> 
    }) => updatePost(id, data),
    
    onSuccess: (data, variables) => {
      // Update the specific post in cache
      if (data.data) {
        queryClient.setQueryData(
          queryKeys.postsDetail(variables.id),
          data
        );
      }
      
      // Invalidate posts list to show updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
    
    onError: (error) => {
      console.error('Failed to update post:', error);
    },
  });
}

// Hook for deleting a post
export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePost,
    
    onSuccess: (_, deletedId) => {
      // Remove the post from cache
      queryClient.removeQueries({ queryKey: queryKeys.postsDetail(deletedId) });
      
      // Invalidate posts list
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
    
    onError: (error) => {
      console.error('Failed to delete post:', error);
    },
  });
}

// Hook for prefetching posts
export function usePrefetchPosts() {
  const queryClient = useQueryClient();
  
  const prefetchPosts = (filters: PostFilters = {}) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.postsList(filters),
      queryFn: () => fetchPosts(filters),
      
      // Prefetch data that is older than 1 minute
      staleTime: 1000 * 60,
    });
  };
  
  const prefetchPost = (id: string | number) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.postsDetail(id),
      queryFn: () => fetchPost(id),
      
      staleTime: 1000 * 60 * 5,
    });
  };
  
  return {
    prefetchPosts,
    prefetchPost,
  };
}

// Hook for infinite posts loading (pagination)
export function useInfinitePosts(
  filters: Omit<PostFilters, 'offset'> = {},
  pageSize: number = 10
) {
  return useQuery({
    queryKey: [...queryKeys.postsList(filters), 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchPosts({
        ...filters,
        limit: pageSize,
        offset: (pageParam as number) * pageSize,
      });
    },
    
    select: (data) => {
      const posts = data.data || [];
      const meta = data.meta;
      
      return {
        posts,
        hasNextPage: meta?.hasNext || false,
        totalCount: meta?.totalCount || 0,
        currentPage: meta?.currentPage || 1,
      };
    },
    
    throwOnError: false,
    
    // Keep infinite queries fresh for 1 minute
    staleTime: 1000 * 60,
  });
}

// Optimistic updates helper
export function useOptimisticPostUpdate() {
  const queryClient = useQueryClient();
  
  const optimisticallyUpdatePost = (
    id: string | number,
    updates: Partial<BlogPost>
  ) => {
    // Get current data
    const currentData = queryClient.getQueryData<PostApiResponse>(
      queryKeys.postsDetail(id)
    );
    
    if (currentData?.data) {
      // Optimistically update the cache
      const updatedData: PostApiResponse = {
        ...currentData,
        data: {
          ...currentData.data,
          ...updates,
          updated_at: new Date().toISOString()
        }
      };
      
      queryClient.setQueryData(queryKeys.postsDetail(id), updatedData);
    }
    
    return currentData; // Return for potential rollback
  };
  
  const rollbackOptimisticUpdate = (
    id: string | number,
    previousData: PostApiResponse
  ) => {
    queryClient.setQueryData(queryKeys.postsDetail(id), previousData);
  };
  
  return {
    optimisticallyUpdatePost,
    rollbackOptimisticUpdate,
  };
}