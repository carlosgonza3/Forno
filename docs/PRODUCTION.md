# Forno inventory production runbook

The current client release contains the authenticated Dashboard, Inventory, Purchases, and appearance/account settings. Preparation, recipes, receipts, uploads, notifications, and team administration remain available for local development but are excluded from production navigation.

## Environment model

Use two Supabase projects:

- **Development:** local work and feature validation.
- **Production:** real restaurant users and inventory.

Only the project URL and publishable key are compiled into the browser. Never add a secret key or service-role key to GitHub variables or any `VITE_` variable. Authorization remains enforced by PostgreSQL grants and RLS.

## One-time GitHub configuration

1. Open **Settings → Pages** and select **GitHub Actions** as the source.
2. Open **Settings → Secrets and variables → Actions → Variables**.
3. Add `VITE_SUPABASE_URL` using the production project URL.
4. Add `VITE_SUPABASE_PUBLISHABLE_KEY` using the production publishable key.
5. Protect `main`: require a pull request and the **Validate application** check before merging.
6. Under **Settings → Environments → github-pages**, restrict deployments to `main`. Optionally require an owner approval before each client release.

The publishable key is intentionally browser-visible. Do not store a Supabase secret or service-role key there.

## One-time Supabase configuration

In the production project:

1. Apply all migrations and confirm the expected tables, functions, triggers, grants, and RLS policies.
2. Run Supabase **Security Advisor** and resolve unexpected warnings.
3. Under **Authentication → URL Configuration**, set the Site URL to the exact Pages URL, including the repository path and trailing slash:

   ```text
   https://carlosgonza3.github.io/Forno/
   ```

4. Add that exact URL to **Redirect URLs**. Keep the local development URL separate, for example `http://localhost:5173/**`.
5. Configure production SMTP before relying on password recovery with restaurant staff.
6. Create Auth users deliberately; public self-registration is not part of this release.

## First release checklist

1. Confirm the Supabase CLI is linked to the intended production project before running database commands.
2. Review pending migrations:

   ```bash
   npx supabase migration list
   ```

3. Take an appropriate production backup or export before a destructive migration.
4. Apply migrations:

   ```bash
   npx supabase db push
   ```

5. Verify all existing SKUs use `FOR-######`, and create/edit/archive an ingredient with an Admin test user.
6. Verify a Local user can read the catalog but cannot access Admin mutations.
7. Push or merge the verified commit to `main`. The deployment workflow tests, builds the operations release, and publishes it to GitHub Pages.
8. Test login, Dashboard activity, Inventory existence entry, Purchases review/export/save/receipt, theme selection, password-reset delivery, and logout at the production URL.

Database migrations are intentionally not executed by the Pages workflow. This prevents a frontend deployment token from receiving database-administration privileges and keeps schema changes as an explicit reviewed operation.

## Ongoing delivery workflow

1. Keep `main` deployable and treat it as the exact production version.
2. Build each feature on a short-lived branch such as `codex/stock-movements`.
3. Use the development Supabase project while the feature is incomplete.
4. Open a pull request to `main`; the validation workflow must pass.
5. For changes with migrations, apply backward-compatible production migrations first, verify them, and then merge the frontend.
6. Merge only client-ready functionality. Every merge to `main` deploys automatically.

Unfinished modules stay hidden because production sets `VITE_RELEASE_SCOPE=operations`. When another module is ready, expand the release scope deliberately rather than exposing prototype screens.

## Rollback

- **Frontend:** revert the problematic commit on `main`; the revert deploys the previous application automatically.
- **Database:** do not improvise destructive rollbacks. Prefer forward-fix migrations and restore from a verified backup only when necessary.
- **Access incident:** disable the affected Auth user, revoke active sessions, inspect audit data, and rotate only credentials that may actually be compromised.
