import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Wallet } from "lucide-react";
import { SiEthereum, SiTether } from "react-icons/si";
import { MdOutlinePaid } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";

const assets = [
  { symbol: "ETH", name: "Ethereum", balance: "2.5", icon: SiEthereum, color: "text-[#627EEA]" },
  { symbol: "USDC", name: "USD Coin", balance: "1,250.00", icon: MdOutlinePaid, color: "text-[#2775CA]" },
  { symbol: "USDT", name: "Tether", balance: "500.00", icon: SiTether, color: "text-[#26A17B]" },
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

  const AssetIcon = selectedAsset.icon;

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
            <h2 className="text-3xl font-bold font-display text-foreground">Transfer</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">Balance:</span>
                <span className="font-semibold text-foreground">{selectedAsset.balance} {selectedAsset.symbol}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                onClick={() => setAmount(selectedAsset.balance.replace(/,/g, ''))}
                data-testid="button-max"
              >
                Max
              </Button>
            </div>
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
                  className="flex items-center gap-2 px-3"
                  onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                  data-testid="button-asset-selector"
                >
                  <AssetIcon className={`w-5 h-5 ${selectedAsset.color}`} />
                  <span className="font-semibold">{selectedAsset.symbol}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                {showAssetDropdown && (
                  <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-md shadow-lg z-10 min-w-40 overflow-hidden">
                    {assets.map((asset) => {
                      const Icon = asset.icon;
                      return (
                        <button
                          key={asset.symbol}
                          className="w-full px-4 py-3 text-left hover-elevate flex items-center justify-between"
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowAssetDropdown(false);
                          }}
                          data-testid={`option-asset-${asset.symbol.toLowerCase()}`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-5 h-5 ${asset.color}`} />
                            <span className="font-medium">{asset.symbol}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{asset.balance}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
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
