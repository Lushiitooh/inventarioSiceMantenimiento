// assets/js/configs/config-luis.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyA0UYwg8kjPibnc7bvMwHvZWT01K1uLr2M",
    authDomain: "inventario-epp.firebaseapp.com",
    projectId: "inventario-epp",
    storageBucket: "inventario-epp.appspot.com",
    messagingSenderId: "255309951395",
    appId: "1:255309951395:web:f57cdb7b13c16a53636a16",
    measurementId: "G-T0DKE1NFB3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Habilitar persistencia offline
(async () => {
    try {
        await enableIndexedDbPersistence(db);
        console.log("Persistencia offline habilitada - Luis.");
    } catch (err) {
        console.warn("Persistencia offline Luis:", err.message);
    }
})();

export const luisConfig = {
    db,
    auth,
    storage,
    ADMIN_UID: "hmaz0EfU1FeSBTqYfneDAhqbuLk2",
    appIdForPath: 'mi-inventario-epp-github',
    instanceName: 'Luis',
    theme: {
        primaryColor: '#1e40af',
        accentColor: '#06b6d4'
    }
};