import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'caution';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const btnColor = variant === 'danger'
    ? 'bg-danger/80 hover:bg-danger text-white'
    : 'bg-caution/80 hover:bg-caution text-void';

  return (
    <div className="confirm-overlay fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="animate-modal-in glow-border-active w-full max-w-sm rounded-sm bg-plate-800 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-display text-sm font-semibold tracking-wide text-ivory uppercase">{title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="font-label rounded-sm border border-edge-600/40 px-4 py-2 text-[11px] font-semibold tracking-wider text-text-dim uppercase transition-colors hover:text-text-secondary"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`font-label rounded-sm px-4 py-2 text-[11px] font-semibold tracking-wider uppercase transition-all ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
