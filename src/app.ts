import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './modules/auth/auth.router';
import issuesRouter from './modules/issues/issues.router';
import { errorHandler } from './middleware/errorHandler';
import { sendError } from './utils/response';
import { StatusCodes } from 'http-status-codes';

dotenv.config();

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'DevPulse API is running',
    version: '1.0.0',
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/issues', issuesRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  sendError({
    res,
    statusCode: StatusCodes.NOT_FOUND,
    message: 'Route not found.',
  });
});

// ─── Centralized Error Handler ────────────────────────────────────────────────

app.use(errorHandler);

export default app;
