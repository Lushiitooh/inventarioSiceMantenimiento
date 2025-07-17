// Importaciones de Firebase (solo las necesarias para inicializar)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// ------------------------------------------------------------------------------------
// IMPORTANTE: CONFIGURACIÓN DE FIREBASE Y ADMINISTRADOR
// ------------------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDJMs3s4SGlALxmYkR0wEfSICHRYCHAK7M",
  authDomain: "inventario-epp-ade06.firebaseapp.com",
  projectId: "inventario-epp-ade06",
  storageBucket: "inventario-epp-ade06.firebasestorage.app",
  messagingSenderId: "757113085822",
  appId: "1:757113085822:web:8dbfae137429cb250a1d2f",
  measurementId: "G-5MDCRN8R6D"
};

// Constantes de la aplicación
export const ADMIN_UID = "OFmoGyuT46g489ZKHm9la8qI5vn1"; // Mantén tu UID real aquí
export const appIdForPath = 'mi-inventario-epp-github';

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Añadimos la inicialización de Storage

// Habilitar persistencia offline
(async () => {
    try {
        await enableIndexedDbPersistence(db);
        console.log("Persistencia offline habilitada.");
    } catch (err) {
        console.warn("Persistencia offline:", err.message);
    }
})();


// Exportar las instancias para usarlas en otros archivos
export { app, db, auth, storage };
// Verificar que Firebase se inicializó correctamente
console.log("🔥 Firebase inicializado correctamente");
console.log("📊 Base de datos:", db.app.name);
console.log("🔐 Auth:", auth.app.name);
console.log("💾 Storage:", storage.app.name);
