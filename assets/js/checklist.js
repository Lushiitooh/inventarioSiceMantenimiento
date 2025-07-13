// No importar Firebase aquí ya que se maneja en el HTML
// import { db } from './firebase-config.js'; 
// import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function initializeChecklistPage() {
    console.log("✅ Inicializando página de checklist");

    // --- Lógica del Formulario (Actualizada) ---
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInspeccion').value = today;
    document.getElementById('fechaRealizo').value = today;
    document.getElementById('fechaReviso').value = today;
    document.getElementById('fechaPrevencion').value = today;

    const trabajadorSelect = document.getElementById('trabajador');
    const nombreRealizo = document.getElementById('nombreRealizo');
    trabajadorSelect.addEventListener('change', function() {
        nombreRealizo.textContent = this.value || 'Nombre del Trabajador';
    });
    
    // --- Carga de Herramientas Predeterminadas ---
    const herramientas = [
        "Caja Herramientas negra", "Juego de Dados 36 piezas", "Alicate Universal", 
        "Alicate Punta", "Alicate Cortante", "Caiman", "Flexometro", "Juego de dados", 
        "Atornillador de Paleta aislado 1,2x6,5x150mm", "Atornillador de Paleta aislado 1,0x5,5x125mm", 
        "Atornillador de Paleta aislado 0,8x4,0x100mm", "Atornillador de Paleta aislado 0,4x2,5x75mm", 
        "Atornillador de cruz aislado PH2x100mm", "Atornillador de cruz aislado PH1x80mm", 
        "Atornillador de cruz aislado PH0x75mm", "Crimpeadora", "Ventosa para pisos tecnicos", "Martillo"
    ];

    const tbody = document.getElementById('herramientasTableBody');
    herramientas.forEach((herramienta, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border border-gray-200 dark:border-gray-700';
        tr.innerHTML = `
            <td data-label="Ítem" class="p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">1.${index + 1}</td>
            <td data-label="Herramienta" class="p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">${herramienta}</td>
            <td data-label="Estado (B/M/N/A)" class="p-2 text-center border border-gray-300 dark:border-gray-600">
                <div class="flex justify-center items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                    <label class="flex items-center cursor-pointer"><input type="radio" name="estado_${index}" value="Bueno" required class="mr-1"> B</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="estado_${index}" value="Malo" class="mr-1"> M</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="estado_${index}" value="N/A" class="mr-1"> N/A</label>
                </div>
            </td>
            <td data-label="Color Mes (Sí/No)" class="p-2 text-center border border-gray-300 dark:border-gray-600">
                <div class="flex justify-center items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                    <label class="flex items-center cursor-pointer"><input type="radio" name="color_${index}" value="Si" required class="mr-1"> Sí</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="color_${index}" value="No" class="mr-1"> No</label>
                </div>
            </td>
            <td data-label="Observaciones" class="p-2 border border-gray-300 dark:border-gray-600"><input type="text" name="obs_${index}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"></td>
        `;
        tbody.appendChild(tr);
    });

    // --- Lógica para "Agregar Otra Herramienta" ---
    const addToolBtn = document.getElementById('add-tool-btn');
    const otrasContainer = document.getElementById('otras-herramientas-container');
    let otherToolIndex = 0;

    addToolBtn.addEventListener('click', () => {
        otherToolIndex++;
        const toolDiv = document.createElement('div');
        toolDiv.className = 'grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 border rounded-lg border-gray-300 dark:border-gray-600 items-center';
        toolDiv.innerHTML = `
            <div class="sm:col-span-4">
                <input type="text" name="otraHerramientaNombre_${otherToolIndex}" placeholder="Nombre de la herramienta" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm" required>
            </div>
            <div class="sm:col-span-3">
                 <div class="flex justify-center items-center space-x-2 text-xs sm:text-sm">
                    <label class="flex items-center cursor-pointer"><input type="radio" name="otraHerramientaEstado_${otherToolIndex}" value="Bueno" required class="mr-1"> B</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="otraHerramientaEstado_${otherToolIndex}" value="Malo" class="mr-1"> M</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="otraHerramientaEstado_${otherToolIndex}" value="N/A" class="mr-1"> N/A</label>
                </div>
            </div>
            <div class="sm:col-span-2">
                <div class="flex justify-center items-center space-x-2 text-xs sm:text-sm">
                    <label class="flex items-center cursor-pointer"><input type="radio" name="otraHerramientaColor_${otherToolIndex}" value="Si" required class="mr-1"> Sí</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="otraHerramientaColor_${otherToolIndex}" value="No" class="mr-1"> No</label>
                </div>
            </div>
            <div class="sm:col-span-2">
                <input type="text" name="otraHerramientaObs_${otherToolIndex}" placeholder="Observación" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm">
            </div>
            <div class="sm:col-span-1 text-right">
                <button type="button" class="remove-tool-btn p-2 text-red-500 hover:text-red-700">&times;</button>
            </div>
        `;
        otrasContainer.appendChild(toolDiv);
    });
    
    otrasContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-tool-btn')) {
            e.target.closest('.grid').remove();
        }
    });

    // --- Lógica para "Plan de Acción" ---
    const planContainer = document.getElementById('plan-accion-container');
    for (let i = 0; i < 3; i++) {
        const planDiv = document.createElement('div');
        planDiv.className = 'grid grid-cols-1 sm:grid-cols-3 gap-4';
        planDiv.innerHTML = `
            <div>
                <label class="sr-only">Plan ${i+1}</label>
                <input type="text" name="planAccion_${i}" placeholder="Plan de Acción ${i+1}" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            </div>
            <div>
                <label class="sr-only">Fecha Plan ${i+1}</label>
                <input type="date" name="fechaPlan_${i}" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            </div>
            <div>
                <label class="sr-only">Responsable ${i+1}</label>
                <input type="text" name="responsablePlan_${i}" placeholder="Responsable ${i+1}" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            </div>
        `;
        planContainer.appendChild(planDiv);
    }

    // --- Configuración de Firmas ---
    function setupSignaturePad(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} no encontrado`);
            return null;
        }

        // Verificar que SignaturePad esté disponible
        if (typeof SignaturePad === 'undefined') {
            console.error('SignaturePad no está cargado');
            return null;
        }

        const signaturePad = new SignaturePad(canvas, { 
            backgroundColor: 'rgb(249, 250, 251)',
            penColor: 'rgb(0, 0, 0)'
        });
        
        function resizeCanvas() {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d").scale(ratio, ratio);
            signaturePad.clear();
        }
        
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();
        return signaturePad;
    }

    // Esperar un poco para asegurar que SignaturePad esté cargado
    setTimeout(() => {
        const firmaRealizo = setupSignaturePad('firmaRealizoPad');
        const firmaReviso = setupSignaturePad('firmaRevisoPad');
        const firmaPrevencion = setupSignaturePad('firmaPrevencionPad');

        document.querySelectorAll('.clear-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                if (targetId === 'firmaRealizoPad' && firmaRealizo) firmaRealizo.clear();
                if (targetId === 'firmaRevisoPad' && firmaReviso) firmaReviso.clear();
                if (targetId === 'firmaPrevencionPad' && firmaPrevencion) firmaPrevencion.clear();
            });
        });
        
        // --- Envío del Formulario ---
        document.getElementById('checklistForm').addEventListener('submit', async function(event) {
            event.preventDefault();
            const submitButton = event.currentTarget.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';

            // Recolectar datos del formulario
            const form = event.target;
            const data = new FormData(form);

            const formData = {
                contrato: "Suministro de Puertas Bidireccionales de Control en 7 Estaciones de la Red de Metro",
                sitio: data.get('sitio'),
                fechaInspeccion: data.get('fechaInspeccion'),
                trabajador: data.get('trabajador'),
                prevencionista: data.get('prevencionista'),
                herramientas: [],
                otrasHerramientas: [],
                planAccion: [],
                firmaRealizoImg: (firmaRealizo && !firmaRealizo.isEmpty()) ? firmaRealizo.toDataURL() : "",
                firmaRevisoImg: (firmaReviso && !firmaReviso.isEmpty()) ? firmaReviso.toDataURL() : "",
                firmaPrevencionImg: (firmaPrevencion && !firmaPrevencion.isEmpty()) ? firmaPrevencion.toDataURL() : ""
            };

            // Recolectar herramientas predeterminadas
            herramientas.forEach((herramienta, index) => {
                formData.herramientas.push({
                    nombre: herramienta,
                    estado: data.get(`estado_${index}`) || 'N/A',
                    color: data.get(`color_${index}`) || 'No',
                    obs: data.get(`obs_${index}`)
                });
            });

            // Recolectar otras herramientas
            const otrasHerramientasDivs = otrasContainer.querySelectorAll('.grid');
            otrasHerramientasDivs.forEach((div, index) => {
                const nombreInput = div.querySelector('input[name^="otraHerramientaNombre"]');
                const nombre = nombreInput ? nombreInput.value : '';

                if(nombre) { // Solo agregar si tiene nombre
                    formData.otrasHerramientas.push({
                        nombre: nombre,
                        estado: div.querySelector('input[name^="otraHerramientaEstado"]:checked')?.value || 'N/A',
                        color: div.querySelector('input[name^="otraHerramientaColor"]:checked')?.value || 'No',
                        obs: div.querySelector('input[name^="otraHerramientaObs"]')?.value || ''
                    });
                }
            });

            // Recolectar plan de acción
            for (let i = 0; i < 3; i++) {
                const accion = data.get(`planAccion_${i}`);
                if (accion) { // Solo agregar si hay una acción descrita
                    formData.planAccion.push({
                        accion: accion,
                        fecha: data.get(`fechaPlan_${i}`),
                        responsable: data.get(`responsablePlan_${i}`)
                    });
                }
            }

            // URL de Pipedream (Webhook)
            const pipedreamUrl = "https://eo4hxb3eilspbb0.m.pipedream.net";

            try {
                const response = await fetch(pipedreamUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    alert('¡Checklist enviado con éxito!');
                    form.reset();
                    nombreRealizo.textContent = 'Nombre del Trabajador';
                    if (firmaRealizo) firmaRealizo.clear();
                    if (firmaReviso) firmaReviso.clear();
                    if (firmaPrevencion) firmaPrevencion.clear();
                    otrasContainer.innerHTML = '';
                } else {
                    const errorText = await response.text();
                    throw new Error(`El servidor respondió con un error: ${response.status}. ${errorText}`);
                }
            } catch (error) {
                console.error("Error al enviar el formulario:", error);
                alert("Hubo un error al enviar el checklist. Por favor, revisa la consola para más detalles.");
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar y Enviar';
            }
        });
    }, 500); // Esperar 500ms para que se cargue SignaturePad
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeChecklistPage);