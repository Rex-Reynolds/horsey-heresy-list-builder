import type { ReactNode } from 'react';

interface Props {
  left: ReactNode;
  right: ReactNode;
  rosterVisible: boolean;
}

export default function AppLayout({ left, right, rosterVisible }: Props) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Unit browser */}
      <main className={`flex-1 overflow-y-auto bg-void p-4 lg:block lg:p-5 ${rosterVisible ? 'hidden' : 'block'}`}>
        {left}
      </main>

      {/* Divider */}
      <div className="hidden w-[2px] lg:block" style={{
        background: 'linear-gradient(180deg, transparent 0%, var(--color-edge-600) 15%, var(--color-gold-700) 50%, var(--color-edge-600) 85%, transparent 100%)',
      }} />

      {/* Roster panel */}
      <aside
        className={`w-full overflow-y-auto bg-plate-950 lg:block lg:w-[420px] ${
          rosterVisible ? 'block' : 'hidden'
        }`}
      >
        {right}
      </aside>
    </div>
  );
}
