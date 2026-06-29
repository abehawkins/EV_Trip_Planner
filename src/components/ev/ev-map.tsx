'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEVStore } from '@/lib/ev-store';
import { getConnectionColor } from '@/lib/ev-helpers';

export default function EVMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const {
    setMapCenter, setMapZoom,
    rangeMiles, showRange,
    chargers, selectedCharger, setSelectedCharger,
    pois, showPOIs, dogFriendlyOnly,
    flyToTrigger, flyToZoom,
    tripOrigin, tripDestination, tripRoute,
    chargeStops,
  } = useEVStore();

  const [mapReady, setMapReady] = useState(false);
  const lastFlyToCenter = useRef<string>('');

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const { mapCenter: initCenter, mapZoom: initZoom } = useEVStore.getState();

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        name: 'EV Companion',
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: initCenter,
      zoom: initZoom,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('moveend', () => {
      const c = map.getCenter();
      const key = `${c.lng.toFixed(4)},${c.lat.toFixed(4)}`;
      if (key !== lastFlyToCenter.current) {
        setMapCenter([c.lng, c.lat]);
        setMapZoom(map.getZoom());
      }
      lastFlyToCenter.current = '';
    });

    map.on('load', () => {
      map.addSource('chargers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addSource('pois', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addSource('range-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addSource('trip-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'range-circle-layer',
        type: 'fill',
        source: 'range-circle',
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': 0.08,
          'fill-outline-color': '#22c55e',
        },
      });

      map.addLayer({
        id: 'trip-route-line',
        type: 'line',
        source: 'trip-route',
        filter: ['==', ['get', 'kind'], 'route'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'trip-origin-dot',
        type: 'circle',
        source: 'trip-route',
        filter: ['==', ['get', 'kind'], 'origin'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#22c55e',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'trip-dest-dot',
        type: 'circle',
        source: 'trip-route',
        filter: ['==', ['get', 'kind'], 'dest'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#ef4444',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'trip-stop-dot',
        type: 'circle',
        source: 'trip-route',
        filter: ['==', ['get', 'kind'], 'stop'],
        paint: {
          'circle-radius': 7,
          'circle-color': '#f97316',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'trip-stop-label',
        type: 'symbol',
        source: 'trip-route',
        filter: ['==', ['get', 'kind'], 'stop'],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-font': ['Open Sans Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'pois-layer',
        type: 'circle',
        source: 'pois',
        paint: {
          'circle-radius': 7,
          'circle-color': ['case',
            ['==', ['get', 'dogFriendly'], true], '#8b5cf6',
            '#06b6d4',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'chargers-layer',
        type: 'circle',
        source: 'chargers',
        paint: {
          'circle-radius': ['case',
            ['==', ['get', 'selected'], true], 12,
            9,
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'chargers-label',
        type: 'symbol',
        source: 'chargers',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-font': ['Open Sans Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      map.on('click', 'chargers-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (props) {
          const id = props.id as number;
          const store = useEVStore.getState();
          const charger = store.chargers.find((c) => c.id === id);
          if (charger) {
            store.setSelectedCharger(charger);
            store.setSidebarOpen(true);
          }
        }
      });

      map.on('mouseenter', 'chargers-layer', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        const props = f.properties;

        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ offset: 15, closeButton: false, className: 'ev-popup' })
          .setLngLat(coords)
          .setHTML(
            `<div style="padding:4px 8px;font-family:system-ui;">
              <strong style="font-size:13px;">${props?.name || ''}</strong><br/>
              <span style="color:#64748b;font-size:12px;">
                ${props?.ports || 0} port${(props?.ports || 0) !== 1 ? 's' : ''}
                ${props?.maxPower ? ` &middot; ${props.maxPower}kW` : ''}
              </span>
            </div>`
          )
          .addTo(map);
      });

      map.on('mouseleave', 'chargers-layer', () => {
        map.getCanvas().style.cursor = '';
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });

      map.on('mouseenter', 'pois-layer', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        const props = f.properties;

        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ offset: 15, closeButton: false, className: 'ev-popup' })
          .setLngLat(coords)
          .setHTML(
            `<div style="padding:4px 8px;font-family:system-ui;">
              <strong style="font-size:13px;">${props?.name || ''}</strong><br/>
              <span style="color:#64748b;font-size:12px;">
                ${props?.type || ''}${props?.cuisine ? ` &middot; ${props.cuisine}` : ''}
                ${props?.dogFriendly ? ' &middot; Dog friendly' : ''}
              </span>
            </div>`
          )
          .addTo(map);
      });

      map.on('mouseleave', 'pois-layer', () => {
        map.getCanvas().style.cursor = '';
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly-to trigger
  useEffect(() => {
    if (!mapRef.current || flyToTrigger === 0) return;
    const center = useEVStore.getState().mapCenter;
    const cKey = `${center[0].toFixed(4)},${center[1].toFixed(4)}`;
    lastFlyToCenter.current = cKey;
    mapRef.current.flyTo({ center, zoom: flyToZoom, duration: 1500 });
  }, [flyToTrigger]);

  // Update charger GeoJSON
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    const features: GeoJSON.Feature[] = chargers.map((charger) => {
      const topLevel = charger.connections.length > 0
        ? Math.max(...charger.connections.map((c) => c.level))
        : 0;
      const maxPowers = charger.connections
        .map((c) => c.power)
        .filter((p): p is number => p !== null && p > 0);
      const topPower = maxPowers.length > 0 ? Math.max(...maxPowers) : 0;

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [charger.lng, charger.lat] },
        properties: {
          id: charger.id,
          name: charger.name,
          color: getConnectionColor(topLevel),
          label: topLevel === 3 ? 'DC' : topLevel === 2 ? 'L2' : 'L1',
          ports: charger.numberOfPoints,
          maxPower: topPower > 0 ? topPower : null,
          selected: selectedCharger?.id === charger.id,
        },
      };
    });

    const src = map.getSource('chargers') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features });
    }
  }, [chargers, selectedCharger, mapReady]);

  // Update POI GeoJSON
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    const poisToRender = showPOIs
      ? (dogFriendlyOnly ? pois.filter((p) => p.dogFriendly) : pois)
      : [];

    const features: GeoJSON.Feature[] = poisToRender.map((poi) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [poi.lng, poi.lat] },
      properties: {
        id: poi.id,
        name: poi.name,
        type: poi.type,
        cuisine: poi.cuisine,
        dogFriendly: poi.dogFriendly,
      },
    }));

    const src = map.getSource('pois') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'FeatureCollection', features });
    }
  }, [pois, showPOIs, dogFriendlyOnly, mapReady]);

  // Range circle
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const src = map.getSource('range-circle') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const updateCircle = () => {
      if (!showRange || rangeMiles <= 0) {
        src.setData({ type: 'FeatureCollection', features: [] });
        return;
      }
      const center = map.getCenter();
      const rLat = rangeMiles / 69;
      const rLng = rangeMiles / (69 * Math.cos((center.lat * Math.PI) / 180));
      const pts: [number, number][] = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i * 2 * Math.PI) / 64;
        pts.push([center.lng + rLng * Math.cos(a), center.lat + rLat * Math.sin(a)]);
      }
      pts.push(pts[0]);
      src.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [pts] },
      } as GeoJSON.Feature);
    };

    updateCircle();
    map.on('move', updateCircle);
    return () => { map.off('move', updateCircle); };
  }, [showRange, rangeMiles, mapReady]);

  // Trip route + stops
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const src = map.getSource('trip-route') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features: GeoJSON.Feature[] = [];

    if (tripRoute && tripOrigin && tripDestination) {
      features.push({
        type: 'Feature',
        properties: { kind: 'route' },
        geometry: { type: 'LineString', coordinates: tripRoute.geometry },
      });
      features.push({
        type: 'Feature',
        properties: { kind: 'origin' },
        geometry: { type: 'Point', coordinates: [tripOrigin.lng, tripOrigin.lat] },
      });
      features.push({
        type: 'Feature',
        properties: { kind: 'dest' },
        geometry: { type: 'Point', coordinates: [tripDestination.lng, tripDestination.lat] },
      });
      chargeStops.forEach((stop, i) => {
        features.push({
          type: 'Feature',
          properties: { kind: 'stop', label: String(i + 1) },
          geometry: { type: 'Point', coordinates: [stop.charger.lng, stop.charger.lat] },
        });
      });
    } else if (tripOrigin && tripDestination) {
      features.push({
        type: 'Feature',
        properties: { kind: 'route' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [tripOrigin.lng, tripOrigin.lat],
            [tripDestination.lng, tripDestination.lat],
          ],
        },
      });
      features.push({
        type: 'Feature',
        properties: { kind: 'origin' },
        geometry: { type: 'Point', coordinates: [tripOrigin.lng, tripOrigin.lat] },
      });
      features.push({
        type: 'Feature',
        properties: { kind: 'dest' },
        geometry: { type: 'Point', coordinates: [tripDestination.lng, tripDestination.lat] },
      });
    }

    src.setData({ type: 'FeatureCollection', features });
  }, [tripOrigin, tripDestination, tripRoute, chargeStops, mapReady]);

  // Fly to selected charger
  useEffect(() => {
    if (selectedCharger && mapRef.current) {
      const cKey = `${selectedCharger.lng.toFixed(4)},${selectedCharger.lat.toFixed(4)}`;
      lastFlyToCenter.current = cKey;
      mapRef.current.flyTo({
        center: [selectedCharger.lng, selectedCharger.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [selectedCharger]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
}
