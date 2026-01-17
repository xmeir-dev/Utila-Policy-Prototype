/**
 * storage.ts
 * 
 * Data access layer implementing all database operations.
 * Abstracts Drizzle ORM queries behind a clean interface for testability.
 * 
 * Key responsibilities:
 * - User authentication state management
 * - Transaction CRUD with multi-sig approval tracking
 * - Policy CRUD with change approval workflow
 * - Transaction simulation against policy rules
 */

import { users, transactions, policies, type User, type InsertUser, type Transaction, type InsertTransaction, type Policy, type InsertPolicy, type SimulateTransactionRequest } from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";

/**
 * Storage interface - defines all data operations.
 * Enables swapping implementations (e.g., for testing with in-memory storage).
 */
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getPendingTransactions(): Promise<Transaction[]>;
  getTransactions(): Promise<Transaction[]>;
  getAllTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  getPolicies(): Promise<Policy[]>;
  getPolicy(id: number): Promise<Policy | undefined>;
  getPendingPolicyChanges(userName: string): Promise<Policy[]>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: number, policy: Partial<InsertPolicy>): Promise<Policy | undefined>;
  submitPolicyChange(id: number, changes: Partial<InsertPolicy>, submitter: string, submitterName?: string): Promise<Policy | undefined | { error: string }>;
  submitPolicyDeletion(id: number, submitter: string, submitterName?: string): Promise<Policy | undefined | { error: string }>;
  cancelPolicyChange(id: number): Promise<Policy | undefined>;
  deletePolicy(id: number): Promise<boolean>;
  togglePolicy(id: number): Promise<Policy | undefined>;
  reorderPolicies(orderedIds: number[]): Promise<Policy[]>;
  simulateTransaction(request: SimulateTransactionRequest): Promise<{ matchedPolicy: Policy | null; action: string; reason: string }>;
  approvePolicyChange(id: number, approver: string): Promise<Policy | undefined>;
  approveTransaction(id: number, approver: string): Promise<Transaction | undefined>;
}

