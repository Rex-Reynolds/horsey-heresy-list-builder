import type { ParsedProfiles, StatBlock } from '../types/index.ts';

/**
 * Parse the BSData profiles JSON string into stat blocks and traits.
 *
 * Actual format from the API:
 *   [
 *     { type: "Profile", name: "Legate Marshall", characteristics: { M: "6", WS: "5", ... } },
 *     { type: "Traits",  name: "Solar Auxilia",  characteristics: { Description: "" } },
 *   ]
 */
export function parseProfiles(raw: string | null): ParsedProfiles {
  if (!raw) return { statBlocks: [], traits: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { statBlocks: [], traits: [raw] };
  }

  const statBlocks: StatBlock[] = [];
  const traits: string[] = [];

  if (!Array.isArray(parsed)) return { statBlocks, traits };

  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;

    if (entry.type === 'Profile') {
      const chars = entry.characteristics as Record<string, string> | undefined;
      if (chars) {
        statBlocks.push({
          name: String(entry.name ?? 'Unit'),
          M: chars.M ?? '-',
          WS: chars.WS ?? '-',
          BS: chars.BS ?? '-',
          S: chars.S ?? '-',
          T: chars.T ?? '-',
          W: chars.W ?? '-',
          I: chars.I ?? '-',
          A: chars.A ?? '-',
          LD: chars.LD ?? '-',
          SAV: chars.SAV ?? chars.Sv ?? '-',
          INV: chars.INV ?? undefined,
        });
      }
    } else if (entry.type === 'Traits') {
      const name = String(entry.name ?? '');
      const chars = entry.characteristics as Record<string, string> | undefined;
      const desc = chars?.Description;
      if (name) {
        traits.push(desc ? `${name}: ${desc}` : name);
      }
    }
  }

  return { statBlocks, traits };
}

/**
 * Parse the rules JSON string into displayable rule entries.
 */
export function parseRules(raw: string | null): Array<{ name: string; description: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r: Record<string, unknown>) => r && r.name && !r.hidden)
      .map((r: Record<string, unknown>) => ({
        name: String(r.name),
        description: String(r.description ?? ''),
      }));
  } catch {
    return [];
  }
}
