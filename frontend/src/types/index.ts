export interface Unit {
  id: number;
  bs_id: string;
  name: string;
  unit_type: string;
  bsdata_category: string | null;
  base_cost: number;
  profiles: string | null;
  rules: string | null;
}

export interface Upgrade {
  id: number;
  bs_id: string;
  name: string;
  cost: number;
  upgrade_type: string | null;
}

export interface Detachment {
  id: number;
  bs_id: string;
  name: string;
  type: string;
  faction: string | null;
  constraints: Record<string, { min: number; max: number }>;
  unit_restrictions: Record<string, string>;
}

export interface RosterResponse {
  id: number;
  name: string;
  detachment_type: string;
  points_limit: number;
  total_points: number;
  is_valid: boolean;
  validation_errors: string | null;
}

export interface RosterEntryResponse {
  id: number;
  unit_id: number;
  unit_name: string;
  quantity: number;
  upgrades: SelectedUpgrade[];
  total_cost: number;
  category: string;
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

export const FOC_CATEGORIES = [
  'HQ',
  'Troops',
  'Elites',
  'Fast Attack',
  'Heavy Support',
  'Dedicated Transport',
  'Lord of War',
] as const;

export type FOCCategory = (typeof FOC_CATEGORIES)[number];
