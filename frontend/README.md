# HireFlow Frontend

A Next.js 14 (App Router) frontend for the HireFlow AI-powered hiring platform. Built with plain **JavaScript + JSX** (no TypeScript), Tailwind CSS, and Axios.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript / JSX
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Forms**: react-hook-form + Zod
- **Charts**: Recharts
- **Icons**: lucide-react
- **Notifications**: react-hot-toast

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login & Register pages
│   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── dashboard/    # Overview + usage stats
│   │   ├── jobs/         # Jobs list, create, detail
│   │   │   └── [id]/
│   │   │       └── candidates/[candidateId]/
│   │   └── billing/      # Plans & subscription
│   ├── layout.jsx        # Root layout
│   └── page.jsx          # Redirects to /dashboard
├── contexts/
│   └── AuthContext.jsx   # Auth state (login/logout/register)
├── lib/
│   ├── api.js            # Axios instance with JWT interceptors
│   └── utils.js          # Helper functions (cn, formatDate, colors)
└── middleware.js          # Route protection via cookies
```

## Getting Started

### 1. Configure environment

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 2. Install & run

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Start the backend

Make sure the HireFlow backend is running on port 5001 (see the root README).

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Sign in with email + password |
| `/register` | Create a new account |
| `/dashboard` | Overview: recent jobs, usage stats |
| `/jobs` | Paginated job list with skill search |
| `/jobs/new` | Create a job (AI extracts skills) |
| `/jobs/[id]` | Job detail: Overview, Candidates, Settings tabs |
| `/jobs/[id]/candidates/[id]` | Candidate detail: resumes, scores, skills |
| `/billing` | Plan comparison + upgrade / cancel |

## Authentication

- JWT stored in `localStorage` AND as a cookie (for middleware SSR route protection)
- `src/middleware.js` redirects unauthenticated users to `/login`
- Axios interceptor automatically attaches `Authorization: Bearer <token>`
- 401 responses auto-redirect to `/login`
