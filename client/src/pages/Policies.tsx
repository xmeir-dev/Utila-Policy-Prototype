import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Plus, Shield, ShieldCheck, ShieldX, ShieldAlert, ShieldEllipsis,
  Trash2, Scale, GripVertical, Settings, TestTubeDiagonal, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import type { Policy, InsertPolicy } from "@shared/schema";
import { PolicyForm } from "@/components/PolicyForm";
import { TransactionSimulator } from "@/components/TransactionSimulator";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const getActionIcon = (action: string) => {
  switch (action) {
    case 'allow':
    case 'approve': // Legacy support
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
    case 'allow':
    case 'approve': // Legacy support
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
    case 'allow':
    case 'approve': // Legacy support
      return 'Allow';
    case 'deny':
      return 'Deny';
    case 'require_approval':
      return 'Require Approval';
    default:
      return action;
  }
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case 'draft':
      return (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1">
          Draft
        </Badge>
      );
    default:
      return null;
  }
};

function getConditionSummary(policy: Policy): string[] {
  const conditions: string[] = [];
  
  if (policy.initiatorType && policy.initiatorType !== 'any') {
    const count = policy.initiatorValues?.length || 0;
    conditions.push(`${policy.initiatorType === 'user' ? 'Users' : 'Groups'}: ${count}`);
  }
  
  if (policy.sourceWalletType && policy.sourceWalletType !== 'any') {
    conditions.push(`Source: ${policy.sourceWallets?.length || 0} wallets`);
  }
  
  if (policy.destinationType && policy.destinationType !== 'any') {
    conditions.push(`Dest: ${policy.destinationType}`);
  }
  
  if (policy.amountCondition && policy.amountCondition !== 'any') {
    if (policy.amountCondition === 'above') {
      conditions.push(`>${policy.amountMin} USD`);
    } else if (policy.amountCondition === 'below') {
      conditions.push(`<${policy.amountMin} USD`);
    } else if (policy.amountCondition === 'between') {
      conditions.push(`${policy.amountMin}-${policy.amountMax} USD`);
    }
  }
  
  if (policy.assetType && policy.assetType !== 'any') {
    conditions.push(`Assets: ${policy.assetValues?.join(', ') || 'specific'}`);
  }
  
  return conditions;
}

interface SortablePolicyItemProps {
  policy: Policy;
  index: number;
  totalPolicies: number;
  onToggle: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onShowPending?: (policy: Policy) => void;
  isToggling: boolean;
}

