import { ChargerConnection } from '@/lib/ev-store';

export function getConnectionLabel(level: number): string {
  switch (level) {
    case 1: return 'Level 1';
    case 2: return 'Level 2';
    case 3: return 'DC Fast';
    default: return 'Unknown';
  }
}

export function getConnectionColor(level: number): string {
  switch (level) {
    case 1: return '#94a3b8'; // slate
    case 2: return '#22c55e'; // green
    case 3: return '#f97316'; // orange
    default: return '#64748b';
  }
}

export function getLevelIcon(level: number): string {
  switch (level) {
    case 1: return '🔋'; // slow
    case 2: return '⚡'; // medium
    case 3: return '🚀'; // fast
    default: return '❓';
  }
}

export function getMaxPower(connections: ChargerConnection[]): number | null {
  if (!connections || connections.length === 0) return null;
  const powers = connections
    .map((c) => c.power)
    .filter((p): p is number => p !== null && p > 0);
  return powers.length > 0 ? Math.max(...powers) : null;
}

export function getTopLevel(connections: ChargerConnection[]): number {
  if (!connections || connections.length === 0) return 0;
  const levels = connections.map((c) => c.level);
  return Math.max(...levels);
}

export function formatDistance(miles: number | null): string {
  if (miles === null || miles === undefined) return '';
  return `${miles.toFixed(1)} mi`;
}

export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

export function milesToDegrees(miles: number, lat: number): number {
  // Approximate: 1 degree latitude ≈ 69 miles
  // 1 degree longitude ≈ 69 * cos(lat) miles
  const latDeg = miles / 69;
  const lngDeg = miles / (69 * Math.cos((lat * Math.PI) / 180));
  return Math.max(latDeg, lngDeg);
}

export function getConnectorTypes(connections: ChargerConnection[]): string[] {
  const types = new Set<string>();
  connections.forEach((c) => {
    if (c.type) types.add(c.type);
  });
  return Array.from(types);
}

export function poiTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    fast_food: 'Fast Food',
    park: 'Park',
    hotel: 'Hotel',
    restroom: 'Restroom',
    supermarket: 'Grocery',
    pharmacy: 'Pharmacy',
    hospital: 'Hospital',
    veterinary: 'Vet Clinic',
    unknown: 'POI',
  };
  return labels[type] || type;
}

export function poiTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    restaurant: '🍽️',
    cafe: '☕',
    fast_food: '🍔',
    park: '🌳',
    hotel: '🏨',
    restroom: '🚻',
    supermarket: '🛒',
    pharmacy: '💊',
    hospital: '🏥',
    veterinary: '🐾',
    unknown: '📍',
  };
  return emojis[type] || '📍';
}