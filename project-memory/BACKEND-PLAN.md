# InstructScan 后端与数据库实施计划

> 你负责：Backend（Node.js + Express + TypeScript）+ Database（Supabase PostgreSQL + Storage）+ Auth + LLM Scanner  
> 同事负责：React 前端。本计划只包含你需要做的部分。

---

## 前置：项目结构

当前仓库还没有 `backend/` 和 `supabase/`，需要先按 .cursorrules 搭好目录：

```
CS7180-project2/
├── project-memory/     # 已有
├── backend/
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       └── __tests__/
├── supabase/
│   └── migrations/
└── frontend/           # 同事负责
```

**Step 0（你先做）**  
- 在项目根目录创建 `backend/`、`supabase/` 及上述子目录。  
- 在 `backend/` 初始化：`npm init -y`，装好 Express、TypeScript、bcrypt、jsonwebtoken、@supabase/supabase-js、Vitest 等；配置 `tsconfig.json`（strict）、ESLint、Prettier。  
- 根目录或 backend 的 `package.json` 里要有：`npm run lint`、`npm run test`（能跑 backend 的 Vitest）。

---

## 阶段一：数据库与认证（对应 Sprint 1 中你的部分）

### 1. 数据库 Schema（#01 的一部分 / chore）

**目标**：三张表 + RLS，和 PRD Section 7 一致。

| 顺序 | 做什么 | 产出 |
|------|--------|------|
| 1.1 | 建 `users` 表 | `supabase/migrations/00001_create_users.sql` |
| 1.2 | 建 `files` 表（含 `user_id` FK，ON DELETE CASCADE） | `00002_create_files.sql` |
| 1.3 | 建 `scans` 表（含 `file_id` FK，ON DELETE CASCADE） | `00003_create_scans.sql` |
| 1.4 | 为 `files`、`scans` 写 RLS 策略：仅允许用户访问自己的数据 | `00004_rls_*.sql` 或合在一个 migration |

**字段要点**（与 PRD 一致）：  
- **users**: `id`(UUID PK), `email`(unique), `password_hash`, `created_at`  
- **files**: `id`, `user_id`, `filename`, `storage_path`, `size_bytes`, `uploaded_at`  
- **scans**: `id`, `file_id`, `scanned_at`, `result_path`, `instruction_count`, `expires_at`（scanned_at + 30 天）

### 2. 认证 API（#01、#02）

| 顺序 | 做什么 | 产出 |
|------|--------|------|
| 2.1 | POST `/auth/register`：校验 email/密码、bcrypt(≥12)、写 `users`、重复 email 返回明确错误 | `routes/auth.ts` → `controllers/authController` → `services/authService` |
| 2.2 | POST `/auth/login`：校验密码、签发 JWT（如 24h） | 同上 |
| 2.3 | JWT 中间件：从 Header 取 token、校验签名、把 `userId` 放进 `req`；无效/缺失 → 401 | `middleware/auth.ts` |
| 2.4 | 为所有「需登录」的 route 挂上该中间件；为 register/login 写单元测试 + **未认证请求返回 401** 的测试 | `__tests__/authController.test.ts` 等 |

**验收**：能注册、登录拿到 JWT；带 JWT 能访问受保护接口；不带/错误 JWT 一律 401。

---

## 阶段二：文件上传与管理（#03、#04）

### 3. Supabase Storage

| 顺序 | 做什么 | 产出 |
|------|--------|------|
| 3.1 | 在 Supabase 创建 bucket（如 `python-files`），路径按 `user_id` 隔离（如 `{user_id}/{file_id}.py`） | 控制台或 migration 中配置 |
| 3.2 | Storage RLS：用户只能读/写自己路径下的对象 | Supabase 策略 |

### 4. 文件 API

| 顺序 | 做什么 | 产出 |
|------|--------|------|
| 4.1 | POST `/files/upload`：仅接受 `.py`、≤5MB；存 Storage + 插 `files` 表；返回 camelCase（如 `sizeBytes`, `uploadedAt`） | `routes/files.ts` → controller → `fileService` |
| 4.2 | GET `/files`：列出当前用户的文件（从 DB 查，可带 storage 元数据）；返回 camelCase | 同上 |
| 4.3 | DELETE `/files/:id`：校验归属后删 Storage 对象 + 删 DB 行（scans 由 FK cascade 删除） | 同上 |
| 4.4 | 每个接口：未认证 → 401；非本人资源 → 403 | middleware + controller |
| 4.5 | 单元测试 + 未认证用例 | `__tests__/fileService.test.ts`、controller 测试 |

**验收**：上传 .py 成功、列表正确、删除后 scans 一起没；非 .py 或超 5MB 拒绝。

---

