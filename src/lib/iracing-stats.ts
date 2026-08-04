const CAREER_STATS_URL = 'https://iracing6-backend.herokuapp.com/api/member-career-stats/career';

interface RawCategoryStats {
  iRating?: { value?: number };
  safety_rating?: number;
  license_level?: number;
  starts?: number;
  wins?: number;
  top5?: number;
  win_percentage?: number;
  top5_percentage?: number;
  avg_incidents?: number;
}

interface RawCareerStatsResponse {
  road?: RawCategoryStats;
  oval?: RawCategoryStats;
  dirt_road?: RawCategoryStats;
  dirt_oval?: RawCategoryStats;
  sports_car?: RawCategoryStats;
}

export interface CategoryStats {
  iRating?: number;
  safetyRating?: number;
  licenseLevel?: number;
  starts?: number;
  wins?: number;
  top5?: number;
  winPercentage?: number;
  avgIncidents?: number;
}

export type CareerStats = Partial<Record<'road' | 'oval' | 'dirt_road' | 'dirt_oval' | 'sports_car', CategoryStats>>;

const CATEGORY_LABELS: Record<keyof CareerStats, string> = {
  road: 'Road',
  oval: 'Oval',
  dirt_road: 'Dirt Road',
  dirt_oval: 'Dirt Oval',
  sports_car: 'Sports Car',
};

const LICENSE_LABELS: Record<number, string> = {
  1: 'Rookie',
  2: 'D',
  3: 'C',
  4: 'B',
  5: 'A',
  6: 'Pro',
};

// Unofficial, undocumented third-party API (reverse-engineered from iracingdata.com's
// JS bundle) — not an official iRacing service. It can change shape or disappear without
// notice, so parsing here is deliberately defensive (every field optional).
export async function fetchCareerStats(custId: string): Promise<CareerStats> {
  const response = await fetch(`${CAREER_STATS_URL}/${custId}`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Career stats lookup failed with status ${response.status}`);
  }

  const raw = (await response.json()) as RawCareerStatsResponse;
  const stats: CareerStats = {};

  for (const category of Object.keys(CATEGORY_LABELS) as (keyof CareerStats)[]) {
    const c = raw[category];
    if (!c) continue;
    stats[category] = {
      iRating: c.iRating?.value,
      safetyRating: c.safety_rating,
      licenseLevel: c.license_level,
      starts: c.starts,
      wins: c.wins,
      top5: c.top5,
      winPercentage: c.win_percentage,
      avgIncidents: c.avg_incidents,
    };
  }

  return stats;
}

export function formatCareerStatsSummary(stats: CareerStats): string {
  const lines: string[] = [];

  for (const category of Object.keys(CATEGORY_LABELS) as (keyof CareerStats)[]) {
    const c = stats[category];
    if (!c || !c.starts) continue;

    const license = c.licenseLevel !== undefined ? (LICENSE_LABELS[c.licenseLevel] ?? c.licenseLevel) : undefined;
    const parts = [
      c.iRating !== undefined ? `iR ${c.iRating}` : undefined,
      license !== undefined && c.safetyRating !== undefined ? `${license} ${c.safetyRating.toFixed(2)} SR` : undefined,
      `${c.starts} starts`,
      `${c.wins ?? 0} wins`,
      c.winPercentage !== undefined ? `${c.winPercentage.toFixed(1)}% win rate` : undefined,
    ].filter((part): part is string => part !== undefined);

    lines.push(`${CATEGORY_LABELS[category]}: ${parts.join(', ')}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No career starts on record yet.';
}
