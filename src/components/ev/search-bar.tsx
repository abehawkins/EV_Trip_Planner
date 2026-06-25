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

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { setMapCenter, setMapZoom } = useEVStore();

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

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const selectResult = (r: SearchResult) => {
    setQuery(r.displayName.split(',').slice(0, 2).join(','));
    setMapCenter([r.lng, r.lat]);
    setMapZoom(13);
    setShowResults(false);
    setResults([]);
    // Fetch data for new location after map flies there
    setTimeout(() => { fetchChargersAndPOIs(); }, 600);
  };

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
    <div ref={containerRef} className="relative w-full max-w-md" style={{ zIndex: 1000 }}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search city, address, or zip..."
          className="pl-9 pr-8 h-10 bg-white/95 backdrop-blur-sm border-0 shadow-lg rounded-full text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
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