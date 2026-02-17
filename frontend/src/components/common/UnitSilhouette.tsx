/**
 * Monochrome SVG silhouettes as subtle watermarks on unit cards.
 * Each unit type gets a distinctive outline shape.
 */

interface Props {
  unitType: string;
  className?: string;
}

export default function UnitSilhouette({ unitType, className = '' }: Props) {
  const Silhouette = SILHOUETTES[unitType] ?? SILHOUETTES['default'];
  return <Silhouette className={className} />;
}

function InfantrySilhouette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="currentColor" opacity="0.04">
      {/* Squad of 3 soldiers */}
      <g transform="translate(10, 15)">
        {/* Soldier 1 */}
        <circle cx="12" cy="5" r="4" />
        <rect x="8" y="10" width="8" height="18" rx="2" />
        <rect x="6" y="28" width="5" height="16" rx="1" />
        <rect x="13" y="28" width="5" height="16" rx="1" />
        {/* Lasgun */}
        <rect x="17" y="12" width="2" height="14" rx="0.5" transform="rotate(15 18 19)" />
      </g>
      <g transform="translate(28, 12)">
        <circle cx="12" cy="5" r="4" />
        <rect x="8" y="10" width="8" height="18" rx="2" />
        <rect x="6" y="28" width="5" height="18" rx="1" />
        <rect x="13" y="28" width="5" height="18" rx="1" />
        <rect x="17" y="12" width="2" height="14" rx="0.5" transform="rotate(10 18 19)" />
      </g>
      <g transform="translate(46, 18)">
        <circle cx="12" cy="5" r="4" />
        <rect x="8" y="10" width="8" height="18" rx="2" />
        <rect x="6" y="28" width="5" height="14" rx="1" />
        <rect x="13" y="28" width="5" height="14" rx="1" />
        <rect x="17" y="12" width="2" height="14" rx="0.5" transform="rotate(20 18 19)" />
      </g>
    </svg>
  );
}

function TankSilhouette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="currentColor" opacity="0.04">
      <g transform="translate(5, 22)">
        {/* Hull */}
        <rect x="8" y="20" width="60" height="22" rx="2" />
        {/* Turret */}
        <rect x="24" y="10" width="24" height="14" rx="3" />
        {/* Gun barrel */}
        <rect x="48" y="14" width="22" height="4" rx="1" />
        {/* Tracks */}
        <rect x="5" y="42" width="66" height="10" rx="3" />
        <circle cx="14" cy="47" r="3.5" opacity="0.6" />
        <circle cx="26" cy="47" r="3.5" opacity="0.6" />
        <circle cx="38" cy="47" r="3.5" opacity="0.6" />
        <circle cx="50" cy="47" r="3.5" opacity="0.6" />
        <circle cx="62" cy="47" r="3.5" opacity="0.6" />
      </g>
    </svg>
  );
}

function WalkerSilhouette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="currentColor" opacity="0.04">
      <g transform="translate(15, 5)">
        {/* Head/cockpit */}
        <rect x="16" y="2" width="18" height="12" rx="3" />
        {/* Torso */}
        <rect x="12" y="14" width="26" height="20" rx="2" />
        {/* Arms/weapons */}
        <rect x="0" y="16" width="14" height="4" rx="1" />
        <rect x="36" y="16" width="14" height="4" rx="1" />
        {/* Legs */}
        <rect x="14" y="34" width="6" height="20" rx="1" transform="rotate(-8 17 44)" />
        <rect x="30" y="34" width="6" height="20" rx="1" transform="rotate(8 33 44)" />
        {/* Feet */}
        <rect x="8" y="52" width="12" height="5" rx="1" />
        <rect x="30" y="52" width="12" height="5" rx="1" />
      </g>
    </svg>
  );
}

function TransportSilhouette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="currentColor" opacity="0.04">
      <g transform="translate(5, 24)">
        {/* Hull — APC shape */}
        <path d="M8 10 L14 2 L62 2 L68 10 L68 28 L8 28 Z" />
        {/* Viewport */}
        <rect x="18" y="6" width="8" height="4" rx="1" opacity="0.5" />
        <rect x="32" y="6" width="8" height="4" rx="1" opacity="0.5" />
        {/* Tracks */}
        <rect x="5" y="28" width="66" height="8" rx="3" />
        <circle cx="14" cy="32" r="2.5" opacity="0.6" />
        <circle cx="26" cy="32" r="2.5" opacity="0.6" />
        <circle cx="38" cy="32" r="2.5" opacity="0.6" />
        <circle cx="50" cy="32" r="2.5" opacity="0.6" />
        <circle cx="62" cy="32" r="2.5" opacity="0.6" />
      </g>
    </svg>
  );
}

function CommandSilhouette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="currentColor" opacity="0.04">
      <g transform="translate(22, 8)">
        {/* Plume */}
        <path d="M18 2 L22 8 L14 8 Z" opacity="0.6" />
        {/* Head with crest */}
        <circle cx="18" cy="14" r="6" />
        {/* Body — wider, caped */}
        <path d="M6 22 L10 20 L26 20 L30 22 L28 50 L8 50 Z" />
        {/* Cape */}
        <path d="M6 22 L2 50 L8 50 Z" opacity="0.5" />
        <path d="M30 22 L34 50 L28 50 Z" opacity="0.5" />
        {/* Sword */}
        <rect x="32" y="20" width="2" height="24" rx="0.5" transform="rotate(15 33 32)" />
        {/* Legs */}
        <rect x="12" y="50" width="5" height="16" rx="1" />
        <rect x="20" y="50" width="5" height="16" rx="1" />
      </g>
    </svg>
  );
}

function ArtillerySilhouette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="currentColor" opacity="0.04">
      <g transform="translate(8, 20)">
        {/* Gun platform */}
        <rect x="10" y="24" width="50" height="16" rx="2" />
        {/* Long barrel */}
        <rect x="40" y="10" width="28" height="6" rx="1" transform="rotate(-10 54 13)" />
        {/* Shield */}
        <rect x="30" y="6" width="14" height="22" rx="2" />
        {/* Wheels */}
        <circle cx="20" cy="42" r="6" />
        <circle cx="50" cy="42" r="6" />
        <circle cx="20" cy="42" r="3" opacity="0.5" />
        <circle cx="50" cy="42" r="3" opacity="0.5" />
      </g>
    </svg>
  );
}

function DefaultSilhouette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="currentColor" opacity="0.04">
      <g transform="translate(20, 10)">
        <circle cx="20" cy="10" r="8" />
        <rect x="10" y="20" width="20" height="28" rx="3" />
        <rect x="6" y="48" width="10" height="20" rx="2" />
        <rect x="24" y="48" width="10" height="20" rx="2" />
      </g>
    </svg>
  );
}

const SILHOUETTES: Record<string, React.FC<{ className: string }>> = {
  'High Command': CommandSilhouette,
  'Command': CommandSilhouette,
  'Troops': InfantrySilhouette,
  'Elites': InfantrySilhouette,
  'Retinue': InfantrySilhouette,
  'Fast Attack': InfantrySilhouette,
  'Recon': InfantrySilhouette,
  'Support': ArtillerySilhouette,
  'Armour': TankSilhouette,
  'Heavy Assault': TankSilhouette,
  'War-engine': WalkerSilhouette,
  'Transport': TransportSilhouette,
  'Heavy Transport': TransportSilhouette,
  'Lord of War': WalkerSilhouette,
  'default': DefaultSilhouette,
};
