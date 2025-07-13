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

    // Configuración de autenticación simplificada para certificados
function setupAuth() {
    console.log("🔐 Configurando autenticación para certificados...");

    // Mostrar contenido inmediatamente para vista pública
    updateUIVisibility(null, false);
    
    // Cargar certificados inmediatamente
    loadCertificates();

    // Configurar listener de autenticación sin bloquear la carga
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        console.log("🔐 Estado de auth:", user ? "autenticado" : "no autenticado");
        const isAdmin = user && user.uid === ADMIN_UID;
        updateUIVisibility(user, isAdmin);
        
        // Solo recargar certificados si es necesario
        if (allCerts.length === 0) {
            loadCertificates();
        }
    }, (error) => {
        console.error("❌ Error en autenticación:", error);
        // Continuar mostrando contenido público aunque falle la auth
        updateUIVisibility(null, false);
        if (allCerts.length === 0) {
            loadCertificates();
        }
    });
}

    function updateUIVisibility(user, isAdmin) {
    const authStatus = document.getElementById('authStatus');
    const addCertFormSection = document.getElementById('addCertFormSection');
    const mainContent = document.getElementById('mainContent');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Actualizar estado de autenticación
    if (authStatus) {
        authStatus.textContent = user ? `Autenticado como: ${user.email}` : "Vista pública - Solo lectura";
    }

    // Mostrar/ocultar formulario de administrador
    if (addCertFormSection) {
        addCertFormSection.classList.toggle('hidden', !isAdmin);
    }

    // Mostrar/ocultar columnas de administrador
    document.querySelectorAll('.admin-col').forEach(col => {
        col.style.display = isAdmin ? '' : 'none';
    });

    // SIEMPRE mostrar el contenido principal
    if (mainContent) {
        mainContent.classList.remove('hidden');
        mainContent.style.display = 'block';
        console.log("✅ Contenido principal mostrado");
    }

    // SIEMPRE ocultar el indicador de carga
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
        loadingIndicator.style.display = 'none';
        console.log("⏳ Indicador de carga ocultado");
    }
}

    function loadCertificates() {
    const certsCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_certificates`);
    const certsTableBody = document.getElementById('certsTableBody');

    if (!certsTableBody) {
        console.error("❌ No se encontró certsTableBody");
        return;
    }

    // Mostrar estado de carga inicial
    certsTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-8">
                <div class="flex items-center justify-center">
                    <svg class="animate-spin h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando certificados...
                </div>
            </td>
        </tr>
    `;

    console.log("📋 Iniciando carga de certificados...");

    unsubscribeCerts = onSnapshot(
        query(certsCollectionRef), 
        (snapshot) => {
            console.log(`📋 Certificados recibidos: ${snapshot.size} documentos`);
            
            // Verificar conexión
            if (!navigator.onLine) {
                console.warn("⚠️ Sin conexión a internet");
                certsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-8 text-yellow-600">
                            <div class="mb-2">⚠️ Sin conexión a Internet</div>
                            <div class="text-sm text-gray-500">Los certificados se cargarán cuando se restablezca la conexión.</div>
                            <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                Reintentar
                            </button>
                        </td>
                    </tr>
                `;
                return;
            }

            // Procesar certificados
            allCerts = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            
            // Ordenar por nombre
            allCerts.sort((a, b) => (a.eppName || "").localeCompare(b.eppName || ""));
            
            console.log(`📋 Certificados procesados: ${allCerts.length}`);
            displayFilteredCerts();
        }, 
        (error) => {
            console.error("❌ Error al cargar certificados:", error);
            certsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8">
                        <div class="text-red-600 mb-2">❌ Error al cargar certificados</div>
                        <div class="text-sm text-gray-500 mb-2">
                            ${error.message || 'Error desconocido'}
                        </div>
                        <button onclick="location.reload()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            Reintentar
                        </button>
                    </td>
                </tr>
            `;
        }
    );
}

    // Función mejorada para mostrar certificados filtrados
function displayFilteredCerts() {
    const searchCertInput = document.getElementById('searchCertInput');
    const certsTableBody = document.getElementById('certsTableBody');
    
    if (!certsTableBody) {
        console.error("❌ No se encontró certsTableBody");
        return;
    }

    const searchTerm = searchCertInput ? searchCertInput.value.toLowerCase().trim() : "";
    const filteredCerts = searchTerm
        ? allCerts.filter(cert => (cert.eppName || '').toLowerCase().includes(searchTerm))
        : [...allCerts];

    const isAdminView = auth.currentUser && auth.currentUser.uid === ADMIN_UID;
    const colCount = isAdminView ? 5 : 4;

    // Limpiar tabla
    certsTableBody.innerHTML = '';

    if (filteredCerts.length === 0) {
        const message = searchTerm 
            ? "No se encontraron certificados que coincidan con la búsqueda." 
            : "No hay certificados registrados en el sistema.";
            
        certsTableBody.innerHTML = `
            <tr>
                <td colspan="${colCount}" class="text-center py-8">
                    <div class="text-gray-500 dark:text-gray-400">
                        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        ${message}
                    </div>
                    ${!searchTerm && isAdminView ? '<div class="text-sm text-gray-400 mt-2">Utilice el formulario de arriba para agregar el primer certificado.</div>' : ''}
                </td>
            </tr>
        `;
        return;
    }

    // Mostrar certificados
    filteredCerts.forEach(cert => {
        const tr = document.createElement('tr');
        tr.className = 'border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';

        // Procesar fecha de vigencia de forma segura
        let vigenciaDate, vigenciaText, estadoHtml;
        
        try {
            if (cert.vigencia && cert.vigencia.toDate) {
                vigenciaDate = cert.vigencia.toDate();
                vigenciaText = vigenciaDate.toLocaleDateString('es-CL');
                
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                
                if (vigenciaDate < hoy) {
                    estadoHtml = '<span class="cert-vencido">● Vencido</span>';
                } else if (vigenciaDate <= new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)) {
                    estadoHtml = '<span class="cert-por-vencer">● Por Vencer</span>';
                } else {
                    estadoHtml = '<span class="cert-vigente">● Vigente</span>';
                }
            } else {
                vigenciaText = 'Fecha inválida';
                estadoHtml = '<span class="text-gray-500">● Sin fecha</span>';
            }
        } catch (error) {
            console.error("Error procesando fecha:", error);
            vigenciaText = 'Error en fecha';
            estadoHtml = '<span class="text-red-500">● Error</span>';
        }

        // Columna de acciones de administrador
        const adminCol = isAdminView ? `
            <td class="py-4 px-6 text-center">
                <button data-id="${cert.id}" class="delete-cert-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors">
                    Eliminar
                </button>
            </td>
        ` : '';

        tr.innerHTML = `
            <td class="py-4 px-6 font-medium text-gray-900 dark:text-white">
                ${cert.eppName || 'Sin nombre'}
            </td>
            <td class="py-4 px-6 text-center text-gray-700 dark:text-gray-300">
                ${vigenciaText}
            </td>
            <td class="py-4 px-6 text-center">
                ${estadoHtml}
            </td>
            <td class="py-4 px-6 text-center">
                <a href="${cert.downloadURL || '#'}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="text-blue-500 hover:text-blue-700 hover:underline transition-colors">
                    📄 Ver/Descargar
                </a>
            </td>
            ${adminCol}
        `;
        
        certsTableBody.appendChild(tr);
    });

    console.log(`📋 Mostrados ${filteredCerts.length} certificados de ${allCerts.length} totales`);
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
            if (confirm(message)) {
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

// Verificar que la página esté completamente cargada
function waitForPageLoad() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCertificadosPage);
    } else {
        // DOM ya está listo
        initializeCertificadosPage();
    }
}

// Ejecutar inmediatamente
waitForPageLoad();
