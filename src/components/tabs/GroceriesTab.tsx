import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  formatGroceriesForExport,
} from '../../utils/groceries.ts';
import type { GroceryCategory, GroceryItem } from '../../types/index.ts';

export const GroceriesTab: React.FC = () => {
  const {
    groceryItems,
    toggleGroceryItem,
    addCustomGroceryItem,
    clearCheckedGroceries,
    regenerateGroceries,
    selectedDatesForGroceries,
    toggleGroceryDateSelection,
    getWeekDatesKeys,
    weekOffset,
    setWeekOffset,
  } = useApp();

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GroceryCategory>('autres');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const currentWeekDates = getWeekDatesKeys(weekOffset);

  const handleCopy = async () => {
    const formatted = formatGroceriesForExport(groceryItems);
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    addCustomGroceryItem(
      newItemName.trim(),
      newItemCategory,
      newItemAmount ? Number(newItemAmount) : undefined
    );
    setNewItemName('');
    setNewItemAmount('');
    setShowAddForm(false);
  };

  // Group items by category
  const byCategory: Record<GroceryCategory, GroceryItem[]> = {
    legumes: [],
    viandes: [],
    frais: [],
    epicerie: [],
    surgeles: [],
    autres: [],
  };
  groceryItems.forEach((item: GroceryItem) => {
    if (byCategory[item.category]) {
      byCategory[item.category].push(item);
    } else {
      byCategory.autres.push(item);
    }
  });

  const checkedCount = groceryItems.filter((i: GroceryItem) => i.checked).length;
  const totalCount = groceryItems.length;

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#3D5A45]" />
            <h2 className="text-base font-bold text-slate-800 font-display">
              Liste de Courses Intelligente
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {checkedCount}/{totalCount} articles cochés · Ingrédients consolidés par rayons
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy to WhatsApp/SMS button */}
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-[#FAF8F5] hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Copier le texte formaté pour envoi SMS ou WhatsApp"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copier (SMS / WhatsApp)</span>
              </>
            )}
          </button>

          {/* Add custom item */}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#3D5A45] hover:bg-[#324b39] rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Ajout libre</span>
          </button>
        </div>
      </div>

      {/* Week & Day Selector Strip */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700">
            Jours inclus dans les courses :
          </span>

          <div className="flex items-center gap-2">
            {/* Week offset toggle */}
            <div className="flex items-center gap-1 p-0.5 bg-[#FAF8F5] border border-slate-200 rounded-lg text-[11px]">
              {[0, 1, 2].map((off) => (
                <button
                  key={off}
                  onClick={() => setWeekOffset(off)}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    weekOffset === off
                      ? 'bg-white text-[#3D5A45] font-semibold shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  {off === 0 ? 'Semaine S' : `S+${off}`}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                regenerateGroceries();
                setRefreshed(true);
                setTimeout(() => setRefreshed(false), 1500);
              }}
              className="flex items-center gap-1 text-xs text-[#3D5A45] hover:underline font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshed ? 'animate-spin' : ''}`} />
              {refreshed ? 'Actualisé !' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* 7 Days checkboxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {currentWeekDates.map((dateKey: string) => {
            const isSelected = selectedDatesForGroceries.includes(dateKey);
            const d = new Date(dateKey + 'T12:00:00');
            const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' });
            const dayNum = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

            return (
              <button
                key={dateKey}
                onClick={() => toggleGroceryDateSelection(dateKey)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#EAF0EC] border-[#CCDCD0] text-[#3D5A45]'
                    : 'bg-[#FAF8F5] border-slate-200/80 text-slate-400 hover:text-slate-600'
                }`}
              >
                <div>
                  <span className="text-xs font-bold capitalize block">
                    {dayName}
                  </span>
                  <span className="text-[10px]">{dayNum}</span>
                </div>
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#3D5A45]" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Custom Item Drawer / Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddCustom}
          className="p-4 rounded-2xl bg-[#EAF0EC]/70 border border-[#CCDCD0] space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#3D5A45]">
              Ajouter un article hors-recette (ex : café, lait, fruits...) :
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Article (ex : Café moulu)"
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as GroceryCategory)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3D5A45]"
            >
              {Object.keys(CATEGORY_LABELS).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat as GroceryCategory].icon}{' '}
                  {CATEGORY_LABELS[cat as GroceryCategory].label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#3D5A45] hover:bg-[#324b39] rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Ajouter à la liste
            </button>
          </div>
        </form>
      )}

      {/* Categories / Aisles Accordion-style layout */}
      {groceryItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Votre liste de courses est vide</p>
          <p className="text-xs text-slate-400 mt-1">
            Sélectionnez des jours au planning ou ajoutez des articles manuels.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.keys(CATEGORY_LABELS) as GroceryCategory[]).map((catKey) => {
            const items = byCategory[catKey];
            if (!items || items.length === 0) return null;

            const categoryInfo = CATEGORY_LABELS[catKey];
            const catChecked = items.filter((i) => i.checked).length;

            return (
              <div
                key={catKey}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                {/* Category Header */}
                <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{categoryInfo.icon}</span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">
                      {categoryInfo.label}
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {catChecked}/{items.length}
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      onClick={() => toggleGroceryItem(item.id)}
                      className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors select-none ${
                        item.checked ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => {}} // Handled by parent container click
                          className="w-4 h-4 rounded text-[#3D5A45] focus:ring-[#3D5A45] border-slate-300 cursor-pointer"
                        />
                        <div>
                          <span
                            className={`text-xs font-medium transition-all ${
                              item.checked
                                ? 'line-through text-slate-400'
                                : 'text-slate-800'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.sourceMeal && (
                            <span className="block text-[10px] text-slate-400">
                              Pour : {item.sourceMeal}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity badge */}
                      {item.amount && (
                        <span
                          className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded-md ${
                            item.checked
                              ? 'bg-slate-100 text-slate-400'
                              : 'bg-[#EAF0EC] text-[#3D5A45] font-semibold'
                          }`}
                        >
                          {item.amount} {item.unit || ''}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear Checked Button */}
      {checkedCount > 0 && (
        <div className="flex justify-end pt-2">
          <button
            onClick={clearCheckedGroceries}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vider les {checkedCount} article(s) coché(s)
          </button>
        </div>
      )}
    </div>
  );
};
