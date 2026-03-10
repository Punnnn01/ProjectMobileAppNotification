// Firebase v9 - Expo Go รองรับ
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

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

// ตั้ง Auth Persistence ให้ถูกต้องตาม Platform
// - Mobile (iOS/Android): ใช้ AsyncStorage → session อยู่แม้ปิดแอป
// - Web: ใช้ indexedDB/localStorage → session อยู่แม้ refresh หรือปิด tab
let auth;
if (Platform.OS === 'web') {
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
} else {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);
export default app;