## 阶段三：LLM 扫描与结果持久化（#06、#09）

### 5. 扫描服务（核心逻辑）

| 顺序 | 做什么 | 产出 |
|------|--------|------|
| 5.1 | 从 Supabase 取文件内容（或 DB 的 `storage_path` 读 Storage） | `services/scanService.ts` 或 `fileService` |
| 5.2 | 解析出所有 `#` 开头的注释行，按行号整理 | 同文件或独立 `commentParser` |
| 5.3 | 调 Claude API（**仅** `claude-sonnet-4-6`）：对每条注释分类 instruction vs 非 instruction，类型 Run/Modify/Delete/Generate/Other，带 confidence | 同文件，prompt 版本可配置/记录 |
| 5.4 | 过滤 confidence < 0.6；返回结构：`[{ lineNumber, commentText, isInstruction, type, confidence }]` | 与 .cursorrules 一致 |
| 5.5 | 生成 scan 结果文本：文件名、扫描时间、指令列表（带行号）；上传到 Storage（如 `scan-results/{scan_id}.txt`），写 `scans` 表（`result_path`, `instruction_count`, `expires_at` = scanned_at + 30d） | 同文件 |

### 6. 扫描与历史 API

| 顺序 | 做什么 | 产出 |
|------|--------|------|
| 6.1 | POST `/files/:id/scan`：校验文件归属 → 调扫描服务 → 写 DB + 存 txt → 返回本次 scan 的指令列表（供前端高亮和 sidebar） | `routes/files.ts` 或 `routes/scans.ts` → controller → scanService |
| 6.2 | GET `/files/:id/scans`：列出该文件的所有 scan（时间、id 等），camelCase | 同上 |
| 6.3 | GET `/scans/:id/download`：校验 scan 归属 → 从 Storage 取 txt 并返回（或 302 到 signed URL） | 同上 |
| 6.4 | 每个接口未认证 → 401、非本人 → 403；扫描服务单测（可 mock Claude） | `__tests__/scanService.test.ts` 等 |

**验收**：前端触发 scan 能拿到高亮数据；scan history 能列出并下载 .txt；结果格式与 PRD/US-05 一致。

---

## 阶段四：收尾与联调

### 7. 环境与安全

| 顺序 | 做什么 |
|------|--------|
| 7.1 | 所有敏感信息放 `.env`（Supabase URL/Key、JWT secret、Claude API key），`.gitignore` 含 `.env` |
| 7.2 | 跨域：Express 对前端 origin（如 Vercel 域名）开启 CORS |
| 7.3 | 日志中不打印密码、token、完整 API key |

### 8. 与前端对齐

| 顺序 | 做什么 |
|------|--------|
| 8.1 | 和同事确认：Base URL、Auth Header 格式（如 `Authorization: Bearer <token>`）、错误响应格式（如 `{ message, code }`） |
| 8.2 | 列表/详情接口的字段名统一 camelCase（与 .cursorrules 一致） |
| 8.3 | 若前端需要「获取文件内容」用于编辑器：增加 GET `/files/:id` 或 `/files/:id/content`，返回文件内容或下载 URL（需校验归属） |

### 9. 30 天过期（P2，可后做）

| 顺序 | 做什么 |
|------|--------|
| 9.1 | 定时任务（Supabase Edge Function 或外部 cron）：查 `expires_at < now()` 的 scans，删 Storage 文件、更新或删除 DB 记录 |
| 9.2 | 如需「删除前通知」：在过期前 N 天发邮件/站内通知（可留接口或队列） |

---

## 建议执行顺序（按周）

| 周 | 你做的事 |
|----|----------|
| **Week 1** | Step 0（搭 backend + supabase 目录与依赖）→ 1.1–1.4 全部 migrations → 2.1–2.4 认证 + JWT 中间件 + 测试 |
| **Week 2** | 3.1–3.2 Storage + RLS → 4.1–4.5 文件上传/列表/删除 API + 测试 |
| **Week 3** | 5.1–5.5 扫描服务（含 Claude 集成与结果 txt）→ 6.1–6.4 扫描与历史 API + 测试 |
| **Week 4** | 7.1–7.3 环境与安全 → 8.1–8.3 与前端联调 → 可选 9.1–9.2 |

---

## 自检清单（每个阶段做完）

- [ ] `npm run lint` 通过  
- [ ] `npm run test`（backend）通过，且所有受保护接口都有「未认证 → 401」用例  
- [ ] 未使用 `any`（或已注释说明）  
- [ ] API 响应均为 camelCase  
- [ ] 密码仅 bcrypt 存储，JWT 仅从 env 读 secret  

按这个顺序做，你可以和同事并行：他做页面和调用，你提供稳定接口和数据库。
