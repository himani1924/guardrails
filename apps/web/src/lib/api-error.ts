import { NextResponse } from 'next/server';

import { errors, logging } from '@guardrail/core';

const { AppError, toAppError } = errors;

/**
 * Convert any thrown value into a JSON error response. All API routes should
 * funnel their errors through this so the wire shape is uniform.
 */
export function apiError(err: unknown): NextResponse {
  const log = logging.getLogger({ component: 'api' });
  const appError = toAppError(err);

  if (appError.httpStatus >= 500) {
    log.error({ err: appError.toJSON() }, 'api_error_5xx');
  } else {
    log.warn({ err: appError.toJSON() }, 'api_error_4xx');
  }

  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details ?? null,
      },
    },
    { status: appError.httpStatus },
  );
}

export { AppError };
