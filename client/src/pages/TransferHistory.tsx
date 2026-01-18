import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Users, ExternalLink } from "lucide-react";
import etherscanLogo from "@assets/etherscan-logo-circle_1768521442428.png"
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Transaction, PolicyHistory } from "@shared/schema";

const truncateAddress = (address: string): string => {
  if (!address) return "-";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Structure representing a wallet address entry in transactions.
 * Used by AddressCellWithTooltip to display source/destination wallets.
 */
interface AddressInfo {
  label: string;      // Human-readable wallet name (e.g., "Treasury", "Finances")
  address: string;    // Ethereum address for Etherscan linking
  amount?: string;    // Optional per-wallet amount for multi-wallet transactions
}

/**
 * MULTIPLE WALLETS DISPLAY FEATURE
 * 
 * Renders wallet addresses in the transaction history table with support for
 * displaying multiple wallets in a single transaction. When a transaction
 * involves multiple source or destination wallets:
 * - Shows the first wallet inline with a "+N" badge indicating additional wallets
 * - Hovering reveals a tooltip with all wallets, their addresses, and amounts
 * - Each wallet entry has an Etherscan link for blockchain verification
 * 
 * This handles batch transactions where funds move between multiple wallets simultaneously.
 */
const AddressCellWithTooltip = ({ 
  addresses, 
  etherscanLogo 
}: { 
  addresses: AddressInfo[];
  etherscanLogo: string;
}) => {
  if (!addresses || addresses.length === 0) {
    return <span className="text-sm font-normal">-</span>;
  }

  // Display first wallet inline, with badge showing count of additional wallets
  const firstAddress = addresses[0];
  const additionalCount = addresses.length - 1;

  if (addresses.length === 1) {
    return (
      <div className="flex items-center gap-2 group">
        <span className="text-sm font-normal text-[#171717]">
          {firstAddress.label || truncateAddress(firstAddress.address)}
        </span>
        {firstAddress.address && (
          <a 
            href={`https://etherscan.io/address/${firstAddress.address}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid="link-etherscan-single"
          >
            <img src={etherscanLogo} alt="Etherscan" className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer" data-testid="addresses-tooltip-trigger">
          <span className="text-sm font-normal text-[#171717]">
            {firstAddress.label || truncateAddress(firstAddress.address)}
          </span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
            +{additionalCount}
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] p-3">
        <div className="space-y-2">
          {addresses.map((addr, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex flex-col">
                <span className="font-medium">{addr.label || truncateAddress(addr.address)}</span>
                {addr.amount && (
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{addr.amount}</span>
                    <span className="text-xs text-[#ababab]">
                      ${(parseFloat(addr.amount.split(' ')[0].replace(/,/g, '')) * 2500).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              {addr.address && (
                <a 
                  href={`https://etherscan.io/address/${addr.address}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                  data-testid={`link-etherscan-${idx}`}
                >
                  <img src={etherscanLogo} alt="Etherscan" className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * MULTIPLE WALLETS - SOURCE ADDRESS BUILDER
 * 
 * Constructs an array of AddressInfo objects from transaction source data.
 * Supports both legacy single-wallet format and new multi-wallet format:
 * - New format: Uses fromWallets[], fromAddresses[], fromAmounts[] arrays
 * - Legacy format: Falls back to single fromWallet field
 * 
 * This enables the table to display transactions that pull funds from multiple
 * source wallets in a single operation (e.g., consolidating funds).
 */
const buildFromAddresses = (tx: Transaction, fallbackAddress: string | null): AddressInfo[] => {
  // New multi-wallet format: parallel arrays for labels, addresses, and amounts
  if (tx.fromWallets && tx.fromWallets.length > 0) {
    return tx.fromWallets.map((label, idx) => ({
      label: label || "",
      address: tx.fromAddresses?.[idx] || "",
      amount: tx.fromAmounts?.[idx],
    }));
  }
  // Legacy single-wallet format for backwards compatibility
  if (tx.fromWallet) {
    return [{
      label: tx.fromWallet,
      address: fallbackAddress || "",
    }];
  }
  return [];
};

/**
 * MULTIPLE WALLETS - DESTINATION ADDRESS BUILDER
 * 
 * Constructs an array of AddressInfo objects from transaction destination data.
 * Supports both legacy single-destination and new multi-destination format:
 * - New format: Uses toAddresses[], toLabels[], toAmounts[] arrays
 * - Legacy format: Falls back to single toAddress field
 * 
 * This enables the table to display transactions that distribute funds to multiple
 * destination addresses (e.g., batch payouts, multi-recipient transfers).
 */
const buildToAddresses = (tx: Transaction): AddressInfo[] => {
  // New multi-destination format: parallel arrays for addresses, labels, and amounts
  if (tx.toAddresses && tx.toAddresses.length > 0) {
    return tx.toAddresses.map((address, idx) => ({
      label: tx.toLabels?.[idx] || "",
      address: address || "",
      amount: tx.toAmounts?.[idx],
    }));
  }
  // Legacy single-destination format for backwards compatibility
  if (tx.toAddress) {
    return [{
      label: tx.toLabel || "",
      address: tx.toAddress,
    }];
  }
  return [];
};

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

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return { date: "-", time: "-" };
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { date: "-", time: "-" };
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
    };
  } catch {
    return { date: "-", time: "-" };
  }
};

// Format approval timestamp for tooltip display
const formatApprovalTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    }).toLowerCase();
  } catch {
    return "";
  }
};

