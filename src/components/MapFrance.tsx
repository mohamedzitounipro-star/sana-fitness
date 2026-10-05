import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { VisitedGym, FitnessParkClub } from '../types';
import { FITNESS_PARK_DIRECTORY } from '../data/fitnessParkDirectory';
import { Navigation, Loader2, Layers } from 'lucide-react';
import { escapeHtml, findNearestFitnessPark } from '../utils/geo';

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
  onGeolocateClub,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  const satelliteGroupRef = useRef<L.LayerGroup | null>(null);
  const planGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapMode, setMapMode] = useState<'satellite' | 'plan'>('satellite');
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
      maxZoom: 18,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topleft' }).addTo(map);

    // 1. High-resolution HD Satellite Imagery from Esri
    const satelliteBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri World Imagery',
        maxZoom: 19,
      }
    );

    // 2. Clear road lines and city names overlay
    const labelsOverlay = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '',
        maxZoom: 19,
        opacity: 0.95,
      }
    );

    const satelliteGroup = L.layerGroup([satelliteBase, labelsOverlay]);
    satelliteGroupRef.current = satelliteGroup;

    // 3. Plan layer
    const planLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    });
    const planGroup = L.layerGroup([planLayer]);
    planGroupRef.current = planGroup;

    // Default to satellite view
    satelliteGroup.addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Recalibrate size
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 450);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Toggle Map Mode (Satellite <-> Plan)
  const handleToggleMode = () => {
    const map = mapInstanceRef.current;
    const sat = satelliteGroupRef.current;
    const plan = planGroupRef.current;
    if (!map || !sat || !plan) return;

    if (mapMode === 'satellite') {
      map.removeLayer(sat);
      map.addLayer(plan);
      setMapMode('plan');
    } else {
      map.removeLayer(plan);
      map.addLayer(sat);
      setMapMode('satellite');
    }
  };

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Unvisited Fitness Parks
    FITNESS_PARK_DIRECTORY.forEach((club) => {
      const isVisited = visitedGyms.some(
        (vg) =>
          vg.clubId === club.id ||
          vg.name.toLowerCase().includes(club.city.toLowerCase()) ||
          (Math.abs(vg.lat - club.lat) < 0.015 && Math.abs(vg.lng - club.lng) < 0.015)
      );

      if (!isVisited) {
        const dotIcon = L.divIcon({
          className: 'unvisited-dot',
          html: `<div class="w-3.5 h-3.5 rounded-full bg-white/80 border-2 border-slate-900 shadow-md hover:scale-150 hover:bg-amber-400 transition-all cursor-pointer"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([club.lat, club.lng], { icon: dotIcon });
        marker.bindTooltip(
          `<div class="font-medium text-xs">${escapeHtml(club.name)}</div><div class="text-[10px] text-amber-600 font-semibold">Toucher pour ajouter</div>`,
          { direction: 'top', offset: [0, -6], opacity: 0.95 }
        );

        marker.on('click', () => {
          onQuickAddClub(club);
        });

        markersGroup.addLayer(marker);
      }
    });

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

      const marker = L.marker([gym.lat, gym.lng], { icon: visitedIcon });
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
  }, [visitedGyms, selectedGymId, onSelectGym, onQuickAddClub]);

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
        userMarker.bindTooltip('<div class="text-xs font-bold text-neutral-950">Tu es ici</div>', {
          permanent: false,
          direction: 'top',
          offset: [0, -10],
        });
        userLocationMarkerRef.current = userMarker;

        const nearest = findNearestFitnessPark(latitude, longitude);
        if (nearest) {
          if (nearest.distanceKm <= 15) {
            setGeoMessage(`Fitness Park le plus proche : ${nearest.club.name} (${nearest.distanceKm} km)`);
            if (onGeolocateClub) {
              onGeolocateClub(nearest.club);
            }
          } else {
            setGeoMessage(`Position trouvée ! Plus proche club à ${nearest.distanceKm} km (${nearest.club.city})`);
          }
        } else {
          setGeoMessage('Position localisée !');
        }

        setTimeout(() => setGeoMessage(null), 4500);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoMessage('Autorisation de géolocalisation refusée.');
        } else {
          setGeoMessage('Impossible de récupérer ta position GPS.');
        }
        setTimeout(() => setGeoMessage(null), 4000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Status Toast for Geolocation */}
      {geoMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-slate-900/90 text-white text-xs font-semibold rounded-full shadow-2xl border border-slate-700 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {geoMessage}
        </div>
      )}

      {/* Floating Map Controls on right */}
      <div className="absolute top-20 right-3 sm:right-4 z-[990] flex flex-col gap-2">
        {/* Real Geolocation Button */}
        <button
          onClick={handleGeolocate}
          disabled={isLocating}
          className="p-3 bg-white/95 text-neutral-900 rounded-2xl shadow-xl border border-neutral-200/80 hover:bg-white transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50 backdrop-blur-sm group"
          title="Me géolocaliser"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 text-neutral-900 group-hover:text-amber-500 transition-colors" />
          )}
        </button>

        {/* Satellite / Plan Mode Switcher (Petit format carré discret) */}
        <button
          onClick={handleToggleMode}
          className="p-3 bg-white/95 text-neutral-800 rounded-2xl shadow-xl border border-neutral-200/80 hover:bg-white transition-all flex items-center justify-center cursor-pointer active:scale-95 backdrop-blur-sm"
          title={mapMode === 'satellite' ? 'Passer en vue Plan' : 'Passer en vue Satellite'}
        >
          <Layers className="w-4 h-4 text-neutral-700" />
        </button>
      </div>
    </div>
  );
};
