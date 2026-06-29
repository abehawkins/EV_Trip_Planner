import type { TripPoint, TripRoute, ChargeStop } from './ev-store';

export interface SavedTrip {
  id: string;
  name: string;
  origin: TripPoint;
  destination: TripPoint;
  route: TripRoute;
  chargeStops: ChargeStop[];
  rangeMiles: number;
  savedAt: string;
}

const STORAGE_KEY = 'ev-saved-trips';

export function getSavedTrips(): SavedTrip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedTrip[];
  } catch {
    return [];
  }
}

export function saveTrip(trip: Omit<SavedTrip, 'id' | 'savedAt'>): SavedTrip {
  const saved: SavedTrip = {
    ...trip,
    id: `trip-${Date.now()}`,
    savedAt: new Date().toISOString(),
  };
  const trips = getSavedTrips();
  trips.unshift(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  return saved;
}

export function deleteSavedTrip(id: string): void {
  const trips = getSavedTrips().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

export function renameSavedTrip(id: string, name: string): void {
  const trips = getSavedTrips();
  const trip = trips.find((t) => t.id === id);
  if (trip) {
    trip.name = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }
}
