import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Plus, Users, Wallet, Target, DollarSign, Coins, ChevronDown, ChevronUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Policy, InsertPolicy } from "@shared/schema";

const COMMON_ASSETS = ['BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'MATIC', 'AVAX', 'BNB'];

interface PolicyFormProps {
  initialData?: Partial<InsertPolicy>;
  onSubmit: (data: InsertPolicy) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
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
    <div className="border border-border rounded-lg overflow-hidden">
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
        <Button type="button" variant="outline" size="icon" onClick={addTag} data-testid={`${testId}-add`}>
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
      <div className="flex flex-wrap gap-2 p-2 border border-input rounded-lg bg-background min-h-[42px]">
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
          <SelectTrigger className="border-0 shadow-none focus:ring-0 w-auto h-7 p-0 px-2 text-xs text-muted-foreground hover:bg-muted rounded-md transition-colors">
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

const AVAILABLE_WALLETS = [
  { name: 'Main Treasury', address: '0xc333b115a72a3519b48E9B4f9D1bBD4a34C248b1' },
  { name: 'Operating Account', address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
  { name: 'Payroll Wallet', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { name: 'Escrow Account', address: '0x6B175474E89094C44Da98b954EesecdB6F8e5389' },
  { name: 'Founder Reserve', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }
];

function MultiWalletSelector({ 
  selected, 
  onChange, 
  testId
}: { 
  selected: string[]; 
  onChange: (values: string[]) => void; 
  testId: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border border-input rounded-lg bg-background min-h-[42px]">
        {selected.map((address) => {
          const wallet = AVAILABLE_WALLETS.find(w => w.address === address);
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
          <SelectTrigger className="border-0 shadow-none focus:ring-0 w-auto h-7 p-0 px-2 text-xs text-muted-foreground hover:bg-muted rounded-md transition-colors">
            <div className="flex items-center gap-1">
              <Plus className="w-3 h-3" />
              <span>Add Wallet</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_WALLETS.filter(w => !selected.includes(w.address)).map((wallet) => (
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

export function PolicyForm({ initialData, onSubmit, onCancel, isSubmitting, submitLabel = "Save Policy" }: PolicyFormProps) {
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
    changeApprovalsRequired: 1,
    ...initialData,
  });

  const [expandedSections, setExpandedSections] = useState<string[]>(['initiator']);

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
    onSubmit(formData as InsertPolicy);
  };

  const isValid = formData.name?.trim() && formData.description?.trim();

  const isInitiatorConfigured = formData.initiatorType !== 'any';
  const isSourceConfigured = formData.sourceWalletType !== 'any';
  const isDestinationConfigured = formData.destinationType !== 'any';
  const isAmountConfigured = formData.amountCondition !== 'any';
  const isAssetConfigured = formData.assetType !== 'any';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="policy-name">Policy Name</Label>
          <Input
            id="policy-name"
            placeholder="e.g., Large Bitcoin Transfer Approval"
            value={formData.name || ""}
            onChange={(e) => updateField('name', e.target.value)}
            className="rounded-lg"
            data-testid="input-policy-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="policy-description">Description</Label>
          <Textarea
            id="policy-description"
            placeholder="Describe what this policy does..."
            value={formData.description || ""}
            onChange={(e) => updateField('description', e.target.value)}
            className="rounded-lg min-h-[80px] resize-none"
            data-testid="input-policy-description"
          />
        </div>

        <div className="space-y-2">
          <Label>Action</Label>
          <Select
            value={formData.action}
            onValueChange={(value) => updateField('action', value)}
          >
            <SelectTrigger className="rounded-lg" data-testid="select-policy-action">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allow">Allow Transaction</SelectItem>
              <SelectItem value="deny">Deny Transaction</SelectItem>
              <SelectItem value="require_approval">Require Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#171717] text-[18px] font-semibold">Trigger conditions</Label>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex bg-muted p-1 rounded-md h-8 items-center">
                    <button
                      type="button"
                      onClick={() => updateField('conditionLogic', 'AND')}
                      className={cn(
                        "px-3 h-6 text-xs font-medium rounded-sm transition-all",
                        formData.conditionLogic === 'AND' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      And
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('conditionLogic', 'OR')}
                      className={cn(
                        "px-3 h-6 text-xs font-medium rounded-sm transition-all",
                        formData.conditionLogic === 'OR' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Or
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {formData.conditionLogic === 'AND' 
                      ? '"And" triggers when all conditions are true.' 
                      : '"Or" triggers when at least one is true.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <ConditionSection
          title="Initiator"
          icon={<Users className="w-4 h-4 text-muted-foreground" />}
          isExpanded={expandedSections.includes('initiator')}
          onToggle={() => toggleSection('initiator')}
          isConfigured={isInitiatorConfigured}
        >
          <div className="space-y-3 pt-3">
            <Select
              value={formData.initiatorType || "any"}
              onValueChange={(value) => updateField('initiatorType', value)}
            >
              <SelectTrigger className="rounded-lg" data-testid="select-initiator-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any User</SelectItem>
                <SelectItem value="user">Specific Users</SelectItem>
              </SelectContent>
            </Select>
            {formData.initiatorType === 'user' && (
              <MultiUserSelector
                selected={formData.initiatorValues || []}
                onChange={(values) => updateField('initiatorValues', values)}
                placeholder="Select users..."
                testId="select-initiator-users"
              />
            )}
          </div>
        </ConditionSection>

        <ConditionSection
          title="Source Wallet"
          icon={<Wallet className="w-4 h-4 text-muted-foreground" />}
          isExpanded={expandedSections.includes('source')}
          onToggle={() => toggleSection('source')}
          isConfigured={isSourceConfigured}
        >
          <div className="space-y-3 pt-3">
            <Select
              value={formData.sourceWalletType || "any"}
              onValueChange={(value) => updateField('sourceWalletType', value)}
            >
              <SelectTrigger className="rounded-lg" data-testid="select-source-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Wallet</SelectItem>
                <SelectItem value="specific">Specific Wallets</SelectItem>
              </SelectContent>
            </Select>
            {formData.sourceWalletType === 'specific' && (
              <MultiWalletSelector
                selected={formData.sourceWallets || []}
                onChange={(values) => updateField('sourceWallets', values)}
                testId="select-source-wallets"
              />
            )}
          </div>
        </ConditionSection>

        <ConditionSection
          title="Destination"
          icon={<Target className="w-4 h-4 text-muted-foreground" />}
          isExpanded={expandedSections.includes('destination')}
          onToggle={() => toggleSection('destination')}
          isConfigured={isDestinationConfigured}
        >
          <div className="space-y-3 pt-3">
            <Select
              value={formData.destinationType || "any"}
              onValueChange={(value) => updateField('destinationType', value)}
            >
              <SelectTrigger className="rounded-lg" data-testid="select-destination-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Destination</SelectItem>
                <SelectItem value="internal">Internal Only</SelectItem>
                <SelectItem value="external">External Only</SelectItem>
                <SelectItem value="whitelist">Whitelisted Addresses</SelectItem>
              </SelectContent>
            </Select>
            {formData.destinationType === 'whitelist' && (
              <TagInput
                values={formData.destinationValues || []}
                onChange={(values) => updateField('destinationValues', values)}
                placeholder="Enter whitelisted address..."
                testId="input-destination-values"
              />
            )}
          </div>
        </ConditionSection>

        <ConditionSection
          title="Amount Threshold (USD)"
          icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}
          isExpanded={expandedSections.includes('amount')}
          onToggle={() => toggleSection('amount')}
          isConfigured={isAmountConfigured}
        >
          <div className="space-y-3 pt-3">
            <Select
              value={formData.amountCondition || "any"}
              onValueChange={(value) => updateField('amountCondition', value)}
            >
              <SelectTrigger className="rounded-lg" data-testid="select-amount-condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Amount</SelectItem>
                <SelectItem value="above">Above Threshold</SelectItem>
                <SelectItem value="below">Below Threshold</SelectItem>
                <SelectItem value="between">Between Range</SelectItem>
              </SelectContent>
            </Select>
            {formData.amountCondition === 'above' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Greater than $</span>
                <Input
                  type="number"
                  value={formData.amountMin || ""}
                  onChange={(e) => updateField('amountMin', e.target.value)}
                  placeholder="0"
                  className="w-32 rounded-lg"
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
                  className="w-32 rounded-lg"
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
                  className="w-28 rounded-lg"
                  data-testid="input-amount-min"
                />
                <span className="text-sm text-muted-foreground">and $</span>
                <Input
                  type="number"
                  value={formData.amountMax || ""}
                  onChange={(e) => updateField('amountMax', e.target.value)}
                  placeholder="10000"
                  className="w-28 rounded-lg"
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
            <Select
              value={formData.assetType || "any"}
              onValueChange={(value) => updateField('assetType', value)}
            >
              <SelectTrigger className="rounded-lg" data-testid="select-asset-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Asset</SelectItem>
                <SelectItem value="specific">Specific Assets</SelectItem>
              </SelectContent>
            </Select>
            {formData.assetType === 'specific' && (
              <>
                <div className="flex flex-wrap gap-1">
                  {COMMON_ASSETS.map((asset) => (
                    <Button
                      key={asset}
                      type="button"
                      variant={(formData.assetValues || []).includes(asset) ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs rounded-lg"
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
                <TagInput
                  values={(formData.assetValues || []).filter(a => !COMMON_ASSETS.includes(a))}
                  onChange={(values) => {
                    const commonSelected = (formData.assetValues || []).filter(a => COMMON_ASSETS.includes(a));
                    updateField('assetValues', [...commonSelected, ...values]);
                  }}
                  placeholder="Add custom asset symbol..."
                  testId="input-asset-values"
                />
              </>
            )}
          </div>
        </ConditionSection>
      </div>
      {formData.action === 'require_approval' && (
        <Card className="p-4 space-y-4">
          <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base font-medium">Approval settings</Label>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Approvers</Label>
              <TagInput
                values={formData.approvers || []}
                onChange={(values) => updateField('approvers', values)}
                placeholder="Enter approver address or ID..."
                testId="input-approvers"
              />
              <p className="text-xs text-muted-foreground">Add wallet addresses or user IDs who can approve transactions matching this policy.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Quorum Required</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={(formData.approvers || []).length || 1}
                  value={formData.quorumRequired || 1}
                  onChange={(e) => updateField('quorumRequired', parseInt(e.target.value) || 1)}
                  className="w-20 rounded-lg"
                  data-testid="input-quorum-required"
                />
                <span className="text-sm text-muted-foreground">
                  of {(formData.approvers || []).length || 0} approvers must approve
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
      <Card className="p-4 space-y-4">
        <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base font-medium">Policy changes</Label>
        <div className="space-y-2">
          <Label className="text-sm">Approvals Required for Changes</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              value={formData.changeApprovalsRequired || 1}
              onChange={(e) => updateField('changeApprovalsRequired', parseInt(e.target.value) || 1)}
              className="w-20 rounded-lg"
              data-testid="input-change-approvals"
            />
            <span className="text-sm text-muted-foreground">
              approvals needed before edits go live
            </span>
          </div>
        </div>
      </Card>
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 rounded-lg"
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex-1 rounded-lg"
          data-testid="button-save-policy"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}