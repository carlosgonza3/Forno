# Forno frontend architecture

The frontend is organized by responsibility rather than by file type. New work
should stay inside the owning feature and use shared modules only when more than
one feature genuinely needs them.

## Directory responsibilities

- `src/app/`: application composition, release-aware navigation, routing, and
  theme initialization.
- `src/shared/`: reusable layout and branding components with no feature data
  access.
- `src/features/<feature>/pages/`: route- or shell-level feature screens.
- `src/features/<feature>/api/`: Supabase queries and RPC calls for that
  feature.
- `src/features/<feature>/components/`: feature-specific presentational or
  workflow components.
- `src/features/<feature>/*Model.js`: pure business rules that can be tested
  without React or Supabase.
- `src/domain/`: application-wide value formatting and domain rules.
- `src/lib/`: configured third-party clients.
- `src/styles/`: ordered stylesheet modules. `src/styles.css` is the only
  application stylesheet entry point.

## Dependency direction

Feature pages may depend on their own API/model/components and on `shared`,
`domain`, or `lib`. Shared components must not import feature modules. Pure
models must not import React or the Supabase client.

Database access belongs in repository modules. UI components should call
repository functions rather than constructing Supabase queries directly.

## Styling

`src/styles.css` is an import manifest. Its order preserves the established
cascade:

1. base tokens and global elements;
2. application layout and shared foundations;
3. responsive and theme layers;
4. feature-specific inventory, dashboard, authentication, and purchasing
   layers.

Add new rules to the owning feature stylesheet. Avoid adding rules directly to
the manifest or creating another global override section. When a selector is
shared, place it in `layout.css` or the relevant foundation file.

## Release safety

`AppShell` uses `navigationForRelease` to expose only approved modules. The
production workflow sets the `operations` scope and injects the production
Supabase URL and publishable key at build time. Frontend refactors must not
modify migrations or execute database commands.
