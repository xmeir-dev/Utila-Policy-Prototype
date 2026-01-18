/**
 * shared/schema.ts
 * 
 * Central data model definitions for the Utila crypto wallet management platform.
 * This file defines the database schema using Drizzle ORM and provides type-safe
 * schemas for data validation using Zod.
 * 
 * WHY THIS MATTERS:
 * - Single source of truth for data structures across frontend and backend
 * - Ensures type safety and runtime validation throughout the application
 * - Enables automatic form validation on the frontend using the same schemas
 */

import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * USERS TABLE
 * 
 * Represents authenticated users who can interact with the platform.
 * Each user is identified by their crypto wallet address.
 * 
 * WHY wallet-based auth: This is a crypto platform, so wallet addresses
 * serve as the primary identity mechanism (similar to MetaMask login).
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Unique wallet address serves as the user's identity (e.g., "0x123...abc")
  walletAddress: text("wallet_address").notNull().unique(),
  // Tracks whether the user is currently connected to the platform
  isConnected: boolean("is_connected").default(false),
});

// Schema for inserting new users - omits auto-generated fields like 'id'
export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  isConnected: true,
});

// Type definitions for TypeScript type safety
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

/**
 * TRANSACTIONS TABLE
 * 
 * Records all crypto transfers initiated through the platform.
 * Transactions may require multiple approvals before execution based on policies.
 * 
 * WHY track approvals: Enterprise crypto operations often require multi-sig
 * authorization to prevent unauthorized transfers and reduce fraud risk.
 */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  // Links transaction to the user who initiated it
  userId: integer("user_id").notNull(),
  // Transaction type (e.g., "Send ETH", "Transfer")
  type: text("type").notNull(),
  // Amount with currency symbol (e.g., "100 ETH", "50000 USDC")
  amount: text("amount").notNull(),
  // Workflow status: 'pending' awaits approval, 'completed' is done, 'failed' had an error
  status: text("status").notNull(),
  // Blockchain transaction hash once submitted to the network
  txHash: text("tx_hash"),
  // Human-readable name of who started this transaction
  initiatorName: text("initiator_name"),
  // Array of approver names who have signed off on this transaction
  // WHY array: Enables multi-signature approval workflows
  approvals: text("approvals").array(),
  // JSON array storing when each approval was given (format: [{approver: string, timestamp: string}])
  // Used to display approval history with timestamps in the UI
  approvalTimestamps: text("approval_timestamps"),
  // Number of approvals needed before transaction can execute
  // WHY configurable: Different transaction types may need different approval thresholds
  quorumRequired: integer("quorum_required").default(1),
  // Source wallet label (e.g., "Treasury", "Finances")
  fromWallet: text("from_wallet"),
  // Array of source wallet labels for multi-source transactions
  fromWallets: text("from_wallets").array(),
  // Array of source wallet addresses for multi-source transactions
  fromAddresses: text("from_addresses").array(),
  // Array of amounts from each source wallet
  fromAmounts: text("from_amounts").array(),
  // Destination blockchain address
  toAddress: text("to_address"),
  // Human-readable label for destination (e.g., "Bank of America")
  toLabel: text("to_label"),
  // Array of destination addresses for multi-recipient transactions
  toAddresses: text("to_addresses").array(),
  // Array of destination labels for multi-recipient transactions
  toLabels: text("to_labels").array(),
  // Array of amounts for each destination
  toAmounts: text("to_amounts").array(),
  // Array of authorized approver names from the matched policy
  // Used to check if initiator's approval should auto-count
  authorizedApprovers: text("authorized_approvers").array(),
  // ISO timestamp when transaction was created
  createdAt: text("created_at").default("now()"),
});

// Schema for creating transactions - excludes auto-generated fields
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

