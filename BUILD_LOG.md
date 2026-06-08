# CashKitty - Build Log

## Phase 1: Foundation
**Started:** 2026-06-05 | **Status:** Complete

### Steps Completed
- [x] Initialized Next.js project (App Router, TypeScript, Tailwind CSS)
- [x] Installed Node 20 via nvm (required by Next.js 16)
- [x] Installed dependencies: better-sqlite3, @anthropic-ai/sdk, recharts, uuid, date-fns
- [x] Updated `next.config.ts` — added `serverExternalPackages: ['better-sqlite3']`
- [x] Created `src/types/index.ts` — TypeScript interfaces (Transaction, Category, OcrResult, etc.)
- [x] Created `src/lib/db.ts` — SQLite connection, schema creation, default category seeding
- [x] Created `src/lib/category-recommender.ts` — keyword + history-based category auto-recommendation
- [x] Updated `.gitignore` — added `data/` for SQLite DB files

### Key Decisions
- Balance computed from SUM of transactions (no separate balance table)
- Default categories: Grocery, Taxi, Household, Medical, Utilities, Other
- SQLite DB stored at `data/kitty.db` (gitignored)

---

## Phase 2: Core API Routes
**Status:** Complete

### API Endpoints Created
- `GET/POST /api/kitty` — Balance retrieval + add money
- `GET/POST /api/transactions` — List (with filters) + create transactions
- `GET/PUT/DELETE /api/transactions/[id]` — Single transaction CRUD
- `GET/POST /api/categories` — List + create categories
- `PUT/DELETE /api/categories/[id]` — Update/delete categories
- `GET /api/categories/recommend` — Auto-recommend category from description
- `GET /api/reports/daily` — Daily report (income, expense, net, transactions)
- `GET /api/reports/trends` — Trend data (by day/week/month with category breakdown)

### Files Created
- `src/app/api/kitty/route.ts`
- `src/app/api/transactions/route.ts`
- `src/app/api/transactions/[id]/route.ts`
- `src/app/api/categories/route.ts`
- `src/app/api/categories/[id]/route.ts`
- `src/app/api/categories/recommend/route.ts`
- `src/app/api/reports/daily/route.ts`
- `src/app/api/reports/trends/route.ts`

---

## Phase 3: UI Shell
**Status:** Complete

### Components Created
- `AppShell.tsx` — Root wrapper with HelperName context + localStorage persistence
- `HelperNamePrompt.tsx` — Modal for name entry on first visit
- `Navbar.tsx` — Sidebar navigation with active state + helper name display
- `BalanceCard.tsx` — Balance/income/expense summary cards
- `RecentTransactions.tsx` — Last 10 transactions list
- `CategoryBadge.tsx` — Colored category pill
- `TransactionForm.tsx` — Reusable add/edit form with category auto-recommend

### Pages Created
- `/` (Dashboard) — Balance cards, quick actions, recent transactions
- `/add-money` — Add money form with live balance
- `/record-expense` — Photo upload + OCR + manual expense form
- `/transactions` — Filterable list with inline edit/delete
- `/daily-report` — Date picker + daily breakdown
- `/trends` — Line/bar/pie charts with date range + granularity
- `/categories` — Category CRUD with color picker

---

## Phase 4: OCR Integration
**Status:** Complete

### Files Created
- `src/lib/ocr.ts` — Claude Vision API wrapper (claude-sonnet-4-20250514)
- `src/app/api/ocr/route.ts` — POST endpoint with 5MB limit + type validation

### OCR Flow
1. Upload photo → base64 encode → send to Claude Vision
2. Claude extracts date, amount, description, raw_text, confidence
3. Category recommender runs on description
4. Pre-fills expense form for helper to review/edit

---

## Phase 5: Reports & Polish
**Status:** Complete

### Build Verification
- `npx next build` — **Compiled successfully** with 0 errors
- All 7 pages render as static content
- All 8 API routes registered as dynamic endpoints

### Environment Setup
- `.env.local.example` created with ANTHROPIC_API_KEY placeholder
- Run `cp .env.local.example .env.local` and add your API key

---

## How to Run

```bash
# Ensure Node 20+
nvm use 20

# Install dependencies (already done)
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Start dev server
npm run dev
# Open http://localhost:3000
```
