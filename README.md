# Business Intelligence Frontend

Next.js dashboard for the BI platform.

## Prerequisites

- **Bun** (`bun --version`) — install: `curl -fsSL https://bun.sh/install | bash`
- **Backend running** on `http://localhost:8000`

## Quick start

```bash
# 1. Install dependencies & create env
bun install
cp .env.example .env.local

# 2. Inject dev token from backend
# Run this in the backend directory first:
#   cd ../business-intelligence-backend
#   uv run python scripts/setup.py --quick
# Then copy the token from backend/.dev-token:
#   NEXT_PUBLIC_DEV_API_TOKEN=<paste-token-here>
#
# Or let the setup script do it automatically:
bun run setup

# 3. Start dev server
bun dev
```

Open **http://localhost:3000** in your browser.

## Commands

```bash
bun dev          # start dev server
bun run setup    # setup env + install deps
bun run build    # production build
```

## Env variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend API URL |
| `NEXT_PUBLIC_DEV_API_TOKEN` | — | Dev JWT from backend setup |
