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
    <div className="fixed bottom-5 right-5 z-[10000] flex flex-col gap-2.5 pointer-events-none max-lg:bottom-20 max-lg:right-3 max-lg:left-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-toast-in flex items-center gap-3 rounded-sm border px-4 py-3 shadow-xl backdrop-blur-md ${TYPE_STYLES[toast.type]}`}
        >
          {toast.type === 'success' && (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
          <span className="text-[13px] font-medium flex-1">{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={() => {
                toast.onUndo!();
                removeToast(toast.id);
              }}
              className="font-label shrink-0 rounded-sm border border-gold-500/30 bg-gold-600/15 px-3 py-1 text-[11px] font-bold tracking-wider text-gold-400 transition-all hover:bg-gold-600/25 hover:text-gold-300 uppercase"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 opacity-40 transition-opacity hover:opacity-100"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
