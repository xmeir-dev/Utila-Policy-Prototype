import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  isConnected: boolean("is_connected").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  isConnected: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  amount: text("amount").notNull(),
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  txHash: text("tx_hash"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Policies table with comprehensive trigger conditions
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  action: text("action").notNull(), // 'allow', 'deny', 'require_approval'
  isActive: boolean("is_active").default(true),
  priority: integer("priority").notNull().default(0),
  
  // Trigger conditions with AND/OR logic
  conditionLogic: text("condition_logic").default("AND"), // 'AND' or 'OR'
  
  // Initiator conditions
  initiatorType: text("initiator_type"), // 'any', 'user', 'group'
  initiatorValues: text("initiator_values").array(), // user IDs or group names
  
  // Source wallet conditions
  sourceWalletType: text("source_wallet_type"), // 'any', 'specific'
  sourceWallets: text("source_wallets").array(), // wallet addresses
  
  // Destination conditions
  destinationType: text("destination_type"), // 'any', 'internal', 'external', 'whitelist'
  destinationValues: text("destination_values").array(), // specific addresses if whitelist
  
  // Amount threshold (in USD)
  amountCondition: text("amount_condition"), // 'any', 'above', 'below', 'between'
  amountMin: text("amount_min"), // stored as string for precision
  amountMax: text("amount_max"),
  
  // Asset type conditions
  assetType: text("asset_type"), // 'any', 'specific'
  assetValues: text("asset_values").array(), // asset symbols like ['BTC', 'ETH']
  
  // Approval settings (when action is 'require_approval')
  approvers: text("approvers").array(), // user IDs or addresses of approvers
  quorumRequired: integer("quorum_required").default(1), // number of approvals needed
  
  // Policy change approval tracking
  status: text("status").default("active"), // 'active', 'pending_approval', 'draft'
  pendingChanges: text("pending_changes"), // JSON string of proposed changes
  changeApprovers: text("change_approvals").array(), // approvers who approved the change
  changeApproversList: text("change_approvers_list").array(), // list of who CAN approve changes
  changeApprovalsRequired: integer("change_approvals_required").default(1),
  
  createdAt: text("created_at").default("now()"),
  updatedAt: text("updated_at"),
});

export const insertPolicySchema = createInsertSchema(policies).omit({ id: true, createdAt: true, updatedAt: true });

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

// Policy trigger condition types for frontend
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

// Simulation request schema
export const simulateTransactionSchema = z.object({
  initiator: z.string(),
  initiatorGroups: z.array(z.string()).optional(),
  sourceWallet: z.string(),
  destination: z.string(),
  destinationIsInternal: z.boolean(),
  amountUsd: z.number(),
  asset: z.string(),
});

export type SimulateTransactionRequest = z.infer<typeof simulateTransactionSchema>;

// Request/Response types
export type TransactionsListResponse = Transaction[];
export type PoliciesListResponse = Policy[];
