import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { Clock, ExternalLink, Send, Gavel, LibraryBig } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type Transaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const { data: pendingTransactions } = useQuery<Transaction[]>({
    queryKey: [api.transactions.listPending.path],
    enabled: walletState.isConnected,
  });

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
      <Navbar walletState={walletState} />

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
              >
                Welcome to Utila
              </motion.h1>

              <motion.p 
                variants={itemVariants}
                className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
              >
                The future of utility is here.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl mx-auto"
            >
              <div className="grid grid-cols-3 gap-4 mb-12">
                <div 
                  className="flex flex-col items-center justify-center gap-3 p-8 border border-border rounded-[24px] bg-card cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setLocation("/transfer")}
                  data-testid="button-transfer"
                >
                  <Send className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Transfer</span>
                </div>
                <div 
                  className="flex flex-col items-center justify-center gap-3 p-8 border border-border rounded-[24px] bg-card cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setLocation("/policies")}
                  data-testid="button-policies"
                >
                  <Gavel className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Policies</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-3 p-8 border border-border rounded-[24px] bg-card cursor-pointer hover-elevate active-elevate-2">
                  <LibraryBig className="w-8 h-8 text-primary" />
                  <span className="font-semibold">History</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold font-display">Pending Transactions</h2>
              </div>

              <div className="space-y-4">
                {pendingTransactions?.map((tx: any) => (
                  <div key={tx.id} className="p-6 border border-border rounded-md bg-card flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <p className="font-semibold text-foreground whitespace-nowrap">{tx.type}</p>
                      <p className="text-sm text-muted-foreground truncate">{tx.amount}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">{tx.txHash}</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                    </div>
                  </div>
                ))}
                {!pendingTransactions?.length && (
                  <p className="text-center text-muted-foreground py-12">No pending transactions found.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full py-8 text-center text-sm text-muted-foreground">
        <p className="text-[#bdbdbd]">By Meir Rosenschein, January 15th 2026</p>
      </footer>
    </div>
  );
}
