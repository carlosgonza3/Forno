# Forno — Next Phase Backlog

This backlog turns the current interactive prototype into a secure, multi-user restaurant inventory system. Tasks are ordered by dependency, not only by feature visibility.

## Current delivery status

| Task | Status | Implemented in the current branch | Remaining |
| --- | --- | --- | --- |
| FORNO-101 | In progress | Development project linked; validated Vite environment contract, browser-safe Supabase client, versioned remote schema, explicit grants, Auth-profile trigger, `.env.example`, setup screen, and workbook-backed development catalog | Create the production project |
| FORNO-102 | In progress | Hash-based application routes, feature folders, protected application boundary, lazy-loaded operations module | Extract each prototype screen into its own feature and repository |
| FORNO-103 | In progress | Login, local-device logout, session restoration, PKCE password recovery, profile-role guard, and Admin TOTP enrollment/challenge with an AAL2 gate | Configure production SMTP, passkeys, and user administration UI |
| FORNO-104 | In progress | Versioned RLS policies and explicit Data API grants are deployed to development | Add automated role-policy and database-function tests |
| FORNO-201 | In progress | Tested mass, volume, count, alias, package, precision, and dimension validation kernel | Persist unit definitions and build Admin conversion UI |
| FORNO-202 | In progress | Supabase-backed ingredient and supplier catalog; Admin create/edit/archive controls; Local read-only view; department/search filters | Add department editing, purchase-unit conversion fields, ordering metadata, and duplicate warnings |
| FORNO-206 | In progress | Idempotent migration of 224 workbook rows and 24 normalized suppliers with stable source SKUs | Add reusable Admin import preview, validation warnings, and approval workflow |
| FORNO-605 | In progress | Vitest/jsdom harness with fifteen domain, auth-error, protected-route, and catalog-model tests | Add database integration and browser end-to-end suites |

## Conventions

- **Priority:** P0 blocks production, P1 is required for the first operational release, P2 improves the workflow after launch.
- **Size:** S is roughly 1 day, M is 2–4 days, L is 1–2 weeks including tests and review.
- Every task includes automated tests where business rules, permissions, or inventory quantities are affected.
- Inventory changes must be recorded as movements. The current quantity must never be silently overwritten without an audit record.

## Milestone 1 — Application foundation

### FORNO-101 — Configure Supabase environments

**Priority:** P0 · **Size:** S

- Create separate development and production Supabase projects.
- Add documented environment variables and a typed Supabase client.
- Add local seed data for departments, suppliers, ingredients, and recipes.
- Keep service-role credentials outside the browser and Git repository.

**Acceptance criteria**

- The app starts against development Supabase using `.env.local`.
- Missing configuration produces a clear setup screen rather than a blank page.
- Production secrets are supplied only through the deployment environment.

### FORNO-102 — Split the prototype into application modules

**Priority:** P0 · **Size:** M

- Introduce routes for dashboard, inventory, preparation, recipes, shopping, receipts, and administration.
- Move reusable UI primitives into `components/ui` following shadcn conventions.
- Create feature-level repositories, hooks, schemas, and page components.
- Add loading, empty, error, and retry states to every data screen.

**Acceptance criteria**

- Refreshing a route preserves the selected screen on GitHub Pages.
- Feature code no longer depends on sample arrays inside `App.jsx`.
- Shared buttons, dialogs, tables, badges, and form fields are reusable components.

### FORNO-103 — Implement authentication and role-aware navigation

**Priority:** P0 · **Size:** M

- Add Supabase Auth login, logout, password reset, and session restoration.
- Require MFA for Admin accounts and support passkeys/WebAuthn when available.
- Apply Admin and Local route guards.
- Hide administrative actions from Local users without relying on UI hiding for authorization.

**Acceptance criteria**

- Unauthenticated visitors cannot access operational routes.
- Local users can view stock and create operational records but cannot manage users or delete catalog data.
- Admin users can access every management screen.
- Expired or revoked sessions return safely to login.

### FORNO-104 — Validate row-level security

**Priority:** P0 · **Size:** M · **Depends on:** FORNO-101, FORNO-103

- Convert the initial schema into versioned Supabase migrations.
- Add automated RLS tests for anonymous, Local, and Admin access.
- Replace broad update policies with audited database functions for stock changes.
- Protect audit records from update and deletion, including by normal Admin sessions.

**Acceptance criteria**

- Each role has an explicit allow/deny test for every table and function.
- Direct browser requests cannot produce an unauthorized inventory change.
- Inventory mutations and receipt approvals are atomic and attributed to the current user.

### FORNO-105 — Add application observability

**Priority:** P1 · **Size:** S

- Add structured client and Edge Function error reporting.
- Add request correlation IDs for receipt processing and inventory mutations.
- Define operational alerts without logging tokens, receipt images, or personal data.

