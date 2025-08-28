import { z } from 'zod';

/**
 * Zod Validation Schemas
 * Input validation and sanitization for API endpoints and forms
 */

// ===== COMMON VALIDATION RULES =====

// Common text validation
const sanitizedString = z.string().trim();
const nonEmptyString = sanitizedString.min(1, 'This field is required');
const optionalString = sanitizedString.optional();

// Common numeric validation
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().min(0);

// ===== BLOG POST VALIDATION =====

// Post filters schema (query parameters)
export const postFiltersSchema = z.object({
  category: optionalString,
  search: z.string().max(100, 'Search query too long (max 100 characters)').optional(),
  limit: z.number().int().min(1).max(100).default(10),
  offset: nonNegativeInt.default(0)
}).transform(data => ({
  ...data,
  category: data.category || undefined,
  search: data.search || undefined
}));

// Create post schema
export const createPostSchema = z.object({
  title: nonEmptyString.max(200, 'Title too long (max 200 characters)'),
  content: nonEmptyString.max(50000, 'Content too long (max 50,000 characters)'),
  category: z.string().max(50, 'Category too long (max 50 characters)').optional()
}).transform(data => ({
  ...data,
  title: data.title.trim(),
  content: data.content.trim(),
  category: data.category?.trim() || null
}));

// Update post schema (all fields optional)
export const updatePostSchema = z.object({
  title: z.string().max(200, 'Title too long (max 200 characters)').optional(),
  content: z.string().max(50000, 'Content too long (max 50,000 characters)').optional(),
  category: z.string().max(50, 'Category too long (max 50 characters)').optional()
}).transform(data => ({
  ...data,
  title: data.title?.trim(),
  content: data.content?.trim(),
  category: data.category?.trim() || null
}));

// ===== INVESTMENT DATA VALIDATION =====

// Scion holdings filter schema
export const scionFiltersSchema = z.object({
  quarter: z.string().regex(/^Q[1-4]_\d{4}$/, 'Invalid quarter format (expected: Q1_2024)').optional(),
  minValue: z.number().min(0, 'Minimum value must be non-negative').optional(),
  maxValue: z.number().min(0, 'Maximum value must be non-negative').optional(),
  sector: z.string().optional(),
  sortBy: z.enum(['marketValue', 'portfolioPercent', 'shares', 'name']).default('marketValue'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(100).default(25)
}).refine(data => {
  if (data.minValue && data.maxValue && data.minValue > data.maxValue) {
    return false;
  }
  return true;
}, {
  message: 'Minimum value cannot be greater than maximum value'
});

// ===== GENERAL VALIDATION =====

// Search query schema
export const searchQuerySchema = z.object({
  q: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query too long (max 100 characters)')
    .regex(/^[a-zA-Z0-9\s\-._가-힣]+$/, 'Search query contains invalid characters')
    .transform(q => q.trim()),
  type: z.enum(['posts', 'categories', 'all']).default('posts')
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  offset: nonNegativeInt.optional()
}).transform(data => ({
  ...data,
  offset: data.offset ?? (data.page - 1) * data.limit
}));

// Contact form schema (if needed)
export const contactFormSchema = z.object({
  name: nonEmptyString.max(50, 'Name too long (max 50 characters)'),
  email: z.string().email('Invalid email format').max(100),
  subject: nonEmptyString.max(100, 'Subject too long (max 100 characters)'),
  message: nonEmptyString.max(1000, 'Message too long (max 1000 characters)')
}).transform(data => ({
  name: data.name.trim(),
  email: data.email.trim().toLowerCase(),
  subject: data.subject.trim(),
  message: data.message.trim()
}));

// ===== VALIDATION HELPERS =====

// Type-safe validation wrapper
export async function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName?: string
): Promise<{ success: true; data: T } | { success: false; error: string; field?: string }> {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as any).errors[0];
      return {
        success: false,
        error: firstError.message,
        field: fieldName || firstError.path.join('.')
      };
    }
    const result: any = {
      success: false,
      error: 'Validation failed'
    };
    if (fieldName !== undefined) {
      result.field = fieldName;
    }
    return result;
  }
}

// Validate query parameters from URL
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; error: string; field?: string } {
  const params: Record<string, any> = {};
  
  // Convert URLSearchParams to plain object
  for (const [key, value] of searchParams.entries()) {
    // Handle numeric values
    if (key === 'limit' || key === 'offset' || key === 'page') {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        params[key] = numValue;
      }
    } else if (key === 'minValue' || key === 'maxValue') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        params[key] = numValue;
      }
    } else {
      params[key] = value;
    }
  }
  
  try {
    const validatedData = schema.parse(params);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as any).errors[0];
      return {
        success: false,
        error: firstError.message,
        field: firstError.path.join('.')
      };
    }
    return {
      success: false,
      error: 'Validation failed'
    };
  }
}

// Sanitize HTML content (basic)
export function sanitizeHtml(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .trim();
}

// Rate limiting validation
export const rateLimitSchema = z.object({
  windowMs: z.number().int().min(1000).max(3600000), // 1 second to 1 hour
  maxRequests: z.number().int().min(1).max(10000),
  identifier: nonEmptyString // IP address or user ID
});

// Export types for TypeScript
export type PostFilters = z.infer<typeof postFiltersSchema>;
export type CreatePost = z.infer<typeof createPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
export type ScionFilters = z.infer<typeof scionFiltersSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type ContactForm = z.infer<typeof contactFormSchema>;
export type RateLimitParams = z.infer<typeof rateLimitSchema>;