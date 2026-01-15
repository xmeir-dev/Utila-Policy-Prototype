import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Wallet, RefreshCw } from "lucide-react";
import { SiEthereum, SiTether } from "react-icons/si";
import { MdOutlinePaid } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";

const assets = [
  { symbol: "ETH", name: "Ethereum", balance: "2.5", price: 2500, icon: SiEthereum, color: "text-[#627EEA]" },
  { symbol: "USDC", name: "USD Coin", balance: "1,250.00", price: 1, icon: MdOutlinePaid, color: "text-[#2775CA]" },
  { symbol: "USDT", name: "Tether", balance: "500.00", price: 1, icon: SiTether, color: "text-[#26A17B]" },
];

export default function Transfer() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [recipient, setRecipient] = useState("");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [isTokenPrimary, setIsTokenPrimary] = useState(false);

  const formatUSD = (val: string) => {
    const num = parseFloat(val.replace(/,/g, ''));
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/,/g, '');
    
    // Only allow numbers and decimal point
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return;

    if (!isTokenPrimary) {
      // USD formatting: add commas
      if (val === '') {
        setAmount('');
      } else {
        // Keep raw value if it ends with a dot to allow typing decimals
        if (val.endsWith('.')) {
          setAmount(val);
        } else {
          const parts = val.split('.');
          const formatted = new Intl.NumberFormat('en-US').format(parseInt(parts[0]));
          setAmount(parts.length > 1 ? `${formatted}.${parts[1]}` : formatted);
        }
      }
    } else {
      // Token formatting: just raw input to allow decimals
      setAmount(val);
    }
  };

  const togglePrimary = () => {
    if (!amount) {
      setIsTokenPrimary(!isTokenPrimary);
      return;
    }

    const currentVal = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(currentVal)) {
      setIsTokenPrimary(!isTokenPrimary);
      return;
    }

    if (isTokenPrimary) {
      // Switching from Token to USD
      const usdVal = currentVal * selectedAsset.price;
      setAmount(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(usdVal));
    } else {
      // Switching from USD to Token
      const tokenVal = currentVal / selectedAsset.price;
      setAmount(tokenVal.toFixed(2));
    }
    setIsTokenPrimary(!isTokenPrimary);
  };

  const AssetIcon = selectedAsset.icon;

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
                onClick={() => {
                  const maxAmount = (parseFloat(selectedAsset.balance.replace(/,/g, '')) * selectedAsset.price).toString();
                  setAmount(maxAmount);
                }}
                data-testid="button-max"
              >
                Max
              </Button>
            </div>
            <div className="relative flex items-stretch gap-0 bg-card border border-border rounded-md overflow-hidden h-32">
              {/* Token Selector (Left) */}
              <div className="flex items-center px-4 border-r border-border min-w-[140px]">
                <div className="relative w-full">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 w-full justify-between px-2 hover:bg-transparent"
                    onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                    data-testid="button-asset-selector"
                  >
                    <div className="flex items-center gap-2">
                      <AssetIcon className={`w-6 h-6 ${selectedAsset.color}`} />
                      <span className="font-bold text-lg">{selectedAsset.symbol}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  {showAssetDropdown && (
                    <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-md shadow-lg z-20 min-w-[200px] overflow-hidden">
                      {assets.map((asset) => {
                        const Icon = asset.icon;
                        return (
                          <button
                            key={asset.symbol}
                            className="w-full px-4 py-3 text-left hover-elevate flex items-center justify-between gap-3"
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

              {/* Amount Inputs (Right) */}
              <div className="flex-1 flex flex-col justify-center px-6 gap-1 items-end">
                <div className="flex items-center justify-end w-full">
                  <div className="flex items-center">
                    {!isTokenPrimary && (
                      <span className="text-[24px] leading-none font-normal text-foreground">$</span>
                    )}
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={amount}
                      onChange={handleAmountChange}
                      style={{ fontSize: '24px', width: amount ? `${(amount.length || 4) * 16}px` : '60px' }}
                      className="font-normal p-0 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto text-foreground leading-none text-left min-w-[60px]"
                      data-testid="input-amount"
                    />
                    {isTokenPrimary && (
                      <span className="text-[24px] leading-none font-normal text-foreground ml-1">{selectedAsset.symbol}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <span>
                    {isTokenPrimary ? (
                      `$${amount ? new Intl.NumberFormat('en-US').format(Math.round(parseFloat(amount.replace(/,/g, '')) * selectedAsset.price)) : "0"}`
                    ) : (
                      `${amount ? (parseFloat(amount.replace(/,/g, '')) / selectedAsset.price).toFixed(2) : "0.00"} ${selectedAsset.symbol}`
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={togglePrimary}
                    data-testid="button-switch-unit"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
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
