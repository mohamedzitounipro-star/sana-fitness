export interface FitnessParkClub {
  id: string;
  name: string;
  city: string;
  region: string;
  postalCode?: string;
  lat: number;
  lng: number;
}

export interface VisitedGym {
  id: string;
  clubId?: string;
  name: string;
  city: string;
  region: string;
  visitDate: string; // YYYY-MM-DD
  rating: number; // 1 to 5
  note?: string; // Quick personal impressions
  workoutType?: string; // Leg Day, Upper Body, Cardio, Full Body, etc.
  lat: number;
  lng: number;
  createdAt: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
}
