import { NextRequest, NextResponse } from 'next/server';

const OSRM_API = 'https://router.project-osrm.org/route/v1/driving';

export interface RouteStep {
  lat: number;
  lng: number;
}

export interface RouteResponse {
  geometry: [number, number][];
  distanceMiles: number;
  durationMinutes: number;
  waypoints: { lat: number; lng: number; name: string }[];
}

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const originLat = parseFloat(searchParams.get('originLat') || '0');
  const originLng = parseFloat(searchParams.get('originLng') || '0');
  const destLat = parseFloat(searchParams.get('destLat') || '0');
  const destLng = parseFloat(searchParams.get('destLng') || '0');
  const waypointsParam = searchParams.get('waypoints') || '';

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json(
      { error: 'originLat, originLng, destLat, destLng are required' },
      { status: 400 }
    );
  }

  const coordinates = [`${originLng},${originLat}`];
  if (waypointsParam) {
    const wps = waypointsParam.split(';');
    for (const wp of wps) {
      const [lat, lng] = wp.split(',').map(Number);
      if (lat && lng) coordinates.push(`${lng},${lat}`);
    }
  }
  coordinates.push(`${destLng},${destLat}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const url = `${OSRM_API}/${coordinates.join(';')}?overview=full&geometries=polyline&steps=false`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EVTripPlanner/1.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OSRM returned ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { error: 'No route found', code: data.code },
        { status: 404 }
      );
    }

    const route = data.routes[0];
    const geometry = decodePolyline(route.geometry);
    const distanceMiles = route.distance / 1609.34;
    const durationMinutes = route.duration / 60;

    const waypoints = (data.waypoints || []).map(
      (wp: { location: [number, number]; name: string }) => ({
        lat: wp.location[1],
        lng: wp.location[0],
        name: wp.name || '',
      })
    );

    const result: RouteResponse = {
      geometry,
      distanceMiles,
      durationMinutes,
      waypoints,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('OSRM routing error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate route', details: String(error) },
      { status: 500 }
    );
  }
}
