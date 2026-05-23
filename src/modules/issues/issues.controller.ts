import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import {
  AuthRequest,
  Issue,
  IssueType,
  IssueStatus,
  CreateIssueBody,
  UpdateIssueBody,
  ReporterInfo,
  IssueWithReporter,
} from '../../types';

const VALID_TYPES: IssueType[] = ['bug', 'feature_request'];
const VALID_STATUSES: IssueStatus[] = ['open', 'in_progress', 'resolved'];

// ─── Helper: fetch reporter data separately (no JOIN per spec) ────────────────

async function fetchReporter(reporterId: number): Promise<ReporterInfo | null> {
  const result = await pool.query<ReporterInfo>(
    'SELECT id, name, role FROM users WHERE id = $1',
    [reporterId],
  );
  return result.rows[0] ?? null;
}

async function fetchReportersBatch(
  reporterIds: number[],
): Promise<Map<number, ReporterInfo>> {
  if (reporterIds.length === 0) return new Map();

  // Build parameterized placeholders: $1, $2, $3 ...
  const placeholders = reporterIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await pool.query<ReporterInfo>(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    reporterIds,
  );

  const map = new Map<number, ReporterInfo>();
  result.rows.forEach((r) => map.set(r.id, r));
  return map;
}

// ─── POST /api/issues ─────────────────────────────────────────────────────────

