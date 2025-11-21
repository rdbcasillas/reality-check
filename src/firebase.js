import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGs56VeDqgk6DE8HIvGnumnC1rp1LsoMQ",
  authDomain: "ratworkshops.firebaseapp.com",
  projectId: "ratworkshops",
  storageBucket: "ratworkshops.firebasestorage.app",
  messagingSenderId: "615727125376",
  appId: "1:615727125376:web:d508a0a53b5066c06aa765"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Automatically sign in anonymously
signInAnonymously(auth).catch((error) => {
  console.error("Anonymous auth error:", error);
});

export { auth, db };
