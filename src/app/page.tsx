'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useEVStore } from '@/lib/ev-store';
import { fetchChargersAndPOIs } from '@/lib/ev-fetch';
import EVMap from '@/components/ev/ev-map-client';
import SearchBar from '@/components/ev/search-bar';
import RangeControl from '@/components/ev/range-control';
import FilterBar from '@/components/ev/filter-bar';
import SidebarContent from '@/components/ev/sidebar-content';
import TripPlanner from '@/components/ev/trip-planner';
import ThemeToggle from '@/components/ev/theme-toggle';
import MobileDrawer from '@/components/ev/mobile-drawer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  PanelLeftClose, PanelLeftOpen, BatteryCharging, Crosshair,
  Zap, RotateCcw, Loader2, Route, ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const {
    sidebarOpen, setSidebarOpen,
    chargersLoading, chargers,
    showPOIs,
    tripMode, setTripMode,
    setMapCenter, setMapZoom,
    mobileDrawerOpen, setMobileDrawerOpen,
  } = useEVStore();

  const [locating, setLocating] = useState(false);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const store = useEVStore();
  const fetchedZoomRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mounted) return;
    // Skip auto-fetch when trip mode is active — trip planner manages its own charger search
    if (store.tripMode) return;
    if (store.mapZoom >= 8 && !store.chargersLoading && fetchedZoomRef.current !== store.mapZoom) {
      fetchedZoomRef.current = store.mapZoom;
      fetchChargersAndPOIs();
    }
  }, [store.mapZoom, store.chargersLoading, store.tripMode, mounted]);

  const dcFast = chargers.filter((c) =>
    c.connections.some((conn) => conn.level === 3)
  ).length;
  const level2 = chargers.filter((c) =>
    c.connections.some((conn) => conn.level === 2)
  ).length;

  const handleLocate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.longitude, pos.coords.latitude]);
        setMapZoom(13);
        store.triggerFlyTo(13);
        setLocating(false);
        setTimeout(() => fetchChargersAndPOIs(), 1600);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!mounted) return null;

  const sidebarPanel = (
    <div className="flex flex-col h-full pt-16 sm:min-w-[380px]">
      {tripMode && (
        <>
          <div className="px-3 pt-3">
            <TripPlanner />
          </div>
          <Separator className="mx-3 my-2" />
        </>
      )}
      <RangeControl />
      <Separator className="mx-3 my-1" />
      <div className="px-3 py-2">
        <FilterBar />
      </div>
      <Separator className="mx-3" />
      <div className="flex-1 min-h-0 mt-1">
        <SidebarContent />
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 pointer-events-none">
        {/* Sidebar toggle - hidden on mobile */}
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-lg border-0 pointer-events-auto rounded-xl hidden sm:flex"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>

        {/* Brand */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-lg rounded-xl px-3 py-1.5">
          <BatteryCharging className="h-4 w-4 text-green-600" />
          <span className="font-bold text-sm tracking-tight hidden sm:inline">EV Companion</span>
          <span className="font-bold text-sm tracking-tight sm:hidden">EV</span>
        </div>

        {/* Search - only in non-trip mode */}
        {!tripMode && (
          <div className="flex-1 flex justify-center pointer-events-auto">
            <SearchBar />
          </div>
        )}

        {/* Trip mode toggle */}
        {!tripMode && (
          <Button
            variant="secondary"
            className="h-9 px-3 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-lg border-0 pointer-events-auto rounded-xl gap-1.5 text-xs"
            onClick={() => {
              setTripMode(true);
              setMobileDrawerOpen(true);
            }}
          >
            <Route className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Plan Trip</span>
          </Button>
        )}

        {/* Mobile: show trip planner button when in trip mode */}
        {tripMode && (
          <Button
            variant="secondary"
            className="h-9 px-3 bg-blue-500 text-white backdrop-blur-sm shadow-lg border-0 pointer-events-auto rounded-xl gap-1.5 text-xs sm:hidden"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <Route className="h-4 w-4" />
            Trip
          </Button>
        )}

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Locate me */}
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-lg border-0 pointer-events-auto rounded-xl"
          onClick={handleLocate}
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
        </Button>
      </header>

      {/* Main area */}
      <div className="flex-1 flex relative">
        {/* Map */}
        <div className="flex-1 relative">
          <EVMap />

          {/* Map legend - bottom left */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs space-y-1.5 hidden sm:block">
            <div className="font-semibold text-xs mb-1">Charger Types</div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 border border-white" />
              <span>DC Fast (Level 3)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 border border-white" />
              <span>Level 2</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-400 border border-white" />
              <span>Level 1</span>
            </div>
            {showPOIs && (
              <>
                <Separator className="my-1.5" />
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-500 border border-white" />
                  <span>Food / Place</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-violet-500 border border-white" />
                  <span>Dog Friendly</span>
                </div>
              </>
            )}
          </div>

          {/* Stats bar - bottom right (desktop) or bottom center (mobile) */}
          {chargers.length > 0 && !chargersLoading && (
            <div className="absolute bottom-4 right-4 sm:right-4 left-auto z-10 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 flex items-center gap-3 text-xs hidden sm:flex">
              <span className="font-semibold">{chargers.length} stations</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-orange-500" />
                {dcFast} DC Fast
              </span>
              <span className="flex items-center gap-1">
                <RotateCcw className="h-3 w-3 text-green-500" />
                {level2} L2
              </span>
            </div>
          )}

          {/* Mobile: bottom pull-up handle */}
          <div className="sm:hidden absolute bottom-0 left-0 right-0 z-10">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="w-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-lg rounded-t-2xl px-4 py-3 flex flex-col items-center gap-1"
            >
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-3 text-xs">
                {tripMode && (
                  <span className="flex items-center gap-1 font-semibold text-blue-600">
                    <Route className="h-3 w-3" />
                    Trip Planner
                  </span>
                )}
                {!tripMode && chargers.length > 0 && (
                  <>
                    <span className="font-semibold">{chargers.length} stations</span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-orange-500" />
                      {dcFast} DC Fast
                    </span>
                  </>
                )}
                {!tripMode && chargers.length === 0 && (
                  <span className="text-muted-foreground">Tap to see filters & results</span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside
          className={`z-10 bg-card border-l border-border/50 flex-col transition-all duration-300 ease-in-out shadow-xl hidden sm:flex ${
            sidebarOpen ? 'w-[380px]' : 'w-0 overflow-hidden'
          }`}
        >
          {sidebarPanel}
        </aside>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <div className="flex flex-col h-full pt-2">
          {tripMode && (
            <>
              <div className="px-3 pt-1">
                <TripPlanner />
              </div>
              <Separator className="mx-3 my-2" />
            </>
          )}
          <RangeControl />
          <Separator className="mx-3 my-1" />
          <div className="px-3 py-2">
            <FilterBar />
          </div>
          <Separator className="mx-3" />
          <div className="flex-1 min-h-0 mt-1">
            <SidebarContent />
          </div>
        </div>
      </MobileDrawer>
    </div>
  );
}
