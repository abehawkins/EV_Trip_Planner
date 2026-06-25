'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEVStore } from '@/lib/ev-store';
import { getConnectionColor } from '@/lib/ev-helpers';

export default function EVMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const rangeCircleRef = useRef<maplibregl.Popup | null>(null);

  const {
    mapCenter, mapZoom, setMapCenter, setMapZoom,
    rangeMiles, showRange,
    chargers, selectedCharger, setSelectedCharger,
    pois, showPOIs, dogFriendlyOnly,
  } = useEVStore();

  const [mapReady, setMapReady] = useState(false);

  // Initialize map — read initial center/zoom from store directly to avoid stale closure
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
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
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
      const center = map.getCenter();
      setMapCenter([center.lng, center.lat]);
      setMapZoom(map.getZoom());
    });

    map.on('load', () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    }, []);

  // Sync map center/zoom from external changes (e.g. search result)
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: mapCenter, zoom: Math.max(mapZoom, 10), duration: 1500 });
    }
  // Only run when mapCenter identity changes (search result)
  }, [mapCenter[0], mapCenter[1]]);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  // Render charger markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    clearMarkers();

    chargers.forEach((charger) => {
      if (!charger.lat || !charger.lng) return;

      const topLevel = charger.connections.length > 0
        ? Math.max(...charger.connections.map((c) => c.level))
        : 0;
      const color = getConnectionColor(topLevel);
      const maxPower = charger.connections
        .map((c) => c.power)
        .filter((p): p is number => p !== null && p > 0);
      const topPower = maxPower.length > 0 ? Math.max(...maxPower) : 0;

      const el = document.createElement('div');
      el.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 12px; font-weight: 700;
        cursor: pointer; transition: transform 0.15s;
      `;
      el.textContent = topLevel === 3 ? 'DC' : topLevel === 2 ? 'L2' : 'L1';
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([charger.lng, charger.lat])
        .addTo(mapRef.current!);

      marker.getElement().addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedCharger(charger);
        useEVStore.getState().setSidebarOpen(true);
      });

      // Hover tooltip
      marker.setPopup(
        new maplibregl.Popup({ offset: 20, closeButton: false, className: 'ev-popup' })
          .setHTML(
            `<div style="padding:4px 8px;font-family:system-ui;">
              <strong style="font-size:13px;">${charger.name}</strong><br/>
              <span style="color:#64748b;font-size:12px;">
                ${charger.connections.length} port${charger.connections.length !== 1 ? 's' : ''}
                ${topPower > 0 ? ` · ${topPower}kW` : ''}
                ${charger.distance ? ` · ${charger.distance.toFixed(1)} mi` : ''}
              </span>
            </div>`
          )
      );

      markersRef.current.push(marker);
    });

    // Render POI markers
    if (showPOIs) {
      const poisToRender = dogFriendlyOnly
        ? pois.filter((p) => p.dogFriendly)
        : pois;

      poisToRender.forEach((poi) => {
        if (!poi.lat || !poi.lng) return;

        const el = document.createElement('div');
        el.style.cssText = `
          width: 28px; height: 28px; border-radius: 50%;
          background: ${poi.dogFriendly ? '#8b5cf6' : '#06b6d4'};
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; cursor: pointer;
        `;
        el.textContent = poi.dogFriendly ? '🐕' : '🍽️';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([poi.lng, poi.lat])
          .addTo(mapRef.current!);

        marker.setPopup(
          new maplibregl.Popup({ offset: 20, closeButton: false, className: 'ev-popup' })
            .setHTML(
              `<div style="padding:4px 8px;font-family:system-ui;">
                <strong style="font-size:13px;">${poi.name}</strong><br/>
                <span style="color:#64748b;font-size:12px;">
                  ${poi.type}${poi.cuisine ? ` · ${poi.cuisine}` : ''}
                  ${poi.dogFriendly ? ' · 🐕 Dog friendly' : ''}
                </span>
              </div>`
            )
        );

        markersRef.current.push(marker);
      });
    }
  }, [chargers, pois, mapReady, showPOIs, dogFriendlyOnly, clearMarkers, setSelectedCharger]);

  // Range circle
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;
    const sourceId = 'range-circle';
    const layerId = 'range-circle-layer';

    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }

    if (showRange && rangeMiles > 0) {
      const center = map.getCenter();
      const radiusMiles = rangeMiles;
      const radiusDegLat = radiusMiles / 69;
      const radiusDegLng = radiusMiles / (69 * Math.cos((center.lat * Math.PI) / 180));

      // Generate circle points
      const circlePoints: [number, number][] = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i * 2 * Math.PI) / 64;
        circlePoints.push([
          center.lng + radiusDegLng * Math.cos(angle),
          center.lat + radiusDegLat * Math.sin(angle),
        ]);
      }
      circlePoints.push(circlePoints[0]); // close the ring

      const geojson = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [circlePoints],
        },
      };

      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': 0.08,
          'fill-outline-color': '#22c55e',
        },
      });

      // Update on map move
      const updateCircle = () => {
        const c = map.getCenter();
        const points: [number, number][] = [];
        for (let i = 0; i <= 64; i++) {
          const angle = (i * 2 * Math.PI) / 64;
          points.push([
            c.lng + radiusDegLng * Math.cos(angle),
            c.lat + radiusDegLat * Math.sin(angle),
          ]);
        }
        points.push(points[0]);
        const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [points],
            },
          });
        }
      };

      map.on('move', updateCircle);
      return () => {
        map.off('move', updateCircle);
      };
    }
  }, [showRange, rangeMiles, mapReady]);

  // Fly to selected charger
  useEffect(() => {
    if (selectedCharger && mapRef.current) {
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