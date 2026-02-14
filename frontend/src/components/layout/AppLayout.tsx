import type { ReactNode } from 'react';

interface Props {
  left: ReactNode;
  right: ReactNode;
  rosterVisible: boolean;
}

export default function AppLayout({ left, right, rosterVisible }: Props) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Main panel: units browser */}
      <main className={`flex-1 overflow-y-auto p-4 lg:block lg:p-6 ${rosterVisible ? 'hidden' : 'block'}`}>
        {left}
      </main>

      {/* Roster panel */}
      <aside
        className={`w-full overflow-y-auto border-l border-slate-700 bg-slate-900/50 lg:block lg:w-[420px] ${
          rosterVisible ? 'block' : 'hidden'
        }`}
      >
        {right}
      </aside>
    </div>
  );
}
