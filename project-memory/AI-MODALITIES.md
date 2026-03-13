# AI Modalities Used in InstructScan

This document describes how the team used two distinct AI modalities — Claude Web and Cursor IDE — throughout the project lifecycle, and why each was chosen for its respective tasks.

---

## Modality 1: Claude Web (Conversational Design & Prototyping)

The team began each major UI feature by hand-drawing wireframes that captured layout intent, component hierarchy, and interaction flow. These wireframes were then uploaded to Claude's web interface, where we used Claude Artifacts to transform rough sketches into fully rendered HTML/CSS demo pages. For example, the core editor page — featuring the CodeMirror panel, instruction sidebar, and hover-action buttons — was first prototyped as a Claude Artifact. This allowed the team to iterate on visual design, color schemes, and component placement in a rapid feedback loop without writing any production code. Once the artifact output matched our design vision, we took screenshots and saved them into the project's `project-memory/mockup/` directory as the authoritative reference for frontend implementation. Claude Web served as our design-exploration modality: high-bandwidth, conversational, and suited for open-ended creative decisions where the goal was to converge on a visual direction before committing to code.

## Modality 2: Cursor IDE (Code-Centric Implementation & Debugging)

With finalized mockup screenshots in project memory, the team switched to Cursor as the implementation modality. Cursor's inline AI agent was used for all production coding: scaffolding React components, writing Express route handlers, composing Supabase queries, and authoring Vitest test suites. The `.cursorrules` file enforced project-specific conventions (TypeScript strict mode, camelCase API responses, TDD workflow, approved library list) so that every AI-generated code suggestion was consistent with team standards. Cursor was also the primary modality for debugging — diagnosing issues like the mock API silently intercepting backend requests, resolving `fileName` vs `filename` field mismatches across multiple files, and troubleshooting deployment build failures. Where Claude Web excelled at divergent exploration and visual prototyping, Cursor excelled at convergent, context-aware code generation grounded in the actual codebase, linter feedback, and test results.
