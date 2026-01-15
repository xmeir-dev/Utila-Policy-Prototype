import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Wallet, RefreshCw, Check, ChevronRight, Send } from "lucide-react";
import { SiEthereum, SiTether } from "react-icons/si";
import { MdOutlinePaid } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";

const assets = [
  { symbol: "ETH", name: "Ethereum", balance: "2.5", price: 2500, icon: SiEthereum, color: "text-[#627EEA]" },
  { symbol: "USDC", name: "USD Coin", balance: "1,250.00", price: 1, icon: MdOutlinePaid, color: "text-[#2775CA]" },
  { symbol: "USDT", name: "Tether", balance: "500.00", price: 1, icon: SiTether, color: "text-[#26A17B]" },
];

const availableWallets = [
  { id: "w1", name: "Main Wallet", address: "0x1234...5678", balance: "1.5" },
  { id: "w2", name: "Hardware Wallet", address: "0x8765...4321", balance: "0.8" },
  { id: "w3", name: "Savings", address: "0xabcd...efgh", balance: "0.2" },
];

export default function Transfer() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [recipient, setRecipient] = useState("");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [isTokenPrimary, setIsTokenPrimary] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<string[]>(["w1"]);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const walletDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAssetDropdown(false);
      }
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target as Node)) {
        setShowWalletDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          className="space-y-4"
        >
          <div className="flex items-center gap-4 mb-4">
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

          <div className="space-y-1">
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

            <div className="relative flex items-stretch gap-0 bg-card border border-border rounded-[24px] h-32 z-10">
              {/* Token Selector (Left) */}
              <div className="flex items-center px-4 border-r border-border min-w-[140px] z-20" ref={dropdownRef}>
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
                    <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-[16px] shadow-lg z-50 min-w-[200px] overflow-hidden">
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
              <div 
                className="flex-1 flex flex-col justify-center px-6 gap-1 items-end cursor-text"
                onClick={() => amountInputRef.current?.focus()}
              >
                <div className="flex items-center justify-end w-full">
                  <div className="flex items-center">
                    {!isTokenPrimary && (
                      <span className="text-[24px] leading-none font-normal text-foreground">$</span>
                    )}
                    <Input
                      ref={amountInputRef}
                      type="text"
                      placeholder={isTokenPrimary ? "0.00" : "0"}
                      value={amount}
                      onChange={handleAmountChange}
                      style={{ 
                        fontSize: '24px', 
                        width: amount ? `${(amount.length || 4) * 14}px` : (isTokenPrimary ? '60px' : '30px'),
                      }}
                      className="font-normal p-0 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto text-foreground leading-none text-left min-w-[30px]"
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

          <div className="space-y-1">
            <div className="relative" ref={walletDropdownRef}>
              <Button
                variant="outline"
                className="w-full justify-between bg-card/50 border-border rounded-[16px] h-auto min-h-[72px] py-4 px-4 hover-elevate transition-all"
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                data-testid="button-wallet-selector"
              >
                <div className="flex items-center gap-4 overflow-hidden text-left">
                  <Wallet className="w-6 h-6 text-muted-foreground shrink-0" />
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      <span className="shrink-0 font-medium text-[18px] text-[#000000]">From</span>
                      <div className="flex gap-1.5 overflow-hidden">
                        {selectedWallets.length > 0 ? (
                          selectedWallets.map(id => {
                            const wallet = availableWallets.find(w => w.id === id);
                            return wallet ? (
                              <Badge key={id} variant="secondary" className="h-5 px-1.5 text-[9px] font-bold shrink-0 bg-primary/10 text-primary border-0">
                                {wallet.name}
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <span className="text-muted-foreground text-sm font-normal">Select source wallets</span>
                        )}
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[14px] font-normal">Choose origin wallets</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Button>

              {showWalletDropdown && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-[16px] shadow-xl z-50 overflow-hidden py-1">
                  {availableWallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isSelected = selectedWallets.includes(wallet.id);
                        if (isSelected) {
                          setSelectedWallets(selectedWallets.filter(id => id !== wallet.id));
                        } else {
                          setSelectedWallets([...selectedWallets, wallet.id]);
                        }
                      }}
                      data-testid={`option-wallet-${wallet.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedWallets.includes(wallet.id)}
                          onCheckedChange={() => {}} // Handled by div click
                          className="rounded-sm border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{wallet.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{wallet.address}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{wallet.balance} {selectedAsset.symbol}</div>
                        <div className="text-[10px] text-muted-foreground">
                          ${new Intl.NumberFormat('en-US').format(parseFloat(wallet.balance) * selectedAsset.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center -my-4 relative z-20">
            <div className="bg-[#E9E9EE] border-4 border-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
              <ChevronDown className="w-5 h-5 text-white stroke-[3]" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Button
                variant="outline"
                className="w-full justify-between bg-card/50 border-border rounded-[16px] h-auto min-h-[72px] py-4 px-4 hover-elevate transition-all"
                onClick={() => {}} 
                data-testid="button-destination-selector"
              >
                <div className="flex items-center gap-4 overflow-hidden text-left">
                  <Send className="w-6 h-6 text-muted-foreground shrink-0" />
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      <span className="shrink-0 font-medium text-[18px] text-[#000000]">To</span>
                      <div className="flex gap-1.5 overflow-hidden">
                        <span className="text-muted-foreground text-sm font-normal truncate">
                          {recipient || "Enter wallet address or ENS name"}
                        </span>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[14px] font-normal">Choose destination wallets</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center px-2 py-2">
            <div className="flex flex-col items-start leading-none">
              <span className="text-sm font-semibold text-foreground">x sec</span>
              <span className="text-[10px] font-medium text-muted-foreground">est. tx time</span>
            </div>
            <div className="flex flex-col items-end leading-none">
              <span className="text-sm font-semibold text-foreground">$0.31</span>
              <span className="text-[10px] font-medium text-muted-foreground">est. fee</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="w-full text-lg font-semibold rounded-[16px] h-[48px]"
              disabled={!amount || !recipient}
              onClick={handleContinue}
              data-testid="button-continue"
            >
              Send
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-transparent"
              disabled={!amount || !recipient}
              onClick={() => console.log("Simulate Transfer")}
              data-testid="button-simulate"
            >
              Simulate Transfer
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
