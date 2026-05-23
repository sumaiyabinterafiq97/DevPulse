import { Response } from 'express';

// ─── Success Response ─────────────────────────────────────────────────────────

interface SuccessResponseOptions {
  res: Response;
  statusCode: number;
  message?: string;
  data?: unknown;
}

export function sendSuccess({
  res,
  statusCode,
  message,
  data,
}: SuccessResponseOptions): Response {
  const body: Record<string, unknown> = { success: true };
  if (message !== undefined) body.message = message;
  if (data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

// ─── Error Response ───────────────────────────────────────────────────────────

interface ErrorResponseOptions {
  res: Response;
  statusCode: number;
  message: string;
  errors?: unknown;
}

export function sendError({
  res,
  statusCode,
  message,
  errors,
}: ErrorResponseOptions): Response {
  const body: Record<string, unknown> = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  return res.status(statusCode).json(body);
}
