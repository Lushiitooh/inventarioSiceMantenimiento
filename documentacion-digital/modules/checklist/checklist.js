// modules/checklist/checklist.js
/**
 * MÓDULO CHECKLIST - Inspección de Herramientas Manuales
 * Migrado y refactorizado desde assets/js/checklist.js
 */

import { APP_CONFIG, WEBHOOKS, TRABAJADORES, HERRAMIENTAS_PREDETERMINADAS } from '../../config/app.config.js';
import { getTodayDate, setTodayInInput } from '../../shared/utils/date-helpers.js';
import { setupSignaturePad, getSignatureImage, validateSignatures } from '../../shared/utils/signature-manager.js';
import { showMessage } from '../../shared/utils/validators.js';

// Variables globales del módulo
let firmaRealizoPad = null;
let firmaRevisoPad = null;
let firmaPrevencionPad = null;
let otherToolIndex = 0;

/**
 * Inicialización del checklist
 */
export function initChecklist() {
  console.log('✅ Inicializando Checklist de Herramientas');
  
  // Establecer fechas
  setTodayInInput('fechaInspeccion');
  setTodayInInput('fechaRealizo');
  setTodayInInput('fechaReviso');
  setTodayInInput('fechaPrevencion');
  
  // Cargar herramientas predeterminadas
  loadPredefinedTools();
  
  // Configurar firmas
  firmaRealizoPad = setupSignaturePad('firmaRealizoPad');
  firmaRevisoPad = setupSignaturePad('firmaRevisoPad');
  firmaPrevencionPad = setupSignaturePad('firmaPrevencionPad');
  
  // Generar plan de acción
  generatePlanAccion();
  
  // Configurar event listeners
  setupEventListeners();
  
  console.log('✅ Checklist inicializado correctamente');
}

/**
 * Cargar herramientas predeterminadas en la tabla
 */
