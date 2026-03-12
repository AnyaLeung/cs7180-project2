# Supabase 使用说明（本地不用装任何东西）

Supabase 是**云端**的 PostgreSQL + 存储，你在本机只负责写代码，数据库在人家服务器上。

## 第一步：建一个 Supabase 项目

1. 打开 **https://supabase.com**，用 GitHub 或邮箱注册/登录。
2. 点 **New project**，选一个组织（没有就新建一个）。
3. 填：
   - **Name**：随便，例如 `instruct-scan`
   - **Database password**：自己设一个，**记下来**（以后连 DB 会用到）
   - **Region**：选离你近的
4. 点 **Create new project**，等一两分钟项目建好。

## 第二步：在网页里执行建表 SQL

1. 在项目里点左侧 **SQL Editor**。
2. 点 **New query**。
3. 打开本仓库里的 **`supabase/run-migrations-in-dashboard.sql`**，全选复制，粘贴到网页的输入框。
4. 点 **Run**（或 Ctrl/Cmd + Enter）。
5. 看到 “Success. No rows returned” 就说明 `users`、`files`、`scans` 三张表都建好了。

## 第三步：拿到连接信息给后端用

1. 在项目里点左侧 **Project Settings**（齿轮图标）。
2. 点 **API**：
   - **Project URL** → 复制到后端的 `SUPABASE_URL`
   - **service_role** 下面的 **secret**（点 Reveal）→ 复制到 `SUPABASE_SERVICE_ROLE_KEY`（**不要**用 anon key，后端要用 service role）
3. 在 **backend** 目录下复制 `.env.example` 为 `.env`，把上面两个值填进去。

之后你写后端代码时，用 `@supabase/supabase-js` 连这个 URL + service_role key，就能读写这三张表和后面的 Storage。

---

**总结**：本地不用装 Supabase、也不用装 PostgreSQL，只要在 supabase.com 建项目 → SQL Editor 跑一遍 `run-migrations-in-dashboard.sql` → 把 URL 和 service_role key 填进 backend 的 `.env`。
