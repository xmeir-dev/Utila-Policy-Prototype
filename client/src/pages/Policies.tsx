import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, X, Shield, ShieldCheck, ShieldX, ShieldAlert, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import type { Policy } from "@shared/schema";

const getActionIcon = (action: string) => {
  switch (action) {
    case 'approve':
      return ShieldCheck;
    case 'deny':
      return ShieldX;
    case 'require_approval':
      return ShieldAlert;
    default:
      return Shield;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'approve':
      return 'text-green-500';
    case 'deny':
      return 'text-red-500';
    case 'require_approval':
      return 'text-amber-500';
    default:
      return 'text-muted-foreground';
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'approve':
      return 'Auto Approve';
    case 'deny':
      return 'Auto Deny';
    case 'require_approval':
      return 'Require Approval';
    default:
      return action;
  }
};

export default function Policies() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: "",
    description: "",
    action: "require_approval",
  });
  const { toast } = useToast();

  const { data: policies = [], isLoading, isError } = useQuery<Policy[]>({
    queryKey: [api.policies.list.path],
  });

  const createMutation = useMutation({
    mutationFn: async (policy: { name: string; description: string; action: string }) => {
      return await apiRequest('POST', api.policies.create.path, policy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      setShowAddModal(false);
      setNewPolicy({ name: "", description: "", action: "require_approval" });
      toast({ title: "Policy added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add policy", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      toast({ title: "Policy deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete policy", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('PATCH', `/api/policies/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
    },
    onError: () => {
      toast({ title: "Failed to toggle policy", variant: "destructive" });
    },
  });

  const handleAddPolicy = () => {
    if (!newPolicy.name.trim() || !newPolicy.description.trim()) return;
    createMutation.mutate(newPolicy);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar walletState={walletState} />
      <main className="max-w-2xl mx-auto px-6 py-12 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
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
            <h2 className="text-3xl font-bold font-display text-foreground">Policies</h2>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between bg-card/50 border-border rounded-[24px] h-auto min-h-[72px] py-4 px-4 hover-elevate transition-all"
              onClick={() => setShowAddModal(true)}
              data-testid="button-add-policy"
            >
              <div className="flex items-center gap-4 text-left">
                <Plus className="w-6 h-6 text-muted-foreground shrink-0" />
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium text-foreground text-[14px]">Add New Policy</span>
                  <span className="text-[13px] text-muted-foreground">Define rules for transfer approvals</span>
                </div>
              </div>
            </Button>

            {isLoading ? (
              <div className="relative flex flex-col bg-card border border-border rounded-[24px] p-6">
                <div className="flex items-center justify-center">
                  <span className="text-muted-foreground">Loading policies...</span>
                </div>
              </div>
            ) : isError ? (
              <div className="relative flex flex-col bg-card border border-border rounded-[24px] p-6">
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <ShieldX className="w-10 h-10 text-red-500/50" />
                  <span className="text-muted-foreground text-sm">Failed to load policies</span>
                </div>
              </div>
            ) : policies.length === 0 ? (
              <div className="relative flex flex-col bg-card border border-border rounded-[24px] p-6">
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <Shield className="w-10 h-10 text-muted-foreground/50" />
                  <span className="text-sm text-[171717]">It's time to add your first policy</span>
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col bg-card border border-border rounded-[24px] overflow-hidden">
                {policies.map((policy, index) => {
                  const ActionIcon = getActionIcon(policy.action);
                  return (
                    <div
                      key={policy.id}
                      className={`flex items-start gap-4 px-4 py-4 ${index !== policies.length - 1 ? 'border-b border-border' : ''}`}
                      data-testid={`policy-item-${policy.id}`}
                    >
                      <div className={`mt-0.5 ${getActionColor(policy.action)}`}>
                        <ActionIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground text-[14px]">{policy.name}</span>
                          <Badge 
                            variant="outline" 
                            className={`h-5 px-1.5 text-[11px] ${!policy.isActive ? 'opacity-50' : ''}`}
                          >
                            {getActionLabel(policy.action)}
                          </Badge>
                          {!policy.isActive && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className={`text-[13px] text-muted-foreground ${!policy.isActive ? 'opacity-50' : ''}`}>
                          {policy.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleMutation.mutate(policy.id)}
                          disabled={toggleMutation.isPending}
                          data-testid={`button-toggle-policy-${policy.id}`}
                        >
                          {policy.isActive ? (
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => deleteMutation.mutate(policy.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-policy-${policy.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </main>
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px] rounded-[16px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold">Add New Policy</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Policy Name</label>
              <Input
                placeholder="e.g., Large Bitcoin Transfer Approval"
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                className="rounded-[12px]"
                data-testid="input-policy-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="Describe what this policy does..."
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                className="rounded-[12px] min-h-[100px] resize-none"
                data-testid="input-policy-description"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Action</label>
              <Select
                value={newPolicy.action}
                onValueChange={(value) => setNewPolicy({ ...newPolicy, action: value })}
              >
                <SelectTrigger className="rounded-[12px]" data-testid="select-policy-action">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="require_approval">Require Approval</SelectItem>
                  <SelectItem value="approve">Auto Approve</SelectItem>
                  <SelectItem value="deny">Auto Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-6 pt-0">
            <Button
              size="lg"
              className="w-full text-lg font-semibold rounded-[16px] h-[48px]"
              onClick={handleAddPolicy}
              disabled={!newPolicy.name.trim() || !newPolicy.description.trim() || createMutation.isPending}
              data-testid="button-save-policy"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Policy'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
