import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'EVTravelCompanion/1.0';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address: Record<string, string>;
  importance: number;
}

function parseCoordinates(query: string): { lat: number; lng: number } | null {
  const stripped = query.trim();

  // "43.48, -121.98" or "43.48 -121.98"
  const match = stripped.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

function simplifyQuery(query: string): string[] {
  const variants: string[] = [];
  const trimmed = query.trim();

  // Original query first
  variants.push(trimmed);

  // Remove leading house number (e.g. "123309 2 Rivers Rd, Crescent Lake, OR" -> "2 Rivers Rd, Crescent Lake, OR")
  const withoutLeadingNum = trimmed.replace(/^\d+\s+/, '');
  if (withoutLeadingNum !== trimmed) {
    variants.push(withoutLeadingNum);
  }

  // Extract city/state/zip parts after the first comma
  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.length >= 2) {
    // "Street, City, State ZIP" -> try "City, State ZIP"
    const cityStateZip = parts.slice(1).join(', ');
    variants.push(cityStateZip);

    // Try just city + state (drop zip)
    const cityState = parts.slice(1).map((p) => p.replace(/\d{5}(-\d{4})?/, '').trim()).filter(Boolean).join(', ');
    if (cityState && cityState !== cityStateZip) {
      variants.push(cityState);
    }
  }

  // If the query has no commas, try extracting state abbreviation
  if (parts.length === 1) {
    const words = trimmed.split(/\s+/);
    // Look for a 2-letter state code or zip at the end
    if (words.length >= 3) {
      const last = words[words.length - 1];
      const secondLast = words[words.length - 2];
      const isZip = /^\d{5}$/.test(last);
      const isState = /^[A-Z]{2}$/i.test(isZip ? secondLast : last);

      if (isState || isZip) {
        // Try everything after the first number sequence as a place search
        const afterNumber = trimmed.replace(/^\d+\s+/, '').replace(/^\d+\s+/, '');
        if (afterNumber !== trimmed) {
          variants.push(afterNumber);
        }

        // Try just the last 2-3 words (city + state + zip)
        if (words.length >= 4) {
          const tail = isZip ? words.slice(-3).join(' ') : words.slice(-2).join(' ');
          variants.push(tail);
        }
      }
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return variants.filter((v) => {
    const key = v.toLowerCase();
    if (seen.has(key) || v.length < 2) return false;
    seen.add(key);
    return true;
  });
}

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '8',
    addressdetails: '1',
    countrycodes: 'us',
    bounded: '0',
  });

  const response = await fetch(`${NOMINATIM_API}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return [];
  return response.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });
  }

  // Check for raw coordinates first
  const coords = parseCoordinates(query);
  if (coords) {
    return NextResponse.json({
      results: [{
        displayName: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        lat: coords.lat,
        lng: coords.lng,
        type: 'coordinate',
        class: 'coordinate',
        address: {},
      }],
    });
  }

  try {
    const variants = simplifyQuery(query);

    for (const variant of variants) {
      const data = await searchNominatim(variant);

      if (data.length > 0) {
        const results = data.map((item) => ({
          displayName: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type,
          class: item.class,
          address: item.address,
        }));

        // If this wasn't the original query, prepend a note
        if (variant !== variants[0] && results.length > 0) {
          results[0].displayName = `${results[0].displayName} (near "${variants[0]}")`;
        }

        return NextResponse.json({ results });
      }
    }

    // Nothing found at all
    return NextResponse.json({ results: [] });
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode', details: String(error) },
      { status: 500 }
    );
  }
}
