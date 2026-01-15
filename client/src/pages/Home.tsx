import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { ArrowRight, ShieldCheck, Zap, Globe } from "lucide-react";

export default function Home() {
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
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
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

          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              data-testid="button-get-started"
              onClick={() => !walletState.isConnected && walletState.connect()}
              className="
                group relative px-8 py-4 bg-foreground text-background rounded-md font-semibold text-lg
                transition-all duration-200 hover:opacity-90
              "
            >
              <span className="flex items-center">
                {walletState.isConnected ? "Launch Dashboard" : "Get Started"}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            
            <button 
              data-testid="button-documentation"
              className="px-8 py-4 bg-transparent text-foreground border border-border rounded-md font-medium text-lg hover:bg-muted transition-all"
            >
              Documentation
            </button>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        >
          <FeatureCard 
            icon={<ShieldCheck className="w-8 h-8 text-foreground" />}
            title="Secure by Default"
            description="Enterprise-grade security protocols protecting every transaction."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8 text-foreground" />}
            title="Lightning Fast"
            description="Optimized routing ensures your operations execute in milliseconds."
          />
          <FeatureCard 
            icon={<Globe className="w-8 h-8 text-foreground" />}
            title="Global Access"
            description="Connect from anywhere in the world with zero geographical restrictions."
          />
        </motion.div>

      </main>

      <footer className="w-full border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2024 Utila Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-md border border-border bg-card hover:-translate-y-1 transition-transform duration-300">
      <div className="mb-4 bg-muted w-14 h-14 rounded-md flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground font-display">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
