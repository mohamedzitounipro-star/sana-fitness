import React from 'react';
import { VisitedGym } from '../types';
import { X, Edit2, Trash2, MapPin } from 'lucide-react';

interface GymDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  gyms: VisitedGym[];
  onSelectGym: (gym: VisitedGym) => void;
  onEditGym: (gym: VisitedGym) => void;
  onDeleteGym: (id: string) => void;
}

export const GymDrawer: React.FC<GymDrawerProps> = ({
  isOpen,
  onClose,
  gyms,
  onSelectGym,
  onEditGym,
  onDeleteGym,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-neutral-900 text-sm">Toutes les salles</h3>
            <p className="text-xs text-neutral-500 font-medium">
              {gyms.length} Fitness Park débloqué{gyms.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8">
          {gyms.length === 0 ? (
            <div className="text-center py-16 text-neutral-400 text-xs">
              Aucune salle enregistrée pour le moment.
            </div>
          ) : (
            gyms.map((gym) => (
              <div
                key={gym.id}
                onClick={() => {
                  onSelectGym(gym);
                  onClose();
                }}
                className="p-4 rounded-2xl border border-neutral-200 hover:border-neutral-400 bg-neutral-50/60 hover:bg-neutral-50 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-extrabold text-xs text-neutral-900 leading-tight">
                    {gym.name}
                  </div>
                  <div className="flex items-center text-amber-400 text-xs shrink-0">
                    {'★'.repeat(gym.rating)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <MapPin className="w-3 h-3 text-[#ea580c] shrink-0" />
                  <span>{gym.city}</span>
                  <span>•</span>
                  <span>{new Date(gym.visitDate).toLocaleDateString('fr-FR')}</span>
                </div>

                {gym.note && (
                  <p className="text-xs text-neutral-700 italic bg-white p-2.5 rounded-xl border border-neutral-100">
                    « {gym.note} »
                  </p>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-neutral-100/80">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEditGym(gym);
                    }}
                    className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 active:bg-neutral-200 transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4 text-neutral-600" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteGym(gym.id);
                    }}
                    className="p-2 text-neutral-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
