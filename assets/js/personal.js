// assets/js/personal.js - Gestión de Personal

async function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebaseReady && window.db && window.auth) {
            resolve();
        } else {
            window.addEventListener('firebaseReady', resolve, { once: true });
            
            const checkFirebase = () => {
                if (window.firebaseReady && window.db && window.auth) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            setTimeout(checkFirebase, 100);
        }
    });
}

class PersonalManager {
    constructor() {
        this.allWorkers = [];
        this.isEditMode = false;
        this.editingWorkerId = null;
        this.confirmCallback = null;
        this.CLOUDINARY_CLOUD_NAME = "dep5jbtjh";
        this.CLOUDINARY_UPLOAD_PRESET = "inv_epp_unsigned";
        
        // Definición de certificaciones
        this.certifications = [
            { key: 'examen', name: 'Examen ACHS', hasDate: true, hasVencimiento: true },
            { key: 'sstMetro', name: 'SST Metro', hasDate: true, hasVencimiento: true },
            { key: 'opr', name: 'OPR DS44', hasDate: true, hasVencimiento: true },
            { key: 'primeraRespuesta', name: 'Primera Respuesta', hasDate: true, hasVencimiento: true },
            { key: 'respCivil', name: 'Responsabilidad Civil', hasDate: true, hasVencimiento: true },
            { key: 'extintores', name: 'Extintores', hasDate: true, hasVencimiento: true },
            { key: 'alcoholDrogas', name: 'Alcohol y Drogas', hasDate: true, hasVencimiento: true },
            { key: 'personasTrabajadoras', name: 'Formación Personas Trabajadoras', hasDate: true, hasVencimiento: true },
            // Capacitaciones adicionales
            { key: 'silice', name: 'Sílice', hasDate: false, hasVencimiento: false },
            { key: 'prexor', name: 'PREXOR', hasDate: false, hasVencimiento: false },
            { key: 'guiaTecnica', name: 'Guía Técnica', hasDate: false, hasVencimiento: false },
            { key: 'tmert', name: 'TMERT', hasDate: false, hasVencimiento: false },
            { key: 'mmc', name: 'MMC', hasDate: false, hasVencimiento: false },
            { key: 'uv', name: 'UV', hasDate: false, hasVencimiento: false }
        ];
    }

    async init() {
        console.log("📋 Inicializando PersonalManager");
        
        await waitForFirebase();
        
        this.setupEventListeners();
        this.generateCertificationFields();
        
        // Verificar autenticación
        window.onAuthStateChanged(window.auth, (user) => {
            this.updateUIVisibility(user);
            if (user && user.uid === window.ADMIN_UID) {
                this.loadWorkers();
            }
        });
    }

    updateUIVisibility(user) {
        const isAuthorized = user && user.uid === window.ADMIN_UID;
        const authStatus = document.getElementById('authStatus');
        const mainContent = document.getElementById('mainContent');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const personalStats = document.getElementById('personalStats');
        
        if (authStatus) {
            authStatus.textContent = isAuthorized 
                ? `Acceso autorizado: ${user.email}` 
                : "Acceso restringido - Solo Luis Sepúlveda";
        }

        if (isAuthorized) {
            mainContent?.classList.remove('hidden');
            personalStats?.classList.remove('hidden');
        } else {
            mainContent.innerHTML = `
                <div class="text-center py-16">
                    <div class="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Acceso Restringido</h2>
                    <p class="text-gray-600 dark:text-gray-400 mb-6">Esta sección está disponible únicamente para Luis Sepúlveda.</p>
                    <p class="text-sm text-gray-500 dark:text-gray-500">Por favor, inicie sesión con las credenciales autorizadas.</p>
                </div>
            `;
            mainContent.classList.remove('hidden');
        }
        
        loadingIndicator?.classList.add('hidden');
    }