/**
 * PostgreSQL implementation of the storage interface using Drizzle ORM.
 */
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

  async getPendingTransactions(): Promise<Transaction[]> {
    // Get all pending transactions - show to everyone
    const pendingTxs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.status, "pending"));
    
    return pendingTxs;
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values({
      ...tx,
      createdAt: new Date().toISOString(),
    }).returning();
    return transaction;
  }

  async getTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.id));
  }

  async getAllTransactions(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.id));
  }

  async getPolicies(): Promise<Policy[]> {
    return await db.select().from(policies).orderBy(asc(policies.priority));
  }

  async getPolicy(id: number): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    return policy;
  }

  async getPendingPolicyChanges(userName: string): Promise<Policy[]> {
    const allPolicies = await this.getPolicies();
    const pendingPolicies = allPolicies.filter(p => p.status === 'pending_approval');
    
    // Return policies where user is an approver for policy changes
    // For now, we return all pending policies (any user can approve)
    // In production, you'd filter by changeApproversList
    return pendingPolicies;
  }

  /**
   * Queues a policy modification for approval.
   * The original policy remains active until the change is fully approved.
   * Uses approval settings from existing policies to determine quorum requirements.
   * 
   * VALIDATION: Ensures the quorum can be reached after excluding the submitter
   * from the list of approvers (since submitters cannot approve their own changes).
   */
  async submitPolicyChange(id: number, changes: Partial<InsertPolicy>, submitter: string, submitterName?: string): Promise<Policy | undefined | { error: string }> {
    const policy = await this.getPolicy(id);
    if (!policy) return undefined;

    // Use the policy's own governance settings (changeApproversList and changeApprovalsRequired)
    // These are set when the policy is created and define who can modify the policy
    const approversList = policy.changeApproversList || [];
    const quorumRequired = policy.changeApprovalsRequired || 1;

    // CRITICAL FIX: Validate that quorum is achievable after excluding the submitter
    // The submitter cannot approve their own change, so we need at least quorumRequired
    // other approvers available
    if (approversList.length > 0) {
      const effectiveName = submitterName || submitter;
      
      // Safety check: If the resolved name looks like a wallet address (starts with "0x"),
      // but the approvers list contains human names, we can't reliably identify the submitter
      // to exclude them from the quorum calculation. Fail safe by blocking the submission.
      const nameIsWalletAddress = effectiveName.startsWith('0x');
      const approversAreNames = approversList.every(name => !name.startsWith('0x'));
      
      if (nameIsWalletAddress && approversAreNames) {
        return { 
          error: `Cannot submit change: Unable to verify your identity against the approvers list. Please contact an administrator to ensure your wallet address is properly registered.`
        };
      }
      
      const eligibleApprovers = approversList.filter(name => name !== effectiveName);
      
      if (eligibleApprovers.length < quorumRequired) {
        return { 
          error: `Cannot submit change: This policy requires ${quorumRequired} approval(s), but only ${eligibleApprovers.length} eligible approver(s) remain after excluding you as the submitter. Either reduce the required approvals or have another authorized user submit this change.`
        };
      }
    }

    const [updated] = await db
      .update(policies)
      .set({
        status: 'pending_approval',
        pendingChanges: JSON.stringify(changes),
        changeApprovers: [],
        changeInitiator: submitter,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  /**
   * Queues a policy for deletion with approval workflow.
   * Uses __delete flag in pendingChanges to indicate deletion intent.
   * Prevents accidental or unauthorized removal of security policies.
   * 
   * VALIDATION: Ensures the quorum can be reached after excluding the submitter.
   */
  async submitPolicyDeletion(id: number, submitter: string, submitterName?: string): Promise<Policy | undefined | { error: string }> {
    const policy = await this.getPolicy(id);
    if (!policy) return undefined;

    const approversList = policy.changeApproversList || [];
    const quorumRequired = policy.changeApprovalsRequired || 1;

    // CRITICAL FIX: Validate that quorum is achievable after excluding the submitter
    if (approversList.length > 0) {
      const effectiveName = submitterName || submitter;
      
      // Safety check: If the resolved name looks like a wallet address (starts with "0x"),
      // but the approvers list contains human names, we can't reliably identify the submitter
      // to exclude them from the quorum calculation. Fail safe by blocking the submission.
      const nameIsWalletAddress = effectiveName.startsWith('0x');
      const approversAreNames = approversList.every(name => !name.startsWith('0x'));
      
      if (nameIsWalletAddress && approversAreNames) {
        return { 
          error: `Cannot submit deletion request: Unable to verify your identity against the approvers list. Please contact an administrator to ensure your wallet address is properly registered.`
        };
      }
      
      const eligibleApprovers = approversList.filter(name => name !== effectiveName);
      
      if (eligibleApprovers.length < quorumRequired) {
        return { 
          error: `Cannot submit deletion request: This policy requires ${quorumRequired} approval(s), but only ${eligibleApprovers.length} eligible approver(s) remain after excluding you as the submitter. Either reduce the required approvals or have another authorized user submit this request.`
        };
      }
    }

    // Use the policy's own governance settings - no need to override them
    const [updated] = await db
      .update(policies)
      .set({
        status: 'pending_approval',
        pendingChanges: JSON.stringify({ __delete: true }),
        changeApprovers: [],
        changeInitiator: submitter,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  /**
   * Cancels a pending policy change, returning the policy to active status.
   * Can be used by authorized approvers to unstick policies with impossible quorum.
   */
  async cancelPolicyChange(id: number): Promise<Policy | undefined> {
    const policy = await this.getPolicy(id);
    if (!policy || policy.status !== 'pending_approval') return undefined;

    const [updated] = await db
      .update(policies)
      .set({
        status: 'active',
        pendingChanges: null,
        changeApprovers: null,
        changeInitiator: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  /**
   * Check if a user is authorized to modify a policy.
   * Returns true if the user is in the policy's changeApproversList.
   */
  async canUserModifyPolicy(id: number, userName: string): Promise<boolean> {
    const policy = await this.getPolicy(id);
    if (!policy) return false;
    
    const approversList = policy.changeApproversList || [];
    // If no approvers list defined, anyone can modify (for backwards compatibility)
    if (approversList.length === 0) return true;
    
    return approversList.includes(userName);
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

  /**
   * Evaluates a transaction against all active policies in priority order.
   * Returns the first matching policy's action, or 'deny' if no match.
   * Also returns policyInReview info to alert users when the matched policy
   * has pending changes (edit or deletion) awaiting approval.
   */
  async simulateTransaction(request: SimulateTransactionRequest): Promise<{ 
    matchedPolicy: Policy | null; 
    action: string; 
    reason: string;
    policyInReview?: {
      isInReview: boolean;
      changeType: 'edit' | 'delete' | null;
      policyName: string | null;
    };
  }> {
    const allPolicies = await this.getPolicies();
    // Pending policies are still enforced - changes don't take effect until approved
    const activePolicies = allPolicies.filter(p => p.isActive && (p.status === 'active' || p.status === 'pending_approval'));

    // Evaluate policies in priority order - first match wins
    for (const policy of activePolicies) {
      const matches = this.checkPolicyMatch(policy, request);
      if (matches.matched) {
        // Check if this policy has pending changes (edit or delete awaiting approval)
        // This info is returned to the frontend to warn users before proceeding
        let policyInReview = {
          isInReview: false,
          changeType: null as 'edit' | 'delete' | null,
          policyName: null as string | null,
        };

        if (policy.status === 'pending_approval' && policy.pendingChanges) {
          const pendingChanges = JSON.parse(policy.pendingChanges);
          // __delete flag indicates deletion request, otherwise it's an edit
          policyInReview = {
            isInReview: true,
            changeType: pendingChanges.__delete === true ? 'delete' : 'edit',
            policyName: policy.name,
          };
        }

        return {
          matchedPolicy: policy,
          action: policy.action,
          reason: matches.reason,
          policyInReview,
        };
      }
    }

    // Fail-safe: deny by default if no policy matches
    return {
      matchedPolicy: null,
      action: 'deny',
      reason: 'No matching policy found. Default action is deny.',
      policyInReview: {
        isInReview: false,
        changeType: null,
        policyName: null,
      },
    };
  }

  /**
   * Checks if a transaction matches a policy's conditions.
   * Supports AND/OR logic for combining multiple conditions.
   * Returns detailed match info for debugging and user feedback.
   */
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

  /**
   * Records an approval for a pending policy change.
   * Automatically applies changes when quorum is reached.
   * For deletions, removes the policy entirely once approved.
   */
  async approvePolicyChange(id: number, approver: string): Promise<Policy | undefined> {
    const policy = await this.getPolicy(id);
    if (!policy || policy.status !== 'pending_approval') return undefined;

    const currentApprovals = policy.changeApprovers || [];
    // Prevent duplicate approvals from same user
    if (currentApprovals.includes(approver)) {
      return policy;
    }

    const newApprovals = [...currentApprovals, approver];
    const requiredApprovals = policy.changeApprovalsRequired || 1;

    if (newApprovals.length >= requiredApprovals) {
      // Quorum reached - apply the pending changes
      const pendingChanges = policy.pendingChanges ? JSON.parse(policy.pendingChanges) : {};
      
      // Handle deletion vs. modification
      if (pendingChanges.__delete === true) {
        await db.delete(policies).where(eq(policies.id, id));
        return { ...policy, status: 'deleted' } as Policy;
      }
      
      // Apply modifications and reset approval tracking
      const [updated] = await db
        .update(policies)
        .set({
          ...pendingChanges,
          status: 'active',
          pendingChanges: null,
          changeApprovers: null,
          changeInitiator: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(policies.id, id))
        .returning();
      return updated;
    } else {
      // Quorum not yet reached - just record the approval
      const [updated] = await db
        .update(policies)
        .set({ changeApprovers: newApprovals })
        .where(eq(policies.id, id))
        .returning();
      return updated;
    }
  }

  /**
   * Records an approval for a pending transaction.
   * Completes the transaction when quorum is reached.
   * In production, this would trigger the actual blockchain transaction.
   */
  async approveTransaction(id: number, approver: string): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!tx || tx.status !== 'pending') return undefined;

    const currentApprovals = tx.approvals || [];
    if (currentApprovals.includes(approver)) {
      return tx; // Prevent duplicate approvals
    }

    const newApprovals = [...currentApprovals, approver];
    const requiredApprovals = tx.quorumRequired || 1;
    
    // Track approval timestamps for audit trail
    const currentTimestamps = tx.approvalTimestamps ? JSON.parse(tx.approvalTimestamps) : [];
    const newTimestamps = [...currentTimestamps, { approver, timestamp: new Date().toISOString() }];

    if (newApprovals.length >= requiredApprovals) {
      // All required approvals collected - execute transfer
      const [updated] = await db
        .update(transactions)
        .set({
          approvals: newApprovals,
          approvalTimestamps: JSON.stringify(newTimestamps),
          status: 'completed',
        })
        .where(eq(transactions.id, id))
        .returning();
      return updated;
    } else {
      // Still waiting for more approvals
      const [updated] = await db
        .update(transactions)
        .set({ 
          approvals: newApprovals,
          approvalTimestamps: JSON.stringify(newTimestamps),
        })
        .where(eq(transactions.id, id))
        .returning();
      return updated;
    }
  }
}

export const storage = new DatabaseStorage();
