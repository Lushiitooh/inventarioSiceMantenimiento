// --- Imports ---
import { db, auth, ADMIN_UID, appIdForPath } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, doc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURACIÓN DE CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = "dep5jbtjh";
const CLOUDINARY_UPLOAD_PRESET = "inv_epp_unsigned";

// --- Variables y Elementos del DOM ---
let allCerts = [];
let currentLoggedInUser = null;
const certsCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_certificates`);

const authStatus = document.getElementById('authStatus');
const addCertFormSection = document.getElementById('addCertFormSection');
const addCertForm = document.getElementById('addCertForm');
const certEppNameInput = document.getElementById('certEppName');
const certVigenciaInput = document.getElementById('certVigencia');
const certFileInput = document.getElementById('certFile');
const uploadButton = document.getElementById('uploadButton');
const uploadProgress = document.getElementById('uploadProgress');
const messageContainer = document.getElementById('messageContainer');

const searchCertInput = document.getElementById('searchCertInput');
const certsTableBody = document.getElementById('certsTableBody');
const loadingIndicator = document.getElementById('loadingIndicator');
const mainContent = document.getElementById('mainContent');

// --- Lógica Principal ---

onAuthStateChanged(auth, (user) => {
    currentLoggedInUser = user;
    const isAdmin = user && user.uid === ADMIN_UID;
    authStatus.textContent = user ? `Autenticado como: ${user.email}` : "No autenticado (vista pública)";
    addCertFormSection.classList.toggle('hidden', !isAdmin);
    document.querySelectorAll('.admin-col').forEach(col => {
        col.style.display = isAdmin ? '' : 'none';
    });
    loadCertificates();
    mainContent.classList.remove('hidden');
    loadingIndicator.classList.add('hidden');
});

function loadCertificates() {
    onSnapshot(query(certsCollectionRef), (snapshot) => {
        allCerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCerts.sort((a, b) => a.eppName.localeCompare(b.eppName));
        displayFilteredCerts();
    }, (error) => {
        console.error("Error al cargar certificados:", error);
        certsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Error al cargar datos.</td></tr>`;
    });
}

// ==================================================================
// PASO 2: REVERTIR EL CAMBIO EN ESTA FUNCIÓN
// La lógica para modificar la URL de descarga se elimina.
// ==================================================================
function displayFilteredCerts() {
    const searchTerm = searchCertInput.value.toLowerCase().trim();
    const filteredCerts = searchTerm 
        ? allCerts.filter(cert => cert.eppName.toLowerCase().includes(searchTerm))
        : allCerts;
        
    certsTableBody.innerHTML = '';
    const isAdminView = currentLoggedInUser && currentLoggedInUser.uid === ADMIN_UID;
    const colCount = isAdminView ? 5 : 4;

    if (filteredCerts.length === 0) {
        certsTableBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-4">No hay certificados que coincidan.</td></tr>`;
        return;
    }

    filteredCerts.forEach(cert => {
        const tr = document.createElement('tr');
        tr.className = 'border-b dark:border-gray-700';

        const vigenciaDate = cert.vigencia.toDate();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const estado = vigenciaDate < hoy 
            ? '<span class="font-semibold text-red-500">Vencido</span>'
            : '<span class="font-semibold text-green-500">Vigente</span>';

        const adminCol = isAdminView ? `
            <td class="py-4 px-6 text-center">
                <button data-id="${cert.id}" class="delete-cert-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Eliminar</button>
            </td>` : '';

        // Se vuelve a la forma simple: usamos la URL directamente de la base de datos.
        tr.innerHTML = `
            <td class="py-4 px-6 font-medium">${cert.eppName}</td>
            <td class="py-4 px-6 text-center">${vigenciaDate.toLocaleDateString()}</td>
            <td class="py-4 px-6 text-center">${estado}</td>
            <td class="py-4 px-6 text-center">
                <a href="${cert.downloadURL}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">Descargar</a>
            </td>
            ${adminCol}
        `;
        certsTableBody.appendChild(tr);
    });
}

// ==================================================================
// PASO 1: CORREGIR LA SUBIDA EN ESTA FUNCIÓN
// Se cambia "auto" por "raw" en la URL de subida.
// ==================================================================
addCertForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const eppName = certEppNameInput.value.trim();
    const vigencia = certVigenciaInput.value;
    const file = certFileInput.files[0];

    if (!eppName || !vigencia || !file) {
        showTemporaryMessage("Por favor, completa todos los campos.", "warning");
        return;
    }

    // CAMBIO CLAVE: Usamos "/raw/upload" para forzar que el archivo se trate como un documento.
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    uploadButton.disabled = true;
    uploadButton.textContent = "Subiendo...";
    uploadProgress.textContent = "Enviando archivo...";

    try {
        const response = await fetch(url, { method: 'POST', body: formData });
        if (!response.ok) {
            throw new Error(`Error en la subida: ${response.statusText}`);
        }
        
        const data = await response.json();
        const downloadURL = data.secure_url;

        await addDoc(certsCollectionRef, {
            eppName,
            vigencia: Timestamp.fromDate(new Date(vigencia)),
            fileName: file.name,
            downloadURL,
            cloudinary_public_id: data.public_id,
            uploadedAt: Timestamp.now()
        });
        
        showTemporaryMessage("¡Certificado subido con éxito!", "success");
        addCertForm.reset();

    } catch (error) {
        console.error("Error en el proceso de subida:", error);
        showTemporaryMessage(`Error al subir el certificado. ${error.message}`, "error");
    } finally {
        uploadProgress.textContent = "";
        uploadButton.disabled = false;
        uploadButton.textContent = "Subir Certificado";
    }
});

certsTableBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-cert-btn')) {
        const certId = e.target.dataset.id;
        
        if (confirm("¿Estás seguro? Se eliminará la entrada del listado, pero el archivo permanecerá en Cloudinary.")) {
            try {
                await deleteDoc(doc(certsCollectionRef, certId));
                showTemporaryMessage("Entrada del certificado eliminada.", "success");
            } catch (error) {
                console.error("Error al eliminar entrada:", error);
                showTemporaryMessage(`Error al eliminar: ${error.message}`, "error");
            }
        }
    }
});

searchCertInput.addEventListener('input', displayFilteredCerts);

function showTemporaryMessage(message, type = 'info') {
    if (!messageContainer) return;
    messageContainer.textContent = message;
    messageContainer.className = `p-3 mb-4 text-sm rounded-lg ${
        type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
        type === 'error'   ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'     :
        type === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100' :
                             'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100'
    }`;
    messageContainer.classList.remove('hidden');
    setTimeout(() => {
        messageContainer.classList.add('hidden');
    }, 4000);
}