function loadPredefinedTools() {
  const tbody = document.getElementById('herramientasTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  HERRAMIENTAS_PREDETERMINADAS.forEach((herramienta, index) => {
    const tr = document.createElement('tr');
    tr.className = 'border border-gray-200 dark:border-gray-700';
    tr.innerHTML = `
      <td data-label="Ítem" class="p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">1.${index + 1}</td>
      <td data-label="Herramienta" class="p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">${herramienta}</td>
      <td data-label="Estado" class="p-2 text-center border border-gray-300 dark:border-gray-600">
        <div class="flex justify-center items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
          <label class="flex items-center cursor-pointer">
            <input type="radio" name="estado_${index}" value="Bueno" required class="mr-1"> B
          </label>
          <label class="flex items-center cursor-pointer">
            <input type="radio" name="estado_${index}" value="Malo" class="mr-1"> M
          </label>
          <label class="flex items-center cursor-pointer">
            <input type="radio" name="estado_${index}" value="N/A" class="mr-1"> N/A
          </label>
        </div>
      </td>
      <td data-label="Color Mes" class="p-2 text-center border border-gray-300 dark:border-gray-600">
        <div class="flex justify-center items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
          <label class="flex items-center cursor-pointer">
            <input type="radio" name="color_${index}" value="Si" required class="mr-1"> Sí
          </label>
          <label class="flex items-center cursor-pointer">
            <input type="radio" name="color_${index}" value="No" class="mr-1"> No
          </label>
        </div>
      </td>
      <td data-label="Observaciones" class="p-2 border border-gray-300 dark:border-gray-600">
        <input type="text" name="obs_${index}" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Generar filas del plan de acción
 */
function generatePlanAccion() {
  const container = document.getElementById('plan-accion-container');
  if (!container) return;
  
  for (let i = 0; i < 3; i++) {
    const div = document.createElement('div');
    div.className = 'grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 border rounded-lg border-gray-300 dark:border-gray-600 items-center bg-white dark:bg-gray-800';
    div.innerHTML = `
      <div class="sm:col-span-6">
        <label class="block text-xs font-medium mb-1">Acción a Realizar</label>
        <input type="text" name="planAccion_${i}" class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
      </div>
      <div class="sm:col-span-3">
        <label class="block text-xs font-medium mb-1">Fecha</label>
        <input type="date" name="fechaPlan_${i}" class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
      </div>
      <div class="sm:col-span-3">
        <label class="block text-xs font-medium mb-1">Responsable</label>
        <input type="text" name="responsablePlan_${i}" class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
      </div>
    `;
    container.appendChild(div);
  }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
  // Sincronizar nombre del trabajador con firma
  const trabajadorSelect = document.getElementById('trabajador');
  const nombreRealizo = document.getElementById('nombreRealizo');
  
  if (trabajadorSelect && nombreRealizo) {
    trabajadorSelect.addEventListener('change', function() {
      nombreRealizo.textContent = this.value || 'Nombre del Trabajador';
    });
  }
  
  // Botón agregar herramienta
  const addToolBtn = document.getElementById('add-tool-btn');
  if (addToolBtn) {
    addToolBtn.addEventListener('click', addOtherTool);
  }
  
  // Envío del formulario
  const form = document.getElementById('checklistForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

/**
 * Agregar herramienta adicional
 */
function addOtherTool() {
  otherToolIndex++;
  const container = document.getElementById('otras-herramientas-container');
  
  const toolDiv = document.createElement('div');
  toolDiv.className = 'grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 border rounded-lg border-gray-300 dark:border-gray-600 items-center bg-white dark:bg-gray-800';
  toolDiv.innerHTML = `
    <div class="sm:col-span-3">
      <label class="block text-xs font-medium mb-1">Nombre Herramienta</label>
      <input type="text" name="otraHerramientaNombre_${otherToolIndex}" class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Nombre">
    </div>
    <div class="sm:col-span-2">
      <label class="block text-xs font-medium mb-1">Estado</label>
      <div class="flex gap-2">
        <label class="flex items-center text-xs">
          <input type="radio" name="otraHerramientaEstado_${otherToolIndex}" value="Bueno" required class="mr-1"> B
        </label>
        <label class="flex items-center text-xs">
          <input type="radio" name="otraHerramientaEstado_${otherToolIndex}" value="Malo" class="mr-1"> M
        </label>
        <label class="flex items-center text-xs">
          <input type="radio" name="otraHerramientaEstado_${otherToolIndex}" value="N/A" class="mr-1"> N/A
        </label>
      </div>
    </div>
    <div class="sm:col-span-2">
      <label class="block text-xs font-medium mb-1">Color</label>
      <div class="flex gap-2">
        <label class="flex items-center text-xs">
          <input type="radio" name="otraHerramientaColor_${otherToolIndex}" value="Si" required class="mr-1"> Sí
        </label>
        <label class="flex items-center text-xs">
          <input type="radio" name="otraHerramientaColor_${otherToolIndex}" value="No" class="mr-1"> No
        </label>
      </div>
    </div>
    <div class="sm:col-span-4">
      <label class="block text-xs font-medium mb-1">Observaciones</label>
      <input type="text" name="otraHerramientaObs_${otherToolIndex}" class="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
    </div>
    <div class="sm:col-span-1 flex justify-center">
      <button type="button" onclick="this.parentElement.parentElement.remove()" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">×</button>
    </div>
  `;
  
  container.appendChild(toolDiv);
}

/**
 * Manejo del envío del formulario
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled = true;
  
  try {
    // Validar firmas
    const signaturesValidation = validateSignatures(
      [firmaRealizoPad, firmaRevisoPad, firmaPrevencionPad],
      ['Firma Realizó', 'Firma Revisó', 'Firma Prevención']
    );
    
    if (!signaturesValidation.isValid) {
      showMessage(`Faltan las siguientes firmas: ${signaturesValidation.missing.join(', ')}`, 'error');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    // Recolectar datos
    const checklistData = collectFormData(e.target);
    
    // Agregar firmas
    checklistData.firmaRealizoImg = getSignatureImage(firmaRealizoPad);
    checklistData.firmaRevisoImg = getSignatureImage(firmaRevisoPad);
    checklistData.firmaPrevencionImg = getSignatureImage(firmaPrevencionPad);
    
    // Enviar a webhook
    const response = await fetch(WEBHOOKS.checklist, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checklistData)
    });
    
    if (response.ok) {
      showMessage('✅ Checklist enviado con éxito!', 'success');
      
      // Limpiar formulario después de 2 segundos
      setTimeout(() => {
        e.target.reset();
        if (firmaRealizoPad) firmaRealizoPad.clear();
        if (firmaRevisoPad) firmaRevisoPad.clear();
        if (firmaPrevencionPad) firmaPrevencionPad.clear();
        setTodayInInput('fechaInspeccion');
      }, 2000);
    } else {
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error enviando checklist:', error);
    showMessage(`❌ Error al enviar: ${error.message}`, 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

/**
 * Recolectar datos del formulario
 */
function collectFormData(form) {
  const data = new FormData(form);
  
  const checklistData = {
    contrato: data.get('contrato'),
    fechaInspeccion: data.get('fechaInspeccion'),
    trabajador: data.get('trabajador'),
    herramientas: [],
    otrasHerramientas: [],
    planAccion: [],
    nombreRealizo: document.getElementById('nombreRealizo').textContent,
    nombreReviso: data.get('nombreReviso'),
    nombrePrevencion: data.get('nombrePrevencion'),
    fechaRealizo: data.get('fechaRealizo'),
    fechaReviso: data.get('fechaReviso'),
    fechaPrevencion: data.get('fechaPrevencion')
  };
  
  // Recolectar herramientas predeterminadas
  HERRAMIENTAS_PREDETERMINADAS.forEach((herramienta, index) => {
    checklistData.herramientas.push({
      nombre: herramienta,
      estado: data.get(`estado_${index}`) || 'N/A',
      color: data.get(`color_${index}`) || 'No',
      obs: data.get(`obs_${index}`) || ''
    });
  });
  
  // Recolectar otras herramientas
  for (let i = 1; i <= otherToolIndex; i++) {
    const nombre = data.get(`otraHerramientaNombre_${i}`);
    if (nombre) {
      checklistData.otrasHerramientas.push({
        nombre,
        estado: data.get(`otraHerramientaEstado_${i}`) || 'N/A',
        color: data.get(`otraHerramientaColor_${i}`) || 'No',
        obs: data.get(`otraHerramientaObs_${i}`) || ''
      });
    }
  }
  
  // Recolectar plan de acción
  for (let i = 0; i < 3; i++) {
    const accion = data.get(`planAccion_${i}`);
    if (accion) {
      checklistData.planAccion.push({
        accion,
        fecha: data.get(`fechaPlan_${i}`),
        responsable: data.get(`responsablePlan_${i}`)
      });
    }
  }
  
  return checklistData;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initChecklist);