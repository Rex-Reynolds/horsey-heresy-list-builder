import { useState } from 'react';
import { useDetachments } from '../../api/detachments.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import type { Detachment } from '../../types/index.ts';
import SkullGlyph from '../common/SkullGlyph.tsx';

function DetachmentRuleCard({
  detachment,
  isSelected,
  onSelect,
}: {
  detachment: Detachment;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const rules = detachment.abilities?.rules ?? [];
  const enhancements = detachment.abilities?.enhancements ?? [];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full text-left transition-all duration-200 rounded-sm border overflow-hidden ${
        isSelected
          ? 'border-crimson/40 bg-gradient-to-r from-crimson/10 via-crimson/5 to-transparent shadow-[0_0_16px_rgba(194,40,48,0.08)]'
          : 'border-edge-600/20 bg-plate-800/20 hover:border-edge-500/30 hover:bg-plate-800/40'
      }`}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        {/* Radio indicator */}
        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
          isSelected
            ? 'border-crimson bg-crimson/20'
            : 'border-edge-500/50 bg-plate-800/60 group-hover:border-edge-400/60'
        }`}>
          {isSelected && (
            <div className="h-2 w-2 rounded-full bg-crimson" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <SkullGlyph size="xs" className={`shrink-0 transition-colors ${
              isSelected ? 'text-crimson' : 'text-text-dim/40 group-hover:text-text-dim/60'
            }`} />
            <span className={`font-label text-[12px] font-semibold tracking-[0.08em] uppercase transition-colors ${
              isSelected ? 'text-crimson' : 'text-text-secondary group-hover:text-text-primary'
            }`}>
              {detachment.name}
            </span>
          </div>

          {/* Detachment rule summary */}
          {rules.length > 0 && (
            <p className={`mt-1.5 text-[11px] leading-relaxed line-clamp-2 transition-colors ${
              isSelected ? 'text-text-secondary' : 'text-text-dim/70'
            }`}>
              {rules[0].description.slice(0, 120)}{rules[0].description.length > 120 ? '...' : ''}
            </p>
          )}

          {/* Enhancements badge */}
          {enhancements.length > 0 && (
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 transition-all ${
              isSelected
                ? 'border-crimson/30 bg-crimson/10 text-crimson/90'
                : 'border-edge-600/20 bg-plate-700/30 text-text-dim/60'
            }`}>
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="font-label text-[10px] font-semibold tracking-wider uppercase">
                {enhancements.length} enhancement{enhancements.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Active indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-crimson/70" />
      )}
    </button>
  );
}

export default function DetachmentRulePicker() {
  const { rosterId, detachmentRule, setDetachmentRule } = useRosterStore();
  const { data: detachments = [] } = useDetachments();
  const [expanded, setExpanded] = useState(false);

  // Filter to only detachments with abilities (these are the 40k "detachment rule" packages)
  const ruleDetachments = detachments.filter((d) => d.abilities?.rules?.length || d.abilities?.enhancements?.length);

  if (!rosterId || ruleDetachments.length === 0) return null;

  function handleSelect(detName: string) {
    const newVal = detName === detachmentRule ? null : detName;
    setDetachmentRule(newVal);
  }

  const activeRule = ruleDetachments.find((d) => d.name === detachmentRule);

  return (
    <div className="rounded-sm border border-edge-600/20 bg-plate-800/25 overflow-hidden">
      {/* Header */}
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
            Detachment Rule
          </span>
          {activeRule && (
            <span className="rounded-sm border border-crimson/25 bg-crimson/10 px-2 py-0.5 font-label text-[10px] font-semibold tracking-wider text-crimson/80 uppercase">
              {activeRule.name}
            </span>
          )}
          {!activeRule && (
            <span className="text-[11px] text-text-dim/50">None</span>
          )}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-edge-700/15 px-3 py-2.5 space-y-1.5">
          <p className="text-[11px] leading-relaxed text-text-dim/70 mb-2">
            Select a detachment to gain its rule and unlock enhancements.
          </p>
          {ruleDetachments.map((d) => (
            <DetachmentRuleCard
              key={d.id}
              detachment={d}
              isSelected={detachmentRule === d.name}
              onSelect={() => handleSelect(d.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
