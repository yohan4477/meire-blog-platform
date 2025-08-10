// Custom error classes for Scion/WhaleWisdom integration

export class WhaleWisdomError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WhaleWisdomError';
  }
}

export class RateLimitError extends WhaleWisdomError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.retryAfter = retryAfter;
  }
  
  public retryAfter?: number;
}

export class AuthenticationError extends WhaleWisdomError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_FAILED', 401);
  }
}

export class DataNotFoundError extends WhaleWisdomError {
  constructor(message: string = 'Requested data not found') {
    super(message, 'DATA_NOT_FOUND', 404);
  }
}

export class APIError extends WhaleWisdomError {
  constructor(message: string, statusCode?: number, originalError?: Error) {
    super(message, 'API_ERROR', statusCode, originalError);
  }
}

// Error handling utility functions
export function handleApiError(error: unknown): WhaleWisdomError {
  if (error instanceof WhaleWisdomError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('rate limit')) {
      return new RateLimitError(error.message);
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return new AuthenticationError(error.message);
    }
    
    if (error.message.includes('not found')) {
      return new DataNotFoundError(error.message);
    }

    return new APIError(error.message, undefined, error);
  }

  return new APIError('Unknown error occurred');
}

export function isRetryableError(error: WhaleWisdomError): boolean {
  return error instanceof RateLimitError || 
         (error instanceof APIError && error.statusCode && error.statusCode >= 500);
}

export async function withRetry<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      const whaleWisdomError = handleApiError(error);
      
      // Don't retry non-retryable errors
      if (!isRetryableError(whaleWisdomError)) {
        throw whaleWisdomError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw handleApiError(lastError!);
}

// Logging utility for errors
export function logError(error: WhaleWisdomError, context?: string): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    context,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    },
    originalError: error.originalError ? {
      name: error.originalError.name,
      message: error.originalError.message,
      stack: error.originalError.stack,
    } : null,
  };

  console.error('WhaleWisdom Error:', JSON.stringify(logData, null, 2));
}