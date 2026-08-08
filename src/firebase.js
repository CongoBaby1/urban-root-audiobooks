import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyADdQCN_si15BdMG7KameHDqAgaFFhblQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "audiobook-df70c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "audiobook-df70c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "audiobook-df70c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "432542470692",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:432542470692:web:f63b2a40f6813d373f7eb1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-391M7PC11N"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
