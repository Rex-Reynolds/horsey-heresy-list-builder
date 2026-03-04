/**
 * Game system configuration — slot names, display groups, colors, feature flags.
 * Components read from GameConfigContext instead of importing hardcoded constants.
 */

export type GameSystemId = 'hh3' | '40k10e';

export interface GameConfig {
  id: GameSystemId;
  name: string;
  shortName: string;
  factionLabel: string; // e.g. "Solar Auxilia", "Genestealer Cults"

  // Slot system
  slots: readonly string[];
  displayGroups: Record<string, readonly string[]>;
  displayGroupOrder: readonly string[];
  nativeToDisplayGroup: Record<string, string>;

  // Colors
  slotStripeColors: Record<string, string>;
  slotFillColors: Record<string, string>;
  slotCardTints: Record<string, string>;
  filterColors: Record<string, { active: string; inactive: string; dot: string }>;

  // Feature flags
  hasLeaderAttachment: boolean;
  hasDetachmentRule: boolean;
  hasDoctrine: boolean;
  hasCompositionBudget: boolean; // HH3 primary/auxiliary/apex budgets
  hasPointsBrackets: boolean; // 40k discrete size options

  // Points presets
  pointsOptions: { label: string; value: number }[];
  defaultPointsLimit: number;

  // Themes available for this game system
  themes: readonly string[];
  defaultTheme: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildNativeToDisplayGroup(
  groups: Record<string, readonly string[]>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [group, slots] of Object.entries(groups)) {
    for (const slot of slots) map[slot] = group;
  }
  return map;
}

// ---------------------------------------------------------------------------
// HH3 Config
// ---------------------------------------------------------------------------

const HH3_SLOTS = [
  'High Command', 'Command', 'Troops', 'Elites', 'Retinue',
  'Fast Attack', 'Recon', 'Support', 'Armour', 'Heavy Assault',
  'War-engine', 'Transport', 'Heavy Transport', 'Lord of War',
] as const;

const HH3_DISPLAY_GROUPS: Record<string, readonly string[]> = {
  'HQ': ['High Command', 'Command'],
  'Troops': ['Troops'],
  'Elites': ['Elites', 'Retinue'],
  'Fast Attack': ['Fast Attack', 'Recon'],
  'Heavy Support': ['Support', 'Armour', 'Heavy Assault', 'War-engine'],
  'Dedicated Transport': ['Transport', 'Heavy Transport'],
  'Lord of War': ['Lord of War'],
};

const HH3_DISPLAY_GROUP_ORDER = [
  'HQ', 'Troops', 'Elites', 'Fast Attack',
  'Heavy Support', 'Dedicated Transport', 'Lord of War',
] as const;

const HH3_STRIPE_COLORS: Record<string, string> = {
  'High Command': 'border-l-purple-500',
  'Command': 'border-l-purple-600',
  'Troops': 'border-l-emerald-600',
  'Elites': 'border-l-blue-500',
  'Retinue': 'border-l-blue-600',
  'Fast Attack': 'border-l-orange-500',
  'Recon': 'border-l-orange-600',
  'Support': 'border-l-rose-500',
  'Armour': 'border-l-amber-500',
  'Heavy Assault': 'border-l-red-600',
  'War-engine': 'border-l-red-700',
  'Transport': 'border-l-teal-500',
  'Heavy Transport': 'border-l-teal-600',
  'Lord of War': 'border-l-gold-500',
};

const HH3_FILL_COLORS: Record<string, string> = {
  'High Command': 'bg-purple-500/70',
  'Command': 'bg-purple-600/70',
  'Troops': 'bg-emerald-600/70',
  'Elites': 'bg-blue-500/70',
  'Retinue': 'bg-blue-600/70',
  'Fast Attack': 'bg-orange-500/70',
  'Recon': 'bg-orange-600/70',
  'Support': 'bg-rose-500/70',
  'Armour': 'bg-amber-500/70',
  'Heavy Assault': 'bg-red-600/70',
  'War-engine': 'bg-red-700/70',
  'Transport': 'bg-teal-500/70',
  'Heavy Transport': 'bg-teal-600/70',
  'Lord of War': 'bg-gold-500/70',
};

const HH3_CARD_TINTS: Record<string, string> = {
  'High Command': 'card-tint-purple',
  'Command': 'card-tint-purple',
  'Troops': 'card-tint-emerald',
  'Elites': 'card-tint-blue',
  'Retinue': 'card-tint-blue',
  'Fast Attack': 'card-tint-orange',
  'Recon': 'card-tint-orange',
  'Support': 'card-tint-rose',
  'Armour': 'card-tint-amber',
  'Heavy Assault': 'card-tint-red',
  'War-engine': 'card-tint-red',
  'Transport': 'card-tint-teal',
  'Heavy Transport': 'card-tint-teal',
  'Lord of War': 'card-tint-gold',
};

