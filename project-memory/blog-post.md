# InstructScan: Building an AI-Powered Code Editor with Claude and Cursor

*By Zhiping Zhang and Qiushi Liang*

## Introduction

Data analysts who work in Python often begin a project the same way: they open an empty file and sketch out a plan as comments. "Step 1: Load the dataset from CSV." "Step 2: Clean missing values." "Step 3: Filter rows where age > 18." Each comment captures intent clearly, but the analyst must still translate every line into working code by hand. The plan and the implementation live in the same file, yet no tool connects them.

InstructScan bridges that gap. It is a full-stack web application that combines a Python code editor with Claude API to detect which comments are actionable instructions. When a user clicks on a comment line, the system classifies it in real time. If it is an instruction, three buttons appear inline: **Write Code** generates an implementation, **Detail Plan** expands the step into sub-steps, and **Alternative Plan** suggests a different approach. The generated content is inserted directly into the editor, keeping the analyst in flow.

This post describes the architecture, the AI-assisted development process we used to build it, and the evaluation results that validate the system's quality.

## System Architecture

InstructScan is a three-tier application with an LLM layer woven through both the frontend and backend.

```
Browser (React 18 + CodeMirror 6)
  |
  |-- Auth & Files ---------> Express Backend ---------> Supabase (PostgreSQL + Storage)
  |                               |
  |                               +-- Batch Scan -----> Claude API (claude-sonnet-4-6)
  |
  +-- Per-Line Detection ---> Vercel Serverless -------> Claude API (claude-sonnet-4-6)
      Code Generation
```

The **frontend** is built with React 18 and TypeScript in strict mode, styled with Tailwind CSS, and uses CodeMirror 6 as the Python editor. A custom `ViewPlugin` listens for cursor position changes. When the cursor lands on a comment line, a debounced call sends the comment text to a Vercel Serverless Function, which forwards it to Claude for classification. If Claude returns `isInstruction: true` with confidence above 0.6, action buttons render as a tooltip below the line. Clicking a button calls a second serverless function that generates code using the full file as context, so Claude can avoid duplicate imports and maintain consistency.

The **backend**, built with Node.js and Express in strict TypeScript, handles three domains. Authentication uses custom JWT tokens with bcrypt password hashing at cost factor 12. File management accepts `.py` uploads up to 5 MB via Multer, stores them in Supabase Storage, and tracks metadata in PostgreSQL. A batch scan endpoint parses all comments from an uploaded file, sends them to Claude in a single request, filters results by the 0.6 confidence threshold, and persists scan results as downloadable `.txt` files.

The architecture follows a layered pattern — `routes → controllers → services → Supabase` — with the controller layer mapping database snake_case fields to camelCase API responses. Supabase's service role key bypasses Row Level Security; access control is enforced at the application layer, where every file and scan operation verifies resource ownership.

This design gives us two layers of intelligence: batch scanning for a comprehensive overview, and per-line detection for interactive editing.

## AI-Assisted Development: Two Modalities

We built InstructScan using two complementary AI modalities, as required by the course.

**Claude Web** served as the planning modality. We used it to draft the Product Requirements Document, define user stories with acceptance criteria, plan the database schema, and make architectural decisions such as choosing Supabase over raw PostgreSQL and structuring the LLM prompt for comment classification. These planning artifacts became the source of truth for development.

**Cursor IDE** served as the implementation modality. Within the IDE, Claude generated component code, wrote tests, debugged integration issues, and refactored modules — always guided by our project configuration.

The bridge between the two modalities was the **`.cursorrules` file** — a 183-line configuration that encodes our entire project's conventions. It specifies the tech stack, folder structure, naming conventions (PascalCase for React components, camelCase for functions, kebab-case for API routes), the backend request flow pattern, testing strategy (TDD, minimum coverage targets, mandatory auth tests), LLM scanner rules (model, confidence threshold, response schema), and the Scrum workflow (branch naming, commit message format, PR conventions).

To validate the rules file's impact, we ran a controlled experiment: implementing the same Sprint 1 feature (file upload) once without rules and once with rules active. Without rules, the AI named the component `upload.tsx` in lowercase, leaked snake_case database fields like `size_bytes` into API responses, and skipped authentication tests entirely. With rules, it produced `FileUploader.tsx` in PascalCase, mapped fields to camelCase at the controller layer, and automatically generated tests for missing and invalid JWT tokens.

The key insight: the specificity of the rules file directly correlates with the quality of AI-generated code. Vague rules produce vague output; precise conventions produce production-ready code.

## Agile Process

We organized development into two sprints using GitHub Issues.

