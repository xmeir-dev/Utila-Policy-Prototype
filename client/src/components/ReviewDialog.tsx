/**
 * ReviewDialog.tsx
 * 
 * Reusable approval dialog for reviewing pending changes.
 * Used for both transaction approvals and policy change approvals,
 * providing a consistent review experience across the application.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Trash2 } from "lucide-react";

interface ReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  details: React.ReactNode;
  onApprove: () => void;
  isPending: boolean;
  dataTestId?: string;
  alreadyApproved?: boolean;
}

/**
 * Displays a visual diff between old and new values.
 * Shows the change as "oldValue → newValue" for clarity.
 * 
 * For changed values:
 * - Old value shown in red with strikethrough
 * - New value shown in green
 * 
 * For unchanged values (when showUnchanged=true):
 * - Simple label: value display
 * 
 * Returns null if values are unchanged and showUnchanged is false.
 */
function ValueDiff({ label, oldVal, newVal, isDelete = false, showUnchanged = false }: { label: string, oldVal?: any, newVal?: any, isDelete?: boolean, showUnchanged?: boolean }) {
  // Normalize values for consistent comparison and display
  const formatVal = (v: any) => {
    if (Array.isArray(v)) return v.join(", ");
    if (v === null || v === undefined) return "None";
    return String(v);
  };

  const oldFormatted = formatVal(oldVal);
  const newFormatted = formatVal(newVal);
  const hasChanged = oldFormatted !== newFormatted;

  // Skip rendering if nothing changed (unless showUnchanged is true)
  if (!hasChanged && !isDelete && !showUnchanged) return null;

  // For unchanged items, show simple display
  if (!hasChanged && showUnchanged) {
    return (
      <div className="py-1.5 border-b border-border/30 last:border-0">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground">{oldFormatted}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <div className="text-xs text-muted-foreground mb-1">{label} changed</div>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {isDelete ? (
          <span className="line-through text-red-500">{oldFormatted}</span>
        ) : (
          <>
            <span className="text-red-500 line-through">{oldFormatted}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-green-600">{newFormatted}</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Helper to check if a value has changed.
 * Used to separate changed items from unchanged conditions in the review dialog.
 */
function hasValueChanged(oldVal: any, newVal: any): boolean {
  const formatVal = (v: any) => {
    if (Array.isArray(v)) return v.join(", ");
    if (v === null || v === undefined) return "None";
    return String(v);
  };
  return formatVal(oldVal) !== formatVal(newVal);
}

/**
 * Generic approval dialog for reviewing and approving pending changes.
 * Handles the approve action and provides visual feedback for loading/disabled states.
 */
export function ReviewDialog({
  isOpen,
  onOpenChange,
  title,
  details,
  onApprove,
  isPending,
  dataTestId,
  alreadyApproved = false,
}: ReviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto hide-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {details}
        </div>
        <DialogFooter className="flex gap-2 sm:justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid={`${dataTestId}-close`}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              onApprove();
              onOpenChange(false);
            }}
            disabled={isPending || alreadyApproved}
            data-testid={`${dataTestId}-approve`}
          >
            {alreadyApproved ? "Already Approved" : isPending ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ValueDiff, hasValueChanged };
