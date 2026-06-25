import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

const POI_QUERIES: Record<string, string> = {
  restaurant: `node["amenity"="restaurant"](around:{radius},{lat},{lng});out body;`,
  cafe: `node["amenity"="cafe"](around:{radius},{lat},{lng});out body;`,
  fast_food: `node["amenity"="fast_food"](around:{radius},{lat},{lng});out body;`,
  park: `node["leisure"="park"](around:{radius},{lat},{lng});out body;`,
  hotel: `node["tourism"="hotel"](around:{radius},{lat},{lng});out body;`,
  veterinary: `node["amenity"="veterinary"](around:{radius},{lat},{lng});out body;`,
};

// Sample POI data for demo / fallback
const SAMPLE_POIS = [
  // SF Area
  { id: 1001, name: "Tartine Bakery", type: "cafe", lat: 37.7614, lng: -122.4241, dogFriendly: true, outdoorSeating: true, cuisine: "bakery", phone: "", website: "https://tartinebakery.com", openingHours: "" },
  { id: 1002, name: "Taco Bell", type: "fast_food", lat: 37.7752, lng: -122.4182, dogFriendly: false, outdoorSeating: false, cuisine: "mexican", phone: "", website: "", openingHours: "" },
  { id: 1003, name: "Shake Shack", type: "fast_food", lat: 37.7856, lng: -122.4068, dogFriendly: true, outdoorSeating: true, cuisine: "burgers", phone: "", website: "https://shakeshack.com", openingHours: "" },
  { id: 1004, name: "Golden Gate Park", type: "park", lat: 37.7694, lng: -122.4862, dogFriendly: true, outdoorSeating: false, cuisine: "", phone: "", website: "", openingHours: "" },
  { id: 1005, name: "The House of Prime Rib", type: "restaurant", lat: 37.7915, lng: -122.4218, dogFriendly: false, outdoorSeating: false, cuisine: "steakhouse", phone: "", website: "", openingHours: "" },
  { id: 1006, name: "Starbucks Reserve", type: "cafe", lat: 37.7843, lng: -122.4011, dogFriendly: false, outdoorSeating: true, cuisine: "coffee", phone: "", website: "", openingHours: "" },
  { id: 1007, name: "Chipotle", type: "fast_food", lat: 37.7889, lng: -122.4055, dogFriendly: true, outdoorSeating: false, cuisine: "mexican", phone: "", website: "", openingHours: "" },
  { id: 1008, name: "Ferry Building Marketplace", type: "restaurant", lat: 37.7955, lng: -122.3937, dogFriendly: true, outdoorSeating: true, cuisine: "market", phone: "", website: "", openingHours: "" },
  { id: 1009, name: "Blue Bottle Coffee", type: "cafe", lat: 37.7978, lng: -122.3956, dogFriendly: true, outdoorSeating: false, cuisine: "coffee", phone: "", website: "", openingHours: "" },
  { id: 1010, name: "Dolores Park", type: "park", lat: 37.7596, lng: -122.4269, dogFriendly: true, outdoorSeating: false, cuisine: "", phone: "", website: "", openingHours: "" },
  { id: 1011, name: "Nopa Restaurant", type: "restaurant", lat: 37.7744, lng: -122.4335, dogFriendly: true, outdoorSeating: true, cuisine: "american", phone: "", website: "", openingHours: "" },
  { id: 1012, name: "In-N-Out Burger", type: "fast_food", lat: 37.7547, lng: -122.4321, dogFriendly: false, outdoorSeating: false, cuisine: "burgers", phone: "", website: "", openingHours: "" },
  { id: 1013, name: "SF SPCA Veterinary Hospital", type: "veterinary", lat: 37.7731, lng: -122.4258, dogFriendly: true, outdoorSeating: false, cuisine: "", phone: "", website: "", openingHours: "" },
  { id: 1014, name: "Burma Superstar", type: "restaurant", lat: 37.7735, lng: -122.4313, dogFriendly: false, outdoorSeating: false, cuisine: "burmese", phone: "", website: "", openingHours: "" },
  { id: 1015, name: "Philz Coffee", type: "cafe", lat: 37.7515, lng: -122.4133, dogFriendly: true, outdoorSeating: true, cuisine: "coffee", phone: "", website: "", openingHours: "" },
  // NYC Area
  { id: 2001, name: "Shake Shack Madison Square", type: "fast_food", lat: 40.7411, lng: -73.988, dogFriendly: true, outdoorSeating: true, cuisine: "burgers", phone: "", website: "", openingHours: "" },
  { id: 2002, name: "Central Park", type: "park", lat: 40.7829, lng: -73.9654, dogFriendly: true, outdoorSeating: false, cuisine: "", phone: "", website: "", openingHours: "" },
  { id: 2003, name: "Blue Bottle Coffee Chelsea", type: "cafe", lat: 40.7465, lng: -74.0014, dogFriendly: false, outdoorSeating: false, cuisine: "coffee", phone: "", website: "", openingHours: "" },
  { id: 2004, name: "Joe's Pizza", type: "restaurant", lat: 40.7306, lng: -73.9969, dogFriendly: false, outdoorSeating: false, cuisine: "pizza", phone: "", website: "", openingHours: "" },
  // LA Area
  { id: 3001, name: "Intelligentsia Coffee", type: "cafe", lat: 34.019, lng: -118.4978, dogFriendly: true, outdoorSeating: true, cuisine: "coffee", phone: "", website: "", openingHours: "" },
  { id: 3002, name: "In-N-Out Burger LA", type: "fast_food", lat: 33.97, lng: -118.465, dogFriendly: false, outdoorSeating: false, cuisine: "burgers", phone: "", website: "", openingHours: "" },
  { id: 3003, name: "Santa Monica State Beach Park", type: "park", lat: 34.0095, lng: -118.497, dogFriendly: true, outdoorSeating: false, cuisine: "", phone: "", website: "", openingHours: "" },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radius = searchParams.get('radius') || '2000';
  const typesParam = searchParams.get('types') || 'restaurant,cafe,fast_food';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const types = typesParam.split(',');

  // Build Overpass QL query
  const queryParts = types
    .filter((t) => POI_QUERIES[t])
    .map((t) =>
      POI_QUERIES[t]
        .replace('{radius}', radius)
        .replace('{lat}', lat.toString())
        .replace('{lng}', lng.toString())
    );

  // Try Overpass API first
  if (queryParts.length > 0) {
    try {
      const overpassQuery = `
        [out:json][timeout:10];
        (
          ${queryParts.join('\n      ')}
        );
        out center;
      `;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        next: { revalidate: 600 },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const pois = (data.elements || []).map((el: Record<string, unknown>) => ({
          id: el.id,
          name: el.tags?.name || el.tags?.['name:en'] || 'Unnamed',
          type: el.tags?.amenity || el.tags?.leisure || el.tags?.tourism || el.tags?.shop || 'unknown',
          lat: (el.lat as number) || (el.center?.lat as number) || 0,
          lng: (el.lon as number) || (el.center?.lon as number) || 0,
          dogFriendly: el.tags?.dog === 'yes' || el.tags?.dogs === 'yes' || false,
          outdoorSeating: el.tags?.outdoor_seating === 'yes' || false,
          cuisine: el.tags?.cuisine || '',
          phone: el.tags?.phone || '',
          website: el.tags?.website || '',
          openingHours: el.tags?.opening_hours || '',
        }));

        if (pois.length > 0) {
          return NextResponse.json({ pois, total: pois.length });
        }
      }
    } catch {
      // Fall through to sample data
    }
  }

  // Fallback: sample data with proximity filter
  const radiusMiles = parseFloat(radius) / 1609.34;
  let nearby = SAMPLE_POIS
    .filter((p) => types.includes(p.type))
    .map((p) => ({ ...p, _dist: haversineDistance(lat, lng, p.lat, p.lng) }))
    .filter((p) => p._dist <= radiusMiles)
    .sort((a, b) => a._dist - b._dist);

  // Remove the _dist field from output
  const pois = nearby.map(({ _dist: _, ...poi }) => poi);

  return NextResponse.json({ pois, total: pois.length });
}