/**
 * POLICIES TABLE
 * 
 * Defines automated rules that govern transaction approval workflows.
 * Policies determine whether transactions are automatically allowed, denied,
 * or require manual approval based on various conditions.
 * 
 * WHY policies: Enterprise wallets need governance rules to:
 * - Prevent unauthorized large transfers
 * - Require multi-party approval for sensitive operations
 * - Automatically allow low-risk transactions to reduce friction
 * 
 * POLICY EVALUATION ORDER: Policies are evaluated by priority (lower number = higher priority).
 * The first matching policy determines the action; if no policy matches, default is deny.
 */
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  // Human-readable policy name (e.g., "Large Transfer Approval")
  name: text("name").notNull(),
  // Detailed explanation of what this policy does and why
  description: text("description").notNull(),
  // What happens when policy matches: 'allow', 'deny', or 'require_approval'
  action: text("action").notNull(),
  // Whether this policy is currently being enforced
  isActive: boolean("is_active").default(true),
  // Evaluation order - lower numbers are checked first
  priority: integer("priority").notNull().default(0),
  
  /**
   * CONDITION LOGIC
   * 
   * Determines how multiple conditions are combined:
   * - 'AND': ALL conditions must match for policy to trigger
   * - 'OR': ANY condition matching triggers the policy
   * 
   * WHY this matters: Allows flexible rule composition like
   * "transfers over $10k AND from Treasury" vs "from Treasury OR to external"
   */
  conditionLogic: text("condition_logic").default("AND"),
  
  /**
   * INITIATOR CONDITIONS
   * 
   * Controls which users can trigger this policy:
   * - 'any': Applies to all users
   * - 'user': Only specific users (listed in initiatorValues)
   * - 'group': Users belonging to specific groups
   */
  initiatorType: text("initiator_type"),
  initiatorValues: text("initiator_values").array(),
  
  /**
   * SOURCE WALLET CONDITIONS
   * 
   * Controls which source wallets this policy applies to:
   * - 'any': All wallets
   * - 'specific': Only wallets listed in sourceWallets array
   * 
   * WHY: Different wallets may have different security requirements
   * (e.g., Treasury requires more approvals than petty cash)
   */
  sourceWalletType: text("source_wallet_type"),
  sourceWallets: text("source_wallets").array(),
  
  /**
   * DESTINATION CONDITIONS
   * 
   * Controls allowed/restricted destinations:
   * - 'any': No destination restrictions
   * - 'internal': Only to other company wallets
   * - 'external': Only to addresses outside the organization
   * - 'whitelist': Only to pre-approved addresses
   * 
   * WHY: External transfers typically need more scrutiny than internal moves
   */
  destinationType: text("destination_type"),
  destinationValues: text("destination_values").array(),
  
  /**
   * AMOUNT THRESHOLD CONDITIONS
   * 
   * Triggers policy based on USD value of transfer:
   * - 'any': No amount restrictions
   * - 'above': Only transfers exceeding amountMin
   * - 'below': Only transfers under amountMin
   * - 'between': Transfers between amountMin and amountMax
   * 
   * WHY: Large transfers typically require additional oversight
   */
  amountCondition: text("amount_condition"),
  amountMin: text("amount_min"), // Stored as string to preserve precision
  amountMax: text("amount_max"),
  
  /**
   * ASSET TYPE CONDITIONS
   * 
   * Restricts policy to specific cryptocurrencies:
   * - 'any': Applies to all assets
   * - 'specific': Only assets in assetValues (e.g., ['ETH', 'USDC'])
   * 
   * WHY: Some tokens may have different risk profiles or liquidity considerations
   */
  assetType: text("asset_type"),
  assetValues: text("asset_values").array(),
  
  /**
   * TRANSACTION APPROVAL SETTINGS
   * 
   * When action is 'require_approval', these fields define who can approve
   * and how many approvals are needed.
   */
  approvers: text("approvers").array(), // Users who can approve transactions matching this policy
  quorumRequired: integer("quorum_required").default(1), // Minimum approvals needed
  
  /**
   * POLICY CHANGE APPROVAL TRACKING
   * 
   * Policies themselves can require approval to modify, preventing unauthorized
   * changes to security rules. This creates an audit trail and governance layer.
   * 
   * WHY: Prevents single-point-of-failure where one admin could weaken security
   */
  status: text("status").default("active"), // 'active', 'pending_approval', 'draft'
  pendingChanges: text("pending_changes"), // JSON string of proposed modifications
  changeApprovers: text("change_approvals").array(), // Who has approved the pending change
  changeApproversList: text("change_approvers_list").array(), // Who CAN approve changes
  changeApprovalsRequired: integer("change_approvals_required").default(1),
  changeInitiator: text("change_initiator"), // Who requested the change
  
  // Timestamps for audit trail
  createdAt: text("created_at").default("now()"),
  updatedAt: text("updated_at"),
});

