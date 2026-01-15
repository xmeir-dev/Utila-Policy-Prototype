import { Link } from "wouter";
import { Wallet, Loader2 } from "lucide-react";
import { useState } from "react";
import { useWallet, WALLET_USERS } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import utilaLogo from "@assets/Utila-Logo-Horizontal-300x99_1768484509461.png";
import waystarRoycoLogo from "@assets/image_1768514730493.png";

interface NavbarProps {
  walletState: ReturnType<typeof useWallet>;
}

export function Navbar({ walletState }: NavbarProps) {
  const { connect, disconnect, isConnecting, isConnected, walletAddress, connectedUser } = walletState;
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

          <div className="flex items-center gap-2">
            {isConnected && connectedUser && connectedUser.name && (
              <div className="flex items-center gap-2 bg-muted/30 rounded-[16px] px-3 h-[48px] border">
                <img 
                  src={waystarRoycoLogo} 
                  alt="Waystar Royco" 
                  className="h-6 w-auto" 
                />
                <img 
                  src={waystarRoycoLogo} 
                  alt={connectedUser.name} 
                  className="w-6 h-6 rounded-full object-cover" 
                />
                <span className="text-sm font-medium">{connectedUser.name}</span>
              </div>
            )}
            {isConnected && connectedUser && connectedUser.name ? (
              <Button
                data-testid="button-disconnect-wallet"
                variant="outline"
                onClick={() => disconnect()}
                className="rounded-[16px] font-mono text-sm h-[48px]"
              >
                <img 
                  src={waystarRoycoLogo} 
                  alt={connectedUser.name} 
                  className="w-6 h-6 rounded-full mr-2 object-cover" 
                />
                {connectedUser.name}
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
        <DialogContent className="sm:max-w-md rounded-[22px] sm:rounded-[22px]" data-testid="dialog-select-wallet">
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
                <img 
                  src={waystarRoycoLogo} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full mr-3 object-cover" 
                />
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