// Parse approval timestamps JSON into array of {approver, timestamp}
const parseApprovalTimestamps = (timestampsJson: string | null): { approver: string; timestamp: string }[] => {
  if (!timestampsJson) return [];
  try {
    return JSON.parse(timestampsJson);
  } catch {
    return [];
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 gap-1">
          <XCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const PolicyActionBadge = ({ action, changes }: { action: string; changes: string | null }) => {
  const parsedChanges = changes ? JSON.parse(changes) : null;
  
  const getBadgeContent = () => {
    switch (action) {
      case "creation":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Creation
          </Badge>
        );
      case "edit":
        return (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 gap-1 cursor-help">
                <Clock className="w-3 h-3" />
                Edit
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px] p-3">
              {parsedChanges ? (
                <div className="text-xs space-y-1">
                  <p className="font-medium mb-2">Changes made:</p>
                  {Object.entries(parsedChanges).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs">No change details available</p>
              )}
            </TooltipContent>
          </Tooltip>
        );
      case "deletion":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 gap-1">
            <XCircle className="w-3 h-3" />
            Deletion
          </Badge>
        );
      case "change-approval":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
            <Users className="w-3 h-3" />
            Approval
          </Badge>
        );
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return getBadgeContent();
};

export default function TransferHistory() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const res = await fetch("/api/transactions");
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const { data: policyHistoryData = [], isLoading: isPolicyHistoryLoading } = useQuery<PolicyHistory[]>({
    queryKey: ["/api/policy-history"],
    queryFn: async () => {
      const res = await fetch("/api/policy-history");
      if (!res.ok) throw new Error("Failed to fetch policy history");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar walletState={walletState} />
      <main className="max-w-5xl mx-auto px-6 py-12 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
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
            <h2 className="font-bold font-display text-foreground text-[24px]">Activity</h2>
          </div>

          <h3 className="text-[#171717] text-[18px] font-medium" data-testid="text-transfer-history-label">
            Transfer history
          </h3>

          <div className="border border-border rounded-[24px] bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-transactions">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">Initiator</th>
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">Amount</th>
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">From</th>
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">To</th>
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">Date & Time</th>
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">Status</th>
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">Approvals</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[#ababab]">No transactions yet</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const { date, time } = formatDateTime(tx.createdAt);
                      const approvalsCount = tx.approvals?.length || 0;
                      const quorumRequired = tx.quorumRequired || 1;
                      
                      const fromAddresses: AddressInfo[] = buildFromAddresses(tx, walletState.walletAddress);
                      const toAddresses: AddressInfo[] = buildToAddresses(tx);
                      
                      return (
                        <tr 
                          key={tx.id} 
                          className="border-b border-border last:border-b-0"
                          data-testid={`row-transaction-${tx.id}`}
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-normal">{tx.initiatorName || "-"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-normal">{formatAmount(tx.amount)}</span>
                              {tx.amount && (
                                <span className="text-xs text-[#ababab]">
                                  ${(parseFloat(tx.amount.split(' ')[0].replace(/,/g, '')) * 2500).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <AddressCellWithTooltip 
                              addresses={fromAddresses} 
                              etherscanLogo={etherscanLogo} 
                            />
                          </td>
                          <td className="px-6 py-4">
                            <AddressCellWithTooltip 
                              addresses={toAddresses} 
                              etherscanLogo={etherscanLogo} 
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm">{date}</span>
                              <span className="text-xs text-[#8a8a8a]">{time}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="px-6 py-4">
                            {tx.status === "pending" || approvalsCount > 0 ? (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 cursor-help" data-testid={`approvals-${tx.id}`}>
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{approvalsCount}/{quorumRequired}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                  {approvalsCount > 0 ? (
                                    <div className="text-xs">
                                      <p className="font-medium mb-1">Approved by:</p>
                                      <ul className="space-y-1">
                                        {(() => {
                                          const timestamps = parseApprovalTimestamps(tx.approvalTimestamps);
                                          return tx.approvals?.map((approver, idx) => {
                                            const approvalRecord = timestamps.find(t => t.approver === approver);
                                            const timeStr = approvalRecord ? formatApprovalTime(approvalRecord.timestamp) : "";
                                            return (
                                              <li key={idx} className="flex justify-between gap-3">
                                                <span>{approver}</span>
                                                {timeStr && <span className="text-muted-foreground">{timeStr}</span>}
                                              </li>
                                            );
                                          });
                                        })()}
                                      </ul>
                                    </div>
                                  ) : (
                                    <p className="text-xs">No approvals yet</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="text-[#171717] text-[18px] font-medium mt-8" data-testid="text-policy-history-label">
            Policy history
          </h3>

          <div className="border border-border rounded-[24px] bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-policy-history">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">Date & Time</th>
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">Policy</th>
                    <th className="text-left px-6 py-4 text-[14px] font-medium text-[#8a8a8a]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isPolicyHistoryLoading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                        Loading policy history...
                      </td>
                    </tr>
                  ) : policyHistoryData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-[#ababab]">No policy changes yet</td>
                    </tr>
                  ) : (
                    policyHistoryData.map((entry) => {
                      const { date, time } = formatDateTime(entry.createdAt);
                      
                      return (
                        <tr 
                          key={entry.id} 
                          className="border-b border-border last:border-b-0"
                          data-testid={`row-policy-history-${entry.id}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm">{date}</span>
                              <span className="text-xs text-[#8a8a8a]">{time}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-normal">{entry.policyName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <PolicyActionBadge action={entry.action} changes={entry.changes} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
