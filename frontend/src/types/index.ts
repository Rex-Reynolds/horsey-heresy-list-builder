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
  'Armour': 'border-l-rose-500',
  'Heavy Assault': 'border-l-rose-500',
  'War-engine': 'border-l-rose-600',
  'Transport': 'border-l-teal-500',
  'Heavy Transport': 'border-l-teal-600',
  'Lord of War': 'border-l-gold-500',
};
