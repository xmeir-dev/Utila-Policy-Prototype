import { users, transactions, policies, type User, type InsertUser, type Transaction, type InsertTransaction, type Policy, type InsertPolicy } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getPendingTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  getPolicies(): Promise<Policy[]>;
  getPolicy(id: number): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  deletePolicy(id: number): Promise<boolean>;
  togglePolicy(id: number): Promise<Policy | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByAddress(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, address));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getPendingTransactions(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.status, "pending")));
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(tx).returning();
    return transaction;
  }

  async getPolicies(): Promise<Policy[]> {
    return await db.select().from(policies);
  }

  async getPolicy(id: number): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    return policy;
  }

  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const [newPolicy] = await db.insert(policies).values(policy).returning();
    return newPolicy;
  }

  async deletePolicy(id: number): Promise<boolean> {
    const result = await db.delete(policies).where(eq(policies.id, id)).returning();
    return result.length > 0;
  }

  async togglePolicy(id: number): Promise<Policy | undefined> {
    const policy = await this.getPolicy(id);
    if (!policy) return undefined;
    const [updated] = await db
      .update(policies)
      .set({ isActive: !policy.isActive })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
