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
import { X, Plus, Users, Wallet, Target, DollarSign, Coins, ChevronDown, ChevronUp, GitBranch, Trash2, Wand2, Loader2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
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

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [showManualFields, setShowManualFields] = useState(isEditMode);
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

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setMissingInfo([]);
    try {
      const res = await apiRequest('POST', '/api/policies/generate', { prompt: aiPrompt });
      const { policy, missingInfo: missing } = await res.json();
      
      setFormData(prev => ({
        ...prev,
        ...policy,
        approvers: policy.approvers || prev.approvers || [],
        changeApproversList: policy.changeApproversList || prev.changeApproversList || []
      }));
      setMissingInfo(missing);
      
      toast({
        title: "Policy generated",
        description: "AI has filled in the fields based on your request."
      });
    } catch (err) {
      toast({
        title: "AI Generation failed",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
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
      {!isEditMode && (
        <div className="space-y-4">
          <div className="text-primary">
            <span className="text-sm font-medium">Create your policy with AI</span>
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Describe your policy in plain English... (e.g., 'Any transfer over $10k needs approval from Meir')"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="rounded-[14px] min-h-[100px] resize-none"
              data-testid="input-ai-prompt"
            />
            <Button 
              type="button" 
              onClick={handleGenerateAI} 
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full gap-2 rounded-lg"
              data-testid="button-ai-generate"
            >
              {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isGenerating ? "Generating..." : "Generate Policy"}
            </Button>
          </div>
          
          {missingInfo.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-amber-600">
                <Info className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Missing Information</span>
              </div>
              <p className="text-xs text-muted-foreground">
                I couldn't find details for: <span className="text-foreground font-medium">{missingInfo.join(", ")}</span>. 
                Please update the prompt or fill them in below.
              </p>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch 
            id="show-manual" 
            checked={showManualFields} 
            onCheckedChange={setShowManualFields} 
            data-testid="switch-manual-fields"
          />
          <Label htmlFor="show-manual" className="text-sm font-medium">Configure manually</Label>
        </div>
      </div>
      {showManualFields && (
        <div className="space-y-6 animate-in fade-in duration-300">
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
                        <Label className="text-sm">Whitelisted wallets</Label>
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
                  title="Amount"
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
                          <SelectItem value="above">Above</SelectItem>
                          <SelectItem value="below">Below</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.amountCondition !== 'any' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Min (USD)</Label>
                          <Input
                            type="number"
                            value={formData.amountMin || ""}
                            onChange={(e) => updateField('amountMin', e.target.value)}
                            placeholder="0"
                            className="rounded-[14px]"
                            data-testid="input-amount-min"
                          />
                        </div>
                        {formData.amountCondition === 'between' && (
                          <div className="space-y-2">
                            <Label className="text-xs">Max (USD)</Label>
                            <Input
                              type="number"
                              value={formData.amountMax || ""}
                              onChange={(e) => updateField('amountMax', e.target.value)}
                              placeholder="1000"
                              className="rounded-[14px]"
                              data-testid="input-amount-max"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ConditionSection>

                <ConditionSection
                  title="Asset"
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
                      <div className="space-y-2">
                        <Label className="text-sm">Specific assets</Label>
                        <TagInput
                          values={formData.assetValues || []}
                          onChange={(values) => updateField('assetValues', values)}
                          placeholder="e.g., ETH, USDC"
                          testId="input-asset-values"
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {COMMON_ASSETS.filter(a => !(formData.assetValues || []).includes(a)).map(asset => (
                            <button
                              key={asset}
                              type="button"
                              onClick={() => updateField('assetValues', [...(formData.assetValues || []), asset])}
                              className="text-[10px] bg-muted hover:bg-muted/80 px-2 py-0.5 rounded-full transition-colors"
                            >
                              + {asset}
                            </button>
                          ))}
                        </div>
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
              onClick={() => toggleSection('action')}
              className="flex items-center gap-2"
            >
              <ChevronDown 
                className={cn(
                  "w-5 h-5 text-[#8a8a8a] transition-transform duration-200",
                  !expandedSections.includes('action') && "-rotate-90"
                )} 
              />
              <Label className="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#171717] text-[18px] font-semibold">Action</Label>
            </button>

            {expandedSections.includes('action') && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 pl-7">
                <div className="space-y-2">
                  <Label className="text-sm">Approval policy</Label>
                  <Select
                    value={formData.action || "require_approval"}
                    onValueChange={(value) => updateField('action', value)}
                  >
                    <SelectTrigger className="rounded-[14px]" data-testid="select-policy-action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow">Auto-approve</SelectItem>
                      <SelectItem value="deny">Auto-deny</SelectItem>
                      <SelectItem value="require_approval">Require manual approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.action === 'require_approval' && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Who can approve transactions?</Label>
                      <MultiUserSelector
                        selected={formData.approvers || []}
                        onChange={(values) => updateField('approvers', values)}
                        placeholder="Select approvers..."
                        testId="select-transaction-approvers"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Number of approvals required</Label>
                        <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-mono">
                          {formData.quorumRequired || 1} / {formData.approvers?.length || 0}
                        </Badge>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={formData.approvers?.length || 1}
                        value={formData.quorumRequired || 1}
                        onChange={(e) => updateField('quorumRequired', parseInt(e.target.value))}
                        className="rounded-[14px]"
                        data-testid="input-transaction-quorum"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('governance')}
              className="flex items-center gap-2"
            >
              <ChevronDown 
                className={cn(
                  "w-5 h-5 text-[#8a8a8a] transition-transform duration-200",
                  !expandedSections.includes('governance') && "-rotate-90"
                )} 
              />
              <Label className="cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#171717] text-[18px] font-semibold">Governance</Label>
            </button>

            {expandedSections.includes('governance') && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 pl-7">
                <div className="space-y-2">
                  <Label className="text-sm">Who can approve changes to this policy?</Label>
                  <MultiUserSelector
                    selected={formData.changeApproversList || []}
                    onChange={(values) => updateField('changeApproversList', values)}
                    placeholder="Select policy approvers..."
                    testId="select-policy-change-approvers"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Number of approvals required for changes</Label>
                    <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-mono">
                      {formData.changeApprovalsRequired || 1} / {formData.changeApproversList?.length || 0}
                    </Badge>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={formData.changeApproversList?.length || 1}
                    value={formData.changeApprovalsRequired || 1}
                    onChange={(e) => updateField('changeApprovalsRequired', parseInt(e.target.value))}
                    className="rounded-[14px]"
                    data-testid="input-policy-change-quorum"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="pt-6 flex items-center justify-between sticky bottom-0 bg-background py-4 border-t border-border mt-12">
        <div className="flex items-center gap-2">
          {onDelete && isEditMode && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg gap-2"
              onClick={onDelete}
              disabled={isDeleting || isSubmitting}
              data-testid="button-delete-policy"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete Policy"}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg px-6"
            data-testid="button-cancel-policy"
          >
            Cancel
          </Button>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="rounded-lg px-8 min-w-[140px]"
                    data-testid="button-submit-policy"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : submitLabel}
                  </Button>
                </div>
              </TooltipTrigger>
              {!isValid && disabledReason && (
                <TooltipContent side="top" className="bg-destructive text-destructive-foreground border-none">
                  <p>{disabledReason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </form>
  );
}
