/**
 * Policies.tsx
 * 
 * Policy management page with full CRUD functionality and drag-and-drop reordering.
 * Policies are evaluated in priority order - the first matching policy determines
 * the action for a transaction. Users can:
 * - Create new policies (immediately active)
 * - Edit existing policies (requires approval)
 * - Request policy deletion (requires approval)
 * - Reorder policies via drag-and-drop
 * - Test policies using the transaction simulator
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Plus, Shield, ShieldCheck, ShieldX, ShieldAlert, ShieldEllipsis,
  Trash2, Scale, GripVertical, Settings, TestTubeDiagonal, ChevronRight,
  AlertTriangle, CheckCircle, AlertCircle, Loader2, Lock, Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
  DraggableAttributes,
} from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Address to name mapping - must match use-wallet.ts WALLET_USERS
const ADDRESS_TO_NAME: Record<string, string> = {
  "0xc333b115a72a3519b48E9B4f9D1bBD4a34C248b1": "Meir",
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": "Ishai",
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": "Omer",
  "0x6B175474E89094C44Da98b954EesecdB6F8e5389": "Lena",
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045": "Sam",
};

// Maps wallet addresses to user names - returns "Unknown" for unrecognized addresses
const addressToName = (address: string | null | undefined): string => {
  if (!address || address === "anonymous") return "Unknown";
  return ADDRESS_TO_NAME[address] || "Unknown";
};

// Helper functions for policy action display
const getActionIcon = (action: string) => {
  switch (action) {
    case 'allow':
    case 'approve': // Legacy support for old data
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
    case 'allow':
    case 'approve':
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
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 no-default-hover-elevate">
          Draft
        </Badge>
      );
    default:
      return null;
  }
};

/**
 * Generates a human-readable summary of a policy's conditions.
 * Used to give users a quick overview without expanding the full policy.
 */
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

interface PolicyItemProps {
  policy: Policy;
  index: number;
  totalPolicies: number;
  onToggle: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onShowPending?: (policy: Policy) => void;
  isToggling: boolean;
}

/**
 * Shared policy item content used by both sortable and static variants.
 * Renders the policy row content without drag-and-drop functionality.
 */
