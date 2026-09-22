/**
 * Domain error hierarchy. Every failure path in the application ultimately
 * surfaces as one of these so callers (API routes, agents, orchestrator) can
 * map them to HTTP status codes and log context without leaking raw stack
 * traces.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'AI_PROVIDER_ERROR'
  | 'AI_OUTPUT_INVALID'
  | 'AI_TIMEOUT'
  | 'DATABASE_ERROR'
  | 'KNOWLEDGE_NOT_FOUND'
  | 'ORCHESTRATOR_ERROR'
  | 'INTERNAL_ERROR';

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  httpStatus?: number;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(opts: AppErrorOptions) {
    super(opts.message, { cause: opts.cause });
    this.name = 'AppError';
    this.code = opts.code;
    this.httpStatus = opts.httpStatus ?? defaultStatusFor(opts.code);
    this.details = opts.details;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'VALIDATION_ERROR', message, httpStatus: 400, details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'NOT_FOUND', message, httpStatus: 404, details });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'CONFLICT', message, httpStatus: 409, details });
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super({ code: 'UNAUTHORIZED', message, httpStatus: 401, details });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super({ code: 'FORBIDDEN', message, httpStatus: 403, details });
    this.name = 'ForbiddenError';
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super({ code: 'AI_PROVIDER_ERROR', message, httpStatus: 502, details, cause });
    this.name = 'AIProviderError';
  }
}

export class AIOutputInvalidError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'AI_OUTPUT_INVALID', message, httpStatus: 502, details });
    this.name = 'AIOutputInvalidError';
  }
}

export class AITimeoutError extends AppError {
  constructor(message = 'AI provider timed out', details?: Record<string, unknown>) {
    super({ code: 'AI_TIMEOUT', message, httpStatus: 504, details });
    this.name = 'AITimeoutError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({ code: 'DATABASE_ERROR', message, httpStatus: 500, cause });
    this.name = 'DatabaseError';
  }
}

export class OrchestratorError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super({ code: 'ORCHESTRATOR_ERROR', message, httpStatus: 500, details, cause });
    this.name = 'OrchestratorError';
  }
}

function defaultStatusFor(code: ErrorCode): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'RATE_LIMITED':
      return 429;
    case 'AI_PROVIDER_ERROR':
    case 'AI_OUTPUT_INVALID':
      return 502;
    case 'AI_TIMEOUT':
      return 504;
    case 'DATABASE_ERROR':
    case 'KNOWLEDGE_NOT_FOUND':
    case 'ORCHESTRATOR_ERROR':
    case 'INTERNAL_ERROR':
      return 500;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/** Wrap an unknown thrown value as an `AppError` without losing the cause. */
export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof Error) {
    return new AppError({
      code: 'INTERNAL_ERROR',
      message: err.message || 'Unknown internal error',
      cause: err,
    });
  }
  return new AppError({
    code: 'INTERNAL_ERROR',
    message: 'Unknown internal error',
    details: { raw: String(err) },
  });
}

/**
 * Minimal Result helper for hot paths where throwing is inconvenient. Kept
 * intentionally small — the codebase primarily uses exceptions.
 */
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