**Acceptance criteria**

- Failed mutations display a useful message and can be traced by correlation ID.
- Sensitive values are scrubbed from client and server logs.

## Milestone 2 — Inventory core

### FORNO-201 — Model units, containers, and conversions

**Priority:** P0 · **Size:** L

- Create canonical units for weight, volume, count, and container sizes.
- Support purchase units that differ from recipe units, such as a 5 lb bag consumed in grams.
- Support custom containers such as a 2 L sauce tub or tray of 12 portions.
- Define rounding and precision rules for El Salvador suppliers and USD costs.

**Acceptance criteria**

- A user can purchase by package and consume by base unit without manual calculation.
- Invalid conversions between dimensions are rejected.
- Remaining stock and cost are calculated consistently to documented precision.

### FORNO-202 — Build Admin ingredient and supplier management

**Priority:** P0 · **Size:** M · **Depends on:** FORNO-201

- Add ingredient create, edit, archive, and duplicate-detection workflows.
- Manage department, preferred supplier, SKU, purchase unit, base unit, par level, and reorder point.
- Add supplier contacts, ordering days, lead time, and minimum-order notes.

**Acceptance criteria**

- Admins can manage the complete catalog with validated forms.
- Local users have read-only catalog access.
- Archived ingredients remain available in historical records but disappear from new selections.

### FORNO-203 — Implement atomic stock movements

**Priority:** P0 · **Size:** L · **Depends on:** FORNO-104, FORNO-201

- Create database functions for purchase, usage, preparation, waste, return, and correction movements.
- Calculate quantity and weighted unit cost transactionally.
- Prevent negative inventory unless an Admin explicitly approves a correction.
- Add idempotency keys to prevent duplicated submissions.

**Acceptance criteria**

- Concurrent updates cannot produce lost quantities.
- Every stock total can be reconciled from its movement history.
- Retrying a request does not duplicate the movement.

### FORNO-204 — Add inventory counts and reconciliation

**Priority:** P1 · **Size:** M · **Depends on:** FORNO-203

- Create mobile-friendly full and department-based count sessions.
- Allow draft counts, assigned counters, sign-off, and discrepancy notes.
- Generate adjustment movements only after review.

**Acceptance criteria**

- Local users can complete a count without seeing system quantity until entry, when configured.
- Admin approval records expected, counted, and adjusted values.
- Interrupted count sessions can be resumed.

### FORNO-205 — Track waste and spoilage

**Priority:** P1 · **Size:** S · **Depends on:** FORNO-203

- Add quick waste entry by ingredient or prepared batch.
- Capture quantity, reason, estimated cost, user, and optional note/photo.
- Add configurable waste reasons.

**Acceptance criteria**

- Waste immediately reduces available inventory through an audited movement.
- Dashboard waste metrics can be filtered by date, item, reason, and user.

### FORNO-206 — Import the existing Excel inventory

**Priority:** P1 · **Size:** M · **Depends on:** FORNO-201, FORNO-202

- Map the six workbook sheets into departments, items, suppliers, units, par levels, and reorder points.
- Provide a preview with validation warnings and duplicate matching.
- Preserve the original source row for audit and troubleshooting.

**Acceptance criteria**

- Nothing is written until an Admin approves the import preview.
- Invalid units and missing required values are clearly identified.
- Re-running the same import does not create duplicate ingredients.

## Milestone 3 — Recipes and current food

### FORNO-301 — Build the recipe editor

**Priority:** P0 · **Size:** L · **Depends on:** FORNO-201, FORNO-202

- Create recipes with yield, servings, instructions, categories, and nested ingredients.
- Allow ingredients and other prepared recipes as components.
- Detect circular recipe dependencies.
- Preserve recipe versions so historical costs remain explainable.

**Acceptance criteria**

- Admins can create and revise recipes with validated unit conversions.
- Local users can view the current approved version.
- Circular nesting and missing conversions are rejected before save.

### FORNO-302 — Calculate recipe cost and availability

**Priority:** P0 · **Size:** M · **Depends on:** FORNO-203, FORNO-301

- Calculate current batch cost, portion cost, selling margin, and available servings.
- Display which ingredient limits the available quantity.
- Recalculate when ingredient cost, recipe version, or stock changes.

**Acceptance criteria**

- Recipe cost matches its converted ingredient quantities and current costing method.
- Availability explains shortages rather than showing only a number.
- Admins can compare current and previous recipe costs.

### FORNO-303 — Create the daily preparation planner

**Priority:** P0 · **Size:** M · **Depends on:** FORNO-302

- Generate suggested prep quantities using par levels, current prepared stock, reservations/manual forecast, and recent usage.
- Let Local users select recipes, adjust quantities, assign staff, and save a production list.
- Track pending, in-progress, completed, and cancelled tasks.

