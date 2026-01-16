import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/utils";

interface ReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  details: React.ReactNode;
  onApprove: () => void;
  isPending: boolean;
  dataTestId?: string;
}

export function ReviewDialog({
  isOpen,
  onOpenChange,
  title,
  details,
  onApprove,
  isPending,
  dataTestId,
}: ReviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          {details}
        </div>
        <DialogFooter className="flex gap-2 sm:justify-end">
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
            disabled={isPending}
            data-testid={`${dataTestId}-approve`}
          >
            {isPending ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
