/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { VisitedGym, FitnessParkClub } from './types';
import { getSavedGyms, saveGyms } from './utils/storage';
import { computePlayerStats } from './utils/stats';
import { MapFrance } from './components/MapFrance';
import { AddGymModal } from './components/AddGymModal';
import { GymDrawer } from './components/GymDrawer';
import { StatsModal } from './components/StatsModal';
import {
  Plus,
  List,
  MapPin,
  Edit2,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const [gyms, setGyms] = useState<VisitedGym[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<VisitedGym | null>(null);
  const [preselectedClub, setPreselectedClub] = useState<FitnessParkClub | null>(null);
  const [selectedGym, setSelectedGym] = useState<VisitedGym | null>(null);

  useEffect(() => {
    const loaded = getSavedGyms();
    setGyms(loaded);
  }, []);

  const updateGyms = (newGyms: VisitedGym[]) => {
    setGyms(newGyms);
    saveGyms(newGyms);
  };

  const stats = computePlayerStats(gyms);

  const handleSaveGym = (
    gymData: Omit<VisitedGym, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      const updated = gyms.map((g) =>
        g.id === existingId
          ? {
              ...g,
              ...gymData,
            }
          : g
      );
      updateGyms(updated);
      setSelectedGym(updated.find((g) => g.id === existingId) || null);
    } else {
      const newGym: VisitedGym = {
        ...gymData,
        id: 'gym-' + Date.now(),
        createdAt: Date.now(),
      };
      const updated = [newGym, ...gyms];
      updateGyms(updated);
      setSelectedGym(newGym);
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#f59e0b', '#fbbf24', '#ffffff', '#f97316'],
        });
      } catch {
        // Safe confetti fallback
      }
    }
    setEditingGym(null);
    setPreselectedClub(null);
  };

  const handleDeleteGym = (id: string) => {
    const updated = gyms.filter((g) => g.id !== id);
    updateGyms(updated);
    if (selectedGym?.id === id) {
      setSelectedGym(null);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-slate-50">
      {/* 1. Fullscreen Map is the main canvas */}
      <MapFrance
        visitedGyms={gyms}
        onSelectGym={(gym) => setSelectedGym(gym)}
        onQuickAddClub={(club) => {
          setPreselectedClub(club);
          setEditingGym(null);
          setIsAddModalOpen(true);
        }}
        selectedGymId={selectedGym?.id}
      />

      {/* 2. Floating Top Header with Gaming Progress (Positioned safely below Dynamic Island / Notch) */}
      <header
        className="absolute top-0 left-0 right-0 z-[1500] px-4 sm:px-6 flex items-center justify-between pointer-events-none"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 24px), 72px)',
        }}
      >
        {/* Gaming Stat Widget in Header (Compact and narrower) */}
        <button
          onClick={() => setIsStatsModalOpen(true)}
          className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-neutral-200/90 flex items-center gap-2 pointer-events-auto hover:bg-white transition-all cursor-pointer group active:scale-95"
          title="Voir les détails de progression"
        >
          <div className="w-7 h-7 rounded-xl bg-neutral-950 text-amber-400 font-black text-[10px] flex items-center justify-center border border-neutral-800 shadow-xs shrink-0">
            NV.{stats.level}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900 pr-1">
            <span>{stats.unlockedCount} / {stats.totalClubs}</span>
            <span className="text-amber-500 font-bold text-[11px]">({stats.percentage}%)</span>
          </div>
        </button>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-3 sm:px-4 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200/90 text-neutral-800 hover:text-black hover:bg-white transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95"
            title="Voir la liste"
          >
            <List className="w-4 h-4 text-neutral-900" />
            <span className="hidden sm:inline">Liste</span>
          </button>
        </div>
      </header>

      {/* 3. Bottom Area with safe area for iPhone home indicator */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[1500] pointer-events-none flex flex-col items-center px-4"
        style={{
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 20px), 32px)',
        }}
      >
        <div className="w-full max-w-sm sm:max-w-md pointer-events-auto flex flex-col items-center gap-2.5">
          {/* If a Gym is selected from the map, show its details card */}
          {selectedGym ? (
            <div className="w-full bg-white/98 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-2xl border border-neutral-200 pointer-events-auto space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium mb-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>{selectedGym.city}</span>
                  <span>•</span>
                  <span>{new Date(selectedGym.visitDate).toLocaleDateString('fr-FR')}</span>
                </div>
                <h3 className="font-extrabold text-sm text-neutral-900 leading-tight">
                  {selectedGym.name}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedGym(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-amber-400 text-xs">
                {'★'.repeat(selectedGym.rating)}
              </div>
              <span className="text-xs font-bold text-neutral-600">
                {selectedGym.rating}/5
              </span>
            </div>

            {selectedGym.note && (
              <p className="text-xs text-neutral-700 bg-neutral-50 p-2.5 rounded-2xl italic border border-neutral-100">
                « {selectedGym.note} »
              </p>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingGym(selectedGym);
                    setIsAddModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3 h-3 text-neutral-600" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => handleDeleteGym(selectedGym.id)}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Supprimer</span>
                </button>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  selectedGym.name + ' ' + selectedGym.city
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-neutral-950 flex items-center gap-1 text-[11px] font-semibold"
              >
                <span>Itinéraire</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : null}

        {/* Big Natural Add Button */}
        <div className="flex justify-center pointer-events-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditingGym(null);
              setPreselectedClub(null);
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto px-7 py-3.5 bg-neutral-950 hover:bg-neutral-900 text-white font-extrabold text-sm rounded-full shadow-2xl transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer border border-neutral-800"
          >
            <div className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center font-bold text-sm">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span>Débloquer une salle</span>
          </button>
        </div>
      </div>
    </div>

      {/* 4. Natural Add/Edit Modal */}
      <AddGymModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingGym(null);
          setPreselectedClub(null);
        }}
        onSave={handleSaveGym}
        editGym={editingGym}
        preselectedClub={preselectedClub}
      />

      {/* 5. Clean List Drawer */}
      <GymDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        gyms={gyms}
        onSelectGym={(gym) => {
          setSelectedGym(gym);
          setIsDrawerOpen(false);
        }}
        onDeleteGym={handleDeleteGym}
        onEditGym={(gym) => {
          setEditingGym(gym);
          setIsDrawerOpen(false);
          setIsAddModalOpen(true);
        }}
      />

      {/* 6. Gaming Quest & Stats Modal */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        stats={stats}
      />
    </div>
  );
}
