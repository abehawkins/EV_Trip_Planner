'use client';

import { useEffect } from 'react';
import { useEVStore } from '@/lib/ev-store';
import { fetchChargersAndPOIs } from '@/lib/ev-fetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap, RotateCcw, MapPin, UtensilsCrossed, Dog, TreePine } from 'lucide-react';

export default function FilterBar() {
  const {
    chargerType, setChargerType,
    showPOIs, setShowPOIs,
    poiTypes, setPoiTypes,
    dogFriendlyOnly, setDogFriendlyOnly,
    chargersLoading, poisLoading,
  } = useEVStore();

  // Auto-fetch on filter change (only when zoomed in enough)
  useEffect(() => {
    const { mapZoom } = useEVStore.getState();
    if (mapZoom >= 8) {
      fetchChargersAndPOIs();
    }
  }, [chargerType, showPOIs, dogFriendlyOnly, poiTypes]);

  const togglePoiType = (type: string) => {
    const current = useEVStore.getState().poiTypes;
    if (current.includes(type)) {
      setPoiTypes(current.filter((t) => t !== type));
    } else {
      setPoiTypes([...current, type]);
    }
  };

  const chargerTypes = [
    { key: 'all', label: 'All', icon: MapPin },
    { key: 'dcfast', label: 'DC Fast', icon: Zap },
    { key: 'level2', label: 'Level 2', icon: RotateCcw },
  ];

  return (
    <div className="space-y-3">
      {/* Charger type filters */}
      <div>
        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Charger Type</div>
        <div className="flex gap-1.5 flex-wrap">
          {chargerTypes.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={chargerType === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChargerType(key)}
              className="h-7 text-xs gap-1.5"
            >
              <Icon className="h-3 w-3" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* POI toggles */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Nearby Places</div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={showPOIs}
              onCheckedChange={(v) => setShowPOIs(v === true)}
              className="h-3.5 w-3.5"
            />
            <span className="text-[11px] text-muted-foreground">Show</span>
          </label>
        </div>
        {showPOIs && (
          <div className="space-y-2 pl-1">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
                { key: 'cafe', label: 'Cafes', icon: UtensilsCrossed },
                { key: 'fast_food', label: 'Fast Food', icon: UtensilsCrossed },
                { key: 'park', label: 'Parks', icon: TreePine },
              ].map(({ key, label, icon: Icon }) => (
                <Badge
                  key={key}
                  variant={poiTypes.includes(key) ? 'default' : 'outline'}
                  className="cursor-pointer text-[11px] h-6 gap-1 px-2"
                  onClick={() => togglePoiType(key)}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {label}
                </Badge>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={dogFriendlyOnly}
                onCheckedChange={(v) => setDogFriendlyOnly(v === true)}
                className="h-3.5 w-3.5"
              />
              <Dog className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Dog-friendly only</span>
            </label>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {(chargersLoading || poisLoading) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          {chargersLoading ? 'Finding chargers...' : 'Finding places...'}
        </div>
      )}
    </div>
  );
}