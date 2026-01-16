import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

interface SimulationResult {
  matchedPolicy: Policy | null;
  action: string;
  reason: string;
}

export function TransactionSimulator() {
  const [formData, setFormData] = useState<SimulateTransactionRequest>({
    initiator: "",
    initiatorGroups: [],
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
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Beaker className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Transaction Simulator</h3>
          <p className="text-sm text-muted-foreground">
            Test which policy would trigger for a hypothetical transaction
          </p>
        </div>
      </div>

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
            <Label htmlFor="sim-groups">User Groups (comma-separated)</Label>
            <Input
              id="sim-groups"
              value={formData.initiatorGroups?.join(', ') || ''}
              onChange={(e) => updateField('initiatorGroups', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="admins, traders"
              className="rounded-lg"
              data-testid="input-sim-groups"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-source">Source Wallet</Label>
            <Input
              id="sim-source"
              value={formData.sourceWallet}
              onChange={(e) => updateField('sourceWallet', e.target.value)}
              placeholder="0x1234...5678"
              className="rounded-lg font-mono text-sm"
              data-testid="input-sim-source"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-destination">Destination Address</Label>
            <Input
              id="sim-destination"
              value={formData.destination}
              onChange={(e) => updateField('destination', e.target.value)}
              placeholder="0xabcd...efgh"
              className="rounded-lg font-mono text-sm"
              data-testid="input-sim-destination"
            />
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