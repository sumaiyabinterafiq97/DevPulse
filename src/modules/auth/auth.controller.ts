import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest, SignupBody, LoginBody, User, PublicUser, UserRole } from '../../types';

const SALT_ROUNDS = 10;
const VALID_ROLES: UserRole[] = ['contributor', 'maintainer'];

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

export async function signup(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, email, password, role = 'contributor' }: SignupBody = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'name, email, and password are required.',
      });
      return;
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `role must be one of: ${VALID_ROLES.join(', ')}.`,
      });
      return;
    }

    // Check email uniqueness
    const existing = await pool.query<{ id: number }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );
    if (existing.rows.length > 0) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'An account with this email already exists.',
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = await pool.query<PublicUser>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, hashedPassword, role],
    );

    const newUser = result.rows[0];

    sendSuccess({
      res,
      statusCode: StatusCodes.CREATED,
      message: 'User registered successfully',
      data: newUser,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password }: LoginBody = req.body;

    // Validate required fields
    if (!email || !password) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'email and password are required.',
      });
      return;
    }

    // Find user
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    if (result.rows.length === 0) {
      sendError({
        res,
        statusCode: StatusCodes.UNAUTHORIZED,
        message: 'Invalid email or password.',
      });
      return;
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      sendError({
        res,
        statusCode: StatusCodes.UNAUTHORIZED,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Sign JWT with id, name, role in payload (per spec hint)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      sendError({
        res,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Server configuration error.',
      });
      return;
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      secret,
      { expiresIn: '7d' },
    );

    sendSuccess({
      res,
      statusCode: StatusCodes.OK,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
