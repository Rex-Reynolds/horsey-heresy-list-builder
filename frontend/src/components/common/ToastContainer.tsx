import { useUIStore } from '../../stores/uiStore.ts';

const TYPE_STYLES = {
  success: 'border-valid/30 bg-valid/8 text-valid',
  error: 'border-danger/30 bg-danger/8 text-danger',
  info: 'border-steel/30 bg-steel/8 text-steel',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-toast-in flex items-center gap-2.5 rounded-sm border px-4 py-2.5 shadow-lg backdrop-blur-sm ${TYPE_STYLES[toast.type]}`}
        >
          {toast.type === 'success' && (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className="text-[13px] font-medium">{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={() => {
                toast.onUndo!();
                removeToast(toast.id);
              }}
              className="ml-1 font-label text-[12px] font-semibold tracking-wider text-gold-400 underline underline-offset-2 transition-colors hover:text-gold-300 uppercase"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 shrink-0 opacity-50 transition-opacity hover:opacity-100"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
