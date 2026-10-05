import { VisitedGym } from '../types';
import { getDistanceKm } from './geo';
import { FITNESS_PARK_DIRECTORY } from '../data/fitnessParkDirectory';

export const TOTAL_FP_FRANCE = FITNESS_PARK_DIRECTORY.length;

export interface PlayerStats {
  unlockedCount: number;
  totalClubs: number;
  percentage: number;
  uniqueRegions: number;
  uniqueCities: number;
  cumulatedDistanceKm: number;
  level: number;
  levelTitle: string;
  nextLevelThreshold: number;
  nextLevelRemaining: number;
}

export function computePlayerStats(gyms: VisitedGym[]): PlayerStats {
  const unlockedCount = gyms.length;
  const percentage = Math.round((unlockedCount / TOTAL_FP_FRANCE) * 100);

  const uniqueRegions = new Set(gyms.map((g) => g.region)).size;
  const uniqueCities = new Set(gyms.map((g) => g.city.toLowerCase())).size;

  // Compute road trip distance between consecutive visits
  let cumulatedDistanceKm = 0;
  if (gyms.length > 1) {
    const sorted = [...gyms].sort(
      (a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      cumulatedDistanceKm += getDistanceKm(
        sorted[i].lat,
        sorted[i].lng,
        sorted[i + 1].lat,
        sorted[i + 1].lng
      );
    }
  }

  // Video-game ranks
  let level = 1;
  let levelTitle = 'Recrue';
  let nextLevelThreshold = 3;

  if (unlockedCount >= 20) {
    level = 5;
    levelTitle = 'Légende du Tour';
    nextLevelThreshold = TOTAL_FP_FRANCE;
  } else if (unlockedCount >= 10) {
    level = 4;
    levelTitle = 'Reine du Tour';
    nextLevelThreshold = 20;
  } else if (unlockedCount >= 6) {
    level = 3;
    levelTitle = 'Aventurière';
    nextLevelThreshold = 10;
  } else if (unlockedCount >= 3) {
    level = 2;
    levelTitle = 'Exploratrice';
    nextLevelThreshold = 6;
  }

  const nextLevelRemaining = Math.max(0, nextLevelThreshold - unlockedCount);

  return {
    unlockedCount,
    totalClubs: TOTAL_FP_FRANCE,
    percentage,
    uniqueRegions,
    uniqueCities,
    cumulatedDistanceKm: Math.round(cumulatedDistanceKm),
    level,
    levelTitle,
    nextLevelThreshold,
    nextLevelRemaining,
  };
}
