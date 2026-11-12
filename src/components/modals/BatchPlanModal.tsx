import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type { Recipe } from '../../types/index.ts';
import { X, Calendar, Sparkles, MapPin, CheckCircle2 } from 'lucide-react';
import { addDays, formatDateKey } from '../../utils/planGenerator.ts';

interface BatchPlanModalProps {
  onClose: () => void;
}

export const BatchPlanModal: React.FC<BatchPlanModalProps> = ({ onClose }) => {
  const { recipes, schedule, updateMealSlot, currentMondayDateKey } = useApp();

  const [slotTarget, setSlotTarget] = useState<'midi' | 'soir' | 'both'>('soir');
  const [isExterior, setIsExterior] = useState(false);
  const [exteriorLabel, setExteriorLabel] = useState('Cantine / Restaurant');
  const [recipeId, setRecipeId] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  // Date range
  const [startDate, setStartDate] = useState(currentMondayDateKey);
  const [endDate, setEndDate] = useState(addDays(currentMondayDateKey, 6));

  // Day filter (all or specific weekdays)
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // 1=Mon ... 0=Sun

  const weekdays = [
    { id: 1, label: 'Lun' },
    { id: 2, label: 'Mar' },
    { id: 3, label: 'Mer' },
    { id: 4, label: 'Jeu' },
    { id: 5, label: 'Ven' },
    { id: 6, label: 'Sam' },
    { id: 0, label: 'Dim' },
  ];

  const toggleWeekday = (dayId: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleApplyBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    let curr = startDate;
    let count = 0;

    while (curr <= endDate) {
      const dObj = new Date(curr + 'T12:00:00');
      const dayOfWeek = dObj.getDay();

      if (selectedWeekdays.includes(dayOfWeek)) {
        const slotsToUpdate: ('midi' | 'soir')[] = [];
        if (slotTarget === 'midi' || slotTarget === 'both') slotsToUpdate.push('midi');
        if (slotTarget === 'soir' || slotTarget === 'both') slotsToUpdate.push('soir');

        for (const s of slotsToUpdate) {
          updateMealSlot(curr, s, {
            isExterior,
            exteriorLabel: isExterior ? exteriorLabel : undefined,
            recipeId: !isExterior && recipeId ? recipeId : undefined,
            customTitle: !isExterior && !recipeId ? customTitle.trim() || undefined : undefined,
          });
          count++;
        }
      }

      curr = addDays(curr, 1);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EAF0EC] text-[#3D5A45] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-display">
                Planification en Série (Batch)
              </h3>
              <p className="text-xs text-slate-500">
                Appliquez un repas ou une sortie sur plusieurs jours en un clic
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApplyBatch} className="space-y-5">
          {/* 1. Meal Type (Exterior vs Recipe) */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-slate-200/80 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isExterior}
                onChange={(e) => setIsExterior(e.target.checked)}
                className="w-4 h-4 rounded text-[#3D5A45] focus:ring-[#3D5A45] border-slate-300"
              />
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#D97D64]" />
                <span className="text-sm font-semibold text-slate-800">
                  Définir comme repas extérieur (ex: Cantine)
                </span>
              </div>
            </label>

            {isExterior ? (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Libellé du lieu :</label>
                <input
                  type="text"
                  value={exteriorLabel}
                  onChange={(e) => setExteriorLabel(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Choisir une recette :
                </label>
                <select
                  value={recipeId}
                  onChange={(e) => {
                    setRecipeId(e.target.value);
                    if (e.target.value) setCustomTitle('');
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                >
                  <option value="">-- Sélectionner une recette --</option>
                  {recipes.map((r: Recipe) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.prepMinutes} min)
                    </option>
                  ))}
                </select>

                {!recipeId && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Ou texte libre (ex : Restes du frigo)..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Target Slot */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Créneau horaire :
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'midi', label: '☀️ Midi' },
                { id: 'soir', label: '🌙 Soir' },
                { id: 'both', label: 'Midi & Soir' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlotTarget(s.id as any)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    slotTarget === s.id
                      ? 'bg-[#3D5A45] text-white border-[#3D5A45]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Du (date) :</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Au (date) :</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
              />
            </div>
          </div>

          {/* 4. Days of week filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Jours de la semaine concernés :
            </label>
            <div className="flex flex-wrap gap-1.5">
              {weekdays.map((w) => {
                const isSelected = selectedWeekdays.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWeekday(w.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EAF0EC] text-[#3D5A45] border-[#CCDCD0] font-semibold'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#3D5A45] hover:bg-[#314837] rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Appliquer la série
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
