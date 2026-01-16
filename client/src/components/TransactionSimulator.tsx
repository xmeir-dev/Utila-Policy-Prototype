import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Beaker, AlertCircle, CheckCircle, XCircle, ShieldAlert, X, Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { Policy, SimulateTransactionRequest } from "@shared/schema";

const SAMPLE_ASSETS = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL'];

const AVAILABLE_USERS = [
  'Meir',
  'Ishai',
  'Omer',
  'Lena',
  'Vitalik'
];

const TRUSTED_WALLETS = [
  { name: 'Finances', address: '0xb0bF1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F', isInternal: true },
  { name: 'Treasury', address: '0xcAfE9a8B7c6D5e4F3a2B1c0D9e8F7a6B5c4D3E2F', isInternal: true },
  { name: 'Meir', address: '0xE1f2A3b4C5d6E7f8A9B0c1D2E3f4A5b6C7d8E9f0', isInternal: true },
  { name: 'Ishai', address: '0xF0e1D2c3B4a5F6e7D8c9B0a1E2f3D4c5B6a7E8f9', isInternal: true },
];

const CONTACTS = [
  { name: 'Bank of America', address: '0xa1cE2f3B4C5d6E7F8A9b0C1D2e3F4a5B6c7D8E9f', isInternal: false },
  { name: 'Finances', address: '0xb0bF1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F', isInternal: true },
  { name: 'Treasury', address: '0xcAfE9a8B7c6D5e4F3a2B1c0D9e8F7a6B5c4D3E2F', isInternal: true },
  { name: 'Vitalik Buterin', address: '0xDef01a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F', isInternal: false },
  { name: 'Meir', address: '0xE1f2A3b4C5d6E7f8A9B0c1D2E3f4A5b6C7d8E9f0', isInternal: true },
  { name: 'Ishai', address: '0xF0e1D2c3B4a5F6e7D8c9B0a1E2f3D4c5B6a7E8f9', isInternal: true },
];

