'use client';

import { useEVStore, Charger } from '@/lib/ev-store';
import {
  getConnectionLabel,
  getConnectionColor,
  formatDistance,
  getMaxPower,
  poiTypeLabel,
  poiTypeEmoji,
} from '@/lib/ev-helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Zap, MapPin, Clock, Building2, ChevronRight, ExternalLink,
  Navigation, Phone, Globe, Utensils, Dog, TreePine,
} from 'lucide-react';

function ChargerCard({ charger }: { charger: Charger }) {
  const { selectedCharger, setSelectedCharger, setSidebarOpen } = useEVStore();
  const isSelected = selectedCharger?.id === charger.id;
  const topPower = getMaxPower(charger.connections);
  const topLevel = charger.connections.length > 0
    ? Math.max(...charger.connections.map((c) => c.level))
    : 0;
  const color = getConnectionColor(topLevel);

  const handleClick = () => {
    if (isSelected) {
      setSelectedCharger(null);
    } else {
      setSelectedCharger(charger);
    }
    setSidebarOpen(true);
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
        isSelected ? 'border-l-green-500 shadow-md ring-1 ring-green-500/20' : 'border-l-transparent'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug truncate">{charger.name}</h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {charger.address}{charger.city ? `, ${charger.city}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <Badge
              variant="outline"
              className="text-[10px] font-bold h-5 px-1.5"
              style={{ borderColor: color, color }}
            >
              {getConnectionLabel(topLevel)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {charger.distance !== null && (
            <span className="flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              {formatDistance(charger.distance)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {charger.numberOfPoints} port{charger.numberOfPoints !== 1 ? 's' : ''}
            {topPower ? ` · up to ${topPower}kW` : ''}
          </span>
        </div>

        {charger.operator && (
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {charger.operator}
          </p>
        )}

        {isSelected && charger.connections.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-border/50">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Connectors
            </div>
            <div className="space-y-1">
              {charger.connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: getConnectionColor(conn.level) }}
                    />
                    {conn.type || getConnectionLabel(conn.level)}
                    {conn.quantity > 1 && <span className="text-muted-foreground">×{conn.quantity}</span>}
                  </span>
                  <span className="text-muted-foreground">
                    {conn.power ? `${conn.power}kW` : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
            {charger.usageCost && (
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {charger.usageCost}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function POICard({ poi }: { poi: ReturnType<typeof useEVStore.getState>['pois'][0] }) {
  const { lat, lng } = useEVStore(s => s.mapCenter);
  // Note: Using the store's lat/lng is wrong, we need the POI's own lat/lng for navigation
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`;

  return (
    <Card className="transition-all hover:shadow-md border-l-4 border-l-cyan-400">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg mt-0.5">{poiTypeEmoji(poi.type)}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-snug truncate">{poi.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {poiTypeLabel(poi.type)}
              </Badge>
              {poi.cuisine && (
                <span className="text-[11px] text-muted-foreground">{poi.cuisine}</span>
              )}
            </div>
            {poi.dogFriendly && (
              <div className="flex items-center gap-1 mt-1">
                <Dog className="h-3 w-3 text-violet-500" />
                <span className="text-[11px] text-violet-600 font-medium">Dog friendly</span>
              </div>
            )}
            {poi.outdoorSeating && (
              <div className="flex items-center gap-1 mt-0.5">
                <TreePine className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px] text-emerald-600">Outdoor seating</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              {poi.phone && (
                <a href={`tel:${poi.phone}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                </a>
              )}
              {poi.website && (
                <a href={poi.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                </a>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 ml-auto">
                Directions <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SidebarContent() {
  const {
    chargers, chargersLoading,
    pois, showPOIs, poisLoading,
    dogFriendlyOnly, chargerType,
  } = useEVStore();

  // Apply charger type filter
  const filteredChargers = chargerType === 'all'
    ? chargers
    : chargerType === 'dcfast'
      ? chargers.filter((c) => c.connections.some((conn) => conn.level === 3))
      : chargers.filter((c) => c.connections.some((conn) => conn.level === 2));

  const filteredPois = dogFriendlyOnly ? pois.filter((p) => p.dogFriendly) : pois;

  return (
    <div className="flex flex-col h-full">
      {/* Stations header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-green-600" />
          Charging Stations
          {!chargersLoading && (
            <span className="text-xs font-normal text-muted-foreground">({filteredChargers.length})</span>
          )}
        </h2>
      </div>

      {/* Charger list */}
      <div className={`overflow-y-auto px-3 pb-1 ${showPOIs ? 'max-h-[45%]' : 'flex-1'}`}>
        {chargersLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Searching for chargers...</span>
            </div>
          </div>
        ) : filteredChargers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No chargers found nearby</p>
            <p className="text-xs text-muted-foreground mt-1">Try searching for a city or zooming in</p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {filteredChargers.map((c) => (
              <ChargerCard key={c.id} charger={c} />
            ))}
          </div>
        )}
      </div>

      {/* POI section */}
      {showPOIs && (
        <>
          <Separator className="mx-3" />
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 text-cyan-500" />
              Nearby Places
              {!poisLoading && (
                <span className="text-xs font-normal text-muted-foreground">({filteredPois.length})</span>
              )}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
            {poisLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground">Finding places...</span>
                </div>
              </div>
            ) : filteredPois.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No places found</p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {filteredPois.slice(0, 30).map((p) => (
                  <POICard key={p.id} poi={p} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}