export async function createIssue(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title, description, type }: CreateIssueBody = req.body;

    // Validate required fields
    if (!title || !description || !type) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'title, description, and type are required.',
      });
      return;
    }

    // Validate title length
    if (title.length > 150) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'title must not exceed 150 characters.',
      });
      return;
    }

    // Validate description length
    if (description.length < 20) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'description must be at least 20 characters.',
      });
      return;
    }

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `type must be one of: ${VALID_TYPES.join(', ')}.`,
      });
      return;
    }

    // Extract reporter_id from JWT (not request body)
    const reporterId = req.user!.id;

    // Validate reporter exists in users table (no FK constraint, done in app logic)
    const userCheck = await pool.query<{ id: number }>(
      'SELECT id FROM users WHERE id = $1',
      [reporterId],
    );
    if (userCheck.rows.length === 0) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Reporter user not found.',
      });
      return;
    }

    const result = await pool.query<Issue>(
      `INSERT INTO issues (title, description, type, reporter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
      [title, description, type, reporterId],
    );

    sendSuccess({
      res,
      statusCode: StatusCodes.CREATED,
      message: 'Issue created successfully',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/issues ──────────────────────────────────────────────────────────
// The Challenge 🚀: sort + filter, reporter fetched separately (no JOIN)

export async function getAllIssues(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      sort = 'newest',
      type,
      status,
    } = req.query as {
      sort?: string;
      type?: string;
      status?: string;
    };

    // Validate sort
    if (sort && !['newest', 'oldest'].includes(sort)) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'sort must be one of: newest, oldest.',
      });
      return;
    }

    // Validate optional type filter
    if (type && !VALID_TYPES.includes(type as IssueType)) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `type filter must be one of: ${VALID_TYPES.join(', ')}.`,
      });
      return;
    }

    // Validate optional status filter
    if (status && !VALID_STATUSES.includes(status as IssueStatus)) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `status filter must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
      return;
    }

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (type) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause =
      sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

    const issueResult = await pool.query<Issue>(
      `SELECT id, title, description, type, status, reporter_id, created_at, updated_at
       FROM issues
       ${whereClause}
       ${orderClause}`,
      params,
    );

    const issues = issueResult.rows;

    // Fetch all reporter data in one batch query (no JOIN — The Challenge 🚀)
    const uniqueReporterIds = [...new Set(issues.map((i) => i.reporter_id))];
    const reporterMap = await fetchReportersBatch(uniqueReporterIds);

    // Merge reporter into each issue
    const issuesWithReporters: IssueWithReporter[] = issues.map((issue) => {
      const { reporter_id, ...rest } = issue;
      return {
        ...rest,
        reporter: reporterMap.get(reporter_id) ?? {
          id: reporter_id,
          name: 'Unknown',
          role: 'contributor',
        },
      };
    });

    sendSuccess({
      res,
      statusCode: StatusCodes.OK,
      data: issuesWithReporters,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/issues/:id ──────────────────────────────────────────────────────

export async function getIssueById(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await pool.query<Issue>(
      `SELECT id, title, description, type, status, reporter_id, created_at, updated_at
       FROM issues WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      sendError({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Issue not found.',
      });
      return;
    }

    const issue = result.rows[0];
    const reporter = await fetchReporter(issue.reporter_id);

    const { reporter_id, ...rest } = issue;
    const issueWithReporter: IssueWithReporter = {
      ...rest,
      reporter: reporter ?? { id: reporter_id, name: 'Unknown', role: 'contributor' },
    };

    sendSuccess({
      res,
      statusCode: StatusCodes.OK,
      data: issueWithReporter,
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/issues/:id ────────────────────────────────────────────────────
// Maintainer: any issue, any status
// Contributor: own issue only, status must be open

export async function updateIssue(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, type }: UpdateIssueBody = req.body;
    const currentUser = req.user!;

    // Fetch issue
    const issueResult = await pool.query<Issue>(
      `SELECT id, title, description, type, status, reporter_id, created_at, updated_at
       FROM issues WHERE id = $1`,
      [id],
    );

    if (issueResult.rows.length === 0) {
      sendError({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Issue not found.',
      });
      return;
    }

    const issue = issueResult.rows[0];

    // Permission check
    if (currentUser.role === 'contributor') {
      // Contributor can only edit their own issue
      if (issue.reporter_id !== currentUser.id) {
        sendError({
          res,
          statusCode: StatusCodes.FORBIDDEN,
          message: 'You can only update your own issues.',
        });
        return;
      }

      // Contributor can only edit open issues
      if (issue.status !== 'open') {
        sendError({
          res,
          statusCode: StatusCodes.CONFLICT,
          message: 'You can only update issues that are in open status.',
        });
        return;
      }
    }

    // Validate fields if provided
    if (title !== undefined && title.length > 150) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'title must not exceed 150 characters.',
      });
      return;
    }

    if (description !== undefined && description.length < 20) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'description must be at least 20 characters.',
      });
      return;
    }

    if (type !== undefined && !VALID_TYPES.includes(type)) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: `type must be one of: ${VALID_TYPES.join(', ')}.`,
      });
      return;
    }

    // Check that at least one field is provided
    if (title === undefined && description === undefined && type === undefined) {
      sendError({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'At least one field (title, description, type) must be provided.',
      });
      return;
    }

    // Build dynamic SET clause
    const updates: string[] = [];
    const params: unknown[] = [];

    if (title !== undefined) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description);
      updates.push(`description = $${params.length}`);
    }
    if (type !== undefined) {
      params.push(type);
      updates.push(`type = $${params.length}`);
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    params.push(id);
    const idParam = `$${params.length}`;

    const updateResult = await pool.query<Issue>(
      `UPDATE issues
       SET ${updates.join(', ')}
       WHERE id = ${idParam}
       RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
      params,
    );

    sendSuccess({
      res,
      statusCode: StatusCodes.OK,
      message: 'Issue updated successfully',
      data: updateResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/issues/:id ───────────────────────────────────────────────────

export async function deleteIssue(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    // Check issue exists
    const issueResult = await pool.query<{ id: number }>(
      'SELECT id FROM issues WHERE id = $1',
      [id],
    );

    if (issueResult.rows.length === 0) {
      sendError({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Issue not found.',
      });
      return;
    }

    await pool.query('DELETE FROM issues WHERE id = $1', [id]);

    sendSuccess({
      res,
      statusCode: StatusCodes.OK,
      message: 'Issue deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