const HH3_FILTER_COLORS: Record<string, { active: string; inactive: string; dot: string }> = {
  'All': {
    active: 'border-gold-500/40 bg-gold-600/15 text-gold-300 shadow-[0_0_8px_rgba(158,124,52,0.1)]',
    inactive: 'hover:border-gold-500/20 hover:text-gold-400/80',
    dot: 'bg-gold-500',
  },
  'HQ': {
    active: 'border-purple-500/40 bg-purple-500/18 text-purple-300 shadow-[0_0_8px_rgba(147,51,234,0.08)]',
    inactive: 'hover:border-purple-500/20 hover:text-purple-400/80',
    dot: 'bg-purple-500',
  },
  'Troops': {
    active: 'border-emerald-500/40 bg-emerald-500/18 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.08)]',
    inactive: 'hover:border-emerald-500/20 hover:text-emerald-400/80',
    dot: 'bg-emerald-500',
  },
  'Elites': {
    active: 'border-blue-500/40 bg-blue-500/18 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.08)]',
    inactive: 'hover:border-blue-500/20 hover:text-blue-400/80',
    dot: 'bg-blue-500',
  },
  'Fast Attack': {
    active: 'border-orange-500/40 bg-orange-500/18 text-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.08)]',
    inactive: 'hover:border-orange-500/20 hover:text-orange-400/80',
    dot: 'bg-orange-500',
  },
  'Heavy Support': {
    active: 'border-rose-500/40 bg-rose-500/18 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.08)]',
    inactive: 'hover:border-rose-500/20 hover:text-rose-400/80',
    dot: 'bg-rose-500',
  },
  'Dedicated Transport': {
    active: 'border-teal-500/40 bg-teal-500/18 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.08)]',
    inactive: 'hover:border-teal-500/20 hover:text-teal-400/80',
    dot: 'bg-teal-500',
  },
  'Lord of War': {
    active: 'border-gold-500/40 bg-gold-600/15 text-gold-300 shadow-[0_0_8px_rgba(158,124,52,0.1)]',
    inactive: 'hover:border-gold-500/20 hover:text-gold-400/80',
    dot: 'bg-gold-500',
  },
};

export const HH3_CONFIG: GameConfig = {
  id: 'hh3',
  name: 'Horus Heresy — Solar Auxilia',
  shortName: 'Horus Heresy',
  factionLabel: 'Solar Auxilia',

  slots: HH3_SLOTS,
  displayGroups: HH3_DISPLAY_GROUPS,
  displayGroupOrder: HH3_DISPLAY_GROUP_ORDER,
  nativeToDisplayGroup: buildNativeToDisplayGroup(HH3_DISPLAY_GROUPS),

  slotStripeColors: HH3_STRIPE_COLORS,
  slotFillColors: HH3_FILL_COLORS,
  slotCardTints: HH3_CARD_TINTS,
  filterColors: HH3_FILTER_COLORS,

  hasLeaderAttachment: false,
  hasDetachmentRule: false,
  hasDoctrine: true,
  hasCompositionBudget: true,
  hasPointsBrackets: false,

  pointsOptions: [
    { label: 'Skirmish (1,500)', value: 1500 },
    { label: 'Battle (2,000)', value: 2000 },
    { label: 'Standard (2,500)', value: 2500 },
    { label: 'Grand (3,000)', value: 3000 },
    { label: 'Apocalypse (4,000)', value: 4000 },
  ],
  defaultPointsLimit: 3000,

  themes: ['dataslate', 'parchment'],
  defaultTheme: 'dataslate',
};

// ---------------------------------------------------------------------------
// 40k 10th Edition Config
// ---------------------------------------------------------------------------

const W40K_SLOTS = [
  'Epic Hero', 'Character', 'Battleline', 'Infantry', 'Mounted',
  'Vehicle', 'Monster', 'Dedicated Transport', 'Fortification', 'Allied',
] as const;

const W40K_DISPLAY_GROUPS: Record<string, readonly string[]> = {
  'Character': ['Character', 'Epic Hero'],
  'Battleline': ['Battleline'],
  'Infantry': ['Infantry'],
  'Mounted': ['Mounted'],
  'Vehicle': ['Vehicle'],
  'Monster': ['Monster'],
  'Transport': ['Dedicated Transport'],
  'Other': ['Fortification', 'Allied'],
};

const W40K_DISPLAY_GROUP_ORDER = [
  'Character', 'Battleline', 'Infantry', 'Mounted',
  'Vehicle', 'Monster', 'Transport', 'Other',
] as const;

// Stained-glass vibrant palette for 40k
const W40K_STRIPE_COLORS: Record<string, string> = {
  'Epic Hero': 'border-l-yellow-300',
  'Character': 'border-l-amber-400',
  'Battleline': 'border-l-emerald-400',
  'Infantry': 'border-l-blue-400',
  'Mounted': 'border-l-orange-400',
  'Vehicle': 'border-l-rose-400',
  'Monster': 'border-l-purple-400',
  'Dedicated Transport': 'border-l-teal-400',
  'Fortification': 'border-l-stone-400',
  'Allied': 'border-l-gray-400',
};

