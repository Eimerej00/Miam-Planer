import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import { extractFirebaseAuthCode } from '../utils/authErrors.ts';

export interface FirebaseClientConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

// Non-secret Firebase project identifiers so CI only needs VITE_FIREBASE_API_KEY
const PUBLIC_PROJECT_DEFAULTS: Omit<FirebaseClientConfig, 'apiKey'> = {
  projectId: 'temporal-charge-thl8x',
  appId: '1:660117405427:web:069094c7c60e7fdebe8186',
  authDomain: 'temporal-charge-thl8x.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-miamplanner-e3209a96-87cf-4f9d-af4e-9dc6a941adcf',
  storageBucket: 'temporal-charge-thl8x.firebasestorage.app',
  messagingSenderId: '660117405427',
};

function cleanValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function loadLocalAppletConfig(): FirebaseClientConfig {
  try {
    const modules = import.meta.glob<{ default: FirebaseClientConfig }>(
      '../../firebase-applet-config.json',
      { eager: true }
    );
    const first = Object.values(modules)[0];
    return first?.default || {};
  } catch {
    return {};
  }
}

export function resolveFirebaseConfig(): FirebaseClientConfig {
  const env = (import.meta.env || {}) as Record<string, string | undefined>;
  const local = loadLocalAppletConfig();

  const apiKey = cleanValue(env.VITE_FIREBASE_API_KEY) || cleanValue(local.apiKey);
  const projectId =
    cleanValue(env.VITE_FIREBASE_PROJECT_ID) ||
    cleanValue(local.projectId) ||
    PUBLIC_PROJECT_DEFAULTS.projectId;
  const appId =
    cleanValue(env.VITE_FIREBASE_APP_ID) ||
    cleanValue(local.appId) ||
    PUBLIC_PROJECT_DEFAULTS.appId;
  const authDomain =
    cleanValue(env.VITE_FIREBASE_AUTH_DOMAIN) ||
    cleanValue(local.authDomain) ||
    (projectId ? `${projectId}.firebaseapp.com` : PUBLIC_PROJECT_DEFAULTS.authDomain);
  const firestoreDatabaseId =
    cleanValue(env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) ||
    cleanValue(local.firestoreDatabaseId) ||
    PUBLIC_PROJECT_DEFAULTS.firestoreDatabaseId;
  const storageBucket =
    cleanValue(env.VITE_FIREBASE_STORAGE_BUCKET) ||
    cleanValue(local.storageBucket) ||
    PUBLIC_PROJECT_DEFAULTS.storageBucket;
  const messagingSenderId =
    cleanValue(env.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
    cleanValue(local.messagingSenderId) ||
    PUBLIC_PROJECT_DEFAULTS.messagingSenderId;

  return {
    apiKey,
    projectId,
    appId,
    authDomain,
    firestoreDatabaseId,
    storageBucket,
    messagingSenderId,
  };
}

const resolvedConfig = resolveFirebaseConfig();
export const isFirebaseConfigured = Boolean(
  resolvedConfig.apiKey &&
    resolvedConfig.projectId &&
    resolvedConfig.appId &&
    resolvedConfig.authDomain
);

let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  const app = getApps().length === 0 ? initializeApp(resolvedConfig) : getApps()[0];
  dbInstance = getFirestore(app, resolvedConfig.firestoreDatabaseId || '(default)');
  authInstance = getAuth(app);
}

export const db = dbInstance;
export const auth = authInstance;

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

function isTopLevelWindow(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('La synchronisation Firebase n’est pas configurée sur cet environnement.');
  }
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (err) {
    const code = extractFirebaseAuthCode(err);
    const canRedirectFallback =
      isTopLevelWindow() &&
      (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment');

    if (canRedirectFallback) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function checkGoogleRedirectResult(): Promise<User | null> {
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: {
      providerId: string | null;
      email: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
