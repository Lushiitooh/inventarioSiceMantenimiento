// assets/js/app.js (Refactorizado con delegación de eventos y limpieza completa)

import { db, auth, ADMIN_UID, appIdForPath } from './firebase-config.js';
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    collection, addDoc, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query, where, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function initializeInventoryPage() {
    console.log("⚙️ Activando la lógica de la página de Inventario (v. Completa)");

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    // Referencias para poder cancelar las suscripciones a Firebase al salir de la página.
    let unsubscribeInventory = null;
    let unsubscribeLoans = null;
    let unsubscribeAuth = null;
    let confirmCallback = null;
    let allEppItems = [];

    // --- MANEJADORES DE EVENTOS CENTRALIZADOS (DELEGACIÓN DE EVENTOS) ---

    const handleClick = (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;

        if (button.id === 'logoutButton') handleLogout();
        else if (button.id === 'confirmButton') {
            if (confirmCallback) confirmCallback();
            hideConfirmationModal();
        } else if (button.id === 'cancelButton') hideConfirmationModal();
        else if (action === 'increase' || action === 'decrease' || action === 'delete') handleInventoryAction(button);
        else if (action === 'returnLoan') handleReturnLoan(button);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (e.target.id === 'loginForm') handleLogin(e.target);
        else if (e.target.id === 'addEppForm') handleAddEpp(e.target);
        else if (e.target.id === 'loanEppForm') handleLoanEpp(e.target);
    };

    const handleInput = (e) => {
        if (e.target.id === 'searchEppInput') {
            const isAdmin = auth.currentUser && auth.currentUser.uid === ADMIN_UID;
            displayFilteredInventory(isAdmin);
        }
    };

    // --- FUNCIÓN DE LIMPIEZA ---
    const cleanup = () => {
        console.log("🧹 Limpiando listeners y suscripciones de la página de Inventario.");
        appContent.removeEventListener('click', handleClick);
        appContent.removeEventListener('submit', handleSubmit);
        appContent.removeEventListener('input', handleInput);

        if (unsubscribeInventory) unsubscribeInventory();
        if (unsubscribeLoans) unsubscribeLoans();
        if (unsubscribeAuth) unsubscribeAuth();
    };

    // --- REGISTRO DE LISTENERS Y LIMPIEZA ---
    appContent.addEventListener('click', handleClick);
    appContent.addEventListener('submit', handleSubmit);
    appContent.addEventListener('input', handleInput);
    window.registerPageCleanup(cleanup);

    // --- LÓGICA DE LA APLICACIÓN ---

    function setupFirebase() {
        const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
        const eppLoansCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_loans`);

        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isAdmin = user && user.uid === ADMIN_UID;
            updateUIVisibility(user, isAdmin);
            loadInventory(eppInventoryCollectionRef, isAdmin);
            if (isAdmin) {
                loadLoans(eppLoansCollectionRef);
            }
        });
    }

    function updateUIVisibility(user, isAdmin) {
        const loginSection = document.getElementById('loginSection');
        const mainContent = document.getElementById('mainContent');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const logoutButton = document.getElementById('logoutButton');
        const addEppFormSection = document.getElementById('addEppFormSection');
        const loansSection = document.getElementById('loansSection');
        const userIdDisplay = document.getElementById('userIdDisplay');
        const authStatus = document.getElementById('authStatus');

        if (user) {
            if (userIdDisplay) userIdDisplay.textContent = `Logueado como: ${user.email}`;
            if (authStatus) authStatus.textContent = "Autenticado.";
            if (loginSection) loginSection.classList.add('hidden');
            if (logoutButton) logoutButton.classList.remove('hidden');
            if (addEppFormSection) addEppFormSection.classList.toggle('hidden', !isAdmin);
            if (loansSection) loansSection.classList.toggle('hidden', !isAdmin);
        } else {
            if (userIdDisplay) userIdDisplay.textContent = "Visitante";
            if (authStatus) authStatus.textContent = "No autenticado.";
            if (loginSection) loginSection.classList.remove('hidden');
            if (logoutButton) logoutButton.classList.add('hidden');
            if (addEppFormSection) addEppFormSection.classList.add('hidden');
            if (loansSection) loansSection.classList.add('hidden');
        }
        
        adjustAdminColumnsVisibility(isAdmin);
        if (mainContent) mainContent.classList.remove('hidden');
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }

    function loadInventory(eppInventoryCollectionRef, isAdmin) {
        unsubscribeInventory = onSnapshot(query(eppInventoryCollectionRef), (snapshot) => {
            allEppItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allEppItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            displayFilteredInventory(isAdmin);
        }, (error) => {
            console.error("Error al cargar inventario EPP: ", error);
            showTemporaryMessage(`Error al cargar inventario: ${error.message}`, "error");
        });
    }
    
    function displayFilteredInventory(isAdminView) {
        const eppTableBody = document.getElementById('eppTableBody');
        const eppToLoanSelect = document.getElementById('eppToLoanSelect');
        const searchEppInput = document.getElementById('searchEppInput');
        if (!eppTableBody) return;

        eppTableBody.innerHTML = '';
        if (isAdminView && eppToLoanSelect) {
            eppToLoanSelect.innerHTML = '<option value="">Seleccione un EPP</option>';
        }

        const searchTerm = searchEppInput ? searchEppInput.value.toLowerCase().trim() : "";
        const filteredItems = searchTerm
            ? allEppItems.filter(item =>
                (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                (item.size && item.size.toLowerCase().includes(searchTerm))
            )
            : [...allEppItems];

        if (filteredItems.length === 0) {
            const message = searchTerm ? "No hay EPP que coincidan con la búsqueda." : "No hay EPP registrados en el sistema.";
            if (window.showEmptyState) window.showEmptyState(eppTableBody, message);
        } else {
            filteredItems.forEach(item => {
                if (window.renderEppItemImproved) {
                    const tr = window.renderEppItemImproved(item, isAdminView);
                    eppTableBody.appendChild(tr);
                }
                if (isAdminView && eppToLoanSelect) {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = `${item.name || 'N/A'} (Talla: ${item.size || 'N/A'}) - Stock: ${item.quantity || 0}`;
                    option.dataset.stock = item.quantity || 0;
                    option.dataset.name = item.name;
                    option.dataset.size = item.size || 'N/A';
                    eppToLoanSelect.appendChild(option);
                }
            });
        }
    }
    
    // ... (El resto de las funciones como handleLogin, handleAddEpp, handleLogout, etc. van aquí)
    // ... (mapAuthError, loadLoans, renderLoanItem, showTemporaryMessage, showConfirmationModal, etc.)
    // ... (Estas funciones no necesitan cambios en su lógica interna)

    async function handleLogin(form) {
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        const loginError = form.querySelector('#loginError');
        
        loginError.classList.add('hidden');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            form.reset();
        } catch (error) {
            console.error("Error de inicio de sesión:", error);
            loginError.textContent = `Error: ${mapAuthError(error.code)}`;
            loginError.classList.remove('hidden');
        }
    }

    async function handleLogout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            showTemporaryMessage(`Error al cerrar sesión: ${error.message}`, "error");
        }
    }

    async function handleAddEpp(form) {
        const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
        const name = form.querySelector('#eppName').value.trim();
        const size = form.querySelector('#eppSize').value.trim();
        const quantity = parseInt(form.querySelector('#eppQuantity').value);
        const minStock = parseInt(form.querySelector('#eppMinStock').value);

        if (name && !isNaN(quantity) && quantity >= 0 && !isNaN(minStock) && minStock >= 0) {
            try {
                await addDoc(eppInventoryCollectionRef, { name, size, quantity, minStock, createdAt: Timestamp.now() });
                form.reset();
                showTemporaryMessage("EPP agregado con éxito.", "success");
            } catch (error) {
                showTemporaryMessage(`Error al agregar EPP: ${error.message}`, "error");
            }
        } else {
            showTemporaryMessage("Datos inválidos. Por favor, complete todos los campos requeridos.", "error");
        }
    }

    async function handleInventoryAction(button) {
        const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
        const { action, id } = button.dataset;
        const itemRef = doc(eppInventoryCollectionRef, id);

        try {
            const itemDoc = await getDoc(itemRef);
            if (!itemDoc.exists()) return;
            const currentQuantity = itemDoc.data().quantity;

            if (action === 'increase') {
                await updateDoc(itemRef, { quantity: currentQuantity + 1 });
            } else if (action === 'decrease') {
                if (currentQuantity > 0) await updateDoc(itemRef, { quantity: currentQuantity - 1 });
            } else if (action === 'delete') {
                showConfirmationModal(`¿Estás seguro de que quieres eliminar "${itemDoc.data().name}"? Esta acción no se puede deshacer.`, async () => {
                    await deleteDoc(itemRef);
                    showTemporaryMessage("EPP eliminado correctamente.", "success");
                });
            }
        } catch (error) {
            showTemporaryMessage(`Error al actualizar el EPP: ${error.message}`, "error");
        }
    }

    function mapAuthError(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email': return 'El formato del correo electrónico es inválido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                 return 'Correo o contraseña incorrectos.';
            default: return 'Ocurrió un error inesperado al iniciar sesión.';
        }
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
        const modal = document.getElementById('confirmationModal');
        const modalMessage = document.getElementById('confirmationMessage');
        if (!modal || !modalMessage) return;
        modalMessage.textContent = message;
        confirmCallback = callback;
        modal.classList.remove('hidden');
    }

    function hideConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) modal.classList.add('hidden');
    }
    
    function adjustAdminColumnsVisibility(isAdminView) {
        document.querySelectorAll('.admin-col').forEach(col => {
            col.style.display = isAdminView ? '' : 'none';
        });
    }
    
    // --- INICIO DE LA EJECUCIÓN ---
    setupFirebase();
}

// Llama a la función principal para inicializar la lógica de la página.
initializeInventoryPage();
