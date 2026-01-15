import { Link } from "wouter";
import { Wallet, Loader2, User } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import utilaLogo from "@assets/Utila-Logo-Horizontal-300x99_1768484509461.png";
import walletAvatar from "@assets/avatar_1768484752964.png";

const WALLET_USERS = [
  { name: "Meir", address: "0xc333b115a72a3519b48E9B4f9D1bBD4a34C248b1" },
  { name: "Ishai", address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" },
  { name: "Omer", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
  { name: "Lena", address: "0x6B175474E89094C44Da98b954EesecdB6F8e5389" },
  { name: "Vitalik", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
];

interface NavbarProps {
  walletState: ReturnType<typeof useWallet>;
}

export function Navbar({ walletState }: NavbarProps) {
  const { connect, disconnect, isConnecting, isConnected, walletAddress } = walletState;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formattedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  const handleUserSelect = (address: string) => {
    connect(address);
    setIsDialogOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-background">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <img 
              src={utilaLogo} 
              alt="Utila" 
              className="h-8 w-auto grayscale brightness-0" 
            />
          </Link>

          <div>
            {isConnected ? (
              <Button
                data-testid="button-disconnect-wallet"
                variant="outline"
                onClick={() => disconnect()}
                className="rounded-[16px] font-mono text-sm h-[48px]"
              >
                <img 
                  src={walletAvatar} 
                  alt="Avatar" 
                  className="w-5 h-5 rounded-full mr-2" 
                />
                {formattedAddress}
              </Button>
            ) : (
              <Button
                data-testid="button-connect-wallet"
                onClick={() => setIsDialogOpen(true)}
                disabled={isConnecting}
                className="rounded-[16px] h-[48px]"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </nav>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[22px]" data-testid="dialog-select-wallet">
          <DialogHeader>
            <DialogTitle className="tracking-tight font-medium text-[18px]">Select a wallet</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {WALLET_USERS.map((user) => (
              <Button
                key={user.address}
                variant="outline"
                data-testid={`button-select-user-${user.name.toLowerCase()}`}
                onClick={() => handleUserSelect(user.address)}
                className="justify-start h-14 px-4 rounded-[14px]"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted mr-3">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {user.address.slice(0, 6)}...{user.address.slice(-4)}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