**Acceptance criteria**

- The planner warns about insufficient raw ingredients before work starts.
- Multiple staff members see status changes without reloading.
- Suggestions can be overridden with a required reason when unusually high.

### FORNO-304 — Register prepared batches atomically

**Priority:** P0 · **Size:** L · **Depends on:** FORNO-203, FORNO-303

- On completion, consume recipe ingredients and create prepared/current-food inventory in one transaction.
- Record actual yield and variance from expected yield.
- Support partial completion and failed batches.

**Acceptance criteria**

- A completed preparation cannot create output without consuming its inputs.
- Transaction failure leaves both raw and prepared stock unchanged.
- Yield variance is available for cost and waste reporting.

### FORNO-305 — Add batch freshness and expiration tracking

**Priority:** P1 · **Size:** M · **Depends on:** FORNO-304

- Record prepared time, use-by time, remaining quantity, and batch status.
- Consume oldest suitable stock first by default.
- Warn before current food expires and register discarded quantities as waste.

**Acceptance criteria**

- Local users can see what must be used first during service.
- Expired batches cannot be allocated without Admin override.
- Discarding expired stock updates waste metrics.

## Milestone 4 — AI receipt intake

### FORNO-401 — Create secure receipt storage and upload

**Priority:** P0 · **Size:** M · **Depends on:** FORNO-101, FORNO-103

- Create a private Supabase Storage bucket with size and MIME restrictions.
- Upload directly with short-lived authorization and remove image metadata.
- Add camera capture, PDF/image preview, progress, cancel, and retry states.
- Define automatic retention and deletion rules.

**Acceptance criteria**

- Receipt files are never publicly addressable.
- Unsupported or oversized files are rejected before processing.
- Users can access only receipts allowed by RLS and signed URLs.

### FORNO-402 — Implement structured AI extraction

**Priority:** P0 · **Size:** L · **Depends on:** FORNO-401

- Process receipts in an Edge Function or protected worker.
- Extract supplier, date, currency, subtotal, tax, total, and line items using a strict response schema.
- Normalize Spanish abbreviations, decimal formats, units, and Salvadoran supplier names.
- Store confidence and evidence per extracted field.

**Acceptance criteria**

- Invalid model output cannot reach inventory tables.
- The UI receives field-level confidence and processing status.
- Processing is asynchronous, retryable, time-limited, and observable.

### FORNO-403 — Build the receipt review and matching screen

**Priority:** P0 · **Size:** L · **Depends on:** FORNO-402, FORNO-202

- Show the source receipt beside editable extracted fields.
- Match line items to known ingredients, packages, and suppliers.
- Highlight low-confidence, unknown, duplicate, and price-anomaly rows.
- Allow Admins to create a missing ingredient without leaving the review.

**Acceptance criteria**

- No receipt can be approved while required fields or mappings are unresolved.
- Corrections are preserved as extraction feedback without exposing sensitive documents.
- The totals reconciliation clearly shows any mismatch.

### FORNO-404 — Approve a receipt into inventory

**Priority:** P0 · **Size:** M · **Depends on:** FORNO-203, FORNO-403

- Create purchase movements for all approved rows in a single transaction.
- Update supplier price history and weighted item costs.
- Prevent the same receipt from being approved twice.
- Record approver, timestamp, original values, and corrections.

**Acceptance criteria**

- Approval either posts every valid line or posts nothing.
- Inventory totals and receipt totals reconcile after approval.
- Duplicate file or supplier/invoice combinations are flagged.

## Milestone 5 — Purchasing and notifications

### FORNO-501 — Generate the recommended grocery list

**Priority:** P0 · **Size:** L · **Depends on:** FORNO-203, FORNO-303

- Calculate demand from par levels, current raw/prepared stock, scheduled prep, recipe demand, lead times, and open purchase quantities.
- Explain each recommendation with its calculation inputs.
- Group ingredients by normal grocery-store department and preferred supplier in El Salvador.

**Acceptance criteria**

- Recommendations never double-count current food and its already-consumed ingredients.
- A user can inspect why each quantity was suggested.
- Department and supplier views produce the same total quantities.

### FORNO-502 — Add editable purchase-list workflow

**Priority:** P1 · **Size:** M · **Depends on:** FORNO-501

- Allow manual additions, quantity overrides, notes, assignment, and check-off.
- Track draft, approved, shopping, purchased, and cancelled states.
- Preserve recommendation and user override values separately.

**Acceptance criteria**

- Local users can operate an approved list during shopping.
- Admins can review who changed a recommendation and why.
- Purchased items can be handed directly into receipt review.

### FORNO-503 — Send low-stock and preparation notifications

**Priority:** P1 · **Size:** M · **Depends on:** FORNO-501

