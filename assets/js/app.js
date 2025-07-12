// assets/js/app.js (Corregido con delegación de eventos)

import { db, auth, ADMIN_UID, appIdForPath } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    collection,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    Timestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


function initializeInventoryPage() {
    console.log("⚙️ Activando la lógica de la página de Inventario v2 (Corregida)...");

    let currentLoggedInUser = null;
    let eppInventoryCollectionRef;
    let eppLoansCollectionRef;
    let allEppItems = [];
    let listenersAttached = false; // Flag para controlar los listeners

    // Seleccionar el contenedor principal que no se recarga
    const appContent = document.getElementById('app-content');

    // Mapeo de elementos para fácil acceso (se actualizarán al cargar la página)
    const elements = {};

    function updateDOMReferences() {
        elements.loginSection = document.getElementById('loginSection');
        elements.loginForm = document.getElementById('loginForm');
        elements.emailInput = document.getElementById('email');
        elements.passwordInput = document.getElementById('password');
        elements.logoutButton = document.getElementById('logoutButton');
        elements.userIdDisplay = document.getElementById('userIdDisplay');
        elements.authStatus = document.getElementById('authStatus');
        elements.loginError = document.getElementById('loginError');
        elements.addEppFormSection = document.getElementById('addEppFormSection');
        elements.addEppForm = document.getElementById('addEppForm');
        elements.eppNameInput = document.getElementById('eppName');
        elements.eppSizeInput = document.getElementById('eppSize');
        elements.eppQuantityInput = document.getElementById('eppQuantity');
        elements.eppMinStockInput = document.getElementById('eppMinStock');
        elements.eppTableBody = document.getElementById('eppTableBody');
        elements.searchEppInput = document.getElementById('searchEppInput');
        elements.loansSection = document.getElementById('loansSection');
        elements.loanEppForm = document.getElementById('loanEppForm');
        elements.eppToLoanSelect = document.getElementById('eppToLoanSelect');
        elements.loanQuantityInput = document.getElementById('loanQuantity');
        elements.loanedToInput = document.getElementById('loanedTo');
        elements.loansTableBody = document.getElementById('loansTableBody');
        elements.loadingIndicator = document.getElementById('loadingIndicator');
        elements.mainContent = document.getElementById('mainContent');
        elements.errorMessage = document.getElementById('errorMessage');
        elements.messageContainer = document.getElementById('messageContainer');
        elements.confirmationModal = document.getElementById('confirmationModal');
        elements.confirmationMessage = document.getElementById('confirmationMessage');
        elements.confirmButton = document.getElementById('confirmButton');
        elements.cancelButton = document.getElementById('cancelButton');
    }

    let confirmCallback = null;

    function setupEventListeners() {
        // Solo añadir listeners una vez
        if (listenersAttached || !appContent) return;

        console.log("Attaching event listeners for inventory page...");

        appContent.addEventListener('submit', async (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                handleLogin();
            } else if (e.target.id === 'addEppForm') {
                e.preventDefault();
                handleAddEpp();
            } else if (e.target.id === 'loanEppForm') {
                e.preventDefault();
                handleLoanEpp();
            }
        });

        appContent.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            if (button.id === 'logoutButton') {
                handleLogout();
            } else if (button.id === 'confirmButton') {
                if (confirmCallback) confirmCallback();
                if (elements.confirmationModal) elements.confirmationModal.classList.add('hidden');
            } else if (button.id === 'cancelButton') {
                if (elements.confirmationModal) elements.confirmationModal.classList.add('hidden');
            } else if (button.dataset.action) {
                const action = button.dataset.action;
                if (action === 'increase' || action === 'decrease' || action === 'delete') {
                    handleInventoryAction(button);
                } else if (action === 'returnLoan') {
                    handleReturnLoan(button);
                }
            }
        });

        appContent.addEventListener('input', (e) => {
            if (e.target.id === 'searchEppInput') {
                displayFilteredInventory(currentLoggedInUser && currentLoggedInUser.uid === ADMIN_UID);
            }
        });

        listenersAttached = true;
    }

    // --- Lógica de la aplicación refactorizada en manejadores ---

    async function handleLogin() {
        if (!elements.loginForm) return;
        elements.loginError.classList.add('hidden');
        const email = elements.emailInput.value;
        const password = elements.passwordInput.value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            elements.loginForm.reset();
        } catch (error) {
            console.error("Error de inicio de sesión:", error);
            elements.loginError.textContent = `Error: ${mapAuthError(error.code)}`;
            elements.loginError.classList.remove('hidden');
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

    async function handleAddEpp() {
        if (!eppInventoryCollectionRef) return;
        const name = elements.eppNameInput.value.trim();
        const size = elements.eppSizeInput.value.trim();
        const quantity = parseInt(elements.eppQuantityInput.value);
        const minStock = parseInt(elements.eppMinStockInput.value);

        if (name && !isNaN(quantity) && quantity >= 0 && !isNaN(minStock) && minStock >= 0) {
            try {
                await addDoc(eppInventoryCollectionRef, { name, size, quantity, minStock, createdAt: Timestamp.now() });
                elements.addEppForm.reset();
                showTemporaryMessage("EPP agregado.", "success");
            } catch (error) {
                showTemporaryMessage(`Error: ${error.message}`, "error");
            }
        } else {
            showTemporaryMessage("Datos inválidos.", "error");
        }
    }

    async function handleInventoryAction(button) {
        const action = button.dataset.action;
        const id = button.dataset.id;
        if (!eppInventoryCollectionRef) return;
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
                showConfirmationModal(`¿Eliminar "${itemDoc.data().name}"?`, async () => {
                    await deleteDoc(itemRef);
                    showTemporaryMessage("EPP eliminado.", "success");
                });
            }
        } catch (error) {
            showTemporaryMessage(`Error: ${error.message}`, "error");
        }
    }

    async function handleLoanEpp() {
        if (!eppLoansCollectionRef || !eppInventoryCollectionRef) return;

        const selectedOption = elements.eppToLoanSelect.options[elements.eppToLoanSelect.selectedIndex];
        const eppId = selectedOption.value;
        const eppName = selectedOption.dataset.name;
        const eppSize = selectedOption.dataset.size;
        const currentStock = parseInt(selectedOption.dataset.stock);
        const quantityToLoan = parseInt(elements.loanQuantityInput.value);
        const loanedTo = elements.loanedToInput.value.trim();

        if (!eppId || !loanedTo || isNaN(quantityToLoan) || quantityToLoan <= 0 || quantityToLoan > currentStock) {
            showTemporaryMessage("Datos del préstamo inválidos o stock insuficiente.", "error");
            return;
        }

        const batch = writeBatch(db);
        const eppItemRef = doc(eppInventoryCollectionRef, eppId);
        const newLoanRef = doc(eppLoansCollectionRef);
        batch.set(newLoanRef, { eppId, eppName, eppSize, quantityLoaned: quantityToLoan, loanedTo, loanDate: Timestamp.now(), returned: false, returnedDate: null });
        batch.update(eppItemRef, { quantity: currentStock - quantityToLoan });

        try {
            await batch.commit();
            elements.loanEppForm.reset();
            showTemporaryMessage("Préstamo registrado.", "success");
        } catch (error) {
            showTemporaryMessage(`Error al registrar préstamo: ${error.message}`, "error");
        }
    }

    async function handleReturnLoan(button) {
        const { id, eppid, qty } = button.dataset;
        const quantityReturned = parseInt(qty);
        if (!eppLoansCollectionRef || !eppInventoryCollectionRef) return;

        const batch = writeBatch(db);
        const loanRef = doc(eppLoansCollectionRef, id);
        const eppItemRef = doc(eppInventoryCollectionRef, eppid);

        try {
            const eppItemDoc = await getDoc(eppItemRef);
            if (!eppItemDoc.exists()) throw new Error("EPP no encontrado.");
            const currentEppStock = eppItemDoc.data().quantity;
            batch.update(loanRef, { returned: true, returnedDate: Timestamp.now() });
            batch.update(eppItemRef, { quantity: currentEppStock + quantityReturned });
            await batch.commit();
            showTemporaryMessage("EPP devuelto.", "success");
        } catch (error) {
            showTemporaryMessage(`Error al devolver: ${error.message}`, "error");
        }
    }

    // --- El resto de funciones (sin cambios en la lógica interna) ---

    function setupFirebase() {
        // Actualizar referencias del DOM porque la página se ha cargado/recargado
        updateDOMReferences();

        if (window.updateAuthStatus) {
            window.updateAuthStatus('loading', 'Inicializando conexión...');
        }
        if (ADMIN_UID && ADMIN_UID !== "PEGAR_AQUI_EL_UID_DEL_ADMINISTRADOR") {
            eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
            eppLoansCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_loans`);
        } else {
            elements.errorMessage.textContent = "Error Crítico de Configuración: La constante ADMIN_UID no ha sido establecida en firebase-config.js.";
            elements.errorMessage.classList.remove('hidden');
            elements.loadingIndicator.classList.add('hidden');
            if (window.updateAuthStatus) {
                window.updateAuthStatus('error', 'Error de configuración');
            }
            return;
        }

        onAuthStateChanged(auth, (user) => {
            currentLoggedInUser = user;
            const isAdmin = user && user.uid === ADMIN_UID;
            adjustAdminColumnsVisibility(isAdmin);

            if (user) {
                elements.userIdDisplay.textContent = `Logueado como: ${user.email}`;
                if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Conectado');
                if (elements.authStatus) elements.authStatus.textContent = "Autenticado.";
                if (elements.loginSection) elements.loginSection.classList.add('hidden');
                if (elements.logoutButton) elements.logoutButton.classList.remove('hidden');

                if (isAdmin) {
                    if (elements.addEppFormSection) elements.addEppFormSection.classList.remove('hidden');
                    if (elements.loansSection) elements.loansSection.classList.remove('hidden');
                    loadLoans();
                } else {
                    if (elements.addEppFormSection) elements.addEppFormSection.classList.add('hidden');
                    if (elements.loansSection) elements.loansSection.classList.add('hidden');
                    showTemporaryMessage("Cuenta sin permisos de administrador.", "warning");
                }
            } else {
                if (elements.userIdDisplay) elements.userIdDisplay.textContent = "Visitante";
                if (window.updateAuthStatus) window.updateAuthStatus('error', 'No autenticado');
                if (elements.authStatus) elements.authStatus.textContent = "No autenticado.";
                if (elements.loginSection) elements.loginSection.classList.remove('hidden');
                if (elements.logoutButton) elements.logoutButton.classList.add('hidden');
                if (elements.addEppFormSection) elements.addEppFormSection.classList.add('hidden');
                if (elements.loansSection) elements.loansSection.classList.add('hidden');
            }
            loadInventory();
            if (elements.mainContent) elements.mainContent.classList.remove('hidden');
            if (elements.loadingIndicator) elements.loadingIndicator.classList.add('hidden');
        });

        // Asegurarse de que los listeners estén listos
        setupEventListeners();
    }

    function mapAuthError(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de correo inválido.';
            case 'auth/user-not-found': case 'auth/wrong-password': case 'auth/invalid-credential': return 'Correo o contraseña incorrectos.';
            default: return 'Error al intentar iniciar sesión.';
        }
    }

    function loadInventory() {
        if (!eppInventoryCollectionRef) return;
        elements.loadingIndicator.classList.remove('hidden');
        if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Cargando inventario...');

        onSnapshot(query(eppInventoryCollectionRef), (snapshot) => {
            allEppItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allEppItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            const isAdmin = currentLoggedInUser && currentLoggedInUser.uid === ADMIN_UID;
            displayFilteredInventory(isAdmin);
            if (elements.loadingIndicator) elements.loadingIndicator.classList.add('hidden');
            if (window.updateAuthStatus) window.updateAuthStatus('connected', `${allEppItems.length} elementos cargados`);
        }, (error) => {
            console.error("Error al cargar inventario EPP: ", error);
            if (elements.errorMessage) {
                elements.errorMessage.textContent = `Error al cargar inventario EPP: ${error.message}.`;
                elements.errorMessage.classList.remove('hidden');
            }
            if (elements.loadingIndicator) elements.loadingIndicator.classList.add('hidden');
            if (window.updateAuthStatus) window.updateAuthStatus('error', 'Error de conexión');
        });
    }

    function displayFilteredInventory(isAdminView) {
        if (!elements.eppTableBody) return;
        elements.eppTableBody.innerHTML = '';
        if (isAdminView && elements.eppToLoanSelect) {
            elements.eppToLoanSelect.innerHTML = '<option value="">Seleccione un EPP</option>';
        }

        const searchTerm = elements.searchEppInput ? elements.searchEppInput.value.toLowerCase().trim() : "";
        const filteredItems = searchTerm
            ? allEppItems.filter(item =>
                (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                (item.size && item.size.toLowerCase().includes(searchTerm))
              )
            : [...allEppItems];

        if (filteredItems.length === 0) {
            const message = searchTerm ? "No hay EPP que coincidan con la búsqueda." : "No hay EPP registrados en el sistema.";
            if (window.showEmptyState) {
                window.showEmptyState(elements.eppTableBody, message);
            }
        } else {
            filteredItems.forEach(item => {
                if (window.renderEppItemImproved) {
                    const tr = window.renderEppItemImproved(item, isAdminView);
                    elements.eppTableBody.appendChild(tr);
                }
                if (isAdminView && elements.eppToLoanSelect) {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = `${item.name || 'N/A'} (Talla: ${item.size || 'N/A'}) - Stock: ${item.quantity || 'N/A'}`;
                    option.dataset.stock = item.quantity;
                    option.dataset.name = item.name;
                    option.dataset.size = item.size || 'N/A';
                    elements.eppToLoanSelect.appendChild(option);
                }
            });
        }
    }

    function loadLoans() {
        if (!eppLoansCollectionRef) return;
        onSnapshot(query(eppLoansCollectionRef, where("returned", "==", false)), (snapshot) => {
            if (elements.loansTableBody) elements.loansTableBody.innerHTML = '';
            if (snapshot.empty) {
                if (elements.loansTableBody) elements.loansTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">No hay préstamos activos.</td></tr>`;
                return;
            }
            snapshot.forEach(loanDoc => renderLoanItem(loanDoc.id, loanDoc.data()));
        });
    }

    function renderLoanItem(loanId, loanData) {
        if (!elements.loansTableBody) return;
        const tr = document.createElement('tr');
        tr.className = 'border-b dark:border-gray-700';
        const loanDate = loanData.loanDate ? loanData.loanDate.toDate().toLocaleDateString() : 'N/A';
        tr.innerHTML = `
            <td class="py-3 px-6">${loanData.eppName} (Talla: ${loanData.eppSize || 'N/A'})</td>
            <td class="py-3 px-6 text-center">${loanData.quantityLoaned}</td>
            <td class="py-3 px-6">${loanData.loanedTo}</td>
            <td class="py-3 px-6 text-center">${loanDate}</td>
            <td class="py-3 px-6 text-center font-semibold text-yellow-500">Prestado</td>
            <td class="py-3 px-6 text-center">
                <button data-id="${loanId}" data-eppid="${loanData.eppId}" data-qty="${loanData.quantityLoaned}" data-action="returnLoan" class="px-3 py-1.5 bg-blue-500 text-white rounded-md">Devolver</button>
            </td>
        `;
        elements.loansTableBody.appendChild(tr);
    }

    function showTemporaryMessage(message, type = 'info') {
        if (!elements.messageContainer) return;
        elements.messageContainer.textContent = message;
        elements.messageContainer.className = `p-3 mb-4 text-sm rounded-lg ${ type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`;
        elements.messageContainer.classList.remove('hidden');
        setTimeout(() => { elements.messageContainer.classList.add('hidden'); }, 3000);
    }

    function showConfirmationModal(message, callback) {
        if (!elements.confirmationModal) return;
        elements.confirmationMessage.textContent = message;
        confirmCallback = callback;
        elements.confirmationModal.classList.remove('hidden');
    }

    function adjustAdminColumnsVisibility(isAdminView) {
        document.querySelectorAll('.admin-col').forEach(col => {
            col.style.display = isAdminView ? '' : 'none';
        });
    }

    // --- Inicialización ---
    setupFirebase();
}

// Este es el único punto de entrada que el router necesita.
initializeInventoryPage();