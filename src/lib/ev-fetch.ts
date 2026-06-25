import { useEVStore } from './ev-store';

export async function fetchChargersAndPOIs() {
  const store = useEVStore.getState();
  const [lng, lat] = store.mapCenter;
  const dist = Math.max(store.rangeMiles, 10);

  // Fetch chargers
  store.setChargersLoading(true);
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      distance: dist.toString(),
      maxresults: '100',
    });
    if (store.chargerType !== 'all') params.set('chargerType', store.chargerType);
    const res = await fetch(`/api/chargers?${params}`);
    const data = await res.json();
    store.setChargers(data.chargers || []);

    // Fetch POIs if enabled
    if (store.showPOIs) {
      store.setPoisLoading(true);
      try {
        const poiParams = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radius: (store.rangeMiles * 1609.34).toString(),
          types: store.poiTypes.join(','),
        });
        const poiRes = await fetch(`/api/poi?${poiParams}`);
        const poiData = await poiRes.json();
        store.setPois(poiData.pois || []);
      } catch (err) {
        console.error('POI fetch failed:', err);
      } finally {
        store.setPoisLoading(false);
      }
    }
  } catch (err) {
    console.error('Charger fetch failed:', err);
  } finally {
    store.setChargersLoading(false);
  }
}