# Utila Wallet Demo

## Overview

A crypto wallet demo application built with React and Express. The app provides a simulated wallet connection experience with a dark-themed, modern UI. Users can "connect" a wallet (simulated via API calls, no real Web3 provider) and view pending transactions. The project follows a monorepo structure with client, server, and shared code directories.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: Type-safe API routes defined in `shared/routes.ts` using Zod schemas
- **Session Management**: connect-pg-simple for PostgreSQL session storage

### Project Structure
```
client/           # React frontend application
├── src/
│   ├── components/   # React components including shadcn/ui
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility functions and query client
│   └── pages/        # Page components
server/           # Express backend
├── db.ts         # Database connection
├── routes.ts     # API route handlers
├── storage.ts    # Data access layer
└── index.ts      # Server entry point
shared/           # Shared code between client and server
├── schema.ts     # Drizzle database schema
└── routes.ts     # API route definitions with Zod validation
```

### Key Design Patterns
- **Type-safe API contracts**: Shared route definitions ensure frontend and backend stay in sync
- **Repository pattern**: `storage.ts` abstracts database operations
- **Component composition**: shadcn/ui provides composable, accessible UI primitives

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema defined in `shared/schema.ts`, migrations in `./migrations`

### Key npm Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM with Zod schema generation
- `framer-motion`: Animation library
- `zod`: Runtime type validation
- Full shadcn/ui component suite via Radix UI primitives

### Development Tools
- `tsx`: TypeScript execution for development
- `esbuild`: Production bundling for server
- `vite`: Frontend development and bundling

### Database Schema
Key tables:
1. `users`: id, walletAddress, isConnected
2. `transactions`: id, userId, type, amount, status, txHash
3. `policies`: id, name, description, status, conditions, approvers, pendingChanges, changeApprovers, etc.

Run `npm run db:push` to sync schema to database.

## Key Features

### Policy Change Approval System
When a policy is edited or deleted, the changes don't take effect immediately. Instead:
1. Changes are saved with status `pending_approval` and stored in `pendingChanges` field as JSON
2. For edits: the proposed changes are stored; for deletes: `{ "__delete": true }` is stored
3. The policy shows a "Changes pending" or "Deletion pending" badge in the policies list
4. Clicking the badge opens a review modal showing current vs. proposed values (or deletion notice)
5. Authorized users can approve the change via the Approve button
6. Once the required number of approvals is reached (default 1), changes are applied automatically
7. For deletes: policy is permanently removed; for edits: changes are applied and status returns to `active`

**API Endpoints:**
- `GET /api/policies/pending?userName=<name>` - Fetch policies with pending changes
- `PUT /api/policies/:id` - Submit policy changes for approval
- `POST /api/policies/:id/request-deletion` - Submit policy deletion for approval
- `POST /api/policies/:id/approve-change` - Approve a pending policy change or deletion

**UI Elements:**
- Delete button is at the bottom of the Edit Policy dialog (goes through same review process as edits)
- Policies with pending edits show amber "Changes pending" badge
- Policies with pending deletion show red "Deletion pending" badge
- Both badges expand on hover to reveal a chevron and are clickable to view details

**Auto-Approval System:**
- When a user submits a policy change or deletion, their submission automatically counts as their first approval (if they are in `changeApproversList`)
- If the submitter's approval alone meets the quorum (e.g., quorum=1), changes are applied immediately without waiting for additional approvals
- Toast messages reflect this: "Policy updated" / "Policy deleted" with "automatically approved" message when auto-applied
- If more approvals are needed, the policy enters `pending_approval` status with the submitter's approval pre-counted
- Quorum validation checks if `(submitter's approval) + remaining eligible approvers >= quorum required`
- If quorum is mathematically impossible, the submission is rejected with a clear error message

**Self-Approval Rules:**
- The submitter's initial submission counts as their approval, so they cannot approve again afterwards
- If the current user's wallet address matches the policy's `changeInitiator`, they see a "You initiated this change" badge in the review modal
- Address-to-name mapping in `Home.tsx` and `Policies.tsx` uses `ADDRESS_TO_NAME` constant to display friendly names

**Authorization System:**
- Each policy has its own governance settings: `changeApproversList` (who can modify) and `changeApprovalsRequired` (how many approvals needed)
- Only users in `changeApproversList` can request changes or approve them
- The backend checks authorization in `server/routes.ts` and returns 403 for unauthorized users
- The frontend shows "Not Authorized" toast when an unauthorized user tries to modify a policy

**Pending Changes Review Modal (Policies page):**
- Shows initiator name ("Requested by: <name>")
- Shows approval progress ("X of Y approvals received")
- Shows who has already approved ("Approved by: <names>")
- Authorized users who haven't approved see an "Approve" button
- Initiators see "You initiated this change" badge
- Users who already approved see "You have approved this change" badge
- Modal derives data from fresh React Query cache to ensure updated counts after approval

**Wallet Address to Name Mapping:**
- Meir: 0xc333b115a72a3519b48E9B4f9D1bBD4a34C248b1
- Ishai: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
- Omer: 0xdAC17F958D2ee523a2206206994597C13D831ec7
- Lena: 0x6B175474E89094C44Da98b954EesecdB6F8e5389
- Sam: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045