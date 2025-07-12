// assets/js/certificados.js (Refactorizado con delegación de eventos y limpieza completa)

import { db, auth, ADMIN_UID, appIdForPath } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, doc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function initializeCertificadosPage() {
    console.log("⚙️ Activando la lógica de la página de Certificados (v. Completa)");

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    // Referencias para poder cancelar las suscripciones a Firebase.
    let unsubscribeCerts = null;
    let unsubscribeAuth = null;
    let allCerts = [];
    let confirmCallback = null;

    // --- MANEJADORES DE EVENTOS CENTRALIZADOS ---

    const handleSubmit = (e) => {
        if (e.target.id === 'addCertForm') {
            e.preventDefault();
            handleAddCert(e.target);
        }
    };

    const handleClick = (e) => {
        const button = e.target.closest('button');
        if (button && button.classList.contains('delete-cert-btn')) {
            handleDeleteCert(button);
        } else if (button && button.id === 'confirmButton') {
            if (confirmCallback) confirmCallback();
            hideConfirmationModal();
        } else if (button && button.id === 'cancelButton') {
            hideConfirmationModal();
        }
    };

    const handleInput = (e) => {
        if (e.target.id === 'searchCertInput') {
            displayFilteredCerts();
        }
    };

    // --- FUNCIÓN DE LIMPIEZA ---
    const cleanup = () => {
        console.log("🧹 Limpiando listeners y suscripciones de la página de Certificados.");
        appContent.removeEventListener('submit', handleSubmit);
        appContent.removeEventListener('click', handleClick);
        appContent.removeEventListener('input', handleInput);

        if (unsubscribeCerts) unsubscribeCerts();
        if (unsubscribeAuth) unsubscribeAuth();
    };

    // --- REGISTRO DE LISTENERS Y LIMPIEZA ---
    appContent.addEventListener('submit', handleSubmit);
    appContent.addEventListener('click', handleClick);
    appContent.addEventListener('input', handleInput);
    window.registerPageCleanup(cleanup);

    // --- LÓGICA DE LA APLICACIÓN ---

    const CLOUDINARY_CLOUD_NAME = "dep5jbtjh";
    const CLOUDINARY_UPLOAD_PRESET = "inv_epp_unsigned";

    function setupAuth() {
        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isAdmin = user && user.uid === ADMIN_UID;
            updateUIVisibility(user, isAdmin);
            loadCertificates();
        });
    }

    function updateUIVisibility(user, isAdmin) {
        const authStatus = document.getElementById('authStatus');
        const addCertFormSection = document.getElementById('addCertFormSection');
        const mainContent = document.getElementById('mainContent');
        const loadingIndicator = document.getElementById('loadingIndicator');

        if (authStatus) authStatus.textContent = user ? `Autenticado como: ${user.email}` : "No autenticado (vista pública)";
        if (addCertFormSection) addCertFormSection.classList.toggle('hidden', !isAdmin);
        
        document.querySelectorAll('.admin-col').forEach(col => {
            col.style.display = isAdmin ? '' : 'none';
        });

        if (mainContent) mainContent.classList.remove('hidden');
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }

    function loadCertificates() {
        const certsCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_certificates`);
        const certsTableBody = document.getElementById('certsTableBody');

        unsubscribeCerts = onSnapshot(query(certsCollectionRef), (snapshot) => {
            allCerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allCerts.sort((a, b) => (a.eppName || "").localeCompare(b.eppName || ""));
            displayFilteredCerts();
        }, (error) => {
            console.error("Error al cargar certificados:", error);
            if (certsTableBody) certsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Error al cargar datos.</td></tr>`;
        });
    }

    function displayFilteredCerts() {
        const searchCertInput = document.getElementById('searchCertInput');
        const certsTableBody = document.getElementById('certsTableBody');
        if (!certsTableBody) return;

        const searchTerm = searchCertInput ? searchCertInput.value.toLowerCase().trim() : "";
        const filteredCerts = searchTerm
            ? allCerts.filter(cert => cert.eppName.toLowerCase().includes(searchTerm))
            : allCerts;

        certsTableBody.innerHTML = '';
        const isAdminView = auth.currentUser && auth.currentUser.uid === ADMIN_UID;
        const colCount = isAdminView ? 5 : 4;

        if (filteredCerts.length === 0) {
            certsTableBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-4">No se encontraron certificados que coincidan.</td></tr>`;
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

    async function handleAddCert(form) {
        const eppName = form.querySelector('#certEppName').value.trim();
        const vigencia = form.querySelector('#certVigencia').value;
        const file = form.querySelector('#certFile').files[0];
        const uploadButton = form.querySelector('#uploadButton');
        const uploadProgress = form.querySelector('#uploadProgress');

        if (!eppName || !vigencia || !file) {
            showTemporaryMessage("Por favor, completa todos los campos.", "warning");
            return;
        }

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
                throw new Error(`Error en la subida a Cloudinary: ${response.statusText}`);
            }

            const data = await response.json();
            const downloadURL = data.secure_url;
            const certsCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_certificates`);

            await addDoc(certsCollectionRef, {
                eppName,
                vigencia: Timestamp.fromDate(new Date(vigencia)),
                fileName: file.name,
                downloadURL,
                cloudinary_public_id: data.public_id,
                uploadedAt: Timestamp.now()
            });

            showTemporaryMessage("¡Certificado subido con éxito!", "success");
            form.reset();

        } catch (error) {
            console.error("Error en el proceso de subida:", error);
            showTemporaryMessage(`Error al subir el certificado. ${error.message}`, "error");
        } finally {
            uploadProgress.textContent = "";
            uploadButton.disabled = false;
            uploadButton.textContent = "Subir Certificado";
        }
    }

    function handleDeleteCert(button) {
        const certId = button.dataset.id;
        const certDoc = allCerts.find(c => c.id === certId);
        const certsCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_certificates`);

        showConfirmationModal(`¿Estás seguro de que quieres eliminar la entrada para "${certDoc.eppName}"? El archivo permanecerá en Cloudinary.`, async () => {
            try {
                await deleteDoc(doc(certsCollectionRef, certId));
                showTemporaryMessage("Entrada del certificado eliminada.", "success");
            } catch (error) {
                console.error("Error al eliminar la entrada:", error);
                showTemporaryMessage(`Error al eliminar: ${error.message}`, "error");
            }
        });
    }
    
    function showTemporaryMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) return;
        messageContainer.textContent = message;
        const baseClasses = 'p-3 mb-4 text-sm rounded-lg';
        const typeClasses = {
            success: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100',
            error: 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100',
            warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100',
            info: 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100'
        };
        messageContainer.className = `${baseClasses} ${typeClasses[type] || typeClasses['info']}`;
        messageContainer.classList.remove('hidden');
        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 4000);
    }
    
    function showConfirmationModal(message, callback) {
        // Esta función asume que el HTML del modal ya existe en la página.
        const modal = document.getElementById('confirmationModal');
        const modalMessage = document.getElementById('confirmationMessage');
        if (!modal || !modalMessage) { // Como fallback, si el modal no está, usa el confirm nativo.
            if(confirm(message)) {
                callback();
            }
            return;
        }
        modalMessage.textContent = message;
        confirmCallback = callback;
        modal.classList.remove('hidden');
    }

    function hideConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) modal.classList.add('hidden');
    }

    // --- INICIO DE LA EJECUCIÓN ---
    setupAuth();
}

// Llama a la función principal para inicializar la lógica de la página.
initializeCertificadosPage();