    generateCertificationFields() {
        const container = document.getElementById('certificationsContainer');
        if (!container) return;

        container.innerHTML = this.certifications.map(cert => `
            <div class="certification-group border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold text-gray-700 dark:text-gray-200">${cert.name}</h4>
                    <div class="flex items-center space-x-2">
                        <label class="text-sm">Estado:</label>
                        <select id="${cert.key}Status" class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm">
                            <option value="">Sin definir</option>
                            <option value="Vigente">Vigente</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Por Vencer">Por Vencer</option>
                            <option value="No Aplica">No Aplica</option>
                            <option value="Prohibición">Prohibición</option>
                        </select>
                    </div>
                </div>
                
                ${cert.hasDate ? `
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Fecha de Realización</label>
                            <input type="date" id="${cert.key}Date" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm">
                        </div>
                        ${cert.hasVencimiento ? `
                            <div>
                                <label class="block text-sm font-medium mb-1">Fecha de Vencimiento</label>
                                <input type="date" id="${cert.key}Expiry" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm">
                            </div>
                        ` : ''}
                        <div>
                            <label class="block text-sm font-medium mb-1">Documento</label>
                            <div class="flex items-center space-x-2">
                                <input type="file" id="${cert.key}File" accept=".pdf,.jpg,.jpeg,.png" class="hidden">
                                <button type="button" onclick="personalManager.selectFile('${cert.key}')" class="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                                    Subir Archivo
                                </button>
                                <span id="${cert.key}FileName" class="text-xs text-gray-500"></span>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex items-center">
                            <input type="checkbox" id="${cert.key}Completed" class="mr-2 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500">
                            <label for="${cert.key}Completed" class="text-sm">Completado</label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Documento</label>
                            <div class="flex items-center space-x-2">
                                <input type="file" id="${cert.key}File" accept=".pdf,.jpg,.jpeg,.png" class="hidden">
                                <button type="button" onclick="personalManager.selectFile('${cert.key}')" class="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                                    Subir Archivo
                                </button>
                                <span id="${cert.key}FileName" class="text-xs text-gray-500"></span>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Toggle agregar trabajador
        const toggleBtn = document.getElementById('toggleAddWorker');
        toggleBtn?.addEventListener('click', () => {
            const section = document.getElementById('addWorkerSection');
            const isHidden = section.classList.contains('hidden');
            section.classList.toggle('hidden', !isHidden);
            if (!this.isEditMode && !isHidden) {
                this.resetForm();
            }
        });

        // Cancelar edición
        document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
            this.resetForm();
            document.getElementById('addWorkerSection').classList.add('hidden');
        });

        // Formulario
        document.getElementById('addWorkerForm')?.addEventListener('submit', (e) => this.handleWorkerSubmit(e));

        // Búsqueda y filtros
        document.getElementById('searchWorkerInput')?.addEventListener('input', () => this.filterWorkers());
        document.getElementById('complianceFilter')?.addEventListener('change', () => this.filterWorkers());

        // Modales
        document.getElementById('closeDocumentsModal')?.addEventListener('click', () => {
            document.getElementById('documentsModal').classList.add('hidden');
        });

        document.getElementById('confirmButton')?.addEventListener('click', () => {
            if (this.confirmCallback) this.confirmCallback();
            this.hideConfirmationModal();
        });