function PolicyItemContent({ 
  policy, 
  index, 
  totalPolicies,
  onEdit,
  onShowPending,
  showDragHandle = false,
  dragHandleProps,
}: PolicyItemProps & { 
  showDragHandle?: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
}) {
  const isPendingApproval = policy.status === 'pending_approval';
  const pendingChanges = policy.pendingChanges ? JSON.parse(policy.pendingChanges) : {};
  const isPendingDeletion = isPendingApproval && pendingChanges.__delete === true;

  return (
    <>
      {showDragHandle && dragHandleProps && (
        <button
          className="mt-1 text-[#ababab] hover:text-foreground transition-colors"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          data-testid={`drag-handle-${policy.id}`}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
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
            className={`h-5 px-1.5 text-[14px] font-normal no-default-hover-elevate ${
              policy.action === 'allow' 
                ? 'text-green-600 border-green-600/30 bg-green-500/10' 
                : policy.action === 'deny' 
                  ? 'text-red-600 border-red-600/30 bg-red-500/10' 
                  : 'text-amber-600 border-amber-600/30 bg-amber-500/10'
            }`}
          >
            {policy.action === 'allow' ? 'Auto-allowed' : policy.action === 'deny' ? 'Auto-denied' : 'Requires approval'}
          </Badge>
          {!policy.isActive && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px] no-default-hover-elevate">
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
                  ? `This deletion was requested by ${addressToName(policy.changeInitiator)}, and requires ${Math.max(0, (policy.changeApprovalsRequired || 1) - (policy.changeApprovers?.length || 0))} more approval${((policy.changeApprovalsRequired || 1) - (policy.changeApprovers?.length || 0)) !== 1 ? 's' : ''} to be completed.`
                  : `This change was initiated by ${addressToName(policy.changeInitiator)}, and requires ${Math.max(0, (policy.changeApprovalsRequired || 1) - (policy.changeApprovers?.length || 0))} more approval${((policy.changeApprovalsRequired || 1) - (policy.changeApprovers?.length || 0)) !== 1 ? 's' : ''} to be approved. For now the old rules apply.`
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
    </>
  );
}

/**
 * Static policy item for default view (no drag-and-drop).
 * Used when not in advanced mode.
 */
function StaticPolicyItem(props: PolicyItemProps) {
  const { policy, index, totalPolicies } = props;
  
  return (
    <div
      className={`flex items-start gap-3 px-4 py-4 ${index !== totalPolicies - 1 ? 'border-b border-border' : ''}`}
      data-testid={`policy-item-${policy.id}`}
    >
      <PolicyItemContent {...props} showDragHandle={false} />
    </div>
  );
}

/**
 * Sortable policy item for advanced mode with drag-and-drop.
 * Integrates with dnd-kit for reordering.
 */
function SortablePolicyItem(props: PolicyItemProps) {
  const { policy, index, totalPolicies } = props;
  
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 px-4 py-4 ${index !== totalPolicies - 1 ? 'border-b border-border' : ''} ${isDragging ? 'bg-muted/50' : ''}`}
      data-testid={`policy-item-${policy.id}`}
    >
      <PolicyItemContent 
        {...props} 
        showDragHandle={true} 
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

/**
 * AI POLICY SUGGESTIONS FEATURE
 * 
 * Pre-defined prompts for common policy patterns that users can click to quickly
 * start the AI-assisted policy creation flow. These suggestions cover the most
 * frequently needed security policies:
 * 
 * 1. Large transfers - Requires human approval for high-value transactions
 * 2. Internal transfers - Auto-approves safe internal wallet movements
 * 3. Block specific assets - Prevents certain tokens from leaving to external addresses
 * 
 * When selected, the prompt is passed to PolicyForm which initiates a conversational
 * AI session to gather remaining details (thresholds, approvers, etc.).
 */
const POLICY_SUGGESTIONS = [
  { label: "Large transfers need approval", prompt: "I want a policy for large transfers that requires approval" },
  { label: "Internal transfers auto-approved", prompt: "I want to auto-approve internal transfers" },
  { label: "Block USDT transfers to external wallets", prompt: "I want to block USDT transfers to external wallets" },
];

/**
 * AI RISK CHECKER FEATURE - Finding Structure
 * 
 * Represents a single risk identified by the AI analysis of the policy set.
 * Categories cover different types of security concerns:
 * - conflicts: Policies that contradict each other
 * - permissive: Rules that allow too much without restrictions
 * - gaps: Scenarios not covered by any policy (default is deny)
 * - priority: Risky ordering where broad rules may shadow specific ones
 * - exploitable: Conditions that could be gamed (e.g., split transfers)
 */
interface RiskFinding {
  category: 'conflicts' | 'permissive' | 'gaps' | 'priority' | 'exploitable';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  affectedPolicies: string[];
  recommendation: string;
}

/**
 * AI RISK CHECKER FEATURE - Analysis Result
 * 
 * Complete result from the AI risk analysis endpoint (/api/policies/analyze-risks).
 * The analysis examines all active policies for potential security vulnerabilities,
 * conflicts, and gaps that could be exploited or cause unexpected behavior.
 * 
 * - overallRiskLevel: Aggregate assessment of policy security
 * - summary: Human-readable overview of the policy set's security posture
 * - findings: Array of specific issues found, ordered by severity
 */
interface RiskAnalysisResult {
  overallRiskLevel: 'low' | 'medium' | 'high';
  summary: string;
  findings: RiskFinding[];
}

/**
 * Sorts policies by action priority (deny > require_approval > allow) with oldest as tie-breaker.
 * This is the "Restrictive" sorting logic used when not in advanced mode.
 */
function sortPoliciesByActionPriority(policies: Policy[]): Policy[] {
  const actionPriority: Record<string, number> = {
    'deny': 0,
    'require_approval': 1,
    'allow': 2,
    'approve': 2, // Legacy support
  };
  
  return [...policies].sort((a, b) => {
    const priorityA = actionPriority[a.action] ?? 3;
    const priorityB = actionPriority[b.action] ?? 3;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Tie-breaker: oldest (lower id) wins - shown first
    return a.id - b.id;
  });
}

export default function Policies() {
  const [, setLocation] = useLocation();
  const walletState = useWallet();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [viewingPendingPolicyId, setViewingPendingPolicyId] = useState<number | null>(null);
  const [prefilledAiPrompt, setPrefilledAiPrompt] = useState<string | undefined>(undefined);
  const [riskAnalysisResult, setRiskAnalysisResult] = useState<RiskAnalysisResult | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const { toast } = useToast();
  
  const ADVANCED_MODE_PASSWORD = "utila";
  
  const handlePasswordSubmit = () => {
    if (passwordInput === ADVANCED_MODE_PASSWORD) {
      setIsAdvancedMode(true);
      setShowPasswordDialog(false);
      setPasswordInput("");
      setPasswordError(false);
      toast({ title: "Advanced mode enabled", description: "You can now manually reorder policies." });
    } else {
      setPasswordError(true);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: policies = [], isLoading, isError } = useQuery<Policy[]>({
    queryKey: [api.policies.list.path],
  });

  // Derive the viewing policy from fresh query data to avoid stale state
  const viewingPendingPolicy = viewingPendingPolicyId ? policies.find(p => p.id === viewingPendingPolicyId) || null : null;
  
  // In default mode, sort by action priority; in advanced mode, use server order (manual priority)
  const displayedPolicies = isAdvancedMode ? policies : sortPoliciesByActionPriority(policies);

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
      const response = await apiRequest('PUT', `/api/policies/${id}?submitter=${encodeURIComponent(walletState.walletAddress || 'anonymous')}`, {
        ...data,
        submitterName: walletState.connectedUser?.name || 'anonymous'
      });
      return await response.json() as Policy;
    },
    onSuccess: (data: Policy) => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      setEditingPolicy(null);
      const wasAutoApproved = data.status === 'active';
      toast({ 
        title: wasAutoApproved ? "Policy updated" : "Policy change submitted", 
        description: wasAutoApproved 
          ? "Your change was automatically approved and applied." 
          : "Changes require additional approval before taking effect."
      });
    },
    onError: (error: Error) => {
      let errorMessage = "Failed to update policy";
      try {
        const jsonStart = error.message.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(error.message.slice(jsonStart));
          errorMessage = parsed.message || errorMessage;
        }
      } catch {
        errorMessage = error.message || errorMessage;
      }
      const isAuthError = errorMessage.includes("not authorized");
      toast({ 
        title: isAuthError ? "Not Authorized" : "Failed to update policy", 
        description: errorMessage,
        variant: "destructive" 
      });
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
      const response = await apiRequest('POST', `/api/policies/${id}/request-deletion`, {
        submitter: walletState.walletAddress || 'anonymous',
        submitterName: walletState.connectedUser?.name || 'anonymous'
      });
      return await response.json() as Policy;
    },
    onSuccess: (data: Policy) => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      setEditingPolicy(null);
      const wasAutoDeleted = data.status === 'deleted';
      toast({ 
        title: wasAutoDeleted ? "Policy deleted" : "Deletion request submitted", 
        description: wasAutoDeleted 
          ? "Your deletion was automatically approved and applied." 
          : "This deletion requires additional approval before taking effect."
      });
    },
    onError: (error: Error) => {
      let errorMessage = "Failed to submit deletion request";
      try {
        const jsonStart = error.message.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(error.message.slice(jsonStart));
          errorMessage = parsed.message || errorMessage;
        }
      } catch {
        errorMessage = error.message || errorMessage;
      }
      const isAuthError = errorMessage.includes("not authorized");
      toast({ 
        title: isAuthError ? "Not Authorized" : "Failed to submit deletion request", 
        description: errorMessage,
        variant: "destructive" 
      });
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
        approver: walletState.connectedUser?.name || 'anonymous' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      setViewingPendingPolicyId(null);
      toast({ title: "Policy change approved" });
    },
    onError: (error: Error) => {
      const message = error.message || "Failed to approve policy change";
      toast({ 
        title: message.includes("not authorized") ? "Not Authorized" : "Failed to approve policy change", 
        description: message.includes("not authorized") ? message : undefined,
        variant: "destructive" 
      });
    },
  });

  const cancelChangeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/policies/${id}/cancel-change`, { 
        cancelerName: walletState.connectedUser?.name || 'anonymous' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.policies.list.path] });
      setViewingPendingPolicyId(null);
      toast({ title: "Pending change cancelled" });
    },
    onError: (error: Error) => {
      const message = error.message || "Failed to cancel change";
      toast({ 
        title: message.includes("not authorized") ? "Not Authorized" : "Failed to cancel change", 
        description: message.includes("not authorized") ? message : undefined,
        variant: "destructive" 
      });
    },
  });

  /**
   * AI RISK CHECKER MUTATION
   * 
   * Triggers AI-powered security analysis of the current policy set.
   * Sends all policies to /api/policies/analyze-risks which uses GPT-4 to:
   * - Detect conflicting rules that could cause unexpected behavior
   * - Identify overly permissive policies lacking proper restrictions
   * - Find coverage gaps where transactions might slip through
   * - Spot exploitable conditions (e.g., splitting transfers to bypass limits)
   * 
   * Results are displayed in a modal showing findings by severity with
   * recommendations for improving the security posture.
   */
  const riskAnalysisMutation = useMutation({
    mutationFn: async (policiesToAnalyze: Policy[]) => {
      const response = await apiRequest('POST', '/api/policies/analyze-risks', { policies: policiesToAnalyze });
      return await response.json() as RiskAnalysisResult;
    },
    onSuccess: (data) => {
      setRiskAnalysisResult(data);
    },
    onError: () => {
      toast({ title: "Failed to analyze risks", variant: "destructive" });
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
            </div>
          </div>

          <div className="space-y-4">
            {policies.length > 0 && (
              <div className="flex items-center justify-center gap-3">
                <Button 
                  className="gap-2 rounded-lg" 
                  onClick={() => {
                    setPrefilledAiPrompt(undefined);
                    setShowAddModal(true);
                  }}
                  data-testid="button-add-policy-header"
                >
                  <Plus className="w-4 h-4" />
                  Add Policy
                </Button>
              </div>
            )}
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
                <Card className="flex flex-col items-center justify-center gap-3 py-12 border-muted/50">
                  <Scale className="w-16 h-16 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground text-center max-w-[320px]">Without an active policy, all outgoing transfers are automatically denied.</p>
                  <Button 
                    className="mt-2 gap-2 rounded-lg" 
                    onClick={() => {
                      setPrefilledAiPrompt(undefined);
                      setShowAddModal(true);
                    }}
                    data-testid="button-add-first-policy"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Policy
                  </Button>
                  <div className="mt-4 space-y-2">
                    <p className="text-center text-[#ababab] text-[14px]">Or try a suggestion</p>
                    <div className="flex flex-col items-center gap-2">
                      {POLICY_SUGGESTIONS.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setPrefilledAiPrompt(suggestion.prompt);
                            setShowAddModal(true);
                          }}
                          className="px-3 py-1.5 rounded-full border border-border hover-elevate active-elevate-2 transition-colors text-center text-[14px]"
                          data-testid={`suggestion-${index}`}
                        >
                          <span className="text-sm text-foreground">{suggestion.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium tracking-wide text-[14px] text-[#171717] dark:text-foreground">All policies</span>
                      {isAdvancedMode && (
                        <Badge variant="secondary" className="text-xs no-default-hover-elevate">
                          Advanced Mode
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center rounded-md border border-border bg-muted/50 p-0.5">
                            <button
                              onClick={() => setIsAdvancedMode(false)}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors",
                                !isAdvancedMode 
                                  ? "bg-background text-foreground shadow-sm" 
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              data-testid="button-restrictive-mode"
                            >
                              Restrictive
                              {!isAdvancedMode && <Info className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => {
                                if (!isAdvancedMode) {
                                  setShowPasswordDialog(true);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors",
                                isAdvancedMode 
                                  ? "bg-background text-foreground shadow-sm" 
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              data-testid="button-advanced-mode"
                            >
                              {!isAdvancedMode && <Lock className="w-3 h-3" />}
                              Advanced
                            </button>
                          </div>
                        </TooltipTrigger>
                        {!isAdvancedMode && (
                          <TooltipContent className="max-w-[320px]">
                            <p>Restrictive sorting assumes auto-deny policies take precedence over requires-approval policies, which take precedence over auto-approve policies. Tiebreakers are decided by policy age, older policies take priority. Switch to Advanced to sort policies manually.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  </div>
                  {isAdvancedMode ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={displayedPolicies.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {displayedPolicies.map((policy, index) => (
                          <SortablePolicyItem
                            key={policy.id}
                            policy={policy}
                            index={index}
                            totalPolicies={displayedPolicies.length}
                            onToggle={() => toggleMutation.mutate(policy.id)}
                            onEdit={() => setEditingPolicy(policy)}
                            onApprove={() => approveMutation.mutate(policy.id)}
                            onShowPending={(policy) => setViewingPendingPolicyId(policy.id)}
                            isToggling={toggleMutation.isPending}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div>
                      {displayedPolicies.map((policy, index) => (
                        <StaticPolicyItem
                          key={policy.id}
                          policy={policy}
                          index={index}
                          totalPolicies={displayedPolicies.length}
                          onToggle={() => toggleMutation.mutate(policy.id)}
                          onEdit={() => setEditingPolicy(policy)}
                          onApprove={() => approveMutation.mutate(policy.id)}
                          onShowPending={(policy) => setViewingPendingPolicyId(policy.id)}
                          isToggling={toggleMutation.isPending}
                        />
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {policies.length > 0 && (
                <div className="flex justify-center gap-3 mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => riskAnalysisMutation.mutate(policies)}
                    disabled={riskAnalysisMutation.isPending}
                    className="gap-2"
                    data-testid="button-check-risks"
                  >
                    {riskAnalysisMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Check for Risks
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowSimulator(true)}
                    className="gap-2"
                    data-testid="button-simulate-transaction-footer"
                  >
                    <TestTubeDiagonal className="w-4 h-4" />
                    Simulate a Transaction
                  </Button>
                </div>
              )}

              {riskAnalysisResult && (() => {
                const highRiskFindings = riskAnalysisResult.findings.filter(f => f.severity === 'high');
                return (
                  <Card className="mt-4 p-4 border-2" data-testid="risk-analysis-results">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {highRiskFindings.length > 0 ? (
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        <span className="text-foreground font-medium text-[14px]">
                          {highRiskFindings.length > 0 
                            ? `You have ${highRiskFindings.length} potential issue${highRiskFindings.length !== 1 ? 's' : ''}`
                            : 'No issues found'
                          }
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#8a8a8a]"
                        onClick={() => setRiskAnalysisResult(null)}
                        data-testid="button-dismiss-risks"
                      >
                        Dismiss
                      </Button>
                    </div>
                    {highRiskFindings.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No high priority issues identified
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {highRiskFindings.map((finding, index) => (
                          <div 
                            key={index} 
                            className="p-3 rounded-lg border bg-red-500/10 border-red-500/30"
                            data-testid={`risk-finding-${index}`}
                          >
                            <span className="font-medium text-sm text-foreground">{finding.title}</span>
                            <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[12px] font-normal text-[#ababab] mt-4 px-1">
                      This feature is AI-powered and experimental. Review each suggestion carefully before making changes.
                    </p>
                  </Card>
                );
              })()}
          </div>
        </motion.div>
      </main>
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) setPrefilledAiPrompt(undefined);
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[24px] p-0 gap-0 hide-scrollbar">
          <DialogHeader className="p-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle className="text-xl font-bold">Create a policy</DialogTitle>
            <DialogDescription className="text-sm text-[#8a8a8a]">Set conditions and actions for transaction approval</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <PolicyForm
              key={prefilledAiPrompt || 'new'}
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowAddModal(false)}
              isSubmitting={createMutation.isPending}
              submitLabel="Create Policy"
              initialAiPrompt={prefilledAiPrompt}
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
      <Dialog open={!!viewingPendingPolicy} onOpenChange={(open) => !open && setViewingPendingPolicyId(null)}>
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
                    const currentApprovals = viewingPendingPolicy.changeApprovers?.length || 0;
                    const requiredApprovals = viewingPendingPolicy.changeApprovalsRequired || 1;
                    const initiatorName = viewingPendingPolicy.changeInitiator || 'Unknown';
                    const isUserInitiator = viewingPendingPolicy.changeInitiator === walletState.walletAddress;
                    const canApprove = viewingPendingPolicy.changeApproversList?.includes(walletState.connectedUser?.name || '') && !isUserInitiator;
                    const hasUserApproved = viewingPendingPolicy.changeApprovers?.includes(walletState.connectedUser?.name || '');
                    const canCancel = viewingPendingPolicy.changeApproversList?.includes(walletState.connectedUser?.name || '');
                    
                    const approversList = viewingPendingPolicy.changeApproversList || [];
                    const approversWhoHaveApproved = viewingPendingPolicy.changeApprovers || [];
                    const eligibleApprovers = approversList.filter((name: string) => !approversWhoHaveApproved.includes(name));
                    const remainingApprovalsNeeded = requiredApprovals - currentApprovals;
                    const isQuorumImpossible = remainingApprovalsNeeded > 0 && eligibleApprovers.length < remainingApprovalsNeeded;
                    
                    return (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
                          <Trash2 className="w-4 h-4" />
                          Deletion Pending
                        </h4>
                        <p className="text-sm text-foreground/70">
                          This policy is scheduled for deletion. Once approved, the policy will be permanently removed.
                        </p>
                        <div className="mt-4 pt-4 border-t border-red-500/20 space-y-4">
                          <div className="space-y-1">
                            <span className="text-[14px] font-medium text-[#8a8a8a]">Policy name</span>
                            <div className="text-sm text-[#171717] dark:text-foreground font-medium">{viewingPendingPolicy.name}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[14px] font-medium text-[#8a8a8a]">Requested by</span>
                            <div className="text-sm text-[#171717] dark:text-foreground font-medium">{addressToName(initiatorName)}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[14px] font-medium text-[#8a8a8a]">Approval status</span>
                            <div className="text-sm text-[#171717] dark:text-foreground font-medium">
                              {currentApprovals} of {requiredApprovals} approvals received
                            </div>
                            {viewingPendingPolicy.changeApprovers && viewingPendingPolicy.changeApprovers.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Approved by: {viewingPendingPolicy.changeApprovers.join(', ')}
                              </div>
                            )}
                          </div>
                          {isQuorumImpossible && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                              <p className="text-sm text-destructive font-medium">
                                This change cannot be approved: {remainingApprovalsNeeded} more approval(s) needed, but only {eligibleApprovers.length} eligible approver(s) remaining.
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {canApprove && !hasUserApproved && !isQuorumImpossible && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  approveMutation.mutate(viewingPendingPolicy.id);
                                }}
                                disabled={approveMutation.isPending}
                                data-testid="button-approve-deletion"
                              >
                                {approveMutation.isPending ? 'Approving...' : 'Approve Deletion'}
                              </Button>
                            )}
                            {canCancel && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  cancelChangeMutation.mutate(viewingPendingPolicy.id);
                                }}
                                disabled={cancelChangeMutation.isPending}
                                data-testid="button-cancel-deletion"
                              >
                                {cancelChangeMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
                              </Button>
                            )}
                          </div>
                          {isUserInitiator && (
                            <Badge variant="secondary" className="text-xs">You initiated this change</Badge>
                          )}
                          {hasUserApproved && !isUserInitiator && (
                            <Badge variant="outline" className="text-xs">You have approved this change</Badge>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  const currentApprovals = viewingPendingPolicy.changeApprovers?.length || 0;
                  const requiredApprovals = viewingPendingPolicy.changeApprovalsRequired || 1;
                  const initiatorName = viewingPendingPolicy.changeInitiator || 'Unknown';
                  const isUserInitiator = viewingPendingPolicy.changeInitiator === walletState.walletAddress;
                  const canApprove = viewingPendingPolicy.changeApproversList?.includes(walletState.connectedUser?.name || '') && !isUserInitiator;
                  const hasUserApproved = viewingPendingPolicy.changeApprovers?.includes(walletState.connectedUser?.name || '');
                  const canCancel = viewingPendingPolicy.changeApproversList?.includes(walletState.connectedUser?.name || '');
                  
                  const approversList = viewingPendingPolicy.changeApproversList || [];
                  const approversWhoHaveApproved = viewingPendingPolicy.changeApprovers || [];
                  const eligibleApprovers = approversList.filter((name: string) => !approversWhoHaveApproved.includes(name));
                  const remainingApprovalsNeeded = requiredApprovals - currentApprovals;
                  const isQuorumImpossible = remainingApprovalsNeeded > 0 && eligibleApprovers.length < remainingApprovalsNeeded;
                  
                  return (
                    <>
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
                                    <div className="text-sm text-[#171717] dark:text-foreground">{displayVal(currentVal)}</div>
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
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          Approval Status
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <span className="text-[14px] font-medium text-[#8a8a8a]">Requested by</span>
                            <div className="text-sm text-[#171717] dark:text-foreground font-medium">{addressToName(initiatorName)}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[14px] font-medium text-[#8a8a8a]">Progress</span>
                            <div className="text-sm text-[#171717] dark:text-foreground font-medium">
                              {currentApprovals} of {requiredApprovals} approvals received
                            </div>
                            {viewingPendingPolicy.changeApprovers && viewingPendingPolicy.changeApprovers.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Approved by: {viewingPendingPolicy.changeApprovers.join(', ')}
                              </div>
                            )}
                          </div>
                          {isQuorumImpossible && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                              <p className="text-sm text-destructive font-medium">
                                This change cannot be approved: {remainingApprovalsNeeded} more approval(s) needed, but only {eligibleApprovers.length} eligible approver(s) remaining.
                              </p>
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {canApprove && !hasUserApproved && !isQuorumImpossible && (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  approveMutation.mutate(viewingPendingPolicy.id);
                                }}
                                disabled={approveMutation.isPending}
                                data-testid="button-approve-change"
                              >
                                {approveMutation.isPending ? 'Approving...' : 'Approve Change'}
                              </Button>
                            )}
                            {canCancel && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  cancelChangeMutation.mutate(viewingPendingPolicy.id);
                                }}
                                disabled={cancelChangeMutation.isPending}
                                data-testid="button-cancel-change"
                              >
                                {cancelChangeMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
                              </Button>
                            )}
                          </div>
                          {isUserInitiator && (
                            <Badge variant="secondary" className="text-xs">You initiated this change</Badge>
                          )}
                          {hasUserApproved && !isUserInitiator && (
                            <Badge variant="outline" className="text-xs">You have approved this change</Badge>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setViewingPendingPolicyId(null)}>
                    Close Review
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) {
          setPasswordInput("");
          setPasswordError(false);
        }
      }}>
        <DialogContent className="sm:max-w-[400px] rounded-[24px] p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Advanced Mode
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter password to access manual policy reordering.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
                className={passwordError ? "border-red-500" : ""}
                data-testid="input-advanced-password"
              />
              {passwordError && (
                <p className="text-sm text-red-500">Incorrect password</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordInput("");
                  setPasswordError(false);
                }}
                data-testid="button-cancel-password"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                data-testid="button-submit-password"
              >
                Unlock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}