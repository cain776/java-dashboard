# Screen-First Development Rules

## Goal

This project starts with screen composition first.
At the current stage, the priority is:

1. make the UI and navigation real
2. fix the API contract shape early
3. keep local execution possible without PostgreSQL
4. connect the real database later with minimal rewrite

## Working Agreement

- Frontend drives the first iteration.
- Backend does not wait for the database to be finalized.
- Mock data is allowed, but the request and response shape must be decided first.
- New screens should be built against a stable contract, not against ad-hoc component props.
- Buildable, type-checkable, lint-clean code is the default target.

## Role Split

### React

- Build pages, layout, menus, charts, empty states, loading states, and error states.
- Use mock data through MSW first.
- Consume only typed API modules or query hooks.
- Do not fetch directly inside random UI components unless the page is very small and temporary.

### Java

- Define API endpoints and DTO contracts first.
- Keep authentication and execution environment stable.
- Support local execution without an external DB by default.
- Add real persistence later behind the same DTO contract.
- Keep business logic in services, not in controllers.

## Current Local Execution Policy

- Default backend runtime uses H2 in-memory DB.
- PostgreSQL is deferred.
- When PostgreSQL is needed later, use the `postgres` Spring profile.
- Frontend may run fully with MSW in development.
- MSW must be opt-in so backend integration can still be verified in dev.

## Frontend Rules

### Folder Rules

- Route definition: `frontend/src/router.tsx`
- Page component: `frontend/src/pages/*`
- Shared layout: `frontend/src/components/layout/*`
- Reusable UI: `frontend/src/components/ui/*`
- API client: `frontend/src/api/*`
- Mock handlers: `frontend/src/mocks/*`
- Shared utilities: `frontend/src/lib/*`
- Local app state only when needed: `frontend/src/stores/*`

### Data Rules

- Server data uses TanStack Query.
- Pure UI state uses component state.
- Global auth/session state may use Zustand.
- Form input validation uses `zod + react-hook-form`.
- Unknown response data should be narrowed before use.

### Page Composition Rules

Each new page should be added in this order:

1. menu item
2. route
3. page component
4. API contract type
5. mock response
6. query hook or API function
7. loading, empty, and error states

### UI Rules

- Reuse `shadcn/ui` components first.
- Charts use `recharts` with the existing chart wrapper.
- Keep a consistent color/token system.
- Do not leave menu items pointing to routes that do not exist for long.

## Backend Rules

### API Rules

- Base path is `/api`.
- Controllers return DTOs, not entities.
- Request validation uses Bean Validation.
- Stats endpoints should keep one predictable query style.
- Authentication endpoints can stay simple while the app is screen-first.

### Runtime Rules

- Default local mode must boot without PostgreSQL.
- Production-only secrets must not be hardcoded later.
- PostgreSQL settings stay in a profile-specific config.

## TypeScript Rules

- Keep the current typed API pattern.
- Prefer `unknown` over `any`.
- Prefer `satisfies` and inferred schema types where useful.
- Avoid `@ts-ignore`.
- Tighten `tsconfig` gradually, not by breaking the project all at once.

## Quality Gates

Before closing a task, aim to pass:

- `npx tsc -b`
- `npm run build`
- `npm run lint`
- `npm run test`
- `./gradlew.bat test`

Temporary exception:

- While the project is still being stabilized, lint failures may be fixed in the next cleanup pass, but they should not be ignored indefinitely.

## What We Intentionally Defer

- final PostgreSQL schema
- migration strategy details
- production deployment details
- advanced authorization roles
- dashboard data accuracy tuning

## What Must Be Stable From Day One

- menu and route naming
- DTO naming and field shapes
- folder ownership
- local startup method
- auth flow shape

## Recommended Delivery Style

For each feature branch or task:

1. make the route visible
2. render the screen with mock data
3. lock the contract
4. connect the real backend later without changing the page structure
