import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import type { DayPlan, GroceryItem, MealSlotContent, Recipe, ScheduleMap } from '../types/index.ts';
import {
  sanitizeDayPlan,
  sanitizeGroceryItem,
  sanitizeMealSlot,
  sanitizeRecipe,
} from '../utils/validation.ts';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === 'object' && !(item instanceof Timestamp)
          ? stripUndefined(item as Record<string, unknown>)
          : item
      );
    } else if (v && typeof v === 'object' && !(v instanceof Timestamp) && Object.getPrototypeOf(v) === Object.prototype) {
      out[k] = stripUndefined(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function serializeRecipeForFirestore(
  recipe: Recipe,
  uid: string,
  isCreate: boolean
): Record<string, unknown> {
  const clean = sanitizeRecipe(recipe);
  if (!clean) {
    throw new Error('Invalid recipe payload');
  }
  const base: Record<string, unknown> = {
    id: clean.id,
    ownerId: uid,
    title: clean.title,
    category: clean.category,
    cuisineType: clean.cuisineType,
    prepDuration: clean.prepDuration,
    prepMinutes: clean.prepMinutes,
    servings: clean.servings,
    ingredients: clean.ingredients.map((ing) => stripUndefined({ ...ing })),
    steps: clean.steps,
    updatedAt: serverTimestamp(),
  };
  if (clean.tags && clean.tags.length > 0) base.tags = clean.tags;
  if (clean.imageUrl) base.imageUrl = clean.imageUrl;
  if (clean.imageHint) base.imageHint = clean.imageHint;
  if (clean.sourceUrl) base.sourceUrl = clean.sourceUrl;
  if (isCreate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

function serializeDayPlanForFirestore(
  dateKey: string,
  dayPlan: DayPlan,
  uid: string,
  isCreate: boolean
): Record<string, unknown> {
  const clean = sanitizeDayPlan(dateKey, dayPlan);
  if (!clean) {
    throw new Error('Invalid day plan payload');
  }
  const base: Record<string, unknown> = {
    date: clean.date,
    ownerId: uid,
    midi: stripUndefined({ ...sanitizeMealSlot(clean.midi) }),
    soir: stripUndefined({ ...sanitizeMealSlot(clean.soir) }),
    updatedAt: serverTimestamp(),
  };
  if (isCreate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

function serializeGroceryForFirestore(
  item: GroceryItem,
  uid: string,
  isCreate: boolean
): Record<string, unknown> {
  const clean = sanitizeGroceryItem(item);
  if (!clean) {
    throw new Error('Invalid grocery item payload');
  }
  const base: Record<string, unknown> = {
    id: clean.id,
    ownerId: uid,
    name: clean.name,
    category: clean.category,
    checked: clean.checked,
    updatedAt: serverTimestamp(),
  };
  if (clean.amount !== undefined) base.amount = clean.amount;
  if (clean.unit) base.unit = clean.unit;
  if (clean.sourceMeal) base.sourceMeal = clean.sourceMeal;
  if (clean.isCustom !== undefined) base.isCustom = clean.isCustom;
  if (isCreate) {
    base.createdAt = serverTimestamp();
  }
  return base;
}

export function subscribeUserData(
  uid: string,
  handlers: {
    onRecipes: (recipes: Recipe[], isEmpty: boolean) => void;
    onSchedule: (schedule: ScheduleMap, isEmpty: boolean) => void;
    onGroceries: (items: GroceryItem[], isEmpty: boolean) => void;
    onError: (err: unknown) => void;
  }
): Unsubscribe {
  if (!db) {
    return () => {};
  }
  const firestore = db;
  const recipesPath = `users/${uid}/recipes`;
  const schedulesPath = `users/${uid}/schedules`;
  const groceriesPath = `users/${uid}/groceries`;

  const unsubRecipes = onSnapshot(
    query(collection(firestore, recipesPath), where('ownerId', '==', uid)),
    (snapshot) => {
      const list: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAtIso =
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : typeof data.createdAt === 'string'
            ? data.createdAt
            : new Date().toISOString();
        const clean = sanitizeRecipe({ ...data, id: docSnap.id, createdAt: createdAtIso });
        if (clean) list.push(clean);
      });
      handlers.onRecipes(list, snapshot.empty);
    },
    (error) => {
      handlers.onError(error);
      handleFirestoreError(error, OperationType.LIST, recipesPath);
    }
  );

  const unsubSchedules = onSnapshot(
    query(collection(firestore, schedulesPath), where('ownerId', '==', uid)),
    (snapshot) => {
      const map: ScheduleMap = {};
      snapshot.forEach((docSnap) => {
        const clean = sanitizeDayPlan(docSnap.id, docSnap.data());
        if (clean) map[docSnap.id] = clean;
      });
      handlers.onSchedule(map, snapshot.empty);
    },
    (error) => {
      handlers.onError(error);
      handleFirestoreError(error, OperationType.LIST, schedulesPath);
    }
  );

  const unsubGroceries = onSnapshot(
    query(collection(firestore, groceriesPath), where('ownerId', '==', uid)),
    (snapshot) => {
      const list: GroceryItem[] = [];
      snapshot.forEach((docSnap) => {
        const clean = sanitizeGroceryItem({ ...docSnap.data(), id: docSnap.id });
        if (clean) list.push(clean);
      });
      handlers.onGroceries(list, snapshot.empty);
    },
    (error) => {
      handlers.onError(error);
      handleFirestoreError(error, OperationType.LIST, groceriesPath);
    }
  );

  return () => {
    unsubRecipes();
    unsubSchedules();
    unsubGroceries();
  };
}

export async function saveRecipeToCloud(
  uid: string,
  recipe: Recipe,
  isCreate: boolean
): Promise<void> {
  if (!db) return;
  const path = `users/${uid}/recipes/${recipe.id}`;
  try {
    if (isCreate) {
      await setDoc(doc(db, path), serializeRecipeForFirestore(recipe, uid, true));
    } else {
      const payload = serializeRecipeForFirestore(recipe, uid, false);
      delete payload.id;
      delete payload.ownerId;
      await updateDoc(doc(db, path), payload);
    }
  } catch (error) {
    handleFirestoreError(error, isCreate ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteRecipeFromCloud(uid: string, recipeId: string): Promise<void> {
  if (!db) return;
  const path = `users/${uid}/recipes/${recipeId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveDayPlanToCloud(
  uid: string,
  dateKey: string,
  dayPlan: DayPlan,
  existsInCloud: boolean
): Promise<void> {
  if (!db) return;
  const path = `users/${uid}/schedules/${dateKey}`;
  try {
    if (!existsInCloud) {
      await setDoc(doc(db, path), serializeDayPlanForFirestore(dateKey, dayPlan, uid, true));
    } else {
      await updateDoc(doc(db, path), {
        midi: stripUndefined({ ...sanitizeMealSlot(dayPlan.midi as MealSlotContent) }),
        soir: stripUndefined({ ...sanitizeMealSlot(dayPlan.soir as MealSlotContent) }),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existsInCloud ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function saveGroceryItemToCloud(
  uid: string,
  item: GroceryItem,
  existsInCloud: boolean
): Promise<void> {
  if (!db) return;
  const path = `users/${uid}/groceries/${item.id}`;
  try {
    if (!existsInCloud) {
      await setDoc(doc(db, path), serializeGroceryForFirestore(item, uid, true));
    } else {
      const payload = serializeGroceryForFirestore(item, uid, false);
      delete payload.id;
      delete payload.ownerId;
      await updateDoc(doc(db, path), payload);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existsInCloud ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteGroceryItemFromCloud(uid: string, itemId: string): Promise<void> {
  if (!db) return;
  const path = `users/${uid}/groceries/${itemId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
