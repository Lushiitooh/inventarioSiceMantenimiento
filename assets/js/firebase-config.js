// Importaciones de Firebase (solo las necesarias para inicializar)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// ------------------------------------------------------------------------------------
// IMPORTANTE: CONFIGURACIÓN DE FIREBASE Y ADMINISTRADOR
// ------------------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyA0UYwg8kjPibnc7bvMwHvZWT01K1uLr2M", // Mantén tus credenciales reales aquí
  authDomain: "inventario-epp.firebaseapp.com",
  projectId: "inventario-epp",
  storageBucket: "inventario-epp.appspot.com", // Importante: Asegúrate que el Storage Bucket sea el correcto. Suele ser projectId.appspot.com
  messagingSenderId: "255309951395",
  appId: "1:255309951395:web:f57cdb7b13c16a53636a16",
  measurementId: "G-T0DKE1NFB3"
};

// Constantes de la aplicación
export const ADMIN_UID = "hmaz0EfU1FeSBTqYfneDAhqbuLk2"; // Mantén tu UID real aquí
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
