import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_API}?${params.toString()}`, {
      headers: {
        'User-Agent': 'EVTravelCompanion/1.0',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const data = await response.json();

    const results = data.map((item: Record<string, unknown>) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat as string),
      lng: parseFloat(item.lon as string),
      type: item.type,
      class: item.class,
      address: item.address,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode', details: String(error) },
      { status: 500 }
    );
  }
}