import { FitnessParkClub } from '../types';
import { FITNESS_PARK_DIRECTORY } from '../data/fitnessParkDirectory';

// Haversine formula to compute distance between two GPS points in kilometers
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest club from coordinates
export function findNearestFitnessPark(lat: number, lng: number): { club: FitnessParkClub; distanceKm: number } | null {
  if (!FITNESS_PARK_DIRECTORY.length) return null;

  let nearest = FITNESS_PARK_DIRECTORY[0];
  let minDistance = getDistanceKm(lat, lng, nearest.lat, nearest.lng);

  for (let i = 1; i < FITNESS_PARK_DIRECTORY.length; i++) {
    const club = FITNESS_PARK_DIRECTORY[i];
    const dist = getDistanceKm(lat, lng, club.lat, club.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = club;
    }
  }

  return { club: nearest, distanceKm: Math.round(minDistance * 10) / 10 };
}

// Popular international cities cache for instant offline geocoding
const POPULAR_INTERNATIONAL_CITIES: Record<string, { lat: number; lng: number; region: string }> = {
  // UK
  'london': { lat: 51.5074, lng: -0.1278, region: 'Royaume-Uni' },
  'londres': { lat: 51.5074, lng: -0.1278, region: 'Royaume-Uni' },
  'manchester': { lat: 53.4808, lng: -2.2426, region: 'Royaume-Uni' },
  'birmingham': { lat: 52.4862, lng: -1.8904, region: 'Royaume-Uni' },
  'liverpool': { lat: 53.4084, lng: -2.9916, region: 'Royaume-Uni' },
  'edinburgh': { lat: 55.9533, lng: -3.1883, region: 'Royaume-Uni' },
  'edimbourg': { lat: 55.9533, lng: -3.1883, region: 'Royaume-Uni' },
  'bristol': { lat: 51.4545, lng: -2.5879, region: 'Royaume-Uni' },
  // Espagne
  'madrid': { lat: 40.4168, lng: -3.7038, region: 'Espagne' },
  'barcelona': { lat: 41.3879, lng: 2.1699, region: 'Espagne' },
  'barcelone': { lat: 41.3879, lng: 2.1699, region: 'Espagne' },
  'valencia': { lat: 39.4699, lng: -0.3763, region: 'Espagne' },
  'valence': { lat: 39.4699, lng: -0.3763, region: 'Espagne' },
  'sevilla': { lat: 37.3891, lng: -5.9845, region: 'Espagne' },
  'seville': { lat: 37.3891, lng: -5.9845, region: 'Espagne' },
  'malaga': { lat: 36.7213, lng: -4.4214, region: 'Espagne' },
  'zaragoza': { lat: 41.6488, lng: -0.8891, region: 'Espagne' },
  'saragosse': { lat: 41.6488, lng: -0.8891, region: 'Espagne' },
  'bilbao': { lat: 43.2630, lng: -2.9350, region: 'Espagne' },
  'alicante': { lat: 38.3452, lng: -0.4810, region: 'Espagne' },
  'mallorca': { lat: 39.5696, lng: 2.6502, region: 'Espagne' },
  'majorque': { lat: 39.5696, lng: 2.6502, region: 'Espagne' },
  'ibiza': { lat: 38.9067, lng: 1.4206, region: 'Espagne' },
  // Portugal
  'lisboa': { lat: 38.7223, lng: -9.1393, region: 'Portugal' },
  'lisbonne': { lat: 38.7223, lng: -9.1393, region: 'Portugal' },
  'porto': { lat: 41.1579, lng: -8.6291, region: 'Portugal' },
  // Benelux & Suisse
  'bruxelles': { lat: 50.8503, lng: 4.3517, region: 'Belgique' },
  'brussels': { lat: 50.8503, lng: 4.3517, region: 'Belgique' },
  'liege': { lat: 50.6326, lng: 5.5797, region: 'Belgique' },
  'amsterdam': { lat: 52.3676, lng: 4.9041, region: 'Pays-Bas' },
  'geneve': { lat: 46.2044, lng: 6.1432, region: 'Suisse' },
  'lausanne': { lat: 46.5197, lng: 6.6323, region: 'Suisse' },
  'zurich': { lat: 47.3769, lng: 8.5417, region: 'Suisse' },
  // Italie & Allemagne
  'rome': { lat: 41.9028, lng: 12.4964, region: 'Italie' },
  'roma': { lat: 41.9028, lng: 12.4964, region: 'Italie' },
  'milan': { lat: 45.4642, lng: 9.1900, region: 'Italie' },
  'berlin': { lat: 52.5200, lng: 13.4050, region: 'Allemagne' },
  'munich': { lat: 48.1351, lng: 11.5820, region: 'Allemagne' },
  // Maghreb
  'casablanca': { lat: 33.5731, lng: -7.5898, region: 'Maroc' },
  'marrakech': { lat: 31.6295, lng: -7.9811, region: 'Maroc' },
  'rabat': { lat: 34.0209, lng: -6.8416, region: 'Maroc' },
  'tanger': { lat: 35.7595, lng: -5.8340, region: 'Maroc' },
  'tunis': { lat: 36.8065, lng: 10.1815, region: 'Tunisie' },
  'alger': { lat: 36.7538, lng: 3.0588, region: 'Algérie' },
  // Autres
  'dubai': { lat: 25.2048, lng: 55.2708, region: 'Émirats Arabes Unis' },
  'montreal': { lat: 45.5017, lng: -73.5673, region: 'Canada' },
  'new york': { lat: 40.7128, lng: -74.0060, region: 'États-Unis' },
};

export async function geocodeLocation(cityNameOrQuery?: string): Promise<{ lat: number; lng: number; region: string }> {
  if (!cityNameOrQuery || !cityNameOrQuery.trim()) {
    return { lat: 46.7, lng: 2.3, region: 'France' };
  }

  const clean = cityNameOrQuery
    .toLowerCase()
    .replace(/^fitness\s+park\s+/i, '')
    .trim();

  if (!clean) {
    return { lat: 46.7, lng: 2.3, region: 'France' };
  }

  // 0. Instant directory match (0ms)
  const dirMatch = FITNESS_PARK_DIRECTORY.find(
    (c) =>
      c.city.toLowerCase() === clean ||
      c.name.toLowerCase().includes(clean) ||
      clean.includes(c.city.toLowerCase())
  );
  if (dirMatch) {
    return { lat: dirMatch.lat, lng: dirMatch.lng, region: dirMatch.region };
  }

  // 1. Direct offline lookup for major world cities (0ms)
  for (const [key, val] of Object.entries(POPULAR_INTERNATIONAL_CITIES)) {
    if (clean.includes(key)) {
      return val;
    }
  }

  // 2. Client-side Nominatim lookup with 1s timeout
  let timeoutId: any;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 1000);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(clean)}`,
      { signal: controller.signal }
    );

    if (resp && resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          const displayName = item.display_name || '';
          const parts = displayName.split(',').map((s: string) => s.trim());
          const country = parts[parts.length - 1] || 'International';
          return { lat, lng, region: country };
        }
      }
    }
  } catch {
    // Timeout or network fallback
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  // 3. Fallback
  return { lat: 46.7, lng: 2.3, region: 'International' };
}

// XSS Sanitizer for safe string rendering in HTML
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
