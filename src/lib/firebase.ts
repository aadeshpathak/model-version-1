import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCwrDjn6ip4LDgnmKN2WuEyRaONuiGskDk",
  authDomain: "my-society-app-1100.firebaseapp.com",
  projectId: "my-society-app-1100",
  storageBucket: "my-society-app-1100.firebasestorage.app",
  messagingSenderId: "452166557157",
  appId: "1:452166557157:web:b53bbba8dd7970b290e30c",
  measurementId: "G-ML88GKEYMG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
