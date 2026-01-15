import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Wallet, RefreshCw, Check, ChevronRight, Send, Plus, X, User, Lock, CornerUpRight } from "lucide-react";
import { SiEthereum, SiTether } from "react-icons/si";
import { MdOutlinePaid } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";

interface Recipient {
  id: string;
  address: string;
  label?: string;
  amount: string;
  isFromAddressBook: boolean;
}

interface AddressBookEntry {
  id: string;
  label: string;
  address: string;
  isInternal: boolean;
}

const addressBook: AddressBookEntry[] = [
  { id: "ab1", label: "Bank of America", address: "0xa1cE2f3B4C5d6E7F8A9b0C1D2e3F4a5B6c7D8E9f", isInternal: false },
  { id: "ab2", label: "Finances", address: "0xb0bF1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F", isInternal: true },
  { id: "ab3", label: "Treasury", address: "0xcAfE9a8B7c6D5e4F3a2B1c0D9e8F7a6B5c4D3E2F", isInternal: true },
  { id: "ab4", label: "Vitalik Buterin", address: "0xDef01a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F", isInternal: false },
  { id: "ab5", label: "Meir", address: "0xE1f2A3b4C5d6E7f8A9B0c1D2E3f4A5b6C7d8E9f0", isInternal: true },
  { id: "ab6", label: "Ishai", address: "0xF0e1D2c3B4a5F6e7D8c9B0a1E2f3D4c5B6a7E8f9", isInternal: true },
];

const truncateAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const assets = [
  { symbol: "ETH", name: "Ethereum", balance: "1,255", price: 2500, icon: SiEthereum, color: "text-[#627EEA]" },
  { symbol: "USDC", name: "USD Coin", balance: "1,059,505", price: 1, icon: MdOutlinePaid, color: "text-[#2775CA]" },
  { symbol: "USDT", name: "Tether", balance: "750,500", price: 1, icon: SiTether, color: "text-[#26A17B]" },
];

const availableWallets = [
  { id: "w1", name: "Finances", address: "0xb0bF...7E8F", balance: "502" },
  { id: "w2", name: "Treasury", address: "0xcAfE...3E2F", balance: "421" },
  { id: "w3", name: "Meir", address: "0xE1f2...E9f0", balance: "198" },
  { id: "w4", name: "Ishai", address: "0xF0e1...E8f9", balance: "134" },
];

