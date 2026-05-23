import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { AuthRequest, JWTPayload } from '../types';
import { sendError } from '../utils/response';

/**
 * Middleware: Verify JWT token from Authorization header.
 * Header format per spec: Authorization: <JWT_TOKEN>  (no "Bearer" prefix)
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const token = req.headers.authorization;

  if (!token) {
    sendError({
      res,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'Access denied. No token provided.',
    });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    sendError({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: 'Server configuration error.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    req.user = decoded;
    next();
  } catch {
    sendError({
      res,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'Invalid or expired token.',
    });
  }
}
