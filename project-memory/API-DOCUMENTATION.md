# InstructScan API Documentation (Current Implementation)

This document describes the API surface that is implemented today across:

- **Backend API** (`backend/src`, mounted under `/api`)
- **Frontend AI service endpoints** (`frontend/api`) used for line-level detection and generation

## 1) Base URLs

### Local development

- Backend API: `http://localhost:3001`
- Frontend app: `http://localhost:5173`
- Frontend AI dev server (optional): `http://localhost:3002`

When using Vite proxy in local frontend dev:
- `/api/auth`, `/api/files`, `/api/scans` -> backend (`3001`)
- `/api/scan-line`, `/api/generate` -> frontend AI server (`3002`)

### Production

- Backend API base: your deployed backend URL (Render)
- Frontend AI endpoints (`/api/scan-line`, `/api/generate`) are served from frontend deployment (Vercel serverless) if enabled

## 2) Auth and Request Conventions

- Auth scheme: `Authorization: Bearer <jwt>`
- Protected endpoints return `401` when token is missing/invalid.
- Backend JSON error format uses:
  - `{ "message": "..." }`
- Frontend AI endpoints JSON error format uses:
  - `{ "error": "..." }`

## 3) Backend API

### 3.1 Health

#### GET `/health`

- Auth: No
- Response `200`
```json
{ "status": "ok" }
```

---

### 3.2 Auth

#### POST `/api/auth/register`

- Auth: No
- Body
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```
- Response `201`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "token": "jwt-token"
}
```
- Errors
  - `400` invalid email/password
  - `400` duplicate email (`Email already registered`)

#### POST `/api/auth/login`

- Auth: No
- Body
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```
- Response `200`
```json
{ "token": "jwt-token" }
```
- Errors
  - `400` invalid request body
  - `401` invalid credentials

#### GET `/api/auth/me`

- Auth: Yes
- Response `200`
```json
{ "userId": "uuid" }
```

---

### 3.3 Files

> File object shape returned by backend:
```json
{
  "id": "string",
  "filename": "script.py",
  "storagePath": "user-id/file-id.py",
  "sizeBytes": 1234,
  "uploadedAt": "2026-03-12T00:00:00.000Z"
}
```

#### POST `/api/files`
#### POST `/api/files/upload`

Both endpoints are supported and perform the same upload behavior.

- Auth: Yes
- Content-Type: `multipart/form-data`
- Form field: `file`
- Constraints:
  - only `.py`
  - max `5MB`
- Response `201`
```json
{
  "id": "uuid",
  "filename": "script.py",
  "storagePath": "user-id/uuid.py",
  "sizeBytes": 42,
  "uploadedAt": "2026-03-12T00:00:00.000Z"
}
```
- Errors
  - `400` no file uploaded
  - `400` wrong extension / too large
  - `401` unauthorized

#### GET `/api/files`

- Auth: Yes
- Response `200` (array)
```json
[
  {
    "id": "example-1",
    "filename": "analysis_plan.py",
    "storagePath": "examples/example-1.py",
    "sizeBytes": 350,
    "uploadedAt": "1970-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "filename": "uploaded.py",
    "storagePath": "user-id/uuid.py",
    "sizeBytes": 123,
    "uploadedAt": "2026-03-12T00:00:00.000Z"
  }
]
```

Notes:
- API injects two built-in example files (`example-1`, `example-2`) for every authenticated user.

#### GET `/api/files/:id/content`

- Auth: Yes
- Response `200`
```json
{
  "content": "# python file text..."
}
```
- Errors
  - `401` unauthorized
  - `403` forbidden
  - `404` file not found

#### DELETE `/api/files/:id`

- Auth: Yes
- Response `204` (no body)
- Errors
  - `401` unauthorized
  - `403` forbidden
  - `404` file not found

---

### 3.4 Scans

Instruction item shape:
```json
{
  "lineNumber": 12,
  "commentText": "# Step 1: Load data",
  "isInstruction": true,
  "type": "Generate",
  "confidence": 0.91
}
```

`type` values: `Run | Modify | Delete | Generate | Other | null`

#### POST `/api/files/:id/scan`

- Auth: Yes
- Behavior:
  - reads file content
  - parses comment lines
  - calls Claude model `claude-sonnet-4-6`
  - filters by confidence threshold `>= 0.6`
  - stores scan result text + DB record
- Response `200`
```json
{
  "scanId": "uuid",
  "instructions": [
    {
      "lineNumber": 1,
      "commentText": "# Step 1: Load data",
      "isInstruction": true,
      "type": "Run",
      "confidence": 0.93
    }
  ],
  "instructionCount": 1,
  "scannedAt": "2026-03-12T00:00:00.000Z"
}
```
- Errors
  - `401` unauthorized
  - `403` forbidden
  - `404` file not found
  - `500` service/AI/storage failure

#### GET `/api/files/:id/scans`

- Auth: Yes
- Response `200`
```json
[
  {
    "id": "scan-uuid",
    "fileId": "file-uuid",
    "scannedAt": "2026-03-12T00:00:00.000Z",
    "instructionCount": 3,
    "resultPath": "scan-results/scan-uuid.txt"
  }
]
```
- Errors
  - `401` unauthorized
  - `403` forbidden
  - `404` file not found

#### GET `/api/scans/:id/download`

- Auth: Yes
- Response `200`
  - `Content-Type: text/plain`
  - `Content-Disposition: attachment; filename="scan-<id>.txt"`
  - body: plain text scan result
- Errors
  - `401` unauthorized
  - `403` forbidden
  - `404` scan not found

## 4) Frontend AI Endpoints (Line-Level Workflow)

These endpoints are implemented in `frontend/api` and used by editor interactions.

### 4.1 POST `/api/scan-line`

- Auth: No (key-based server env access)
- Body
```json
{
  "commentText": "# Step 1: Load the dataset"
}
```
- Response `200`
```json
{
  "isInstruction": true,
  "confidence": 0.88
}
```
- Errors
  - `400` missing `commentText`
  - `405` wrong method
  - `500` missing `ANTHROPIC_API_KEY` or model/runtime error

### 4.2 POST `/api/generate`

- Auth: No (key-based server env access)
- Body
```json
{
  "commentText": "# Clean missing values",
  "action": "write-code",
  "fileContent": "# full python file content..."
}
```

`action` must be one of:
- `write-code`
- `detail-plan`
- `alternative-plan`

- Response `200`
```json
{
  "generatedText": "\n# ...or code/text...\n"
}
```
- Errors
  - `400` missing/invalid `commentText`, `action`, or `fileContent`
  - `405` wrong method
  - `500` missing `ANTHROPIC_API_KEY` or generation error

## 5) Notes for Integrators

- Frontend state stores JWT under `localStorage["token"]`.
- Field naming has been normalized to `filename` (not `fileName`) for file objects.
- Backend and frontend AI endpoints use different error-key conventions (`message` vs `error`), so clients should handle both.
- If desired, future cleanup can standardize error schema across all APIs.
