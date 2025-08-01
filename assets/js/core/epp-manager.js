// assets/js/core/epp-manager.js
// LÓGICA CENTRAL COMPARTIDA PARA TODAS LAS INSTANCIAS DE EPP - CON VISTA PÚBLICA

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
        
        // Referencias globales para las suscripciones y estado
        this.unsubscribeInventory = null;
        this.unsubscribeLoans = null;
        this.unsubscribeAuth = null;
        this.unsubscribeDeliveries = null;
        this.currentUserId = null;
        this.isUserAdmin = false;
        this.confirmCallback = null;
        this.allEppItems = [];
        this.allDeliveries = [];
        this.isOnline = navigator.onLine;
        this.offlineDB = null;
        this.syncInProgress = false;

        // Inicializar almacenamiento offline
        this.initializeOfflineStorage();

        // Listeners para cambios de conectividad
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));


        console.log(`🔧 EPPManager inicializado para ${config.instanceName}`);
        
        // Inicializar listeners de eventos de la UI y autenticación
        this.initializeEventListeners();
        // Inicializar sistema offline
        this.initializeOfflineSystem();
        this.setupAuthListener();
        
        // === NUEVO: CARGAR INVENTARIO INMEDIATAMENTE PARA VISTA PÚBLICA ===
        this.loadPublicInventory();
    }

    // === NUEVO MÉTODO: CARGAR INVENTARIO PÚBLICO ===
    loadPublicInventory() {
        console.log('🌐 Cargando inventario para vista pública...');
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
        
        // Cargar inventario inmediatamente (sin esperar autenticación)
        this.loadInventory(eppInventoryCollectionRef, false);
        
        // Mostrar la interfaz principal inmediatamente
        this.showMainContentForPublic();
    }

    // === NUEVO MÉTODO: MOSTRAR CONTENIDO PRINCIPAL PARA PÚBLICO ===
    showMainContentForPublic() {
        const elements = {
            mainContent: document.getElementById('mainContent'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            loginSection: document.getElementById('loginSection')
        };

        // Mostrar contenido principal y login simultáneamente
        if (elements.mainContent) elements.mainContent.classList.remove('hidden');
        if (elements.loadingIndicator) elements.loadingIndicator.classList.add('hidden');
        if (elements.loginSection) elements.loginSection.classList.remove('hidden');
        
        // Asegurar que las columnas de admin estén ocultas para visitantes
        this.adjustAdminColumnsVisibility(false);
        
        console.log('✅ Vista pública del inventario habilitada');
    }

    // === MÉTODOS DE CONFIGURACIÓN ===
    setupRealtimeListeners() {
        console.log('📡 Configurando listeners en tiempo real...');
        
        const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
        const eppLoansCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_loans`);
        const eppDeliveriesCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_deliveries`);

        // === MODIFICADO: RECARGAR INVENTARIO CON PERMISOS DE ADMIN ===
        this.loadInventory(eppInventoryCollectionRef, this.isUserAdmin);
        
        // Si es admin, cargar préstamos y entregas
        if (this.isUserAdmin) {
            this.loadLoans(eppLoansCollectionRef);
            this.loadDeliveries(eppDeliveriesCollectionRef);
        }
    }

    updateUIForAuthState(isAuthenticated) {
        console.log(`🎨 Actualizando UI - Autenticado: ${isAuthenticated}, Admin: ${this.isUserAdmin}`);
        
        const user = this.auth.currentUser;
        this.updateUIVisibility(user, this.isUserAdmin);
    }

    handleUserAuthenticated(user) {
        if (this.currentUserId === user.uid) return; // Evita re-ejecuciones innecesarias

        console.log("✅ Usuario autenticado:", user.uid);
        this.currentUserId = user.uid;
        this.isUserAdmin = user.uid === this.ADMIN_UID;
        
        // Configura los listeners de la base de datos ahora que sabemos quién es el usuario
        this.setupRealtimeListeners();
        this.updateUIForAuthState(true);
    }

    setupAuthListener() {
        this.unsubscribeAuth = onAuthStateChanged(this.auth, user => {
            if (user) {
                // Si hay un cambio de estado a "logueado", maneja la autenticación.
                this.handleUserAuthenticated(user);
            } else {
                // === MODIFICADO: MANTENER VISTA PÚBLICA AL CERRAR SESIÓN ===
                console.log("❌ Usuario no autenticado - Mostrando vista pública.");
                this.currentUserId = null;
                this.isUserAdmin = false;
                this.updateUIForAuthState(false);

                // No detener el listener del inventario para mantener vista pública
                // Solo detener préstamos y entregas que son exclusivos de admin
                if (this.unsubscribeLoans) this.unsubscribeLoans();
                if (this.unsubscribeDeliveries) this.unsubscribeDeliveries();
                
                // === NUEVO: ASEGURAR QUE LA VISTA PÚBLICA PERMANEZCA ===
                this.showMainContentForPublic();
            }
        });
    }

    // === INICIALIZACIÓN ===
    initializeEventListeners() {
        console.log('📋 Configurando event listeners...');
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('submit', this.handleSubmit.bind(this));
        document.addEventListener('input', this.handleInput.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));
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
            // === MODIFICADO: USAR ESTADO ACTUAL DE ADMIN ===
            this.displayFilteredInventory(this.isUserAdmin);
        } else if (e.target.id === 'historySearchInput') {
            this.filterDeliveryHistory();
        } else if (e.target.id === 'eppToDeliverSelect') {
            this.updateDeliveryQuantityLimits();
        }
    }

    // === GESTIÓN DE UI ===
    updateUIVisibility(user, isAdmin) {
        console.log(`🎨 Actualizando UI - Usuario: ${user ? user.email : 'visitante'}, Admin: ${isAdmin}`);

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
            // === MODIFICADO: VISTA PÚBLICA MEJORADA ===
            if (elements.userIdDisplay) elements.userIdDisplay.textContent = "Vista Pública - Inventario de Solo Lectura";
            if (elements.authStatus) elements.authStatus.textContent = "Modo Público (inicie sesión para administrar)";
            if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Vista pública');
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
        console.log(`👨‍💼 Ajustando columnas de admin - Visible: ${isAdminView}`);
        document.querySelectorAll('.admin-col').forEach(col => {
            col.style.display = isAdminView ? '' : 'none';
        });
    }

    // === GESTIÓN DE INVENTARIO ===
    loadInventory(eppInventoryCollectionRef, isAdmin) {
        console.log(`📦 Cargando inventario - Modo: ${isAdmin ? 'Administrador' : 'Público'}...`);
        if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Cargando inventario...');

        // === MODIFICADO: EVITAR MÚLTIPLES SUSCRIPCIONES ===
        if (this.unsubscribeInventory) {
            this.unsubscribeInventory();
        }

        this.unsubscribeInventory = onSnapshot(query(eppInventoryCollectionRef), (snapshot) => {
            if (this.isOnline) {
    this.unsubscribeInventory = onSnapshot(query(eppInventoryCollectionRef), (snapshot) => {
        console.log(`📊 Inventario cargado desde Firebase: ${snapshot.docs.length} items`);
        this.allEppItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.allEppItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        // Guardar en almacenamiento offline
        this.saveInventoryOffline(this.allEppItems);
        
        this.displayFilteredInventory(isAdmin);
        this.updateDeliverySelect();
        if (window.updateAuthStatus) window.updateAuthStatus('connected', isAdmin ? 'Inventario cargado' : 'Vista pública activa');
    }, (error) => {
        console.error("❌ Error al cargar inventario EPP: ", error);
        this.loadOfflineInventory(isAdmin);
    });
} else {
    this.loadOfflineInventory(isAdmin);
}
        });
    }
    async loadOfflineInventory(isAdmin) {
    try {
        this.allEppItems = await this.loadInventoryOffline();
        this.displayFilteredInventory(isAdmin);
        this.updateDeliverySelect();
        
        if (this.allEppItems.length > 0) {
            if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Inventario offline activo');
            this.showTemporaryMessage(`📱 Modo offline: ${this.allEppItems.length} items cargados desde almacenamiento local`, "info");
        } else {
            if (window.updateAuthStatus) window.updateAuthStatus('error', 'Sin datos offline');
            this.showTemporaryMessage("No hay datos offline disponibles. Conecte a internet para sincronizar.", "warning");
        }
    } catch (error) {
        console.error("❌ Error cargando inventario offline:", error);
        if (window.updateAuthStatus) window.updateAuthStatus('error', 'Error cargando offline');
        this.showTemporaryMessage("Error al cargar datos offline", "error");
    }
}
async initializeOfflineSystem() {
    try {
        await this.initializeOfflineStorage();
        this.updateConnectionStatus();
        this.updatePendingChangesUI();
        console.log('✅ Sistema offline inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando sistema offline:', error);
    }
}

    loadDeliveries(eppDeliveriesCollectionRef) {
        console.log('🚚 Cargando entregas...');
        if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Cargando entregas...');

        this.unsubscribeDeliveries = onSnapshot(
            query(eppDeliveriesCollectionRef, orderBy('deliveryDate', 'desc')),
            (snapshot) => {
                console.log(`📦 Entregas cargadas: ${snapshot.docs.length} entregas`);
                this.allDeliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.displayDeliveries();
                if (window.updateAuthStatus) window.updateAuthStatus('connected', 'Entregas cargadas');
            },
            (error) => {
                console.error("❌ Error al cargar entregas:", error);
                this.showTemporaryMessage(`Error al cargar entregas: ${error.message}`, "error");
            }
        );
    }

    displayFilteredInventory(isAdminView) {
        console.log(`🗂️ Mostrando inventario filtrado - Admin: ${isAdminView}`);
        const eppTableBody = document.getElementById('eppTableBody');
        const eppToLoanSelect = document.getElementById('eppToLoanSelect');
        const searchEppInput = document.getElementById('searchEppInput');
        if (!eppTableBody) {
            console.warn('⚠️ No se encontró eppTableBody');
            return;
        }

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

        console.log(`🔍 Items filtrados: ${filteredItems.length}/${this.allEppItems.length}`);

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
        console.log('🔐 Intentando iniciar sesión...');
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        const loginError = form.querySelector('#loginError');

        loginError.classList.add('hidden');
        if (window.updateAuthStatus) window.updateAuthStatus('loading', 'Autenticando...');

        try {
            await signInWithEmailAndPassword(this.auth, email, password);
            form.reset();
            this.showTemporaryMessage("Inicio de sesión exitoso", "success");
            console.log('✅ Sesión iniciada correctamente');
        } catch (error) {
            console.error("❌ Error de inicio de sesión:", error);
            loginError.textContent = `Error: ${this.mapAuthError(error.code)}`;
            loginError.classList.remove('hidden');
            if (window.updateAuthStatus) window.updateAuthStatus('error', 'Error de autenticación');
        }
    }

    async handleLogout() {
        console.log('🚪 Cerrando sesión...');
        try {
            await signOut(this.auth);
            this.showTemporaryMessage("Sesión cerrada correctamente", "success");
            console.log('✅ Sesión cerrada correctamente');
        } catch (error) {
            console.error("❌ Error al cerrar sesión:", error);
            this.showTemporaryMessage(`Error al cerrar sesión: ${error.message}`, "error");
        }
    }

    // === GESTIÓN DE EPP ===
    async handleAddEpp(form) {
    console.log('➕ Agregando nuevo EPP...');
    const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
    const name = form.querySelector('#eppName').value.trim();
    const size = form.querySelector('#eppSize').value.trim();
    const quantity = parseInt(form.querySelector('#eppQuantity').value);
    const minStock = parseInt(form.querySelector('#eppMinStock').value);

    if (name && !isNaN(quantity) && quantity >= 0 && !isNaN(minStock) && minStock >= 0) {
        const itemData = {
            name,
            size: size || '',
            quantity,
            minStock,
            createdAt: new Date() // Usar Date en lugar de Timestamp para offline
        };

        try {
            if (this.isOnline) {
                // Online: usar Timestamp de Firebase
                itemData.createdAt = Timestamp.now();
                await addDoc(eppInventoryCollectionRef, itemData);
                this.showTemporaryMessage("EPP agregado con éxito.", "success");
            } else {
                // Offline: generar ID temporal y agregar a memoria local
                const tempId = 'temp_' + Date.now();
                const newItem = { ...itemData, id: tempId };
                
                this.allEppItems.push(newItem);
                this.allEppItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                this.displayFilteredInventory(this.isUserAdmin);
                
                await this.addPendingChange({
                    type: 'addItem',
                    itemData: itemData,
                    tempId: tempId
                });
                
                this.showTemporaryMessage("EPP agregado (se sincronizará cuando haya conexión)", "warning");
            }
            
            form.reset();
            console.log(`✅ EPP agregado: ${name}`);
            
        } catch (error) {
            console.error("❌ Error al agregar EPP:", error);
            this.showTemporaryMessage(`Error al agregar EPP: ${error.message}`, "error");
        }
    } else {
        this.showTemporaryMessage("Datos inválidos. Por favor, complete todos los campos requeridos.", "error");
    }
}

    async handleDeliveryEpp(form) {
        console.log('🚚 Registrando entrega de EPP...');
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
            console.log(`✅ Entrega registrada: ${eppData.name} a ${personName}`);

        } catch (error) {
            console.error("❌ Error al registrar entrega:", error);
            this.showTemporaryMessage(`Error al registrar entrega: ${error.message}`, "error");
        }
    }

    async handleLoanEpp(form) {
        console.log('📋 Registrando préstamo de EPP...');
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
            console.log(`✅ Préstamo registrado: ${eppData.name} a ${loanedTo}`);

        } catch (error) {
            console.error("❌ Error al registrar préstamo:", error);
            this.showTemporaryMessage(`Error al registrar préstamo: ${error.message}`, "error");
        }
    }

    // FUNCIÓN: Abrir modal de edición
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

    // FUNCIÓN: Actualizar EPP
    async handleUpdateEpp(form) {
    console.log('✏️ Actualizando EPP...');
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

    const updateData = {
        name,
        size: size || '',
        quantity,
        minStock,
        updatedAt: new Date()
    };

    try {
        // Actualizar en memoria local inmediatamente
        const itemIndex = this.allEppItems.findIndex(item => item.id === eppId);
        if (itemIndex !== -1) {
            this.allEppItems[itemIndex] = { ...this.allEppItems[itemIndex], ...updateData };
            this.displayFilteredInventory(this.isUserAdmin);
        }

        if (this.isOnline) {
            updateData.updatedAt = Timestamp.now();
            const eppRef = doc(eppInventoryCollectionRef, eppId);
            await updateDoc(eppRef, updateData);
            this.showTemporaryMessage(`EPP "${name}" actualizado correctamente.`, "success");
        } else {
            await this.addPendingChange({
                type: 'updateItem',
                itemId: eppId,
                updateData: updateData,
                itemName: name
            });
            this.showTemporaryMessage(`EPP "${name}" actualizado (se sincronizará cuando haya conexión)`, "warning");
        }

        this.hideEditModal();
        console.log(`✅ EPP actualizado: ${name}`);
        
    } catch (error) {
        console.error("❌ Error al actualizar EPP:", error);
        this.showTemporaryMessage(`Error al actualizar EPP: ${error.message}`, "error");
    }
}

    async handleInventoryAction(button) {
    const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
    const { action, id } = button.dataset;

    try {
        if (action === 'increase' || action === 'decrease') {
            // Buscar item en memoria local primero
            const item = this.allEppItems.find(epp => epp.id === id);
            if (!item) {
                this.showTemporaryMessage("El EPP no existe.", "error");
                return;
            }

            const currentQuantity = item.quantity || 0;
            const newQuantity = action === 'increase' ? currentQuantity + 1 : 
                               (currentQuantity > 0 ? currentQuantity - 1 : 0);

            if (action === 'decrease' && currentQuantity <= 0) {
                this.showTemporaryMessage("No se puede reducir: cantidad ya es 0.", "warning");
                return;
            }

            // Actualizar en memoria local inmediatamente
            item.quantity = newQuantity;
            this.displayFilteredInventory(this.isUserAdmin);

            if (this.isOnline) {
                // Online: actualizar Firebase directamente
                const itemRef = doc(eppInventoryCollectionRef, id);
                await updateDoc(itemRef, { quantity: newQuantity });
                this.showTemporaryMessage(`Cantidad de ${item.name} ${action === 'increase' ? 'aumentada' : 'reducida'}.`, "success");
            } else {
                // Offline: guardar en cola de cambios
                await this.addPendingChange({
                    type: 'updateQuantity',
                    itemId: id,
                    newQuantity: newQuantity,
                    itemName: item.name
                });
                this.showTemporaryMessage(`${item.name} ${action === 'increase' ? 'aumentado' : 'reducido'} (se sincronizará cuando haya conexión)`, "warning");
            }

        } else if (action === 'delete') {
            const item = this.allEppItems.find(epp => epp.id === id);
            if (!item) {
                this.showTemporaryMessage("El EPP no existe.", "error");
                return;
            }

            this.showConfirmationModal(
                `¿Estás seguro de que quieres eliminar "${item.name}"? Esta acción no se puede deshacer.`,
                async () => {
                    try {
                        if (this.isOnline) {
                            const itemRef = doc(eppInventoryCollectionRef, id);
                            await deleteDoc(itemRef);
                            this.showTemporaryMessage("EPP eliminado correctamente.", "success");
                        } else {
                            // Remover de memoria local
                            this.allEppItems = this.allEppItems.filter(epp => epp.id !== id);
                            this.displayFilteredInventory(this.isUserAdmin);
                            
                            await this.addPendingChange({
                                type: 'deleteItem',
                                itemId: id,
                                itemName: item.name
                            });
                            this.showTemporaryMessage(`${item.name} eliminado (se sincronizará cuando haya conexión)`, "warning");
                        }
                    } catch (error) {
                        this.showTemporaryMessage(`Error al eliminar: ${error.message}`, "error");
                    }
                }
            );
        }
    } catch (error) {
        console.error("❌ Error al actualizar el EPP:", error);
        this.showTemporaryMessage(`Error al actualizar el EPP: ${error.message}`, "error");
    }
}

    async handleReturnLoan(button) {
        console.log('🔄 Devolviendo préstamo...');
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
                console.log(`✅ Préstamo devuelto: ${loanData.eppName}`);
            } else {
                this.showTemporaryMessage("Error: El EPP asociado no existe en el inventario.", "error");
            }
        } catch (error) {
            console.error("❌ Error al devolver préstamo:", error);
            this.showTemporaryMessage(`Error al devolver préstamo: ${error.message}`, "error");
        }
    }

    loadLoans(eppLoansCollectionRef) {
        console.log('📋 Cargando préstamos...');
        const loansTableBody = document.getElementById('loansTableBody');
        if (!loansTableBody) return;

        this.unsubscribeLoans = onSnapshot(
            query(eppLoansCollectionRef, where('status', '==', 'active')),
            (snapshot) => {
                console.log(`📊 Préstamos cargados: ${snapshot.docs.length} activos`);
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
                console.error("❌ Error al cargar préstamos:", error);
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

    // FUNCIONES: Modal de edición
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

    // FUNCIÓN: Actualizar límites de cantidad en entregas
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

    // FUNCIÓN: Exportar histórico
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
            console.log('📄 Histórico exportado');
        } catch (error) {
            console.error("❌ Error al exportar:", error);
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
        console.log(`📱 Aplicación de inventario EPP iniciada para ${this.config.instanceName}`);
    }


    // === SISTEMA OFFLINE ===
async initializeOfflineStorage() {
    if (!('indexedDB' in window)) {
        console.warn('IndexedDB no disponible');
        return false;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open('EPPOfflineDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            this.offlineDB = request.result;
            console.log('✅ Base de datos offline inicializada');
            resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store para inventario offline
            if (!db.objectStoreNames.contains('inventory')) {
                const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' });
                inventoryStore.createIndex('name', 'name', { unique: false });
            }
            
            // Store para cambios pendientes
            if (!db.objectStoreNames.contains('pendingChanges')) {
                const changesStore = db.createObjectStore('pendingChanges', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                changesStore.createIndex('timestamp', 'timestamp', { unique: false });
                changesStore.createIndex('type', 'type', { unique: false });
            }
            
            // Store para metadatos
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata', { keyPath: 'key' });
            }
        };
    });
}

async saveInventoryOffline(items) {
    if (!this.offlineDB) return false;
    
    const transaction = this.offlineDB.transaction(['inventory', 'metadata'], 'readwrite');
    const inventoryStore = transaction.objectStore('inventory');
    const metadataStore = transaction.objectStore('metadata');
    
    // Limpiar inventario anterior
    await inventoryStore.clear();
    
    // Guardar nuevo inventario
    for (const item of items) {
        await inventoryStore.add(item);
    }
    
    // Guardar timestamp de última sincronización
    await metadataStore.put({
        key: 'lastSync',
        value: new Date().toISOString()
    });
    
    console.log(`💾 Inventario guardado offline: ${items.length} items`);
    return true;
}

async loadInventoryOffline() {
    if (!this.offlineDB) return [];
    
    return new Promise((resolve, reject) => {
        const transaction = this.offlineDB.transaction(['inventory'], 'readonly');
        const store = transaction.objectStore('inventory');
        const request = store.getAll();
        
        request.onsuccess = () => {
            console.log(`📱 Inventario cargado desde offline: ${request.result.length} items`);
            resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
}

async addPendingChange(changeData) {
    if (!this.offlineDB) return false;
    
    const transaction = this.offlineDB.transaction(['pendingChanges'], 'readwrite');
    const store = transaction.objectStore('pendingChanges');
    
    const change = {
        ...changeData,
        timestamp: new Date().toISOString(),
        id: Date.now() + Math.random() // ID único temporal
    };
    
    await store.add(change);
    this.updatePendingChangesUI();
    console.log('📝 Cambio agregado a cola offline:', change.type);
    return true;
}

async getPendingChanges() {
    if (!this.offlineDB) return [];
    
    return new Promise((resolve, reject) => {
        const transaction = this.offlineDB.transaction(['pendingChanges'], 'readonly');
        const store = transaction.objectStore('pendingChanges');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async clearPendingChanges() {
    if (!this.offlineDB) return;
    
    const transaction = this.offlineDB.transaction(['pendingChanges'], 'readwrite');
    const store = transaction.objectStore('pendingChanges');
    await store.clear();
    this.updatePendingChangesUI();
}

updatePendingChangesUI() {
    this.getPendingChanges().then(changes => {
        const indicator = document.getElementById('offlineIndicator');
        const count = document.getElementById('pendingCount');
        
        if (indicator && count) {
            count.textContent = changes.length;
            indicator.style.display = changes.length > 0 ? 'flex' : 'none';
        }
    });
}
handleOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    this.updateConnectionStatus();
    
    if (isOnline && !this.syncInProgress) {
        this.syncPendingChanges();
    }
}

updateConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    const indicatorEl = document.getElementById('connectionIndicator');
    
    if (statusEl && indicatorEl) {
        if (this.isOnline) {
            statusEl.textContent = 'Conectado';
            indicatorEl.className = 'w-2 h-2 bg-green-500 rounded-full';
        } else {
            statusEl.textContent = 'Sin conexión (Modo Offline)';
            indicatorEl.className = 'w-2 h-2 bg-orange-500 rounded-full animate-pulse';
        }
    }
}

async syncPendingChanges() {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    const changes = await this.getPendingChanges();
    
    if (changes.length === 0) {
        this.syncInProgress = false;
        return;
    }
    
    console.log(`🔄 Sincronizando ${changes.length} cambios pendientes...`);
    
    try {
        for (const change of changes) {
            await this.applySyncChange(change);
        }
        
        await this.clearPendingChanges();
        this.showTemporaryMessage(`✅ ${changes.length} cambios sincronizados correctamente`, 'success');
        
    } catch (error) {
        console.error('❌ Error durante sincronización:', error);
        this.showTemporaryMessage('Error al sincronizar cambios. Se reintentará automáticamente.', 'error');
    }
    
    this.syncInProgress = false;
}

async applySyncChange(change) {
    const eppInventoryCollectionRef = collection(this.db, `artifacts/${this.appIdForPath}/users/${this.ADMIN_UID}/epp_inventory`);
    
    switch (change.type) {
        case 'updateQuantity':
            const itemRef = doc(eppInventoryCollectionRef, change.itemId);
            await updateDoc(itemRef, { quantity: change.newQuantity });
            break;
            
        case 'addItem':
            await addDoc(eppInventoryCollectionRef, change.itemData);
            break;
            
        case 'updateItem':
            const updateRef = doc(eppInventoryCollectionRef, change.itemId);
            await updateDoc(updateRef, change.updateData);
            break;
            
        case 'deleteItem':
            const deleteRef = doc(eppInventoryCollectionRef, change.itemId);
            await deleteDoc(deleteRef);
            break;
    }
}
}