- Add email notifications for critical stock, upcoming prep, expiring batches, and failed receipt processing.
- Support per-user preferences, quiet hours, and digest frequency.
- Deduplicate repeated alerts until the underlying condition changes.

**Acceptance criteria**

- Admins can configure restaurant-level defaults.
- Users can opt out of nonessential messages.
- Repeated jobs do not send duplicate alerts for the same condition.

### FORNO-504 — Export and share purchase orders

**Priority:** P2 · **Size:** M · **Depends on:** FORNO-502

- Generate supplier-specific PDF, email, and printable lists.
- Include quantities in supplier purchase units and internal base-unit equivalents.
- Record delivery status and expected date.

**Acceptance criteria**

- Every export matches the approved list version.
- Supplier documents exclude internal cost/margin data when configured.

## Milestone 6 — Dashboard, reporting, and launch quality

### FORNO-601 — Define and implement operational metrics

**Priority:** P1 · **Size:** M · **Depends on:** FORNO-203, FORNO-304

- Document formulas for inventory value, food cost, waste rate, stockouts, price variance, recipe margin, prep yield, and inventory turnover.
- Add date, department, supplier, ingredient, and recipe filters.
- Make metric timestamps and data freshness visible.

**Acceptance criteria**

- Every dashboard number links to its supporting records.
- Timezone and reporting-day boundaries use the restaurant's El Salvador location.
- Empty or incomplete data is identified instead of displayed as zero.

### FORNO-602 — Replace dashboard sample data with live queries

**Priority:** P1 · **Size:** M · **Depends on:** FORNO-601

- Build efficient database views or RPCs for dashboard metrics.
- Add realtime updates where operationally useful and cached queries elsewhere.
- Preserve the current responsive visual design and accessibility.

**Acceptance criteria**

- Dashboard totals reconcile with inventory and movement reports.
- Loading and partial-error states do not block unrelated metrics.
- Typical dashboard loads within the agreed performance budget.

### FORNO-603 — Add reports and exports

**Priority:** P2 · **Size:** M · **Depends on:** FORNO-601

- Export inventory valuation, purchases, waste, recipe cost, movement history, and preparation yield to CSV/PDF.
- Add saved date ranges and department filters.
- Limit financial reports to Admin users.

**Acceptance criteria**

- Exported totals match the on-screen filtered data.
- Large exports are produced asynchronously without freezing the UI.

### FORNO-604 — Accessibility, responsive, and offline-resilience pass

**Priority:** P1 · **Size:** M

- Meet WCAG 2.2 AA for contrast, keyboard operation, focus, labels, and error messages.
- Test common restaurant tablet and phone sizes.
- Preserve unsaved count, prep, and shopping drafts during temporary connectivity loss.

**Acceptance criteria**

- Core Local workflows are usable by keyboard and screen reader.
- No required action depends on color alone.
- A short connection loss does not erase operational input or duplicate submissions.

### FORNO-605 — End-to-end test suite

**Priority:** P0 · **Size:** L

- Add unit tests for conversions, costing, reorder calculations, and permission helpers.
- Add integration tests for database functions and RLS.
- Add end-to-end tests for Admin and Local critical paths.

**Acceptance criteria**

- CI blocks deployment when a critical inventory, receipt, preparation, or authorization test fails.
- Tests cover concurrency, retries, duplicate submissions, and transaction rollback.

### FORNO-606 — Production hardening and release checklist

**Priority:** P0 · **Size:** M · **Depends on:** FORNO-104, FORNO-605

- Add Content Security Policy, dependency scanning, secret scanning, and migration checks to CI.
- Document backup, recovery, account removal, incident response, and receipt retention procedures.
- Run a threat-model review of authentication, AI input, file upload, database functions, and email links.
- Create a staged pilot and rollback plan.

**Acceptance criteria**

- No production service key is present in browser bundles or repository history.
- Restore procedure is tested against a nonproduction environment.
- Launch checklist has named owners and recorded approval.

## Recommended first sprint

The first sprint should establish the safe data path before expanding visible features:

1. FORNO-101 — Configure Supabase environments
2. FORNO-102 — Split the prototype into application modules
3. FORNO-103 — Implement authentication and role-aware navigation
4. FORNO-104 — Validate row-level security
5. FORNO-201 — Begin units, containers, and conversions
6. FORNO-605 — Establish the test harness alongside foundation work

## Phase completion criteria

The next phase is ready for a restaurant pilot when:

- Admin and Local permissions are verified through automated tests.
- Inventory, receipt approval, and preparation transactions are atomic and auditable.
- The existing Excel catalog has been imported and reconciled.
- Staff can complete inventory counts, daily preparation, receipt review, and shopping workflows on a tablet.
- Dashboard values reconcile with movement records and documented formulas.
- Backup, recovery, monitoring, security, and rollback procedures have been exercised.
