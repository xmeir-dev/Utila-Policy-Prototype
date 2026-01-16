import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { Send, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { SiEthereum, SiTether } from "react-icons/si";
import { RiCoinFill } from "react-icons/ri";

export default function Home() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();

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
              <h2 className="font-display mb-8 text-center font-medium text-[28px]">
                Hi <span className="font-bold">{walletState.connectedUser?.name}</span>, welcome to your Waystar Royco workspace
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-12 w-full">
                <div 
                  className="flex flex-col items-center justify-center gap-3 p-8 border border-border rounded-[24px] bg-card cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setLocation("/transfer")}
                  data-testid="button-transfer"
                >
                  <Send className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Transfer Funds</span>
                </div>
                <div 
                  className="flex flex-col items-center justify-center gap-3 p-8 border border-border rounded-[24px] bg-card cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setLocation("/policies")}
                  data-testid="button-policies"
                >
                  <Gavel className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Organization Policies</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 w-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[16px]">Top holdings</h3>
                    <Button variant="link" className="text-xs text-muted-foreground p-0 h-auto">See all</Button>
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
                  <h3 className="text-[16px] font-medium">Pending transfers</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-[14px] bg-card/50 pl-[0px] pr-[0px] pt-[0px] pb-[0px]">
                      <p className="text-xs text-muted-foreground mb-3">from wallet to address book entry</p>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        </div>
                        <span className="text-sm font-semibold">3,400 USD</span>
                        <span className="text-[10px] text-muted-foreground">(= $3,396.6)</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2">
                        <div className="flex items-center gap-1">
                          <span>Initiator:</span>
                          <div className="flex items-center gap-1 text-foreground font-medium">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            Lucas Beach
                          </div>
                        </div>
                        <span>Created at: 02:10 AM, March 8, 2024</span>
                      </div>
                    </div>
                  </div>
                </div>
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
