/**
 * Standardized Error Handling Utilities
 * Provides consistent error handling patterns across the app
 */

import { toast } from 'sonner';

// ============= Error Types =============

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 500, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

// ============= Error Messages =============

export const ErrorMessages = {
  // Network errors
  NETWORK_TIMEOUT: 'Request timed out. Please check your connection and try again.',
  NETWORK_OFFLINE: 'You appear to be offline. Please check your internet connection.',
  NETWORK_GENERIC: 'Network error occurred. Please try again.',
  
  // Data fetching errors
  FETCH_OSM_FAILED: 'Failed to fetch map data. This may be due to server overload.',
  FETCH_SITE_FAILED: 'Failed to load site data. Please refresh the page.',
  FETCH_ELEVATION_FAILED: 'Failed to load elevation data.',
  FETCH_CLIMATE_FAILED: 'Failed to load climate data.',
  
  // Export errors
  EXPORT_PNG_FAILED: 'Failed to export PNG image. Please try again.',
  EXPORT_PDF_FAILED: 'Failed to export PDF. Please try again.',
  EXPORT_DXF_FAILED: 'Failed to export DXF file. Please try again.',
  EXPORT_GENERIC: 'Export failed. Please try again.',
  
  // Auth errors
  AUTH_REQUIRED: 'Authentication required. Please log in.',
  AUTH_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_INVALID: 'Invalid credentials. Please try again.',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'This field is required.',
  VALIDATION_INVALID_COORDS: 'Invalid coordinates provided.',
  VALIDATION_INVALID_RADIUS: 'Radius must be between 100 and 5000 meters.',
  
  // Generic
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
  GENERIC_SUCCESS: 'Operation completed successfully.',
};

// ============= Error Handlers =============

/**
 * Handle errors with toast notifications
 */
export function handleError(
  error: unknown,
  context?: string,
  options?: {
    showToast?: boolean;
    logError?: boolean;
    fallbackMessage?: string;
  }
): AppError {
  const { 
    showToast = true, 
    logError = true, 
    fallbackMessage = ErrorMessages.GENERIC_ERROR 
  } = options || {};

  let appError: AppError;

  // Convert to AppError if needed
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(error.message, 'UNKNOWN_ERROR', 500);
  } else if (typeof error === 'string') {
    appError = new AppError(error, 'UNKNOWN_ERROR', 500);
  } else {
    appError = new AppError(fallbackMessage, 'UNKNOWN_ERROR', 500, error);
  }

  // Log error to console
  if (logError) {
    console.error(
      `[${context || 'Error'}]`,
      appError.message,
      appError.details || ''
    );
  }

  // Show toast notification
  if (showToast) {
    toast.error(context ? `${context}: ${appError.message}` : appError.message);
  }

  return appError;
}

/**
 * Handle async operations with consistent error handling
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  context: string,
  options?: {
    showSuccessToast?: boolean;
    successMessage?: string;
    showErrorToast?: boolean;
    fallbackMessage?: string;
  }
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await operation();
    
    if (options?.showSuccessToast) {
      toast.success(options.successMessage || ErrorMessages.GENERIC_SUCCESS);
    }
    
    return { data };
  } catch (error) {
    const appError = handleError(error, context, {
      showToast: options?.showErrorToast !== false,
      fallbackMessage: options?.fallbackMessage,
    });
    
    return { error: appError };
  }
}

/**
 * Retry failed operations with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any, attempt: number) => boolean;
  }
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options || {};

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if we should retry
      if (!shouldRetry(error, attempt)) {
        break;
      }

      // Wait before retry
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Validate required fields
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Check if error is retryable (network errors, timeouts, 5xx)
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof AppError && error.statusCode && error.statusCode >= 500) return true;
  if (error.name === 'AbortError') return true;
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('network')) return true;
  return false;
}

/**
 * Parse Supabase errors into AppErrors
 */
export function parseSupabaseError(error: any): AppError {
  // Check common Supabase error patterns
  if (error?.message?.includes('JWT')) {
    return new AuthError('Session expired. Please log in again.');
  }
  
  if (error?.code === 'PGRST116') {
    return new NotFoundError('Resource not found.');
  }
  
  if (error?.code === '23505') {
    return new ValidationError('This record already exists.');
  }
  
  if (error?.message) {
    return new AppError(error.message, error.code, 500, error);
  }
  
  return new AppError(ErrorMessages.GENERIC_ERROR, 'UNKNOWN_ERROR', 500, error);
}

// ============= Usage Examples =============

/*
// Example 1: Basic error handling
try {
  const result = await fetchData();
} catch (error) {
  handleError(error, 'Fetch Data');
}

// Example 2: Async operation with consistent handling
const { data, error } = await handleAsync(
  () => supabase.from('table').select(),
  'Load data',
  { 
    showSuccessToast: true,
    successMessage: 'Data loaded successfully' 
  }
);

// Example 3: Retry with backoff
const data = await retryWithBackoff(
  () => fetch('https://api.example.com/data'),
  { 
    maxRetries: 3,
    shouldRetry: isRetryableError 
  }
);

// Example 4: Validation
try {
  validateRequired(formData, ['name', 'email', 'password']);
} catch (error) {
  handleError(error, 'Form Validation');
}

// Example 5: Custom error
throw new ValidationError('Invalid email format', { email: formData.email });
*/
