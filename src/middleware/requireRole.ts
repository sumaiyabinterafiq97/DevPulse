import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthRequest, UserRole } from '../types';
import { sendError } from '../utils/response';

/**
 * Middleware factory: Restrict access to specific roles.
 * Usage: requireRole('maintainer') or requireRole('contributor', 'maintainer')
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError({
        res,
        statusCode: StatusCodes.UNAUTHORIZED,
        message: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError({
        res,
        statusCode: StatusCodes.FORBIDDEN,
        message: 'You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
}
