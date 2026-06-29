'use client';

import { useEVStore, Charger, ChargeStop } from '@/lib/ev-store';
import SearchBar from './search-bar';
import { Button } from '@/components/ui/button';
import {
  Navigation, X, Route, RotateCcw, ArrowDown, Zap, Battery, Clock,
  BatteryWarning, Loader2, CheckCircle2,
} from 'lucide-react';

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

function samplePointsAlongRoute(
  geometry: [number, number][],
  intervalMiles: number,
): { lat: number; lng: number }[] {
  if (geometry.length < 2) return [];
  const points: { lat: number; lng: number }[] = [];
  let accumulated = 0;
  let nextTarget = intervalMiles;

  for (let i = 1; i < geometry.length; i++) {
    const [lng1, lat1] = geometry[i - 1];
    const [lng2, lat2] = geometry[i];
    const segDist = haversineMiles(lat1, lng1, lat2, lng2);

    while (accumulated + segDist >= nextTarget && nextTarget > 0) {
      const frac = (nextTarget - accumulated) / segDist;
      const midLat = lat1 + (lat2 - lat1) * frac;
      const midLng = lng1 + (lng2 - lng1) * frac;
      points.push({ lat: midLat, lng: midLng });
      nextTarget += intervalMiles;
    }
    accumulated += segDist;
  }
  return points;
}

function distanceAlongRoute(
  geometry: [number, number][],
  targetLat: number,
  targetLng: number,
): number {
  let minDist = Infinity;
  let bestAccum = 0;
  let accumulated = 0;

  for (let i = 0; i < geometry.length; i++) {
    const [lng, lat] = geometry[i];
    const d = haversineMiles(lat, lng, targetLat, targetLng);
    if (d < minDist) {
      minDist = d;
      bestAccum = accumulated;
    }
    if (i > 0) {
      const [pLng, pLat] = geometry[i - 1];
      accumulated += haversineMiles(pLat, pLng, lat, lng);
    }
  }
  return bestAccum;
}

