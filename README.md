# DevPulse 🚀

> **Internal Tech Issue & Feature Tracker** — A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)

---

## 🌐 Live URL

> **https://devpulse-api.onrender.com** *(update after deployment)*

---

## ✨ Features

- **User Authentication** — Secure signup & login with bcrypt + JWT
- **Role-Based Access Control** — `contributor` and `maintainer` roles with enforced permissions
- **Issue Management** — Create, view, update, and delete bug reports & feature requests
- **Smart Filtering** — Filter issues by type and status; sort by newest or oldest
- **No-JOIN Reporter Lookup** — Reporter data fetched via batch query (no SQL JOINs)
- **Strict TypeScript** — Zero `any` types; full interface coverage
- **Centralized Error Handling** — Consistent error response format across all endpoints

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 24.x LTS | Runtime |
| TypeScript 5.x | Language (strict mode) |
| Express.js 4.x | Web framework (modular router architecture) |
| PostgreSQL 16 | Relational database |
| `pg` (native driver) | Raw SQL with `pool.query()` — no ORM/query builder |
| `bcrypt` | Password hashing (salt rounds: 10) |
| `jsonwebtoken` | JWT generation & verification |
| `http-status-codes` | Consistent HTTP status code references |
| NeonDB / Supabase | Hosted PostgreSQL |

---

## 🗄️ Database Schema

### `users` table
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password | TEXT | NOT NULL (bcrypt hashed) |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'contributor', CHECK IN ('contributor','maintainer') |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

### `issues` table
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| title | VARCHAR(150) | NOT NULL |
| description | TEXT | NOT NULL (min 20 chars) |
| type | VARCHAR(20) | NOT NULL, CHECK IN ('bug','feature_request') |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'open', CHECK IN ('open','in_progress','resolved') |
| reporter_id | INTEGER | NOT NULL (no FK — validated in app logic) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register new user |
| POST | `/api/auth/login` | Public | Authenticate & get JWT |

### Issues

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/issues` | JWT required | Create new issue |
| GET | `/api/issues` | Public | Get all issues (filter + sort) |
| GET | `/api/issues/:id` | Public | Get single issue |
| PATCH | `/api/issues/:id` | JWT required | Update issue (role-based) |
| DELETE | `/api/issues/:id` | Maintainer only | Delete issue |

> **Auth Header Format:** `Authorization: <JWT_TOKEN>` *(no Bearer prefix)*

### Query Parameters for `GET /api/issues`

| Param | Values | Default |
|---|---|---|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | (none) |
| `status` | `open`, `in_progress`, `resolved` | (none) |

---

## 🔐 Authentication Flow

```
Client → POST /api/auth/login → Server validates → Returns JWT
Client → Sets header: Authorization: <token>
Server → Verifies JWT signature & expiry → Processes request
```

JWT payload contains: `{ id, name, role }`

---

## 📦 Project Structure

```
DevPulse/
├── src/
│   ├── config/
│   │   └── db.ts              # PostgreSQL pool
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification
│   │   ├── requireRole.ts     # Role-based access
│   │   └── errorHandler.ts    # Centralized error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.router.ts
│   │   │   └── auth.controller.ts
│   │   └── issues/
│   │       ├── issues.router.ts
│   │       └── issues.controller.ts
│   ├── utils/
│   │   └── response.ts        # sendSuccess / sendError
│   ├── types/
│   │   └── index.ts           # All TypeScript interfaces
│   ├── app.ts                 # Express app setup
│   └── index.ts               # Server entry point
├── db/
│   └── init.sql               # Database initialization script
├── .env.example
├── tsconfig.json
└── package.json
```

---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/sumaiyabinterafiq97/DevPulse.git
cd DevPulse
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/devpulse
JWT_SECRET=your_super_secret_key
```

### 4. Initialize the database

Run `db/init.sql` against your PostgreSQL instance:

```bash
psql $DATABASE_URL -f db/init.sql
```

Or paste contents into NeonDB / Supabase SQL editor.

### 5. Start development server

```bash
npm run dev
```

Server runs at: `http://localhost:5000`

---

## 📮 Example API Usage

### Register a user
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@devpulse.com","password":"pass123","role":"contributor"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@devpulse.com","password":"pass123"}'
```

### Create an issue
```bash
curl -X POST http://localhost:5000/api/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: <your_token>" \
  -d '{"title":"DB timeout under load","description":"Pool exhausts after 50+ concurrent queries","type":"bug"}'
```

### Get all issues (filtered)
```bash
curl "http://localhost:5000/api/issues?sort=newest&type=bug&status=open"
```

---

## 🚨 Response Format

### Success
```json
{
  "success": true,
  "message": "Operation description",
  "data": { }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": "Error details"
}
```

---

## 👤 Author

**Sumaiya Binte Rafiq** — [@sumaiyabinterafiq97](https://github.com/sumaiyabinterafiq97)
