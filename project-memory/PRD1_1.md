# InstructScan Product Requirements Document (PRD) v1.1

## 1. Document Status

- **Version**: v1.1
- **Type**: Scope alignment update from initial PRD during Agile delivery
- **Purpose**: Keep product scope, API contract, and sprint deliverables consistent with implemented behavior

## 2. Why v1.1 (Delta from Initial PRD)

The team delivered through iterative sprints and introduced implementation-informed changes. This update captures those product-level deltas.

### 2.1 Change Summary

| Area | Initial Direction | v1.1 Direction |
|---|---|---|
| File source | User uploads only | User uploads + two built-in example Python files shown to every user |
| Persistence model | File + scan persistence planned | Implemented on Supabase Storage + Postgres with ownership checks |
| Scan output UX | Download flow emphasized in earlier plan | Scan runs and history are core; download is available via backend API, UI-level download control can vary by release |
| AI capabilities | Whole-file instruction scan | Whole-file scan (backend) + line-level instruction detection + generation actions (`write-code`, `detail-plan`, `alternative-plan`) |
| AI architecture | Single-path not fixed | Hybrid: backend handles full-file scan/history; frontend AI service handles line-level detect/generate |

### 2.2 Product Decision

- These are treated as **official v1.1 scope**, not temporary hacks.
- Any future consolidation of AI calls to backend is tracked as a later architecture improvement, not a blocker for current MVP.

## 3. Product Goals

1. Help users identify actionable instruction comments in Python files.
2. Provide secure, per-user file and scan management.
3. Support lightweight AI assistance directly in the editor for local instruction-centric workflows.
4. Maintain shippable increments per sprint with clear acceptance criteria.

## 4. Users and Core Use Cases

### 4.1 Primary User

- Student/developer who uploads Python scripts and wants to quickly extract and act on instruction-like comments.

### 4.2 Core Use Cases

1. Register/login and manage authenticated workspace.
2. Open example files immediately or upload own `.py` files.
3. Trigger full-file scan to classify comment lines.
4. Review scan results in editor/side panel and scan history.
5. Use line-level AI actions to generate code or planning suggestions from comment context.

## 5. Scope (v1.1)

### 5.1 In Scope

- JWT auth (`register`, `login`, protected routes)
- File upload/list/content/delete with ownership enforcement
- Two built-in example Python files for every user (non-DB metadata, API-provided)
- Full-file instruction scan via Claude (`claude-sonnet-4-6`)
- Confidence filtering (`>= 0.6`) and typed labels (`Run`, `Modify`, `Delete`, `Generate`, `Other`)
- Scan history listing and backend download endpoint
- Line-level AI capabilities in editor:
  - instruction detection (`/api/scan-line`)
  - content generation (`/api/generate`) with actions:
    - `write-code`
    - `detail-plan`
    - `alternative-plan`

### 5.2 Out of Scope (Current)

- Executing uploaded Python code
- Team collaboration/multi-user shared files
- Realtime co-editing
- Production-grade analytics/dashboarding

## 6. Functional Requirements

### FR-1 Authentication

- Users can register and login.
- Protected APIs require valid bearer JWT.
- Missing/invalid token returns `401`.

### FR-2 File Management

- Accept `.py` uploads only, max 5MB.
- List includes:
  - built-in example files
  - user-owned persisted files
- User can fetch file content and delete owned persisted files.

### FR-3 Instruction Scan (Full File)

- Parse Python comments and classify each candidate.
- Use model `claude-sonnet-4-6`.
- Return structured JSON items:
  - `lineNumber`
  - `commentText`
  - `isInstruction`
  - `type`
  - `confidence`
- Hide comments below threshold `0.6`.

### FR-4 Scan Persistence and Retrieval

- Save scan metadata and generated result artifact.
- Support scan history retrieval by file.
- Support backend download endpoint for a scan result text artifact.

### FR-5 Editor AI Assistance

- Line-level detect endpoint to classify a single comment in editing flow.
- Generate endpoint to return AI text output for chosen action:
  - `write-code`, `detail-plan`, `alternative-plan`

## 7. Data Model (v1.1)

### 7.1 Persisted Tables

- `users`
  - `id`, `email`, `password_hash`, `created_at`
- `files`
  - `id`, `user_id`, `filename`, `storage_path`, `size_bytes`, `uploaded_at`
- `scans`
  - `id`, `file_id`, `scanned_at`, `result_path`, `instruction_count`, `expires_at`

### 7.2 Storage

- Bucket for python files (private)
- Bucket path convention uses user isolation (`{user_id}/{file_id}.py`)
- Scan result artifacts stored under scan-specific prefix

### 7.3 Non-Persisted Product Data

- Two example Python files are injected by service logic and are not written to DB.

## 8. API Reference (Current Contract)

### 8.1 Backend APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/files` (or `/api/files/upload`)
- `GET /api/files`
- `GET /api/files/:id/content`
- `DELETE /api/files/:id`
- `POST /api/files/:id/scan`
- `GET /api/files/:id/scans`
- `GET /api/scans/:id/download`

### 8.2 Frontend AI Service APIs (line-level workflow)

- `POST /api/scan-line`
- `POST /api/generate`

## 9. Non-Functional Requirements

- TypeScript strict mode (frontend/backend)
- Per-user isolation via auth + ownership checks (+ RLS posture in Supabase)
- Secret management through environment variables only
- No plaintext credential storage
- No execution of user-provided Python code

## 10. Acceptance Criteria (v1.1)

1. User can login and access protected file APIs with JWT.
2. File list shows two example files plus user-owned uploaded files.
3. Uploading invalid type/oversized file is rejected with clear error.
4. Full-file scan returns typed instruction results with confidence and threshold filtering.
5. Scan history endpoint returns prior scans for selected file.
6. Scan download endpoint is available for authorized users.
7. Editor line-level AI actions return generated outputs for all three supported actions.
8. Unauthorized access attempts to protected endpoints return `401`.

## 11. Sprint Mapping

### Sprint 1 (`#2` to `#6`)

- Schema, auth, secure upload/storage, and baseline file APIs

### Sprint 2 (`#7` to `#12`)

- IDE integration + instruction highlighting and hover interactions
- Multi-action instruction assistance (`generate`, `detail`, `alternative`)
- Authenticated file management dashboard (default examples + cloud upload + delete)
- Before/after testing and reflection write-up

### Sprint 3: Documentation & Delivery (`#15` to `#17`)

- Technical blog post
- Demo video
- Final README/API docs consolidation

### Current Status Snapshot

- Open issues: `#16`, `#17`
- Closed issues: `#2` to `#12`, `#15`
