// Firebase SDK imports
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
 apiKey: "AIzaSyCzjreTSmDX1CicjY8cHsngyekea9lYNBk",
 authDomain: "acommerce-42565.firebaseapp.com",
 projectId: "acommerce-42565",
 storageBucket: "acommerce-42565.firebasestorage.app",
 messagingSenderId: "231208905773",
 appId: "1:231208905773:web:32b163a50c1d2a0c3e9ca4",
 measurementId: "G-2W1G3TX5RT"
};

// Track if Firebase is initialized
let firebaseInitialized = false;
let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Try to initialize Firebase, but don't fail if there's an issue
try {
 app = initializeApp(firebaseConfig);
 firebaseInitialized = true;

 // Initialize services with error handling
 try {
  analytics = getAnalytics(app);
 } catch (e) {
  console.warn("Firebase Analytics initialization failed:", e);
 }

 try {
  db = getFirestore(app);
 } catch (e) {
  console.warn("Firebase Firestore initialization failed:", e);
 }

 try {
  auth = getAuth(app);
 } catch (e) {
  console.warn("Firebase Auth initialization failed:", e);
 }

 try {
  storage = getStorage(app);
 } catch (e) {
  console.warn("Firebase Storage initialization failed:", e);
 }

 // Setup Google Provider
 if (auth) {
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
 }
} catch (error) {
 console.error("Firebase initialization failed:", error);
}

// Export all Firebase services (may be null if initialization failed)
export { app, analytics, db, auth, storage, googleProvider };
export { firebaseInitialized };
