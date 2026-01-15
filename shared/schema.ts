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

// Policies table
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  action: text("action").notNull(), // 'approve', 'deny', 'require_approval'
  isActive: boolean("is_active").default(true),
});

export const insertPolicySchema = createInsertSchema(policies).omit({ id: true });

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

// Request/Response types
export type TransactionsListResponse = Transaction[];
export type PoliciesListResponse = Policy[];
