import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { VisitedGym, FitnessParkClub } from '../types';
import { FITNESS_PARK_DIRECTORY } from '../data/fitnessParkDirectory';
import { Navigation, Loader2, Eye, EyeOff } from 'lucide-react';
import { escapeHtml } from '../utils/geo';

interface MapFranceProps {
  visitedGyms: VisitedGym[];
  onSelectGym: (gym: VisitedGym) => void;
  onQuickAddClub: (club: FitnessParkClub) => void;
  selectedGymId?: string | null;
  onGeolocateClub?: (club: FitnessParkClub) => void;
}

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

  const [zoomLevel, setZoomLevel] = useState(6);
  const [showAllClubs, setShowAllClubs] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered on France with ultra-smooth 60 FPS inertia
    const map = L.map(mapContainerRef.current, {
      center: [46.7, 2.3],
      zoom: 6,
      minZoom: 3,
      maxZoom: 20,
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
    });

    // 4X Ultra High-Definition Retina Satellite Imagery (Google Maps Hybrid scale=2 + 4x CDN + Pre-buffering)
    const googleSatellite = L.tileLayer(
      'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&scale=2',
      {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
        tileSize: 256,
        keepBuffer: 12,
        updateWhenIdle: false,
        updateInterval: 30,
      }
    );

    // Fade out splash once initial satellite view is loaded in GPU memory
    googleSatellite.once('load', () => {
      setIsMapReady(true);
    });
    const fallbackTimer = setTimeout(() => {
      setIsMapReady(true);
    }, 600);

    googleSatellite.addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Immediate size calibration to prevent grey/black letterboxing
    map.invalidateSize();
    requestAnimationFrame(() => map.invalidateSize());

    // Track zoom for responsive marker sizing
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // Handle resize & mobile orientation changes smoothly
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 450);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(fallbackTimer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const isZoomedOut = zoomLevel < 7.5;

    // 1. Unvisited Fitness Parks (Only if showAllClubs is enabled)
    if (showAllClubs) {
      FITNESS_PARK_DIRECTORY.forEach((club) => {
        const isVisited = visitedGyms.some(
          (vg) =>
            vg.clubId === club.id ||
            vg.name.toLowerCase().includes(club.city.toLowerCase()) ||
            (Math.abs(vg.lat - club.lat) < 0.015 && Math.abs(vg.lng - club.lng) < 0.015)
        );

        if (!isVisited) {
          // Always vibrant orange with crisp white outline for satellite contrast
          const marker = L.circleMarker([club.lat, club.lng], {
            radius: isZoomedOut ? 3.5 : 6.5,
            fillColor: '#f97316',
            color: '#ffffff',
            weight: isZoomedOut ? 1.5 : 2,
            opacity: 0.95,
            fillOpacity: 0.95,
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

    // 2. Visited Gyms: Standout Gold Badges
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
  }, [visitedGyms, selectedGymId, onSelectGym, onQuickAddClub, zoomLevel, showAllClubs]);

  // Geolocation Handler
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoMessage('La géolocalisation n’est pas supportée par ton navigateur.');
      setTimeout(() => setGeoMessage(null), 4000);
      return;
    }

    setIsLocating(true);
    setGeoMessage('Recherche de ta position GPS...');

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
    <div className="absolute inset-0 w-full h-[100dvh] overflow-hidden bg-slate-900">
      {/* Fullscreen Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Smooth Instant Splash: Eliminates black flash and tile pop-in on mobile */}
      <div
        className={`absolute inset-0 z-[1800] bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-none ${
          isMapReady ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow-xl shadow-amber-500/20 animate-pulse">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <span className="text-white text-xs font-bold tracking-wider uppercase opacity-80">
            Fitness Park Tour
          </span>
        </div>
      </div>

      {/* Floating Status Toast for Geolocation */}
      {geoMessage && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-[1600] px-4 py-2 bg-neutral-900/95 text-white text-xs font-semibold rounded-full shadow-2xl border border-neutral-700 backdrop-blur-md animate-in fade-in slide-in-from-top-2"
          style={{ top: 'max(calc(env(safe-area-inset-top, 0px) + 90px), 140px)' }}
        >
          {geoMessage}
        </div>
      )}

      {/* Floating Controls on right: GPS + Toggle All vs Unlocked */}
      <div 
        className="absolute right-3.5 sm:right-5 z-[1400] flex flex-col gap-2.5"
        style={{
          top: 'max(calc(env(safe-area-inset-top, 0px) + 90px), 140px)',
        }}
      >
        {/* Button 1: Geolocation */}
        <button
          onClick={handleGeolocate}
          disabled={isLocating}
          className="p-3 bg-white/95 text-neutral-900 rounded-2xl shadow-xl border border-neutral-200/80 hover:bg-white transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50 backdrop-blur-md group"
          title="Me géolocaliser"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 text-neutral-900 group-hover:text-amber-500 transition-colors" />
          )}
        </button>

        {/* Button 2: Toggle Show All Fitness Parks vs Only Unlocked */}
        <button
          onClick={() => {
            const next = !showAllClubs;
            setShowAllClubs(next);
            setGeoMessage(next ? 'Affichage : Tout le réseau (313 clubs)' : 'Affichage : Uniquement tes salles débloquées');
            setTimeout(() => setGeoMessage(null), 3000);
          }}
          className={`p-3 rounded-2xl shadow-xl border transition-all flex items-center justify-center cursor-pointer active:scale-95 backdrop-blur-md group ${
            showAllClubs
              ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-amber-400/20'
              : 'bg-white/95 text-neutral-500 border-neutral-200/80 hover:text-neutral-900'
          }`}
          title={showAllClubs ? 'Afficher uniquement mes salles débloquées' : 'Afficher tous les clubs du réseau'}
        >
          {showAllClubs ? (
            <Eye className="w-4 h-4 text-neutral-950" />
          ) : (
            <EyeOff className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900" />
          )}
        </button>
      </div>
    </div>
  );
};
