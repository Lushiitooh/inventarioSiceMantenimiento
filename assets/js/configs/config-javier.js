// assets/js/configs/config-javier.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJMs3s4SGlALxmYkR0wEfSICHRYCHAK7M",
  authDomain: "inventario-epp-ade06.firebaseapp.com",
  projectId: "inventario-epp-ade06",
  storageBucket: "inventario-epp-ade06.firebasestorage.app",
  messagingSenderId: "757113085822",
  appId: "1:757113085822:web:8dbfae137429cb250a1d2f",
  measurementId: "G-5MDCRN8R6D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Habilitar persistencia offline
(async () => {
    try {
        await enableIndexedDbPersistence(db);
        console.log("Persistencia offline habilitada - Javier.");
    } catch (err) {
        console.warn("Persistencia offline Javier:", err.message);
    }
})();

export const javierConfig = {
    db, auth, storage,
    ADMIN_UID: "OFmoGyuT46g489ZKHm9la8qI5vn1",
    appIdForPath: 'mi-inventario-epp-github',
    instanceName: 'Javier',
    theme: {
        primaryColor: '#7c3aed',
        accentColor: '#8b5cf6'
    }
};