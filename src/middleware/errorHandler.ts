import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';

// ─── App Error ────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public statusCode: number;
  public errors?: unknown;

  constructor(message: string, statusCode: number, errors?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Centralized Error Handler ────────────────────────────────────────────────
// Must have 4 parameters so Express recognizes it as an error handler

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  console.error(`[ERROR] ${err.message}`);

  // Known operational error thrown via AppError
  if (err instanceof AppError) {
    sendError({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Unexpected / unhandled error
  sendError({
    res,
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    errors: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
