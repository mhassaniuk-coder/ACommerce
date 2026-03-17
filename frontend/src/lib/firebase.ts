// Firebase SDK imports
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

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
