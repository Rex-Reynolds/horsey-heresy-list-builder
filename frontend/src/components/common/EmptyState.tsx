export default function EmptyState({ message, icon = '📋' }: { message: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <span className="mb-3 text-4xl">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
