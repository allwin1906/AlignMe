# AlignMe — Project Instructions

This project follows `../AlignMe_Software_Master_Plan.md` and `docs/IMPLEMENTATION_PLAN.md`.
The rules in the parent `Downloads/CLAUDE.md` (Next.js, Prisma, Clerk, Stripe, Razorpay, Cloudinary, Resend) belong to a different project and do NOT apply here.

## Stack
- Vite + React + TypeScript (strict), Tailwind CSS v4, Recharts, vite-plugin-pwa, Vitest.
- Client-only PWA. No backend, no auth, no cloud storage.

## Rules
- `src/engine/` is pure TypeScript: no React, no DOM, no `Date.now()`. Timestamps are always injected.
- The UI talks to the engine only through `src/hooks/usePostureEngine.ts`. Never duplicate classification logic in components.
- All data is simulated. Keep the "Simulated data" label visible. Never imply the vibration motor physically fires.
- No hardware, BLE/Web Bluetooth, ML, or clinical claims without explicit approval.
- Tests use injected timestamps — no real sleeping.
- Conventional commits (`feat/fix/chore/docs/test`). No `console.log` in committed code.
- Don't add dependencies without asking.
