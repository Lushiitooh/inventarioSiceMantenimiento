// assets/js/core/epp-manager.js
// LÓGICA CENTRAL COMPARTIDA PARA TODAS LAS INSTANCIAS DE EPP

import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    collection, addDoc, doc, getDoc, updateDoc, deleteDoc, onSnapshot, query, where, Timestamp, writeBatch, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export class EPPManager {
    constructor(config) {
        this.config = config;
        this.db = config.db;
        this.auth = config.auth;
        this.ADMIN_UID = config.ADMIN_UID;
        this.appIdForPath = config.appIdForPath;
        
        // Referencias globales para las suscripciones
        this.unsubscribeInventory = null;
        this.unsubscribeLoans = null;
        this.unsubscribeAuth = null;
        this.unsubscribeDeliveries = null;
        this.confirmCallback = null;
        this.allEppItems = [];
        this.allDeliveries = [];
        
        // Inicializar event listeners
        this.initializeEventListeners();
    }

    // === INICIALIZACIÓN ===
    initializeEventListeners() {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('submit', this.handleSubmit.bind(this));
        document.addEventListener('input', this.handleInput.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }

    setupFirebase() {
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
        const eppLoansCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_loans`);
        const eppDeliveriesCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_deliveries`);

        this.unsubscribeAuth = onAuthStateChanged(this.auth, (user) => {
            const isAdmin = user && user.uid === this.ADMIN_UID;
            this.updateUIVisibility(user, isAdmin);
            this.loadInventory(eppInventoryCollectionRef, isAdmin);
            if (isAdmin) {
                this.loadLoans(eppLoansCollectionRef);
                this.loadDeliveries(eppDeliveriesCollectionRef);
            }
        });
    }

    // === MANEJADORES DE EVENTOS ===
    handleClick(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;

        if (button.id === 'logoutButton') this.handleLogout();
        else if (button.id === 'confirmButton') {
            if (this.confirmCallback) this.confirmCallback();
            this.hideConfirmationModal();
        } else if (button.id === 'cancelButton') this.hideConfirmationModal();
        else if (button.id === 'closeEditModal') this.hideEditModal();
        else if (button.id === 'cancelEditEpp') this.hideEditModal();
        else if (button.id === 'exportHistoryBtn') this.exportDeliveryHistory();
        else if (action === 'increase' || action === 'decrease' || action === 'delete') this.handleInventoryAction(button);
        else if (action === 'edit') this.handleEditEpp(button);
        else if (action === 'returnLoan') this.handleReturnLoan(button);
    }

    handleSubmit(e) {
        e.preventDefault();
        if (e.target.id === 'loginForm') this.handleLogin(e.target);
        else if (e.target.id === 'addEppForm') this.handleAddEpp(e.target);
        else if (e.target.id === 'loanEppForm') this.handleLoanEpp(e.target);
        else if (e.target.id === 'deliveryEppForm') this.handleDeliveryEpp(e.target);
        else if (e.target.id === 'editEppForm') this.handleUpdateEpp(e.target);
    }

    handleInput(e) {
        if (e.target.id === 'searchEppInput') {
            const isAdmin = this.auth.currentUser && this.auth.currentUser.uid === this.ADMIN_UID;
            this.displayFilteredInventory(isAdmin);
        } else if (e.target.id === 'historySearchInput') {
            this.filterDeliveryHistory();
        } else if (e.target.id === 'eppToDeliverSelect') {
            this.updateDeliveryQuantityLimits();
        }
    }

    // === GESTIÓN DE UI ===
    updateUIVisibility(user, isAdmin) {
        const elements = {
            loginSection: document.getElementById('loginSection'),
            mainContent: document.getElementById('mainContent'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            logoutButton: document.getElementById('logoutButton'),
            addEppFormSection: document.getElementById('addEppFormSection'),
            loansSection: document.getElementById('loansSection'),
            deliverySection: document.getElementById('deliveryEppSection'),
            userIdDisplay: document.getElementById('userIdDisplay'),
            authStatus: document.getElementById('authStatus')
        };

        if (user) {
            if (elements.userIdDisplay) elements.userIdDisplay.textContent = `Logueado como: ${user.email}`;
            if (elements.authStatus) elements.authStatus.textContent = "Autenticado.";
            if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Conectado');
            if (elements.loginSection) elements.loginSection.classList.add('hidden');
            if (elements.logoutButton) elements.logoutButton.classList.remove('hidden');
            if (elements.addEppFormSection) elements.addEppFormSection.classList.toggle('hidden', !isAdmin);
            if (elements.loansSection) elements.loansSection.classList.toggle('hidden', !isAdmin);
            if (elements.deliverySection) elements.deliverySection.classList.toggle('hidden', !isAdmin);
        } else {
            if (elements.userIdDisplay) elements.userIdDisplay.textContent = "Visitante";
            if (elements.authStatus) elements.authStatus.textContent = "No autenticado.";
            if (window.updateAuthStatus) window.updateAuthStatus('error', 'No autenticado');
            if (elements.loginSection) elements.loginSection.classList.remove('hidden');
            if (elements.logoutButton) elements.logoutButton.classList.add('hidden');
            if (elements.addEppFormSection) elements.addEppFormSection.classList.add('hidden');
            if (elements.loansSection) elements.loansSection.classList.add('hidden');
            if (elements.deliverySection) elements.deliverySection.classList.add('hidden');
        }
        
        this.adjustAdminColumnsVisibility(isAdmin);
        if (elements.mainContent) elements.mainContent.classList.remove('hidden');
        if (elements.loadingIndicator) elements.loadingIndicator.classList.add('hidden');
    }

    adjustAdminColumnsVisibility(isAdminView) {
        document.querySelectorAll('.admin-col').forEach(col => {
            col.style.display = isAdminView ? '' : 'none';
        });
    }

    // === GESTIÓN DE INVENTARIO ===
    loadInventory(eppInventoryCollectionRef, isAdmin) {
        if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Cargando inventario...');
        
        this.unsubscribeInventory = onSnapshot(query(eppInventoryCollectionRef), (snapshot) => {
            this.allEppItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.allEppItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            this.displayFilteredInventory(isAdmin);
            this.updateDeliverySelect();
            if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Inventario cargado');
        }, (error) => {
            console.error("Error al cargar inventario EPP: ", error);
            this.showTemporaryMessage(`Error al cargar inventario: ${error.message}`, "error");
            if (window.updateAuthStatus) window.updateAuthStatus('error', 'Error al cargar');
        });
    }

    // NUEVA FUNCIÓN: Cargar entregas
    loadDeliveries(eppDeliveriesCollectionRef) {
        if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Cargando entregas...');
        
        this.unsubscribeDeliveries = onSnapshot(
            query(eppDeliveriesCollectionRef, orderBy('deliveryDate', 'desc')), 
            (snapshot) => {
                this.allDeliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.displayDeliveries();
                if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Entregas cargadas');
            }, 
            (error) => {
                console.error("Error al cargar entregas:", error);
                this.showTemporaryMessage(`Error al cargar entregas: ${error.message}`, "error");
            }
        );
    }

    displayFilteredInventory(isAdminView) {
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
            ? this.allEppItems.filter(item =>
                (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                (item.size && item.size.toLowerCase().includes(searchTerm))
            )
            : [...this.allEppItems];

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
    updateDeliverySelect() {
        const eppToDeliverSelect = document.getElementById('eppToDeliverSelect');
        if (!eppToDeliverSelect) return;

        eppToDeliverSelect.innerHTML = '<option value="">Seleccione un EPP</option>';
        
        this.allEppItems.forEach(item => {
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
    displayDeliveries() {
        const deliveryTableBody = document.getElementById('deliveryHistoryTableBody');
        if (!deliveryTableBody) return;

        deliveryTableBody.innerHTML = '';

        if (this.allDeliveries.length === 0) {
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

        this.allDeliveries.forEach(delivery => {
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
    filterDeliveryHistory() {
        const searchInput = document.getElementById('historySearchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        
        const deliveryTableBody = document.getElementById('deliveryHistoryTableBody');
        if (!deliveryTableBody) return;

        deliveryTableBody.innerHTML = '';

        let filteredDeliveries = [...this.allDeliveries];
        
        if (searchTerm) {
            filteredDeliveries = this.allDeliveries.filter(delivery => 
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

    // === AUTENTICACIÓN ===
    async handleLogin(form) {
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        const loginError = form.querySelector('#loginError');
        
        loginError.classList.add('hidden');
        if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Autenticando...');
        
        try {
            await signInWithEmailAndPassword(this.auth, email, password);
            form.reset();
            this.showTemporaryMessage("Inicio de sesión exitoso", "success");
        } catch (error) {
            console.error("Error de inicio de sesión:", error);
            loginError.textContent = `Error: ${this.mapAuthError(error.code)}`;
            loginError.classList.remove('hidden');
            if (window.updateAuthStatus) window.updateAuthStatus('error', 'Error de autenticación');
        }
    }

    async handleLogout() {
        try {
            await signOut(this.auth);
            this.showTemporaryMessage("Sesión cerrada correctamente", "success");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            this.showTemporaryMessage(`Error al cerrar sesión: ${error.message}`, "error");
        }
    }

    // === GESTIÓN DE EPP ===
    async handleAddEpp(form) {
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
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
                this.showTemporaryMessage("EPP agregado con éxito.", "success");
            } catch (error) {
                console.error("Error al agregar EPP:", error);
                this.showTemporaryMessage(`Error al agregar EPP: ${error.message}`, "error");
            }
        } else {
            this.showTemporaryMessage("Datos inválidos. Por favor, complete todos los campos requeridos.", "error");
        }
    }

    // NUEVA FUNCIÓN: Manejar entrega de EPP
    async handleDeliveryEpp(form) {
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
        const eppDeliveriesCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_deliveries`);
        
        const eppId = form.querySelector('#eppToDeliverSelect').value;
        const quantity = parseInt(form.querySelector('#deliveryQuantity').value);
        const personName = form.querySelector('#deliveryPersonName').value.trim();

        if (!eppId || !quantity || quantity <= 0 || !personName) {
            this.showTemporaryMessage("Por favor, complete todos los campos de la entrega.", "error");
            return;
        }

        try {
            const eppRef = doc(eppInventoryCollectionRef, eppId);
            const eppDoc = await getDoc(eppRef);
            
            if (!eppDoc.exists()) {
                this.showTemporaryMessage("El EPP seleccionado no existe.", "error");
                return;
            }

            const eppData = eppDoc.data();
            if (eppData.quantity < quantity) {
                this.showTemporaryMessage(`Stock insuficiente. Disponible: ${eppData.quantity}`, "error");
                return;
            }

            // Crear la entrega y actualizar el inventario en una transacción
            const batch = writeBatch(this.db);
            
            // Agregar entrega al histórico
            const deliveryRef = doc(eppDeliveriesCollectionRef);
            batch.set(deliveryRef, {
                eppId,
                eppName: eppData.name,
                eppSize: eppData.size || '',
                quantity,
                personName,
                deliveryDate: Timestamp.now(),
                deliveredBy: this.auth.currentUser.email
            });

            // Actualizar inventario
            batch.update(eppRef, {
                quantity: eppData.quantity - quantity
            });

            await batch.commit();
            form.reset();
            this.showTemporaryMessage(`EPP entregado a ${personName} correctamente.`, "success");
            
        } catch (error) {
            console.error("Error al registrar entrega:", error);
            this.showTemporaryMessage(`Error al registrar entrega: ${error.message}`, "error");
        }
    }

    async handleLoanEpp(form) {
        const eppLoansCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_loans`);
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
        
        const eppId = form.querySelector('#eppToLoanSelect').value;
        const quantity = parseInt(form.querySelector('#loanQuantity').value);
        const loanedTo = form.querySelector('#loanedTo').value.trim();

        if (!eppId || !quantity || quantity <= 0 || !loanedTo) {
            this.showTemporaryMessage("Por favor, complete todos los campos del préstamo.", "error");
            return;
        }

        try {
            const eppRef = doc(eppInventoryCollectionRef, eppId);
            const eppDoc = await getDoc(eppRef);
            
            if (!eppDoc.exists()) {
                this.showTemporaryMessage("El EPP seleccionado no existe.", "error");
                return;
            }

            const eppData = eppDoc.data();
            if (eppData.quantity < quantity) {
                this.showTemporaryMessage(`Stock insuficiente. Disponible: ${eppData.quantity}`, "error");
                return;
            }

            // Crear el préstamo y actualizar el inventario en una transacción
            const batch = writeBatch(this.db);
            
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
            this.showTemporaryMessage("Préstamo registrado con éxito.", "success");
            
        } catch (error) {
            console.error("Error al registrar préstamo:", error);
            this.showTemporaryMessage(`Error al registrar préstamo: ${error.message}`, "error");
        }
    }

    // NUEVA FUNCIÓN: Abrir modal de edición
    handleEditEpp(button) {
        const eppId = button.dataset.id;
        const item = this.allEppItems.find(epp => epp.id === eppId);
        
        if (!item) {
            this.showTemporaryMessage("EPP no encontrado.", "error");
            return;
        }

        // Llenar el formulario de edición
        document.getElementById('editEppId').value = eppId;
        document.getElementById('editEppName').value = item.name || '';
        document.getElementById('editEppSize').value = item.size || '';
        document.getElementById('editEppQuantity').value = item.quantity || 0;
        document.getElementById('editEppMinStock').value = item.minStock || 0;

        // Mostrar modal
        this.showEditModal();
    }

    // NUEVA FUNCIÓN: Actualizar EPP
    async handleUpdateEpp(form) {
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
        
        const eppId = form.querySelector('#editEppId').value;
        const name = form.querySelector('#editEppName').value.trim();
        const size = form.querySelector('#editEppSize').value.trim();
        const quantity = parseInt(form.querySelector('#editEppQuantity').value);
        const minStock = parseInt(form.querySelector('#editEppMinStock').value);

        if (!name || isNaN(quantity) || quantity < 0 || isNaN(minStock) || minStock < 0) {
            this.showTemporaryMessage("Por favor, complete todos los campos correctamente.", "error");
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
            
            this.hideEditModal();
            this.showTemporaryMessage(`EPP "${name}" actualizado correctamente.`, "success");
        } catch (error) {
            console.error("Error al actualizar EPP:", error);
            this.showTemporaryMessage(`Error al actualizar EPP: ${error.message}`, "error");
        }
    }

    async handleInventoryAction(button) {
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
        const { action, id } = button.dataset;
        const itemRef = doc(eppInventoryCollectionRef, id);

        try {
            const itemDoc = await getDoc(itemRef);
            if (!itemDoc.exists()) {
                this.showTemporaryMessage("El EPP no existe.", "error");
                return;
            }
            
            const currentQuantity = itemDoc.data().quantity || 0;
            const itemName = itemDoc.data().name || 'EPP';

            if (action === 'increase') {
                await updateDoc(itemRef, { quantity: currentQuantity + 1 });
                this.showTemporaryMessage(`Cantidad de ${itemName} aumentada.`, "success");
            } else if (action === 'decrease') {
                if (currentQuantity > 0) {
                    await updateDoc(itemRef, { quantity: currentQuantity - 1 });
                    this.showTemporaryMessage(`Cantidad de ${itemName} reducida.`, "success");
                } else {
                    this.showTemporaryMessage("No se puede reducir: cantidad ya es 0.", "warning");
                }
            } else if (action === 'delete') {
                this.showConfirmationModal(
                    `¿Estás seguro de que quieres eliminar "${itemName}"? Esta acción no se puede deshacer.`, 
                    async () => {
                        try {
                            await deleteDoc(itemRef);
                            this.showTemporaryMessage("EPP eliminado correctamente.", "success");
                        } catch (error) {
                            this.showTemporaryMessage(`Error al eliminar: ${error.message}`, "error");
                        }
                    }
                );
            }
        } catch (error) {
            console.error("Error al actualizar el EPP:", error);
            this.showTemporaryMessage(`Error al actualizar el EPP: ${error.message}`, "error");
        }
    }

    async handleReturnLoan(button) {
        const eppLoansCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_loans`);
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
        
        const loanId = button.dataset.loanId;
        
        try {
            const loanRef = doc(eppLoansCollectionRef, loanId);
            const loanDoc = await getDoc(loanRef);
            
            if (!loanDoc.exists()) {
                this.showTemporaryMessage("El préstamo no existe.", "error");
                return;
            }

            const loanData = loanDoc.data();
            const eppRef = doc(eppInventoryCollectionRef, loanData.eppId);
            const eppDoc = await getDoc(eppRef);

            if (eppDoc.exists()) {
                const currentQuantity = eppDoc.data().quantity || 0;
                
                // Actualizar inventario y eliminar préstamo
                const batch = writeBatch(this.db);
                batch.update(eppRef, { quantity: currentQuantity + loanData.quantity });
                batch.delete(loanRef);
                
                await batch.commit();
                this.showTemporaryMessage("Préstamo devuelto correctamente.", "success");
            } else {
                this.showTemporaryMessage("Error: El EPP asociado no existe en el inventario.", "error");
            }
        } catch (error) {
            console.error("Error al devolver préstamo:", error);
            this.showTemporaryMessage(`Error al devolver préstamo: ${error.message}`, "error");
        }
    }

    loadLoans(eppLoansCollectionRef) {
        const loansTableBody = document.getElementById('loansTableBody');
        if (!loansTableBody) return;

        this.unsubscribeLoans = onSnapshot(
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
                    const tr = this.renderLoanItem(loan);
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

    renderLoanItem(loan) {
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
    showEditModal() {
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

    hideEditModal() {
        const modal = document.getElementById('editEppModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // NUEVA FUNCIÓN: Actualizar límites de cantidad en entregas
    updateDeliveryQuantityLimits() {
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
    exportDeliveryHistory() {
        if (this.allDeliveries.length === 0) {
            this.showTemporaryMessage("No hay entregas para exportar.", "warning");
            return;
        }

        try {
            const csvHeaders = ['Fecha', 'EPP', 'Talla', 'Cantidad', 'Entregado a', 'Entregado por'];
            const csvRows = this.allDeliveries.map(delivery => {
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
            
            this.showTemporaryMessage("Histórico exportado correctamente.", "success");
        } catch (error) {
            console.error("Error al exportar:", error);
            this.showTemporaryMessage("Error al exportar el histórico.", "error");
        }
    }

    mapAuthError(errorCode) {
        const errorMap = {
            'auth/invalid-email': 'El formato del correo electrónico es inválido.',
            'auth/user-not-found': 'Correo o contraseña incorrectos.',
            'auth/wrong-password': 'Correo o contraseña incorrectos.',
            'auth/invalid-credential': 'Correo o contraseña incorrectos.',
            'auth/too-many-requests': 'Demasiados intentos fallidos. Intente más tarde.'
        };
        return errorMap[errorCode] || 'Ocurrió un error inesperado al iniciar sesión.';
    }

    // === UTILIDADES ===
    showTemporaryMessage(message, type = 'info') {
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

    showConfirmationModal(message, callback) {
        const modal = document.getElementById('confirmationModal');
        const modalMessage = document.getElementById('confirmationMessage');
        if (!modal || !modalMessage) return;
        
        modalMessage.textContent = message;
        this.confirmCallback = callback;
        modal.classList.remove('hidden');
    }

    hideConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) modal.classList.add('hidden');
        this.confirmCallback = null;
    }

    // === LIMPIEZA ===
    cleanup() {
        console.log("🧹 Limpiando listeners y suscripciones de la aplicación.");
        document.removeEventListener('click', this.handleClick.bind(this));
        document.removeEventListener('submit', this.handleSubmit.bind(this));
        document.removeEventListener('input', this.handleInput.bind(this));

        if (this.unsubscribeInventory) this.unsubscribeInventory();
        if (this.unsubscribeLoans) this.unsubscribeLoans();
        if (this.unsubscribeAuth) this.unsubscribeAuth();
        if (this.unsubscribeDeliveries) this.unsubscribeDeliveries();
    }

    // === INICIALIZACIÓN PÚBLICA ===
    initialize() {
        console.log("📱 Aplicación de inventario EPP iniciada");
        this.setupFirebase();
    }
}