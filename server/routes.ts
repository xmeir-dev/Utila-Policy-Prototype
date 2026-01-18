/**
 * routes.ts
 * 
 * API route definitions for the Utila platform.
 * Handles wallet authentication, transaction management, and policy CRUD operations.
 * 
 * Route organization:
 * - /api/wallet/* - Authentication and session management
 * - /api/transactions/* - Transfer creation and approval workflows
 * - /api/policies/* - Policy CRUD, simulation, and change approval
 */

import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertTransactionSchema } from "@shared/schema";
import { openai } from "./replit_integrations/audio/client";

// Maps wallet addresses to user names - must match client-side WALLET_USERS
const ADDRESS_TO_NAME: Record<string, string> = {
  "0xc333b115a72a3519b48E9B4f9D1bBD4a34C248b1": "Meir",
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": "Ishai",
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": "Omer",
  "0x6B175474E89094C44Da98b954EesecdB6F8e5389": "Lena",
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045": "Sam",
};

function addressToUserName(address: string): string {
  return ADDRESS_TO_NAME[address] || address;
}

/**
 * Registers all API routes on the Express app.
 * Returns the HTTP server for chaining with middleware setup.
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  /**
   * Wallet connection endpoint - creates or updates user record.
   * In production, this would verify a cryptographic signature from the wallet.
   */
  app.post(api.wallet.connect.path, async (req, res) => {
    try {
      const input = api.wallet.connect.input.parse(req.body);
      
      // Generate a mock address for demo if none provided
      const walletAddress = input.walletAddress || `0x${Math.random().toString(16).slice(2, 12)}...${Math.random().toString(16).slice(2, 6)}`;
      
      // Upsert user - create if new, update connection status if existing
      let user = await storage.getUserByAddress(walletAddress);
      
      if (!user) {
        user = await storage.createUser({
          walletAddress,
          isConnected: true
        });
      } else {
        user = await storage.updateUser(user.id, { isConnected: true });
      }
      
      // Artificial delay to simulate blockchain network latency
      await new Promise(resolve => setTimeout(resolve, 800));

      res.status(200).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Disconnect just acknowledges - in production would invalidate session tokens
  app.post(api.wallet.disconnect.path, async (req, res) => {
    res.status(200).json({ success: true });
  });

  /**
   * Returns all transactions awaiting approval.
   * Displayed on the Home dashboard for approvers to review.
   */
  app.get("/api/transactions/pending", async (req, res) => {
    try {
      const transactions = await storage.getPendingTransactions();
      res.status(200).json(transactions);
    } catch (err) {
      console.error("Error fetching pending transactions:", err);
      res.status(500).json({ message: "Failed to fetch pending transactions" });
    }
  });

  // Returns all transactions for the activity/history view
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.status(200).json(transactions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Returns all policies sorted by priority for the Policies management page
  app.get(api.policies.list.path, async (req, res) => {
    try {
      const policies = await storage.getPolicies();
      res.status(200).json(policies);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch policies" });
    }
  });

  /**
   * Returns policies with pending changes for a specific user.
   * Must be defined before /:id route to avoid "pending" being parsed as an ID.
   */
  app.get('/api/policies/pending', async (req, res) => {
    try {
      const userName = req.query.userName as string;
      if (!userName) {
        return res.status(400).json({ message: "Missing userName parameter" });
      }
      const pendingPolicies = await storage.getPendingPolicyChanges(userName);
      res.status(200).json(pendingPolicies);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pending policy changes" });
    }
  });

  app.get('/api/policies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      const policy = await storage.getPolicy(id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.status(200).json(policy);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch policy" });
    }
  });

  /**
   * AI-powered policy generation endpoint.
   * Uses GPT-4 to interactively build a policy through conversation.
   * Asks clarifying questions one at a time until all required fields are collected.
   */
  app.post(api.policies.generate.path, async (req, res) => {
    try {
      const { prompt } = api.policies.generate.input.parse(req.body);
      const conversationHistory = req.body.conversationHistory as Array<{role: string, content: string}> | undefined;
      const currentPolicy = req.body.currentPolicy as Record<string, unknown> | undefined;
      
      // Build conversation context for the AI including previous exchanges
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        {
          role: "system",
          content: `You are an expert security policy generator for a crypto wallet infrastructure.
Your goal is to help the user create a complete policy by asking ONE clarifying question at a time.

When generating a policy description, keep it concise. Avoid redundant phrasing like "This policy requires".

Schema fields you need to fill:
- name: Short descriptive name
- description: Full description  
- action: 'allow', 'deny', or 'require_approval'
- priority: integer (default 0)
- conditionLogic: 'AND' or 'OR'
- initiatorType: 'any', 'user', 'group'
- initiatorValues: array of user names (required if initiatorType is 'user' or 'group')
- sourceWalletType: 'any', 'specific'
- sourceWallets: array of wallet names
- destinationType: 'any', 'internal', 'external', 'whitelist'
- destinationValues: array of addresses/names
- amountCondition: 'any', 'above', 'below', 'between'
- amountMin: string (required if amountCondition is 'above', 'below', or 'between')
- amountMax: string (required if amountCondition is 'between')
- assetType: 'any', 'specific'
- assetValues: array of asset symbols like ETH, USDC, USDT
- approvers: array of user names (REQUIRED if action is 'require_approval' - who approves the transactions)
- quorumRequired: integer (how many transaction approvals needed)
- changeApproversList: array of user names (ALWAYS REQUIRED - who can approve changes to this policy in the future)
- changeApprovalsRequired: integer (how many approvals needed to change this policy, default 1)

Available users: Meir, Ishai, Omer, Lena, Sam
Available wallets: Finances, Treasury
Available assets: ETH, USDC, USDT

MANDATORY QUESTIONS - YOU MUST ASK ALL OF THESE (one at a time):
1. Amount limits - should this apply to transfers of any amount, or only above/below a certain threshold?
2. Source wallet - should this apply from any wallet, or specific ones like Finances or Treasury?
3. Destination - any destination, or specific addresses/contacts?
4. If action is 'require_approval': Who should approve these transactions? (e.g., Meir, Lena, etc.) And how many approvals are needed?
5. ALWAYS ASK: Who should be able to approve changes to this policy in the future? (This is required - pick from Meir, Ishai, Omer, Lena, Sam)
6. AFTER getting the changeApproversList, ALWAYS ASK AS A SEPARATE QUESTION: "How many of these [X] people need to approve before a change to this policy takes effect?" where X is the number of people they selected. Do NOT default to 1 - you must explicitly ask this.

RULES:
- Ask ONE question at a time in a friendly way
- Do NOT assume defaults or skip questions
- You MUST have changeApproversList with at least one user AND changeApprovalsRequired before marking complete
- Only set isComplete: true when ALL mandatory questions have been answered

Return JSON: {
  "policy": { ...partial or complete policy object... },
  "isComplete": boolean,
  "question": "Your single clarifying question" or null if complete
}`
        }
      ];

      if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }

      if (currentPolicy) {
        messages.push({
          role: "assistant",
          content: `Current policy state: ${JSON.stringify(currentPolicy)}`
        });
      }

      messages.push({ role: "user", content: prompt });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.status(200).json(result);
    } catch (err) {
      console.error("AI Generation error:", err);
      res.status(500).json({ message: "Failed to generate policy via AI" });
    }
  });

  /**
   * Creates a new policy with the provided configuration.
   * New policies are immediately active (no approval required for creation).
   */
  app.post(api.policies.create.path, async (req, res) => {
    try {
      const input = api.policies.create.input.parse(req.body);
      
      const validActions = ['allow', 'deny', 'require_approval'];
      if (!validActions.includes(input.action)) {
        return res.status(400).json({
          message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
          field: 'action',
        });
      }
      
      const policy = await storage.createPolicy(input);
      res.status(200).json(policy);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create policy" });
    }
  });

  /**
   * Updates a policy - changes go into pending state requiring approval.
   * This prevents single-point-of-failure security modifications.
   */
  app.put('/api/policies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      
      const input = api.policies.update.input.parse(req.body);
      const submitter = req.query.submitter as string || 'anonymous';
      const submitterName = req.body.submitterName as string || addressToUserName(submitter);
      
      // Check if user is authorized to modify this policy
      const canModify = await storage.canUserModifyPolicy(id, submitterName);
      if (!canModify) {
        return res.status(403).json({ 
          message: "You are not authorized to modify this policy. Only designated approvers can make changes." 
        });
      }
      
      if (input.action) {
        const validActions = ['allow', 'deny', 'require_approval'];
        if (!validActions.includes(input.action)) {
          return res.status(400).json({
            message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
            field: 'action',
          });
        }
      }
      
      // Changes require multi-party approval before taking effect
      const policy = await storage.submitPolicyChange(id, input, submitter, submitterName);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      // Check if validation failed (impossible quorum scenario)
      if ('error' in policy) {
        return res.status(400).json({ message: policy.error });
      }
      res.status(200).json(policy);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to update policy" });
    }
  });

  app.delete('/api/policies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      const deleted = await storage.deletePolicy(id);
      if (!deleted) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete policy" });
    }
  });

  /**
   * Submits a deletion request for a policy.
   * Like updates, deletions require approval to prevent accidental removal of security rules.
   */
  app.post('/api/policies/:id/request-deletion', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      const submitter = req.body.submitter || 'anonymous';
      const submitterName = req.body.submitterName as string || addressToUserName(submitter);
      
      // Check if user is authorized to modify this policy
      const canModify = await storage.canUserModifyPolicy(id, submitterName);
      if (!canModify) {
        return res.status(403).json({ 
          message: "You are not authorized to delete this policy. Only designated approvers can make changes." 
        });
      }
      
      const policy = await storage.submitPolicyDeletion(id, submitter, submitterName);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      // Check if validation failed (impossible quorum scenario)
      if ('error' in policy) {
        return res.status(400).json({ message: policy.error });
      }
      res.status(200).json(policy);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit deletion request" });
    }
  });

  /**
   * Cancels a pending policy change, returning the policy to active status.
   * Used to unstick policies where approval quorum became impossible.
   */
  app.post('/api/policies/:id/cancel-change', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      
      const cancelerName = req.body.cancelerName as string;
      
      // Check if user is authorized to cancel (must be an approver)
      const canModify = await storage.canUserModifyPolicy(id, cancelerName);
      if (!canModify) {
        return res.status(403).json({ 
          message: "You are not authorized to cancel this change. Only designated approvers can cancel pending changes." 
        });
      }
      
      const policy = await storage.cancelPolicyChange(id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found or not pending approval" });
      }
      res.status(200).json(policy);
    } catch (err) {
      res.status(500).json({ message: "Failed to cancel policy change" });
    }
  });

  // Toggles policy active/inactive - allows temporarily disabling without deletion
  app.patch('/api/policies/:id/toggle', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      const policy = await storage.togglePolicy(id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.status(200).json(policy);
    } catch (err) {
      res.status(500).json({ message: "Failed to toggle policy" });
    }
  });

  /**
   * Updates policy priority order based on drag-and-drop reordering.
   * Lower priority numbers are evaluated first during transaction matching.
   */
  app.post(api.policies.reorder.path, async (req, res) => {
    try {
      const input = api.policies.reorder.input.parse(req.body);
      const policies = await storage.reorderPolicies(input.orderedIds);
      res.status(200).json(policies);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to reorder policies" });
    }
  });

  /**
   * Simulates a transaction against active policies.
   * Returns which policy would match and what action would be taken.
   * Useful for testing policy configurations before real transactions.
   */
  app.post(api.policies.simulate.path, async (req, res) => {
    try {
      const input = api.policies.simulate.input.parse(req.body);
      const result = await storage.simulateTransaction(input);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to simulate transaction" });
    }
  });

  /**
   * Records an approval for a pending policy change.
   * When quorum is reached, the change is automatically applied.
   */
  app.post('/api/policies/:id/approve-change', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      const input = api.policies.approveChange.input.parse(req.body);
      
      // Check if user is authorized to approve this policy change
      const canApprove = await storage.canUserModifyPolicy(id, input.approver);
      if (!canApprove) {
        return res.status(403).json({ 
          message: "You are not authorized to approve this policy change. Only designated approvers can approve changes." 
        });
      }
      
      const policy = await storage.approvePolicyChange(id, input.approver);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found or not pending approval" });
      }
      res.status(200).json(policy);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to approve policy change" });
    }
  });

  /**
   * Analyzes policies for potential risks using AI.
   * Checks for conflicts, overly permissive rules, coverage gaps,
   * risky priority ordering, and exploitable conditions.
   */
  app.post('/api/policies/analyze-risks', async (req, res) => {
    try {
      const { policies } = req.body;
      
      if (!Array.isArray(policies)) {
        return res.status(400).json({ message: "Policies array is required" });
      }

      const policySummaries = policies.map((p: any, index: number) => ({
        priority: index + 1,
        name: p.name,
        action: p.action,
        isActive: p.isActive,
        initiatorType: p.initiatorType,
        initiatorValues: p.initiatorValues,
        sourceWalletType: p.sourceWalletType,
        sourceWallets: p.sourceWallets,
        destinationType: p.destinationType,
        destinationValues: p.destinationValues,
        amountCondition: p.amountCondition,
        amountMin: p.amountMin,
        amountMax: p.amountMax,
        assetType: p.assetType,
        assetValues: p.assetValues,
        approvers: p.approvers,
        quorumRequired: p.quorumRequired,
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a security expert analyzing crypto wallet transaction policies for potential risks.

CRITICAL - POLICY EVALUATION RULES:
- Policies are evaluated SEQUENTIALLY from priority 1 (highest) downward
- The FIRST matching policy determines the outcome - evaluation STOPS immediately
- Lower priority policies are NEVER evaluated once a match is found
- Example: If Policy 1 denies USDT transfers and Policy 2 allows all transfers, USDT transfers will be DENIED because Policy 1 matches first. Policy 2 cannot "bypass" Policy 1.

Analyze the provided policies for:
1. Overly Permissive Rules - Policies that allow too much without restrictions (e.g., "allow all" without amount limits)
2. Coverage Gaps - Important scenarios not covered by any policy (default is deny if no policy matches)
3. Exploitable Conditions - Conditions that could be gamed (e.g., splitting transfers to stay under thresholds)
4. True Conflicts - Only when the same transaction could legitimately match multiple overlapping conditions

DO NOT report false positives:
- A lower priority "allow all" policy does NOT bypass higher priority deny rules
- Specific deny rules at higher priority correctly block transactions before broad allow rules are reached

IMPORTANT: Only report HIGH severity issues. Skip medium and low severity findings entirely.
Keep descriptions very brief - 1-2 sentences maximum.

Return a JSON object with this structure:
{
  "overallRiskLevel": "low" | "medium" | "high",
  "summary": "",
  "findings": [
    {
      "category": "conflicts" | "permissive" | "gaps" | "priority" | "exploitable",
      "severity": "high",
      "title": "Brief title (max 10 words)",
      "description": "Very brief explanation (1-2 sentences max)",
      "affectedPolicies": [],
      "recommendation": ""
    }
  ]
}`
          },
          {
            role: "user",
            content: `Analyze these policies (ordered by priority, 1 = highest priority):\n\n${JSON.stringify(policySummaries, null, 2)}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.status(200).json(result);
    } catch (err) {
      console.error("Policy risk analysis error:", err);
      res.status(500).json({ message: "Failed to analyze policy risks" });
    }
  });

  /**
   * Creates a new transaction record.
   * Status depends on policy simulation - 'pending' requires approval, 'completed' is immediate.
   */
  app.post("/api/transactions", async (req, res) => {
    try {
      const input = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(input);
      res.status(200).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  /**
   * Adds an approval to a pending transaction.
   * When quorum is reached, transaction status changes to 'completed'.
   */
  app.post("/api/transactions/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      const { approver } = req.body;
      if (!approver || typeof approver !== 'string') {
        return res.status(400).json({ message: "Approver name is required" });
      }
      const transaction = await storage.approveTransaction(id, approver);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found or not pending" });
      }
      res.status(200).json(transaction);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve transaction" });
    }
  });

  // Returns all policy history entries for the activity view
  app.get("/api/policy-history", async (req, res) => {
    try {
      const history = await storage.getPolicyHistory();
      res.status(200).json(history);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch policy history" });
    }
  });

  return httpServer;
}
