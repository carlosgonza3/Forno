# Forno Inventory

A responsive React MVP for a small restaurant to manage inventory, daily prep, recipes, purchasing, and AI-assisted receipt intake.

The implementation backlog for the next operational phase is maintained in [`TASKS.md`](./TASKS.md).

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Populate `.env.local` with the project URL and publishable key from Supabase. The service-role key must never be added to a `VITE_` variable. Without credentials, the application shows its setup guide; the approved visual prototype remains available at `#/preview`.

Build verification:

```bash
npm run check
```

## Deploy to GitHub Pages

The repository includes a production workflow that tests and deploys the authenticated inventory release whenever `main` is pushed. Production hides unfinished prototype modules and starts directly in Inventory.

1. Create a GitHub repository and add it as this project's `origin` remote.
2. Push `main` to GitHub.
3. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. The deployment URL will appear in the workflow summary after the `Deploy to GitHub Pages` action succeeds.

The Vite base path is derived automatically from `GITHUB_REPOSITORY`, so project-page URLs such as `https://owner.github.io/Forno/` load assets correctly.

Before deploying the connected application, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **GitHub → Settings → Secrets and variables → Actions → Variables**. The Pages workflow supplies these browser-public values to Vite at build time.

Use short-lived feature branches for ongoing development and merge only client-ready changes into `main`. Pull requests run the validation workflow before production deployment. The complete environment setup, Supabase checklist, release sequence, and rollback procedure are documented in [`docs/PRODUCTION.md`](./docs/PRODUCTION.md).

## Current production scope

- Supabase authentication, session restoration, password recovery, and logout
- Admin MFA enforcement and role-aware catalog controls
- Real ingredient and supplier catalog backed by Supabase
- Search, filters, grouping, sorting, CSV export, and light/dark themes

## Prototype modules retained for development

- Operational dashboard with stock, food-cost, waste, prep, and activity metrics
- Daily production list for prepared/current food
- Recipe cards with ingredients, unit cost, margin, and achievable servings
- Automated grocery list grouped by supermarket department
- AI receipt upload/review experience
- Responsive navigation for desktop and mobile
- Supabase schema with Admin and Local roles and row-level security

The unfinished modules still use realistic in-memory sample data and remain available in local development. The production release scope prevents restaurant users from navigating to them until their Supabase-backed implementations are ready.

## Security baseline

- Keep the Supabase service-role key server-side only; browsers receive only the publishable key.
- Enforce authorization with database RLS, not hidden UI controls. The included schema gives Local users operational access and reserves destructive/catalog actions for Admins.
- Require MFA for Admin accounts and prefer phishing-resistant WebAuthn/passkeys where the identity provider supports them.
- Serve only over TLS, use short-lived sessions, secure cookie storage for server-rendered deployments, and a strict Content Security Policy.
- Store receipts in a private bucket with short-lived signed URLs. Remove image metadata before long-term retention and define an automatic retention period.
- Run AI extraction in a server/Edge Function, validate the response against a fixed schema, and require review before inventory mutation.
- Record approvals and sensitive changes in an append-only audit trail. Never log credentials, tokens, full receipts, or personal data.
