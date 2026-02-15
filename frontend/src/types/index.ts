export interface UnitConstraint {
  type: string;
  value: number;
  scope: string;
}

export interface Unit {
  id: number;
  bs_id: string;
  name: string;
  unit_type: string; // Native HH3 slot name (e.g., "Armour", "Recon")
  bsdata_category: string | null;
  base_cost: number;
  profiles: string | null;
  rules: string | null;
  constraints: UnitConstraint[] | null;
  model_min: number;
  model_max: number | null;
  is_legacy: boolean;
}

export interface Upgrade {
  id: number;
  bs_id: string;
  name: string;
  cost: number;
  upgrade_type: string | null;
}

export interface UpgradeGroup {
  group_name: string;
  min_quantity: number;
  max_quantity: number;
  upgrades: Upgrade[];
}

export interface UnitUpgradesResponse {
  groups: UpgradeGroup[];
  ungrouped: Upgrade[];
}

export interface Detachment {
  id: number;
  bs_id: string;
  name: string;
  type: string;
  faction: string | null;
  constraints: Record<string, { min: number; max: number }>;
  unit_restrictions: Record<string, string>;
  costs: { auxiliary?: number; apex?: number };
}

export interface SlotStatus {
  min: number;
  max: number;
  filled: number;
  restriction: string | null;
}

export interface RosterDetachmentResponse {
  id: number;
  name: string;
  type: string;
  detachment_id: number;
  slots: Record<string, SlotStatus>;
  entries: RosterEntryResponse[];
}

export interface CompositionStatus {
  primary_count: number;
  primary_max: number;
  auxiliary_budget: number;
  auxiliary_used: number;
  apex_budget: number;
  apex_used: number;
  warlord_available: boolean;
  warlord_count: number;
}

export interface RosterResponse {
  id: number;
  name: string;
  points_limit: number;
  total_points: number;
  is_valid: boolean;
  validation_errors: string[] | null;
  detachments: RosterDetachmentResponse[];
  composition: CompositionStatus;
}

export interface RosterEntryResponse {
  id: number;
  unit_id: number;
  unit_name: string;
  quantity: number;
  upgrades: SelectedUpgrade[];
  total_cost: number;
  category: string; // Native HH3 slot name
  model_min: number;
  model_max: number | null;
}

export interface SelectedUpgrade {
  upgrade_id: string;
  quantity: number;
}

export interface ValidationResponse {
  is_valid: boolean;
  errors: string[];
  total_points: number;
  points_remaining: number;
}

export interface StatBlock {
  name: string;
  M: string;
  WS: string;
  BS: string;
  S: string;
  T: string;
  W: string;
  I: string;
  A: string;
  LD: string;
  SAV: string;
  INV?: string;
}

export interface ParsedProfiles {
  statBlocks: StatBlock[];
  traits: string[];
}

// Native HH3 slot names
export const HH3_SLOTS = [
  'High Command', 'Command', 'Troops', 'Elites', 'Retinue',
  'Fast Attack', 'Recon', 'Support', 'Armour', 'Heavy Assault',
  'War-engine', 'Transport', 'Heavy Transport', 'Lord of War',
] as const;

export type HH3Slot = (typeof HH3_SLOTS)[number];

// Display groups for unit browser filter pills
export const SLOT_DISPLAY_GROUPS: Record<string, readonly string[]> = {
  'HQ': ['High Command', 'Command'],
  'Troops': ['Troops'],
  'Elites': ['Elites', 'Retinue'],
  'Fast Attack': ['Fast Attack', 'Recon'],
  'Heavy Support': ['Support', 'Armour', 'Heavy Assault', 'War-engine'],
  'Dedicated Transport': ['Transport', 'Heavy Transport'],
  'Lord of War': ['Lord of War'],
} as const;

export const DISPLAY_GROUP_ORDER = [
  'HQ', 'Troops', 'Elites', 'Fast Attack',
  'Heavy Support', 'Dedicated Transport', 'Lord of War',
] as const;

export type DisplayGroup = (typeof DISPLAY_GROUP_ORDER)[number];

// Category-colored left stripe for unit/entry cards
export const SLOT_STRIPE_COLORS: Record<string, string> = {
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

// Background fill colors for slot progress bars (native slot names)
export const SLOT_FILL_COLORS: Record<string, string> = {
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

// Card background tint class per native slot (subtle gradient wash from stripe edge)
export const SLOT_CARD_TINTS: Record<string, string> = {
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

// Reverse mapping: native slot name → display group
export const NATIVE_TO_DISPLAY_GROUP: Record<string, string> = Object.entries(SLOT_DISPLAY_GROUPS)
  .reduce((acc, [group, slots]) => {
    for (const slot of slots) acc[slot] = group;
    return acc;
  }, {} as Record<string, string>);

// Color config for CategoryFilter buttons per display group
export const FILTER_COLORS: Record<string, { active: string; inactive: string; dot: string }> = {
  'All': {
    active: 'border-gold-500/40 bg-gold-600/15 text-gold-300 shadow-[0_0_8px_rgba(158,124,52,0.1)]',
    inactive: 'hover:border-gold-500/20 hover:text-gold-400/80',
    dot: 'bg-gold-500',
  },
  'HQ': {
    active: 'border-purple-500/40 bg-purple-500/12 text-purple-300 shadow-[0_0_8px_rgba(147,51,234,0.08)]',
    inactive: 'hover:border-purple-500/20 hover:text-purple-400/80',
    dot: 'bg-purple-500',
  },
  'Troops': {
    active: 'border-emerald-500/40 bg-emerald-500/12 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.08)]',
    inactive: 'hover:border-emerald-500/20 hover:text-emerald-400/80',
    dot: 'bg-emerald-500',
  },
  'Elites': {
    active: 'border-blue-500/40 bg-blue-500/12 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.08)]',
    inactive: 'hover:border-blue-500/20 hover:text-blue-400/80',
    dot: 'bg-blue-500',
  },
  'Fast Attack': {
    active: 'border-orange-500/40 bg-orange-500/12 text-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.08)]',
    inactive: 'hover:border-orange-500/20 hover:text-orange-400/80',
    dot: 'bg-orange-500',
  },
  'Heavy Support': {
    active: 'border-rose-500/40 bg-rose-500/12 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.08)]',
    inactive: 'hover:border-rose-500/20 hover:text-rose-400/80',
    dot: 'bg-rose-500',
  },
  'Dedicated Transport': {
    active: 'border-teal-500/40 bg-teal-500/12 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.08)]',
    inactive: 'hover:border-teal-500/20 hover:text-teal-400/80',
    dot: 'bg-teal-500',
  },
  'Lord of War': {
    active: 'border-gold-500/40 bg-gold-600/15 text-gold-300 shadow-[0_0_8px_rgba(158,124,52,0.1)]',
    inactive: 'hover:border-gold-500/20 hover:text-gold-400/80',
    dot: 'bg-gold-500',
  },
};
