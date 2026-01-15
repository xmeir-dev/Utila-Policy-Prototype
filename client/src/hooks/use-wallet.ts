import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState, useEffect } from "react";

export interface WalletUser {
  name: string;
  address: string;
  avatarBg: string;
  avatarColor: string;
}

export const WALLET_USERS: WalletUser[] = [
  { name: "Meir", address: "0xc333b115a72a3519b48E9B4f9D1bBD4a34C248b1", avatarBg: "bg-blue-500", avatarColor: "text-white" },
  { name: "Ishai", address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", avatarBg: "bg-emerald-500", avatarColor: "text-white" },
  { name: "Omer", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", avatarBg: "bg-orange-500", avatarColor: "text-white" },
  { name: "Lena", address: "0x6B175474E89094C44Da98b954EesecdB6F8e5389", avatarBg: "bg-purple-500", avatarColor: "text-white" },
  { name: "Vitalik", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", avatarBg: "bg-rose-500", avatarColor: "text-white" },
];

function isValidWalletUser(obj: unknown): obj is WalletUser {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'address' in obj &&
    'avatarBg' in obj &&
    'avatarColor' in obj &&
    typeof (obj as WalletUser).name === 'string' &&
    typeof (obj as WalletUser).address === 'string'
  );
}

export function useWallet() {
  const [connectedUser, setConnectedUser] = useState<WalletUser | null>(() => {
    // Clean up old localStorage keys
    localStorage.removeItem("utila_wallet_address");
    
    const stored = localStorage.getItem("utila_wallet_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (isValidWalletUser(parsed)) {
          return parsed;
        }
        // Invalid format, clear it
        localStorage.removeItem("utila_wallet_user");
        return null;
      } catch {
        localStorage.removeItem("utila_wallet_user");
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (connectedUser) {
      localStorage.setItem("utila_wallet_user", JSON.stringify(connectedUser));
    } else {
      localStorage.removeItem("utila_wallet_user");
    }
  }, [connectedUser]);

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
      const user = WALLET_USERS.find(u => u.address === data.walletAddress);
      if (user) {
        setConnectedUser(user);
      }
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
      setConnectedUser(null);
    },
  });

  return {
    connect: (walletAddress: string) => connectMutation.mutate(walletAddress),
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isConnected: !!connectedUser,
    walletAddress: connectedUser?.address || null,
    connectedUser,
    error: connectMutation.error,
  };
}