// Schema for creating/updating policies - excludes auto-managed fields
export const insertPolicySchema = createInsertSchema(policies).omit({ id: true, createdAt: true, updatedAt: true });

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

/**
 * TRIGGER CONDITION SCHEMA
 * 
 * Zod schema for validating policy trigger conditions on the frontend.
 * Used in the PolicyForm component to ensure valid condition configurations.
 */
export const triggerConditionSchema = z.object({
  conditionLogic: z.enum(['AND', 'OR']).default('AND'),
  initiatorType: z.enum(['any', 'user', 'group']).optional(),
  initiatorValues: z.array(z.string()).optional(),
  sourceWalletType: z.enum(['any', 'specific']).optional(),
  sourceWallets: z.array(z.string()).optional(),
  destinationType: z.enum(['any', 'internal', 'external', 'whitelist']).optional(),
  destinationValues: z.array(z.string()).optional(),
  amountCondition: z.enum(['any', 'above', 'below', 'between']).optional(),
  amountMin: z.string().optional(),
  amountMax: z.string().optional(),
  assetType: z.enum(['any', 'specific']).optional(),
  assetValues: z.array(z.string()).optional(),
});

export type TriggerConditions = z.infer<typeof triggerConditionSchema>;

/**
 * SIMULATION REQUEST SCHEMA
 * 
 * Defines the shape of data needed to simulate a transaction against policies.
 * Used by the TransactionSimulator component to test "what-if" scenarios.
 * 
 * WHY simulation: Allows users to verify policies work as expected before
 * real transactions, reducing costly mistakes and policy misconfiguration.
 */
export const simulateTransactionSchema = z.object({
  // Who is initiating the transaction
  initiator: z.string(),
  // Groups the initiator belongs to (for group-based policy matching)
  initiatorGroups: z.array(z.string()).optional(),
  // Source wallet address or identifier
  sourceWallet: z.string(),
  // Destination address
  destination: z.string(),
  // Whether destination is an internal company wallet
  destinationIsInternal: z.boolean(),
  // USD value of the transfer for amount-based policy matching
  amountUsd: z.number(),
  // Cryptocurrency being transferred (e.g., 'ETH', 'USDC')
  asset: z.string(),
});

export type SimulateTransactionRequest = z.infer<typeof simulateTransactionSchema>;

/**
 * API RESPONSE TYPES
 * 
 * Type definitions for API responses to ensure frontend type safety.
 */
export type TransactionsListResponse = Transaction[];
export type PoliciesListResponse = Policy[];

/**
 * POLICY HISTORY TABLE
 * 
 * Tracks all changes made to policies for audit and compliance purposes.
 * Records creation, edits, deletions, and approval changes.
 */
export const policyHistory = pgTable("policy_history", {
  id: serial("id").primaryKey(),
  // Reference to the policy (may be null if policy was deleted)
  policyId: integer("policy_id"),
  // Name of the policy at the time of action
  policyName: text("policy_name").notNull(),
  // Type of action: 'creation', 'edit', 'deletion', 'change-approval'
  action: text("action").notNull(),
  // Who performed the action
  performedBy: text("performed_by"),
  // JSON string of changes made (for edits - shows before/after)
  changes: text("changes"),
  // ISO timestamp when action occurred
  createdAt: text("created_at").default("now()"),
});

export const insertPolicyHistorySchema = createInsertSchema(policyHistory).omit({ id: true, createdAt: true });

export type PolicyHistory = typeof policyHistory.$inferSelect;
export type InsertPolicyHistory = z.infer<typeof insertPolicyHistorySchema>;
