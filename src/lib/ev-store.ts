import { create } from 'zustand';

export interface ChargerConnection {
  id: number;
  level: number;
  power: number | null;
  type: string;
  typeId: number;
  status: number;
  quantity: number;
}

export interface Charger {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
  distance: number | null;
  connections: ChargerConnection[];
  operator: string;
  network: string;
  usageCost: string;
  status: number;
  generalComments: string;
  numberOfPoints: number;
}

export interface POI {
  id: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
  dogFriendly: boolean;
  outdoorSeating: boolean;
  cuisine: string;
  phone: string;
  website: string;
  openingHours: string;
}

export interface TripPoint {
  name: string;
  lat: number;
  lng: number;
}

export interface TripRoute {
  geometry: [number, number][];
  distanceMiles: number;
  durationMinutes: number;
}

export interface ChargeStop {
  charger: Charger;
  distanceFromStart: number;
  estimatedBatteryOnArrival: number;
  estimatedBatteryOnDeparture: number;
}

interface EVStore {
  // Map state
  mapCenter: [number, number];
  mapZoom: number;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;

  flyToTrigger: number;
  flyToZoom: number;
  triggerFlyTo: (zoom: number) => void;

  // Vehicle / range
  rangeMiles: number;
  setRangeMiles: (miles: number) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Chargers
  chargers: Charger[];
  setChargers: (c: Charger[]) => void;
  chargersLoading: boolean;
  setChargersLoading: (l: boolean) => void;
  selectedCharger: Charger | null;
  setSelectedCharger: (c: Charger | null) => void;

  // POIs
  pois: POI[];
  setPois: (p: POI[]) => void;
  poisLoading: boolean;
  setPoisLoading: (l: boolean) => void;

  // Filters
  chargerType: string;
  setChargerType: (t: string) => void;
  showPOIs: boolean;
  setShowPOIs: (s: boolean) => void;
  poiTypes: string[];
  setPoiTypes: (t: string[]) => void;
  dogFriendlyOnly: boolean;
  setDogFriendlyOnly: (d: boolean) => void;
  showRange: boolean;
  setShowRange: (s: boolean) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;

  // Trip planning
  tripMode: boolean;
  setTripMode: (v: boolean) => void;
  tripOrigin: TripPoint | null;
  setTripOrigin: (p: TripPoint | null) => void;
  tripDestination: TripPoint | null;
  setTripDestination: (p: TripPoint | null) => void;
  tripRoute: TripRoute | null;
  setTripRoute: (r: TripRoute | null) => void;
  tripRouteLoading: boolean;
  setTripRouteLoading: (l: boolean) => void;
  chargeStops: ChargeStop[];
  setChargeStops: (s: ChargeStop[]) => void;

  // Mobile sidebar (drawer)
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (o: boolean) => void;
}

export const useEVStore = create<EVStore>((set) => ({
  mapCenter: [-98.5795, 39.8283],
  mapZoom: 4,
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),

  flyToTrigger: 0,
  flyToZoom: 4,
  triggerFlyTo: (zoom) => set((s) => ({ flyToTrigger: s.flyToTrigger + 1, flyToZoom: zoom })),

  rangeMiles: 200,
  setRangeMiles: (miles) => set({ rangeMiles: miles }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  chargers: [],
  setChargers: (c) => set({ chargers: c }),
  chargersLoading: false,
  setChargersLoading: (l) => set({ chargersLoading: l }),
  selectedCharger: null,
  setSelectedCharger: (c) => set({ selectedCharger: c }),

  pois: [],
  setPois: (p) => set({ pois: p }),
  poisLoading: false,
  setPoisLoading: (l) => set({ poisLoading: l }),

  chargerType: 'all',
  setChargerType: (t) => set({ chargerType: t }),
  showPOIs: false,
  setShowPOIs: (s) => set({ showPOIs: s }),
  poiTypes: ['restaurant', 'cafe', 'fast_food'],
  setPoiTypes: (t) => set({ poiTypes: t }),
  dogFriendlyOnly: false,
  setDogFriendlyOnly: (d) => set({ dogFriendlyOnly: d }),
  showRange: true,
  setShowRange: (s) => set({ showRange: s }),

  sidebarOpen: true,
  setSidebarOpen: (o) => set({ sidebarOpen: o }),

  tripMode: false,
  setTripMode: (v) => set({ tripMode: v }),
  tripOrigin: null,
  setTripOrigin: (p) => set({ tripOrigin: p }),
  tripDestination: null,
  setTripDestination: (p) => set({ tripDestination: p }),
  tripRoute: null,
  setTripRoute: (r) => set({ tripRoute: r }),
  tripRouteLoading: false,
  setTripRouteLoading: (l) => set({ tripRouteLoading: l }),
  chargeStops: [],
  setChargeStops: (s) => set({ chargeStops: s }),

  mobileDrawerOpen: false,
  setMobileDrawerOpen: (o) => set({ mobileDrawerOpen: o }),
}));