function SortablePolicyItem({ 
  policy, 
  index, 
  totalPolicies,
  onToggle, 
  onEdit,
  onApprove,
  onShowPending,
  isToggling
}: SortablePolicyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: policy.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ActionIcon = getActionIcon(policy.action);
  const conditions = getConditionSummary(policy);
  const isPendingApproval = policy.status === 'pending_approval';
  const pendingChanges = policy.pendingChanges ? JSON.parse(policy.pendingChanges) : {};
  const isPendingDeletion = isPendingApproval && pendingChanges.__delete === true;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 px-4 py-4 ${index !== totalPolicies - 1 ? 'border-b border-border' : ''} ${isDragging ? 'bg-muted/50' : ''}`}
      data-testid={`policy-item-${policy.id}`}
    >
      <button
        className="mt-1 text-[#ababab] hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${policy.id}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`font-medium text-foreground text-[14px] ${!policy.isActive ? 'opacity-50' : ''}`}>
            {policy.name}
          </span>
          <Badge 
            variant="outline" 
            className={`h-5 px-1.5 text-[14px] font-normal ${
              policy.action === 'allow' 
                ? 'text-green-600 border-green-600/30 bg-green-500/10' 
                : policy.action === 'deny' 
                  ? 'text-red-600 border-red-600/30 bg-red-500/10' 
                  : 'text-amber-600 border-amber-600/30 bg-amber-500/10'
            }`}
          >
            {policy.action === 'allow' ? 'Approved' : policy.action === 'deny' ? 'Denied' : 'Requires approval'}
          </Badge>
          {!policy.isActive && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              Disabled
            </Badge>
          )}
          {getStatusBadge(policy.status)}
        </div>
        
        <p className={`text-[13px] text-muted-foreground ${!policy.isActive ? 'opacity-50' : ''}`}>
          {policy.description}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isPendingApproval && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button 
                onClick={() => onShowPending?.(policy)}
                className={cn(
                  "group inline-flex items-center h-5 px-2 text-[14px] font-normal rounded-md transition-all duration-200 cursor-default overflow-hidden whitespace-nowrap",
                  isPendingDeletion 
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20" 
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                data-testid={`pending-label-policy-${policy.id}`}
              >
                <div className="flex items-center gap-1">
                  {isPendingDeletion ? (
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ShieldEllipsis className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{isPendingDeletion ? 'Deletion pending' : 'Changes pending'}</span>
                </div>
                <ChevronRight className="w-0 opacity-0 group-hover:w-4 group-hover:opacity-100 transition-all duration-200 shrink-0 ml-0 group-hover:ml-1" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              <p>
                {isPendingDeletion 
                  ? `This deletion was requested by ${policy.changeInitiator || 'a team member'}, and requires ${Math.max(0, (policy.changeApprovalsRequired || 1) - (policy.changeApprovers?.length || 0))} more approval${((policy.changeApprovalsRequired || 1) - (policy.changeApprovers?.length || 0)) !== 1 ? 's' : ''} to be completed.`
                  : `This change was initiated by ${policy.changeInitiator || 'a team member'}, and requires ${Math.max(0, (policy.changeApprovalsRequired || 1) - (policy.changeApprovers?.length || 0))} more approval${((policy.changeApprovalsRequired || 1) - (policy.changeApprovers?.length || 0)) !== 1 ? 's' : ''} to be approved. For now the old rules apply.`
                }
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#8a8a8a]"
                onClick={onEdit}
                disabled={isPendingApproval}
                data-testid={`button-edit-policy-${policy.id}`}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </TooltipTrigger>
          {isPendingApproval && (
            <TooltipContent>
              <p>Editing is disabled while changes are pending approval</p>
            </TooltipContent>
          )}
        </Tooltip>
        </div>
    </div>
  );
}

export default function Policies() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [viewingPendingPolicy, setViewingPendingPolicy] = useState<Policy | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: policies = [], isLoading, isError } = useQuery<Policy[]>({
    queryKey: [api.policies.list.path],
  });

  const createMutation = useMutation({
    mutationFn: async (policy: InsertPolicy) => {
      return await apiRequest('POST', api.policies.create.path, policy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      setShowAddModal(false);
      toast({ title: "Policy created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create policy", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPolicy> }) => {
      return await apiRequest('PUT', `/api/policies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      setEditingPolicy(null);
      toast({ 
        title: "Policy change submitted", 
        description: "Changes require approval before taking effect." 
      });
    },
    onError: () => {
      toast({ title: "Failed to update policy", variant: "destructive" });
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

  const requestDeletionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/policies/${id}/request-deletion`, {
        submitter: walletState.walletAddress || 'anonymous'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      setEditingPolicy(null);
      toast({ 
        title: "Deletion request submitted", 
        description: "This deletion requires approval before taking effect." 
      });
    },
    onError: () => {
      toast({ title: "Failed to submit deletion request", variant: "destructive" });
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

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      return await apiRequest('POST', api.policies.reorder.path, { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
    },
    onError: () => {
      toast({ title: "Failed to reorder policies", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/policies/${id}/approve-change`, { 
        approver: walletState.walletAddress || 'anonymous' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      toast({ title: "Policy change approved" });
    },
    onError: () => {
      toast({ title: "Failed to approve policy change", variant: "destructive" });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = policies.findIndex((p) => p.id === active.id);
      const newIndex = policies.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(policies, oldIndex, newIndex);
      reorderMutation.mutate(newOrder.map(p => p.id));
    }
  };

  const pendingPolicies = policies.filter(p => p.status === 'pending_approval');

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar walletState={walletState} />
      <main className="max-w-3xl mx-auto px-6 py-12 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h2 className="font-bold font-display text-foreground text-[24px]">Policies</h2>
              <p className="text-sm mt-1 text-[#8a8a8a]">Set transfer approval rules for Waystar Royco</p>
            </div>
            {policies.length > 0 && (
              <Button
                onClick={() => setShowAddModal(true)}
                className="gap-2 rounded-lg"
                data-testid="button-add-policy-header"
              >
                <Plus className="w-4 h-4" />
                Add Policy
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {isLoading ? (
                <Card className="p-6">
                  <div className="flex items-center justify-center">
                    <span className="text-muted-foreground">Loading policies...</span>
                  </div>
                </Card>
              ) : isError ? (
                <Card className="p-6">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <ShieldX className="w-10 h-10 text-red-500/50" />
                    <span className="text-muted-foreground text-sm">Failed to load policies</span>
                  </div>
                </Card>
              ) : policies.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Scale className="w-16 h-16 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground text-center max-w-[320px]">
                    Without an active policy, all outgoing transfers are automatically denied. 
                    Set up your first policy to start moving funds.
                  </p>
                  <Button 
                    className="mt-2 gap-2 rounded-lg" 
                    onClick={() => setShowAddModal(true)}
                    data-testid="button-add-first-policy"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Policy
                  </Button>
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium tracking-wide text-[14px] text-[#171717]">Priority order</span>
                    </div>
                    <span className="text-[14px] text-[#ababab]">
                      Drag to reorder. Higher policies take priority
                    </span>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={policies.map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {policies.map((policy, index) => (
                        <SortablePolicyItem
                          key={policy.id}
                          policy={policy}
                          index={index}
                          totalPolicies={policies.length}
                          onToggle={() => toggleMutation.mutate(policy.id)}
                          onEdit={() => setEditingPolicy(policy)}
                          onApprove={() => approveMutation.mutate(policy.id)}
                          onShowPending={setViewingPendingPolicy}
                          isToggling={toggleMutation.isPending}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </Card>
              )}
          </div>

          <div className="flex justify-center pt-4">
            {policies.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => setShowSimulator(true)}
                className="gap-2 rounded-lg"
                data-testid="button-simulate-transaction"
              >
                Simulate a Transaction
              </Button>
            )}
          </div>
        </motion.div>
      </main>
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[24px] p-0 gap-0 hide-scrollbar">
          <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle className="text-xl font-bold">Create a policy</DialogTitle>
            <DialogDescription className="text-sm text-[#8a8a8a]">Set conditions and actions for transaction approval</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <PolicyForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowAddModal(false)}
              isSubmitting={createMutation.isPending}
              submitLabel="Create Policy"
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingPolicy} onOpenChange={(open) => !open && setEditingPolicy(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[24px] p-0 gap-0 hide-scrollbar">
          <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle className="text-xl font-bold">Edit Policy</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Modify trigger conditions and actions for this policy.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            {editingPolicy && (
              <PolicyForm
                initialData={editingPolicy}
                onSubmit={(data) => updateMutation.mutate({ id: editingPolicy.id, data })}
                onCancel={() => setEditingPolicy(null)}
                onDelete={() => requestDeletionMutation.mutate(editingPolicy.id)}
                isSubmitting={updateMutation.isPending}
                isDeleting={requestDeletionMutation.isPending}
                submitLabel="Save Changes"
                isEditMode={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showSimulator} onOpenChange={setShowSimulator}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[24px] p-0 gap-0 hide-scrollbar">
          <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle className="text-xl font-bold">Simulate Transaction</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Test which policy would apply to a hypothetical transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <TransactionSimulator />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewingPendingPolicy} onOpenChange={(open) => !open && setViewingPendingPolicy(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[24px] p-0 gap-0 hide-scrollbar">
          <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle className="text-xl font-bold">Pending Changes Review</DialogTitle>
            <DialogDescription className="text-sm text-[#8a8a8a]">Review current settings vs. proposed change</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            {viewingPendingPolicy && (
              <div className="space-y-6">
                {(() => {
                  const pending = JSON.parse(viewingPendingPolicy.pendingChanges || '{}');
                  const isPendingDeletion = pending.__delete === true;
                  
                  if (isPendingDeletion) {
                    return (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
                          <Trash2 className="w-4 h-4" />
                          Deletion Pending
                        </h4>
                        <p className="text-sm text-foreground/70">
                          This policy is scheduled for deletion. Once approved, the policy will be permanently removed.
                        </p>
                        <div className="mt-4 pt-4 border-t border-red-500/20">
                          <div className="space-y-1">
                            <span className="text-[14px] font-medium text-[#8a8a8a]">Policy name</span>
                            <div className="text-sm text-[#171717] font-medium">{viewingPendingPolicy.name}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <ShieldEllipsis className="w-4 h-4 text-amber-500" />
                        Proposed Comparison
                      </h4>
                      <div className="space-y-4">
                        {(() => {
                          const fields = [
                            { key: 'name', label: 'Policy name' },
                            { key: 'description', label: 'Description' },
                            { key: 'action', label: 'Action' },
                            { key: 'conditionLogic', label: 'Logic' },
                            { key: 'initiatorType', label: 'Initiator type' },
                            { key: 'amountCondition', label: 'Amount condition' },
                            { key: 'approvers', label: 'Approvers' },
                            { key: 'changeApproversList', label: 'Policy change approvers' },
                          ];

                          return fields.map(({ key, label }) => {
                            const currentVal = (viewingPendingPolicy as any)[key];
                            const pendingVal = pending[key];
                            const isChanged = pendingVal !== undefined && JSON.stringify(currentVal) !== JSON.stringify(pendingVal);
                            
                            const displayVal = (val: any) => {
                              if (val === undefined || val === null) return 'Not set';
                              if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : 'None';
                              return String(val);
                            };

                            return (
                              <div key={key} className="grid grid-cols-2 gap-4 pb-3 border-b border-border/50 last:border-0">
                                <div className="space-y-1">
                                  <span className="text-[14px] font-medium text-[#8a8a8a]">{label}</span>
                                  <div className="text-sm text-[#171717]">{displayVal(currentVal)}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[14px] font-medium text-[#8a8a8a]">Proposed change</span>
                                  <div className={cn(
                                    "text-sm font-medium",
                                    isChanged ? "text-amber-600 dark:text-amber-400" : "text-foreground/70"
                                  )}>
                                    {isChanged ? displayVal(pendingVal) : "-"}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })()}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setViewingPendingPolicy(null)}>
                    Close Review
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}