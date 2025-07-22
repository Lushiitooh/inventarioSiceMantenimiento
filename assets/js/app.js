// assets/js/app.js (Refactorizado - con nuevas funcionalidades)

import { db, auth, ADMIN_UID, appIdForPath } from './firebase-config.js';
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    collection, addDoc, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query, where, Timestamp, writeBatch, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("⚙️ Iniciando aplicación de Inventario EPP");

// Referencias globales para las suscripciones
let unsubscribeInventory = null;
let unsubscribeLoans = null;
let unsubscribeAuth = null;
let unsubscribeDeliveries = null; // NUEVO
let confirmCallback = null;
let allEppItems = [];
let allDeliveries = []; // NUEVO

// --- MANEJADORES DE EVENTOS CENTRALIZADOS ---

function handleClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;

    if (button.id === 'logoutButton') handleLogout();
    else if (button.id === 'confirmButton') {
        if (confirmCallback) confirmCallback();
        hideConfirmationModal();
    } else if (button.id === 'cancelButton') hideConfirmationModal();
    else if (button.id === 'closeEditModal') hideEditModal();
    else if (button.id === 'cancelEditEpp') hideEditModal();
    else if (button.id === 'exportHistoryBtn') exportDeliveryHistory(); // NUEVO
    else if (action === 'increase' || action === 'decrease' || action === 'delete') handleInventoryAction(button);
    else if (action === 'edit') handleEditEpp(button); // NUEVO
    else if (action === 'returnLoan') handleReturnLoan(button);
}

function handleSubmit(e) {
    e.preventDefault();
    if (e.target.id === 'loginForm') handleLogin(e.target);
    else if (e.target.id === 'addEppForm') handleAddEpp(e.target);
    else if (e.target.id === 'loanEppForm') handleLoanEpp(e.target);
    else if (e.target.id === 'deliveryEppForm') handleDeliveryEpp(e.target); // NUEVO
    else if (e.target.id === 'editEppForm') handleUpdateEpp(e.target); // NUEVO
}

function handleInput(e) {
    if (e.target.id === 'searchEppInput') {
        const isAdmin = auth.currentUser && auth.currentUser.uid === ADMIN_UID;
        displayFilteredInventory(isAdmin);
    } else if (e.target.id === 'historySearchInput') { // NUEVO
        filterDeliveryHistory();
    } else if (e.target.id === 'eppToDeliverSelect') { // NUEVO
        updateDeliveryQuantityLimits();
    }
}

// --- FUNCIÓN DE LIMPIEZA ---
function cleanup() {
    console.log("🧹 Limpiando listeners y suscripciones de la aplicación.");
    document.removeEventListener('click', handleClick);
    document.removeEventListener('submit', handleSubmit);
    document.removeEventListener('input', handleInput);

    if (unsubscribeInventory) unsubscribeInventory();
    if (unsubscribeLoans) unsubscribeLoans();
    if (unsubscribeAuth) unsubscribeAuth();
    if (unsubscribeDeliveries) unsubscribeDeliveries(); // NUEVO
}

// --- REGISTRO DE LISTENERS ---
document.addEventListener('click', handleClick);
document.addEventListener('submit', handleSubmit);
document.addEventListener('input', handleInput);

// Limpiar al cerrar la página
window.addEventListener('beforeunload', cleanup);

// --- LÓGICA DE LA APLICACIÓN ---

