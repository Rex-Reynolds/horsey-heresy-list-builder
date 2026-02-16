/**
 * Silhouette icons for HH3 unit types — tiny atmospheric SVGs
 * that visually distinguish unit categories at a glance.
 */

function HighCommandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Eagle/aquila silhouette — command authority */}
      <path d="M12 3l2 4h3l-2.5 3 1.5 4-4-2.5L8 14l1.5-4L7 7h3l2-4z" />
      <rect x="9" y="16" width="6" height="2" rx="0.5" opacity="0.6" />
      <rect x="10" y="19" width="4" height="1.5" rx="0.5" opacity="0.4" />
    </svg>
  );
}

function CommandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Banner/standard — officer command */}
      <rect x="11" y="3" width="2" height="18" rx="0.5" />
      <path d="M13 4h6l-1.5 3L19 10h-6V4z" opacity="0.85" />
      <circle cx="12" cy="3" r="1.2" />
    </svg>
  );
}

function TroopsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Two soldier silhouettes — line infantry */}
      <circle cx="9" cy="6" r="2.2" />
      <path d="M5.5 11a3.5 3.5 0 017 0v2h-7v-2z" />
      <rect x="7" y="13" width="4" height="7" rx="0.8" opacity="0.7" />
      <circle cx="16" cy="7" r="2" opacity="0.55" />
      <path d="M13 11.5a3 3 0 016 0v1.5h-6v-1.5z" opacity="0.55" />
      <rect x="14.5" y="13" width="3" height="6" rx="0.6" opacity="0.4" />
    </svg>
  );
}

function ElitesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Sword — elite warrior */}
      <path d="M12 2l1.2 12h-2.4L12 2z" />
      <rect x="8" y="14" width="8" height="1.8" rx="0.5" />
      <rect x="10.5" y="16" width="3" height="5" rx="0.8" />
      <circle cx="12" cy="21.5" r="1" opacity="0.6" />
    </svg>
  );
}

function RetinueIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Shield — bodyguard/retinue */}
      <path d="M12 3L5 7v5c0 5 3 8.5 7 10.5 4-2 7-5.5 7-10.5V7l-7-4z" opacity="0.85" />
      <path d="M12 6L7.5 8.5v3.5c0 3.5 2 6 4.5 7.5 2.5-1.5 4.5-4 4.5-7.5V8.5L12 6z" opacity="0.3" fill="none" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

function FastAttackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Lightning bolt — speed */}
      <path d="M13 2L6 13h5l-2 9 9-12h-5.5L13 2z" />
    </svg>
  );
}

function ReconIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Binoculars/scope — reconnaissance */}
      <circle cx="8.5" cy="10" r="4" opacity="0.85" />
      <circle cx="15.5" cy="10" r="4" opacity="0.85" />
      <rect x="10.5" y="8" width="3" height="4" rx="0.5" />
      <circle cx="8.5" cy="10" r="2.2" opacity="0.2" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="15.5" cy="10" r="2.2" opacity="0.2" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <rect x="7" y="15" width="3" height="4" rx="1" opacity="0.6" />
      <rect x="14" y="15" width="3" height="4" rx="1" opacity="0.6" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Artillery piece — fire support */}
      <ellipse cx="12" cy="18" rx="8" ry="2.5" opacity="0.3" />
      <rect x="4" y="11" width="16" height="3" rx="1.5" transform="rotate(-15 12 12.5)" />
      <circle cx="7" cy="18" r="2.5" opacity="0.7" />
      <circle cx="17" cy="18" r="2.5" opacity="0.7" />
      <circle cx="7" cy="18" r="1" opacity="0.3" />
      <circle cx="17" cy="18" r="1" opacity="0.3" />
      <rect x="3" y="8" width="12" height="2.5" rx="1" transform="rotate(-15 9 9)" opacity="0.85" />
    </svg>
  );
}

function ArmourIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Tank silhouette — armoured vehicle */}
      <rect x="3" y="9" width="18" height="7" rx="1" />
      <rect x="6" y="5" width="10" height="5" rx="1" />
      <rect x="14" y="3" width="8" height="2.5" rx="0.8" opacity="0.8" />
      <ellipse cx="6" cy="18" rx="2.5" ry="2" opacity="0.7" />
      <ellipse cx="12" cy="18" rx="2.5" ry="2" opacity="0.7" />
      <ellipse cx="18" cy="18" rx="2.5" ry="2" opacity="0.7" />
      <rect x="3" y="16" width="18" height="1.5" rx="0.5" opacity="0.5" />
    </svg>
  );
}

function HeavyAssaultIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Heavy bolter / siege weapon — heavy assault */}
      <rect x="2" y="10" width="14" height="4" rx="1" />
      <rect x="14" y="9" width="8" height="2" rx="0.5" />
      <rect x="6" y="7" width="8" height="3.5" rx="1" opacity="0.8" />
      <path d="M4 14v3l3 2h10l3-2v-3H4z" opacity="0.6" />
      <circle cx="7" cy="19.5" r="1.5" opacity="0.5" />
      <circle cx="17" cy="19.5" r="1.5" opacity="0.5" />
    </svg>
  );
}

function WarEngineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Walker/sentinel — bipedal war engine */}
      <rect x="8" y="3" width="8" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="3" rx="0.5" opacity="0.8" />
      <path d="M10 12l-4 9h3l2-5" opacity="0.7" />
      <path d="M14 12l4 9h-3l-2-5" opacity="0.7" />
      <rect x="15" y="5" width="6" height="1.5" rx="0.5" opacity="0.6" />
    </svg>
  );
}

function TransportIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* APC/transport vehicle */}
      <path d="M3 10l2-4h14l2 4v5H3v-5z" />
      <rect x="2" y="15" width="20" height="2" rx="0.5" opacity="0.6" />
      <circle cx="6" cy="18.5" r="2" opacity="0.7" />
      <circle cx="18" cy="18.5" r="2" opacity="0.7" />
      <circle cx="6" cy="18.5" r="0.8" opacity="0.3" />
      <circle cx="18" cy="18.5" r="0.8" opacity="0.3" />
      <rect x="7" y="8" width="3" height="3" rx="0.3" opacity="0.3" />
      <rect x="11" y="8" width="3" height="3" rx="0.3" opacity="0.3" />
    </svg>
  );
}

function HeavyTransportIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Large transport — heavier APC */}
      <path d="M2 9l2-4h16l2 4v6H2V9z" />
      <rect x="1" y="15" width="22" height="2.5" rx="0.5" opacity="0.6" />
      <circle cx="5" cy="19" r="2" opacity="0.7" />
      <circle cx="12" cy="19" r="2" opacity="0.7" />
      <circle cx="19" cy="19" r="2" opacity="0.7" />
      <rect x="5" y="7" width="3" height="4" rx="0.3" opacity="0.25" />
      <rect x="9" y="7" width="3" height="4" rx="0.3" opacity="0.25" />
      <rect x="13" y="7" width="3" height="4" rx="0.3" opacity="0.25" />
    </svg>
  );
}

function LordOfWarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Crown/skull — lord of war */}
      <path d="M4 14l2-8 3 4 3-6 3 6 3-4 2 8H4z" />
      <rect x="4" y="14" width="16" height="2.5" rx="0.5" />
      <circle cx="8.5" cy="11" r="0.8" opacity="0.3" />
      <circle cx="15.5" cy="11" r="0.8" opacity="0.3" />
      <rect x="6" y="17" width="12" height="3" rx="1" opacity="0.5" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  'High Command': HighCommandIcon,
  'Command': CommandIcon,
  'Troops': TroopsIcon,
  'Elites': ElitesIcon,
  'Retinue': RetinueIcon,
  'Fast Attack': FastAttackIcon,
  'Recon': ReconIcon,
  'Support': SupportIcon,
  'Armour': ArmourIcon,
  'Heavy Assault': HeavyAssaultIcon,
  'War-engine': WarEngineIcon,
  'Transport': TransportIcon,
  'Heavy Transport': HeavyTransportIcon,
  'Lord of War': LordOfWarIcon,
};

interface Props {
  unitType: string;
  className?: string;
}

export default function UnitTypeIcon({ unitType, className = 'h-5 w-5' }: Props) {
  const Icon = ICON_MAP[unitType];
  if (!Icon) return null;
  return <Icon className={className} />;
}
