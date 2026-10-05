import React, { useState, useEffect } from 'react';
import { X, Search, Navigation, Loader2, MapPin } from 'lucide-react';
import { FitnessParkClub, VisitedGym } from '../types';
import { FITNESS_PARK_DIRECTORY } from '../data/fitnessParkDirectory';
import { findNearestFitnessPark, geocodeLocation } from '../utils/geo';

interface AddGymModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gymData: Omit<VisitedGym, 'id' | 'createdAt'>, existingId?: string) => void;
  editGym?: VisitedGym | null;
  preselectedClub?: FitnessParkClub | null;
}

export const AddGymModal: React.FC<AddGymModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editGym,
  preselectedClub,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState<FitnessParkClub | null>(null);
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState<number>(5);
  const [note, setNote] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editGym) {
      setVisitDate(editGym.visitDate);
      setRating(editGym.rating);
      setNote(editGym.note || '');
      setSelectedClub({
        id: editGym.clubId || 'custom',
        name: editGym.name,
        city: editGym.city,
        region: editGym.region,
        lat: editGym.lat,
        lng: editGym.lng,
      });
      setSearchQuery(editGym.name);
    } else if (preselectedClub) {
      setSelectedClub(preselectedClub);
      setSearchQuery(preselectedClub.name);
      setVisitDate(new Date().toISOString().split('T')[0]);
      setRating(5);
      setNote('');
    } else {
      setSelectedClub(null);
      setSearchQuery('');
      setVisitDate(new Date().toISOString().split('T')[0]);
      setRating(5);
      setNote('');
    }
    setGeoNotice(null);
    setErrorMessage(null);
  }, [editGym, preselectedClub, isOpen]);

  if (!isOpen) return null;

  const handleLocateNearest = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Géolocalisation indisponible.');
      return;
    }

    setIsLocating(true);
    setGeoNotice(null);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const nearest = findNearestFitnessPark(pos.coords.latitude, pos.coords.longitude);
        if (nearest) {
          setSelectedClub(nearest.club);
          setSearchQuery(nearest.club.name);
          setGeoNotice(`Club détecté : ${nearest.club.name} (${nearest.distanceKm} km)`);
        } else {
          setGeoNotice('Aucun club trouvé à proximité.');
        }
      },
      (err) => {
        setIsLocating(false);
        setGeoNotice(err.code === err.PERMISSION_DENIED ? 'Accès GPS refusé.' : 'Position introuvable.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const query = searchQuery.trim().toLowerCase();
  const matches = query
    ? FITNESS_PARK_DIRECTORY.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.city.toLowerCase().includes(query) ||
          (c.postalCode && c.postalCode.startsWith(query)) ||
          c.region.toLowerCase().includes(query)
      ).slice(0, 6)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // If user hasn't chosen or typed anything
    if (!selectedClub && !searchQuery.trim()) {
      setErrorMessage("Veuillez choisir ou saisir le nom d'une salle avant de valider.");
      return;
    }

    setIsSubmitting(true);

    try {
      let clubToSave = selectedClub;

      // If user typed something and didn't click dropdown item, but there is a match, auto-select top match
      if (!clubToSave && matches.length > 0) {
        clubToSave = matches[0];
      }

      const name = clubToSave
        ? clubToSave.name
        : searchQuery.trim().startsWith('Fitness Park')
        ? searchQuery.trim()
        : `Fitness Park ${searchQuery.trim()}`;

      let city = clubToSave ? clubToSave.city : searchQuery.trim();
      let region = clubToSave ? clubToSave.region : 'France';
      let lat = clubToSave ? clubToSave.lat : 46.7;
      let lng = clubToSave ? clubToSave.lng : 2.3;

      // If it's a custom club (or not from directory), resolve real coordinates anywhere worldwide!
      if (!clubToSave || clubToSave.id.startsWith('custom-')) {
        const queryTarget = clubToSave?.city || searchQuery.trim();
        const geo = await geocodeLocation(queryTarget);
        lat = geo.lat;
        lng = geo.lng;
        if (!clubToSave || clubToSave.region === 'France') {
          region = geo.region;
        }
      }

      onSave(
        {
          clubId: clubToSave?.id,
          name,
          city,
          region,
          visitDate,
          rating,
          note: note.trim() || undefined,
          lat,
          lng,
        },
        editGym?.id
      );

      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      // Fallback save so user is never blocked
      onSave(
        {
          clubId: selectedClub?.id,
          name: selectedClub?.name || (searchQuery.trim() ? `Fitness Park ${searchQuery.trim()}` : 'Fitness Park'),
          city: selectedClub?.city || searchQuery.trim() || 'France',
          region: selectedClub?.region || 'France',
          visitDate,
          rating,
          note: note.trim() || undefined,
          lat: selectedClub?.lat || 46.7,
          lng: selectedClub?.lng || 2.3,
        },
        editGym?.id
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto pb-8 sm:pb-6">
        {/* Top bar with close */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            {editGym ? 'Modifier la salle' : 'Débloquer une salle'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Gym search or picked name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                Ville ou club
              </label>
              {!selectedClub && (
                <button
                  type="button"
                  onClick={handleLocateNearest}
                  disabled={isLocating}
                  className="text-xs text-neutral-900 hover:text-amber-600 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isLocating ? (
                    <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  ) : (
                    <Navigation className="w-3 h-3 text-amber-500" />
                  )}
                  <span>Position GPS</span>
                </button>
              )}
            </div>

            {geoNotice && (
              <div className="text-[11px] text-neutral-800 font-semibold px-3 py-2 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{geoNotice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="text-xs text-rose-700 font-semibold px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 animate-in fade-in">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {selectedClub ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div>
                  <div className="font-bold text-sm text-neutral-900">{selectedClub.name}</div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>{selectedClub.city}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClub(null);
                    setSearchQuery('');
                    setGeoNotice(null);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-neutral-600 hover:text-neutral-950 font-bold underline cursor-pointer p-1"
                >
                  Changer
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-4 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Tape une ville (ex: Lyon, Bordeaux, Paris...)"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-colors"
                    autoFocus
                  />
                </div>

                {matches.length > 0 ? (
                  <div className="bg-white border border-neutral-200 rounded-2xl p-1 shadow-md space-y-0.5 max-h-56 overflow-y-auto">
                    {matches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClub(c);
                          setSearchQuery(c.name);
                          setErrorMessage(null);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-neutral-100 flex items-center justify-between text-neutral-900 cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="font-semibold">{c.name}</span>
                          <span className="text-[11px] text-neutral-400 block">
                            {c.postalCode ? `${c.postalCode} • ` : ''}{c.city} ({c.region})
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : query ? (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-neutral-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>Aucun club officiel trouvé sous ce nom.</span>
                    <button
                      type="button"
                      onClick={() => {
                        const customName = searchQuery.trim().startsWith('Fitness Park')
                          ? searchQuery.trim()
                          : `Fitness Park ${searchQuery.trim()}`;
                        setSelectedClub({
                          id: 'custom-' + Date.now(),
                          name: customName,
                          city: searchQuery.trim(),
                          region: 'France',
                          lat: 46.7,
                          lng: 2.3,
                        });
                        setErrorMessage(null);
                      }}
                      className="text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer text-xs self-start sm:self-auto"
                    >
                      Utiliser comme nouveau club
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Date de passage */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
              Date de passage
            </label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 h-[50px] text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white transition-colors"
            />
          </div>

          {/* Note de la salle (en-dessous avec espacement aéré) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
                Note de la salle
              </label>
              <span className="text-xs font-extrabold text-amber-500">{rating} / 5 étoiles</span>
            </div>
            <div className="flex items-center justify-around bg-neutral-50 border border-neutral-200 rounded-2xl h-[52px] px-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1.5 transition-transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                  aria-label={`${star} étoiles`}
                >
                  <span
                    className={`text-2xl leading-none ${
                      star <= rating ? 'text-amber-400' : 'text-neutral-300'
                    }`}
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Avis / petit mot */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
              Avis / commentaire (optionnel)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Équipements Hammer Strength, très propre..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-colors"
            />
          </div>

          {/* Action button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-neutral-950 hover:bg-neutral-900 text-white font-extrabold py-3.5 rounded-2xl text-sm transition-all shadow-lg active:scale-98 disabled:opacity-60 cursor-pointer border border-neutral-800 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Localisation en cours...</span>
                </>
              ) : (
                <span>{editGym ? 'Sauvegarder les modifications' : 'Débloquer cette salle'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
