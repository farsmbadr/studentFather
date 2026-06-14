# CenterMasr — Session Progress

## Goal
Build a one-click Windows desktop ERP (CenterMasr) and separate parent/student portal into a free hosted website (Vercel + Supabase).

## Constraints & Preferences
- Client must NOT install anything — double-click only
- **Database**: SQLite via `sql.js/dist/sql-asm.js` (asm.js fallback, no WASM), stored at `%APPDATA%/CenterMasr/data.db`
- **Server**: Express (port 3001) serving bundled React frontend from `dist/`
- **Backend**: `server/index.mjs` — all CRUD, auth, backup/restore, license in one file
- **Schema/seed data**: Bundled as `server/init-sql.js` (ES module, imported directly — no file reads, works with pkg snapshot)
- **Desktop Frontend**: Vite + React + Tailwind, built to `dist/`
- **Portal Frontend**: Vite + React + Tailwind + React Router, in `parent-portal/`, deployed to Vercel
- **Portal database**: Supabase (PostgreSQL) — schema in `parent-portal/supabase/001_portal_schema.sql`
- **Desktop packaging**: `@yao-pkg/pkg` bundles Node.js runtime + all JS into `CenterMasrServer.exe`
- **Installer**: Inno Setup (`installer.iss`) — compiles to `CenterMasr-Setup.exe`
- **Launcher**: `launcher.vbs` — runs server as hidden background process, opens browser
- **Auto-start**: Optional (checkbox in installer) — adds HKCU\Run registry entry → `wscript.exe launcher.vbs`
- **Stop server**: Start Menu shortcut → `wscript.exe stop-server.vbs` (runs `taskkill`)
- **Port**: 3001 hard-coded (installer checks for conflict and offers to kill existing server)
- All IDs are SQLite UUIDs (generated via SQLite `hex()`/`randomblob()`); Supabase uses `uuid_generate_v4()`
- Arabic UI throughout; RTL layout
- All relation matching done client-side (no joins)

## Build Commands
```bash
# Desktop app
npm run build                                           # Build frontend → dist/
npx @yao-pkg/pkg . --output CenterMasrServer.exe       # Build .exe
iscc installer.iss                                      # Build installer

# Portal app (deploy to Vercel)
cd parent-portal
npm install                                             # Install deps
npm run build                                           # Build → parent-portal/dist/
vercel --prod                                           # Deploy to Vercel
```

## Delivery Package (`CenterMasr-Delivery/`)
```
CenterMasr-Delivery/
├── CenterMasr-Setup.exe    ← Installer (28 MB — give this to client)
├── CenterMasrServer.exe    ← Standalone server (137 MB, can run directly)
├── dist/                   ← Desktop frontend (served by server)
└── start-center.bat        ← Fallback launcher (cmd window, optional)
```

## Portal Structure (`parent-portal/`)
```
parent-portal/
├── src/
│   ├── main.tsx                ← Entry with BrowserRouter
│   ├── App.tsx                 ← Routes for /parent, /student, /take-exam/:examId
│   ├── supabaseClient.ts       ← Real Supabase client (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
│   ├── types.ts                ← Portal-specific TypeScript types
│   ├── pages/
│   │   ├── ParentLogin.tsx     ← Login via code + parent_phone
│   │   ├── ParentDashboard.tsx ← Student data, payments, exams, absence, notes, books, messages
│   │   ├── StudentLogin.tsx    ← Login via code + phone
│   │   ├── StudentDashboard.tsx← Student data, payments, exams, absence, notes, books
│   │   └── TakeExam.tsx        ← Exam taking + review mode (already uses supabase directly)
│   └── index.css               ← Tailwind directives
├── supabase/
│   └── 001_portal_schema.sql   ← Schema migration (11 tables + RLS policies)
├── .env.example                ← VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
├── package.json
└── vite.config.ts
```

