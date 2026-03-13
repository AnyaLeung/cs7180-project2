# InstructScan — Agile Process Documentation

This document captures the full Agile/Scrum process for InstructScan across three sprints: planning, user stories with acceptance criteria, and retrospectives.

---

## Team

- **Qiushi Liang**: Backend, Database, Auth, LLM Scanner, Deployment
- **Zhiping Zhang**: Frontend, Editor UX, AI integration, UI Components

---

# Sprint 1: Core Infrastructure & LLM Scanning Engine

## 1.1 Sprint Planning

- **Milestone**: Core Infrastructure & LLM Scanning Engine
- **Duration**: 2026-02-26 to 2026-03-04
- **Sprint Goal**: By the end of this sprint, a user should be able to log in, upload a Python file, and trigger an LLM scan that correctly identifies instruction intent in the backend.
- **Issues**: `#2`, `#3`, `#4`, `#5`, `#6`
- **Status**: 5/5 closed

### Sprint Backlog

| Issue | Type | Title | Labels |
|-------|------|-------|--------|
| #2 | chore | Initialize Postgres schema for users, files, and scans | chore |
| #3 | feat | Implement user registration and login with JWT | feature |
| #4 | feat | Implement secure .py file upload to storage | feature |
| #5 | feat | Build LLM engine to identify instruction intent | AI, feature |
| #6 | feat | Build dashboard for file listing and deletion | feature, UI |

## 1.2 User Stories with Acceptance Criteria

### US-S1-01: Initialize Database Schema (`#2`)

**As a** developer,
**I want** the core data model set up in Supabase,
**so that** the application has a stable persistence layer for users, files, and scans.

**Acceptance Criteria**:
- [x] Create `users` table (managed by Supabase Auth)
- [x] Create `files` table with fields: `id`, `user_id`, `filename`, `storage_path`, `size`
- [x] Create `scans` table with fields: `id`, `file_id`, `result_path`, `scanned_at`
- [x] Enable Row Level Security (RLS) so users can only access their own data

### US-S1-02: User Registration and Login (`#3`)

**As a** user,
**I want** to sign up and log in with email and password,
**so that** I have secure, authenticated access to the application.

**Acceptance Criteria**:
- [x] User can sign up/log in with email and password
- [x] JWT token is issued upon successful login
- [x] Protected routes return 401/403 for unauthenticated requests

### US-S1-03: Secure File Upload (`#4`)

**As a** user,
**I want** to upload Python source files for scanning,
**so that** my code is stored securely and ready for analysis.

**Acceptance Criteria**:
- [x] API accepts `.py` files only (server-side validation)
- [x] File size limit set to 5MB
- [x] Uploaded files are stored in Supabase Storage with unique paths
- [x] Success/Error feedback shown to user in the UI

### US-S1-04: LLM Instruction Detection (`#5`)

**As a** user,
**I want** the system to use AI to distinguish instructions from regular comments,
**so that** I can quickly identify actionable steps in my Python files.

**Acceptance Criteria**:
- [x] Logic to extract lines identified as being an intent while hovering
- [x] Prompt Claude to classify comments into different options such as Generate Code

### US-S1-05: File Management Dashboard (`#6`)

**As a** user,
**I want** to see and manage my uploaded files,
**so that** I can organize my workspace.

**Acceptance Criteria**:
- [x] Fetch and display list of files for the current user
- [x] Show metadata: Filename, Size, and Upload Date
- [x] Implement "Delete" action
- [x] UI reflects changes immediately after deletion

## 1.3 Sprint 1 Retrospective

### What Went Well

- Clean layered backend architecture established early (`routes -> controllers -> services -> Supabase`), which held up through all subsequent sprints without restructuring.
- Supabase setup (Postgres + Storage + RLS) was straightforward and provided immediate cloud persistence without managing infrastructure.
- TDD approach caught issues early: writing tests alongside each service (auth, files) prevented regressions during integration.
- Migration scripts kept schema changes tracked and reproducible.

### What Didn't Go Well

- **`EADDRINUSE` during tests**: The Express server tried to bind port 3001 when imported by Vitest. Root cause was `app.listen()` running unconditionally. Fix: guard with `if (require.main === module)`.
- **ESLint v9 migration**: The initial `.eslintrc.cjs` config didn't work with the project's TypeScript setup. Had to migrate to flat config (`eslint.config.js`), which cost unplanned time.
- **"Bucket not found" in file tests**: Tests failed because the Supabase Storage bucket wasn't created in test setup. Fix: added programmatic bucket creation in `beforeAll`.
- **Missing `JWT_SECRET` in test environment**: Tests returned 500 because env vars weren't set. Fix: added a test setup file that injects required env vars.

### Action Items for Sprint 2

- Document all required environment variables in `.env.example` files early.
- Add a test setup file that bootstraps env vars and Supabase state before any test suite runs.
- Establish field naming convention (`filename` not `fileName`) and enforce it from the start.

---

# Sprint 2: Interactive Code Editor & Persistence

