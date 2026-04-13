import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type FC,
} from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

// ── Public API types ──

export interface ConfirmOptions {
  /** Dialog title */
  title: string;
  /** Dialog description / body text */
  description: string;

  /** Confirm button label — defaults to "Confirm" */
  confirmLabel?: string;
  /** Cancel button label — defaults to "Cancel" */
  cancelLabel?: string;

  /** Lucide icon for the confirm button */
  confirmIcon?: LucideIcon;
  /** Lucide icon for the cancel button */
  cancelIcon?: LucideIcon;

  /**
   * Visual variant for the confirm button.
   * - "destructive" — red for delete/purge actions
   * - "default" — primary color for affirmative actions
   */
  variant?: "default" | "destructive";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// ── Context ──

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

/**
 * Global imperative confirm dialog.
 *
 * Usage:
 * ```tsx
 * const confirm = useConfirm();
 * const ok = await confirm({ title: "Delete?", description: "This is permanent." });
 * if (ok) deleteItem();
 * ```
 */
export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a <ConfirmProvider>");
  }
  return ctx;
};

// ── Provider ──

export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    description: "",
  });

  // Resolve/reject refs so we can settle the promise from the dialog buttons
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const ConfirmIcon = options.confirmIcon;
  const CancelIcon = options.cancelIcon;
  const isDestructive = options.variant === "destructive";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <AlertDialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={handleCancel}>
              {CancelIcon && <CancelIcon className="w-4 h-4 mr-2" />}
              {options.cancelLabel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              variant={isDestructive ? "destructive" : "default"}
            >
              {ConfirmIcon && <ConfirmIcon className="w-4 h-4 mr-2" />}
              {options.confirmLabel || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};
