import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { ArrowRight, ShieldCheck, Zap, Globe } from "lucide-react";

export default function Home() {
  const walletState = useWallet();

  // Animation variants
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
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30">
      
      {/* Decorative background blurs */}
      <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <Navbar walletState={walletState} />

      <main className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[90vh]">
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto z-10"
        >
          <motion.div variants={itemVariants} className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-accent uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Live on Mainnet
          </motion.div>

          <motion.h1 
            variants={itemVariants} 
            className="text-6xl md:text-8xl font-bold tracking-tight mb-8 font-display"
          >
            Welcome to <span className="text-gradient">Utila</span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            The future of utility is here. Seamlessly connect your digital assets to real-world applications with zero friction.
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => !walletState.isConnected && walletState.connect()}
              className="
                group relative px-8 py-4 bg-white text-black rounded-xl font-semibold text-lg
                overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]
              "
            >
              <span className="relative z-10 flex items-center">
                {walletState.isConnected ? "Launch Dashboard" : "Get Started Now"}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <button className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-xl font-medium text-lg hover:bg-white/10 transition-all">
              Read Documentation
            </button>
          </motion.div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        >
          <FeatureCard 
            icon={<ShieldCheck className="w-8 h-8 text-primary" />}
            title="Secure by Default"
            description="Enterprise-grade security protocols protecting every transaction."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8 text-accent" />}
            title="Lightning Fast"
            description="Optimized routing ensures your operations execute in milliseconds."
          />
          <FeatureCard 
            icon={<Globe className="w-8 h-8 text-purple-400" />}
            title="Global Access"
            description="Connect from anywhere in the world with zero geographical restrictions."
          />
        </motion.div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 text-center text-sm text-muted-foreground">
        <p>© 2024 Utila Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="glass-card p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
      <div className="mb-4 bg-white/5 w-14 h-14 rounded-xl flex items-center justify-center border border-white/5">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground font-display">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
