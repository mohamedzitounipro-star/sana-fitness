import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { VisitedGym, FitnessParkClub } from '../types';
import { FITNESS_PARK_DIRECTORY } from '../data/fitnessParkDirectory';
import { Navigation, Loader2, Layers, Eye, EyeOff, Map as MapIcon, Moon, Globe } from 'lucide-react';
import { escapeHtml } from '../utils/geo';

interface MapFranceProps {
  visitedGyms: VisitedGym[];
  onSelectGym: (gym: VisitedGym) => void;
  onQuickAddClub: (club: FitnessParkClub) => void;
  selectedGymId?: string | null;
  onGeolocateClub?: (club: FitnessParkClub) => void;
}

type MapTheme = 'apple' | 'dark' | 'satellite';

export const MapFrance: React.FC<MapFranceProps> = ({
  visitedGyms,
  onSelectGym,
  onQuickAddClub,
  selectedGymId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Layers
  const appleLayerRef = useRef<L.TileLayer | null>(null);
  const darkLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>('apple');
  const [showUnvisited, setShowUnvisited] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(6);
  const [isLocating, setIsLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  // Initialize Map and Layers
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered on France, with worldwide pan and zoom capability
    const map = L.map(mapContainerRef.current, {
      center: [46.7, 2.3],
      zoom: 6,
      minZoom: 3,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 2000,
      bounceAtZoomLimits: false,
      wheelDebounceTime: 40,
    });

    // 1. Apple Plans Style: CartoDB Voyager Retina (Ultra sharp vector-like roads & cities)
    const appleLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      {
        subdomains: 'abcd',
        maxZoom: 20,
        keepBuffer: 4,
        updateWhenIdle: true,
      }
    );
    appleLayerRef.current = appleLayer;

    // 2. Dark Mode: CartoDB Dark Matter Retina
    const darkLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      {
        subdomains: 'abcd',
        maxZoom: 20,
        keepBuffer: 4,
        updateWhenIdle: true,
      }
    );
    darkLayerRef.current = darkLayer;

    // 3. Satellite HD: Esri World Imagery + Labels
    const satBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        keepBuffer: 3,
        updateWhenIdle: true,
      }
    );
    const satLabels = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        opacity: 0.9,
        keepBuffer: 3,
        updateWhenIdle: true,
      }
    );
    const satelliteGroup = L.layerGroup([satBase, satLabels]);
    satelliteGroupRef.current = satelliteGroup;

    // Set Apple Plans layer as default
    appleLayer.addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Track zoom level for smart marker decluttering
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // Recalibrate size on resize / mobile orientation change
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Theme Switcher Handler
  const handleCycleTheme = () => {
    const map = mapInstanceRef.current;
    const apple = appleLayerRef.current;
    const dark = darkLayerRef.current;
    const sat = satelliteGroupRef.current;
    if (!map || !apple || !dark || !sat) return;

    // Remove all base layers
    if (map.hasLayer(apple)) map.removeLayer(apple);
    if (map.hasLayer(dark)) map.removeLayer(dark);
    if (map.hasLayer(sat)) map.removeLayer(sat);

    if (mapTheme === 'apple') {
      dark.addTo(map);
      setMapTheme('dark');
    } else if (mapTheme === 'dark') {
      sat.addTo(map);
      setMapTheme('satellite');
    } else {
      apple.addTo(map);
      setMapTheme('apple');
    }
  };

  // Render Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const isZoomedOut = zoomLevel < 7.5;

    // 1. Unvisited Fitness Parks (Only if toggled ON)
    if (showUnvisited) {
      FITNESS_PARK_DIRECTORY.forEach((club) => {
        const isVisited = visitedGyms.some(
          (vg) =>
            vg.clubId === club.id ||
            vg.name.toLowerCase().includes(club.city.toLowerCase()) ||
            (Math.abs(vg.lat - club.lat) < 0.015 && Math.abs(vg.lng - club.lng) < 0.015)
        );

        if (!isVisited) {
          // When zoomed out, show subtle, elegant golden constellations
          // When zoomed in, show interactive touchable club markers
          const marker = L.circleMarker([club.lat, club.lng], {
            radius: isZoomedOut ? 3 : 6,
            fillColor: isZoomedOut ? '#d97706' : '#ffffff',
            color: isZoomedOut ? '#b45309' : '#0f172a',
            weight: isZoomedOut ? 1 : 2,
            opacity: isZoomedOut ? 0.8 : 0.95,
            fillOpacity: isZoomedOut ? 0.75 : 0.9,
          });

          marker.bindTooltip(
            `<div class="font-bold text-xs">${escapeHtml(club.name)}</div><div class="text-[10px] text-amber-600 font-semibold">Toucher pour débloquer</div>`,
            { direction: 'top', offset: [0, -6], opacity: 0.95 }
          );

          marker.on('click', () => {
            onQuickAddClub(club);
          });

          markersGroup.addLayer(marker);
        }
      });
    }

    // 2. Visited gyms with high-contrast glowing pins
    visitedGyms.forEach((gym) => {
      const isSelected = selectedGymId === gym.id;
      const safeCity = escapeHtml(gym.city);

      const visitedIcon = L.divIcon({
        className: 'visited-gym-pin map-pin',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer ${
            isSelected ? 'scale-125 z-50' : ''
          }">
            <div class="px-2.5 py-1 rounded-full ${
              isSelected ? 'bg-amber-500 text-white shadow-xl ring-4 ring-amber-300' : 'bg-neutral-950 text-white shadow-lg'
            } font-bold text-xs flex items-center gap-1.5 border-2 border-white">
              <span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-400'}"></span>
              <span class="max-w-[85px] truncate text-[11px]">${safeCity}</span>
            </div>
            <div class="w-2.5 h-2.5 -mt-1 rotate-45 ${isSelected ? 'bg-amber-500' : 'bg-neutral-950'} border-r-2 border-b-2 border-white"></div>
          </div>
        `,
        iconSize: [100, 36],
        iconAnchor: [50, 36],
      });

      const marker = L.marker([gym.lat, gym.lng], { icon: visitedIcon, zIndexOffset: 1000 });
      marker.on('click', () => {
        onSelectGym(gym);
      });

      markersGroup.addLayer(marker);
    });

    if (selectedGymId) {
      const target = visitedGyms.find((g) => g.id === selectedGymId);
      if (target) {
        map.flyTo([target.lat, target.lng], 13, { duration: 0.8 });
      }
    }
  }, [visitedGyms, selectedGymId, onSelectGym, onQuickAddClub, showUnvisited, zoomLevel]);

  // Geolocation Handler
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoMessage('La géolocalisation n’est pas supportée par ton navigateur.');
      setTimeout(() => setGeoMessage(null), 4000);
      return;
    }

    setIsLocating(true);
    setGeoMessage('Recherche de ta position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const map = mapInstanceRef.current;
        if (!map) return;

        map.flyTo([latitude, longitude], 14, { duration: 1.2 });

        if (userLocationMarkerRef.current) {
          map.removeLayer(userLocationMarkerRef.current);
        }

        const userIcon = L.divIcon({
          className: 'user-gps-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 rounded-full bg-amber-400/40 animate-ping"></div>
              <div class="w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-xl"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const userMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
        userMarker.bindTooltip('<div class="text-xs font-bold text-neutral-900">Tu es ici</div>', {
          permanent: false,
          direction: 'top',
        });
        userLocationMarkerRef.current = userMarker;

        setGeoMessage('Position trouvée !');
        setTimeout(() => setGeoMessage(null), 3000);
      },
      (error) => {
        setIsLocating(false);
        setGeoMessage('Impossible d’accéder à ta position GPS.');
        setTimeout(() => setGeoMessage(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="absolute inset-0 w-full h-[100dvh] overflow-hidden bg-slate-100">
      {/* Real Fullscreen Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Status Toast for Geolocation */}
      {geoMessage && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-[1600] px-4 py-2 bg-neutral-900/95 text-white text-xs font-semibold rounded-full shadow-2xl border border-neutral-700 backdrop-blur-md animate-in fade-in slide-in-from-top-2"
          style={{ top: 'calc(env(safe-area-inset-top, 44px) + 70px)' }}
        >
          {geoMessage}
        </div>
      )}

      {/* Floating Map Controls on right (positioned safely below the header) */}
      <div 
        className="absolute right-3.5 sm:right-5 z-[1400] flex flex-col gap-2.5"
        style={{
          top: 'calc(env(safe-area-inset-top, 44px) + 68px)',
        }}
      >
        {/* Toggle Unvisited Clubs (313 clubs) */}
        <button
          onClick={() => setShowUnvisited(!showUnvisited)}
          className={`p-3 rounded-2xl shadow-lg border transition-all flex items-center justify-center cursor-pointer active:scale-95 backdrop-blur-md ${
            showUnvisited 
              ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-amber-400/20' 
              : 'bg-white/95 text-neutral-500 border-neutral-200/80 hover:text-neutral-900'
          }`}
          title={showUnvisited ? 'Masquer les 313 clubs non visités' : 'Afficher les 313 clubs à découvrir'}
        >
          {showUnvisited ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Apple Plans / Dark / Satellite Mode Switcher */}
        <button
          onClick={handleCycleTheme}
          className="p-3 bg-white/95 text-neutral-800 rounded-2xl shadow-lg border border-neutral-200/80 hover:bg-white transition-all flex items-center justify-center cursor-pointer active:scale-95 backdrop-blur-md"
          title={`Style de carte: ${mapTheme === 'apple' ? 'Apple Plans' : mapTheme === 'dark' ? 'Sombre' : 'Satellite'}`}
        >
          {mapTheme === 'apple' && <MapIcon className="w-4 h-4 text-emerald-600" />}
          {mapTheme === 'dark' && <Moon className="w-4 h-4 text-indigo-600" />}
          {mapTheme === 'satellite' && <Globe className="w-4 h-4 text-amber-600" />}
        </button>

        {/* Real Geolocation Button */}
        <button
          onClick={handleGeolocate}
          disabled={isLocating}
          className="p-3 bg-white/95 text-neutral-900 rounded-2xl shadow-lg border border-neutral-200/80 hover:bg-white transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50 backdrop-blur-md group"
          title="Me géolocaliser"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 text-neutral-900 group-hover:text-amber-500 transition-colors" />
          )}
        </button>
      </div>
    </div>
  );
};
