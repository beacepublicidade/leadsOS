import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBnolSxxGrLwa2IK7WYZYei9BWC_LUhXmA",
  authDomain: "leadsos.firebaseapp.com",
  projectId: "leadsos",
  storageBucket: "leadsos.firebasestorage.app",
  messagingSenderId: "1050027290928",
  appId: "1:1050027290928:web:43c04dfe153c3a9a5318f5",
};

// Evita múltiplas instâncias em dev com hot-reload do Next.js
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
