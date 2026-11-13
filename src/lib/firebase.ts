import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, type Firestore } from 'firebase/firestore';

export interface FirebaseClientConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
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

  const apiKey = env.VITE_FIREBASE_API_KEY || local.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || local.projectId;
  const appId = env.VITE_FIREBASE_APP_ID || local.appId;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || local.authDomain;
  const firestoreDatabaseId =
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || local.firestoreDatabaseId;
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || local.storageBucket;
  const messagingSenderId =
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || local.messagingSenderId;

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
  resolvedConfig.apiKey && resolvedConfig.projectId && resolvedConfig.appId
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
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<User> {
  if (!auth) {
    throw new Error('La synchronisation Firebase n’est pas configurée sur cet environnement.');
  }
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
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
