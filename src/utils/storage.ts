import { VisitedGym, Badge } from '../types';

const STORAGE_KEY = 'fp_tour_de_france_visited_gyms_v2';

// Defensive schema validation to prevent corrupt data or injection
function sanitizeGyms(items: any[]): VisitedGym[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is VisitedGym => {
    return (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.city === 'string' &&
      typeof item.visitDate === 'string' &&
      typeof item.rating === 'number' &&
      typeof item.lat === 'number' &&
      !isNaN(item.lat) &&
      typeof item.lng === 'number' &&
      !isNaN(item.lng)
    );
  });
}

export function getSavedGyms(): VisitedGym[] {
  try {
    // Clear old sample cache if present
    localStorage.removeItem('fp_tour_de_france_visited_gyms');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    return sanitizeGyms(parsed);
  } catch (e) {
    console.error('Error reading localStorage', e);
    return [];
  }
}

export function saveGyms(gyms: VisitedGym[]): void {
  try {
    const sanitized = sanitizeGyms(gyms);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Error saving to localStorage', e);
  }
}

export function calculateBadges(gyms: VisitedGym[]): Badge[] {
  const total = gyms.length;
  const uniqueRegions = new Set(gyms.map((g) => g.region)).size;
  const hasParis = gyms.some((g) => g.region === 'Île-de-France');
  const hasSud = gyms.some((g) => g.region === "Provence-Alpes-Côte d'Azur" || g.region === 'Occitanie');
  const hasFiveStars = gyms.some((g) => g.rating === 5);

  return [
    {
      id: 'first_stop',
      title: 'Grand Départ',
      description: 'Premier Fitness Park validé sur la route !',
      icon: '🚀',
      unlocked: total >= 1,
      progress: Math.min(total, 1),
      target: 1,
    },
    {
      id: 'paris',
      title: 'La Capitale',
      description: 'Une séance validée en Île-de-France.',
      icon: '🗼',
      unlocked: hasParis,
      progress: hasParis ? 1 : 0,
      target: 1,
    },
    {
      id: 'sun_south',
      title: 'Cap au Sud',
      description: 'Séance sous le soleil du Sud (PACA ou Occitanie).',
      icon: '☀️',
      unlocked: hasSud,
      progress: hasSud ? 1 : 0,
      target: 1,
    },
    {
      id: 'nomad_regions',
      title: 'Nomade du Fitness',
      description: 'Validé des salles dans au moins 3 régions de France.',
      icon: '🗺️',
      unlocked: uniqueRegions >= 3,
      progress: Math.min(uniqueRegions, 3),
      target: 3,
    },
    {
      id: 'club_five',
      title: 'Club des 5',
      description: '5 Fitness Park conquis à travers le pays.',
      icon: '🔥',
      unlocked: total >= 5,
      progress: Math.min(total, 5),
      target: 5,
    },
    {
      id: 'queen_tour',
      title: 'Reine du Tour',
      description: '10 Fitness Park différents validés !',
      icon: '👑',
      unlocked: total >= 10,
      progress: Math.min(total, 10),
      target: 10,
    },
    {
      id: 'five_stars',
      title: 'Coup de Cœur',
      description: 'A trouvé et noté sa salle préférée 5 étoiles.',
      icon: '⭐',
      unlocked: hasFiveStars,
      progress: hasFiveStars ? 1 : 0,
      target: 1,
    },
  ];
}
