import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertTransactionSchema } from "@shared/schema";
import { openai } from "./replit_integrations/audio/client";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post(api.wallet.connect.path, async (req, res) => {
    try {
      // Validate input (though it's optional in schema)
      const input = api.wallet.connect.input.parse(req.body);
      
      // Simulate a random wallet address if not provided
      const walletAddress = input.walletAddress || `0x${Math.random().toString(16).slice(2, 12)}...${Math.random().toString(16).slice(2, 6)}`;
      
      // Check if user exists (mock logic, in a real app we'd verify signature)
      let user = await storage.getUserByAddress(walletAddress);
      
      if (!user) {
        user = await storage.createUser({
          walletAddress,
          isConnected: true
        });
      } else {
        user = await storage.updateUser(user.id, { isConnected: true });
      }
      
      // Simulate network delay for effect
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

  app.post(api.wallet.disconnect.path, async (req, res) => {
    // In a real app we'd handle session invalidation here
    // For demo, we just acknowledge
    res.status(200).json({ success: true });
  });

  app.get("/api/transactions/pending", async (req, res) => {
    try {
      // Show all pending transactions to everyone
      const transactions = await storage.getPendingTransactions();
      res.status(200).json(transactions);
    } catch (err) {
      console.error("Error fetching pending transactions:", err);
      res.status(500).json({ message: "Failed to fetch pending transactions" });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.status(200).json(transactions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Policies endpoints
  app.get(api.policies.list.path, async (req, res) => {
    try {
      const policies = await storage.getPolicies();
      res.status(200).json(policies);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch policies" });
    }
  });

  // This route must come before /api/policies/:id to avoid "pending" being parsed as an id
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

  app.post(api.policies.generate.path, async (req, res) => {
    try {
      const { prompt } = api.policies.generate.input.parse(req.body);
      const conversationHistory = req.body.conversationHistory as Array<{role: string, content: string}> | undefined;
      const currentPolicy = req.body.currentPolicy as Record<string, unknown> | undefined;
      
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        {
          role: "system",
          content: `You are an expert security policy generator for a crypto wallet infrastructure.
Your goal is to help the user create a complete policy by asking ONE clarifying question at a time.

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

  app.post(api.policies.create.path, async (req, res) => {
    try {
      const input = api.policies.create.input.parse(req.body);
      
      // Validate action field
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

  app.put('/api/policies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      
      const input = api.policies.update.input.parse(req.body);
      const submitter = req.query.submitter as string || 'anonymous';
      
      // Validate action if provided
      if (input.action) {
        const validActions = ['allow', 'deny', 'require_approval'];
        if (!validActions.includes(input.action)) {
          return res.status(400).json({
            message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
            field: 'action',
          });
        }
      }
      
      // Submit policy change for approval instead of applying directly
      const policy = await storage.submitPolicyChange(id, input, submitter);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
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

  app.post('/api/policies/:id/request-deletion', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      const submitter = req.body.submitter || 'anonymous';
      const policy = await storage.submitPolicyDeletion(id, submitter);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.status(200).json(policy);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit deletion request" });
    }
  });

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

  app.post('/api/policies/:id/approve-change', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid policy ID" });
      }
      const input = api.policies.approveChange.input.parse(req.body);
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

  return httpServer;
}
