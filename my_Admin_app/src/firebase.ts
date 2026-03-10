// Firebase configuration for Admin Web App
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAaK8n1I0JoWnvx6wvGM6GF1kn2Dz9zWNs",
  authDomain: "appnoti-fa1cc.firebaseapp.com",
  projectId: "appnoti-fa1cc",
  storageBucket: "appnoti-fa1cc.firebasestorage.app",
  messagingSenderId: "535692820291",
  appId: "1:535692820291:web:b0acbeab5629076e0d39f6",
  measurementId: "G-J0Y07YPZSB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const auth = getAuth(app);

export default app;
