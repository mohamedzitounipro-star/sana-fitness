import React from 'react';
import { X, Trophy, MapPin, Compass, Route } from 'lucide-react';
import { PlayerStats } from '../utils/stats';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-sm bg-white text-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-100 p-5 sm:p-6 space-y-4 pb-8 sm:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">Progression</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Level & Progress Card (White/Light Theme) */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ea580c] text-white font-black text-xs flex items-center justify-center shadow-xs">
                NIV.{stats.level}
              </div>
              <div>
                <div className="text-sm font-bold text-neutral-900">{stats.levelTitle}</div>
                <div className="text-[11px] text-neutral-500">
                  {stats.nextLevelRemaining > 0
                    ? `Encore ${stats.nextLevelRemaining} salle${stats.nextLevelRemaining > 1 ? 's' : ''} avant le Niv.${stats.level + 1}`
                    : 'Niveau maximal atteint'}
                </div>
              </div>
            </div>
            <Trophy className="w-5 h-5 text-[#ea580c]" />
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
              <span>{stats.unlockedCount} / {stats.totalClubs} débloqués</span>
              <span className="text-[#ea580c] font-bold">{stats.percentage}%</span>
            </div>
            <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ea580c] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(stats.percentage, stats.unlockedCount > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
              <Compass className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Régions</span>
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {stats.uniqueRegions} <span className="text-xs text-neutral-400 font-normal">régions</span>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Villes</span>
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {stats.uniqueCities} <span className="text-xs text-neutral-400 font-normal">visitées</span>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3.5 space-y-1 col-span-2">
            <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
              <Route className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>Distance cumulée du Tour</span>
            </div>
            <div className="text-xl font-bold text-neutral-900 flex items-baseline gap-1">
              <span>{stats.cumulatedDistanceKm.toLocaleString('fr-FR')}</span>
              <span className="text-xs text-neutral-500 font-medium">km parcourus</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-neutral-950 hover:bg-neutral-900 text-white font-bold py-3.5 rounded-2xl text-xs transition-colors cursor-pointer shadow-md active:scale-98"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};
