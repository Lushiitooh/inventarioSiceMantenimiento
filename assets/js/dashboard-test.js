// Dashboard de Prueba - Sistema de Firmas
class DashboardManagerTest {
    constructor() {
        this.pipedreamGetPendingUrl = "https://eoii4q628us7o5q.m.pipedream.net/get-pending"; // ← Cambiarás esta URL
        this.pipedreamSignUrl = "https://eoii4q628us7o5q.m.pipedream.net/sign-document"; // ← Cambiarás esta URL
        this.currentUser = null;
        this.pendingDocuments = [];
        this.signaturePad = null;
        this.currentDocument = null;
        
        this.init();
    }

    async init() {
        // Verificar autenticación
        if (!requireAuth()) {
            return;
        }

        // Obtener datos del usuario actual
        this.currentUser = window.authManagerTest.getCurrentUser();
        this.updateUserInfo();

        // Configurar signature pad
        this.setupSignaturePad();

        // Cargar documentos pendientes
        await this.loadPendingDocuments();

        // Mostrar botón de crear checklist si es trabajador
        if (this.currentUser.rol === 'trabajador') {
            document.getElementById('createChecklistBtn').classList.remove('hidden');
        }
    }

    updateUserInfo() {
        document.getElementById('userName').textContent = this.currentUser.nombre;
        document.getElementById('userRole').textContent = this.currentUser.rol;
    }

    setupSignaturePad() {
        const canvas = document.getElementById('signaturePad');
        if (canvas && typeof SignaturePad !== 'undefined') {
            this.signaturePad = new SignaturePad(canvas, {
                backgroundColor: 'rgb(255, 255, 255)',
                penColor: 'rgb(0, 0, 0)'
            });

            // Hacer el canvas responsive
            function resizeCanvas() {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext("2d").scale(ratio, ratio);
                if (this.signaturePad) {
                    this.signaturePad.clear();
                }
            }
            window.addEventListener("resize", resizeCanvas.bind(this));
            resizeCanvas.call(this);
        }
    }

    async loadPendingDocuments() {
        try {
            this.showLoading();

            // Por ahora simulamos documentos de prueba
            // Más adelante esto vendrá de Pipedream
            const mockDocuments = await this.getMockDocuments();
            
            this.pendingDocuments = mockDocuments;
            this.updateCounts();
            this.renderDocuments();
            
            this.showDocuments();

        } catch (error) {
            console.error('Error cargando documentos:', error);
            this.showError('No se pudieron cargar los documentos. Intenta nuevamente.');
        }
    }

    async getMockDocuments() {
        // Simulamos diferentes documentos según el rol del usuario
        const mockDocs = [];

        if (this.currentUser.rol === 'supervisor') {
            mockDocs.push({
                id: 'checklist_001',
                trabajador: 'Nestor Flores',
                sitio: 'Santa Julia Linea 4A',
                fecha_creacion: '2025-01-13T09:00:00Z',
                tipo: 'Inspección de Herramientas',
                estado: 'pendiente_supervisor',
                urgente: false
            });
            
            mockDocs.push({
                id: 'checklist_002',
                trabajador: 'Ronald Cancino',
                sitio: 'San Ramon Linea 4A',
                fecha_creacion: '2025-01-13T10:30:00Z',
                tipo: 'Inspección de Herramientas',
                estado: 'pendiente_supervisor',
                urgente: true
            });
        }

        if (this.currentUser.rol === 'prevencionista') {
            mockDocs.push({
                id: 'checklist_001',
                trabajador: 'Nestor Flores',
                sitio: 'Santa Julia Linea 4A',
                fecha_creacion: '2025-01-13T09:00:00Z',
                tipo: 'Inspección de Herramientas',
                estado: 'pendiente_prevencionista',
                urgente: false
            });
        }

        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return mockDocs;
    }

    updateCounts() {
        const pending = this.pendingDocuments.length;
        const completed = 0; // Por ahora
        const total = pending + completed;

        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('totalCount').textContent = total;
    }

