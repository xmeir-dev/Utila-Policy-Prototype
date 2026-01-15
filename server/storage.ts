import { users, transactions, policies, type User, type InsertUser, type Transaction, type InsertTransaction, type Policy, type InsertPolicy, type SimulateTransactionRequest } from "@shared/schema";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";

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
  updatePolicy(id: number, policy: Partial<InsertPolicy>): Promise<Policy | undefined>;
  deletePolicy(id: number): Promise<boolean>;
  togglePolicy(id: number): Promise<Policy | undefined>;
  reorderPolicies(orderedIds: number[]): Promise<Policy[]>;
  simulateTransaction(request: SimulateTransactionRequest): Promise<{ matchedPolicy: Policy | null; action: string; reason: string }>;
  approvePolicyChange(id: number, approver: string): Promise<Policy | undefined>;
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
    return await db.select().from(policies).orderBy(asc(policies.priority));
  }

  async getPolicy(id: number): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    return policy;
  }

  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    // Get the highest priority to set new policy at the end
    const allPolicies = await this.getPolicies();
    const maxPriority = allPolicies.length > 0 
      ? Math.max(...allPolicies.map(p => p.priority)) 
      : -1;
    
    const [newPolicy] = await db.insert(policies).values({
      ...policy,
      priority: maxPriority + 1,
    }).returning();
    return newPolicy;
  }

  async updatePolicy(id: number, updates: Partial<InsertPolicy>): Promise<Policy | undefined> {
    const [updated] = await db
      .update(policies)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(policies.id, id))
      .returning();
    return updated;
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

  async reorderPolicies(orderedIds: number[]): Promise<Policy[]> {
    // Update priority based on position in the array
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(policies)
        .set({ priority: i })
        .where(eq(policies.id, orderedIds[i]));
    }
    return await this.getPolicies();
  }

  async simulateTransaction(request: SimulateTransactionRequest): Promise<{ matchedPolicy: Policy | null; action: string; reason: string }> {
    const allPolicies = await this.getPolicies();
    const activePolicies = allPolicies.filter(p => p.isActive && p.status === 'active');

    for (const policy of activePolicies) {
      const matches = this.checkPolicyMatch(policy, request);
      if (matches.matched) {
        return {
          matchedPolicy: policy,
          action: policy.action,
          reason: matches.reason,
        };
      }
    }

    // No policy matched - default to deny
    return {
      matchedPolicy: null,
      action: 'deny',
      reason: 'No matching policy found. Default action is deny.',
    };
  }

  private checkPolicyMatch(policy: Policy, request: SimulateTransactionRequest): { matched: boolean; reason: string } {
    const conditions: { name: string; matched: boolean }[] = [];
    const logic = policy.conditionLogic || 'AND';

    // Check initiator condition
    if (policy.initiatorType && policy.initiatorType !== 'any') {
      let initiatorMatch = false;
      if (policy.initiatorType === 'user' && policy.initiatorValues?.includes(request.initiator)) {
        initiatorMatch = true;
      } else if (policy.initiatorType === 'group' && request.initiatorGroups?.some(g => policy.initiatorValues?.includes(g))) {
        initiatorMatch = true;
      }
      conditions.push({ name: 'Initiator', matched: initiatorMatch });
    }

    // Check source wallet condition
    if (policy.sourceWalletType && policy.sourceWalletType !== 'any') {
      const sourceMatch = policy.sourceWallets?.includes(request.sourceWallet) ?? false;
      conditions.push({ name: 'Source Wallet', matched: sourceMatch });
    }

    // Check destination condition
    if (policy.destinationType && policy.destinationType !== 'any') {
      let destMatch = false;
      if (policy.destinationType === 'internal' && request.destinationIsInternal) {
        destMatch = true;
      } else if (policy.destinationType === 'external' && !request.destinationIsInternal) {
        destMatch = true;
      } else if (policy.destinationType === 'whitelist' && policy.destinationValues?.includes(request.destination)) {
        destMatch = true;
      }
      conditions.push({ name: 'Destination', matched: destMatch });
    }

    // Check amount condition
    if (policy.amountCondition && policy.amountCondition !== 'any') {
      let amountMatch = false;
      const min = policy.amountMin ? parseFloat(policy.amountMin) : 0;
      const max = policy.amountMax ? parseFloat(policy.amountMax) : Infinity;
      
      if (policy.amountCondition === 'above' && request.amountUsd > min) {
        amountMatch = true;
      } else if (policy.amountCondition === 'below' && request.amountUsd < min) {
        amountMatch = true;
      } else if (policy.amountCondition === 'between' && request.amountUsd >= min && request.amountUsd <= max) {
        amountMatch = true;
      }
      conditions.push({ name: 'Amount', matched: amountMatch });
    }

    // Check asset type condition
    if (policy.assetType && policy.assetType !== 'any') {
      const assetMatch = policy.assetValues?.includes(request.asset) ?? false;
      conditions.push({ name: 'Asset', matched: assetMatch });
    }

    // If no conditions were set, policy matches all transactions
    if (conditions.length === 0) {
      return { matched: true, reason: `Policy "${policy.name}" matches all transactions (no conditions set).` };
    }

    // Evaluate based on logic
    const allMatched = conditions.every(c => c.matched);
    const anyMatched = conditions.some(c => c.matched);
    
    const matched = logic === 'AND' ? allMatched : anyMatched;
    const matchedConditions = conditions.filter(c => c.matched).map(c => c.name);
    const unmatchedConditions = conditions.filter(c => !c.matched).map(c => c.name);

    if (matched) {
      return { 
        matched: true, 
        reason: `Policy "${policy.name}" matched. Conditions met: ${matchedConditions.join(', ') || 'all'}.`
      };
    }

    return { 
      matched: false, 
      reason: `Policy "${policy.name}" did not match. Failed conditions: ${unmatchedConditions.join(', ')}.`
    };
  }

  async approvePolicyChange(id: number, approver: string): Promise<Policy | undefined> {
    const policy = await this.getPolicy(id);
    if (!policy || policy.status !== 'pending_approval') return undefined;

    const currentApprovals = policy.changeApprovers || [];
    if (currentApprovals.includes(approver)) {
      return policy; // Already approved
    }

    const newApprovals = [...currentApprovals, approver];
    const requiredApprovals = policy.changeApprovalsRequired || 1;

    if (newApprovals.length >= requiredApprovals) {
      // Apply pending changes and activate
      const pendingChanges = policy.pendingChanges ? JSON.parse(policy.pendingChanges) : {};
      const [updated] = await db
        .update(policies)
        .set({
          ...pendingChanges,
          status: 'active',
          pendingChanges: null,
          changeApprovers: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(policies.id, id))
        .returning();
      return updated;
    } else {
      // Just add the approval
      const [updated] = await db
        .update(policies)
        .set({ changeApprovers: newApprovals })
        .where(eq(policies.id, id))
        .returning();
      return updated;
    }
  }
}

export const storage = new DatabaseStorage();
