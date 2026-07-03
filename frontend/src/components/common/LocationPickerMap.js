import React, { useEffect, useRef, useState } from 'react';

/**
 * LocationPickerMap
 * Props:
 *   lat, lng   – current value (number or '')
 *   onChange   – fn({ lat, lng }) called when user clicks map
 */
export default function LocationPickerMap({ lat, lng, onChange }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searching, setSearching] = useState(false);

  const hasPin = lat && lng;

  // Load Leaflet once
  useEffect(() => {
    if (window.L) { setReady(true); return; }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    const existing = document.getElementById('leaflet-js');
    if (existing) {
      existing.onload = () => setReady(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => setReady(true);
    document.head.appendChild(script);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Init map once Leaflet is ready and container is mounted
  useEffect(() => {
    if (!ready || !mapRef.current || leafletMapRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [lat || 20.5937, lng || 78.9629],
      zoom: lat ? 13 : 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Click to place pin
    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      placePinAt(map, clickLat, clickLng);
      onChange({ lat: parseFloat(clickLat.toFixed(6)), lng: parseFloat(clickLng.toFixed(6)) });
    });

    leafletMapRef.current = map;

    // If already has coords, place marker
    if (lat && lng) {
      placePinAt(map, lat, lng);
    }
  }, [ready]); // eslint-disable-line

  // If lat/lng prop changes externally (e.g. search result), move the pin + fly
  useEffect(() => {
    if (!leafletMapRef.current || !lat || !lng) return;
    placePinAt(leafletMapRef.current, lat, lng);
    leafletMapRef.current.setView([lat, lng], 14);
  }, [lat, lng]); // eslint-disable-line

  function placePinAt(map, plat, plng) {
    const L = window.L;
    if (markerRef.current) markerRef.current.remove();

    const icon = L.divIcon({
      html: `<div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        background:#1e3a5f;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,.4);
        transform:rotate(-45deg);
      "></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    markerRef.current = L.marker([plat, plng], { icon })
      .addTo(map)
      .bindPopup(`📍 ${parseFloat(plat).toFixed(5)}, ${parseFloat(plng).toFixed(5)}`)
      .openPopup();
  }

  // Geocode search via OpenStreetMap Nominatim (free, no key)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchVal)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length === 0) {
        alert('Location not found. Try a different search.');
        return;
      }
      const { lat: rLat, lon: rLng } = data[0];
      const newLat = parseFloat(parseFloat(rLat).toFixed(6));
      const newLng = parseFloat(parseFloat(rLng).toFixed(6));
      onChange({ lat: newLat, lng: newLng });
      // map update handled by the lat/lng useEffect above
    } catch {
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          className="form-input"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          placeholder="Search city, village or address…"
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-ghost btn-sm"
          disabled={searching}
          style={{ flexShrink: 0 }}
        >
          {searching ? '⏳' : '🔍 Search'}
        </button>
      </form>

      {/* Map container */}
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--gray-200)' }}>
        <div ref={mapRef} style={{ height: 280, width: '100%' }} />

        {/* Overlay hint */}
        {!hasPin && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(30,58,95,0.85)', color: '#fff',
            padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem',
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1000,
          }}>
            Click on the map to pin school location
          </div>
        )}

        {!ready && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(255,255,255,0.85)', zIndex: 1001,
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Loading map…</span>
          </div>
        )}
      </div>

      {/* Coordinates display */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <div style={{ flex: 1, background: 'var(--gray-50)', borderRadius: 7, padding: '7px 12px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--gray-500)' }}>Lat: </span>
          <strong>{lat || '—'}</strong>
        </div>
        <div style={{ flex: 1, background: 'var(--gray-50)', borderRadius: 7, padding: '7px 12px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--gray-500)' }}>Lng: </span>
          <strong>{lng || '—'}</strong>
        </div>
        {hasPin && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--danger, #dc2626)', fontSize: '0.75rem' }}
            onClick={() => {
              if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
              onChange({ lat: '', lng: '' });
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>
    </div>
  );
}
