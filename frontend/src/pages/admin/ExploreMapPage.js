import React, { useEffect, useState } from 'react';
import { superAdminAPI } from '../../api';
import { PageLoader } from '../../components/common';
import toast from 'react-hot-toast';

// Dynamic Leaflet import to avoid SSR issues
let L = null;

export default function ExploreMapPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const mapRef = React.useRef(null);
  const leafletMapRef = React.useRef(null);
  const markersRef = React.useRef([]);

  useEffect(() => {
    // Load all schools
    superAdminAPI.getSchools({ limit: 500 })
      .then(r => setSchools(r.data.data.schools || []))
      .catch(() => toast.error('Failed to load schools'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => {
      L = window.L;
      setMapReady(true);
    };
    document.head.appendChild(script);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMapRef.current) return;

    // Init map centered on India
    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    leafletMapRef.current = map;
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || schools.length === 0) return;

    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = [];

    schools.forEach(school => {
      const lat = school.location?.lat;
      const lng = school.location?.lng;
      if (!lat || !lng) return;

      bounds.push([lat, lng]);

      // Custom icon: school logo or fallback letter
      let iconHtml;
      if (school.logo?.url) {
        iconHtml = `
          <div style="
            width:44px;height:44px;border-radius:50%;border:3px solid #1e3a5f;
            background:#fff;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25);
          ">
            <img src="${school.logo.url}" style="width:100%;height:100%;object-fit:cover;" />
          </div>`;
      } else {
        const letter = (school.name || 'S').charAt(0).toUpperCase();
        iconHtml = `
          <div style="
            width:44px;height:44px;border-radius:50%;border:3px solid #1e3a5f;
            background:#1e3a5f;color:#fff;font-weight:700;font-size:1.1rem;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 8px rgba(0,0,0,.25);
          ">${letter}</div>`;
      }

      const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -24],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:180px;">
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">${school.name}</div>
            <div style="font-size:0.75rem;color:#666;margin-bottom:4px;">${school.schoolCode} • ${school.type || ''}</div>
            <div style="font-size:0.75rem;color:#888;">${[school.address?.village, school.address?.district, school.address?.state].filter(Boolean).join(', ')}</div>
            <div style="margin-top:6px;">
              <span style="
                display:inline-block;padding:2px 8px;border-radius:20px;font-size:0.7rem;font-weight:600;
                background:${school.status === 'active' ? '#f0fdf4' : '#f3f4f6'};
                color:${school.status === 'active' ? '#16a34a' : '#6b7280'};
              ">${school.status}</span>
            </div>
          </div>
        `);

      marker.on('click', () => setSelectedSchool(school));
      markersRef.current.push(marker);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [mapReady, schools]);

  const schoolsWithLocation = schools.filter(s => s.location?.lat && s.location?.lng);
  const schoolsWithoutLocation = schools.length - schoolsWithLocation.length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>🗺️ Explore Schools Map</h1>
          <p>{schoolsWithLocation.length} schools on map{schoolsWithoutLocation > 0 ? ` • ${schoolsWithoutLocation} missing coordinates` : ''}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, height: 'calc(100vh - 180px)', minHeight: 500 }}>
        {/* Map */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--gray-200)', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 1000 }}>
              <PageLoader message="Loading schools..." />
            </div>
          )}
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Schools list panel */}
        <div className="card" style={{ overflow: 'auto', padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)', fontWeight: 600, fontSize: '0.9rem' }}>
            Schools ({schools.length})
          </div>
          <div style={{ overflow: 'auto' }}>
            {schools.map(school => {
              const hasLoc = school.location?.lat && school.location?.lng;
              const isSelected = selectedSchool?._id === school._id;
              return (
                <div
                  key={school._id}
                  onClick={() => {
                    if (hasLoc && leafletMapRef.current) {
                      leafletMapRef.current.setView([school.location.lat, school.location.lng], 14);
                      setSelectedSchool(school);
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--gray-100)',
                    cursor: hasLoc ? 'pointer' : 'default',
                    background: isSelected ? 'var(--primary-light, #e8f0fe)' : 'transparent',
                    display: 'flex', gap: 10, alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                >
                  {school.logo?.url
                    ? <img src={school.logo.url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gray-200)', flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{school.name?.charAt(0)}</div>
                  }
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{school.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{school.address?.district || school.schoolCode} {!hasLoc && '• No coordinates'}</div>
                  </div>
                  {hasLoc && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>📍</span>}
                </div>
              );
            })}
            {schools.length === 0 && !loading && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                No schools found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
