# InstructScan (CS7180 Project 2)

InstructScan is a full-stack web app for uploading Python files, detecting instruction-like comments with Claude, and reviewing scan results in an editor workflow.

This repository follows an Agile/Scrum workflow with issue-scoped branches, sprint-scoped delivery, and test-gated completion.

## Team and Scope

- **Frontend** (Zhiping Zhang): React + TypeScript + CodeMirror-based editor UX
- **Backend** (Qiushi Liang): Express + TypeScript API for auth, files, and scans
- **Data layer** (Qiushi Liang): Supabase PostgreSQL + Supabase Storage
- **LLM** (Zhiping Zhang): Claude for instruction classification

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, CodeMirror 6
- **Backend**: Node.js, Express, TypeScript, bcrypt, jsonwebtoken, multer
- **Database/Storage**: Supabase (Postgres + Storage + RLS)
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel (frontend), Render (backend), Supabase (DB/Storage)

## Repository Structure

```text
CS7180-project2/
├── frontend/                  # React app
├── backend/                   # Express API
├── supabase/                  # SQL migrations and setup scripts
├── project-memory/            # PRD and planning docs
└── README.md
```

## Current Architecture

- Request flow: `routes -> controllers -> services -> Supabase`
- Auth is JWT-based (`Authorization: Bearer <token>`)
- Protected routes enforce 401 (missing/invalid JWT) and ownership checks
- File storage path convention: `python-files/<user_id>/<file_id>.py`
- Scan results are persisted and downloadable as `.txt`
- Two built-in example Python files are injected at API list level for every user (not persisted in DB)

## Agile/Scrum Workflow

### Sprint Breakdown

- **Sprint 1**: issues `#01` to `#06`
  - DB schema and migrations
  - Auth APIs and JWT middleware
  - File upload/list/delete baseline
  - Initial scan pipeline
- **Sprint 2**: issues `#07` to `#11`
  - Frontend/backend integration hardening
  - Scan UX improvements and history/download flow
  - Deployment and end-to-end stabilization
- **Sprint 3 (Documentation & Delivery)**: issues `#15` to `#17`
  - Technical blog post deliverable (1500 words)
  - 10-minute demo video deliverable
  - Finalized README and API documentation

### Branch and Commit Conventions

- Branch naming: `type/issueNumber-short-description`
  - Example: `feature/7-auth-flow`
- Commit format: `type(scope): description #issueNumber`
  - Example: `feat(auth): implement JWT login #7`
- One issue per branch/PR whenever possible

### Definition of Done (per issue/sprint)

- `npm run lint` passes
- `npm run test` passes (frontend + backend)
- `npm run test:e2e` passes (frontend)
- Required unauthenticated tests (401) are present for protected endpoints
- Environment variables and deployment config are documented
- For documentation sprint issues, deliverables are attached/linked in the issue or PR:
  - README/API docs updates
  - demo video link
  - technical blog post link

## API Overview

Base path: `/api`

- **Auth**
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- **Files**
  - `POST /api/files` and `POST /api/files/upload`
  - `GET /api/files`
  - `GET /api/files/:id/content`
  - `DELETE /api/files/:id`
- **Scans**
  - `POST /api/files/:id/scan`
  - `GET /api/files/:id/scans`
  - `GET /api/scans/:id/download`

## Local Development

### 1) Install dependencies

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

### 2) Configure environment variables

Create the following local files:

- `backend/.env` (from `backend/.env.example`)
- `frontend/.env.local` (from `frontend/.env.example`)

Backend required vars:

- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

Frontend common vars:

- `VITE_API_URL` (empty for local proxy mode, deployed backend URL in production)
- `VITE_USE_MOCK_API=false` (set `true` only when intentionally using local mock mode)
- `ANTHROPIC_API_KEY` (needed for local line-level AI dev server)

### 3) Run services

```bash
# backend (port 3001)
cd backend
npm run dev

# frontend app (port 5173)
cd frontend
npm run dev

# optional: frontend AI dev server (port 3002)
cd frontend
npm run dev:api
```

## Deployment

### Backend (Render)

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Set env vars from `backend/.env.example`

### Frontend (Vercel)

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Required env:
  - `VITE_API_URL=<your-backend-url>`
  - `VITE_USE_MOCK_API=false`
  - `ANTHROPIC_API_KEY` (if line-level AI is enabled)

## Quality Gates

Run before merging:

```bash
# backend
cd backend && npm run lint && npm run test

# frontend
cd frontend && npm run lint && npm run test && npm run test:e2e
```

## Security Notes

- Never commit `.env` files or secrets
- Passwords are stored as bcrypt hashes only
- JWT secret must be set in runtime environment
- Uploaded Python files are treated as data only; they are never executed