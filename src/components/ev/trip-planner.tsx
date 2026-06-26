'use client';

import { useEVStore } from '@/lib/ev-store';
import { fetchChargersAndPOIs } from '@/lib/ev-fetch';
import SearchBar from './search-bar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Navigation, X, Route, RotateCcw, ArrowDown, Zap, MapPin } from 'lucide-react';

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateIntermediatePoints(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  rangeMiles: number
): { lat: number; lng: number }[] {
  const dist = haversineMiles(origin.lat, origin.lng, dest.lat, dest.lng);
  // Place a point every 80% of range to ensure overlapping coverage
  const stepMiles = Math.max(rangeMiles * 0.7, 30);
  const numPoints = Math.max(2, Math.ceil(dist / stepMiles) + 1);
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const frac = i / numPoints;
    points.push({
      lat: origin.lat + (dest.lat - origin.lat) * frac,
      lng: origin.lng + (dest.lng - origin.lng) * frac,
    });
  }
  return points;
}

export default function TripPlanner() {
  const {
    tripOrigin, setTripOrigin,
    tripDestination, setTripDestination,
    tripMode, setTripMode,
    rangeMiles,
    setMapCenter, triggerFlyTo,
  } = useEVStore();

  const directDistance = tripOrigin && tripDestination
    ? haversineMiles(tripOrigin.lat, tripOrigin.lng, tripDestination.lat, tripDestination.lng)
    : null;

  const handleOriginSelect = (name: string, lat: number, lng: number) => {
    setTripOrigin({ name, lat, lng });
  };

  const handleDestSelect = (name: string, lat: number, lng: number) => {
    setTripDestination({ name, lat, lng });
  };

  const handleClearOrigin = () => { setTripOrigin(null); };
  const handleClearDest = () => { setTripDestination(null); };

  const handleFindChargers = () => {
    if (!tripOrigin || !tripDestination) return;

    const points = generateIntermediatePoints(tripOrigin, tripDestination, rangeMiles);

    // Fly to fit both points
    const midLat = (tripOrigin.lat + tripDestination.lat) / 2;
    const midLng = (tripOrigin.lng + tripDestination.lng) / 2;
    setMapCenter([midLng, midLat]);
    const dist = directDistance || 100;
    const zoom = Math.max(5, 10 - Math.log2(dist / 50));
    triggerFlyTo(zoom);

    // Fetch chargers for each intermediate point
    const store = useEVStore.getState();
    store.setChargersLoading(true);
    store.setChargers([]);

    // Batch fetch — collect all unique chargers
    const fetches = points.map(async (pt) => {
      const params = new URLSearchParams({
        lat: pt.lat.toString(),
        lng: pt.lng.toString(),
        distance: rangeMiles.toString(),
        maxresults: '50',
      });
      if (store.chargerType !== 'all') params.set('chargerType', store.chargerType);
      try {
        const res = await fetch(`/api/chargers?${params}`);
        const data = await res.json();
        return data.chargers || [];
      } catch {
        return [];
      }
    });

    Promise.all(fetches).then((allChargers) => {
      // Deduplicate by id
      const seen = new Set<number>();
      const unique: typeof allChargers[0][] = [];
      for (const batch of allChargers) {
        for (const c of batch) {
          if (!seen.has(c.id)) {
            seen.add(c.id);
            // Compute distance to route line for sorting
            unique.push(c);
          }
        }
      }
      // Sort by proximity to route midpoint
      unique.sort((a, b) => {
        const dA = haversineMiles(a.lat, a.lng, midLat, midLng);
        const dB = haversineMiles(b.lat, b.lng, midLat, midLng);
        return dA - dB;
      });
      store.setChargers(unique.slice(0, 100));
      store.setChargersLoading(false);
    });
  };

  const handleClearTrip = () => {
    setTripOrigin(null);
    setTripDestination(null);
  };

  const handleSwapPoints = () => {
    const store = useEVStore.getState();
    const o = store.tripOrigin;
    const d = store.tripDestination;
    store.setTripOrigin(d);
    store.setTripDestination(o);
  };

  const handleExitTripMode = () => {
    handleClearTrip();
    setTripMode(false);
  };

  const canSearch = tripOrigin && tripDestination;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <Route className="h-3.5 w-3.5 text-blue-500" />
          Trip Planner
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={handleExitTripMode}
        >
          <X className="h-3 w-3 mr-1" />
          Exit
        </Button>
      </div>

      {/* Origin / Destination inputs stacked */}
      <div className="relative space-y-1.5">
        <SearchBar
          mode="origin"
          onSelect={handleOriginSelect}
          value={tripOrigin?.name || ''}
          onClear={handleClearOrigin}
        />
        <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '50%' }}>
          <button
            onClick={handleSwapPoints}
            className="h-6 w-6 rounded-full bg-white border border-border/60 shadow flex items-center justify-center hover:bg-accent transition-colors"
            title="Swap origin and destination"
          >
            <ArrowDown className="h-3 w-3 text-muted-foreground" style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
        <SearchBar
          mode="destination"
          onSelect={handleDestSelect}
          value={tripDestination?.name || ''}
          onClear={handleClearDest}
        />
      </div>

      {/* Trip info + actions */}
      {directDistance !== null && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Navigation className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong className="text-foreground">{directDistance.toFixed(0)} mi</strong> direct distance
          </span>
          <span className="text-muted-foreground">·</span>
          <span>Range: <strong className="text-green-600">{rangeMiles} mi</strong></span>
          {directDistance > rangeMiles && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-orange-600 font-medium">
                ~{Math.ceil(directDistance / rangeMiles)} charge stop{Math.ceil(directDistance / rangeMiles) > 1 ? 's' : ''} needed
              </span>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          disabled={!canSearch}
          onClick={handleFindChargers}
        >
          <Zap className="h-3.5 w-3.5" />
          Find Chargers Along Route
        </Button>
        {(tripOrigin || tripDestination) && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleClearTrip}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}