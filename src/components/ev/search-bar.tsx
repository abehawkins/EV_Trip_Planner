'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchChargersAndPOIs } from '@/lib/ev-fetch';
import { useEVStore } from '@/lib/ev-store';

interface SearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface SearchBarProps {
  /** If provided, used as label placeholder; hides the single-search behavior */
  mode?: 'single' | 'origin' | 'destination';
  onSelect?: (name: string, lat: number, lng: number) => void;
  value?: string;
  onClear?: () => void;
}

export default function SearchBar({ mode = 'single', onSelect, value, onClear }: SearchBarProps) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const placeholder = mode === 'origin'
    ? 'Starting point...'
    : mode === 'destination'
      ? 'Destination...'
      : 'Search city, address, or zip...';

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 400);
  };

  const selectResult = (r: SearchResult) => {
    const shortName = r.displayName.split(',').slice(0, 2).join(',');
    setQuery(shortName);
    setShowResults(false);
    setResults([]);

    if (mode === 'single') {
      // Standard search: fly to location and fetch data
      const store = useEVStore.getState();
      store.setMapCenter([r.lng, r.lat]);
      store.setMapZoom(13);
      store.triggerFlyTo(13);
      setTimeout(() => { fetchChargersAndPOIs(); }, 1600);
    } else if (onSelect) {
      // Trip origin/destination
      onSelect(shortName, r.lat, r.lng);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    if (onClear) onClear();
  };

  // Sync external value changes (trip mode clear)
  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full" style={{ zIndex: 1000 }}>
      <div className="relative">
        {mode === 'origin' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-green-500 border-2 border-white shadow z-10" />
        )}
        {mode === 'destination' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-red-500 border-2 border-white shadow z-10" />
        )}
        {mode === 'single' && (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className={`${mode !== 'single' ? 'pl-8' : 'pl-9'} pr-8 h-9 bg-white/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg text-sm`}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {searching && (
          <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-border/50 overflow-hidden z-50">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => selectResult(r)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
            >
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-sm text-foreground leading-snug line-clamp-2">
                {r.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}