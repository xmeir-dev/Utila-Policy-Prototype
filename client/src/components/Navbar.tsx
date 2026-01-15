import { Link } from "wouter";
import { Wallet, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  walletState: ReturnType<typeof useWallet>;
}

export function Navbar({ walletState }: NavbarProps) {
  const { connect, disconnect, isConnecting, isConnected, walletAddress } = walletState;

  const formattedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <span className="text-2xl font-bold font-display tracking-tight text-foreground">Utila</span>
        </Link>

        <div>
          {isConnected ? (
            <Button
              data-testid="button-disconnect-wallet"
              variant="outline"
              onClick={() => disconnect()}
              className="rounded-md font-mono text-sm"
            >
              <div className="w-2 h-2 rounded-full bg-foreground mr-2" />
              {formattedAddress}
            </Button>
          ) : (
            <Button
              data-testid="button-connect-wallet"
              onClick={() => connect()}
              disabled={isConnecting}
              className="rounded-md"
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