function setupFirebase() {
    const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
    const eppLoansCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_loans`);
    const eppDeliveriesCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_deliveries`); // NUEVO

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        const isAdmin = user && user.uid === ADMIN_UID;
        updateUIVisibility(user, isAdmin);
        loadInventory(eppInventoryCollectionRef, isAdmin);
        if (isAdmin) {
            loadLoans(eppLoansCollectionRef);
            loadDeliveries(eppDeliveriesCollectionRef); // NUEVO
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
    const deliverySection = document.getElementById('deliveryEppSection'); // NUEVO
    const userIdDisplay = document.getElementById('userIdDisplay');
    const authStatus = document.getElementById('authStatus');

    if (user) {
        if (userIdDisplay) userIdDisplay.textContent = `Logueado como: ${user.email}`;
        if (authStatus) authStatus.textContent = "Autenticado.";
        if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Conectado');
        if (loginSection) loginSection.classList.add('hidden');
        if (logoutButton) logoutButton.classList.remove('hidden');
        if (addEppFormSection) addEppFormSection.classList.toggle('hidden', !isAdmin);
        if (loansSection) loansSection.classList.toggle('hidden', !isAdmin);
        if (deliverySection) deliverySection.classList.toggle('hidden', !isAdmin); // NUEVO
    } else {
        if (userIdDisplay) userIdDisplay.textContent = "Visitante";
        if (authStatus) authStatus.textContent = "No autenticado.";
        if (window.updateAuthStatus) window.updateAuthStatus('error', 'No autenticado');
        if (loginSection) loginSection.classList.remove('hidden');
        if (logoutButton) logoutButton.classList.add('hidden');
        if (addEppFormSection) addEppFormSection.classList.add('hidden');
        if (loansSection) loansSection.classList.add('hidden');
        if (deliverySection) deliverySection.classList.add('hidden'); // NUEVO
    }
    
    adjustAdminColumnsVisibility(isAdmin);
    if (mainContent) mainContent.classList.remove('hidden');
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
}

function loadInventory(eppInventoryCollectionRef, isAdmin) {
    if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Cargando inventario...');
    
    unsubscribeInventory = onSnapshot(query(eppInventoryCollectionRef), (snapshot) => {
        allEppItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allEppItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        displayFilteredInventory(isAdmin);
        updateDeliverySelect(); // NUEVO
        if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Inventario cargado');
    }, (error) => {
        console.error("Error al cargar inventario EPP: ", error);
        showTemporaryMessage(`Error al cargar inventario: ${error.message}`, "error");
        if (window.updateAuthStatus) window.updateAuthStatus('error', 'Error al cargar');
    });
}

// NUEVA FUNCIÓN: Cargar entregas
function loadDeliveries(eppDeliveriesCollectionRef) {
    if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Cargando entregas...');
    
    unsubscribeDeliveries = onSnapshot(
        query(eppDeliveriesCollectionRef, orderBy('deliveryDate', 'desc')), 
        (snapshot) => {
            allDeliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            displayDeliveries();
            if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Entregas cargadas');
        }, 
        (error) => {
            console.error("Error al cargar entregas:", error);
            showTemporaryMessage(`Error al cargar entregas: ${error.message}`, "error");
        }
    );
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

// NUEVA FUNCIÓN: Actualizar select de entregas
function updateDeliverySelect() {
    const eppToDeliverSelect = document.getElementById('eppToDeliverSelect');
    if (!eppToDeliverSelect) return;

    eppToDeliverSelect.innerHTML = '<option value="">Seleccione un EPP</option>';
    
    allEppItems.forEach(item => {
        if (item.quantity > 0) {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name || 'N/A'}${item.size ? ` (${item.size})` : ''} - Stock: ${item.quantity}`;
            option.dataset.stock = item.quantity || 0;
            option.dataset.name = item.name;
            option.dataset.size = item.size || '';
            
            // Agregar clase CSS según el stock
            if (item.quantity <= item.minStock) {
                option.className = 'epp-option-low-stock';
            } else if (item.quantity <= item.minStock + 5) {
                option.className = 'epp-option-warning-stock';
            } else {
                option.className = 'epp-option-ok-stock';
            }
            
            eppToDeliverSelect.appendChild(option);
        }
    });
}

// NUEVA FUNCIÓN: Mostrar entregas
function displayDeliveries() {
    const deliveryTableBody = document.getElementById('deliveryHistoryTableBody');
    if (!deliveryTableBody) return;

    deliveryTableBody.innerHTML = '';

    if (allDeliveries.length === 0) {
        deliveryTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state-delivery">
                    <div class="empty-state-delivery-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay entregas registradas</h3>
                    <p class="text-gray-500 dark:text-gray-400">Las entregas aparecerán aquí cuando se registren</p>
                </td>
            </tr>
        `;
        return;
    }

    allDeliveries.forEach(delivery => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors';
        
        const deliveryDate = delivery.deliveryDate?.toDate()?.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) || 'Fecha no disponible';
        
        tr.innerHTML = `
            <td class="py-4 px-6 text-sm text-gray-900 dark:text-white">${deliveryDate}</td>
            <td class="py-4 px-6">
                <div class="font-medium text-gray-900 dark:text-white">
                    ${delivery.eppName || 'N/A'}${delivery.eppSize ? ` (${delivery.eppSize})` : ''}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">EPP de seguridad</div>
            </td>
            <td class="py-4 px-6 text-center">
                <span class="delivery-badge">${delivery.quantity || 0}</span>
            </td>
            <td class="py-4 px-6 text-gray-900 dark:text-white">${delivery.personName || 'N/A'}</td>
        `;
        
        deliveryTableBody.appendChild(tr);
    });
}