    renderDocuments() {
        const container = document.getElementById('documentsList');
        
        if (this.pendingDocuments.length === 0) {
            container.innerHTML = '';
            document.getElementById('noDocuments').classList.remove('hidden');
            return;
        }

        document.getElementById('noDocuments').classList.add('hidden');

        container.innerHTML = this.pendingDocuments.map(doc => {
            const fechaFormatted = new Date(doc.fecha_creacion).toLocaleDateString('es-CL');
            const urgencyClass = doc.urgente ? 'bg-red-50 border-l-4 border-red-400' : '';
            const urgencyBadge = doc.urgente ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">🚨 Urgente</span>' : '';

            return `
                <div class="p-6 hover:bg-gray-50 ${urgencyClass}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <h3 class="text-sm font-medium text-gray-900">${doc.tipo}</h3>
                                ${urgencyBadge}
                            </div>
                            
                            <div class="space-y-1 text-sm text-gray-600">
                                <p><span class="font-medium">Trabajador:</span> ${doc.trabajador}</p>
                                <p><span class="font-medium">Sitio:</span> ${doc.sitio}</p>
                                <p><span class="font-medium">Fecha:</span> ${fechaFormatted}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-3">
                            <button 
                                onclick="dashboardManager.viewDocument('${doc.id}')"
                                class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                                👁️ Ver
                            </button>
                            <button 
                                onclick="dashboardManager.openSignatureModal('${doc.id}')"
                                class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            >
                                ✍️ Firmar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    viewDocument(docId) {
        const doc = this.pendingDocuments.find(d => d.id === docId);
        if (!doc) return;

        // Por ahora solo mostramos un alert con los detalles
        // Más adelante abriremos una vista completa del documento
        alert(`Documento: ${doc.tipo}\nTrabajador: ${doc.trabajador}\nSitio: ${doc.sitio}\nFecha: ${new Date(doc.fecha_creacion).toLocaleDateString('es-CL')}\n\n[En la implementación final, aquí se mostrará el documento completo]`);
    }

    openSignatureModal(docId) {
        const doc = this.pendingDocuments.find(d => d.id === docId);
        if (!doc) return;

        this.currentDocument = doc;
        
        // Mostrar detalles del documento en el modal
        document.getElementById('documentContent').innerHTML = `
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="font-medium text-gray-900 mb-3">${doc.tipo}</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="font-medium text-gray-700">Trabajador:</span>
                        <span class="text-gray-600">${doc.trabajador}</span>
                    </div>
                    <div>
                        <span class="font-medium text-gray-700">Sitio:</span>
                        <span class="text-gray-600">${doc.sitio}</span>
                    </div>
                    <div>
                        <span class="font-medium text-gray-700">Fecha:</span>
                        <span class="text-gray-600">${new Date(doc.fecha_creacion).toLocaleDateString('es-CL')}</span>
                    </div>
                    <div>
                        <span class="font-medium text-gray-700">Estado:</span>
                        <span class="text-yellow-600">Pendiente de firma</span>
                    </div>
                </div>
            </div>
        `;

        // Limpiar firma anterior
        if (this.signaturePad) {
            this.signaturePad.clear();
        }

        // Mostrar modal
        document.getElementById('signatureModal').classList.remove('hidden');
    }

    async submitSignature() {
        if (!this.currentDocument || !this.signaturePad) return;

        if (this.signaturePad.isEmpty()) {
            alert('Por favor, dibuja tu firma antes de continuar.');
            return;
        }

        const submitBtn = document.getElementById('submitSignatureBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';

        try {
            // Obtener datos de la firma
            const signatureData = this.signaturePad.toDataURL();
            
            // Por ahora solo simulamos el envío
            // Más adelante enviaremos a Pipedream
            await this.processSignature(this.currentDocument.id, signatureData);
            
            // Cerrar modal
            this.closeSignatureModal();
            
            // Mostrar éxito
            this.showSuccess('¡Documento firmado exitosamente!');
            
            // Recargar documentos
            await this.loadPendingDocuments();

        } catch (error) {
            console.error('Error procesando firma:', error);
            alert('Error al procesar la firma. Intenta nuevamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Firmar Documento';
        }
    }

    async processSignature(docId, signatureData) {
        // Simular procesamiento
        console.log(`Procesando firma para documento ${docId}`);
        console.log('Firma capturada:', signatureData.substring(0, 50) + '...');
        
        // Simular delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Remover documento de la lista (simulando que ya fue firmado)
        this.pendingDocuments = this.pendingDocuments.filter(doc => doc.id !== docId);
        
        return { success: true };
    }

    closeSignatureModal() {
        document.getElementById('signatureModal').classList.add('hidden');
        this.currentDocument = null;
    }

    clearSignature() {
        if (this.signaturePad) {
            this.signaturePad.clear();
        }
    }

    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('errorState').classList.add('hidden');
        document.getElementById('documentsSection').classList.add('hidden');
    }

    showDocuments() {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('errorState').classList.add('hidden');
        document.getElementById('documentsSection').classList.remove('hidden');
    }

    showError(message) {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorState').classList.remove('hidden');
        document.getElementById('documentsSection').classList.add('hidden');
    }

    showSuccess(message) {
        // Crear y mostrar mensaje de éxito temporal
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <span class="mr-2">✅</span>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(successDiv);

        // Remover después de 3 segundos
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Crear instancia global
const dashboardManager = new DashboardManagerTest();

// Funciones globales para el HTML
window.closeSignatureModal = () => dashboardManager.closeSignatureModal();
window.clearSignature = () => dashboardManager.clearSignature();
window.submitSignature = () => dashboardManager.submitSignature();

console.log("✅ Dashboard manager de prueba cargado");