# InstructScan — 10-Minute Demo Video Script

> Format: Slides (Keynote/Google Slides) + Screen Recording
> Speakers: Zhiping Zhang, Qiushi Liang

---

## Section 1: Opening & Motivation (0:00 - 1:30)

### [Slide 1 — Title] (0:00 - 0:15)

> "Hi, we're Zhiping and Qiushi. Today we're presenting InstructScan — an AI-powered code editor that helps data analysts turn their analysis plans into working Python code."

### [Slide 2 — The Problem] (0:15 - 0:50)

> "When data analysts work in Python, they often start by writing a plan as comments — step 1: load the data, step 2: clean missing values, step 3: filter, and so on. These comments describe what they *want* to do, but they still have to manually write all the code underneath each step. This is repetitive and breaks their flow of thinking."

### [Slide 3 — The Solution] (0:50 - 1:30)

> "InstructScan solves this. It's a web-based Python editor that uses Claude API to detect which comments are actionable instructions. When you click on one, you get three options: Write Code — to generate the implementation, Detail Plan — to break the step into sub-steps, or Alternative Plan — to suggest a different approach. Everything happens inline, directly in the editor."

---

## Section 2: System Design (1:30 - 3:00)

### [Slide 4 — Architecture] (1:30 - 2:15)

> "Here's our full-stack architecture."
>
> "The **frontend** is built with React 18, TypeScript in strict mode, Tailwind CSS for styling, and CodeMirror 6 for the Python code editor. When the user clicks on a comment line, the frontend sends it to a Vercel Serverless Function, which calls Claude API — specifically the claude-sonnet-4-6 model — to classify whether it's an instruction."
>
> "The **backend**, built by Qiushi, is a Node.js Express server also in strict TypeScript. Authentication uses custom JWT tokens with bcrypt for password hashing — cost factor 12. All data lives in Supabase: PostgreSQL for the database, and Supabase Storage for uploaded Python files and scan result files."
>
> "The backend uses Supabase's **service role key**, which bypasses Row Level Security. Access control is enforced in the application layer — every file and scan operation checks that the requesting user owns the resource."

**Slide content — Architecture diagram:**

```
Browser (React + CodeMirror 6)
  │
  ├── POST /auth/register, /auth/login     → Express Backend → Supabase users table
  ├── POST /files/upload, GET /files        → Express Backend → Supabase Storage + files table
  ├── POST /files/:id/scan                  → Express Backend → Claude API + scans table
  │
  └── POST /api/scan-line (per-line)        → Vercel Serverless → Claude API
      POST /api/generate (code generation)  → Vercel Serverless → Claude API
```

### [Slide 5 — Design Evolution] (2:15 - 3:00)

> "Our design evolved from the original mockup. The initial design had a Run Scan button that would batch-scan the entire file, a sidebar listing all detected instructions, and tabs for History and Settings."
>
> "We kept the batch scan capability in the backend — `POST /files/:id/scan` parses all comment lines, sends them to Claude, and stores the results. But for the frontend interaction, we added something more intuitive: real-time per-line detection. When you click on any comment line, Claude classifies it instantly, and if it's an instruction, you get three action buttons right there."
>
> "So we have two layers of intelligence: batch scanning for an overview, and per-line detection for interactive editing."

---

## Section 3: Live Product Demo (3:00 - 7:00)

### [Screen Recording — Login] (3:00 - 3:20)

> "Let me show you the product. Here's our login page — clean dark theme with the InstructScan branding. I'll sign in with my account."
>
> *(Type email, password, click Sign in, transition to dashboard)*
>
> "Behind the scenes, this calls `POST /auth/login`, which looks up the user in Supabase, verifies the password with bcrypt, and returns a JWT token that expires in 24 hours."

### [Screen Recording — Dashboard] (3:20 - 4:00)

> "This is the file dashboard. It shows all my uploaded Python files — each with filename and size. Let me upload a new one."
>
> *(Drag-drop a .py file, show it appear in the list)*
>
> "The upload goes through `POST /files/upload` with Multer handling the multipart form. The backend validates it's a .py file under 5 megabytes, stores it in Supabase Storage under a path like `{userId}/{fileId}.py`, and creates a record in the files table."

### [Screen Recording — Editor Overview] (4:00 - 4:30)

> "I'll click on analysis_plan.py to open it in the editor. On the left we have the file sidebar — I can switch between files by clicking. The center is a full CodeMirror 6 editor with Python syntax highlighting. I can also upload new files directly from the sidebar using this button at the bottom."
>
> *(Click between files, show the Open new file button)*

### [Screen Recording — Instruction Detection] (4:30 - 5:30)

> "Now here's the core feature. This file has a data analysis plan written as comments. Watch what happens when I click on line 1 — 'Step 1: Load the dataset from CSV'."
>
> *(Click on the comment line, wait for buttons to appear)*
>
> "After about a second, three buttons appear below the line. InstructScan sent this comment to Claude via our Vercel Serverless Function. Claude classified it as an actionable instruction with high confidence — above the 0.6 threshold we set."
>
> "Now let me click on line 9 — 'This is just a regular comment, not an instruction'."
>
> *(Click on line 9, show no buttons appear)*
>
> "No buttons. Claude correctly identified that this is descriptive text, not something the user intends to implement. Same thing for 'Author: demo user' — that's metadata, not a plan step."

### [Screen Recording — Write Code] (5:30 - 6:15)

