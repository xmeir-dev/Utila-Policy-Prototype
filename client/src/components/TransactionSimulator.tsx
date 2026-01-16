import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Beaker, AlertCircle, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
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

const AVAILABLE_WALLETS = [
  { name: 'Main Treasury', address: '0xc333b115a72a3519b48E9B4f9D1bBD4a34C248b1' },
  { name: 'Operating Account', address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
  { name: 'Payroll Wallet', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { name: 'Escrow Account', address: '0x6B175474E89094C44Da98b954EesecdB6F8e5389' },
  { name: 'Founder Reserve', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }
];

interface SimulationResult {
  matchedPolicy: Policy | null;
  action: string;
  reason: string;
}

export function TransactionSimulator() {
  const [formData, setFormData] = useState<SimulateTransactionRequest>({
    initiator: "",
    sourceWallet: "",
    destination: "",
    destinationIsInternal: false,
    amountUsd: 0,
    asset: "ETH",
  });

  const [result, setResult] = useState<SimulationResult | null>(null);

  const simulateMutation = useMutation({
    mutationFn: async (data: SimulateTransactionRequest) => {
      const response = await apiRequest('POST', api.policies.simulate.path, data);
      return response as SimulationResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    simulateMutation.mutate(formData);
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
    <Card className="p-6 space-y-6">
      <form onSubmit={handleSimulate} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sim-initiator">Initiator</Label>
            <Select
              value={formData.initiator}
              onValueChange={(value) => updateField('initiator', value)}
            >
              <SelectTrigger id="sim-initiator" className="rounded-lg" data-testid="select-sim-initiator">
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
            <Select
              value={formData.sourceWallet}
              onValueChange={(value) => updateField('sourceWallet', value)}
            >
              <SelectTrigger id="sim-source" className="rounded-lg" data-testid="select-sim-source">
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_WALLETS.map((wallet) => (
                  <SelectItem key={wallet.address} value={wallet.address}>
                    <div className="flex flex-col">
                      <span className="font-medium">{wallet.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-destination">To</Label>
            <Select
              value={formData.destination}
              onValueChange={(value) => updateField('destination', value)}
            >
              <SelectTrigger id="sim-destination" className="rounded-lg" data-testid="select-sim-destination">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_WALLETS.map((wallet) => (
                  <SelectItem key={wallet.address} value={wallet.address}>
                    <div className="flex flex-col">
                      <span className="font-medium">{wallet.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-amount">Amount (USD)</Label>
            <Input
              id="sim-amount"
              type="number"
              value={formData.amountUsd || ''}
              onChange={(e) => updateField('amountUsd', parseFloat(e.target.value) || 0)}
              placeholder="1000"
              className="rounded-lg"
              data-testid="input-sim-amount"
            />
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
    </Card>
  );
}
