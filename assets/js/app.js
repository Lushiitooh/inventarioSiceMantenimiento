// assets/js/app.js (VERSIÓN FINAL Y MODULARIZADA)

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

/**
 * @description
 * Toda la lógica de la página de inventario está contenida en esta función.
 * El router llamará a esta función solo cuando la página de inventario
 * necesite ser mostrada.
 */
function initializeInventoryPage() {
    console.log("⚙️ Activando la lógica de la página de Inventario...");

    // ========================================================
    // INICIO DE TU CÓDIGO ORIGINAL (SIN CAMBIOS EN LA LÓGICA)
    // ========================================================

    let currentLoggedInUser = null;
    let eppInventoryCollectionRef;
    let eppLoansCollectionRef; 
    let allEppItems = [];

    // --- Búsqueda de elementos del DOM ---
    // Al estar dentro de esta función, estas búsquedas se realizan cada vez
    // que la página de inventario se carga, asegurando que siempre
    // encuentren los elementos correctos del HTML recién insertado.
    const loginSection = document.getElementById('loginSection');
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const logoutButton = document.getElementById('logoutButton');
    const userIdDisplay = document.getElementById('userIdDisplay');
    const authStatus = document.getElementById('authStatus');
    const loginError = document.getElementById('loginError');
    const addEppFormSection = document.getElementById('addEppFormSection');
    const addEppForm = document.getElementById('addEppForm');
    const eppNameInput = document.getElementById('eppName');
    const eppSizeInput = document.getElementById('eppSize'); 
    const eppQuantityInput = document.getElementById('eppQuantity');
    const eppMinStockInput = document.getElementById('eppMinStock');
    const eppTableBody = document.getElementById('eppTableBody');
    const searchEppInput = document.getElementById('searchEppInput');
    const loansSection = document.getElementById('loansSection');
    const loanEppForm = document.getElementById('loanEppForm');
    const eppToLoanSelect = document.getElementById('eppToLoanSelect');
    const loanQuantityInput = document.getElementById('loanQuantity');
    const loanedToInput = document.getElementById('loanedTo');
    const loansTableBody = document.getElementById('loansTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const mainContent = document.getElementById('mainContent');
    const errorMessage = document.getElementById('errorMessage');
    const messageContainer = document.getElementById('messageContainer');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const confirmButton = document.getElementById('confirmButton');
    const cancelButton = document.getElementById('cancelButton');
    let confirmCallback = null;
    
    // --- Autenticación y Setup de Firestore ---
    function setupFirebase() {
        if (window.updateAuthStatus) {
            window.updateAuthStatus('loading', 'Inicializando conexión...');
        }
        if (ADMIN_UID && ADMIN_UID !== "PEGAR_AQUI_EL_UID_DEL_ADMINISTRADOR") {
            eppInventoryCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_inventory`);
            eppLoansCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_loans`);
        } else {
            errorMessage.textContent = "Error Crítico de Configuración: La constante ADMIN_UID no ha sido establecida en firebase-config.js. Por favor, edita el archivo y define tu User ID de Firebase. La aplicación no funcionará correctamente.";
            errorMessage.classList.remove('hidden');
            loadingIndicator.classList.add('hidden');
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
                userIdDisplay.textContent = `Logueado como: ${user.email}`;
                if (window.updateAuthStatus) {
                    window.updateAuthStatus('connected', 'Conectado');
                }
                if(authStatus) authStatus.textContent = "Autenticado.";
                if(loginSection) loginSection.classList.add('hidden');
                if(logoutButton) logoutButton.classList.remove('hidden');
                
                if (isAdmin) {
                    if(addEppFormSection) addEppFormSection.classList.remove('hidden');
                    if(loansSection) loansSection.classList.remove('hidden'); 
                    loadLoans(); 
                } else {
                    if(addEppFormSection) addEppFormSection.classList.add('hidden');
                    if(loansSection) loansSection.classList.add('hidden'); 
                    showTemporaryMessage("Cuenta sin permisos de administrador.", "warning");
                }
            } else {
                if(userIdDisplay) userIdDisplay.textContent = "Visitante";
                if (window.updateAuthStatus) {
                    window.updateAuthStatus('error', 'No autenticado');
                }
                if(authStatus) authStatus.textContent = "No autenticado.";
                if(loginSection) loginSection.classList.remove('hidden');
                if(logoutButton) logoutButton.classList.add('hidden');
                if(addEppFormSection) addEppFormSection.classList.add('hidden');
                if(loansSection) loansSection.classList.add('hidden'); 
            }
            loadInventory();
            if(mainContent) mainContent.classList.remove('hidden');
            if(loadingIndicator) loadingIndicator.classList.add('hidden');
        });

        if (searchEppInput) {
            searchEppInput.addEventListener('input', () => {
                displayFilteredInventory(currentLoggedInUser && currentLoggedInUser.uid === ADMIN_UID);
            });
        }
    }

    // --- Manejo de Login/Logout ---
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.classList.add('hidden');
            const email = emailInput.value;
            const password = passwordInput.value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
                loginForm.reset();
            } catch (error) {
                console.error("Error de inicio de sesión:", error);
                loginError.textContent = `Error: ${mapAuthError(error.code)}`;
                loginError.classList.remove('hidden');
            }
        });
    }

    if(logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try { await signOut(auth); } catch (error) {
                console.error("Error al cerrar sesión:", error);
                showTemporaryMessage(`Error al cerrar sesión: ${error.message}`, "error");
            }
        });
    }

    function mapAuthError(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de correo inválido.';
            case 'auth/user-not-found': case 'auth/wrong-password': case 'auth/invalid-credential': return 'Correo o contraseña incorrectos.';
            default: return 'Error al intentar iniciar sesión.';
        }
    }

    // --- Lógica del Inventario EPP ---
    function loadInventory() {
        if (!eppInventoryCollectionRef) return;
        loadingIndicator.classList.remove('hidden');
        if (window.updateAuthStatus) {
            window.updateAuthStatus('loading', 'Cargando inventario...');
        }
        
        onSnapshot(query(eppInventoryCollectionRef), (snapshot) => {
            allEppItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allEppItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
            const isAdmin = currentLoggedInUser && currentLoggedInUser.uid === ADMIN_UID;
            displayFilteredInventory(isAdmin);
            if(loadingIndicator) loadingIndicator.classList.add('hidden');
            if (window.updateAuthStatus) {
                window.updateAuthStatus('connected', `${allEppItems.length} elementos cargados`);
            }
        }, (error) => {
            console.error("Error al cargar inventario EPP: ", error);
            if(errorMessage) {
                errorMessage.textContent = `Error al cargar inventario EPP: ${error.message}.`;
                errorMessage.classList.remove('hidden');
            }
            if(loadingIndicator) loadingIndicator.classList.add('hidden');
            if (window.updateAuthStatus) {
                window.updateAuthStatus('error', 'Error de conexión');
            }
        });
    }

    function displayFilteredInventory(isAdminView) {
        if(eppTableBody) eppTableBody.innerHTML = ''; 
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
            if (window.showEmptyState) {
                window.showEmptyState(eppTableBody, message);
            }
        } else {
            filteredItems.forEach(item => {
                if (window.renderEppItemImproved) {
                    const tr = window.renderEppItemImproved(item, isAdminView);
                    if(eppTableBody) eppTableBody.appendChild(tr);
                }
                if (isAdminView && eppToLoanSelect) { 
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = `${item.name || 'N/A'} (Talla: ${item.size || 'N/A'}) - Stock: ${item.quantity || 'N/A'}`;
                    option.dataset.stock = item.quantity; 
                    option.dataset.name = item.name;
                    option.dataset.size = item.size || 'N/A';
                    eppToLoanSelect.appendChild(option);
                }
            });
        }
    }

    if(addEppForm) {
        addEppForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!eppInventoryCollectionRef) return;
            const name = eppNameInput.value.trim();
            const size = eppSizeInput.value.trim(); 
            const quantity = parseInt(eppQuantityInput.value);
            const minStock = parseInt(eppMinStockInput.value);

            if (name && !isNaN(quantity) && quantity >= 0 && !isNaN(minStock) && minStock >= 0) {
                try {
                    await addDoc(eppInventoryCollectionRef, { name, size, quantity, minStock, createdAt: Timestamp.now() });
                    addEppForm.reset();
                    showTemporaryMessage("EPP agregado.", "success");
                } catch (error) {
                    showTemporaryMessage(`Error: ${error.message}`, "error");
                }
            } else {
                showTemporaryMessage("Datos inválidos.", "error");
            }
        });
    }
    
    if(eppTableBody) {
        eppTableBody.addEventListener('click', async (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.closest('button').dataset.id) {
                const button = e.target.closest('button');
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
        });
    }
    
    // --- Lógica de Préstamos ---
    if(loanEppForm) {
        loanEppForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!eppLoansCollectionRef || !eppInventoryCollectionRef) return;

            const selectedOption = eppToLoanSelect.options[eppToLoanSelect.selectedIndex];
            const eppId = selectedOption.value;
            const eppName = selectedOption.dataset.name;
            const eppSize = selectedOption.dataset.size;
            const currentStock = parseInt(selectedOption.dataset.stock);
            const quantityToLoan = parseInt(loanQuantityInput.value);
            const loanedTo = loanedToInput.value.trim();

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
                loanEppForm.reset();
                showTemporaryMessage("Préstamo registrado.", "success");
            } catch (error) {
                showTemporaryMessage(`Error al registrar préstamo: ${error.message}`, "error");
            }
        });
    }

    function loadLoans() {
        if (!eppLoansCollectionRef) return;
        onSnapshot(query(eppLoansCollectionRef, where("returned", "==", false)), (snapshot) => {
            if(loansTableBody) loansTableBody.innerHTML = '';
            if (snapshot.empty) {
                if(loansTableBody) loansTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4">No hay préstamos activos.</td></tr>`;
                return;
            }
            snapshot.forEach(loanDoc => renderLoanItem(loanDoc.id, loanDoc.data()));
        });
    }

    function renderLoanItem(loanId, loanData) {
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
        if(loansTableBody) loansTableBody.appendChild(tr);
    }
    
    if(loansTableBody) {
        loansTableBody.addEventListener('click', async (e) => {
            if (e.target.dataset.action === 'returnLoan') {
                const { id, eppid, qty } = e.target.dataset;
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
        });
    }

    // --- Utilidades ---
    function showTemporaryMessage(message, type = 'info') {
        if(!messageContainer) return;
        messageContainer.textContent = message;
        messageContainer.className = `p-3 mb-4 text-sm rounded-lg ${ type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`;
        messageContainer.classList.remove('hidden');
        setTimeout(() => { messageContainer.classList.add('hidden'); }, 3000);
    }

    function showConfirmationModal(message, callback) {
        if(!confirmationModal) return;
        confirmationMessage.textContent = message;
        confirmCallback = callback;
        confirmationModal.classList.remove('hidden');
    }
    
    if(confirmButton) {
        confirmButton.addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            confirmationModal.classList.add('hidden');
        });
    }
    
    if(cancelButton) {
        cancelButton.addEventListener('click', () => {
            confirmationModal.classList.add('hidden');
        });
    }

    function adjustAdminColumnsVisibility(isAdminView) {
        document.querySelectorAll('.admin-col').forEach(col => {
            col.style.display = isAdminView ? '' : 'none'; 
        });
    }

    // ========================================================
    // FIN DE TU CÓDIGO ORIGINAL
    // ========================================================

    // Llamada final para iniciar todo en esta página específica.
    setupFirebase();
}

/**
 * @description
 * Esta es la parte que conecta este archivo con el router.
 * Le dice: "Soy la página de inventario, mi ruta es '/index.html'. Cuando
 * necesites mostrarme, ejecuta 'initializeInventoryPage'".
 */

// CAMBIO: Ahora registramos la lógica del inventario con su nueva página.
window.registerPageInitializer('/inventario-luis.html', initializeInventoryPage);