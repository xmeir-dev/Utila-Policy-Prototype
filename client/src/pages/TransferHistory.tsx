import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Users, ExternalLink } from "lucide-react";
import etherscanLogo from "@assets/etherscan-logo-circle_1768521442428.png"
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Transaction } from "@shared/schema";

const truncateAddress = (address: string): string => {
  if (!address) return "-";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

export default function TransferHistory() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", walletState.connectedUser?.id],
    queryFn: async () => {
      if (!walletState.connectedUser?.id) return [];
      const res = await fetch(`/api/transactions?userId=${walletState.connectedUser.id}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    enabled: !!walletState.connectedUser?.id,
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
            <h2 className="font-bold font-display text-foreground text-[24px]">Transfer History</h2>
          </div>

          <div className="border border-border rounded-[24px] bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-transactions">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Initiator</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">From</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">To</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Approvals</th>
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
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const { date, time } = formatDateTime(tx.createdAt);
                      const approvalsCount = tx.approvals?.length || 0;
                      const quorumRequired = tx.quorumRequired || 1;
                      
                      return (
                        <tr 
                          key={tx.id} 
                          className="border-b border-border last:border-b-0 hover-elevate"
                          data-testid={`row-transaction-${tx.id}`}
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-normal">{tx.initiatorName || "-"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-sm">{formatAmount(tx.amount)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 group">
                              <span className="text-sm font-normal text-[#171717]">
                                {tx.fromWallet || "-"}
                              </span>
                              {tx.fromWallet && (
                                <a 
                                  href={`https://etherscan.io/address/${walletState.walletAddress}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <img src={etherscanLogo} alt="Etherscan" className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 group">
                              <span className="text-sm font-normal text-[#171717]">
                                {tx.toLabel || truncateAddress(tx.toAddress || "")}
                              </span>
                              {tx.toAddress && (
                                <a 
                                  href={`https://etherscan.io/address/${tx.toAddress}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <img src={etherscanLogo} alt="Etherscan" className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
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
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{approvalsCount}/{quorumRequired}</span>
                              </div>
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
        </motion.div>
      </main>
    </div>
  );
}
