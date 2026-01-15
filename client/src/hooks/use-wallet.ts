import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ConnectWalletResponse } from "@shared/routes";
import { useState } from "react";

// In a real app, we might query "me" endpoint to check session status.
// For this demo, we'll store local state to mimic the visual effect of connection
// while still calling the API.

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.wallet.connect.path, {
        method: api.wallet.connect.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Optional wallet address body
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to connect wallet");
      }

      const data = await res.json();
      return api.wallet.connect.responses[200].parse(data);
    },
    onSuccess: (data) => {
      setWalletAddress(data.walletAddress);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.wallet.disconnect.path, {
        method: api.wallet.disconnect.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to disconnect");
      }
      return await res.json();
    },
    onSuccess: () => {
      setWalletAddress(null);
    },
  });

  return {
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isConnected: !!walletAddress,
    walletAddress,
    error: connectMutation.error,
  };
}
