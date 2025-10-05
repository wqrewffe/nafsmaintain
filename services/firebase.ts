
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyApuYJWcPhYyUAJxxBmXaUP6EblM-qs5qA",
  authDomain: "healthisourfirstpriority-589bc.firebaseapp.com",
  projectId: "healthisourfirstpriority-589bc",
  storageBucket: "healthisourfirstpriority-589bc.firebasestorage.app",
  messagingSenderId: "605193408649",
  appId: "1:605193408649:web:58b55a05863ff63b49f658",
  measurementId: "G-16SBZTEKJQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

const storage = getStorage(app);

export { auth, db, storage };
