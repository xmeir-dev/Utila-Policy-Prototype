import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, Users, Wallet, Target, DollarSign, Coins, ChevronDown, ChevronUp, GitBranch, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Policy, InsertPolicy } from "@shared/schema";

const COMMON_ASSETS = ['ETH', 'USDT', 'USDC'];

interface PolicyFormProps {
  initialData?: Partial<InsertPolicy>;
  onSubmit: (data: InsertPolicy) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  submitLabel?: string;
  isEditMode?: boolean;
}

interface ConditionSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isConfigured?: boolean;
}

function ConditionSection({ title, icon, isExpanded, onToggle, children, isConfigured }: ConditionSectionProps) {
  return (
    <div className="border border-border rounded-[14px] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover-elevate transition-colors"
        data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          {isConfigured && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Configured</Badge>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-border bg-muted/30">
          {children}
        </div>
      )}
    </div>
  );
}

function TagInput({ 
  values, 
  onChange, 
  placeholder,
  testId
}: { 
  values: string[]; 
  onChange: (values: string[]) => void; 
  placeholder: string;
  testId: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(values.filter(v => v !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg"
          data-testid={testId}
        />
        <Button type="button" variant="outline" size="icon" onClick={addTag} data-testid={`${testId}-add`} className="rounded-[14px]">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="h-6 gap-1 pl-2 pr-1">
              <span className="text-xs font-mono">{value}</span>
              <button
                type="button"
                onClick={() => removeTag(value)}
                className="hover:bg-background/50 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

const AVAILABLE_USERS = [
  'Meir',
  'Ishai',
  'Omer',
  'Lena',
  'Vitalik'
];

function MultiUserSelector({ 
  selected, 
  onChange, 
  placeholder,
  testId
}: { 
  selected: string[]; 
  onChange: (values: string[]) => void; 
  placeholder: string;
  testId: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border border-input rounded-[14px] bg-background min-h-[42px]">
        {selected.map((user) => (
          <Badge key={user} variant="secondary" className="h-7 gap-1 pl-2 pr-1">
            <span className="text-xs font-medium">{user}</span>
            <button
              type="button"
              onClick={() => onChange(selected.filter(u => u !== user))}
              className="hover:bg-background/50 rounded p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Select
          value=""
          onValueChange={(user) => {
            if (user && !selected.includes(user)) {
              onChange([...selected, user]);
            }
          }}
        >
          <SelectTrigger className="border-0 shadow-none focus:ring-0 w-auto h-7 p-0 px-2 text-xs text-muted-foreground hover:bg-muted rounded-[14px] transition-colors [&>svg]:hidden">
            <div className="flex items-center gap-1">
              <Plus className="w-3 h-3" />
              <span>Add User</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_USERS.filter(u => !selected.includes(u)).map((user) => (
              <SelectItem key={user} value={user}>
                {user}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

const TRUSTED_WALLETS = [
  { name: 'Finances', address: '0xb0bF1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F' },
  { name: 'Treasury', address: '0xcAfE9a8B7c6D5e4F3a2B1c0D9e8F7a6B5c4D3E2F' },
  { name: 'Meir', address: '0xE1f2A3b4C5d6E7f8A9B0c1D2E3f4A5b6C7d8E9f0' },
  { name: 'Ishai', address: '0xF0e1D2c3B4a5F6e7D8c9B0a1E2f3D4c5B6a7E8f9' },
];

const CONTACTS = [
  { name: 'Bank of America', address: '0xa1cE2f3B4C5d6E7F8A9b0C1D2e3F4a5B6c7D8E9f' },
  { name: 'Finances', address: '0xb0bF1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F' },
  { name: 'Treasury', address: '0xcAfE9a8B7c6D5e4F3a2B1c0D9e8F7a6B5c4D3E2F' },
  { name: 'Vitalik Buterin', address: '0xDef01a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7E8F' },
  { name: 'Meir', address: '0xE1f2A3b4C5d6E7f8A9B0c1D2E3f4A5b6C7d8E9f0' },
  { name: 'Ishai', address: '0xF0e1D2c3B4a5F6e7D8c9B0a1E2f3D4c5B6a7E8f9' },
];

function MultiWalletSelector({ 
  selected, 
  onChange, 
  testId,
  wallets = TRUSTED_WALLETS
}: { 
  selected: string[]; 
  onChange: (values: string[]) => void; 
  testId: string;
  wallets?: { name: string; address: string }[];
}) {
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
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function PolicyForm({ initialData, onSubmit, onCancel, onDelete, isSubmitting, isDeleting, submitLabel = "Save Policy", isEditMode = false }: PolicyFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertPolicy>>({
    name: "",
    description: "",
    action: "require_approval",
    conditionLogic: "AND",
    initiatorType: "any",
    initiatorValues: [],
    sourceWalletType: "any",
    sourceWallets: [],
    destinationType: "any",
    destinationValues: [],
    amountCondition: "any",
    amountMin: "",
    amountMax: "",
    assetType: "any",
    assetValues: [],
    approvers: [],
    quorumRequired: 1,
    changeApproversList: [],
    changeApprovalsRequired: 1,
    ...initialData,
  });

  const [expandedSections, setExpandedSections] = useState<string[]>(['details', 'conditions', 'initiator']);

  const pendingChanges = (formData as any).status === 'pending_approval' && (formData as any).pendingChanges 
    ? JSON.parse((formData as any).pendingChanges) 
    : null;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const updateField = <K extends keyof InsertPolicy>(field: K, value: InsertPolicy[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.description?.trim()) return;
    
    // Validate policy change approvers
    if (!formData.changeApproversList || formData.changeApproversList.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one user who can approve changes to this policy.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(formData as InsertPolicy);
  };

  const isValid = formData.name?.trim() && 
    formData.description?.trim() && 
    formData.changeApproversList && 
    formData.changeApproversList.length > 0 &&
    (formData.action !== 'require_approval' || (formData.approvers && formData.approvers.length > 0));

  const getDisabledReason = () => {
    if (!formData.name?.trim()) return "Please enter a policy name";
    if (!formData.description?.trim()) return "Please enter a description";
    if (!formData.changeApproversList || formData.changeApproversList.length === 0) {
      return "Please select at least one user who can approve policy changes";
    }
    if (formData.action === 'require_approval' && (!formData.approvers || formData.approvers.length === 0)) {
      return "Please select at least one user who can approve transactions";
    }
    return null;
  };

  const disabledReason = getDisabledReason();

  const isInitiatorConfigured = formData.initiatorType !== 'any';
  const isSourceConfigured = formData.sourceWalletType !== 'any';
  const isDestinationConfigured = formData.destinationType !== 'any';
  const isAmountConfigured = formData.amountCondition !== 'any';
  const isAssetConfigured = formData.assetType !== 'any';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {pendingChanges && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <GitBranch className="w-4 h-4" />
            <span className="text-sm font-semibold">Pending Changes</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {Object.entries(pendingChanges).map(([key, value]) => {
              if (key === 'status' || key === 'pendingChanges' || key === 'changeApprovers' || key === 'changeApproversList' || key === 'changeApprovalsRequired' || key === 'changeInitiator' || key === 'updatedAt' || key === 'id' || key === 'createdAt' || key === 'priority') return null;
              
              const oldValue = (formData as any)[key];
              const displayValue = (val: any) => Array.isArray(val) ? val.join(', ') : String(val);
              
              if (JSON.stringify(oldValue) === JSON.stringify(value)) return null;

              return (
                <div key={key} className="space-y-1">
                  <span className="text-[14px] font-medium text-[#8a8a8a]">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through opacity-50">{displayValue(oldValue)}</span>
                    <span className="text-foreground">→</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{displayValue(value)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection('details')}
          className="flex items-center gap-2 w-full text-left"
        >
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-[#8a8a8a] transition-transform duration-200",
              !expandedSections.includes('details') && "-rotate-90"
            )} 
          />
          <Label className="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#171717] text-[18px] font-semibold">Policy details</Label>
        </button>
        
        {expandedSections.includes('details') && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 pl-7">
            <div className="space-y-2">
              <Label htmlFor="policy-name">Policy name</Label>
              <Input
                id="policy-name"
                placeholder="e.g., Large USDC transfer to external address"
                value={formData.name || ""}
                onChange={(e) => updateField('name', e.target.value)}
                className="rounded-[14px]"
                data-testid="input-policy-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy-description">Description</Label>
              <Textarea
                id="policy-description"
                placeholder="e.g., Transfers exceeding $1M in USDC to an external address must be approved by two members of the Finance team."
                value={formData.description || ""}
                onChange={(e) => updateField('description', e.target.value)}
                className="rounded-[14px] min-h-[80px] resize-none"
                data-testid="input-policy-description"
              />
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => toggleSection('conditions')}
          className="flex items-center gap-2"
        >
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-[#8a8a8a] transition-transform duration-200",
              !expandedSections.includes('conditions') && "-rotate-90"
            )} 
          />
          <Label className="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#171717] text-[18px] font-semibold">Conditions</Label>
        </button>

        {expandedSections.includes('conditions') && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 pl-7">
            <ConditionSection
              title="Condition Logic"
              icon={<GitBranch className="w-4 h-4 text-muted-foreground" />}
              isExpanded={expandedSections.includes('logic')}
              onToggle={() => toggleSection('logic')}
              isConfigured={formData.conditionLogic === 'OR'}
            >
              <div className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label className="text-sm">How should conditions be evaluated?</Label>
                  <div className="flex bg-muted p-1 rounded-[14px] h-9 items-center w-fit">
                    <button
                      type="button"
                      onClick={() => updateField('conditionLogic', 'AND')}
                      className={cn(
                        "px-4 h-7 text-sm font-medium rounded-[10px] transition-all",
                        formData.conditionLogic === 'AND' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      And
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('conditionLogic', 'OR')}
                      className={cn(
                        "px-4 h-7 text-sm font-medium rounded-[10px] transition-all",
                        formData.conditionLogic === 'OR' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Or
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.conditionLogic === 'AND' 
                      ? 'All conditions must be true for this policy to trigger.' 
                      : 'At least one condition must be true for this policy to trigger.'}
                  </p>
                </div>
              </div>
            </ConditionSection>

            <ConditionSection
              title="Initiator"
              icon={<Users className="w-4 h-4 text-muted-foreground" />}
              isExpanded={expandedSections.includes('initiator')}
              onToggle={() => toggleSection('initiator')}
              isConfigured={isInitiatorConfigured}
            >
              <div className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label className="text-sm">Initiator type</Label>
                  <Select
                    value={formData.initiatorType || "any"}
                    onValueChange={(value) => updateField('initiatorType', value)}
                  >
                    <SelectTrigger className="rounded-[14px]" data-testid="select-initiator-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any user</SelectItem>
                      <SelectItem value="user">Specific users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.initiatorType === 'user' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Specific users</Label>
                    <MultiUserSelector
                      selected={formData.initiatorValues || []}
                      onChange={(values) => updateField('initiatorValues', values)}
                      placeholder="Select users..."
                      testId="select-initiator-users"
                    />
                  </div>
                )}
              </div>
            </ConditionSection>

            <ConditionSection
              title="From"
              icon={<Wallet className="w-4 h-4 text-muted-foreground" />}
              isExpanded={expandedSections.includes('source')}
              onToggle={() => toggleSection('source')}
              isConfigured={isSourceConfigured}
            >
              <div className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label className="text-sm">Source type</Label>
                  <Select
                    value={formData.sourceWalletType || "any"}
                    onValueChange={(value) => updateField('sourceWalletType', value)}
                  >
                    <SelectTrigger className="rounded-[14px]" data-testid="select-source-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any wallet</SelectItem>
                      <SelectItem value="specific">Specific wallets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.sourceWalletType === 'specific' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Specific wallets</Label>
                    <MultiWalletSelector
                      selected={formData.sourceWallets || []}
                      onChange={(values) => updateField('sourceWallets', values)}
                      testId="select-source-wallets"
                    />
                  </div>
                )}
              </div>
            </ConditionSection>

            <ConditionSection
              title="To"
              icon={<Target className="w-4 h-4 text-muted-foreground" />}
              isExpanded={expandedSections.includes('destination')}
              onToggle={() => toggleSection('destination')}
              isConfigured={isDestinationConfigured}
            >
              <div className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label className="text-sm">Destination type</Label>
                  <Select
                    value={formData.destinationType || "any"}
                    onValueChange={(value) => updateField('destinationType', value)}
                  >
                    <SelectTrigger className="rounded-[14px]" data-testid="select-destination-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any destination</SelectItem>
                      <SelectItem value="internal">Internal only</SelectItem>
                      <SelectItem value="external">External only</SelectItem>
                      <SelectItem value="whitelist">Specific wallets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.destinationType === 'whitelist' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Specific wallets</Label>
                    <MultiWalletSelector
                      selected={formData.destinationValues || []}
                      onChange={(values) => updateField('destinationValues', values)}
                      wallets={CONTACTS}
                      testId="select-destination-wallets"
                    />
                  </div>
                )}
              </div>
            </ConditionSection>

            <ConditionSection
              title="Amount in USD"
              icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}
              isExpanded={expandedSections.includes('amount')}
              onToggle={() => toggleSection('amount')}
              isConfigured={isAmountConfigured}
            >
              <div className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label className="text-sm">Amount condition</Label>
                  <Select
                    value={formData.amountCondition || "any"}
                    onValueChange={(value) => updateField('amountCondition', value)}
                  >
                    <SelectTrigger className="rounded-[14px]" data-testid="select-amount-condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any amount</SelectItem>
                      <SelectItem value="above">Above threshold</SelectItem>
                      <SelectItem value="below">Below threshold</SelectItem>
                      <SelectItem value="between">Between range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.amountCondition === 'above' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Greater than $</span>
                    <Input
                      type="number"
                      value={formData.amountMin || ""}
                      onChange={(e) => updateField('amountMin', e.target.value)}
                      placeholder="0"
                      className="w-32 rounded-[14px]"
                      data-testid="input-amount-min"
                    />
                  </div>
                )}
                {formData.amountCondition === 'below' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Less than $</span>
                    <Input
                      type="number"
                      value={formData.amountMin || ""}
                      onChange={(e) => updateField('amountMin', e.target.value)}
                      placeholder="0"
                      className="w-32 rounded-[14px]"
                      data-testid="input-amount-min"
                    />
                  </div>
                )}
                {formData.amountCondition === 'between' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Between $</span>
                    <Input
                      type="number"
                      value={formData.amountMin || ""}
                      onChange={(e) => updateField('amountMin', e.target.value)}
                      placeholder="0"
                      className="w-28 rounded-[14px]"
                      data-testid="input-amount-min"
                    />
                    <span className="text-sm text-muted-foreground">and $</span>
                    <Input
                      type="number"
                      value={formData.amountMax || ""}
                      onChange={(e) => updateField('amountMax', e.target.value)}
                      placeholder="10000"
                      className="w-28 rounded-[14px]"
                      data-testid="input-amount-max"
                    />
                  </div>
                )}
              </div>
            </ConditionSection>

            <ConditionSection
              title="Asset Type"
              icon={<Coins className="w-4 h-4 text-muted-foreground" />}
              isExpanded={expandedSections.includes('asset')}
              onToggle={() => toggleSection('asset')}
              isConfigured={isAssetConfigured}
            >
              <div className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label className="text-sm">Asset type</Label>
                  <Select
                    value={formData.assetType || "any"}
                    onValueChange={(value) => updateField('assetType', value)}
                  >
                    <SelectTrigger className="rounded-[14px]" data-testid="select-asset-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any asset</SelectItem>
                      <SelectItem value="specific">Specific assets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.assetType === 'specific' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Specific assets</Label>
                      <div className="flex flex-wrap gap-1">
                        {COMMON_ASSETS.map((asset) => (
                          <Button
                            key={asset}
                            type="button"
                            variant={(formData.assetValues || []).includes(asset) ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs rounded-[14px]"
                            onClick={() => {
                              const current = formData.assetValues || [];
                              if (current.includes(asset)) {
                                updateField('assetValues', current.filter(a => a !== asset));
                              } else {
                                updateField('assetValues', [...current, asset]);
                              }
                            }}
                            data-testid={`button-asset-${asset.toLowerCase()}`}
                          >
                            {asset}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <TagInput
                      values={(formData.assetValues || []).filter(a => !COMMON_ASSETS.includes(a))}
                      onChange={(values) => {
                        const commonSelected = (formData.assetValues || []).filter(a => COMMON_ASSETS.includes(a));
                        updateField('assetValues', [...commonSelected, ...values]);
                      }}
                      placeholder="Add custom asset symbol..."
                      testId="input-asset-values"
                    />
                  </div>
                )}
              </div>
            </ConditionSection>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection('approvals')}
          className="flex items-center gap-2 group"
        >
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-[#8a8a8a] transition-transform duration-200",
              !expandedSections.includes('approvals') && "-rotate-90"
            )} 
          />
          <Label className="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#171717] text-[18px] font-semibold">Approvals</Label>
        </button>

        {expandedSections.includes('approvals') && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 pl-7">
            <div className="space-y-2">
              <Label>If conditions are met</Label>
              <Select
                value={formData.action}
                onValueChange={(value) => updateField('action', value)}
              >
                <SelectTrigger className="rounded-[14px]" data-testid="select-policy-action">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="require_approval">Require approval</SelectItem>
                  <SelectItem value="deny">Deny transaction</SelectItem>
                  <SelectItem value="allow">Allow transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.action === 'require_approval' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Users who can approve transactions</Label>
                    <MultiUserSelector
                      selected={formData.approvers || []}
                      onChange={(values) => updateField('approvers', values)}
                      placeholder="Select who can approve transactions"
                      testId="select-approvers"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Quorum required</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        max={(formData.approvers || []).length || 1}
                        value={formData.quorumRequired || 1}
                        onChange={(e) => updateField('quorumRequired', parseInt(e.target.value) || 1)}
                        className="w-20 rounded-[14px]"
                        data-testid="input-quorum-required"
                      />
                      <span className="text-sm text-[#8a8a8a]">
                        of {(formData.approvers || []).length || 0} users must approve transactions
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection('policyChanges')}
          className="flex items-center gap-2 group"
        >
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-[#8a8a8a] transition-transform duration-200",
              !expandedSections.includes('policyChanges') && "-rotate-90"
            )} 
          />
          <Label className="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#171717] text-[18px] font-semibold">Policy changes</Label>
        </button>

        {expandedSections.includes('policyChanges') && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 pl-7">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Users who can approve policy changes</Label>
                <MultiUserSelector
                  selected={formData.changeApproversList || []}
                  onChange={(values) => updateField('changeApproversList', values)}
                  placeholder="Select who can approve policy changes"
                  testId="select-change-approvers"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Quorum required</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={(formData.changeApproversList || []).length || 1}
                    value={formData.changeApprovalsRequired || 1}
                    onChange={(e) => updateField('changeApprovalsRequired', parseInt(e.target.value) || 1)}
                    className="w-20 rounded-[14px]"
                    data-testid="input-change-approvals"
                  />
                  <span className="text-sm text-[#8a8a8a]">
                    of {(formData.changeApproversList || []).length || 0} users must approve changes
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 rounded-[14px]"
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-1">
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="w-full rounded-[14px]"
                  data-testid="button-save-policy"
                >
                  {isSubmitting ? 'Saving...' : submitLabel}
                </Button>
              </div>
            </TooltipTrigger>
            {disabledReason && (
              <TooltipContent className="max-w-[300px] break-words">
                <p>{disabledReason}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {isEditMode && onDelete && (
        <div className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isDeleting}
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-[14px]"
            data-testid="button-delete-policy"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Submitting deletion request...' : 'Delete policy'}
          </Button>
        </div>
      )}
    </form>
  );
}