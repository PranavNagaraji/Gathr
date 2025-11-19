# Gathr Backend Smoke Tests

This folder contains a lightweight, dependency-free smoke test script for the backend APIs. It uses Node 18+ (native fetch) and optional environment variables.

## Prerequisites
- Node.js 18 or newer
- Backend running (defaults to http://localhost:5000)

## Configuration
Create a `.env` file in this folder (see `.env.example`):

- BACKEND_URL: Base URL of backend (default: http://localhost:5000)
- CLERK_BEARER: Optional Clerk JWT for protected routes (Bearer token)
- ADMIN_EMAIL: Admin gate email for admin endpoints (default: admin@gmail.com)
- TEST_AI: "true" to attempt the AI endpoint; otherwise skipped
- MERCHANT_CLERK_ID: Clerk ID of a real merchant user (used only if TEST_AI=true)

Example (.env):
```
BACKEND_URL=http://localhost:5000
CLERK_BEARER=eyJhbGciOi...  
ADMIN_EMAIL=admin@gmail.com
TEST_AI=false
MERCHANT_CLERK_ID=
```

## Run
From the repository root:

```
node tests/smoke.mjs
```

The script prints per-endpoint results and an overall summary. It exits with code 0 on success, non-zero if any mandatory checks fail.

## What it tests
- GET / (root)
- GET /api/complaints/list (adminEmailGate)
- POST /api/customer/getShops
- POST /api/customer/searchLocalItems
- (Optional) POST /api/merchant/ai/generateFromImage — skipped by default; accepts 200/401/403/500 as non-fatal

## Notes
- For protected routes, provide `CLERK_BEARER` in `.env`.
- The AI test accepts 401/403/500 to avoid failing in environments without Clerk users or Gemini keys.
