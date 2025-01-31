// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: 'projectrenteasejs',
  storageBucket: 'projectrenteasejs.firebasestorage.app',
  messagingSenderId: '103578940217',
  appId: '1:103578940217:web:26f5ad0835d6e8b141eee8',
  measurementId: 'G-CZPHL65F88',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
export { db };
