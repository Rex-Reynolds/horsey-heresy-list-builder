export default function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="relative h-6 w-6">
        <div
          className="absolute inset-0 rounded-full border border-edge-600 border-t-gold-500"
          style={{ animation: 'spin 0.8s linear infinite' }}
        />
      </div>
    </div>
  );
}
