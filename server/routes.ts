import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertTransactionSchema } from "@shared/schema";

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
      const userName = req.query.userName as string;
      if (!userName) {
        return res.status(400).json({ message: "Missing userName parameter" });
      }
      const transactions = await storage.getPendingTransactions(userName);
      res.status(200).json(transactions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pending transactions" });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const userName = req.query.userName as string;
      if (userName) {
        const transactions = await storage.getTransactionsByUserName(userName);
        return res.status(200).json(transactions);
      }
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Missing or invalid userId/userName parameter" });
      }
      const transactions = await storage.getAllTransactions(userId);
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
