// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAc6xrsFM_d-CzzIWmlsrcCf5zo0OVZw0g",
  authDomain: "dental-clinic-platform.firebaseapp.com",
  projectId: "dental-clinic-platform",
  storageBucket: "dental-clinic-platform.firebasestorage.app",
  messagingSenderId: "343441834039",
  appId: "1:343441834039:web:8b366c8e0ee60fd236bfb2",
  measurementId: "G-1R6S243P9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services so you can import them anywhere
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