## 2.1 Sprint Planning

- **Milestone**: Interactive Code Editor & Persistence
- **Duration**: 2026-03-04 to 2026-03-10
- **Sprint Goal**: By the end of this sprint, the results from Sprint 1 will be visualized in a web editor with highlighting and hover actions. This sprint also includes the final assignment tasks (Rules testing and Reflection).
- **Issues**: `#7`, `#8`, `#9`, `#10`, `#11`, `#12`
- **Status**: 6/6 closed

### Sprint Backlog

| Issue | Type | Title | Labels |
|-------|------|-------|--------|
| #7 | feat | Integrate IDE with Python syntax highlighting | feature, UI |
| #8 | feat | Implement frontend interaction for hover instruction actions including generation | feature, UI |
| #9 | feat | Add hover icons with tooltips to instruction lines | feature, UI |
| #10 | feat | Support multi-action instruction assistance (generate/detail/alternative) | feature, UI |
| #11 | feat | Implement authenticated file management dashboard with defaults + cloud upload + delete | docs, feature |
| #12 | docs | Perform before/after testing and write reflection (HW3) | docs |

## 2.2 User Stories with Acceptance Criteria

### US-S2-01: Python Editor Integration (`#7`)

**As a** user,
**I want** a professional code-editing environment in the browser,
**so that** I can view my Python files with proper syntax highlighting.

**Acceptance Criteria**:
- [x] Editor renders correctly on a dashboard sub-page
- [x] Supports Python syntax highlighting
- [x] Loads file content from Supabase Storage based on selection
- [x] Editor is responsive and fits within the viewport

### US-S2-02: Hover Instruction Actions (`#8`)

**As a** user,
**I want** to interact with detected instruction lines via hover controls,
**so that** I can trigger AI actions directly from the editor.

**Acceptance Criteria**:
- [x] Render clickable hover action controls on detected instruction lines
- [x] Bind click events for `write-code`, `detail-plan`, `alternative-plan`
- [x] Trigger frontend API calls with correct payload (`commentText`, `action`, `fileContent`)
- [x] Insert returned content into the editor at the expected position
- [x] Show error feedback when API fails

### US-S2-03: Hover Icons with Tooltips (`#9`)

**As a** user,
**I want** quick-action icons on highlighted instruction lines,
**so that** I can see the classification type at a glance.

**Acceptance Criteria**:
- [x] Hovering a highlighted line reveals an icon (Play/Pencil/Trash/Sparkle)
- [x] Icon corresponds to the LLM-determined instruction type
- [x] Tooltip appears on icon hover showing the classification intent
- [x] Hover button appears within <200ms

### US-S2-04: Multi-Action Instruction Assistance (`#10`)

**As a** user,
**I want** to choose between different AI assistance modes,
**so that** I can generate code, expand plans, or explore alternatives for any instruction.

**Acceptance Criteria**:
- [x] Add three actions in UI and logic: `write-code`, `detail-plan`, `alternative-plan`
- [x] Route each action to AI with the correct `action` parameter
- [x] Insert returned content in the correct format:
  - `write-code`: Python code block
  - `detail-plan`: detailed step comments
  - `alternative-plan`: alternative approach comments
- [x] Keep behavior consistent with instruction context

### US-S2-05: Authenticated File Dashboard with Defaults (`#11`)

**As a** user,
**I want** a file management page with example files and upload/delete support,
**so that** I can immediately explore the app and manage my own files.

**Acceptance Criteria**:
- [x] After login, user lands on authenticated file management page
- [x] Dashboard lists two default `.py` files for every user
- [x] Support local `.py` file upload from dashboard
- [x] Uploaded files are persisted to cloud storage and metadata is stored for the user
- [x] User can delete own uploaded files from dashboard, except for example files
- [x] Delete updates both UI state and backend persistence
- [x] Unauthorized access to dashboard/file APIs is blocked

### US-S2-06: Before/After Testing and Reflection (`#12`)

**As a** developer,
**I want** to document the impact of `.cursorrules` on AI-assisted development,
**so that** the team has evidence-based insights on rule effectiveness.

**Acceptance Criteria**:
- [x] Implement Issue #06 (Editor Integration) WITHOUT rules active
- [x] Implement Issue #06 WITH rules active
- [x] Document code quality and consistency differences
- [x] Finalize 1-2 page reflection document

## 2.3 Sprint 2 Retrospective

### What Went Well

- Hybrid AI architecture worked: backend handles full-file scan/history, frontend AI service handles line-level detect/generate. This allowed both team members to work in parallel without blocking.
- CodeMirror 6 integration with custom hover extensions and line decorations delivered a polished editor UX.
- Three distinct AI actions (`write-code`, `detail-plan`, `alternative-plan`) gave meaningful differentiation in the product demo.
- Built-in example files (`example-1`, `example-2`) injected at the API layer gave every new user an immediate hands-on experience.

### What Didn't Go Well