**Sprint 1** (Issues #1–#6) covered foundational infrastructure: project scaffolding, database schema and migrations, Supabase RLS policies, JWT authentication, and file upload with storage. **Sprint 2** (Issues #7–#11) focused on the core product: the LLM scanner service, the CodeMirror-based frontend editor, Vercel Serverless Functions for per-line detection and code generation, end-to-end testing, and deployment.

Every branch followed the convention `feature/7-auth-flow`. Every commit referenced an issue: `feat(auth): implement JWT login #7`. Every PR linked the issue it resolved and listed the acceptance criteria satisfied.

We divided labor by layer: Zhiping built the frontend (React, CodeMirror, Tailwind), the Vercel Serverless Functions, and the evaluation dashboard. Qiushi built the Express backend, JWT authentication, file management, the batch scan service, and the Supabase integration.

A **mock-first development strategy** enabled parallel work. The frontend included a mock API layer that handled authentication and file operations locally, while real Claude API calls powered the instruction detection. When the backend was production-ready, we connected the two with minimal friction — the mock API and the real API shared the same interface contracts.

## Testing and Evaluation

We invested heavily in testing to meet the 80%+ coverage requirement.

| Metric | Backend | Frontend |
|---|---|---|
| Statements | 91.4% | 91.8% |
| Branches | 84.9% | 82.3% |
| Functions | 96.9% | 89.0% |
| Lines | 91.4% | 92.9% |
| Tests | 96 | 136 |

The 232 tests span unit tests (Vitest for both frontend and backend), integration tests (Supertest for Express endpoints), and E2E tests (Playwright for auth flows, dashboard, and editor interactions). Backend controller tests mock service dependencies and verify every HTTP status code path. Frontend tests use React Testing Library to exercise hooks, components, and page-level interactions.

Beyond test counts, our **evaluation suite** (`scripts/evaluate.sh`) runs 11 automated checks in a single pass: backend and frontend tests with coverage, ESLint strict linting, TypeScript strict compilation, npm audit for both packages, secret detection (scanning for hardcoded API keys and unignored `.env` files), input validation audits (verifying that every endpoint validates its inputs), and auth security checks (JWT expiration, bcrypt cost factor). All 11 checks pass.

For **LLM accuracy**, we created a benchmark dataset of 40 labeled Python comments — 20 instructions (e.g., "Load the dataset from CSV," "Train a linear regression model") and 20 non-instructions (e.g., "Author: John Doe," "pylint: disable=line-too-long"). Each comment was sent through the scan-line API to Claude. Results: **100% accuracy**, precision, recall, and F1 score, with an average confidence of 98.3% and an average response time of 1,331 ms. The confusion matrix showed 20 true positives, 20 true negatives, and zero errors. All results are visualized in our evaluation dashboard, which is generated programmatically from the JSON output of the evaluation suite.

## Design Decisions and Challenges

Several technical decisions shaped the final product.

**Cursor-based detection over hover.** Our initial design used CodeMirror's `hoverTooltip` API to trigger classification when the mouse hovered over a comment. This proved unreliable for async operations — the tooltip would dismiss before Claude responded. We switched to a `ViewPlugin` that listens for cursor position changes, debounces by 300 ms, and shows the tooltip only after the async classification completes. This made the interaction deterministic and testable.

**Confidence threshold at 0.6.** Claude's classification prompt returns a confidence score between 0 and 1. We set a threshold of 0.6 to filter out ambiguous comments. Our benchmark showed the model is highly confident on clear-cut cases — 99% average for true positives, 97.6% for true negatives — suggesting the threshold could be raised in future iterations without sacrificing recall.

**Per-line vs. batch scanning.** Rather than choosing one approach, we built both. The backend's batch scan parses all comments, classifies them in a single Claude request, and stores the result as a downloadable file — useful for auditing. The frontend's per-line detection classifies one comment at a time as the user navigates — useful for interactive editing. Each serves a distinct workflow.

## Conclusion and Future Work

InstructScan demonstrates that a well-structured AI development process — anchored by a detailed rules file, rigorous evaluation, and agile practices — can produce a production-quality full-stack application. We built a complete system with JWT authentication, file management, two modes of LLM-powered instruction detection, and inline code generation, backed by 232 tests achieving over 91% statement coverage and a perfect score on our LLM accuracy benchmark.

For future work, we would extend language support beyond Python, add collaborative editing with real-time cursors, implement prompt versioning to track classification behavior over time, and explore a sandboxed execution environment so users can run generated code safely within the editor.

The source code is available on [GitHub](https://github.com/AnyaLeung/CS7180-project2).
