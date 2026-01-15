import { Link } from "wouter";
import { Wallet, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  walletState: ReturnType<typeof useWallet>;
}

export function Navbar({ walletState }: NavbarProps) {
  const { connect, disconnect, isConnecting, isConnected, walletAddress } = walletState;

  // Format address: 0x71C...9A
  const formattedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_currentColor] text-primary" />
          </div>
          <span className="text-2xl font-bold font-display tracking-tight text-white">Utila</span>
        </Link>

        {/* Action Button */}
        <div>
          {isConnected ? (
            <Button
              variant="outline"
              onClick={() => disconnect()}
              className="
                bg-card/50 backdrop-blur border-primary/20 text-primary-foreground
                hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30
                transition-all duration-300 font-medium font-mono text-sm rounded-xl px-5 h-10
              "
            >
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              {formattedAddress}
            </Button>
          ) : (
            <Button
              onClick={() => connect()}
              disabled={isConnecting}
              className="
                rounded-xl h-10 px-6 font-medium
                bg-white text-black
                hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]
                shadow-[0_0_20px_rgba(255,255,255,0.15)]
                disabled:opacity-70 disabled:cursor-not-allowed
                transition-all duration-300 ease-out
              "
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