- **Mock API silently intercepting all requests**: `enableMockApi()` was called unconditionally in `main.tsx`, which replaced `window.fetch` globally. This caused all `/api/auth` and `/api/files` requests to hit the mock instead of the real backend. The symptom was "frontend and backend won't connect" even though proxy config was correct. Root cause was not discovered until inspecting the browser console (`[MockAPI] Enabled` log) and checking `localStorage` for `mock-jwt-token-for-...`. Fix: gated behind `VITE_USE_MOCK_API` env flag.
- **`fileName` vs `filename` field inconsistency**: Backend returned `filename` (lowercase), but frontend `FileInfo` interface used `fileName` (camelCase). This caused file names to render as `undefined` in the UI. The mismatch existed across 4 files (`useFileUpload.ts`, `FileList.tsx`, `DashboardPage.tsx`, `mockApi.ts`, `dev-server.ts`). Fix: normalized everything to `filename`.
- **Deployment friction**: Render's start command defaulted to `yarn start` instead of `npm start`. Vercel build failed because `tsconfig.app.json` included test files that imported `vitest` (not available in production `node_modules`). Fix: excluded test globs from `tsconfig.app.json`.

### Action Items for Sprint 3

- Always verify mock API is disabled before testing real backend connectivity.
- Add a field naming lint or convention check to prevent `fileName` / `filename` drift.
- Test `npm run build` locally before pushing to deployment platforms.
- Keep deployment configuration documented in README.

---

# Sprint 3: Documentation & Delivery

## 3.1 Sprint Planning

- **Milestone**: Documentation & Delivery
- **Duration**: 2026-03-10 to 2026-03-13
- **Sprint Goal**: By the end of this sprint, the project will have a finalized README, complete API documentation, a technical blog post, and a demo video ready for submission.
- **Issues**: `#15`, `#16`, `#17`
- **Status**: 3/3 closed

### Sprint Backlog

| Issue | Type | Title | Labels |
|-------|------|-------|--------|
| #15 | docs | Write technical blog post (1500 words) | docs |
| #16 | docs | Produce 10-minute demo video | docs |
| #17 | docs | Finalize README and API documentation | docs |

## 3.2 User Stories with Acceptance Criteria

### US-S3-01: Technical Blog Post (`#15`)

**As a** stakeholder,
**I want** a technical blog post documenting architecture decisions and AI usage,
**so that** the team's design rationale and lessons learned are captured.

**Acceptance Criteria**:
- [x] Covers architecture decisions and rationale
- [x] Documents AI modality usage with explanation of when and why each was used
- [x] Includes lessons learned section
- [x] Minimum 1500 words
- [x] Published or submitted as a markdown file to BlueSky

### US-S3-02: Demo Video (`#16`)

**As a** stakeholder,
**I want** a demo video showing the full application flow,
**so that** the project can be evaluated end-to-end.

**Acceptance Criteria**:
- [x] Prepare slides for presentation
- [x] Demonstrates overall flow
- [x] Video is published or public

### US-S3-03: README and API Documentation (`#17`)

**As a** developer or evaluator,
**I want** comprehensive README and API documentation,
**so that** anyone can set up, run, and understand the project.

**Acceptance Criteria**:
- [x] README includes project overview
- [x] README includes local setup instructions
- [x] README lists all required environment variables
- [x] README includes deployed production URL
- [x] API docs cover all endpoints with request and response examples

## 3.3 Sprint 3 Retrospective

### What Went Well

- PRD v1.1 delta approach (documenting changes from initial plan rather than rewriting) kept documentation honest and traceable.
- API documentation was generated directly from implemented controller/route code, ensuring accuracy.
- Sprint/issue mapping in README and PRD was synchronized with the actual GitHub board state before finalizing.
- All three documentation deliverables (blog, video, docs) were completed within the short sprint window.

### What Didn't Go Well

- Deployment verification took longer than expected due to environment variable misconfiguration on cloud platforms (missing `JWT_SECRET`, wrong `VITE_API_URL`).
- Some issues (`#8`, `#10`, `#11`) had to be rewritten mid-sprint because their original descriptions no longer matched implemented behavior. This should have been done at the start of Sprint 2 when scope changed.
- `tsconfig.app.json` not excluding test files caused Vercel build failures that were only caught during deployment, not during local development.

### Action Items (Post-Project)

- For future projects: update issue descriptions as soon as scope changes, not retroactively.
- Add a pre-deployment checklist: local build, env vars, field naming consistency, mock disabled.
- Consider consolidating hybrid AI architecture (frontend + backend AI calls) into a single backend path for simpler operations.

---

# Summary

| Sprint | Milestone | Duration | Issues | Status |
|--------|-----------|----------|--------|--------|
| 1 | Core Infrastructure & LLM Scanning Engine | 02-26 to 03-04 | #2 - #6 (5 issues) | All closed |
| 2 | Interactive Code Editor & Persistence | 03-04 to 03-10 | #7 - #12 (6 issues) | All closed |
| 3 | Documentation & Delivery | 03-10 to 03-13 | #15 - #17 (3 issues) | All closed |