## Desktop Sync to Cloud
- **Settings page** (`src/pages/Settings.tsx`): Supabase URL + Anon Key config, "Sync to Cloud" button
- **Server** (`server/index.mjs`): `/api/sync-config` (GET/POST) saves credentials to `supabase-config.json`; `/api/sync-to-supabase` (POST) syncs 13 portal tables to Supabase
- Rebuild the .exe after adding Supabase config to enable sync

## Portal Pages (3 pages, 5 components)

| Page | Route | Auth Method | Supabase Tables Used |
|------|-------|-------------|---------------------|
| Parent Login | `/parent` | code + parent_phone match | students |
| Parent Dashboard | `/parent/dashboard` | sessionStorage | students, payments, exam_results, absence_records, attendance_notes, book_deliveries, student_status, notifications, parent_messages |
| Student Login | `/student` | code + phone match | students |
| Student Dashboard | `/student/dashboard` | sessionStorage | students, payments, exam_results, absence_records, attendance_notes, book_deliveries, student_status, notifications |
| Take Exam | `/take-exam/:examId` | code + phone inline | exams, subjects, questions, exam_questions, exam_results, students |

### ✅ Done
- **sql.js** replaces pg — zero native dependencies, pure JS SQLite
- **server/index.mjs** rewritten: `pg` → `sql.js` synchronous API, all CRUD/auth/backup/license ported
- **server/init-sql.js** — schema + seed data as ES module
- **pkg config** — `"bin": "server/index.mjs"`, `"pkg.targets": ["node22-win-x64"]`
- **asm.js fallback** — avoids WASM loading issues in pkg
- **launcher.vbs** — hidden window start, HTTP health check, retry logic, error logging
- **stop-server.vbs** — `taskkill /f /im CenterMasrServer.exe`
- **installer.iss** — Inno Setup script (Arabic UI, auto-start option, desktop icon, conflict detection)
- **Final exe test** — server starts cleanly from delivery folder, runs migrations, API responds
- **DB auto-creates** at `%APPDATA%/CenterMasr/data.db` on first run
- **Auto-backup**: daily to `C:\CenterMasrBackup\` (and `D:\CenterMasrBackup\` if D: exists), keep 7 days
- **License**: HMAC-signed, stored at `C:\ProgramData\CenterMasr\license.json`
- **Portal project** (`parent-portal/`) created with 5 pages ported from desktop app
- **Supabase schema** (`001_portal_schema.sql`) with 13 tables + indexes + RLS policies
- **Sync endpoints** added to server for Supabase config save + data sync
- **Sync UI** added to desktop Settings page (Supabase URL/Anon Key config + Sync button)
- Both builds verified: desktop (2402 modules) + portal (1520 modules)

### To Do
- Create Supabase project at https://supabase.com
- Run `001_portal_schema.sql` in Supabase SQL Editor
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env vars
- Deploy portal to Vercel: `cd parent-portal && npm run build && vercel --prod`
- Configure Supabase config in desktop Settings and run initial sync
- Rebuild .exe with sync endpoints

## Key Decisions
- **sql.js over better-sqlite3** — no node-gyp, no VS Build Tools, no compilation
- **asm.js over WASM** — avoids `sql-wasm.wasm` bundling issues with pkg
- **pkg over Electron** — single ~30 MB installer vs ~150 MB Electron bundle
- **VBS launcher over batch** — no console window; hidden background process
- **Init SQL as JS module** — bundled into pkg snapshot
- **Inno Setup over NSIS** — mature, Arabic support, easier scripting
- **Separate portal project** — keeps desktop app unmodified; portal uses real Supabase, not mock client
- **Server-side sync** — Node.js sync endpoint handles SQLite → Supabase; desktop UI just triggers it

## Relevant Files
- `server/index.mjs` (30851 bytes) — all CRUD, auth, backup/restore, license, sync endpoints
- `server/init-sql.js` (11743 bytes) — SQLite schema as ES module
- `src/pages/Settings.tsx` — desktop settings: backup, license, portal URLs, Supabase sync
- `parent-portal/` — separate Vite + React project for Vercel deployment
- `parent-portal/supabase/001_portal_schema.sql` — Supabase PostgreSQL schema + RLS
