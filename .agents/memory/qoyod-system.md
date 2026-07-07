---
name: Qoyod Procurement System
description: Key decisions, role map, workflow state machine, and auth for the Qoyod Vendor & Purchase System
---

## Auth
- Email-only (no password). Any `@qoyod.com` email is valid.
- Role derived server-side from email address. Cookie: `user_email` (signed with SESSION_SECRET via cookie-parser).
- `requireAuth` middleware in `artifacts/api-server/src/middlewares/auth.ts` added to all non-health routes.
- Frontend stores `auth_email` in localStorage to decide whether to call `/api/auth/me` on load.

## Role Map
| Role | Email |
|------|-------|
| admin | s.elkherbawy@qoyod.com |
| accounts_manager | balghafli@qoyod.com |
| accounts_employee | ohamdy@qoyod.com |
| employee | any other @qoyod.com |

## Purchase Request State Machine
```
pending_manager
  → approved_by_manager (manager approves) — accounts_manager can now act
  → rejected_by_manager
  → pending_clarification_employee_manager (manager asks clarification)
    → pending_manager (employee responds)

approved_by_manager
  → approved_by_accounts (accounts_manager approves)
  → rejected_by_accounts
  → pending_clarification_employee_accounts (accounts_manager asks)
    → approved_by_manager (employee responds)

approved_by_accounts
  → executed (accounts_employee executes with final_amount)
```

**Why:** Frontend `canApproveReject` checks `approved_by_manager` (not `pending_accounts`) for accounts_manager role.

## DB Schema
- Tables: vendor_categories, vendors, vendor_category_links, vendor_documents, vendor_transactions, purchase_requests, request_activities
- Status is unconstrained text (by design for flexibility); validate at route level.

## Codegen
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- React hooks: `lib/api-client-react/src/generated/`
- Zod schemas: `lib/api-zod/src/generated/`
- After schema changes, run `pnpm run typecheck:libs` (builds tsc project refs) before running api-server typecheck.

## Dashboard recent-activity
- `useGetRecentActivity()` returns `PurchaseRequest[]` (not `RequestActivity[]`).
- Dashboard renders them as PR summary cards, not activity feed items.
