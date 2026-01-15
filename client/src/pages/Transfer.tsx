import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";

const assets = [
  { symbol: "ETH", name: "Ethereum", balance: "2.5" },
  { symbol: "USDC", name: "USD Coin", balance: "1,250.00" },
  { symbol: "USDT", name: "Tether", balance: "500.00" },
];

export default function Transfer() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [recipient, setRecipient] = useState("");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);

  const handleContinue = () => {
    console.log("Transfer:", { amount, asset: selectedAsset.symbol, recipient });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar walletState={walletState} />

      <main className="max-w-2xl mx-auto px-6 py-12 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold font-display text-foreground">Transfer</h1>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Amount</label>
            <div className="relative">
              <Input
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-4xl font-bold pr-32 bg-card border-border"
                data-testid="input-amount"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                  data-testid="button-asset-selector"
                >
                  <span className="font-semibold">{selectedAsset.symbol}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                {showAssetDropdown && (
                  <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-md shadow-lg z-10 min-w-40">
                    {assets.map((asset) => (
                      <button
                        key={asset.symbol}
                        className="w-full px-4 py-3 text-left hover-elevate flex items-center justify-between"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setShowAssetDropdown(false);
                        }}
                        data-testid={`option-asset-${asset.symbol.toLowerCase()}`}
                      >
                        <span className="font-medium">{asset.symbol}</span>
                        <span className="text-sm text-muted-foreground">{asset.balance}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Available: {selectedAsset.balance} {selectedAsset.symbol}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Recipient</label>
            <div className="relative">
              <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter wallet address or ENS name"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="pl-12 bg-card border-border"
                data-testid="input-recipient"
              />
            </div>
          </div>

          <div className="pt-8">
            <Button
              size="lg"
              className="w-full text-lg font-semibold"
              disabled={!amount || !recipient}
              onClick={handleContinue}
              data-testid="button-continue"
            >
              Continue
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