> "Let's go back to an instruction line. I'll click on 'Step 1: Load the dataset from CSV' and hit Write Code."
>
> *(Click Write Code, show generated code appearing in the editor)*
>
> "Claude generated pandas code — read_csv, shape check, head preview. Notice it uses the full file as context, so it knows pandas is already imported and doesn't duplicate the import. The code is inserted directly below the comment."

### [Screen Recording — Detail Plan] (6:15 - 6:40)

> "Now let me try Detail Plan on 'Step 3: Filter rows where age > 18'."
>
> *(Click Detail Plan, show sub-steps appearing)*
>
> "Claude expanded the high-level step into specific sub-steps — check the column exists, handle missing values, apply the filter, log how many rows were removed. These are all comments, so I could click on any of them to generate code."

### [Screen Recording — Alternative Plan] (6:40 - 7:00)

> "Finally, Alternative Plan on 'Step 4: Compute summary statistics'."
>
> *(Click Alternative Plan, show alternative approach appearing)*
>
> "Instead of a simple describe(), Claude suggests grouping by category, using percentiles, or creating a visual summary. This helps analysts consider approaches they might not have thought of."

---

## Section 4: AI-Assisted Development Process (7:00 - 9:00)

### [Slide 6 — The .cursorrules File] (7:00 - 7:45)

> "Now let's talk about how we built this. A key part of our process was the .cursorrules file — a configuration file that tells the Cursor AI assistant exactly how to write code for our project."
>
> "It defines our full tech stack, folder structure, and naming conventions — PascalCase for React components, camelCase for functions and API responses, kebab-case for API routes. It specifies that API controllers must map database snake_case fields like `size_bytes` and `uploaded_at` to camelCase equivalents."
>
> "It also has LLM-specific rules: always use claude-sonnet-4-6, confidence threshold of 0.6, structured JSON response format. And testing rules: TDD approach, 70% minimum coverage, always test unauthenticated requests for protected endpoints."
>
> "Think of it as the project's constitution — every time the AI generates code, it follows these rules."

### [Slide 7 — With vs Without Rules] (7:45 - 8:30)

> "To test whether the rules file actually makes a difference, we implemented the same feature twice — once without rules and once with rules."
>
> "Without rules, the AI named the upload component 'upload.tsx' in lowercase, leaked snake_case database fields into API responses, and didn't write any authentication tests."
>
> "With rules, it created 'FileUploader.tsx' in PascalCase, mapped snake_case to camelCase at the controller layer — just like our backend does with Supabase fields — and automatically included tests for missing and invalid JWT tokens."
>
> "The rules file didn't just improve code style — it ensured the AI understood our architecture patterns and security requirements."

### [Slide 8 — GitHub Scrum Workflow] (8:30 - 9:00)

> "We organized our work using GitHub Issues across three sprints. Sprint 1 covered project setup, database schema, auth, and file upload. Sprint 2 covered the editor integration, hover actions, multi-action AI assistance, and the authenticated file dashboard. Sprint 3 focused on documentation and delivery — the blog post, this demo video, and finalizing README and API docs."
>
> "Every branch follows the naming convention — feature/7-auth-flow. Every commit references an issue — feat(auth): implement JWT login #7. Every PR links to the issue it resolves."
>
> "Division of labor: Zhiping handled the frontend — React, CodeMirror, Tailwind — plus the Vercel Serverless Functions for per-line Claude detection and code generation. Qiushi built the Express backend — auth with JWT and bcrypt, file management with Supabase Storage, and the batch scan service that parses comments and calls Claude. We tested and integrated together."

---

## Section 5: Wrap-up (9:00 - 10:00)

### [Slide 9 — What We Built] (9:00 - 9:30)

> "To summarize: we built a full-stack AI-powered code editor. The backend handles authentication, file storage, and batch scanning — all with proper ownership checks and a clean service layer architecture. The frontend provides a real-time editing experience where clicking on any comment triggers Claude-powered classification, with three types of code generation actions."
>
> "Our mock-first architecture let us develop the frontend independently — mock API handled auth and files, while real Claude calls powered the instruction detection. When the backend was ready, we connected them."

### [Slide 10 — Challenges & What's Next] (9:30 - 10:00)

> "Some challenges: CodeMirror's hover API didn't work reliably for async operations, so we switched to cursor-based detection — clicking a line instead of hovering. The mock API silently intercepting all requests was a tricky debugging session — we had to gate it behind an env flag. We also learned that the specificity of your rules file directly correlates with AI code quality — vague rules produce vague code."
>
> "The app is now deployed — frontend on Vercel, backend on Render, data on Supabase — and the frontend is connected to the real backend. For future work: improved Claude prompts for even better code generation, and more instruction types and actions."
>
> "Thank you for watching. The code is on GitHub, and we're happy to take any questions."

---

## Recording Notes

- **Demo file**: Use `analysis_plan.py` with a good mix of instruction and non-instruction comments
- **Before recording**: Ensure `npm run dev:api` is running with a valid `ANTHROPIC_API_KEY`
- **Pacing**: Pause briefly after each Claude response so viewers can read the output
- **Fallback**: If Claude is slow, do multiple takes and pick the best one
- **Screen**: Record at 1920x1080, use Chrome in a clean window (no bookmarks bar, no extensions)
- **Slides**: Use a dark theme to match the app aesthetic
- **Backend demo**: Use the deployed backend (Render) with real login/upload — mock API should be disabled