// NUEVA FUNCIÓN: Filtrar entregas
function filterDeliveryHistory() {
    const searchInput = document.getElementById('historySearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const deliveryTableBody = document.getElementById('deliveryHistoryTableBody');
    if (!deliveryTableBody) return;

    deliveryTableBody.innerHTML = '';

    let filteredDeliveries = [...allDeliveries];
    
    if (searchTerm) {
        filteredDeliveries = allDeliveries.filter(delivery => 
            (delivery.personName && delivery.personName.toLowerCase().includes(searchTerm)) ||
            (delivery.eppName && delivery.eppName.toLowerCase().includes(searchTerm))
        );
    }

    if (filteredDeliveries.length === 0) {
        const message = searchTerm ? 
            `No se encontraron entregas que coincidan con "${searchTerm}"` : 
            'No hay entregas registradas';
            
        deliveryTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state-delivery">
                    <div class="empty-state-delivery-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">${message}</p>
                </td>
            </tr>
        `;
        return;
    }

    filteredDeliveries.forEach(delivery => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors';
        
        const deliveryDate = delivery.deliveryDate?.toDate()?.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) || 'Fecha no disponible';
        
        tr.innerHTML = `
            <td class="py-4 px-6 text-sm text-gray-900 dark:text-white">${deliveryDate}</td>
            <td class="py-4 px-6">
                <div class="font-medium text-gray-900 dark:text-white">
                    ${delivery.eppName || 'N/A'}${delivery.eppSize ? ` (${delivery.eppSize})` : ''}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">EPP de seguridad</div>
            </td>
            <td class="py-4 px-6 text-center">
                <span class="delivery-badge">${delivery.quantity || 0}</span>
            </td>
            <td class="py-4 px-6 text-gray-900 dark:text-white">${delivery.personName || 'N/A'}</td>
        `;
        
        deliveryTableBody.appendChild(tr);
    });
}

async function handleLogin(form) {
    const email = form.querySelector('#email').value;
    const password = form.querySelector('#password').value;
    const loginError = form.querySelector('#loginError');
    
    loginError.classList.add('hidden');
    if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Autenticando...');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        form.reset();
        showTemporaryMessage("Inicio de sesión exitoso", "success");
    } catch (error) {
        console.error("Error de inicio de sesión:", error);
        loginError.textContent = `Error: ${mapAuthError(error.code)}`;
        loginError.classList.remove('hidden');
        if (window.updateAuthStatus) window.updateAuthStatus('error', 'Error de autenticación');
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        showTemporaryMessage("Sesión cerrada correctamente", "success");
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
            await addDoc(eppInventoryCollectionRef, { 
                name, 
                size: size || '', 
                quantity, 
                minStock, 
                createdAt: Timestamp.now() 
            });
            form.reset();
            showTemporaryMessage("EPP agregado con éxito.", "success");
        } catch (error) {
            console.error("Error al agregar EPP:", error);
            showTemporaryMessage(`Error al agregar EPP: ${error.message}`, "error");
        }
    } else {
        showTemporaryMessage("Datos inválidos. Por favor, complete todos los campos requeridos.", "error");
    }
}

// NUEVA FUNCIÓN: Manejar entrega de EPP
async function handleDeliveryEpp(form) {
    const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
    const eppDeliveriesCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_deliveries`);
    
    const eppId = form.querySelector('#eppToDeliverSelect').value;
    const quantity = parseInt(form.querySelector('#deliveryQuantity').value);
    const personName = form.querySelector('#deliveryPersonName').value.trim();

    if (!eppId || !quantity || quantity <= 0 || !personName) {
        showTemporaryMessage("Por favor, complete todos los campos de la entrega.", "error");
        return;
    }

    try {
        const eppRef = doc(eppInventoryCollectionRef, eppId);
        const eppDoc = await getDoc(eppRef);
        
        if (!eppDoc.exists()) {
            showTemporaryMessage("El EPP seleccionado no existe.", "error");
            return;
        }

        const eppData = eppDoc.data();
        if (eppData.quantity < quantity) {
            showTemporaryMessage(`Stock insuficiente. Disponible: ${eppData.quantity}`, "error");
            return;
        }

        // Crear la entrega y actualizar el inventario en una transacción
        const batch = writeBatch(db);
        
        // Agregar entrega al histórico
        const deliveryRef = doc(eppDeliveriesCollectionRef);
        batch.set(deliveryRef, {
            eppId,
            eppName: eppData.name,
            eppSize: eppData.size || '',
            quantity,
            personName,
            deliveryDate: Timestamp.now(),
            deliveredBy: auth.currentUser.email
        });

        // Actualizar inventario
        batch.update(eppRef, {
            quantity: eppData.quantity - quantity
        });

        await batch.commit();
        form.reset();
        showTemporaryMessage(`EPP entregado a ${personName} correctamente.`, "success");
        
    } catch (error) {
        console.error("Error al registrar entrega:", error);
        showTemporaryMessage(`Error al registrar entrega: ${error.message}`, "error");
    }
}

async function handleLoanEpp(form) {
    const eppLoansCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_loans`);
    const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
    
    const eppId = form.querySelector('#eppToLoanSelect').value;
    const quantity = parseInt(form.querySelector('#loanQuantity').value);
    const loanedTo = form.querySelector('#loanedTo').value.trim();

    if (!eppId || !quantity || quantity <= 0 || !loanedTo) {
        showTemporaryMessage("Por favor, complete todos los campos del préstamo.", "error");
        return;
    }

    try {
        const eppRef = doc(eppInventoryCollectionRef, eppId);
        const eppDoc = await getDoc(eppRef);
        
        if (!eppDoc.exists()) {
            showTemporaryMessage("El EPP seleccionado no existe.", "error");
            return;
        }

        const eppData = eppDoc.data();
        if (eppData.quantity < quantity) {
            showTemporaryMessage(`Stock insuficiente. Disponible: ${eppData.quantity}`, "error");
            return;
        }

        // Crear el préstamo y actualizar el inventario en una transacción
        const batch = writeBatch(db);
        
        // Agregar préstamo
        const loanRef = doc(eppLoansCollectionRef);
        batch.set(loanRef, {
            eppId,
            eppName: eppData.name,
            eppSize: eppData.size || '',
            quantity,
            loanedTo,
            loanDate: Timestamp.now(),
            status: 'active'
        });

        // Actualizar inventario
        batch.update(eppRef, {
            quantity: eppData.quantity - quantity
        });

        await batch.commit();
        form.reset();
        showTemporaryMessage("Préstamo registrado con éxito.", "success");
        
    } catch (error) {
        console.error("Error al registrar préstamo:", error);
        showTemporaryMessage(`Error al registrar préstamo: ${error.message}`, "error");
    }
}

// NUEVA FUNCIÓN: Abrir modal de edición
function handleEditEpp(button) {
    const eppId = button.dataset.id;
    const item = allEppItems.find(epp => epp.id === eppId);
    
    if (!item) {
        showTemporaryMessage("EPP no encontrado.", "error");
        return;
    }

    // Llenar el formulario de edición
    document.getElementById('editEppId').value = eppId;
    document.getElementById('editEppName').value = item.name || '';
    document.getElementById('editEppSize').value = item.size || '';
    document.getElementById('editEppQuantity').value = item.quantity || 0;
    document.getElementById('editEppMinStock').value = item.minStock || 0;

    // Mostrar modal
    showEditModal();
}

// NUEVA FUNCIÓN: Actualizar EPP
async function handleUpdateEpp(form) {
    const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
    
    const eppId = form.querySelector('#editEppId').value;
    const name = form.querySelector('#editEppName').value.trim();
    const size = form.querySelector('#editEppSize').value.trim();
    const quantity = parseInt(form.querySelector('#editEppQuantity').value);
    const minStock = parseInt(form.querySelector('#editEppMinStock').value);

    if (!name || isNaN(quantity) || quantity < 0 || isNaN(minStock) || minStock < 0) {
        showTemporaryMessage("Por favor, complete todos los campos correctamente.", "error");
        return;
    }

    try {
        const eppRef = doc(eppInventoryCollectionRef, eppId);
        await updateDoc(eppRef, {
            name,
            size: size || '',
            quantity,
            minStock,
            updatedAt: Timestamp.now()
        });
        
        hideEditModal();
        showTemporaryMessage(`EPP "${name}" actualizado correctamente.`, "success");
    } catch (error) {
        console.error("Error al actualizar EPP:", error);
        showTemporaryMessage(`Error al actualizar EPP: ${error.message}`, "error");
    }
}

async function handleInventoryAction(button) {
    const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
    const { action, id } = button.dataset;
    const itemRef = doc(eppInventoryCollectionRef, id);

    try {
        const itemDoc = await getDoc(itemRef);
        if (!itemDoc.exists()) {
            showTemporaryMessage("El EPP no existe.", "error");
            return;
        }
        
        const currentQuantity = itemDoc.data().quantity || 0;
        const itemName = itemDoc.data().name || 'EPP';

        if (action === 'increase') {
            await updateDoc(itemRef, { quantity: currentQuantity + 1 });
            showTemporaryMessage(`Cantidad de ${itemName} aumentada.`, "success");
        } else if (action === 'decrease') {
            if (currentQuantity > 0) {
                await updateDoc(itemRef, { quantity: currentQuantity - 1 });
                showTemporaryMessage(`Cantidad de ${itemName} reducida.`, "success");
            } else {
                showTemporaryMessage("No se puede reducir: cantidad ya es 0.", "warning");
            }
        } else if (action === 'delete') {
            showConfirmationModal(
                `¿Estás seguro de que quieres eliminar "${itemName}"? Esta acción no se puede deshacer.`, 
                async () => {
                    try {
                        await deleteDoc(itemRef);
                        showTemporaryMessage("EPP eliminado correctamente.", "success");
                    } catch (error) {
                        showTemporaryMessage(`Error al eliminar: ${error.message}`, "error");
                    }
                }
            );
        }
    } catch (error) {
        console.error("Error al actualizar el EPP:", error);
        showTemporaryMessage(`Error al actualizar el EPP: ${error.message}`, "error");
    }
}

async function handleReturnLoan(button) {
    const eppLoansCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_loans`);
    const eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
    
    const loanId = button.dataset.loanId;
    
    try {
        const loanRef = doc(eppLoansCollectionRef, loanId);
        const loanDoc = await getDoc(loanRef);
        
        if (!loanDoc.exists()) {
            showTemporaryMessage("El préstamo no existe.", "error");
            return;
        }

        const loanData = loanDoc.data();
        const eppRef = doc(eppInventoryCollectionRef, loanData.eppId);
        const eppDoc = await getDoc(eppRef);

        if (eppDoc.exists()) {
            const currentQuantity = eppDoc.data().quantity || 0;
            
            // Actualizar inventario y eliminar préstamo
            const batch = writeBatch(db);
            batch.update(eppRef, { quantity: currentQuantity + loanData.quantity });
            batch.delete(loanRef);
            
            await batch.commit();
            showTemporaryMessage("Préstamo devuelto correctamente.", "success");
        } else {
            showTemporaryMessage("Error: El EPP asociado no existe en el inventario.", "error");
        }
    } catch (error) {
        console.error("Error al devolver préstamo:", error);
        showTemporaryMessage(`Error al devolver préstamo: ${error.message}`, "error");
    }
}

