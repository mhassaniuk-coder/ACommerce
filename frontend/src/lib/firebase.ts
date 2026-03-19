// Firebase SDK imports
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration from environment variables (with fallback to hardcoded values)
const firebaseConfig = {
 apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCzjreTSmDX1CicjY8cHsngyekea9lYNBk",
 authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "acommerce-42565.firebaseapp.com",
 projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "acommerce-42565",
 storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "acommerce-42565.firebasestorage.app",
 messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "231208905773",
 appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:231208905773:web:32b163a50c1d2a0c3e9ca4",
 measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2W1G3TX5RT"
};

// Track if Firebase is initialized
let firebaseInitialized = false;
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Try to initialize Firebase, but don't fail if there's an issue
try {
 app = initializeApp(firebaseConfig);
 firebaseInitialized = true;

 try {
  auth = getAuth(app);
 } catch (e) {
  console.warn("Firebase Auth initialization failed:", e);
 }

 // Setup Google Provider
 if (auth) {
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
 }
} catch (error) {
 console.error("Firebase initialization failed:", error);
}

// Export Firebase services needed on initial app load.
export { app, auth, googleProvider };
export { firebaseInitialized };

// Initialize Firestore and Storage (lazy initialization)
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

if (app && firebaseInitialized) {
 try {
  db = getFirestore(app);
 } catch (e) {
  console.warn("Firebase Firestore initialization failed:", e);
 }

 try {
  storage = getStorage(app);
 } catch (e) {
  console.warn("Firebase Storage initialization failed:", e);
 }
}

export { db, storage };
