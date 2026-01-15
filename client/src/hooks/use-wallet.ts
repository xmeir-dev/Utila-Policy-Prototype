import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState, useEffect } from "react";

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    return localStorage.getItem("utila_wallet_address");
  });

  useEffect(() => {
    if (walletAddress) {
      localStorage.setItem("utila_wallet_address", walletAddress);
    } else {
      localStorage.removeItem("utila_wallet_address");
    }
  }, [walletAddress]);

  const connectMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const res = await fetch(api.wallet.connect.path, {
        method: api.wallet.connect.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }), 
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
    connect: (walletAddress: string) => connectMutation.mutate(walletAddress),
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isConnected: !!walletAddress,
    walletAddress,
    error: connectMutation.error,
  };
}
