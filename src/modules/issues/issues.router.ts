import { Router } from 'express';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
} from './issues.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// POST /api/issues — Authenticated (contributor or maintainer)
router.post('/', authenticate, createIssue);

// GET /api/issues — Public
router.get('/', getAllIssues);

// GET /api/issues/:id — Public
router.get('/:id', getIssueById);

// PATCH /api/issues/:id — Authenticated (permission logic inside controller)
router.patch('/:id', authenticate, updateIssue);

// DELETE /api/issues/:id — Maintainer only
router.delete('/:id', authenticate, requireRole('maintainer'), deleteIssue);

export default router;