        document.getElementById('cancelButton')?.addEventListener('click', () => this.hideConfirmationModal());
    }

    async loadWorkers() {
        try {
            console.log("📋 Cargando trabajadores...");
            const workersRef = window.collection(window.db, `artifacts/${window.appIdForPath}/users/${window.ADMIN_UID}/workers`);
            
            window.onSnapshot(window.query(workersRef, window.orderBy('apellidos', 'asc')), (snapshot) => {
                this.allWorkers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.displayWorkers();
                this.updateStats();
                console.log(`📋 Cargados ${this.allWorkers.length} trabajadores`);
            }, (error) => {
                console.error("❌ Error cargando trabajadores:", error);
                this.showMessage(`Error al cargar trabajadores: ${error.message}`, 'error');
            });
        } catch (error) {
            console.error("❌ Error configurando listener:", error);
            this.showMessage(`Error de configuración: ${error.message}`, 'error');
        }
    }

    calculateCompliance(worker) {
        let total = 0;
        let completed = 0;

        // Documentos básicos (5 puntos cada uno)
        const basicDocs = ['contrato', 'anexo', 'riohs', 'reec', 'entregaEpp'];
        basicDocs.forEach(doc => {
            total += 5;
            if (worker[doc]) completed += 5;
        });

        // Certificaciones (10 puntos cada una)
        this.certifications.forEach(cert => {
            if (cert.hasDate) {
                total += 10;
                const status = worker[`${cert.key}Status`];
                if (status === 'Vigente') {
                    completed += 10;
                } else if (status === 'Por Vencer') {
                    completed += 7;
                } else if (status === 'No Aplica') {
                    total -= 10; // No se cuenta para el total
                }
            } else {
                // Para capacitaciones sin fecha, solo verificar si está completado
                total += 5;
                if (worker[`${cert.key}Completed`]) completed += 5;
            }
        });

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    getComplianceLevel(percentage) {
        if (percentage >= 80) return 'high';
        if (percentage >= 60) return 'medium';
        return 'low';
    }

    displayWorkers() {
        const container = document.getElementById('workersContainer');
        if (!container) return;

        let filteredWorkers = [...this.allWorkers];

        // Aplicar filtros
        const searchTerm = document.getElementById('searchWorkerInput')?.value.toLowerCase().trim();
        const complianceLevel = document.getElementById('complianceFilter')?.value;

        if (searchTerm) {
            filteredWorkers = filteredWorkers.filter(worker => 
                `${worker.nombres} ${worker.apellidos}`.toLowerCase().includes(searchTerm) ||
                worker.rut?.toLowerCase().includes(searchTerm) ||
                worker.cargo?.toLowerCase().includes(searchTerm)
            );
        }

        if (complianceLevel) {
            filteredWorkers = filteredWorkers.filter(worker => {
                const compliance = this.calculateCompliance(worker);
                return this.getComplianceLevel(compliance) === complianceLevel;
            });
        }

        if (filteredWorkers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay trabajadores</h3>
                    <p class="text-gray-500 dark:text-gray-400">
                        ${searchTerm || complianceLevel ? 'No se encontraron trabajadores que coincidan con los filtros.' : 'Comience agregando el primer trabajador al sistema.'}
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredWorkers.map(worker => {
            const compliance = this.calculateCompliance(worker);
            const complianceLevel = this.getComplianceLevel(compliance);
            
            return `
                <div class="worker-card ${complianceLevel}-compliance bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center mb-2">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                    ${worker.nombres} ${worker.apellidos}
                                </h3>
                                <span class="ml-3 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                    ${worker.cargo}
                                </span>
                            </div>
                            
                            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                RUT: ${worker.rut}
                            </p>
                            
                            <div class="flex items-center mb-4">
                                <span class="compliance-indicator compliance-${complianceLevel}"></span>
                                <span class="text-sm font-medium">Cumplimiento: ${compliance}%</span>
                                <div class="ml-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div class="progress-bar h-2 rounded-full ${complianceLevel === 'high' ? 'bg-green-500' : complianceLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}" 
                                         style="width: ${compliance}%"></div>
                                </div>
                            </div>
                            
                            <div class="flex flex-wrap gap-2 mb-4">
                                ${this.certifications.slice(0, 4).map(cert => {
                                    const status = worker[`${cert.key}Status`] || (worker[`${cert.key}Completed`] ? 'Completado' : 'Pendiente');
                                    const statusClass = this.getStatusClass(status);
                                    return `<span class="px-2 py-1 text-xs rounded ${statusClass}">${cert.name}: ${status}</span>`;
                                }).join('')}
                            </div>
                        </div>
                        
                        <div class="flex flex-col space-y-2 ml-4">
                            <button onclick="personalManager.editWorker('${worker.id}')" class="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
                                Editar
                            </button>
                            <button onclick="personalManager.viewDocuments('${worker.id}')" class="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors">
                                Documentos
                            </button>
                            <button onclick="personalManager.deleteWorker('${worker.id}', '${worker.nombres} ${worker.apellidos}')" class="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusClass(status) {
        const statusMap = {
            'Vigente': 'status-vigente',
            'Vencido': 'status-vencido',
            'Por Vencer': 'status-por-vencer',
            'No Aplica': 'status-no-aplica',
            'Prohibición': 'status-prohibicion',
            'Completado': 'status-vigente',
            'Pendiente': 'status-vencido'
        };
        return statusMap[status] || 'status-no-aplica';
    }

    updateStats() {
        const highCount = this.allWorkers.filter(w => this.getComplianceLevel(this.calculateCompliance(w)) === 'high').length;
        const mediumCount = this.allWorkers.filter(w => this.getComplianceLevel(this.calculateCompliance(w)) === 'medium').length;
        const lowCount = this.allWorkers.filter(w => this.getComplianceLevel(this.calculateCompliance(w)) === 'low').length;

        document.getElementById('highComplianceCount').textContent = highCount;
        document.getElementById('mediumComplianceCount').textContent = mediumCount;
        document.getElementById('lowComplianceCount').textContent = lowCount;
        document.getElementById('totalWorkers').textContent = this.allWorkers.length;
    }

    async handleWorkerSubmit(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = this.isEditMode ? 'Actualizando...' : 'Guardando...';

        try {
            const workerData = await this.collectFormData();
            const workersRef = window.collection(window.db, `artifacts/${window.appIdForPath}/users/${window.ADMIN_UID}/workers`);

            if (this.isEditMode && this.editingWorkerId) {
                await window.updateDoc(window.doc(workersRef, this.editingWorkerId), {
                    ...workerData,
                    updatedAt: window.Timestamp.now()
                });
                this.showMessage('Trabajador actualizado correctamente', 'success');
            } else {
                await window.addDoc(workersRef, {
                    ...workerData,
                    createdAt: window.Timestamp.now(),
                    updatedAt: window.Timestamp.now()
                });
                this.showMessage('Trabajador agregado correctamente', 'success');
            }

            this.resetForm();
            document.getElementById('addWorkerSection').classList.add('hidden');

        } catch (error) {
            console.error('Error guardando trabajador:', error);
            this.showMessage(`Error al guardar: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async collectFormData() {
        const data = {
            rut: document.getElementById('workerRut').value.trim(),
            nombres: document.getElementById('workerNombres').value.trim(),
            apellidos: document.getElementById('workerApellidos').value.trim(),
            cargo: document.getElementById('workerCargo').value,
            
            // Documentos básicos
            contrato: document.getElementById('contrato').checked,
            anexo: document.getElementById('anexo').checked,
            riohs: document.getElementById('riohs').checked,
            reec: document.getElementById('reec').checked,
            entregaEpp: document.getElementById('entregaEpp').checked,
        };

        // Certificaciones
        for (const cert of this.certifications) {
            if (cert.hasDate) {
                data[`${cert.key}Status`] = document.getElementById(`${cert.key}Status`).value;
                
                const dateValue = document.getElementById(`${cert.key}Date`).value;
                if (dateValue) {
                    data[`${cert.key}Date`] = window.Timestamp.fromDate(new Date(dateValue));
                }
                
                if (cert.hasVencimiento) {
                    const expiryValue = document.getElementById(`${cert.key}Expiry`).value;
                    if (expiryValue) {
                        data[`${cert.key}Expiry`] = window.Timestamp.fromDate(new Date(expiryValue));
                    }
                }
            } else {
                // Para capacitaciones sin fecha
                data[`${cert.key}Completed`] = document.getElementById(`${cert.key}Completed`).checked;
            }

            // Subir archivo si hay uno
            const fileInput = document.getElementById(`${cert.key}File`);
            if (fileInput && fileInput.files[0]) {
                try {
                    const uploadedUrl = await this.uploadFile(fileInput.files[0]);
                    data[`${cert.key}Document`] = uploadedUrl;
                } catch (error) {
                    console.error(`Error subiendo archivo para ${cert.name}:`, error);
                }
            }
        }

        return data;
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', this.CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${this.CLOUDINARY_CLOUD_NAME}/raw/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error en la subida: ${response.statusText}`);
        }

        const data = await response.json();
        return data.secure_url;
    }

    selectFile(certKey) {
        const fileInput = document.getElementById(`${certKey}File`);
        fileInput.click();
        
        fileInput.onchange = () => {
            const fileName = fileInput.files[0]?.name;
            const fileNameSpan = document.getElementById(`${certKey}FileName`);
            if (fileNameSpan && fileName) {
                fileNameSpan.textContent = fileName;
                fileNameSpan.className = 'text-xs text-green-600';
            }
        };
    }

    resetForm() {
        this.isEditMode = false;
        this.editingWorkerId = null;
        document.getElementById('addWorkerForm').reset();
        document.getElementById('cancelEditBtn').classList.add('hidden');
        document.getElementById('submitButtonText').textContent = 'Agregar Trabajador';
        document.getElementById('editingWorkerId').value = '';
        
        // Limpiar nombres de archivos
        this.certifications.forEach(cert => {
            const fileNameSpan = document.getElementById(`${cert.key}FileName`);
            if (fileNameSpan) fileNameSpan.textContent = '';
        });
    }

    filterWorkers() {
        this.displayWorkers();
    }

    editWorker(workerId) {
        const worker = this.allWorkers.find(w => w.id === workerId);
        if (!worker) return;

        this.isEditMode = true;
        this.editingWorkerId = workerId;

        // Rellenar formulario
        document.getElementById('workerRut').value = worker.rut || '';
        document.getElementById('workerNombres').value = worker.nombres || '';
        document.getElementById('workerApellidos').value = worker.apellidos || '';
        document.getElementById('workerCargo').value = worker.cargo || '';

        // Documentos básicos
        document.getElementById('contrato').checked = worker.contrato || false;
        document.getElementById('anexo').checked = worker.anexo || false;
        document.getElementById('riohs').checked = worker.riohs || false;
        document.getElementById('reec').checked = worker.reec || false;
        document.getElementById('entregaEpp').checked = worker.entregaEpp || false;

        // Certificaciones
        this.certifications.forEach(cert => {
            if (cert.hasDate) {
                const statusSelect = document.getElementById(`${cert.key}Status`);
                if (statusSelect) statusSelect.value = worker[`${cert.key}Status`] || '';

                const dateInput = document.getElementById(`${cert.key}Date`);
                if (dateInput && worker[`${cert.key}Date`]) {
                    const date = worker[`${cert.key}Date`].toDate();
                    dateInput.value = date.toISOString().split('T')[0];
                }

                if (cert.hasVencimiento) {
                    const expiryInput = document.getElementById(`${cert.key}Expiry`);
                    if (expiryInput && worker[`${cert.key}Expiry`]) {
                        const date = worker[`${cert.key}Expiry`].toDate();
                        expiryInput.value = date.toISOString().split('T')[0];
                    }
                }
            } else {
                const completedCheckbox = document.getElementById(`${cert.key}Completed`);
                if (completedCheckbox) completedCheckbox.checked = worker[`${cert.key}Completed`] || false;
            }

            // Mostrar nombre de archivo si existe
            if (worker[`${cert.key}Document`]) {
                const fileNameSpan = document.getElementById(`${cert.key}FileName`);
                if (fileNameSpan) {
                    fileNameSpan.textContent = 'Archivo cargado';
                    fileNameSpan.className = 'text-xs text-green-600';
                }
            }
        });

        document.getElementById('cancelEditBtn').classList.remove('hidden');
        document.getElementById('submitButtonText').textContent = 'Actualizar Trabajador';
        document.getElementById('addWorkerSection').classList.remove('hidden');
        
        // Scroll al formulario
        document.getElementById('addWorkerSection').scrollIntoView({ behavior: 'smooth' });
    }

    viewDocuments(workerId) {
        const worker = this.allWorkers.find(w => w.id === workerId);
        if (!worker) return;

        document.getElementById('modalWorkerInfo').textContent = 
            `${worker.nombres} ${worker.apellidos} - ${worker.cargo} - RUT: ${worker.rut}`;

        const documentsContent = document.getElementById('documentsContent');
        const compliance = this.calculateCompliance(worker);
        const complianceLevel = this.getComplianceLevel(compliance);

        documentsContent.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 class="font-semibold mb-3">Resumen de Cumplimiento</h4>
                    <div class="flex items-center mb-2">
                        <span class="w-3 h-3 rounded-full inline-block mr-2 ${complianceLevel === 'high' ? 'bg-green-500' : complianceLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}"></span>
                        <span class="font-medium">${compliance}% de cumplimiento</span>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div class="h-2 rounded-full ${complianceLevel === 'high' ? 'bg-green-500' : complianceLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}" 
                             style="width: ${compliance}%"></div>
                    </div>
                </div>
                
                ${this.certifications.map(cert => {
                    const status = worker[`${cert.key}Status`] || (worker[`${cert.key}Completed`] ? 'Completado' : 'Sin definir');
                    const hasDocument = worker[`${cert.key}Document`];
                    const date = worker[`${cert.key}Date`] ? worker[`${cert.key}Date`].toDate().toLocaleDateString('es-CL') : 'No definida';
                    const expiry = worker[`${cert.key}Expiry`] ? worker[`${cert.key}Expiry`].toDate().toLocaleDateString('es-CL') : 'No definida';
                    
                    return `
                        <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="font-medium">${cert.name}</h5>
                                <span class="px-2 py-1 text-xs rounded ${this.getStatusClass(status)}">${status}</span>
                            </div>
                            ${cert.hasDate ? `
                                <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    <p>Fecha: ${date}</p>
                                    ${cert.hasVencimiento ? `<p>Vencimiento: ${expiry}</p>` : ''}
                                </div>
                            ` : ''}
                            ${hasDocument ? `
                                <div class="mt-2">
                                    <a href="${worker[`${cert.key}Document`]}" target="_blank" 
                                       class="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        Ver Documento
                                    </a>
                                </div>
                            ` : '<p class="text-xs text-gray-500 mt-2">Sin documento adjunto</p>'}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        document.getElementById('documentsModal').classList.remove('hidden');
    }

    deleteWorker(workerId, workerName) {
        this.showConfirmationModal(
            `¿Estás seguro de que quieres eliminar a ${workerName}? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    const workersRef = window.collection(window.db, `artifacts/${window.appIdForPath}/users/${window.ADMIN_UID}/workers`);
                    await window.deleteDoc(window.doc(workersRef, workerId));
                    this.showMessage('Trabajador eliminado correctamente', 'success');
                } catch (error) {
                    console.error('Error eliminando trabajador:', error);
                    this.showMessage(`Error al eliminar: ${error.message}`, 'error');
                }
            }
        );
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;
        
        container.textContent = message;
        const classes = {
            success: 'bg-green-100 text-green-700 border-green-200',
            error: 'bg-red-100 text-red-700 border-red-200',
            warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            info: 'bg-blue-100 text-blue-700 border-blue-200'
        };
        
        container.className = `p-4 mb-6 text-sm rounded-lg border ${classes[type] || classes.info}`;
        container.classList.remove('hidden');
        
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }

    showConfirmationModal(message, callback) {
        document.getElementById('confirmationMessage').textContent = message;
        this.confirmCallback = callback;
        document.getElementById('confirmationModal').classList.remove('hidden');
    }

    hideConfirmationModal() {
        document.getElementById('confirmationModal').classList.add('hidden');
        this.confirmCallback = null;
    }
}

// Inicializar el manager cuando el DOM esté listo
let personalManager;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("📋 Inicializando gestión de personal");
    personalManager = new PersonalManager();
    await personalManager.init();
});

// Hacer el manager disponible globalmente para los eventos onclick
window.personalManager = personalManager;