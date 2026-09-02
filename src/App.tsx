import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import {
  MapPin,
  Plus,
  Crosshair,
  Compass,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { POI, POI_CATEGORIES } from './types';
import { fetchPOIs, createPOI, deletePOI } from './lib/supabase';
import { AddPoiModal } from './components/AddPoiModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';

const DEFAULT_CENTER: [number, number] = [-77.0369, 38.9072]; // [lng, lat]
const DEFAULT_ZOOM = 8;

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // State
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map state
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_CENTER[1],
    lng: DEFAULT_CENTER[0],
  });
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterSearch, setFilterSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Load POIs
  const loadPOIs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchPOIs();
      setPois(res.pois);
      setDataSource(res.source);
      if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading POIs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPOIs();
  }, [loadPOIs]);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right'
    );

    map.on('load', () => {
      map.resize();
    });

    const handleWindowResize = () => {
      map.resize();
    };
    window.addEventListener('resize', handleWindowResize);

    map.on('move', () => {
      const center = map.getCenter();
      setCurrentCenter({
        lat: center.lat,
        lng: center.lng,
      });
      setCurrentZoom(Number(map.getZoom().toFixed(1)));
    });

    mapRef.current = map;

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers on Map when POIs or Filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Filter POIs
    const filtered = pois.filter((poi) => {
      const matchesCategory = selectedCategory === 'All' || poi.category === selectedCategory;
      const matchesSearch =
        filterSearch.trim() === '' ||
        poi.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
        (poi.description && poi.description.toLowerCase().includes(filterSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    filtered.forEach((poi) => {
      // Find category config for color
      const catConfig = POI_CATEGORIES.find((c) => c.id === poi.category) || {
        color: '#dc2626',
        label: poi.category,
      };

      // Custom HTML Marker Element
      const el = document.createElement('div');
      el.className = 'poi-marker-container group cursor-pointer';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';

      el.innerHTML = `
        <div style="
          background-color: ${catConfig.color};
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        ">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
        ${
          poi.elevation !== null && poi.elevation !== undefined
            ? `<div style="
                background-color: #0f172a;
                color: #f8fafc;
                font-size: 10px;
                font-family: monospace;
                padding: 1px 5px;
                border-radius: 4px;
                margin-top: 3px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                white-space: nowrap;
              ">▲ ${Math.round(poi.elevation)}m</div>`
            : ''
        }
      `;

      // Hover pulse
      el.addEventListener('mouseenter', () => {
        const pin = el.firstElementChild as HTMLElement;
        if (pin) pin.style.transform = 'rotate(-45deg) scale(1.15)';
      });
      el.addEventListener('mouseleave', () => {
        const pin = el.firstElementChild as HTMLElement;
        if (pin) pin.style.transform = 'rotate(-45deg) scale(1)';
      });

      // Build popup content
      const popupNode = document.createElement('div');
      popupNode.className = 'p-4 bg-white text-slate-900 rounded-xl space-y-3 font-sans';

      const elevationHTML =
        poi.elevation !== null && poi.elevation !== undefined
          ? `<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-mono font-medium border border-emerald-200/60">
               <span>⛰️ Elevation:</span>
               <span>${poi.elevation} m</span>
             </div>`
          : '';

      popupNode.innerHTML = `
        <div class="border-b border-slate-100 pb-2.5">
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-block px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md text-white" style="background-color: ${catConfig.color};">
              ${catConfig.label}
            </span>
            ${elevationHTML}
          </div>
          <h3 class="text-base font-bold text-slate-900 leading-snug">${escapeHtml(poi.name)}</h3>
        </div>

        ${
          poi.description
            ? `<p class="text-xs text-slate-600 leading-relaxed max-h-32 overflow-y-auto">${escapeHtml(poi.description)}</p>`
            : ''
        }

        <div class="text-[11px] font-mono text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
          <span>Lat: ${poi.latitude.toFixed(5)}</span>
          <span>Lng: ${poi.longitude.toFixed(5)}</span>
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="text-[10px] text-slate-400">
            ${poi.created_at ? new Date(poi.created_at).toLocaleDateString() : ''}
          </span>
          <button
            id="delete-poi-${poi.id}"
            class="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            Delete
          </button>
        </div>
      `;

      // Attach delete click handler
      const deleteBtn = popupNode.querySelector(`#delete-poi-${poi.id}`);
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (window.confirm(`Delete "${poi.name}" from database?`)) {
            await handleDeletePoi(poi.id);
          }
        });
      }

      const popup = new maplibregl.Popup({
        offset: [0, -28],
        closeButton: true,
        closeOnClick: false,
      }).setDOMContent(popupNode);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [pois, selectedCategory, filterSearch]);

  // Handle POI creation
  const handleSavePoi = async (newPoiData: Omit<POI, 'id' | 'created_at'>) => {
    const res = await createPOI(newPoiData);
    setPois((prev) => [res.poi, ...prev]);
    setDataSource(res.source);
    if (res.error) {
      setErrorMessage(res.error);
    }

    // Smoothly fly to newly created POI
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [res.poi.longitude, res.poi.latitude],
        zoom: Math.max(currentZoom, 13),
        essential: true,
      });
    }
  };

  // Handle POI deletion
  const handleDeletePoi = async (id: string) => {
    const res = await deletePOI(id);
    if (res.success) {
      setPois((prev) => prev.filter((p) => p.id !== id));
    } else if (res.error) {
      setErrorMessage(`Failed to delete: ${res.error}`);
    }
  };

  // Fly back to Washington DC
  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        essential: true,
      });
    }
  };

  return (
    <div id="lokator-app" className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans select-none">
      {/* Map Canvas */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />

      {/* Crosshair at Map Center (helps aim when clicking + Add POI) */}
      {showCrosshair && (
        <div
          id="map-center-crosshair"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-70 transition-opacity"
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-red-600 bg-white/40 shadow-xs" />
            <div className="absolute w-6 h-0.5 bg-red-600/70" />
            <div className="absolute h-6 w-0.5 bg-red-600/70" />
          </div>
        </div>
      )}

      {/* Floating Top Bar (Minimal Map-First) */}
      <header
        id="lokator-top-bar"
        className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none"
      >
        {/* Left: Brand & Coordinates Widget */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-200/80">
          <div className="p-1.5 rounded-xl bg-red-600 text-white shadow-xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">Lokator</h1>
              <span className="text-[10px] font-medium text-slate-400 font-mono">v1.0</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>{Math.abs(currentCenter.lat).toFixed(4)}°{currentCenter.lat >= 0 ? 'N' : 'S'}</span>
              <span>•</span>
              <span>{Math.abs(currentCenter.lng).toFixed(4)}°{currentCenter.lng >= 0 ? 'E' : 'W'}</span>
              <span>•</span>
              <span className="text-[10px] text-slate-400">z{currentZoom}</span>
            </div>
          </div>
        </div>

        {/* Right: Controls, Database Status, & Primary Dedicated Action Button */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* Database Connection Pill */}
          <button
            id="supabase-status-pill"
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className={`px-3 py-2 rounded-2xl backdrop-blur-md shadow-lg border text-xs font-medium flex items-center gap-2 cursor-pointer transition-all hover:scale-102 ${
              dataSource === 'supabase'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                : 'bg-white/95 border-amber-300 text-amber-900 hover:bg-amber-50'
            }`}
            title="Click to inspect Supabase credentials & table setup"
          >
            {dataSource === 'supabase' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden sm:inline">
              {dataSource === 'supabase' ? 'Supabase: poi' : 'Supabase: Ready'}
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-900/5 font-mono">
              {pois.length} POIs
            </span>
          </button>

          {/* Dedicated "+ Add POI" Button with lat/long prefilled from center */}
          <button
            id="open-add-poi-btn"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl shadow-xl shadow-red-600/20 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Add POI</span>
          </button>
        </div>
      </header>

      {/* Floating Bottom Filter / Controls Bar (Minimal, clean overlay) */}
      <div
        id="lokator-bottom-controls"
        className="absolute bottom-6 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto"
      >
        {/* Category Filter Pill Menu */}
        <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200/80 flex items-center gap-1 overflow-x-auto max-w-[calc(100vw-120px)] sm:max-w-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All ({pois.length})
          </button>

          {POI_CATEGORIES.map((cat) => {
            const count = pois.filter((p) => p.category === cat.id).length;
            if (count === 0 && selectedCategory !== cat.id) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Crosshair Toggle */}
        <button
          id="toggle-crosshair-btn"
          type="button"
          onClick={() => setShowCrosshair(!showCrosshair)}
          className={`p-2.5 rounded-2xl backdrop-blur-md shadow-lg border text-xs transition-all cursor-pointer ${
            showCrosshair
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-white/95 border-slate-200 text-slate-500 hover:text-slate-800'
          }`}
          title="Toggle Center Crosshair (aiming guide)"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Reset to DC Center */}
        <button
          id="reset-view-btn"
          type="button"
          onClick={handleResetView}
          className="p-2.5 rounded-2xl bg-white/95 hover:bg-white text-slate-700 backdrop-blur-md shadow-lg border border-slate-200/80 text-xs transition-all cursor-pointer"
          title="Center on Washington, DC"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Error Alert Toast if Supabase or network error occurs */}
      {errorMessage && (
        <div
          id="lokator-error-toast"
          className="absolute bottom-20 left-4 right-4 sm:right-auto sm:max-w-md z-30 p-3.5 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-slate-200">Notice</span>
            <p className="text-slate-400 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add POI Dedicated Modal */}
      <AddPoiModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSavePoi}
        currentCenter={currentCenter}
      />

      {/* Supabase Configuration & Status Modal */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onRefresh={loadPOIs}
        dataSource={dataSource}
      />
    </div>
  );
}

// Security string escaper for maplibre HTML popup injection
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
