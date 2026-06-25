'use client';

import { useEVStore } from '@/lib/ev-store';
import { fetchChargersAndPOIs } from '@/lib/ev-fetch';
import { Slider } from '@/components/ui/slider';
import { Gauge } from 'lucide-react';

export default function RangeControl() {
  const { rangeMiles, setRangeMiles, showRange, setShowRange } = useEVStore();

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <button
        onClick={() => setShowRange(!showRange)}
        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        title={showRange ? 'Hide range circle' : 'Show range circle'}
      >
        <Gauge className={`h-4 w-4 ${showRange ? 'text-green-600' : 'text-muted-foreground'}`} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[11px] text-muted-foreground font-medium">Range</span>
          <span className="text-xs font-semibold text-green-600">{rangeMiles} mi</span>
        </div>
        <Slider
          value={[rangeMiles]}
          onValueChange={(v) => setRangeMiles(v[0])}
          min={20}
          max={500}
          step={10}
          className="w-full"
          onRelease={() => fetchChargersAndPOIs()}
        />
      </div>
    </div>
  );
}