function MultiWalletSelector({ 
  selected, 
  onChange, 
  testId,
  wallets
}: { 
  selected: string[]; 
  onChange: (values: string[]) => void; 
  testId: string;
  wallets: { name: string; address: string; isInternal: boolean }[];
}) {
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);

  const addAddress = () => {
    const trimmed = newWalletAddress.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setNewWalletAddress("");
      setShowAddAddress(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border border-input rounded-[14px] bg-background min-h-[42px]">
        {selected.map((address) => {
          const wallet = wallets.find(w => w.address === address);
          return (
            <Badge key={address} variant="secondary" className="h-7 gap-1 pl-2 pr-1">
              <span className="text-xs font-medium">{wallet ? wallet.name : `${address.slice(0, 6)}...${address.slice(-4)}`}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter(a => a !== address))}
                className="hover:bg-background/50 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          );
        })}
        <Select
          value=""
          onValueChange={(address) => {
            if (address === "custom") {
              setShowAddAddress(true);
              return;
            }
            if (address && !selected.includes(address)) {
              onChange([...selected, address]);
            }
          }}
        >
          <SelectTrigger className="border-0 shadow-none focus:ring-0 w-auto h-7 p-0 px-2 text-xs text-muted-foreground hover:bg-muted rounded-[14px] transition-colors [&>svg]:hidden">
            <div className="flex items-center gap-1">
              <Plus className="w-3 h-3" />
              <span>Add Wallet</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {wallets.filter(w => !selected.includes(w.address)).map((wallet) => (
              <SelectItem key={wallet.address} value={wallet.address}>
                <div className="flex flex-col">
                  <span className="font-medium">{wallet.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="custom" className="text-primary font-medium border-t mt-1 pt-2">
              <div className="flex items-center gap-2">
                <Plus className="w-3 h-3" />
                <span>Enter custom address...</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showAddAddress && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <Input
            value={newWalletAddress}
            onChange={(e) => setNewWalletAddress(e.target.value)}
            placeholder="0x..."
            className="h-8 text-xs rounded-lg"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAddress();
              }
              if (e.key === 'Escape') {
                setShowAddAddress(false);
              }
            }}
          />
          <Button type="button" size="sm" className="h-8 text-xs px-3 rounded-lg" onClick={addAddress}>
            Add
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs px-2 rounded-lg" onClick={() => setShowAddAddress(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

interface SimulationResult {
  matchedPolicy: Policy | null;
  action: string;
  reason: string;
}

// Update the type to support multiple wallets for simulation if needed, 
// but the backend SimulateTransactionRequest currently expects single strings.
// We will join them or just take the first one for now to avoid breaking the backend contract 
// while updating the UI as requested.
export function TransactionSimulator() {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [formData, setFormData] = useState<SimulateTransactionRequest>({
    initiator: "",
    sourceWallet: "",
    destination: "",
    destinationIsInternal: false,
    amountUsd: 0,
    asset: "ETH",
  });

  const formatAmountWithCommas = (value: string) => {
    const num = value.replace(/,/g, '');
    if (!num || isNaN(Number(num))) return value;
    return Number(num).toLocaleString('en-US');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setAmountDisplay(formatAmountWithCommas(raw));
      setFormData(prev => ({ ...prev, amountUsd: parseFloat(raw) || 0 }));
    }
  };

  const [result, setResult] = useState<SimulationResult | null>(null);

  const simulateMutation = useMutation({
    mutationFn: async (data: SimulateTransactionRequest) => {
      const response = await apiRequest('POST', api.policies.simulate.path, data);
      return await response.json() as SimulationResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    // For simulation, we'll use the first selected wallet if multiple are chosen, 
    // or keep the backend call as is. Since policies usually check against a single transaction context.
    const dataToSimulate = {
      ...formData,
      sourceWallet: selectedSources[0] || "",
      destination: selectedDestinations[0] || "",
    };
    simulateMutation.mutate(dataToSimulate);
  };

  const updateField = <K extends keyof SimulateTransactionRequest>(
    field: K, 
    value: SimulateTransactionRequest[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'allow':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'deny':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'require_approval':
        return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'allow':
        return 'Allowed';
      case 'deny':
        return 'Denied';
      case 'require_approval':
        return 'Requires Approval';
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'allow':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'deny':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'require_approval':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSimulate} className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="sim-initiator">Initiator</Label>
            <Select
              value={formData.initiator}
              onValueChange={(value) => updateField('initiator', value)}
            >
              <SelectTrigger id="sim-initiator" className="rounded-lg w-full" data-testid="select-sim-initiator">
                <SelectValue placeholder="Select initiator" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_USERS.map((user) => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-source">From</Label>
            <MultiWalletSelector
              selected={selectedSources}
              onChange={setSelectedSources}
              testId="select-sim-source"
              wallets={TRUSTED_WALLETS}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-destination">To</Label>
            <MultiWalletSelector
              selected={selectedDestinations}
              onChange={setSelectedDestinations}
              testId="select-sim-destination"
              wallets={CONTACTS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sim-amount">Amount in USD</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="sim-amount"
                  type="text"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  placeholder="1,000"
                  className="rounded-lg pl-7"
                  data-testid="input-sim-amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sim-asset">Asset</Label>
              <Select
                value={formData.asset}
                onValueChange={(value) => updateField('asset', value)}
              >
                <SelectTrigger className="rounded-lg" data-testid="select-sim-asset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_ASSETS.map((asset) => (
                    <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={simulateMutation.isPending}
          className="w-full rounded-lg"
          data-testid="button-simulate"
        >
          {simulateMutation.isPending ? 'Simulating...' : 'Simulate Transaction'}
        </Button>
      </form>
      {result && (
        <div className={`p-4 rounded-lg border ${getActionColor(result.action)}`} data-testid="simulation-result">
          <div className="flex items-start gap-3">
            {getActionIcon(result.action)}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{getActionLabel(result.action)}</span>
                {result.matchedPolicy && (
                  <Badge variant="outline" className="text-xs">
                    Policy: {result.matchedPolicy.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm opacity-90">{result.reason}</p>
              {result.matchedPolicy && result.action === 'require_approval' && (
                <div className="text-sm opacity-75">
                  Quorum: {result.matchedPolicy.quorumRequired} of {(result.matchedPolicy.approvers || []).length} approvers
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
