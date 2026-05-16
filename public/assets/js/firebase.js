import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBd48doycSz-RwCVxFa2ZNlCJHY4U6QrAA",
  authDomain: "rentcar-manager.firebaseapp.com",
  projectId: "rentcar-manager",
  storageBucket: "rentcar-manager.firebasestorage.app",
  messagingSenderId: "872525860864",
  appId: "1:872525860864:web:5743e17fdcc8ea9c9d08e5"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
    app,
    auth,
    db,
    storage
};