export default function Transfer() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [isTokenPrimary, setIsTokenPrimary] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userEnteredAmountRef = useRef<string>("");

  const getTotalBudget = () => {
    const amountToUse = userEnteredAmountRef.current || amount;
    const parsed = parseFloat(amountToUse.replace(/,/g, ''));
    if (isNaN(parsed) || parsed <= 0) return 0;
    return isTokenPrimary ? parsed * selectedAsset.price : parsed;
  };

  const distributeAmounts = (recipientsList: Recipient[], totalBudget: number): Recipient[] => {
    if (recipientsList.length === 0 || totalBudget <= 0) return recipientsList;
    
    const count = recipientsList.length;
    const totalCents = Math.round(totalBudget * 100);
    const baseAmount = Math.floor(totalCents / count);
    const remainder = totalCents % count;
    
    return recipientsList.map((r, index) => ({
      ...r,
      amount: ((baseAmount + (index < remainder ? 1 : 0)) / 100).toFixed(2)
    }));
  };

  const addRecipientFromAddressBook = (entry: AddressBookEntry) => {
    if (recipients.find(r => r.address === entry.address)) return;
    const newRecipient: Recipient = {
      id: `r-${Date.now()}`,
      address: entry.address,
      label: entry.label,
      amount: "",
      isFromAddressBook: true,
    };
    const newList = [...recipients, newRecipient];
    const totalBudget = getTotalBudget();
    setRecipients(totalBudget > 0 ? distributeAmounts(newList, totalBudget) : newList);
  };

  const isValidAddress = (address: string): boolean => {
    const trimmed = address.trim();
    if (!trimmed) return false;
    const isFullHex = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
    const isENS = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.eth$/.test(trimmed);
    return isFullHex || isENS;
  };

  const addNewRecipient = () => {
    if (!newAddress.trim()) return;
    if (!isValidAddress(newAddress)) return;
    if (recipients.find(r => r.address === newAddress)) return;
    const newRecipient: Recipient = {
      id: `r-${Date.now()}`,
      address: newAddress.trim(),
      amount: "",
      isFromAddressBook: false,
    };
    const newList = [...recipients, newRecipient];
    const totalBudget = getTotalBudget();
    setRecipients(totalBudget > 0 ? distributeAmounts(newList, totalBudget) : newList);
    setNewAddress("");
  };

  const removeRecipient = (id: string) => {
    const newList = recipients.filter(r => r.id !== id);
    const totalBudget = getTotalBudget();
    setRecipients(totalBudget > 0 && newList.length > 0 ? distributeAmounts(newList, totalBudget) : newList);
  };

  const formatAmountWithCommas = (val: string) => {
    if (!val || val === '') return '';
    const parts = val.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  };

  const updateRecipientAmount = (id: string, newAmount: string) => {
    let val = newAmount.replace(/,/g, '');
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return;
    const formatted = formatAmountWithCommas(val);
    setRecipients(recipients.map(r => 
      r.id === id ? { ...r, amount: formatted } : r
    ));
  };

  const updateWalletAmount = (walletId: string, newAmount: string) => {
    let val = newAmount.replace(/,/g, '');
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return;
    const formatted = formatAmountWithCommas(val);
    setWalletAmounts(prev => ({ ...prev, [walletId]: formatted }));
  };

  const distributeWalletAmounts = (walletIds: string[], totalBudget: number): Record<string, string> => {
    if (walletIds.length === 0 || totalBudget <= 0) return {};
    
    const count = walletIds.length;
    const totalCents = Math.round(totalBudget * 100);
    const baseAmount = Math.floor(totalCents / count);
    const remainder = totalCents % count;
    
    const newAmounts: Record<string, string> = {};
    walletIds.forEach((id, index) => {
      const amount = ((baseAmount + (index < remainder ? 1 : 0)) / 100).toFixed(2);
      newAmounts[id] = formatAmountWithCommas(amount);
    });
    return newAmounts;
  };

  const handleWalletSelection = (walletId: string, isCurrentlySelected: boolean) => {
    let newSelectedWallets: string[];
    if (isCurrentlySelected) {
      newSelectedWallets = selectedWallets.filter(id => id !== walletId);
    } else {
      newSelectedWallets = [...selectedWallets, walletId];
    }
    setSelectedWallets(newSelectedWallets);
    
    // Get total budget from the main amount input or from current wallet amounts
    const currentTotal = getTotalWalletAmount();
    const mainAmountTotal = getTopContainerAmountUSD();
    const totalBudget = currentTotal > 0 ? currentTotal : mainAmountTotal;
    
    if (totalBudget > 0 && newSelectedWallets.length > 0) {
      setWalletAmounts(distributeWalletAmounts(newSelectedWallets, totalBudget));
    } else if (newSelectedWallets.length === 0) {
      setWalletAmounts({});
    }
  };

  const handleRemoveWallet = (walletId: string) => {
    const newSelectedWallets = selectedWallets.filter(id => id !== walletId);
    setSelectedWallets(newSelectedWallets);
    
    const currentTotal = getTotalWalletAmount();
    if (currentTotal > 0 && newSelectedWallets.length > 0) {
      setWalletAmounts(distributeWalletAmounts(newSelectedWallets, currentTotal));
    } else {
      setWalletAmounts({});
    }
  };

  const getTotalWalletAmount = () => {
    return selectedWallets.reduce((sum, id) => {
      const amt = parseFloat((walletAmounts[id] || "0").replace(/,/g, '')) || 0;
      return sum + amt;
    }, 0);
  };

  const getTotalRecipientAmount = () => {
    return recipients.reduce((sum, r) => {
      const amt = parseFloat(r.amount.replace(/,/g, '')) || 0;
      return sum + amt;
    }, 0);
  };

  const getAvailableBalance = () => {
    const totalWalletBalance = selectedWallets.reduce((sum, id) => {
      const wallet = availableWallets.find(w => w.id === id);
      return sum + (wallet ? parseFloat(wallet.balance) : 0);
    }, 0);
    return totalWalletBalance * selectedAsset.price;
  };

  const isWithinBalance = getTotalRecipientAmount() <= getAvailableBalance();
  const hasValidRecipients = recipients.length > 0 && 
    recipients.every(r => r.amount && parseFloat(r.amount.replace(/,/g, '')) > 0) && 
    isWithinBalance;

  const getTopContainerAmountUSD = () => {
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsed)) return 0;
    return isTokenPrimary ? parsed * selectedAsset.price : parsed;
  };

  const fromTotal = getTotalWalletAmount();
  const toTotal = getTotalRecipientAmount();
  const amountsMatch = fromTotal > 0 && toTotal > 0 && Math.abs(fromTotal - toTotal) < 0.01;
  const canSend = hasValidRecipients && selectedWallets.length > 0 && amountsMatch;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAssetDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const total = getTotalWalletAmount();
    if (total > 0) {
      if (isTokenPrimary) {
        const tokenVal = total / selectedAsset.price;
        setAmount(tokenVal.toFixed(2));
      } else {
        setAmount(new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(total));
      }
    } else if (selectedWallets.length === 0) {
      setAmount("");
    }
  }, [walletAmounts, selectedWallets, isTokenPrimary, selectedAsset.price]);

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

    // Track user-entered amount before any recipients are added
    if (recipients.length === 0) {
      userEnteredAmountRef.current = val;
    }

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
    const totalAmount = getTotalRecipientAmount();
    const tokenAmount = totalAmount / selectedAsset.price;
    console.log("Transfer:", { 
      totalUSD: totalAmount,
      tokenAmount: tokenAmount.toFixed(4),
      asset: selectedAsset.symbol, 
      recipients: recipients.map(r => ({
        address: r.address,
        label: r.label,
        amountUSD: parseFloat(r.amount),
        tokenAmount: (parseFloat(r.amount) / selectedAsset.price).toFixed(4)
      }))
    });
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
                className="h-7 px-2 hover:bg-primary/10 font-medium text-[14px] text-[#8f8f8f]"
                onClick={() => {
                  const maxAmount = (parseFloat(selectedAsset.balance.replace(/,/g, '')) * selectedAsset.price).toString();
                  setAmount(maxAmount);
                }}
                data-testid="button-max"
              >
                Max
              </Button>
            </div>

            <div className="relative flex flex-col bg-card border border-border rounded-[24px] z-10">
              {/* Amount Row */}
              <div className="flex items-stretch h-20">
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
                          width: amount ? `${Math.max((amount.length || 1) * 16, 40)}px` : (isTokenPrimary ? '60px' : '40px'),
                        }}
                        className="font-normal p-0 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto text-foreground leading-none text-left min-w-[40px]"
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

              {/* From Wallet Selector */}
              <div 
                className="flex items-center justify-between px-4 py-3 border-t border-border cursor-pointer hover:bg-accent/30 transition-colors rounded-b-[24px]"
                onClick={() => setShowSourceModal(true)}
                data-testid="button-wallet-selector"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="shrink-0 font-medium text-[14px] text-muted-foreground">From</span>
                  <div className="flex gap-1.5 overflow-hidden flex-wrap">
                    {selectedWallets.length > 0 ? (
                      selectedWallets.map(id => {
                        const wallet = availableWallets.find(w => w.id === id);
                        return wallet ? (
                          <Badge key={id} variant="outline" className="h-5 px-1.5 shrink-0 bg-transparent text-foreground border-muted-foreground/30 font-normal text-[14px]">
                            {wallet.name}
                          </Badge>
                        ) : null;
                      })
                    ) : (
                      <span className="text-[14px] font-normal text-[#ababab]">Choose origin wallets</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
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
                className="w-full justify-between bg-card/50 border-border rounded-[24px] h-auto min-h-[72px] py-4 px-4 hover-elevate transition-all"
                onClick={() => setShowDestinationModal(true)} 
                data-testid="button-destination-selector"
              >
                <div className="flex items-center gap-4 overflow-hidden text-left">
                  <Send className="w-6 h-6 text-muted-foreground shrink-0" />
                  <div className="flex flex-col items-start gap-1 w-full">
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      <span className="shrink-0 font-medium text-[18px] text-[#000000]">To</span>
                      <div className="flex gap-1.5 overflow-hidden flex-wrap">
                        {recipients.length > 0 ? (
                          recipients.map(r => (
                            <Badge key={r.id} variant="outline" className="h-5 px-1.5 shrink-0 bg-transparent text-foreground border-muted-foreground/30 font-normal text-[14px]">
                              {r.label || truncateAddress(r.address)}
                            </Badge>
                          ))
                        ) : null}
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[14px] font-normal">
                      {recipients.length > 0 
                        ? `Total: $${getTotalRecipientAmount().toLocaleString()}` 
                        : "Choose destination wallets"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center px-2 py-2">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-sm text-foreground font-normal">4 sec</span>
              <span className="text-[14px] font-normal text-[#ababab]">est. tx time</span>
            </div>
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-sm text-foreground font-normal">$0.31</span>
              <span className="text-[14px] font-normal text-[#ababab]">est. fee</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pt-[0px] pb-[0px]">
            {!canSend && (hasValidRecipients || selectedWallets.length > 0 || amount) ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span className="w-full cursor-not-allowed" tabIndex={0}>
                    <Button
                      size="lg"
                      className="w-full text-lg font-semibold rounded-[16px] h-[48px] pointer-events-none"
                      disabled
                      data-testid="button-continue"
                    >
                      Send
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {selectedWallets.length === 0 
                      ? "Choose origin wallets"
                      : !hasValidRecipients 
                        ? "Select recipients and set amounts"
                        : `From ($${fromTotal.toLocaleString()}) and To ($${toTotal.toLocaleString()}) totals must match`}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                size="lg"
                className="w-full text-lg font-semibold rounded-[16px] h-[48px]"
                disabled={!canSend}
                onClick={handleContinue}
                data-testid="button-continue"
              >
                Send
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-transparent"
              disabled={!canSend}
              onClick={() => console.log("Simulate Transfer")}
              data-testid="button-simulate"
            >
              Simulate Transfer
            </Button>
          </div>
        </motion.div>
      </main>
      <Dialog open={showDestinationModal} onOpenChange={setShowDestinationModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[16px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold">Select recipients</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {recipients.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm text-muted-foreground font-medium">Selected recipients</h3>
                  <span className="text-sm font-medium"><span className="text-[#ababab]">Total</span> <span className="text-foreground">${getTotalRecipientAmount().toLocaleString()}</span><span className="text-[#ababab]"> / </span><span className="text-foreground">${getTotalWalletAmount().toLocaleString()}</span></span>
                </div>
                <div className="space-y-2">
                  {recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-[10px] border border-border bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{recipient.label || "Custom Address"}</span>
                          <a 
                            href={`https://etherscan.io/address/${recipient.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-muted-foreground font-mono hover:text-primary hover:underline cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >{truncateAddress(recipient.address)}</a>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-muted/50 rounded-[6px] px-2 py-1 shrink-0">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                          type="text"
                          placeholder="0"
                          value={recipient.amount}
                          onChange={(e) => updateRecipientAmount(recipient.id, e.target.value)}
                          className="w-20 h-5 p-0 bg-transparent border-0 text-sm font-bold text-right focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                          data-testid={`input-amount-${recipient.id}`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeRecipient(recipient.id)}
                        data-testid={`button-remove-${recipient.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm text-muted-foreground font-medium">New address</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter wallet address or ENS name"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className={`flex-1 rounded-[12px] ${newAddress && !isValidAddress(newAddress) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  data-testid="input-new-address"
                  onKeyDown={(e) => e.key === 'Enter' && addNewRecipient()}
                />
                <Button
                  size="icon"
                  onClick={addNewRecipient}
                  disabled={!newAddress.trim() || !isValidAddress(newAddress)}
                  className="rounded-[12px]"
                  data-testid="button-add-address"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newAddress && !isValidAddress(newAddress) && (
                <span className="text-xs text-destructive">Enter a full 42-character wallet address (0x...) or ENS name (.eth)</span>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm text-muted-foreground font-medium">Contacts</h3>
              <div className="space-y-2">
                {addressBook.map((entry) => {
                  const isSelected = recipients.some(r => r.address === entry.address);
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-[12px] border cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-accent/30'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          const recipientToRemove = recipients.find(r => r.address === entry.address);
                          if (recipientToRemove) {
                            removeRecipient(recipientToRemove.id);
                          }
                        } else {
                          addRecipientFromAddressBook(entry);
                        }
                      }}
                      data-testid={`addressbook-${entry.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{entry.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${entry.isInternal ? 'bg-emerald-500/10 text-emerald-600' : 'bg-orange-500/10 text-orange-600'}`}>
                              {entry.isInternal ? <Lock className="w-2.5 h-2.5" /> : <CornerUpRight className="w-2.5 h-2.5" />}
                              {entry.isInternal ? 'Internal' : 'External'}
                            </span>
                          </div>
                          <a 
                            href={`https://etherscan.io/address/${entry.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-muted-foreground font-mono hover:text-primary hover:underline cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >{truncateAddress(entry.address)}</a>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 pt-4 border-t border-border">
            {!isWithinBalance && recipients.length > 0 ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span className="w-full cursor-not-allowed" tabIndex={0}>
                    <Button
                      className="w-full rounded-[12px] pointer-events-none"
                      disabled
                      data-testid="button-confirm-recipients"
                    >
                      Confirm {recipients.length > 0 ? `(${recipients.length} recipient${recipients.length > 1 ? 's' : ''})` : ''}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total exceeds available balance</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                className="w-full rounded-[12px]"
                onClick={() => setShowDestinationModal(false)}
                disabled={recipients.length === 0 || !recipients.every(r => r.amount && parseFloat(r.amount) > 0)}
                data-testid="button-confirm-recipients"
              >
                Confirm {recipients.length > 0 ? `(${recipients.length} recipient${recipients.length > 1 ? 's' : ''})` : ''}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showSourceModal} onOpenChange={setShowSourceModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[16px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold">Select source wallets</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {selectedWallets.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm text-muted-foreground font-medium">Selected wallets</h3>
                  <span className="text-sm font-medium"><span className="text-[#ababab]">Total</span> <span className="text-foreground">${getTotalWalletAmount().toLocaleString()}</span></span>
                </div>
                <div className="space-y-2">
                  {selectedWallets.map((walletId) => {
                    const wallet = availableWallets.find(w => w.id === walletId);
                    if (!wallet) return null;
                    return (
                      <div
                        key={wallet.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-[10px] border border-border bg-card"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{wallet.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{wallet.address}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-muted/50 rounded-[6px] px-2 py-1 shrink-0">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="text"
                            placeholder="0"
                            value={walletAmounts[wallet.id] || ""}
                            onChange={(e) => updateWalletAmount(wallet.id, e.target.value)}
                            className="w-20 h-5 p-0 bg-transparent border-0 text-sm font-bold text-right focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                            data-testid={`input-wallet-amount-${wallet.id}`}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveWallet(wallet.id)}
                          data-testid={`button-remove-wallet-${wallet.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm text-muted-foreground font-medium">Available wallets</h3>
                <span className="text-sm font-medium"><span className="text-[#ababab]">Total balance</span> <span className="text-foreground">${(parseFloat(selectedAsset.balance.replace(/,/g, '')) * selectedAsset.price).toLocaleString()}</span></span>
              </div>
              <div className="space-y-2">
                {availableWallets.map((wallet) => {
                  const isSelected = selectedWallets.includes(wallet.id);
                  return (
                    <div
                      key={wallet.id}
                      className={`flex items-center justify-between p-3 rounded-[12px] border cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-accent/30'
                      }`}
                      onClick={() => handleWalletSelection(wallet.id, isSelected)}
                      data-testid={`option-wallet-${wallet.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          className="rounded-sm border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-muted-foreground" />
                        </div>
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
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 pt-4 border-t border-border">
            <Button
              className="w-full rounded-[12px]"
              onClick={() => setShowSourceModal(false)}
              disabled={selectedWallets.length === 0}
              data-testid="button-confirm-wallets"
            >
              Confirm {selectedWallets.length > 0 ? `(${selectedWallets.length} wallet${selectedWallets.length > 1 ? 's' : ''})` : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
