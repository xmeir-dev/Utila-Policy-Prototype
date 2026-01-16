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