const W40K_FILL_COLORS: Record<string, string> = {
  'Epic Hero': 'bg-yellow-300/70',
  'Character': 'bg-amber-400/70',
  'Battleline': 'bg-emerald-400/70',
  'Infantry': 'bg-blue-400/70',
  'Mounted': 'bg-orange-400/70',
  'Vehicle': 'bg-rose-400/70',
  'Monster': 'bg-purple-400/70',
  'Dedicated Transport': 'bg-teal-400/70',
  'Fortification': 'bg-stone-400/70',
  'Allied': 'bg-gray-400/70',
};

const W40K_CARD_TINTS: Record<string, string> = {
  'Epic Hero': 'card-tint-gold',
  'Character': 'card-tint-amber',
  'Battleline': 'card-tint-emerald',
  'Infantry': 'card-tint-blue',
  'Mounted': 'card-tint-orange',
  'Vehicle': 'card-tint-rose',
  'Monster': 'card-tint-purple',
  'Dedicated Transport': 'card-tint-teal',
  'Fortification': '',
  'Allied': '',
};

const W40K_FILTER_COLORS: Record<string, { active: string; inactive: string; dot: string }> = {
  'All': {
    active: 'border-amber-400/40 bg-amber-500/15 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.1)]',
    inactive: 'hover:border-amber-400/20 hover:text-amber-300/80',
    dot: 'bg-amber-400',
  },
  'Character': {
    active: 'border-amber-400/40 bg-amber-500/18 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.08)]',
    inactive: 'hover:border-amber-400/20 hover:text-amber-300/80',
    dot: 'bg-amber-400',
  },
  'Battleline': {
    active: 'border-emerald-400/40 bg-emerald-400/18 text-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.08)]',
    inactive: 'hover:border-emerald-400/20 hover:text-emerald-300/80',
    dot: 'bg-emerald-400',
  },
  'Infantry': {
    active: 'border-blue-400/40 bg-blue-400/18 text-blue-200 shadow-[0_0_8px_rgba(96,165,250,0.08)]',
    inactive: 'hover:border-blue-400/20 hover:text-blue-300/80',
    dot: 'bg-blue-400',
  },
  'Mounted': {
    active: 'border-orange-400/40 bg-orange-400/18 text-orange-200 shadow-[0_0_8px_rgba(251,146,60,0.08)]',
    inactive: 'hover:border-orange-400/20 hover:text-orange-300/80',
    dot: 'bg-orange-400',
  },
  'Vehicle': {
    active: 'border-rose-400/40 bg-rose-400/18 text-rose-200 shadow-[0_0_8px_rgba(251,113,133,0.08)]',
    inactive: 'hover:border-rose-400/20 hover:text-rose-300/80',
    dot: 'bg-rose-400',
  },
  'Monster': {
    active: 'border-purple-400/40 bg-purple-400/18 text-purple-200 shadow-[0_0_8px_rgba(192,132,252,0.08)]',
    inactive: 'hover:border-purple-400/20 hover:text-purple-300/80',
    dot: 'bg-purple-400',
  },
  'Transport': {
    active: 'border-teal-400/40 bg-teal-400/18 text-teal-200 shadow-[0_0_8px_rgba(45,212,191,0.08)]',
    inactive: 'hover:border-teal-400/20 hover:text-teal-300/80',
    dot: 'bg-teal-400',
  },
  'Other': {
    active: 'border-stone-400/40 bg-stone-400/18 text-stone-200 shadow-[0_0_8px_rgba(168,162,158,0.08)]',
    inactive: 'hover:border-stone-400/20 hover:text-stone-300/80',
    dot: 'bg-stone-400',
  },
};

export const W40K_CONFIG: GameConfig = {
  id: '40k10e',
  name: 'Warhammer 40,000 — 10th Edition',
  shortName: 'Warhammer 40k',
  factionLabel: 'Genestealer Cults',

  slots: W40K_SLOTS,
  displayGroups: W40K_DISPLAY_GROUPS,
  displayGroupOrder: W40K_DISPLAY_GROUP_ORDER,
  nativeToDisplayGroup: buildNativeToDisplayGroup(W40K_DISPLAY_GROUPS),

  slotStripeColors: W40K_STRIPE_COLORS,
  slotFillColors: W40K_FILL_COLORS,
  slotCardTints: W40K_CARD_TINTS,
  filterColors: W40K_FILTER_COLORS,

  hasLeaderAttachment: true,
  hasDetachmentRule: true,
  hasDoctrine: false,
  hasCompositionBudget: false,
  hasPointsBrackets: true,

  pointsOptions: [
    { label: 'Combat Patrol (500)', value: 500 },
    { label: 'Incursion (1,000)', value: 1000 },
    { label: 'Strike Force (2,000)', value: 2000 },
    { label: 'Onslaught (3,000)', value: 3000 },
  ],
  defaultPointsLimit: 2000,

  themes: ['gothic', 'dataslate'],
  defaultTheme: 'gothic',
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const GAME_CONFIGS: Record<GameSystemId, GameConfig> = {
  hh3: HH3_CONFIG,
  '40k10e': W40K_CONFIG,
};

export function getGameConfig(id: GameSystemId): GameConfig {
  return GAME_CONFIGS[id];
}
