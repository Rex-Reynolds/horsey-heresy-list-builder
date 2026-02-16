import { useState, useEffect } from 'react';

const TOUR_STORAGE_KEY = 'sa_tour_dismissed';

interface TourStep {
  title: string;
  description: string;
  target: string; // human-readable label for the UI element
  icon: React.ReactNode;
}

const STEPS: TourStep[] = [
  {
    title: 'Add a Detachment',
    description: 'Start by adding a Primary Detachment. This defines your force structure and slot allocation.',
    target: 'Roster Panel',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: 'Fill Your Slots',
    description: 'Click a slot name (like "Troops" or "Command") to filter the unit browser. Required slots pulse gold.',
    target: 'Detachment Slots',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
  {
    title: 'Add Units',
    description: 'Click the + button to quick-add a unit, or expand it to select upgrades first. Model counts are adjustable.',
    target: 'Unit Cards',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
];

export default function GuidedTour() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(TOUR_STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  // Show tour after a short delay on first visit
  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  function handleDismiss() {
    setDismissed(true);
    setVisible(false);
    try { localStorage.setItem(TOUR_STORAGE_KEY, '1'); } catch { /* noop */ }
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  }

  if (!visible || dismissed) return null;

  const current = STEPS[step];

  return (
    <>
      <div className="fixed inset-0 z-[8000] bg-void/60" onClick={handleDismiss} />
      <div className="fixed bottom-6 left-1/2 z-[8001] -translate-x-1/2 w-[340px] max-w-[calc(100vw-32px)]">
        <div className="animate-modal-in rounded-sm border border-gold-600/25 bg-plate-900/98 shadow-xl">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pt-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-4 bg-gold-500' : i < step ? 'w-1.5 bg-gold-600/60' : 'w-1.5 bg-edge-600/40'
                }`}
              />
            ))}
          </div>

          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-600/25 bg-gold-900/15 text-gold-500/70">
                {current.icon}
              </div>
              <div className="min-w-0">
                <h4 className="font-display text-[13px] font-semibold tracking-[0.08em] text-gold-400 uppercase">
                  {current.title}
                </h4>
                <p className="mt-1 text-[13px] leading-relaxed text-text-dim">
                  {current.description}
                </p>
                <p className="mt-1.5 font-label text-[10px] tracking-wider text-gold-600/50 uppercase">
                  {current.target}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-edge-700/20 px-5 py-2.5">
            <button
              onClick={handleDismiss}
              className="font-label text-[10px] tracking-wider text-text-dim uppercase transition-colors hover:text-text-secondary"
            >
              Skip tour
            </button>
            <button
              onClick={handleNext}
              className="font-label rounded-sm bg-gold-600/80 px-4 py-1.5 text-[10px] font-bold tracking-wider text-white uppercase transition-all hover:bg-gold-500"
            >
              {step < STEPS.length - 1 ? 'Next' : 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
