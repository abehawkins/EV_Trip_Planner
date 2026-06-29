import { NextRequest, NextResponse } from 'next/server';

// Try NREL API, fallback to embedded sample data for sandbox/demo
const NREL_API = 'https://developer.nrel.gov/api/alt-fuel-stations/v1';

// Realistic sample data for various metro areas (lat/lng will be used to filter by proximity)
const SAMPLE_STATIONS = [
  // San Francisco Bay Area
  { id: 1, name: "Tesla Supercharger - San Francisco", street: "548 Market St", city: "San Francisco", state: "CA", zip: "94104", lat: 37.7899, lng: -122.4014, ev_charging_level: "dc_fast", ev_dc_fast_num: 16, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250, expected_price: "$0.28/kWh", distance: 2.1 },
  { id: 2, name: "ChargePoint - Union Square", street: "333 Geary St", city: "San Francisco", state: "CA", zip: "94102", lat: 37.7873, lng: -122.4087, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 6, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2, expected_price: "$0.25/kWh", distance: 3.5 },
  { id: 3, name: "EVgo - Embarcadero Center", street: "1 Embarcadero Center", city: "San Francisco", state: "CA", zip: "94111", lat: 37.7955, lng: -122.3937, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 350, expected_price: "$0.35/kWh", distance: 5.2 },
  { id: 4, name: "Electrify America - SFO Airport", street: "San Francisco International Airport", city: "San Francisco", state: "CA", zip: "94128", lat: 37.6213, lng: -122.379, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO,NACS", power_kw: 150, expected_price: "$0.43/kWh", distance: 14.3 },
  { id: 5, name: "ChargePoint - Fisherman's Wharf", street: "2750 Taylor St", city: "San Francisco", state: "CA", zip: "94133", lat: 37.8066, lng: -122.4192, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 4, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 11.5, expected_price: "$0.30/kWh", distance: 6.8 },
  { id: 6, name: "Blink - Golden Gate Park", street: "501 Stanyan St", city: "San Francisco", state: "CA", zip: "94117", lat: 37.77, lng: -122.4529, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 2, station_entity_name: "Blink", ev_connector_types: "J1772", power_kw: 6.6, expected_price: "$0.35/kWh", distance: 8.1 },
  { id: 7, name: "EVgo - Mission Bay", street: "500 Terry Francois Blvd", city: "San Francisco", state: "CA", zip: "94158", lat: 37.7706, lng: -122.3933, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 2, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 175, expected_price: "$0.32/kWh", distance: 4.9 },
  { id: 8, name: "Tesla Supercharger - Fremont", street: "43433 Christy St", city: "Fremont", state: "CA", zip: "94538", lat: 37.5544, lng: -121.9747, ev_charging_level: "dc_fast", ev_dc_fast_num: 24, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250, expected_price: "$0.26/kWh", distance: 28.7 },
  { id: 9, name: "Electrify America - Colma", street: "365 Gellert Blvd", city: "South San Francisco", state: "CA", zip: "94080", lat: 37.647, lng: -122.4628, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 4, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150, expected_price: "$0.38/kWh", distance: 15.6 },
  { id: 10, name: "ChargePoint - Oakland", street: "555 12th St", city: "Oakland", state: "CA", zip: "94607", lat: 37.7975, lng: -122.2726, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 8, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2, expected_price: "$0.22/kWh", distance: 11.4 },
  { id: 11, name: "EVgo - Berkeley", street: "2055 Center St", city: "Berkeley", state: "CA", zip: "94704", lat: 37.8693, lng: -122.2679, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 350, expected_price: "$0.40/kWh", distance: 17.2 },
  { id: 12, name: "Tesla Supercharger - Walnut Creek", street: "1201 Broadway Plaza", city: "Walnut Creek", state: "CA", zip: "94596", lat: 37.9001, lng: -122.0593, ev_charging_level: "dc_fast", ev_dc_fast_num: 20, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250, expected_price: "$0.28/kWh", distance: 24.8 },
  // NYC area
  { id: 20, name: "EVgo - Times Square", street: "1530 Broadway", city: "New York", state: "NY", zip: "10036", lat: 40.7577, lng: -73.9881, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 350, expected_price: "$0.45/kWh", distance: 1.5 },
  { id: 21, name: "ChargePoint - Brooklyn Bridge", street: "300 Cadman Plaza W", city: "Brooklyn", state: "NY", zip: "11201", lat: 40.696, lng: -73.9936, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 4, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2, expected_price: "$0.30/kWh", distance: 3.2 },
  { id: 22, name: "Tesla Supercharger - Chelsea", street: "550 W 30th St", city: "New York", state: "NY", zip: "10001", lat: 40.7513, lng: -74.0048, ev_charging_level: "dc_fast", ev_dc_fast_num: 12, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250, expected_price: "$0.38/kWh", distance: 2.8 },
  // LA area
  { id: 30, name: "Electrify America - Santa Monica", street: "1234 4th St", city: "Santa Monica", state: "CA", zip: "90401", lat: 34.0195, lng: -118.4912, ev_charging_level: "dc_fast", ev_dc_fast_num: 10, level2_charging_num: 4, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO,NACS", power_kw: 150, expected_price: "$0.42/kWh", distance: 1.2 },
  { id: 31, name: "EVgo - Hollywood", street: "6801 Hollywood Blvd", city: "Los Angeles", state: "CA", zip: "90028", lat: 34.1016, lng: -118.3265, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 2, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 175, expected_price: "$0.35/kWh", distance: 5.6 },
  { id: 32, name: "ChargePoint - Venice Beach", street: "3000 Ocean Front Walk", city: "Venice", state: "CA", zip: "90291", lat: 33.985, lng: -118.472, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 6, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 11.5, expected_price: "$0.28/kWh", distance: 3.8 },
  // Chicago
  { id: 40, name: "EVgo - Millennium Park", street: "201 E Randolph St", city: "Chicago", state: "IL", zip: "60601", lat: 41.8827, lng: -87.6233, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 350, expected_price: "$0.38/kWh", distance: 0.8 },
  { id: 41, name: "Tesla Supercharger - River North", street: "600 N Kingsbury St", city: "Chicago", state: "IL", zip: "60654", lat: 41.8925, lng: -87.6417, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250, expected_price: "$0.32/kWh", distance: 2.1 },
  // Austin
  { id: 50, name: "EVgo - Downtown Austin", street: "200 Congress Ave", city: "Austin", state: "TX", zip: "78701", lat: 30.2655, lng: -97.7426, ev_charging_level: "dc_fast", ev_dc_fast_num: 4, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 175, expected_price: "$0.30/kWh", distance: 0.5 },
  { id: 51, name: "ChargePoint - South Congress", street: "1800 S Congress Ave", city: "Austin", state: "TX", zip: "78704", lat: 30.2454, lng: -97.7528, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 4, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2, expected_price: "$0.25/kWh", distance: 2.3 },
  // Seattle
  { id: 60, name: "Electrify America - Seattle Center", street: "305 Harrison St", city: "Seattle", state: "WA", zip: "98109", lat: 47.6205, lng: -122.3493, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150, expected_price: "$0.38/kWh", distance: 1.2 },
  { id: 61, name: "ChargePoint - Capitol Hill", street: "400 Broadway E", city: "Seattle", state: "WA", zip: "98102", lat: 47.6195, lng: -122.3232, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 4, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 11.5, expected_price: "$0.28/kWh", distance: 3.4 },
  // Denver
  { id: 70, name: "EVgo - Union Station", street: "1701 Wynkoop St", city: "Denver", state: "CO", zip: "80202", lat: 39.7528, lng: -105.0001, ev_charging_level: "dc_fast", ev_dc_fast_num: 6, level2_charging_num: 0, station_entity_name: "EVgo", ev_connector_types: "CCS,CHAdeMO", power_kw: 350, expected_price: "$0.34/kWh", distance: 0.5 },
  { id: 71, name: "Tesla Supercharger - Cherry Creek", street: "3000 E 1st Ave", city: "Denver", state: "CO", zip: "80206", lat: 39.7167, lng: -104.9535, ev_charging_level: "dc_fast", ev_dc_fast_num: 16, level2_charging_num: 0, station_entity_name: "Tesla", ev_connector_types: "NACS", power_kw: 250, expected_price: "$0.28/kWh", distance: 4.5 },
  // Miami
  { id: 80, name: "Electrify America - Miami Beach", street: "700 Lincoln Rd", city: "Miami Beach", state: "FL", zip: "33139", lat: 25.7912, lng: -80.1346, ev_charging_level: "dc_fast", ev_dc_fast_num: 8, level2_charging_num: 0, station_entity_name: "Electrify America", ev_connector_types: "CCS,CHAdeMO", power_kw: 150, expected_price: "$0.40/kWh", distance: 1.8 },
  { id: 81, name: "ChargePoint - Brickell", street: "1200 Brickell Ave", city: "Miami", state: "FL", zip: "33131", lat: 25.7619, lng: -80.1919, ev_charging_level: "level_2", ev_dc_fast_num: 0, level2_charging_num: 6, station_entity_name: "ChargePoint", ev_connector_types: "J1772", power_kw: 7.2, expected_price: "$0.30/kWh", distance: 3.2 },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    power: s.power_kw ? parseFloat(s.power_kw as string) : (level === 3 ? 150 : 7.2),
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

    const chargers = stations.map((s: Record<string, unknown>) => transformStation(s, s.distance ? parseFloat(s.distance as string) : 0));
    return NextResponse.json({ chargers, total: chargers.length });
  } catch {
    // Fallback to sample data with proximity filtering
    let nearby = SAMPLE_STATIONS.map((s) => ({
      ...s,
      _dist: haversineDistance(lat, lng, s.lat, s.lng),
    }))
      .filter((s) => s._dist <= distance)
      .sort((a, b) => a._dist - b._dist)
      .slice(0, maxresults);

    // Filter by charger type
    if (chargerType === 'dcfast') {
      nearby = nearby.filter((s) => s.ev_charging_level === 'dc_fast');
    } else if (chargerType === 'level2') {
      nearby = nearby.filter((s) => s.ev_charging_level === 'level_2');
    }

    const chargers = nearby.map((s) =>
      transformStation({ ...s, station_name: s.name, street_address: s.street, latitude: s.lat.toString(), longitude: s.lng.toString() }, s._dist)
    );

    return NextResponse.json({ chargers, total: chargers.length });
  }
}