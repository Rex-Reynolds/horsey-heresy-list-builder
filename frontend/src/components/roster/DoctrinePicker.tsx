import { useState } from 'react';
import { useDoctrines, useSetDoctrine } from '../../api/rosters.ts';
import type { DoctrineInfo } from '../../api/rosters.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';

/** Small Aquila/cog icon per doctrine theme */
const DOCTRINE_ICONS: Record<string, string> = {
  'Solar Pattern Cohort': 'M12 2L9 7H3l5 4-2 7 6-4 6 4-2-7 5-4H9z',
  'Ultima Pattern Cohort': 'M4 6h16M4 10h16M4 14h16M4 18h16',
  'Reconnaissance Pattern Cohort': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  'Mechanised Pattern Cohort': 'M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6l4 3H7',
  'Siege Pattern Cohort': 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  'Iron Pattern Cohort': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
};

function DoctrineCard({
  doctrine,
  isSelected,
  onSelect,
  disabled,
}: {
  doctrine: DoctrineInfo;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const iconPath = DOCTRINE_ICONS[doctrine.name];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`group relative w-full text-left transition-all duration-200 rounded-sm border overflow-hidden ${
        isSelected
          ? 'border-gold-500/40 bg-gradient-to-r from-gold-900/20 via-gold-900/8 to-transparent shadow-[0_0_16px_rgba(158,124,52,0.08)]'
          : 'border-edge-600/20 bg-plate-800/20 hover:border-edge-500/30 hover:bg-plate-800/40'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        {/* Radio indicator */}
        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
          isSelected
            ? 'border-gold-500 bg-gold-600/20'
            : 'border-edge-500/50 bg-plate-800/60 group-hover:border-edge-400/60'
        }`}>
          {isSelected && (
            <div className="h-2 w-2 rounded-full bg-gold-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Icon */}
            {iconPath && (
              <svg
                className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                  isSelected ? 'text-gold-400' : 'text-text-dim/50 group-hover:text-text-dim/70'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
              </svg>
            )}
            <span className={`font-label text-[12px] font-semibold tracking-[0.08em] uppercase transition-colors ${
              isSelected ? 'text-gold-300' : 'text-text-secondary group-hover:text-text-primary'
            }`}>
              {doctrine.name.replace(/ Cohort$/, '')}
            </span>
          </div>

          {/* Flavour text */}
          {doctrine.flavour && (
            <p className={`mt-1.5 text-[11px] leading-relaxed transition-colors ${
              isSelected ? 'text-text-secondary' : 'text-text-dim/70'
            }`}>
              {doctrine.flavour}
            </p>
          )}

          {/* Linked Tercio badge */}
          {doctrine.tercio && (
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 transition-all ${
              isSelected
                ? 'border-gold-600/30 bg-gold-900/15 text-gold-400/90'
                : 'border-edge-600/20 bg-plate-700/30 text-text-dim/60'
            }`}>
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-label text-[10px] font-semibold tracking-wider uppercase">
                {doctrine.tercio}
              </span>
              <span className={`text-[10px] ${isSelected ? 'text-gold-400/60' : 'text-text-dim/40'}`}>
                — slots scale, aux cost halved
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Active indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold-500/70" />
      )}
    </button>
  );
}

export default function DoctrinePicker() {
  const { rosterId, doctrine, syncFromResponse, setDoctrine } = useRosterStore();
  const { data: doctrines = [] } = useDoctrines();
  const setDoctrineMutation = useSetDoctrine(rosterId);
  const [expanded, setExpanded] = useState(false);

  if (!rosterId || doctrines.length === 0) return null;

  function handleSelect(doctrineId: string | null) {
    if (!rosterId) return;
    const newId = doctrineId === doctrine ? null : doctrineId; // Toggle off if same
    setDoctrine(newId);
    setDoctrineMutation.mutate(
      { doctrine_id: newId },
      {
        onSuccess: (resp) => {
          syncFromResponse(resp);
        },
      },
    );
  }

  const activeDoctrine = doctrines.find((d) => d.id === doctrine);

  return (
    <div className="rounded-sm border border-edge-600/20 bg-plate-800/25 overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-plate-700/15"
      >
        <div className="flex items-center gap-2">
          <svg className={`h-3 w-3 text-text-dim transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-label text-[11px] font-semibold tracking-[0.12em] text-text-dim uppercase">
            Cohort Doctrine
          </span>
          {activeDoctrine && (
            <span className="rounded-sm border border-gold-600/25 bg-gold-900/15 px-2 py-0.5 font-label text-[10px] font-semibold tracking-wider text-gold-400/80 uppercase">
              {activeDoctrine.name.replace(/ Cohort$/, '')}
            </span>
          )}
          {!activeDoctrine && (
            <span className="text-[11px] text-text-dim/50">None</span>
          )}
        </div>
      </button>

      {/* Expanded panel with doctrine cards */}
      {expanded && (
        <div className="border-t border-edge-700/15 px-3 py-2.5 space-y-1.5">
          <p className="text-[11px] leading-relaxed text-text-dim/70 mb-2">
            Select a doctrine to enhance a matching Tercio detachment. Click the active doctrine again to deselect.
          </p>
          {doctrines.map((d) => (
            <DoctrineCard
              key={d.id}
              doctrine={d}
              isSelected={doctrine === d.id}
              onSelect={() => handleSelect(d.id)}
              disabled={setDoctrineMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
