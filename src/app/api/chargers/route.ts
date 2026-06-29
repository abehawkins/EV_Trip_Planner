import { NextRequest, NextResponse } from 'next/server';

const NREL_API = 'https://developer.nrel.gov/api/alt-fuel-stations/v1';

// Fallback station data covering major US corridors and metro areas.
// Used when NREL API is rate-limited (DEMO_KEY: 30 req/hr) or unreachable.
const SAMPLE_STATIONS = [
  // Oregon — Portland metro
  { id: 100, name: "Electrify America - Clackamas Town Center", street: "12000 SE 82nd Ave", city: "Portland", state: "OR", zip: "97086", lat: 45.4407, lng: -122.5706, ev_charging_level: "dc_fast", ev_dc_fast_num: 10, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 101, name: "Tesla Supercharger - Portland Lloyd Center", street: "1212 NE 2nd Ave", city: "Portland", state: "OR", zip: "97232", lat: 45.5309, lng: -122.6571, ev_charging_level: "dc_fast", ev_dc_fast_num: 16, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 102, name: "EVgo - Portland Convention Center", street: "777 NE MLK Jr Blvd", city: "Portland", state: "OR", zip: "97232", lat: 45.5297, lng: -122.6612, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 100 },
  { id: 103, name: "ChargePoint - Portland Pearl District", street: "1120 NW Couch St", city: "Portland", state: "OR", zip: "97209", lat: 45.5239, lng: -122.6816, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 8, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2 },
  { id: 104, name: "Electrify America - Woodburn Premium Outlets", street: "1001 Arney Rd", city: "Woodburn", state: "OR", zip: "97071", lat: 45.1456, lng: -122.8564, ev_charging_level: "dc_fast", ev_dc_fast_num: 10, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 105, name: "ChargePoint - Tigard", street: "13500 SW Pacific Hwy", city: "Tigard", state: "OR", zip: "97223", lat: 45.4252, lng: -122.7709, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 2, station_entity_name: "ChargePoint", ev_connector_types: "CCS", power_kw: 62.5 },
  // Oregon — I-5 corridor
  { id: 110, name: "Tesla Supercharger - Salem", street: "3303 Lancaster Dr NE", city: "Salem", state: "OR", zip: "97305", lat: 44.9559, lng: -122.9999, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 111, name: "Electrify America - Salem", street: "831 Lancaster Dr NE", city: "Salem", state: "OR", zip: "97301", lat: 44.9448, lng: -123.0025, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 112, name: "EVgo - Albany", street: "1830 SE 14th Ave", city: "Albany", state: "OR", zip: "97322", lat: 44.6237, lng: -123.0868, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 100 },
  { id: 113, name: "Tesla Supercharger - Eugene", street: "100 Valley River Way", city: "Eugene", state: "OR", zip: "97401", lat: 44.0804, lng: -123.1165, ev_charging_level: "dc_fast", ev_dc_fast_num: 16, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 114, name: "Electrify America - Eugene", street: "2795 Chad Dr", city: "Eugene", state: "OR", zip: "97408", lat: 44.0879, lng: -123.0493, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 115, name: "ChargePoint - Corvallis", street: "2350 NW Kings Blvd", city: "Corvallis", state: "OR", zip: "97330", lat: 44.5929, lng: -123.2843, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 4, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2 },
  // Oregon — Hwy 58 / Crescent Lake corridor (Portland to Crescent Lake route)
  { id: 120, name: "ChargePoint - Oakridge", street: "47663 Hwy 58", city: "Oakridge", state: "OR", zip: "97463", lat: 43.7465, lng: -122.4612, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 4, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2 },
  { id: 121, name: "Tesla Supercharger - Springfield", street: "3150 Gateway St", city: "Springfield", state: "OR", zip: "97477", lat: 44.0569, lng: -123.0174, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 122, name: "Electrify America - Springfield", street: "975 Kruse Way", city: "Springfield", state: "OR", zip: "97477", lat: 44.0461, lng: -122.9625, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  // Oregon — Central / Bend area
  { id: 130, name: "Tesla Supercharger - Bend", street: "61535 S Hwy 97", city: "Bend", state: "OR", zip: "97702", lat: 44.0155, lng: -121.3155, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 131, name: "Electrify America - Bend", street: "3188 N Hwy 97", city: "Bend", state: "OR", zip: "97703", lat: 44.0923, lng: -121.3025, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 132, name: "ChargePoint - Bend Old Mill", street: "550 SW Industrial Way", city: "Bend", state: "OR", zip: "97702", lat: 44.0520, lng: -121.3132, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 6, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2 },
  { id: 133, name: "Blink - Redmond", street: "1841 NW 6th St", city: "Redmond", state: "OR", zip: "97756", lat: 44.2821, lng: -121.1818, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 2, station_entity_name: "Blink", ev_connector_types: "J1772", power_kw: 7.2 },
  { id: 134, name: "Tesla Supercharger - La Pine", street: "51490 Hwy 97", city: "La Pine", state: "OR", zip: "97739", lat: 43.6746, lng: -121.5065, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  // Oregon — Klamath Falls / Southern
  { id: 140, name: "Tesla Supercharger - Klamath Falls", street: "2500 S 6th St", city: "Klamath Falls", state: "OR", zip: "97601", lat: 42.1977, lng: -121.7478, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 141, name: "ChargePoint - Klamath Falls", street: "2610 Washburn Way", city: "Klamath Falls", state: "OR", zip: "97603", lat: 42.2063, lng: -121.7237, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 4, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2 },
  { id: 142, name: "Electrify America - Chemult", street: "110315 Hwy 97 N", city: "Chemult", state: "OR", zip: "97731", lat: 43.2316, lng: -121.7823, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS", power_kw: 150 },
  // Oregon — Coast & other
  { id: 150, name: "EVgo - Roseburg", street: "2190 NW Stewart Pkwy", city: "Roseburg", state: "OR", zip: "97471", lat: 43.2384, lng: -123.3606, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 100 },
  { id: 151, name: "Tesla Supercharger - Grants Pass", street: "171 NE Morgan Ln", city: "Grants Pass", state: "OR", zip: "97526", lat: 42.4655, lng: -123.3068, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 152, name: "Tesla Supercharger - Medford", street: "1380 Center Dr", city: "Medford", state: "OR", zip: "97501", lat: 42.3372, lng: -122.8546, ev_charging_level: "dc_fast", ev_dc_fast_num: 16, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  // Washington — Seattle / I-5
  { id: 200, name: "Electrify America - Seattle Center", street: "305 Harrison St", city: "Seattle", state: "WA", zip: "98109", lat: 47.6205, lng: -122.3493, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 201, name: "Tesla Supercharger - Tacoma", street: "4502 S Steele St", city: "Tacoma", state: "WA", zip: "98409", lat: 47.2218, lng: -122.4658, ev_charging_level: "dc_fast", ev_dc_fast_num: 20, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 202, name: "Electrify America - Olympia", street: "625 Black Lake Blvd SW", city: "Olympia", state: "WA", zip: "98502", lat: 46.9963, lng: -122.9289, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 203, name: "Tesla Supercharger - Centralia", street: "1344 Lum Rd", city: "Centralia", state: "WA", zip: "98531", lat: 46.7262, lng: -122.9502, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 204, name: "EVgo - Kelso", street: "505 Three Rivers Dr", city: "Kelso", state: "WA", zip: "98626", lat: 46.1149, lng: -122.8846, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 100 },
  { id: 205, name: "Tesla Supercharger - Vancouver WA", street: "8700 NE Vancouver Mall Dr", city: "Vancouver", state: "WA", zip: "98662", lat: 45.6388, lng: -122.5999, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  // California — Northern / I-5
  { id: 300, name: "Tesla Supercharger - Redding", street: "1750 Hilltop Dr", city: "Redding", state: "CA", zip: "96002", lat: 40.5682, lng: -122.3475, ev_charging_level: "dc_fast", ev_dc_fast_num: 16, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 301, name: "Electrify America - Sacramento", street: "3615 N Freeway Blvd", city: "Sacramento", state: "CA", zip: "95834", lat: 38.6408, lng: -121.4960, ev_charging_level: "dc_fast", ev_dc_fast_num: 10, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 302, name: "Tesla Supercharger - San Jose", street: "2012 Airport Blvd", city: "San Jose", state: "CA", zip: "95110", lat: 37.3674, lng: -121.9210, ev_charging_level: "dc_fast", ev_dc_fast_num: 20, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 303, name: "EVgo - San Francisco", street: "548 Market St", city: "San Francisco", state: "CA", zip: "94104", lat: 37.7899, lng: -122.4014, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 350 },
  { id: 304, name: "Electrify America - Santa Monica", street: "1234 4th St", city: "Santa Monica", state: "CA", zip: "90401", lat: 34.0195, lng: -118.4912, ev_charging_level: "dc_fast", ev_dc_fast_num: 10, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO,NACS", power_kw: 150 },
  // Major metros — East Coast, Midwest, South
  { id: 400, name: "Electrify America - Times Square", street: "1530 Broadway", city: "New York", state: "NY", zip: "10036", lat: 40.7577, lng: -73.9881, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 401, name: "Tesla Supercharger - Chicago River North", street: "600 N Kingsbury St", city: "Chicago", state: "IL", zip: "60654", lat: 41.8925, lng: -87.6417, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 402, name: "EVgo - Downtown Austin", street: "200 Congress Ave", city: "Austin", state: "TX", zip: "78701", lat: 30.2655, lng: -97.7426, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 175 },
  { id: 403, name: "Electrify America - Denver", street: "7505 W Colfax Ave", city: "Denver", state: "CO", zip: "80214", lat: 39.7405, lng: -105.0493, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 404, name: "Tesla Supercharger - Miami", street: "3401 N Miami Ave", city: "Miami", state: "FL", zip: "33127", lat: 25.8028, lng: -80.1927, ev_charging_level: "dc_fast", ev_dc_fast_num: 16, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 405, name: "Electrify America - Atlanta", street: "3393 Peachtree Rd NE", city: "Atlanta", state: "GA", zip: "30326", lat: 33.8481, lng: -84.3620, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
  { id: 406, name: "EVgo - Phoenix", street: "5000 N Central Ave", city: "Phoenix", state: "AZ", zip: "85012", lat: 33.5066, lng: -112.0740, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 350 },
  { id: 407, name: "Tesla Supercharger - Las Vegas", street: "3200 Las Vegas Blvd S", city: "Las Vegas", state: "NV", zip: "89109", lat: 36.1271, lng: -115.1708, ev_charging_level: "dc_fast", ev_dc_fast_num: 24, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 408, name: "Tesla Supercharger - Salt Lake City", street: "150 E 600 S", city: "Salt Lake City", state: "UT", zip: "84111", lat: 40.7531, lng: -111.8844, ev_charging_level: "dc_fast", ev_dc_fast_num: 16, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250 },
  { id: 409, name: "Electrify America - Boise", street: "350 N Milwaukee St", city: "Boise", state: "ID", zip: "83704", lat: 43.6265, lng: -116.2814, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150 },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function transformStation(s: Record<string, unknown>, dist: number) {
  const level = s.ev_charging_level === 'dc_fast' ? 3 : s.ev_charging_level === 'level_2' ? 2 : 1;
  const connectorTypes = ((s.ev_connector_types as string) || '').split(',').filter(Boolean);
  const qty = level === 3
    ? (s.ev_dc_fast_num as number) || 1
    : (s.level2_charging_num as number) || 1;

  const connections = connectorTypes.map((type, i) => ({
    id: (s.id as number) * 100 + i,
    level,
    power: s.power_kw ? parseFloat(String(s.power_kw)) : (level === 3 ? 150 : 7.2),
    type: type.trim(),
    typeId: 0,
    status: 50,
    quantity: connectorTypes.length === 1 ? qty : Math.ceil(qty / connectorTypes.length),
  }));

  return {
    id: s.id,
    name: s.station_name || s.name,
    address: s.street_address || s.street || '',
    city: s.city || '',
    state: s.state || '',
    postcode: s.zip || '',
    lat: s.lat || parseFloat(s.latitude as string) || 0,
    lng: s.lng || parseFloat(s.longitude as string) || 0,
    distance: dist,
    connections,
    operator: s.station_entity_name || '',
    network: '',
    usageCost: (s.expected_price || '') as string,
    status: 50,
    generalComments: '',
    numberOfPoints: qty,
  };
}

function getFallbackChargers(lat: number, lng: number, distance: number, maxresults: number, chargerType: string) {
  let nearby = SAMPLE_STATIONS.map((s) => ({
    ...s,
    _dist: haversineDistance(lat, lng, s.lat, s.lng),
  }))
    .filter((s) => s._dist <= distance)
    .sort((a, b) => a._dist - b._dist)
    .slice(0, maxresults);

  if (chargerType === 'dcfast') {
    nearby = nearby.filter((s) => s.ev_charging_level === 'dc_fast');
  } else if (chargerType === 'level2') {
    nearby = nearby.filter((s) => s.ev_charging_level === 'level_2');
  }

  return nearby.map((s) =>
    transformStation(
      { ...s, station_name: s.name, street_address: s.street, latitude: s.lat.toString(), longitude: s.lng.toString() },
      s._dist
    )
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const distance = parseFloat(searchParams.get('distance') || '30');
  const maxresults = parseInt(searchParams.get('maxresults') || '100');
  const chargerType = searchParams.get('chargerType') || 'all';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  // Try NREL API first
  try {
    const params = new URLSearchParams({
      api_key: process.env.NREL_API_KEY || 'DEMO_KEY',
      fuel_type: 'ELEC',
      latitude: lat.toString(),
      longitude: lng.toString(),
      radius: distance.toString(),
      radius_units: 'mi',
      limit: maxresults.toString(),
      status: 'E',
      access: 'public',
    });

    if (chargerType === 'dcfast') params.set('ev_charging_level', 'dc_fast');
    else if (chargerType === 'level2') params.set('ev_charging_level', 'level_2');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${NREL_API}.json?${params.toString()}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`NREL returned ${response.status}`);

    const data = await response.json();
    const stations = data.fuel_stations || [];

    if (stations.length === 0) {
      // NREL returned OK but no results — merge with fallback
      const fallback = getFallbackChargers(lat, lng, distance, maxresults, chargerType);
      return NextResponse.json({ chargers: fallback, total: fallback.length, source: 'fallback' });
    }

    const chargers = stations.map((s: Record<string, unknown>) =>
      transformStation(s, s.distance ? parseFloat(s.distance as string) : 0)
    );
    return NextResponse.json({ chargers, total: chargers.length, source: 'nrel' });
  } catch {
    // NREL failed (rate limit, timeout, etc.) — use fallback
    const chargers = getFallbackChargers(lat, lng, distance, maxresults, chargerType);
    return NextResponse.json({ chargers, total: chargers.length, source: 'fallback' });
  }
}