function computeOptimalStops(
  chargers: Charger[],
  routeGeometry: [number, number][],
  routeDistanceMiles: number,
  rangeMiles: number,
): ChargeStop[] {
  const usableRange = rangeMiles * 0.85;
  if (routeDistanceMiles <= usableRange) return [];

  const chargersWithDist = chargers.map((c) => ({
    charger: c,
    routeDist: distanceAlongRoute(routeGeometry, c.lat, c.lng),
    perpDist: (() => {
      let min = Infinity;
      for (const [lng, lat] of routeGeometry) {
        min = Math.min(min, haversineMiles(lat, lng, c.lat, c.lng));
      }
      return min;
    })(),
  }));

  const nearRoute = chargersWithDist
    .filter((c) => c.perpDist < 15)
    .sort((a, b) => a.routeDist - b.routeDist);

  const stops: ChargeStop[] = [];
  let currentRange = usableRange;
  let distanceTraveled = 0;

  while (distanceTraveled + currentRange < routeDistanceMiles) {
    const maxReach = distanceTraveled + currentRange;
    const candidates = nearRoute.filter(
      (c) => c.routeDist > distanceTraveled + 10 && c.routeDist <= maxReach
    );

    if (candidates.length === 0) {
      const ahead = nearRoute.filter((c) => c.routeDist > distanceTraveled + 10);
      if (ahead.length === 0) break;
      const nearest = ahead[0];
      stops.push({
        charger: nearest.charger,
        distanceFromStart: nearest.routeDist,
        estimatedBatteryOnArrival: Math.max(0, (1 - (nearest.routeDist - distanceTraveled) / rangeMiles) * 100),
        estimatedBatteryOnDeparture: 80,
      });
      distanceTraveled = nearest.routeDist;
      currentRange = usableRange;
      continue;
    }

    const preferDCFast = candidates.filter((c) =>
      c.charger.connections.some((conn) => conn.level === 3)
    );
    const pick = preferDCFast.length > 0
      ? preferDCFast[preferDCFast.length - 1]
      : candidates[candidates.length - 1];

    const legDist = pick.routeDist - distanceTraveled;
    stops.push({
      charger: pick.charger,
      distanceFromStart: pick.routeDist,
      estimatedBatteryOnArrival: Math.max(0, (1 - legDist / rangeMiles) * 100),
      estimatedBatteryOnDeparture: 80,
    });
    distanceTraveled = pick.routeDist;
    currentRange = usableRange;
  }

  return stops;
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins} min`;
  return `${hrs}h ${mins}m`;
}

export default function TripPlanner() {
  const {
    tripOrigin, setTripOrigin,
    tripDestination, setTripDestination,
    tripMode, setTripMode,
    tripRoute, setTripRoute,
    tripRouteLoading, setTripRouteLoading,
    chargeStops, setChargeStops,
    rangeMiles,
    setMapCenter, triggerFlyTo,
    setChargers, setChargersLoading,
    chargerType,
  } = useEVStore();

  const handleOriginSelect = (name: string, lat: number, lng: number) => {
    setTripOrigin({ name, lat, lng });
  };

  const handleDestSelect = (name: string, lat: number, lng: number) => {
    setTripDestination({ name, lat, lng });
  };

  const handleClearOrigin = () => {
    setTripOrigin(null);
    setTripRoute(null);
    setChargeStops([]);
  };
  const handleClearDest = () => {
    setTripDestination(null);
    setTripRoute(null);
    setChargeStops([]);
  };

  const handlePlanTrip = async () => {
    if (!tripOrigin || !tripDestination) return;

    setTripRouteLoading(true);
    setTripRoute(null);
    setChargeStops([]);

    try {
      const params = new URLSearchParams({
        originLat: tripOrigin.lat.toString(),
        originLng: tripOrigin.lng.toString(),
        destLat: tripDestination.lat.toString(),
        destLng: tripDestination.lng.toString(),
      });

      const res = await fetch(`/api/route-plan?${params}`);
      if (!res.ok) throw new Error('Route not found');
      const data = await res.json();

      const route = {
        geometry: data.geometry as [number, number][],
        distanceMiles: data.distanceMiles as number,
        durationMinutes: data.durationMinutes as number,
      };
      setTripRoute(route);

      const midLat = (tripOrigin.lat + tripDestination.lat) / 2;
      const midLng = (tripOrigin.lng + tripDestination.lng) / 2;
      setMapCenter([midLng, midLat]);
      const zoom = Math.max(5, 10 - Math.log2(route.distanceMiles / 50));
      triggerFlyTo(zoom);

      setChargersLoading(true);
      setChargers([]);
      const samplePoints = samplePointsAlongRoute(route.geometry, Math.max(rangeMiles * 0.6, 30));
      const allPoints = [
        { lat: tripOrigin.lat, lng: tripOrigin.lng },
        ...samplePoints,
        { lat: tripDestination.lat, lng: tripDestination.lng },
      ];

      const fetches = allPoints.map(async (pt) => {
        const p = new URLSearchParams({
          lat: pt.lat.toString(),
          lng: pt.lng.toString(),
          distance: Math.min(rangeMiles, 50).toString(),
          maxresults: '50',
        });
        if (chargerType !== 'all') p.set('chargerType', chargerType);
        try {
          const r = await fetch(`/api/chargers?${p}`);
          const d = await r.json();
          return (d.chargers || []) as Charger[];
        } catch {
          return [];
        }
      });

      const allChargers = await Promise.all(fetches);
      const seen = new Set<number>();
      const unique: Charger[] = [];
      for (const batch of allChargers) {
        for (const c of batch) {
          if (!seen.has(c.id)) {
            seen.add(c.id);
            unique.push(c);
          }
        }
      }
      setChargers(unique);
      setChargersLoading(false);

      const stops = computeOptimalStops(unique, route.geometry, route.distanceMiles, rangeMiles);
      setChargeStops(stops);
    } catch (err) {
      console.error('Trip planning failed:', err);
    } finally {
      setTripRouteLoading(false);
    }
  };

  const handleClearTrip = () => {
    setTripOrigin(null);
    setTripDestination(null);
    setTripRoute(null);
    setChargeStops([]);
  };

  const handleSwapPoints = () => {
    const store = useEVStore.getState();
    const o = store.tripOrigin;
    const d = store.tripDestination;
    store.setTripOrigin(d);
    store.setTripDestination(o);
    store.setTripRoute(null);
    store.setChargeStops([]);
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

      <div className="relative space-y-1.5">
        <SearchBar
          key={`origin-${tripOrigin?.name || 'empty'}`}
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
          key={`dest-${tripDestination?.name || 'empty'}`}
          mode="destination"
          onSelect={handleDestSelect}
          value={tripDestination?.name || ''}
          onClear={handleClearDest}
        />
      </div>

      {tripRoute && (
        <div className="space-y-2 bg-muted/50 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <Navigation className="h-3.5 w-3.5 text-blue-500" />
              {tripRoute.distanceMiles.toFixed(0)} mi
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(tripRoute.durationMinutes)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Battery className="h-3.5 w-3.5" />
              Range: <strong className="text-green-600">{rangeMiles} mi</strong>
            </span>
          </div>

          {chargeStops.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3 w-3 text-orange-500" />
                Recommended Stops ({chargeStops.length})
              </div>
              {chargeStops.map((stop, i) => (
                <div key={stop.charger.id} className="flex items-center gap-2 text-xs bg-white dark:bg-card rounded-md px-2.5 py-1.5 shadow-sm">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{stop.charger.name}</div>
                    <div className="text-muted-foreground text-[11px]">
                      {stop.distanceFromStart.toFixed(0)} mi from start
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[11px] font-medium ${stop.estimatedBatteryOnArrival < 20 ? 'text-red-500' : 'text-green-600'}`}>
                      {stop.estimatedBatteryOnArrival.toFixed(0)}% arr.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tripRoute.distanceMiles <= rangeMiles * 0.85 ? (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              No charging stops needed!
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-orange-600">
              <BatteryWarning className="h-3.5 w-3.5" />
              ~{Math.ceil(tripRoute.distanceMiles / (rangeMiles * 0.85))} charge stop(s) needed
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          disabled={!canSearch || tripRouteLoading}
          onClick={handlePlanTrip}
        >
          {tripRouteLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {tripRouteLoading ? 'Planning...' : 'Plan Trip'}
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
