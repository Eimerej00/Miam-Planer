import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type {
  ActiveTab,
  Recipe,
  ScheduleMap,
  DayPlan,
  GroceryItem,
  MealSlotContent,
  GroceryCategory,
} from '../types/index.ts';
import { INITIAL_RECIPES, getInitialSchedule } from '../data/mockData.ts';
import {
  clearLegacyPinStorage,
  evaluateGoogleUserAccess,
} from '../utils/security.ts';
import {
  generateSchedulePlan,
  PlanGenerationOptions,
  formatDateKey,
  addDays,
} from '../utils/planGenerator.ts';
import { buildGroceryListForDates } from '../utils/groceries.ts';
import { parseAndValidateBackupJson, sanitizeRecipe } from '../utils/validation.ts';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase.ts';
import {
  subscribeUserData,
  saveRecipeToCloud,
  deleteRecipeFromCloud,
  saveDayPlanToCloud,
  saveGroceryItemToCloud,
  deleteGroceryItemFromCloud,
} from '../lib/firestoreSync.ts';

export type CloudSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface AppContextValue {
  authReady: boolean;
  isAuthorized: boolean;
  isSigningIn: boolean;
  authError: string | null;

  firebaseUser: User | null;
  cloudSyncStatus: CloudSyncStatus;
  cloudError: string | null;
  connectGoogleCloud: () => Promise<void>;
  disconnectGoogleCloud: () => Promise<void>;

  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  weekOffset: number;
  setWeekOffset: (offset: number) => void;
  currentMondayDateKey: string;
  getWeekDatesKeys: (offset: number) => string[];

  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Recipe;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;

  schedule: ScheduleMap;
  updateMealSlot: (
    dateKey: string,
    slot: 'midi' | 'soir',
    content: Partial<MealSlotContent>
  ) => void;
  applyGeneratedPlan: (options: PlanGenerationOptions) => void;

  groceryItems: GroceryItem[];
  toggleGroceryItem: (id: string) => void;
  addCustomGroceryItem: (
    name: string,
    category: GroceryCategory,
    amount?: number,
    unit?: string
  ) => void;
  clearCheckedGroceries: () => void;
  regenerateGroceries: () => void;

  selectedDatesForGroceries: string[];
  toggleGroceryDateSelection: (dateKey: string) => void;

  exportBackupJson: () => string;
  importBackupJson: (jsonStr: string) => boolean;

  isOnline: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_RECIPES = 'miam_planner_recipes_v1';
const STORAGE_SCHEDULE = 'miam_planner_schedule_v1';
const STORAGE_GROCERIES = 'miam_planner_groceries_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState<boolean>(!auth);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('planning');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('local');
  const [cloudError, setCloudError] = useState<string | null>(null);

  const cloudRecipeIdsRef = useRef<Set<string>>(new Set());
  const cloudScheduleKeysRef = useRef<Set<string>>(new Set());
  const cloudGroceryIdsRef = useRef<Set<string>>(new Set());
  const initialCloudSeededRef = useRef<string | null>(null);
  const authCheckSeqRef = useRef<number>(0);

  // Clean up obsolete PIN keys and track online status
  useEffect(() => {
    clearLegacyPinStorage();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const getCurrentMondayKey = (): string => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return formatDateKey(monday);
  };

  const currentMondayDateKey = getCurrentMondayKey();

  const getWeekDatesKeys = (offset: number): string[] => {
    const start = addDays(currentMondayDateKey, offset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Recipes state
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    if (typeof window === 'undefined') return INITIAL_RECIPES;
    const saved = localStorage.getItem(STORAGE_RECIPES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved recipes:', e);
      }
    }
    return INITIAL_RECIPES;
  });

  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleMap>(() => {
    if (typeof window === 'undefined') return getInitialSchedule();
    const saved = localStorage.getItem(STORAGE_SCHEDULE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {
        console.error('Failed to parse saved schedule:', e);
      }
    }
    return getInitialSchedule();
  });

  // Groceries state
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_GROCERIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved groceries:', e);
      }
    }
    return [];
  });

  const recipesRef = useRef(recipes);
  const scheduleRef = useRef(schedule);
  const groceriesRef = useRef(groceryItems);

  useEffect(() => {
    recipesRef.current = recipes;
    localStorage.setItem(STORAGE_RECIPES, JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    scheduleRef.current = schedule;
    localStorage.setItem(STORAGE_SCHEDULE, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    groceriesRef.current = groceryItems;
    localStorage.setItem(STORAGE_GROCERIES, JSON.stringify(groceryItems));
  }, [groceryItems]);

  // Selected dates for groceries (defaults to current week's 7 days)
  const [selectedDatesForGroceries, setSelectedDatesForGroceries] = useState<string[]>(
    () => getWeekDatesKeys(0)
  );

  useEffect(() => {
    setSelectedDatesForGroceries(getWeekDatesKeys(weekOffset));
  }, [weekOffset]);

  // Initial grocery generation if empty
  useEffect(() => {
    if (groceryItems.length === 0 && recipes.length > 0) {
      const initialWeek = getWeekDatesKeys(0);
      const generated = buildGroceryListForDates(initialWeek, schedule, recipes);
      setGroceryItems(generated);
    }
  }, []);

  // Firebase Auth listener, whitelist enforcement & real-time private Firestore sync
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      setIsAuthorized(false);
      setCloudSyncStatus('local');
      return;
    }

    let unsubFirestore: (() => void) | null = null;
    let mounted = true;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      const seq = ++authCheckSeqRef.current;

      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (!user) {
        cloudRecipeIdsRef.current = new Set();
        cloudScheduleKeysRef.current = new Set();
        cloudGroceryIdsRef.current = new Set();
        initialCloudSeededRef.current = null;
        if (!mounted || seq !== authCheckSeqRef.current) return;
        setFirebaseUser(null);
        setIsAuthorized(false);
        setCloudSyncStatus('local');
        setAuthReady(true);
        return;
      }

      const access = await evaluateGoogleUserAccess(user);
      if (!mounted || seq !== authCheckSeqRef.current) return;

      if (!access.allowed) {
        cloudRecipeIdsRef.current = new Set();
        cloudScheduleKeysRef.current = new Set();
        cloudGroceryIdsRef.current = new Set();
        initialCloudSeededRef.current = null;
        setFirebaseUser(null);
        setIsAuthorized(false);
        setCloudSyncStatus('local');
        setAuthError(
          access.reason === 'unverified'
            ? 'Accès refusé : votre adresse Google doit être vérifiée.'
            : 'Accès refusé : ce compte Google n’est pas autorisé à accéder à l’application.'
        );
        setAuthReady(true);
        await signOutUser().catch(() => {});
        return;
      }

      setFirebaseUser(user);
      setIsAuthorized(true);
      setAuthError(null);
      setCloudError(null);
      setAuthReady(true);
      setCloudSyncStatus('syncing');
      const uid = user.uid;

      unsubFirestore = subscribeUserData(uid, {
        onRecipes: (cloudRecipes, isEmpty) => {
          cloudRecipeIdsRef.current = new Set(cloudRecipes.map((r) => r.id));
          if (isEmpty && initialCloudSeededRef.current !== uid) {
            initialCloudSeededRef.current = uid;
            // Seed initial local recipes to user's private cloud space on first connection
            recipesRef.current.forEach((rec) => {
              saveRecipeToCloud(uid, rec, true).catch((err) => {
                console.error('Seed recipe failed:', err);
              });
            });
          } else if (!isEmpty) {
            setRecipes(cloudRecipes);
          }
          setCloudSyncStatus('synced');
        },
        onSchedule: (cloudSchedule, isEmpty) => {
          cloudScheduleKeysRef.current = new Set(Object.keys(cloudSchedule));
          if (isEmpty && initialCloudSeededRef.current === uid) {
            Object.entries(scheduleRef.current).forEach(([dateKey, dayPlan]) => {
              saveDayPlanToCloud(uid, dateKey, dayPlan, false).catch((err) => {
                console.error('Seed day plan failed:', err);
              });
            });
          } else if (!isEmpty) {
            setSchedule(cloudSchedule);
          }
          setCloudSyncStatus('synced');
        },
        onGroceries: (cloudGroceries, isEmpty) => {
          cloudGroceryIdsRef.current = new Set(cloudGroceries.map((g) => g.id));
          if (isEmpty && initialCloudSeededRef.current === uid) {
            groceriesRef.current.forEach((item) => {
              saveGroceryItemToCloud(uid, item, false).catch((err) => {
                console.error('Seed grocery failed:', err);
              });
            });
          } else if (!isEmpty) {
            setGroceryItems(cloudGroceries);
          }
          setCloudSyncStatus('synced');
        },
        onError: () => {
          setCloudSyncStatus('error');
          setCloudError('Erreur de synchronisation Firestore. Vérifiez les règles de sécurité.');
        },
      });
    });

    return () => {
      mounted = false;
      if (unsubFirestore) unsubFirestore();
      unsubAuth();
    };
  }, []);

  const connectGoogleCloud = async () => {
    setAuthError(null);
    setCloudError(null);
    setIsSigningIn(true);
    try {
      const signedInUser = await signInWithGoogle();
      const access = await evaluateGoogleUserAccess(signedInUser);
      if (!access.allowed) {
        setAuthError(
          access.reason === 'unverified'
            ? 'Accès refusé : votre adresse Google doit être vérifiée.'
            : 'Accès refusé : ce compte Google n’est pas autorisé à accéder à l’application.'
        );
        await signOutUser().catch(() => {});
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        setAuthError('Connexion Google annulée.');
      } else {
        setAuthError('Impossible de finaliser la connexion Google. Réessayez.');
      }
      setCloudError('Connexion Google annulée ou refusée.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const disconnectGoogleCloud = async () => {
    setAuthError(null);
    setCloudError(null);
    setIsAuthorized(false);
    setFirebaseUser(null);
    await signOutUser();
    setCloudSyncStatus('local');
  };

  const isCloudReady = Boolean(firebaseUser && firebaseUser.emailVerified && isAuthorized);

  const addRecipe = (recData: Omit<Recipe, 'id' | 'createdAt'>): Recipe => {
    const candidate: Recipe = {
      ...recData,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const newRecipe = sanitizeRecipe(candidate) || candidate;
    setRecipes((prev) => [newRecipe, ...prev]);

    if (isCloudReady && firebaseUser) {
      saveRecipeToCloud(firebaseUser.uid, newRecipe, true).catch((err) => {
        console.error(err);
        setCloudSyncStatus('error');
      });
    }
    return newRecipe;
  };

  const updateRecipe = (updated: Recipe) => {
    const clean = sanitizeRecipe(updated) || updated;
    setRecipes((prev) => prev.map((r) => (r.id === clean.id ? clean : r)));

    if (isCloudReady && firebaseUser) {
      const exists = cloudRecipeIdsRef.current.has(clean.id);
      saveRecipeToCloud(firebaseUser.uid, clean, !exists).catch((err) => {
        console.error(err);
        setCloudSyncStatus('error');
      });
    }
  };

  const deleteRecipe = (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));

    if (isCloudReady && firebaseUser && cloudRecipeIdsRef.current.has(id)) {
      deleteRecipeFromCloud(firebaseUser.uid, id).catch((err) => {
        console.error(err);
        setCloudSyncStatus('error');
      });
    }
  };

  const updateMealSlot = (
    dateKey: string,
    slot: 'midi' | 'soir',
    content: Partial<MealSlotContent>
  ) => {
    let computedDay: DayPlan | null = null;
    setSchedule((prev) => {
      const currentDay = prev[dateKey] || {
        date: dateKey,
        midi: { isExterior: false },
        soir: { isExterior: false },
      };

      const updatedDay: DayPlan = {
        ...currentDay,
        [slot]: {
          ...currentDay[slot],
          ...content,
        },
      };
      computedDay = updatedDay;

      return {
        ...prev,
        [dateKey]: updatedDay,
      };
    });

    if (isCloudReady && firebaseUser && computedDay) {
      const exists = cloudScheduleKeysRef.current.has(dateKey);
      saveDayPlanToCloud(firebaseUser.uid, dateKey, computedDay, exists).catch((err) => {
        console.error(err);
        setCloudSyncStatus('error');
      });
    }
  };

  const applyGeneratedPlan = (options: PlanGenerationOptions) => {
    const newPlan = generateSchedulePlan(recipes, schedule, options);
    setSchedule(newPlan);

    if (isCloudReady && firebaseUser) {
      const uid = firebaseUser.uid;
      Object.entries(newPlan).forEach(([dateKey, dayPlan]) => {
        const exists = cloudScheduleKeysRef.current.has(dateKey);
        saveDayPlanToCloud(uid, dateKey, dayPlan, exists).catch((err) => {
          console.error(err);
          setCloudSyncStatus('error');
        });
      });
    }
  };

  const syncGroceryListToCloud = (nextItems: GroceryItem[]) => {
    if (!isCloudReady || !firebaseUser) return;
    const uid = firebaseUser.uid;
    const nextIds = new Set(nextItems.map((i) => i.id));

    // Delete removed items
    cloudGroceryIdsRef.current.forEach((oldId) => {
      if (!nextIds.has(oldId)) {
        deleteGroceryItemFromCloud(uid, oldId).catch((err) => console.error(err));
      }
    });

    // Save/update current items
    nextItems.forEach((item) => {
      const exists = cloudGroceryIdsRef.current.has(item.id);
      saveGroceryItemToCloud(uid, item, exists).catch((err) => console.error(err));
    });
  };

  const regenerateGroceries = () => {
    const datesToUse =
      selectedDatesForGroceries.length > 0
        ? selectedDatesForGroceries
        : getWeekDatesKeys(weekOffset);
    const generated = buildGroceryListForDates(
      datesToUse,
      schedule,
      recipes,
      groceryItems
    );
    setGroceryItems(generated);
    syncGroceryListToCloud(generated);
  };

  const toggleGroceryItem = (id: string) => {
    let toggledItem: GroceryItem | undefined;
    setGroceryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          toggledItem = { ...item, checked: !item.checked };
          return toggledItem;
        }
        return item;
      })
    );

    if (isCloudReady && firebaseUser && toggledItem) {
      const exists = cloudGroceryIdsRef.current.has(toggledItem.id);
      saveGroceryItemToCloud(firebaseUser.uid, toggledItem, exists).catch((err) =>
        console.error(err)
      );
    }
  };

  const addCustomGroceryItem = (
    name: string,
    category: GroceryCategory,
    amount?: number,
    unit?: string
  ) => {
    const newItem: GroceryItem = {
      id: `custom-${Date.now()}`,
      name: name.trim().slice(0, 150),
      amount,
      unit: unit?.trim().slice(0, 40),
      category,
      checked: false,
      isCustom: true,
    };
    setGroceryItems((prev) => [newItem, ...prev]);

    if (isCloudReady && firebaseUser) {
      saveGroceryItemToCloud(firebaseUser.uid, newItem, false).catch((err) =>
        console.error(err)
      );
    }
  };

  const clearCheckedGroceries = () => {
    const checkedIds = groceryItems.filter((i) => i.checked).map((i) => i.id);
    setGroceryItems((prev) => prev.filter((item) => !item.checked));

    if (isCloudReady && firebaseUser) {
      checkedIds.forEach((id) => {
        if (cloudGroceryIdsRef.current.has(id)) {
          deleteGroceryItemFromCloud(firebaseUser.uid, id).catch((err) =>
            console.error(err)
          );
        }
      });
    }
  };

  const toggleGroceryDateSelection = (dateKey: string) => {
    setSelectedDatesForGroceries((prev) => {
      const exists = prev.includes(dateKey);
      const next = exists ? prev.filter((k) => k !== dateKey) : [...prev, dateKey];
      const updated = buildGroceryListForDates(next, schedule, recipes, groceryItems);
      setGroceryItems(updated);
      syncGroceryListToCloud(updated);
      return next;
    });
  };

  const exportBackupJson = (): string => {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      recipes,
      schedule,
      groceryItems,
    };
    return JSON.stringify(data, null, 2);
  };

  const importBackupJson = (jsonStr: string): boolean => {
    const validated = parseAndValidateBackupJson(jsonStr);
    if (!validated) return false;

    if (validated.recipes) {
      setRecipes(validated.recipes);
      if (isCloudReady && firebaseUser) {
        const uid = firebaseUser.uid;
        validated.recipes.forEach((r) => {
          const exists = cloudRecipeIdsRef.current.has(r.id);
          saveRecipeToCloud(uid, r, !exists).catch((err) => console.error(err));
        });
      }
    }

    if (validated.schedule) {
      setSchedule(validated.schedule);
      if (isCloudReady && firebaseUser) {
        const uid = firebaseUser.uid;
        Object.entries(validated.schedule).forEach(([dateKey, dayPlan]) => {
          const exists = cloudScheduleKeysRef.current.has(dateKey);
          saveDayPlanToCloud(uid, dateKey, dayPlan, exists).catch((err) => console.error(err));
        });
      }
    }

    if (validated.groceryItems) {
      setGroceryItems(validated.groceryItems);
      syncGroceryListToCloud(validated.groceryItems);
    }

    return true;
  };

  return (
    <AppContext.Provider
      value={{
        authReady,
        isAuthorized,
        isSigningIn,
        authError,
        firebaseUser,
        cloudSyncStatus,
        cloudError,
        connectGoogleCloud,
        disconnectGoogleCloud,
        activeTab,
        setActiveTab,
        weekOffset,
        setWeekOffset,
        currentMondayDateKey,
        getWeekDatesKeys,
        recipes,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        schedule,
        updateMealSlot,
        applyGeneratedPlan,
        groceryItems,
        toggleGroceryItem,
        addCustomGroceryItem,
        clearCheckedGroceries,
        regenerateGroceries,
        selectedDatesForGroceries,
        toggleGroceryDateSelection,
        exportBackupJson,
        importBackupJson,
        isOnline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
