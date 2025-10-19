// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);