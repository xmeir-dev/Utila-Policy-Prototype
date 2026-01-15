import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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

  app.get(api.transactions.listPending.path, async (req, res) => {
    // For demo, we'll just return some hardcoded pending transactions for any connected user
    // In a real app, we'd use session/auth
    const pendingTxs = [
      { id: 1, type: "Send ETH", amount: "0.5 ETH", status: "pending", txHash: "0x123...abc" },
      { id: 2, type: "Swap", amount: "100 USDC to 0.04 ETH", status: "pending", txHash: "0x456...def" }
    ];
    res.status(200).json(pendingTxs);
  });

  return httpServer;
}
