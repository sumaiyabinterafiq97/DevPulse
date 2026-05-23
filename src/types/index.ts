import { Request } from 'express';

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'contributor' | 'maintainer';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export type PublicUser = Omit<User, 'password'>;

export type ReporterInfo = {
  id: number;
  name: string;
  role: UserRole;
};

// ─── Issue ───────────────────────────────────────────────────────────────────

export type IssueType = 'bug' | 'feature_request';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface Issue {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface IssueWithReporter extends Omit<Issue, 'reporter_id'> {
  reporter: ReporterInfo;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  id: number;
  name: string;
  role: UserRole;
}

// ─── Express Request Extension ───────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// ─── Request Bodies ──────────────────────────────────────────────────────────

export interface SignupBody {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateIssueBody {
  title: string;
  description: string;
  type: IssueType;
}

export interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: IssueType;
}