function loadLoans(eppLoansCollectionRef) {
    const loansTableBody = document.getElementById('loansTableBody');
    if (!loansTableBody) return;

    unsubscribeLoans = onSnapshot(
        query(eppLoansCollectionRef, where('status', '==', 'active')), 
        (snapshot) => {
            loansTableBody.innerHTML = '';
            
            if (snapshot.empty) {
                loansTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4 text-gray-500">No hay préstamos activos</td>
                    </tr>
                `;
                return;
            }

            snapshot.docs.forEach(doc => {
                const loan = { id: doc.id, ...doc.data() };
                const tr = renderLoanItem(loan);
                loansTableBody.appendChild(tr);
            });
        }, 
        (error) => {
            console.error("Error al cargar préstamos:", error);
            loansTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-red-500">Error al cargar préstamos</td>
                </tr>
            `;
        }
    );
}

function renderLoanItem(loan) {
    const tr = document.createElement('tr');
    tr.className = 'bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
    
    const loanDate = loan.loanDate?.toDate()?.toLocaleDateString() || 'Fecha no disponible';
    
    tr.innerHTML = `
        <td class="py-4 px-6 font-medium text-gray-900 dark:text-white">
            ${loan.eppName || 'N/A'}${loan.eppSize ? ` (${loan.eppSize})` : ''}
        </td>
        <td class="py-4 px-6 text-center">${loan.quantity || 0}</td>
        <td class="py-4 px-6">${loan.loanedTo || 'N/A'}</td>
        <td class="py-4 px-6 text-center">${loanDate}</td>
        <td class="py-4 px-6 text-center">
            <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">
                Activo
            </span>
        </td>
        <td class="py-4 px-6 text-center">
            <button data-loan-id="${loan.id}" data-action="returnLoan" 
                    class="text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-sm px-3 py-2 transition-colors">
                Devolver
            </button>
        </td>
    `;
    
    return tr;
}

// NUEVAS FUNCIONES: Modal de edición
function showEditModal() {
    const modal = document.getElementById('editEppModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Agregar clase para animación
        const modalContent = modal.querySelector('.slide-in-modal');
        if (modalContent) {
            modalContent.classList.add('slide-in-modal');
        }
    }
}

function hideEditModal() {
    const modal = document.getElementById('editEppModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// NUEVA FUNCIÓN: Actualizar límites de cantidad en entregas
function updateDeliveryQuantityLimits() {
    const eppSelect = document.getElementById('eppToDeliverSelect');
    const quantityInput = document.getElementById('deliveryQuantity');
    
    if (!eppSelect || !quantityInput) return;
    
    const selectedOption = eppSelect.options[eppSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.stock) {
        const maxStock = parseInt(selectedOption.dataset.stock);
        quantityInput.max = maxStock;
        quantityInput.placeholder = `Máximo: ${maxStock}`;
        
        // Si la cantidad actual excede el máximo, ajustarla
        if (parseInt(quantityInput.value) > maxStock) {
            quantityInput.value = maxStock;
        }
    }
}

// NUEVA FUNCIÓN: Exportar histórico
function exportDeliveryHistory() {
    if (allDeliveries.length === 0) {
        showTemporaryMessage("No hay entregas para exportar.", "warning");
        return;
    }

    try {
        const csvHeaders = ['Fecha', 'EPP', 'Talla', 'Cantidad', 'Entregado a', 'Entregado por'];
        const csvRows = allDeliveries.map(delivery => {
            const date = delivery.deliveryDate?.toDate()?.toLocaleDateString('es-ES') || '';
            return [
                date,
                delivery.eppName || '',
                delivery.eppSize || '',
                delivery.quantity || 0,
                delivery.personName || '',
                delivery.deliveredBy || ''
            ];
        });

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `historico_entregas_epp_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        showTemporaryMessage("Histórico exportado correctamente.", "success");
    } catch (error) {
        console.error("Error al exportar:", error);
        showTemporaryMessage("Error al exportar el histórico.", "error");
    }
}

function mapAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email': return 'El formato del correo electrónico es inválido.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Correo o contraseña incorrectos.';
        case 'auth/too-many-requests': return 'Demasiados intentos fallidos. Intente más tarde.';
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
    confirmCallback = null;
}

function adjustAdminColumnsVisibility(isAdminView) {
    document.querySelectorAll('.admin-col').forEach(col => {
        col.style.display = isAdminView ? '' : 'none';
    });
}

// --- INICIO DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("📱 Aplicación de inventario EPP iniciada");
    setupFirebase();
    
    // Event listeners adicionales para el modal de edición
    const closeModalBtn = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEditEpp');
    const editModal = document.getElementById('editEppModal');
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', hideEditModal);
    
    // Cerrar modal al hacer click fuera de él
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                hideEditModal();
            }
        });
    }
    
    // Event listener para exportar
    const exportBtn = document.getElementById('exportHistoryBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportDeliveryHistory);
    }
});

// Exportar funciones para uso global si es necesario
window.InventarioApp = {
    cleanup,
    showTemporaryMessage,
    showConfirmationModal,
    hideConfirmationModal,
    showEditModal,
    hideEditModal,
    exportDeliveryHistory
};