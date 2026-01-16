import { Link } from "wouter";
import { Wallet, Loader2, ChevronDown } from "lucide-react";
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
  openWalletDialog?: () => void;
}

export function Navbar({ walletState, openWalletDialog }: NavbarProps) {
  const { connect, disconnect, isConnecting, isConnected, walletAddress, connectedUser } = walletState;
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);

  const isDialogOpen = openWalletDialog ? (walletState.isConnected ? internalDialogOpen : false) : internalDialogOpen;
  const setIsDialogOpen = openWalletDialog ? (walletState.isConnected ? setInternalDialogOpen : (open: boolean) => { if (open) openWalletDialog(); }) : setInternalDialogOpen;

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
            {isConnected && connectedUser && connectedUser.name ? (
              <Button
                data-testid="button-disconnect-wallet"
                variant="outline"
                onClick={() => setIsDialogOpen(true)}
                className="rounded-[16px] font-mono text-sm h-[48px] gap-2 pl-[8px] pr-[8px]"
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${connectedUser.avatarBg} ${connectedUser.avatarColor}`}>
                  <span className="text-sm font-semibold">{connectedUser.name.charAt(0)}</span>
                </div>
                {connectedUser.name}
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            ) : (
              <Button
                data-testid="button-connect-wallet"
                onClick={() => openWalletDialog ? openWalletDialog() : setIsDialogOpen(true)}
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
            <DialogTitle className="tracking-tight font-medium text-[16px]">Select a user</DialogTitle>
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
                <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 ${user.avatarBg} ${user.avatarColor}`}>
                  <span className="text-sm font-semibold">{user.name.charAt(0)}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {user.address.slice(0, 6)}...{user.address.slice(-4)}
                  </span>
                </div>
              </Button>
            ))}
            
            {isConnected && (
              <Button
                variant="ghost"
                onClick={() => {
                  disconnect();
                  setIsDialogOpen(false);
                }}
                className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-[14px] h-12"
              >
                Disconnect
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
