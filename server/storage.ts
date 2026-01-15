import { users, transactions, type User, type InsertUser, type Transaction, type InsertTransaction } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getPendingTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
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
}

export const storage = new DatabaseStorage();
