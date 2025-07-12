        // Lista de riesgos potenciales
        const riesgosPotenciales = [
            "Atrapado por objeto en movimiento",
            "Atrapado entre objetos",
            "Caída a mismo nivel",
            "Caída a distinto nivel", 
            "Caída de objetos",
            "Contacto con electricidad",
            "Contacto con sustancias químicas",
            "Contacto con superficies calientes",
            "Contacto con superficies frías",
            "Cortes y laceraciones",
            "Exposición a ruido",
            "Exposición a vibraciones",
            "Exposición a radiaciones",
            "Exposición a temperatura extrema",
            "Golpes contra objetos",
            "Golpes por objetos",
            "Incendio",
            "Explosión",
            "Intoxicación por gases",
            "Lesiones ergonómicas",
            "Proyección de partículas",
            "Sobreesfuerzo físico",
            "Contacto con herramientas cortantes",
            "Pisadas sobre objetos",
            "Contacto con materiales abrasivos"
        ];

        // Inicializar fecha y hora actual
        function setCurrentDateTime() {
            const now = new Date();
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Santiago'
            };
            document.getElementById('fechaHoraActual').textContent = now.toLocaleDateString('es-CL', options);
        }

        // --- Lógica para los Canvas de Firma ---
        function setupSignaturePad(canvasId) {
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            let drawing = false;

            function resizeCanvas() {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }
            
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            function getMousePos(evt) {
                const rect = canvas.getBoundingClientRect();
                return {
                    x: evt.clientX - rect.left,
                    y: evt.clientY - rect.top
                };
            }
            
            function getTouchPos(evt) {
                const rect = canvas.getBoundingClientRect();
                return {
                    x: evt.touches[0].clientX - rect.left,
                    y: evt.touches[0].clientY - rect.top
                };
            }

            function startDrawing(e) {
                drawing = true;
                const pos = e.type.includes('touch') ? getTouchPos(e) : getMousePos(e);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            }

            function draw(e) {
                if (!drawing) return;
                e.preventDefault();
                const pos = e.type.includes('touch') ? getTouchPos(e) : getMousePos(e);
                ctx.lineTo(pos.x, pos.y);
                ctx.strokeStyle = '#1e40af';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            }

            function stopDrawing() {
                drawing = false;
                ctx.closePath();
            }

            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseleave', stopDrawing);
            
            canvas.addEventListener('touchstart', startDrawing);
            canvas.addEventListener('touchmove', draw);
            canvas.addEventListener('touchend', stopDrawing);
        }

        window.clearSignature = function(canvasId) {
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // --- Lógica para documentos adicionales ---
        let documentoCount = 0;
        document.getElementById('add-documento-button').addEventListener('click', function() {
            documentoCount++;
            const docDiv = document.createElement('div');
            docDiv.className = 'form-grid form-grid-2';
            docDiv.style.marginTop = '1rem';
            docDiv.style.padding = '1rem';
            docDiv.style.border = '1px solid var(--neutral-200)';
            docDiv.style.borderRadius = '8px';
            docDiv.style.background = 'var(--neutral-50)';
            docDiv.style.position = 'relative';
            docDiv.innerHTML = `
                <div>
                    <label class="form-label">Tipo de Documento</label>
                    <select name="tipoDocumento_adicional_${documentoCount}" class="form-select">
                        <option value="">Seleccione tipo de documento...</option>
                        <option value="procedimiento">Procedimiento</option>
                        <option value="instructivo">Instructivo</option>
                        <option value="otro">Otro</option>
                        <option value="no_requiere">No requiere</option>
                    </select>
                </div>
                <div>
                    <label class="form-label">Nombre o Código del Documento</label>
                    <input type="text" name="nombreCodigo_adicional_${documentoCount}" class="form-input" placeholder="Ingrese nombre o código del documento">
                </div>
                <button type="button" class="btn btn-danger remove-documento-btn" style="position: absolute; top: 8px; right: 8px; padding: 0.25rem 0.5rem; font-size: 0.75rem;">&times;</button>
            `;
            document.getElementById('documentos-adicionales').appendChild(docDiv);
        });

        document.getElementById('documentos-adicionales').addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-documento-btn')) {
                e.target.closest('div').remove();
            }
        });

        // --- Lógica para EPP adicionales ---
        let eppCount = 0;
        document.getElementById('add-epp-button').addEventListener('click', function() {
            eppCount++;
            const eppDiv = document.createElement('div');
            eppDiv.className = 'form-grid form-grid-2';
            eppDiv.style.marginTop = '1rem';
            eppDiv.style.padding = '1rem';
            eppDiv.style.border = '1px solid var(--neutral-200)';
            eppDiv.style.borderRadius = '8px';
            eppDiv.style.background = 'var(--neutral-50)';
            eppDiv.style.position = 'relative';
            eppDiv.innerHTML = `
                <div>
                    <input type="text" placeholder="Nombre del Elemento" name="epp_adicional_${eppCount}" class="form-input" required>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="epp_adicional_check_${eppCount}" name="epp_adicional_check_${eppCount}" style="width: 1rem; height: 1rem; accent-color: var(--primary-color);">
                    <label for="epp_adicional_check_${eppCount}" class="form-label" style="margin: 0;">Usar</label>
                </div>
                <button type="button" class="btn btn-danger remove-epp-btn" style="position: absolute; top: 8px; right: 8px; padding: 0.25rem 0.5rem; font-size: 0.75rem;">&times;</button>
            `;
            document.getElementById('epp-adicionales').appendChild(eppDiv);
        });

        document.getElementById('epp-adicionales').addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-epp-btn')) {
                e.target.closest('div').remove();
            }
        });

        // ====================================================================
        // JAVASCRIPT PARA MANEJO DE PERSONAL MEJORADO
        // ====================================================================

        let personalCount = 0;
        const useCardLayout = true; // Cambiar a false para usar tabla

        // Función para crear una nueva tarjeta de personal
        function createPersonalCard() {
            personalCount++;
            const cardDiv = document.createElement('div');
            cardDiv.className = 'personal-card personal-card-enter';
            cardDiv.setAttribute('data-personal-id', personalCount);
            
            cardDiv.innerHTML = `
                <div class="personal-card-header">
                    <h4 class="personal-card-title">Persona ${personalCount}</h4>
                    <button type="button" class="personal-remove-btn" onclick="removePersonalCard(${personalCount})">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="personal-card-content">
                    <div class="personal-field">
                        <label for="personal_nombre_${personalCount}">Nombre Completo *</label>
                        <input 
                            type="text" 
                            id="personal_nombre_${personalCount}"
                            name="personal_nombre_${personalCount}" 
                            placeholder="Nombre y Apellido"
                            required
                        >
                    </div>
                    
                    <div class="personal-field">
                        <label for="personal_rut_${personalCount}">RUT *</label>
                        <input 
                            type="text" 
                            id="personal_rut_${personalCount}"
                            name="personal_rut_${personalCount}" 
                            placeholder="12.345.678-9"
                            required
                        >
                    </div>
                    
                    <div class="personal-signature-area">
                        <label class="personal-signature-label">Firma Digital</label>
                        <div class="personal-signature-container" id="signature-container-${personalCount}">
                            <canvas 
                                id="firma-personal-${personalCount}" 
                                class="personal-signature-canvas"
                            ></canvas>
                            <div class="personal-signature-placeholder" id="placeholder-${personalCount}">
                                Haga clic aquí para firmar
                            </div>
                            <button 
                                type="button" 
                                class="personal-signature-clear" 
                                onclick="clearPersonalSignature(${personalCount})"
                                style="display: none;"
                                id="clear-btn-${personalCount}"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            return cardDiv;
        }

        // Función para crear fila de tabla (versión alternativa)
        function createPersonalRow() {
            personalCount++;
            const row = document.createElement('tr');
            row.setAttribute('data-personal-id', personalCount);
            
            row.innerHTML = `
                <td>
                    <input 
                        type="text" 
                        placeholder="Nombre y Apellido" 
                        name="personal_nombre_${personalCount}" 
                        class="form-input" 
                        required
                    >
                </td>
                <td>
                    <input 
                        type="text" 
                        placeholder="12.345.678-9" 
                        name="personal_rut_${personalCount}" 
                        class="form-input" 
                        required
                    >
                </td>
                <td>
                    <div class="table-signature-container">
                        <canvas id="firma-personal-${personalCount}" class="personal-signature-canvas"></canvas>
                        <button 
                            type="button" 
                            onclick="clearPersonalSignature(${personalCount})" 
                            class="personal-signature-clear"
                            style="display: none;"
                            id="clear-btn-${personalCount}"
                        >
                            ×
                        </button>
                    </div>
                </td>
                <td style="text-align: center;">
                    <button 
                        type="button" 
                        class="btn btn-danger remove-personal-button" 
                        onclick="removePersonalRow(${personalCount})"
                        style="padding: 0.5rem;"
                    >
                        ×
                    </button>
                </td>
            `;
            
            return row;
        }

        // Función para añadir personal
        function addPersonal() {
            if (useCardLayout) {
                const container = document.getElementById('personal-cards-container');
                const card = createPersonalCard();
                container.appendChild(card);
            } else {
                const tbody = document.getElementById('personal-table-body');
                const row = createPersonalRow();
                tbody.appendChild(row);
            }
            
            // Configurar canvas de firma después de un breve delay
            setTimeout(() => {
                setupPersonalSignaturePad(`firma-personal-${personalCount}`);
            }, 100);
        }

        // Función para remover tarjeta de personal
        function removePersonalCard(personalId) {
            const card = document.querySelector(`[data-personal-id="${personalId}"]`);
            if (card) {
                card.classList.add('personal-card-remove');
                setTimeout(() => {
                    card.remove();
                }, 300);
            }
        }

        // Función para remover fila de personal
        function removePersonalRow(personalId) {
            const row = document.querySelector(`[data-personal-id="${personalId}"]`);
            if (row) {
                row.remove();
            }
        }

        // Función para configurar canvas de firma personal
        function setupPersonalSignaturePad(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const personalId = canvasId.split('-')[2];
            const container = document.getElementById(`signature-container-${personalId}`);
            const placeholder = document.getElementById(`placeholder-${personalId}`);
            const clearBtn = document.getElementById(`clear-btn-${personalId}`);
            
            let drawing = false;
            let hasSignature = false;

            function resizeCanvas() {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
            }
            
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            function getEventPos(evt) {
                const rect = canvas.getBoundingClientRect();
                const clientX = evt.clientX || (evt.touches && evt.touches[0].clientX);
                const clientY = evt.clientY || (evt.touches && evt.touches[0].clientY);
                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top
                };
            }

            function startDrawing(e) {
                drawing = true;
                const pos = getEventPos(e);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                
                if (!hasSignature) {
                    hasSignature = true;
                    placeholder.style.display = 'none';
                    clearBtn.style.display = 'block';
                    container.classList.add('has-signature');
                }
            }

            function draw(e) {
                if (!drawing) return;
                e.preventDefault();
                const pos = getEventPos(e);
                ctx.lineTo(pos.x, pos.y);
                ctx.strokeStyle = '#1e40af';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            }

            function stopDrawing() {
                drawing = false;
                ctx.closePath();
            }

            // Event listeners para mouse
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseleave', stopDrawing);
            
            // Event listeners para touch
            canvas.addEventListener('touchstart', startDrawing);
            canvas.addEventListener('touchmove', draw);
            canvas.addEventListener('touchend', stopDrawing);
        }

        // Función para limpiar firma personal
        function clearPersonalSignature(personalId) {
            const canvas = document.getElementById(`firma-personal-${personalId}`);
            const container = document.getElementById(`signature-container-${personalId}`);
            const placeholder = document.getElementById(`placeholder-${personalId}`);
            const clearBtn = document.getElementById(`clear-btn-${personalId}`);
            
            if (canvas && container) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                container.classList.remove('has-signature');
                if (placeholder) placeholder.style.display = 'block';
                if (clearBtn) clearBtn.style.display = 'none';
            }
        }

        // Event listener para el botón de añadir personal
        document.addEventListener('DOMContentLoaded', function() {
            const addPersonalBtn = document.getElementById('add-personal-button');
            if (addPersonalBtn) {
                addPersonalBtn.addEventListener('click', addPersonal);
            }
            
            // Mostrar el layout correcto
            if (useCardLayout) {
                document.getElementById('personal-cards-container').classList.remove('hidden');
                document.getElementById('personal-table-version').classList.add('hidden');
            } else {
                document.getElementById('personal-cards-container').classList.add('hidden');
                document.getElementById('personal-table-version').classList.remove('hidden');
            }
            
            // Agregar una persona inicial
            addPersonal();
        });

        // --- Lógica para etapas de trabajo ---
        let etapaCount = 0;
        function addEtapaRow() {
            etapaCount++;
            const etapaDiv = document.createElement('div');
            etapaDiv.style.marginBottom = '2rem';
            etapaDiv.style.padding = '1.5rem';
            etapaDiv.style.border = '1px solid var(--neutral-200)';
            etapaDiv.style.borderRadius = '12px';
            etapaDiv.style.background = 'white';
            etapaDiv.style.boxShadow = 'var(--shadow-md)';
            etapaDiv.style.position = 'relative';
            etapaDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--primary-color); margin: 0;">Etapa ${etapaCount}</h4>
                    <button type="button" class="btn btn-danger remove-etapa-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">&times;</button>
                </div>
                <div style="display: grid; gap: 1.5rem;">
                    <div>
                        <label class="form-label required-field">Descripción de la Etapa</label>
                        <textarea name="etapa_descripcion_${etapaCount}" class="form-textarea" placeholder="Describa detalladamente esta etapa del trabajo..." required></textarea>
                    </div>
                    <div>
                        <label class="form-label">Riesgos Potenciales (Seleccione todos los que apliquen)</label>
                        <div class="checkbox-group" style="max-height: 200px;">
                            ${riesgosPotenciales.map((riesgo, index) => `
                                <div class="checkbox-item">
                                    <input type="checkbox" id="riesgo_${etapaCount}_${index}" name="etapa_riesgos_${etapaCount}" value="${riesgo}">
                                    <label for="riesgo_${etapaCount}_${index}">${riesgo}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <label class="form-label required-field">Medidas de Control</label>
                        <textarea name="etapa_medidas_${etapaCount}" class="form-textarea" placeholder="Describa las medidas de control para mitigar los riesgos identificados..." required></textarea>
                    </div>
                </div>
            `;
            document.getElementById('etapas-container').appendChild(etapaDiv);
        }

        document.getElementById('etapas-container').addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-etapa-btn')) {
                e.target.closest('div').remove();
            }
        });

        document.getElementById('add-etapa-button').addEventListener('click', addEtapaRow);

       // --- Función principal de inicialización ---
function initializeFormularioAst() {
    console.log("📋 Inicializando formulario AST");
    setCurrentDateTime();
    setupSignaturePad('signature-supervisor');
    setupSignaturePad('signature-apr');
    addEtapaRow(); // Agregar una etapa inicial
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeFormularioAst);

        // --- Función auxiliar para verificar si un canvas está vacío ---
        function isCanvasEmpty(canvas) {
            const context = canvas.getContext('2d');
            const pixelBuffer = new Uint32Array(
                context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
            );
            return !pixelBuffer.some(color => color !== 0);
        }

        // --- Envío del formulario AST actualizado ---
        document.getElementById('astForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Obtener el botón de envío
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;
            
            try {
                // Recolectar datos del formulario
                const formData = new FormData(e.target);
                
                // Estructura de datos para el AST
                const astData = {
                    // Información general
                    empresa: formData.get('empresa') || 'SICE AGENCIA CHILE S.A',
                    obra_area: formData.get('obra_area') || 'Suministro de Puertas Bidireccionales de Control en 7 Estaciones de la Red de Metro.',
                    lugar: formData.get('lugar'),
                    trabajo: formData.get('trabajo'),
                    fechaHoraActual: document.getElementById('fechaHoraActual').textContent,
                    
                    // Documentos de respaldo
                    documentos: [],
                    
                    // Elementos de apoyo (EPP)
                    epp_predeterminado: [],
                    epp_adicional: [],
                    
                    // Etapas del trabajo
                    etapas: [],
                    
                    // Personal participante
                    personal: [],
                    
                    // Firmas
                    prevencionista: formData.get('prevencionista'),
                    firmaSupervisorImg: '',
                    firmaAprImg: ''
                };
                
                // --- Recolectar documentos de respaldo ---
                // Documento principal
                const tipoDocumento = formData.get('tipoDocumento');
                const nombreCodigo = formData.get('nombreCodigo');
                if (tipoDocumento || nombreCodigo) {
                    astData.documentos.push({
                        tipo: tipoDocumento,
                        nombre: nombreCodigo
                    });
                }
                
                // Documentos adicionales
                let docIndex = 1;
                while (formData.get(`tipoDocumento_adicional_${docIndex}`)) {
                    const tipo = formData.get(`tipoDocumento_adicional_${docIndex}`);
                    const nombre = formData.get(`nombreCodigo_adicional_${docIndex}`);
                    if (tipo || nombre) {
                        astData.documentos.push({ tipo, nombre });
                    }
                    docIndex++;
                }
                
                // --- Recolectar EPP predeterminados ---
                const eppCheckboxes = document.querySelectorAll('input[name="epp_predeterminado"]:checked');
                eppCheckboxes.forEach(checkbox => {
                    astData.epp_predeterminado.push(checkbox.value);
                });
                
                // --- Recolectar EPP adicionales ---
                let eppIndex = 1;
                while (formData.get(`epp_adicional_${eppIndex}`)) {
                    const nombre = formData.get(`epp_adicional_${eppIndex}`);
                    const seleccionado = formData.get(`epp_adicional_check_${eppIndex}`) === 'on';
                    if (nombre) {
                        astData.epp_adicional.push({ nombre, seleccionado });
                    }
                    eppIndex++;
                }
                
                // --- Recolectar etapas del trabajo ---
                let etapaIndex = 1;
                while (formData.get(`etapa_descripcion_${etapaIndex}`)) {
                    const descripcion = formData.get(`etapa_descripcion_${etapaIndex}`);
                    const medidas = formData.get(`etapa_medidas_${etapaIndex}`);
                    
                    // Recolectar riesgos seleccionados para esta etapa
                    const riesgos = [];
                    const riesgoCheckboxes = document.querySelectorAll(`input[name="etapa_riesgos_${etapaIndex}"]:checked`);
                    riesgoCheckboxes.forEach(checkbox => {
                        riesgos.push(checkbox.value);
                    });
                    
                    if (descripcion) {
                        astData.etapas.push({
                            descripcion,
                            riesgos,
                            medidas
                        });
                    }
                    etapaIndex++;
                }
                
                // --- Recolectar personal participante ---
                let personalIndex = 1;
                while (formData.get(`personal_nombre_${personalIndex}`)) {
                    const nombre = formData.get(`personal_nombre_${personalIndex}`);
                    const rut = formData.get(`personal_rut_${personalIndex}`);
                    
                    // Obtener firma si existe
                    let firmaImg = '';
                    const canvas = document.getElementById(`firma-personal-${personalIndex}`);
                    if (canvas && !isCanvasEmpty(canvas)) {
                        firmaImg = canvas.toDataURL();
                    }
                    
                    if (nombre || rut) {
                        astData.personal.push({ nombre, rut, firmaImg });
                    }
                    personalIndex++;
                }
                
                // --- Recolectar firmas principales ---
                const supervisorCanvas = document.getElementById('signature-supervisor');
                if (supervisorCanvas && !isCanvasEmpty(supervisorCanvas)) {
                    astData.firmaSupervisorImg = supervisorCanvas.toDataURL();
                }
                
                const aprCanvas = document.getElementById('signature-apr');
                if (aprCanvas && !isCanvasEmpty(aprCanvas)) {
                    astData.firmaAprImg = aprCanvas.toDataURL();
                }
                
                // --- Enviar a Pipedream ---
                const pipedreamUrl = "https://eo55cuzv9unsqdf.m.pipedream.net"; // Reemplaza con tu URL real
                
                const response = await fetch(pipedreamUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(astData)
                });
                
                if (response.ok) {
                    alert('¡Formulario AST enviado con éxito! El PDF se está generando.');
                    
                    // Opcional: Reset del formulario
                    // e.target.reset();
                    // clearAllSignatures();
                } else {
                    throw new Error(`Error del servidor: ${response.status}`);
                }
                
            } catch (error) {
                console.error('Error al enviar el formulario AST:', error);
                alert(`Error al enviar el formulario: ${error.message}`);
            } finally {
                // Restaurar botón
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });

        // --- Función para limpiar todas las firmas (opcional) ---
        function clearAllSignatures() {
            // Limpiar firmas principales
            ['signature-supervisor', 'signature-apr'].forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            });
            
            // Limpiar firmas de personal
            let personalIndex = 1;
            while (document.getElementById(`firma-personal-${personalIndex}`)) {
                clearPersonalSignature(personalIndex);
                personalIndex++;
            }
        }

        // --- Responsive para botones en mobile ---
        function adjustButtonsForMobile() {
            const isMobile = window.innerWidth < 768;
            const buttonContainer = document.querySelector('.form-section:last-child > div:last-child > div');
            
            if (isMobile) {
                buttonContainer.style.flexDirection = 'column';
            } else {
                buttonContainer.style.flexDirection = 'row';
                buttonContainer.style.justifyContent = 'flex-end';
            }
        }

        window.addEventListener('resize', adjustButtonsForMobile);
        window.addEventListener('load', adjustButtonsForMobile);