/**
 * Home.tsx
 * 
 * Main dashboard and landing page for the Utila platform.
 * Displays different views based on wallet connection state:
 * - Disconnected: Hero section with "Connect Wallet" CTA
 * - Connected: Dashboard with quick actions and pending items requiring attention
 * 
 * The dashboard shows:
 * - Top holdings (asset balances)
 * - Pending transactions needing approval
 * - Pending policy changes needing approval
 */

import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { Send, Gavel, Inbox, History, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { SiEthereum, SiTether, SiGithub, SiNotion } from "react-icons/si";
import { RiCoinFill } from "react-icons/ri";
import { MdOutlinePaid } from "react-icons/md";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ReviewDialog, ValueDiff } from "@/components/ReviewDialog";
import { useToast } from "@/hooks/use-toast";
import type { Policy } from "@shared/schema";
import { Trash2, AlertCircle } from "lucide-react";
import { api } from "@shared/routes";

// Returns appropriate icon component based on asset type in amount string
const getAssetIcon = (amount: string) => {
  if (amount.includes("ETH")) return <SiEthereum className="w-4 h-4 text-[#627EEA]" />;
  if (amount.includes("USDC")) return <MdOutlinePaid className="w-4 h-4 text-[#2775CA]" />;
  if (amount.includes("USDT")) return <SiTether className="w-4 h-4 text-[#26A17B]" />;
  return <RiCoinFill className="w-4 h-4 text-muted-foreground" />;
};

// Formats amount strings with locale-aware number formatting
const formatAmount = (amountStr: string) => {
  if (!amountStr) return "Unknown";
  const [val, symbol] = amountStr.split(" ");
  const num = parseFloat(val.replace(/,/g, ""));
  if (isNaN(num)) return amountStr;
  
  const formattedNum = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
  
  return `${formattedNum}${symbol ? ` ${symbol}` : ""}`;
};

// Address to name mapping - must match use-wallet.ts WALLET_USERS
const ADDRESS_TO_NAME: Record<string, string> = {
  "0xc333b115a72a3519b48E9B4f9D1bBD4a34C248b1": "Meir",
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": "Ishai",
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": "Omer",
  "0x6B175474E89094C44Da98b954EesecdB6F8e5389": "Lena",
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045": "Sam",
};

// Maps wallet addresses to user names - returns "Unknown" for unrecognized addresses
const addressToName = (address: string | null | undefined): string => {
  if (!address || address === "anonymous") return "Unknown";
  return ADDRESS_TO_NAME[address] || "Unknown";
};

// Checks if the current user is the initiator of a policy change
const isUserInitiator = (changeInitiator: string | null | undefined, currentUserAddress: string | undefined): boolean => {
  // If no initiator recorded or current user not logged in, can't determine - allow review
  if (!changeInitiator || !currentUserAddress) return false;
  // If anonymous initiator, we can't determine who did it
  if (changeInitiator === "anonymous") return false;
  // Direct address comparison
  return changeInitiator === currentUserAddress;
};

