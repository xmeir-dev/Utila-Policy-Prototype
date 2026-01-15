import { Link } from "wouter";
import { Wallet, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";

import utilaLogo from "@assets/Utila-Logo-Horizontal-300x99_1768484509461.png";
import walletAvatar from "@assets/avatar_1768484752964.png";

interface NavbarProps {
  walletState: ReturnType<typeof useWallet>;
}

export function Navbar({ walletState }: NavbarProps) {
  const { connect, disconnect, isConnecting, isConnected, walletAddress } = walletState;

  const formattedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  return (
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
              onClick={() => connect()}
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
  );
}
