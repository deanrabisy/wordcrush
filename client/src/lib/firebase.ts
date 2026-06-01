import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCbX9EMWVs2ENuhHE2pLL2EdrO1NkF4bnE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'wordcrush-e5cc4.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://wordcrush-e5cc4-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'wordcrush-e5cc4',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'wordcrush-e5cc4.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '796444841351',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:796444841351:web:844c3d110156416cddef22',
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let database: Database | null = null;

export function getFirebaseDatabase(): Database {
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured yet');
  }

  app ??= initializeApp(firebaseConfig);
  database ??= getDatabase(app);
  return database;
}
