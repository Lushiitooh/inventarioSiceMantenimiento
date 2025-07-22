// assets/js/configs/config-alex.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMp9p-VAwjrOZYcsmzsmmwW9rWTXhniVA",
  authDomain: "inventario-epp-7b98d.firebaseapp.com",
  projectId: "inventario-epp-7b98d",
  storageBucket: "inventario-epp-7b98d.firebasestorage.app",
  messagingSenderId: "270634551740",
  appId: "1:270634551740:web:20e9489a9eaca62e1c83b9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Habilitar persistencia offline
(async () => {
    try {
        await enableIndexedDbPersistence(db);
        console.log("Persistencia offline habilitada - Alex.");
    } catch (err) {
        console.warn("Persistencia offline Alex:", err.message);
    }
})();

export const alexConfig = {
    db, auth, storage,
    ADMIN_UID: "Zl1sHgqRGXYeNO1j3JlrL0LCJr33",
    appIdForPath: 'mi-inventario-epp-github',
    instanceName: 'Alex',
    theme: {
        primaryColor: '#059669',
        accentColor: '#10b981'
    }
};