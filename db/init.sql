-- DevPulse Database Initialization Script
-- Run this once against your PostgreSQL database (NeonDB / Supabase / ElephantSQL)

-- ─── Table: users ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       VARCHAR(20) NOT NULL DEFAULT 'contributor'
               CHECK (role IN ('contributor', 'maintainer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Table: issues ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issues (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  type        VARCHAR(20) NOT NULL
                CHECK (type IN ('bug', 'feature_request')),
  status      VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved')),
  reporter_id INTEGER NOT NULL,
  -- No FK constraint on reporter_id per spec: "validate in application logic"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes for common queries ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_issues_type      ON issues (type);
CREATE INDEX IF NOT EXISTS idx_issues_status    ON issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_reporter  ON issues (reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_created   ON issues (created_at DESC);
