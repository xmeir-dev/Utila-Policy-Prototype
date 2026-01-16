import { motion } from "framer-motion";
import { ArrowLeft, User, Building2, Wallet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";

interface Contact {
  id: string;
  label: string;
  address: string;
  isInternal: boolean;
}

const contacts: Contact[] = [
  { id: "ab1", label: "Bank of America", address: "0xa1cE2f3B4C5d6E7F8A9b0C1D2e3F4a5B6c7D8E9f", isInternal: false },
  { id: "ab2", label: "Finances", address: "0xb0bF1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F", isInternal: true },
  { id: "ab3", label: "Treasury", address: "0xcAfE9a8B7c6D5e4F3a2B1c0D9e8F7a6B5c4D3E2F", isInternal: true },
  { id: "ab4", label: "Vitalik Buterin", address: "0xDef01a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F", isInternal: false },
  { id: "ab5", label: "Meir", address: "0xE1f2A3b4C5d6E7f8A9B0c1D2E3f4A5b6C7d8E9f0", isInternal: true },
  { id: "ab6", label: "Ishai", address: "0xF0e1D2c3B4a5F6e7D8c9B0a1E2f3D4c5B6a7E8f9", isInternal: true },
];

const trustedWallets = [
  { id: "w1", name: "Finances", address: "0xb0bF1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F", balance: "502 ETH" },
  { id: "w2", name: "Treasury", address: "0xcAfE9a8B7c6D5e4F3a2B1c0D9e8F7a6B5c4D3E2F", balance: "421 ETH" },
  { id: "w3", name: "Meir", address: "0xE1f2A3b4C5d6E7f8A9B0c1D2E3f4A5b6C7d8E9f0", balance: "198 ETH" },
  { id: "w4", name: "Ishai", address: "0xF0e1D2c3B4a5F6e7D8c9B0a1E2f3D4c5B6a7E8f9", balance: "134 ETH" },
];

const truncateAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function Wallets() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar walletState={walletState} />
      <main className="max-w-2xl mx-auto px-6 py-12 pt-32">
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
            <h2 className="font-bold font-display text-foreground text-[24px]">Wallets</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Trusted Wallets
              </h3>
              <div className="space-y-3">
                {trustedWallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="flex items-center justify-between p-4 border border-border rounded-[16px] bg-card hover-elevate"
                    data-testid={`wallet-${wallet.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{wallet.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          {truncateAddress(wallet.address)}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{wallet.balance}</div>
                      <Badge variant="outline" className="text-xs">Internal</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Contacts
              </h3>
              <div className="space-y-3">
                {contacts.filter(contact => !contact.isInternal).map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 border border-border rounded-[16px] bg-card hover-elevate"
                    data-testid={`contact-${contact.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10">
                        <Building2 className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-medium">{contact.label}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          {truncateAddress(contact.address)}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      External
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
