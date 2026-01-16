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

function ValueDiff({ label, oldVal, newVal, isDelete = false }: { label: string, oldVal?: any, newVal?: any, isDelete?: boolean }) {
  const formatVal = (v: any) => {
    if (Array.isArray(v)) return v.join(", ");
    if (v === null || v === undefined) return "None";
    return String(v);
  };

  const oldFormatted = formatVal(oldVal);
  const newFormatted = formatVal(newVal);

  if (oldFormatted === newFormatted && !isDelete) return null;

  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 text-sm">
        {isDelete ? (
          <span className="line-through text-muted-foreground">{oldFormatted}</span>
        ) : (
          <>
            <span className="text-muted-foreground line-through">{oldFormatted}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium text-foreground">{newFormatted}</span>
          </>
        )}
      </div>
    </div>
  );
}

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

export { ValueDiff };
