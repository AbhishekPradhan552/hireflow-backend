# HireFlow

AI-powered hiring platform — Express.js backend + Next.js frontend.

## Repo structure

```
hireflow-backend/
├── src/               # Express.js backend (Node.js, Prisma, BullMQ)
├── prisma/            # Database schema & migrations (PostgreSQL)
├── frontend/          # Next.js 15 frontend (JavaScript / JSX, Tailwind CSS)
└── .env.example       # Backend environment variables template
```

---

## Backend

### Tech stack
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js v5
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: BullMQ (Redis)
- **Storage**: AWS S3
- **Auth**: JWT (7-day expiry)
- **AI**: OpenRouter API for embeddings + skill extraction
- **Billing**: Razorpay

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Run database migrations
npm run prisma:migrate

# 4. Generate Prisma client
npm run prisma:generate

# 5. Start dev server + workers together
npm run dev:all
```

The backend listens on **http://localhost:5001**.

### Environment variables (`.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `AWS_S3_BUCKET_NAME` | S3 bucket for resume storage |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification secret |

### API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register (creates user + org + FREE plan) |
| POST | `/login` | Login → JWT token |
| GET | `/me` | Get current user |
| POST/GET/PUT/DELETE | `/jobs` | Jobs CRUD |
| POST/GET/PATCH/DELETE | `/jobs/:id/candidates` | Candidates CRUD |
| GET | `/jobs/:id/candidates/ranked` | AI-ranked candidates |
| GET | `/jobs/:id/stats` | Job statistics |
| GET | `/jobs/:id/pipeline` | Candidate pipeline summary |
| POST | `/candidates/:id/resumes` | Upload resume (PDF/DOC/DOCX, max 5MB) |
| DELETE/POST | `/resumes/:id` `/resumes/:id/reparse` | Resume management |
| GET/POST | `/billing/current` `/billing/upgrade` `/billing/cancel` | Billing |
| GET | `/org/usage` | Monthly resume usage |
| GET | `/health` | Health check |

---

## Frontend

### Tech stack
- **Framework**: Next.js 15 (App Router)
- **Language**: JavaScript / JSX (no TypeScript)
- **Styling**: Tailwind CSS
- **HTTP**: Axios (auto-attaches JWT)
- **Forms**: react-hook-form + Zod
- **Charts**: Recharts
- **Icons**: lucide-react

### Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure backend URL (already set to localhost:5001)
# Edit frontend/.env.local if your backend runs elsewhere:
# NEXT_PUBLIC_API_URL=http://localhost:5001

# 3. Start dev server
npm run dev
```

The frontend listens on **http://localhost:3000**.

### Pages

| Route | Description |
|---|---|
| `/login` | Sign in |
| `/register` | Create account |
| `/dashboard` | Overview: usage stats, recent jobs |
| `/jobs` | All jobs with search/pagination |
| `/jobs/new` | Create a job (AI extracts required skills) |
| `/jobs/[id]` | Job detail — Overview (stats + pipeline chart), Candidates, Settings |
| `/jobs/[id]/candidates/[candidateId]` | Candidate — resume upload, AI scores, skill match, status |
| `/billing` | Plan comparison, upgrade / cancel |

---

## Plans

| Plan | Resumes/month | Jobs | Price |
|------|--------------|------|-------|
| FREE | 50 | 20 | $0 |
| PRO | 500 | 50 | $49/mo |
| TEAM | Unlimited | Unlimited | $149/mo |

## Roles

| Role | Permissions |
|------|------------|
| OWNER | Everything |
| ADMIN | Jobs + Candidates CRUD |
| RECRUITER | Candidates CRUD (read jobs) |
| VIEWER | Read-only |