export default function Home() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: async (txId: number) => {
      return await apiRequest('POST', `/api/transactions/${txId}/approve`, {
        approver: walletState.connectedUser?.name || 'anonymous'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/pending"] });
      toast({ title: "Transaction approved" });
    },
    onError: () => {
      toast({ title: "Failed to approve transaction", variant: "destructive" });
    },
  });

  const approvePolicyMutation = useMutation({
    mutationFn: async (policyId: number) => {
      return await apiRequest('POST', `/api/policies/${policyId}/approve-change`, {
        approver: walletState.connectedUser?.name || 'anonymous'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies/pending"] });
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      toast({ title: "Policy change approved" });
      setSelectedPolicy(null);
    },
    onError: (error: Error) => {
      const message = error.message || "Failed to approve policy change";
      toast({ 
        title: message.includes("not authorized") ? "Not Authorized" : "Failed to approve policy change", 
        description: message.includes("not authorized") ? message : undefined,
        variant: "destructive" 
      });
    },
  });

  const { data: pendingTransactions = [], refetch: refetchPending } = useQuery<any[]>({
    queryKey: ["/api/transactions/pending"],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/pending`);
      if (!res.ok) throw new Error("Failed to fetch pending transactions");
      return res.json();
    },
    enabled: !!walletState.connectedUser?.name,
  });

  const { data: pendingPolicies = [], refetch: refetchPendingPolicies } = useQuery<Policy[]>({
    queryKey: ["/api/policies/pending", walletState.connectedUser?.name],
    queryFn: async () => {
      if (!walletState.connectedUser?.name) return [];
      const res = await fetch(`/api/policies/pending?userName=${encodeURIComponent(walletState.connectedUser.name)}`);
      if (!res.ok) throw new Error("Failed to fetch pending policy changes");
      return res.json();
    },
    enabled: !!walletState.connectedUser?.name,
  });

  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  /**
   * Effect to refresh pending transactions and policies whenever the connected user changes.
   * This ensures the dashboard always displays relevant data for the current session.
   */
  useEffect(() => {
    if (walletState.connectedUser?.name) {
      refetchPending();
      refetchPendingPolicies();
    }
  }, [walletState.connectedUser?.name, refetchPending, refetchPendingPolicies]);

  // Filter transactions to only show those needing attention (status "pending")
  const filteredTransfers = pendingTransactions.filter(tx => 
    tx.status === "pending"
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        type: "spring", 
        stiffness: 100, 
        damping: 15 
      } 
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar walletState={walletState} isDialogOpen={isWalletDialogOpen} setIsDialogOpen={setIsWalletDialogOpen} />
      <main className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[90vh]">
        
        <AnimatePresence mode="wait">
          {!walletState.isConnected ? (
            <motion.div
              key="hero"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.h1 
                variants={itemVariants} 
                className="text-6xl md:text-8xl font-bold tracking-tight mb-8 font-display text-foreground"
              >Utila Policy Prototype</motion.h1>

              <motion.div variants={itemVariants} className="flex flex-col items-center gap-6">
                <Button 
                  size="lg" 
                  className="rounded-[16px] px-8 h-[56px] text-lg font-semibold hover-elevate active-elevate-2"
                  onClick={() => setIsWalletDialogOpen(true)}
                  data-testid="button-get-started"
                >Start by Connecting Wallet</Button>

                <div className="flex flex-col gap-2">
                  <Button 
                    variant="ghost" 
                    className="gap-2 text-muted-foreground hover:text-foreground rounded-[12px] h-9"
                    asChild
                  >
                    <a href="https://catkin-buzzard-15c.notion.site/Specs-Utila-Transaction-Policy-2e9da37fe9f980b28c35c2f7ee0d3c6a" target="_blank" rel="noopener noreferrer" data-testid="link-specs">
                      <SiNotion className="w-5 h-5" />
                      <span>Specs and Explanation</span>
                    </a>
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="gap-2 text-muted-foreground hover:text-foreground rounded-[12px] h-9"
                    asChild
                  >
                    <a href="https://github.com/xmeir-dev/Utila-Policy-Prototype" target="_blank" rel="noopener noreferrer" data-testid="link-repo">
                      <SiGithub className="w-5 h-5" />
                      <span>See Repo</span>
                    </a>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl mx-auto"
            >
              <h2 className="font-display mb-8 text-center font-medium text-[28px]">
                Hi <span className="font-bold">{walletState.connectedUser?.name}</span>, welcome to your Waystar Royco workspace
              </h2>

              <div className="grid grid-cols-3 gap-4 mb-12 w-full">
                <div 
                  className="flex flex-col items-center justify-center gap-3 p-8 border border-border rounded-[24px] bg-primary text-primary-foreground cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setLocation("/transfer")}
                  data-testid="button-transfer"
                >
                  <Send className="w-8 h-8 text-primary-foreground" />
                  <span className="font-semibold text-center text-primary-foreground">Transfer</span>
                </div>
                <div 
                  className="flex flex-col items-center justify-center gap-3 p-8 border border-border rounded-[24px] bg-card cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setLocation("/policies")}
                  data-testid="button-policies"
                >
                  <Gavel className="w-8 h-8 text-primary" />
                  <span className="font-semibold text-center">Policies</span>
                </div>
                <div 
                  className="flex flex-col items-center justify-center gap-3 p-8 border border-border rounded-[24px] bg-card cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setLocation("/history")}
                  data-testid="button-history"
                >
                  <History className="w-8 h-8 text-primary" />
                  <span className="font-semibold text-center">Activity</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 w-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[16px]">Top holdings</h3>
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const ethPrice = 2800; // Estimated price based on $3,514,000 / 1,255
                      const assets = [
                        { 
                          name: 'ETH', 
                          balance: 1255, 
                          balanceStr: '1,255',
                          usdValue: 1255 * ethPrice, 
                          color: 'bg-slate-700',
                          icon: <SiEthereum className="w-4 h-4 text-white" />
                        },
                        { 
                          name: 'USDC', 
                          balance: 1059505, 
                          balanceStr: '1,059,505',
                          usdValue: 1059505, 
                          color: 'bg-blue-600',
                          icon: <RiCoinFill className="w-5 h-5 text-white" />
                        },
                        { 
                          name: 'USDT', 
                          balance: 750500, 
                          balanceStr: '750,500',
                          usdValue: 750500, 
                          color: 'bg-emerald-500',
                          icon: <SiTether className="w-4 h-4 text-white" />
                        },
                      ];

                      const totalValue = assets.reduce((acc, asset) => acc + asset.usdValue, 0);
                      const sortedAssets = [...assets].sort((a, b) => b.usdValue - a.usdValue);

                      return sortedAssets.map((asset) => {
                        const percent = Math.round((asset.usdValue / totalValue) * 100);
                        return (
                          <div key={asset.name} className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", asset.color + "/10")}>
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", asset.color)}>
                                {asset.icon}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{asset.balanceStr} {asset.name}</span>
                                <div className="text-right">
                                  <div className="text-sm font-medium">${asset.usdValue.toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full rounded-full", asset.color)} 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-6 text-right">{percent}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[16px]">Requires approval</h3>
                  </div>
                  <div className="space-y-4">
                    {(filteredTransfers.length > 0 || pendingPolicies.length > 0) ? (
                      <>
                        {pendingPolicies.map((policy) => {
                          let pendingChanges: Record<string, unknown> = {};
                          try {
                            pendingChanges = policy.pendingChanges ? JSON.parse(policy.pendingChanges) : {};
                          } catch {
                            pendingChanges = {};
                          }
                          const initiatorName = addressToName(policy.changeInitiator);
                          const isPolicyInitiator = isUserInitiator(policy.changeInitiator, walletState.walletAddress);
                          const isAuthorizedApprover = policy.changeApproversList?.includes(walletState.connectedUser?.name || '');
                          return (
                            <div key={`policy-${policy.id}`} className="p-4 rounded-[14px] bg-card/50 px-2 py-3 border border-border/50" data-testid={`pending-policy-${policy.id}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Policy change</span>
                                  <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                      <span className="text-[12px] text-muted-foreground cursor-help">{(policy.changeApprovers?.length || 0)}/{policy.changeApprovalsRequired || 1} approvals</span>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-2 min-w-[200px]">
                                      <div className="space-y-2">
                                        {policy.changeApprovers && policy.changeApprovers.length > 0 && (
                                          <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Approved by</p>
                                            <ul className="text-xs space-y-1">
                                              {policy.changeApprovers.map((name, i) => (
                                                <li key={i} className="flex justify-between items-center">
                                                  <span>{name}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {(() => {
                                          const approvedSet = new Set(policy.changeApprovers || []);
                                          const allowedButNotApproved = (policy.changeApproversList || []).filter(name => !approvedSet.has(name));
                                          
                                          if (allowedButNotApproved.length > 0) {
                                            return (
                                              <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Also can approve</p>
                                                <ul className="text-xs space-y-1">
                                                  {allowedButNotApproved.map((name, i) => (
                                                    <li key={i} className="text-muted-foreground/70">{name}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isPolicyInitiator ? (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px] h-5 px-1.5 font-normal">Pending</Badge>
                                  ) : !isAuthorizedApprover ? (
                                    <Tooltip delayDuration={200}>
                                      <TooltipTrigger asChild>
                                        <div>
                                          <Button 
                                            size="sm" 
                                            className="h-6 px-3 text-xs"
                                            disabled
                                            data-testid={`button-review-policy-${policy.id}`}
                                          >
                                            Review
                                          </Button>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>You are not authorized to approve this request</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      className="h-6 px-3 text-xs"
                                      onClick={() => setSelectedPolicy(policy)}
                                      disabled={approvePolicyMutation.isPending}
                                      data-testid={`button-review-policy-${policy.id}`}
                                    >
                                      Review
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <p className="mb-1 text-[14px] text-[#8a8a8a]">
                                {policy.name}
                              </p>
                              <div className="text-[10px] text-muted-foreground">
                                <span className="text-[14px] text-[#8a8a8a]">
                                  Requested by <span className="text-foreground font-medium">{initiatorName}</span> on {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {policy.updatedAt ? new Date(policy.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {filteredTransfers.map((tx) => {
                          const isInitiator = tx.initiatorName === walletState.connectedUser?.name;
                          return (
                            <div key={tx.id} className="p-4 rounded-[14px] bg-card/50 px-2 py-3 border border-border/50">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Transfer of {formatAmount(tx.amount)}</span>
                                  <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                      <span className="text-[12px] text-muted-foreground cursor-help">{(tx.approvals?.length || 0)}/{tx.quorumRequired || 1} approvals</span>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-2 min-w-[200px]">
                                      <div className="space-y-2">
                                        {tx.approvals && tx.approvals.length > 0 && (
                                          <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Approved by</p>
                                            <ul className="text-xs space-y-1">
                                              {tx.approvals.map((name: string, i: number) => (
                                                <li key={i}>{name}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {(() => {
                                          // For transfers, the quorum can be satisfied by any authorized user.
                                          // We don't have a specific "allowedButNotApproved" list for a specific transaction
                                          // unless we look at the policy that triggered it. 
                                          // However, based on the context of the app, any user who can approve can be listed.
                                          const approvedSet = new Set(tx.approvals || []);
                                          const allAuthorizedNames = ["Meir", "Ishai", "Omer", "Lena", "Sam"];
                                          const pendingNames = allAuthorizedNames.filter(name => !approvedSet.has(name));

                                          if (pendingNames.length > 0) {
                                            return (
                                              <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Also can approve</p>
                                                <ul className="text-xs space-y-1">
                                                  {pendingNames.map((name, i) => (
                                                    <li key={i} className="text-muted-foreground/70">{name}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isInitiator ? (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px] h-5 px-1.5 font-normal">Pending</Badge>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      className="h-6 px-3 text-xs"
                                      onClick={() => setSelectedTx(tx)}
                                      disabled={approveMutation.isPending}
                                      data-testid={`button-review-${tx.id}`}
                                    >
                                      Review
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <p className="mb-1 text-[14px] text-[#8a8a8a]">From {tx.initiatorName || "Wallet"} to Bank of America</p>
                              <div className="text-[10px] text-muted-foreground">
                                <span className="text-[14px] text-[#8a8a8a]">Initiated by <span className="text-foreground font-medium">{tx.initiatorName || walletState.connectedUser?.name || "Unknown"}</span> on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-border rounded-[14px] bg-card/20 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                          <Inbox className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <h4 className="text-sm font-medium text-foreground mb-1">Nothing to approve</h4>
                        <p className="text-xs max-w-[200px] text-[#8a8a8a]">Transfers and policy changes requiring approval will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ReviewDialog
          isOpen={!!selectedPolicy}
          onOpenChange={(open) => !open && setSelectedPolicy(null)}
          title={selectedPolicy?.pendingChanges?.includes("__delete") ? "Review Policy Deletion" : "Review Policy Change"}
          details={
            selectedPolicy && (() => {
              let pendingChanges: Record<string, any> = {};
              try {
                pendingChanges = selectedPolicy.pendingChanges ? JSON.parse(selectedPolicy.pendingChanges) : {};
              } catch {
                pendingChanges = {};
              }
              const isDelete = pendingChanges.__delete === true;

              return (
                <div className="space-y-6">
                  {isDelete && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">This policy is scheduled for permanent deletion.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/50">
                    <div>
                      <div className="text-[10px] font-medium mb-1 uppercase tracking-wider text-muted-foreground">Initiated By</div>
                      <div className="text-sm font-medium">{addressToName(selectedPolicy.changeInitiator)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium mb-1 uppercase tracking-wider text-muted-foreground">Status</div>
                      <div className="text-sm">
                        <span className="font-medium">{(selectedPolicy.changeApprovers?.length || 0)}</span>
                        <span className="text-muted-foreground">/{selectedPolicy.changeApprovalsRequired || 1} approvals</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5 mb-2">
                      {isDelete ? "Policy to be Deleted" : "Proposed Changes"}
                    </h4>
                    
                    <ValueDiff label="Policy Name" oldVal={selectedPolicy.name} newVal={pendingChanges.name} isDelete={isDelete} />
                    <ValueDiff label="Description" oldVal={selectedPolicy.description} newVal={pendingChanges.description} isDelete={isDelete} />
                    <ValueDiff label="Action" oldVal={selectedPolicy.action} newVal={pendingChanges.action} isDelete={isDelete} />
                    <ValueDiff label="Condition Logic" oldVal={selectedPolicy.conditionLogic} newVal={pendingChanges.conditionLogic} isDelete={isDelete} />
                    <ValueDiff label="Initiator Type" oldVal={selectedPolicy.initiatorType} newVal={pendingChanges.initiatorType} isDelete={isDelete} />
                    <ValueDiff label="Initiators" oldVal={selectedPolicy.initiatorValues} newVal={pendingChanges.initiatorValues} isDelete={isDelete} />
                    <ValueDiff label="Asset Type" oldVal={selectedPolicy.assetType} newVal={pendingChanges.assetType} isDelete={isDelete} />
                    <ValueDiff label="Assets" oldVal={selectedPolicy.assetValues} newVal={pendingChanges.assetValues} isDelete={isDelete} />
                    <ValueDiff label="Amount Condition" oldVal={selectedPolicy.amountCondition} newVal={pendingChanges.amountCondition} isDelete={isDelete} />
                    <ValueDiff label="Min Amount" oldVal={selectedPolicy.amountMin} newVal={pendingChanges.amountMin} isDelete={isDelete} />
                    <ValueDiff label="Max Amount" oldVal={selectedPolicy.amountMax} newVal={pendingChanges.amountMax} isDelete={isDelete} />
                    <ValueDiff label="Approvers" oldVal={selectedPolicy.approvers} newVal={pendingChanges.approvers} isDelete={isDelete} />
                    <ValueDiff label="Quorum Required" oldVal={selectedPolicy.quorumRequired} newVal={pendingChanges.quorumRequired} isDelete={isDelete} />

                    {!isDelete && Object.keys(pendingChanges).length === 0 && (
                      <div className="text-sm text-muted-foreground italic py-2">No configuration changes detected.</div>
                    )}
                  </div>
                </div>
              );
            })()
          }
          onApprove={() => selectedPolicy && approvePolicyMutation.mutate(selectedPolicy.id)}
          isPending={approvePolicyMutation.isPending}
          dataTestId={`dialog-policy-${selectedPolicy?.id}`}
          alreadyApproved={selectedPolicy?.changeApprovers?.includes(walletState.connectedUser?.name || '')}
        />

        <ReviewDialog
          isOpen={!!selectedTx}
          onOpenChange={(open) => !open && setSelectedTx(null)}
          title="Review Transaction"
          details={
            selectedTx && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2">
                    {getAssetIcon(selectedTx.amount)}
                    <span className="text-lg font-bold">{formatAmount(selectedTx.amount)}</span>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-medium mb-1 uppercase tracking-wider text-muted-foreground">From</div>
                    <div className="text-sm font-medium">{selectedTx.initiatorName || "Wallet"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1 uppercase tracking-wider text-muted-foreground">To</div>
                    <div className="text-sm font-medium">Bank of America</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-medium mb-1 uppercase tracking-wider text-muted-foreground">Approvals</div>
                    <div className="text-sm">{selectedTx.approvals?.length || 0}/{selectedTx.quorumRequired || 1}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1 uppercase tracking-wider text-muted-foreground">Initiator</div>
                    <div className="text-sm">{selectedTx.initiatorName || "Unknown"}</div>
                  </div>
                </div>
              </div>
            )
          }
          onApprove={() => selectedTx && approveMutation.mutate(selectedTx.id)}
          isPending={approveMutation.isPending}
          dataTestId={`dialog-tx-${selectedTx?.id}`}
          alreadyApproved={selectedTx?.approvals?.includes(walletState.connectedUser?.name || '')}
        />
      </main>
    </div>
  );
}
