# FinOS � Personal Financial Operating System

> **One place to understand, manage, plan, and improve your entire financial life.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)

---

## What is FinOS?

FinOS is a **production-quality Personal Financial Operating System** � not a basic expense tracker. It answers five core questions that matter to your financial life:

| # | Question |
|---|----------|
| 1 | **Where is my money?** � Account balances, cash positions, net worth |
| 2 | **Where did my money go?** � Transaction history, spending by category |
| 3 | **What do I owe?** � Debt, loans, credit cards, EMIs |
| 4 | **What am I building toward?** � Goals, budgets, savings targets |
| 5 | **Am I financially getting better?** � Health score, trends, forecasts |

---

## Features

### Phase 1 � MVP (Current)
- Authentication � Secure signup/login with NextAuth.js
- Accounts � Bank accounts, wallets, credit cards, investments
- Transactions � Full CRUD, search, filter, bulk operations
- Categories � Hierarchical system with custom categories
- Dashboard � Net worth, cash flow, spending overview
- Budgets � Monthly/category budgets with real-time tracking
- Net Worth � Assets minus liabilities with history
- Responsive � Mobile-first design, works on all devices

### Phase 2 � Planning
- Goals & savings targets
- Bills & subscription tracking
- Debt management & payoff calculator
- Recurring transactions
- CSV import from banks

### Phase 3 � Wealth
- Investment portfolio tracking
- Asset management (property, gold, vehicles)
- Advanced net worth analysis

### Phase 4 � Intelligence
- FinOS AI � Natural language financial assistant
- Smart insights & spending anomaly detection
- Financial forecasting & scenario planning

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | Full-stack React with server components |
| Language | TypeScript (strict mode) | Type safety across frontend and backend |
| Styling | Tailwind CSS v3 | Utility-first, responsive design |
| Components | shadcn/ui | Accessible, unstyled, composable components |
| Database | PostgreSQL 16 | Relational, ACID-compliant, secure |
| ORM | Prisma | Type-safe database client with migrations |
| Auth | NextAuth.js v5 | Session management, OAuth, credentials |
| Charts | Recharts | Declarative, composable data visualization |
| Validation | Zod | Runtime schema validation |
| Forms | React Hook Form | Performant, accessible form management |

---

## Project Structure

```
finos/
+-- app/                          # Next.js App Router
�   +-- (auth)/                   # Auth routes (login, signup)
�   +-- (dashboard)/              # Protected app routes
�   �   +-- layout.tsx            # Dashboard shell (sidebar + header)
�   �   +-- page.tsx              # Home dashboard
�   �   +-- transactions/
�   �   +-- planning/
�   �   +-- wealth/
�   �   +-- insights/
�   �   +-- settings/
�   +-- api/                      # API routes
�       +-- auth/
�       +-- accounts/
�       +-- transactions/
�       +-- categories/
�       +-- budgets/
�       +-- goals/
�       +-- net-worth/
�       +-- insights/
�
+-- components/
�   +-- ui/                       # shadcn/ui primitives
�   +-- layout/
�   +-- dashboard/
�   +-- transactions/
�   +-- accounts/
�   +-- charts/
�   +-- common/
�
+-- lib/
�   +-- calculations/             # Financial calculation engine
�   �   +-- net-worth.ts
�   �   +-- cash-flow.ts
�   �   +-- budgets.ts
�   �   +-- goals.ts
�   �   +-- debt.ts
�   �   +-- investments.ts
�   �   +-- health-score.ts
�   �   +-- forecasting.ts
�   +-- db/
�   +-- auth/
�   +-- validations/
�   +-- utils/
�
+-- prisma/
�   +-- schema.prisma
�   +-- migrations/
�   +-- seed.ts
�
+-- types/
+-- hooks/
+-- constants/
+-- __tests__/
```

---

## Database Schema Overview

```
users
  +-- accounts        ? Bank accounts, wallets, credit cards
  �     +-- transactions ? All financial movements
  �           +-- categories (hierarchical)
  +-- budgets
  �     +-- budget_items
  +-- goals
  �     +-- goal_contributions
  +-- bills
  +-- subscriptions
  +-- assets
  +-- liabilities
  +-- investments
  �     +-- investment_transactions
  +-- financial_snapshots
  +-- notifications
  +-- ai_insights
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 18.17 |
| pnpm (or npm) | latest |
| PostgreSQL | >= 14 |
| Git | any |

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url> finos
cd finos
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/finos"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Optional: AI (Phase 4)
OPENAI_API_KEY=""
GEMINI_API_KEY=""
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Set Up Database

```bash
createdb finos
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

### 4. Run Dev Server

```bash
pnpm dev
```

Open http://localhost:3000

### 5. Demo Login

- Email: `demo@finos.app`
- Password: `demo1234`

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | YES | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | YES | Session encryption key (min 32 chars) |
| `NEXTAUTH_URL` | YES | App base URL |
| `GOOGLE_CLIENT_ID` | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `OPENAI_API_KEY` | No | AI assistant (Phase 4) |
| `GEMINI_API_KEY` | No | Alternative AI provider |

---

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Production server
pnpm lint                   # Lint
pnpm type-check             # TypeScript check

# Database
pnpm prisma studio          # Visual DB browser
pnpm prisma migrate dev     # Run migrations
pnpm prisma db seed         # Load demo data
pnpm prisma generate        # Regenerate client

# Testing
pnpm test                   # Run all tests
pnpm test:watch             # Watch mode
pnpm test:coverage          # With coverage
```

---

## Financial Calculation Engine

All financial logic lives in `lib/calculations/` � pure TypeScript functions, no React dependencies.

```typescript
calculateNetWorth(assets, liabilities)
calculateMonthlyCashFlow(transactions, month)
calculateSavingsRate(income, expenses)
calculateBudgetUtilization(budget, spent)
calculateDebtPayoff(debt, extraPayment?)
calculateGoalContribution(goal)
calculateFinancialHealthScore(userData)
calculatePortfolioAllocation(investments)
calculateForecast(historicalData, months)
```

---

## API Routes

```
POST   /api/auth/signup
GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/[id]
PUT    /api/accounts/[id]
DELETE /api/accounts/[id]
GET    /api/transactions
POST   /api/transactions
PUT    /api/transactions/[id]
DELETE /api/transactions/[id]
POST   /api/transactions/bulk
GET    /api/categories
POST   /api/categories
GET    /api/budgets
POST   /api/budgets
GET    /api/goals
POST   /api/goals
GET    /api/net-worth
GET    /api/net-worth/history
GET    /api/insights
POST   /api/insights/ai
GET    /api/export?format=csv|json
POST   /api/import
```

---

## Security

- Authentication � NextAuth.js with secure session cookies
- Authorization � All DB queries scoped to authenticated userId
- Password Hashing � bcrypt via credentials provider
- Rate Limiting � API protection against brute force
- Input Validation � Zod schemas server-side on all inputs
- SQL Injection Prevention � Prisma ORM parameterized queries
- Audit Logging � Financial operations logged
- No Data Selling � Financial data never used for advertising

### User Data Rights
- Export � Download all personal data as CSV or JSON
- Delete � Full account deletion with cascade
- Privacy � No third-party analytics by default

---

## Demo Data

The seed creates a realistic profile:

| Category | Details |
|----------|---------|
| User | Arjun Sharma, Software Engineer, Mumbai |
| Accounts | HDFC Savings, HDFC Credit Card, Zerodha Demat, Cash |
| Income | Rs 85,000/month salary + freelance |
| Expenses | Rent, groceries, food delivery, utilities, subscriptions |
| Investments | Mutual funds, stocks, FD |
| Loans | Vehicle loan (Rs 3L outstanding) |
| Goals | Emergency fund, Europe trip, laptop |
| Net Worth | ~Rs 8.4L |

All demo data is clearly labeled and does not constitute financial advice.

---

## Deployment

### Vercel (Recommended)

```bash
pnpm build
vercel
```

### Docker

```bash
docker build -t finos .
docker run -p 3000:3000 --env-file .env finos
```

### Manual

```bash
pnpm build
NODE_ENV=production pnpm start
```

---

## Roadmap

### Now � Phase 1 (MVP)
- [x] Project setup & architecture
- [x] Database schema
- [x] Authentication
- [x] Accounts CRUD
- [x] Transactions CRUD with search & filter
- [x] Category system
- [x] Dashboard
- [x] Budgets
- [x] Net worth calculation
- [x] Responsive design
- [x] Loading, empty, error states
- [x] Calculation engine with tests

### Next � Phase 2
- [ ] Financial goals
- [ ] Bill management
- [ ] Subscription tracking
- [ ] Debt management
- [ ] CSV import

### Later � Phase 3
- [ ] Investment portfolio
- [ ] Asset management
- [ ] Advanced net worth

### Future � Phase 4
- [ ] FinOS AI assistant
- [ ] Insights engine
- [ ] Financial forecasting
- [ ] Scenario planning

---

## License

MIT License

---

FinOS � Your money, clearly understood.

*Built with care for financial clarity. Not financial advice.*
