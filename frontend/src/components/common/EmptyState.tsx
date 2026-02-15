export default function EmptyState({ message, icon = '📋' }: { message: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-text-dim">
      <span className="mb-2 text-2xl opacity-30">{icon}</span>
      <p className="font-label text-[10px] font-medium tracking-wider uppercase">{message}</p>
    </div>
  );
}
