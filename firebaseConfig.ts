// =============================
// firebaseConfig.ts
// =============================

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCsC8T--3UkDWYYDmbTEdvtJ_9Mcit3bW0",
  authDomain: "pedraum-5421e.firebaseapp.com",
  projectId: "pedraum-5421e",
  storageBucket: "pedraum-5421e.appspot.com",
  messagingSenderId: "555153735851",
  appId: "1:555153735851:web:6f586ea1b82680db4a37ee",
  measurementId: "G-M1T8ZSB1MS",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
