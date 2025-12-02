// modules/ast/ast.js
/**
 * MÓDULO AST - Análisis Seguro de Trabajo
 * Migrado y refactorizado desde assets/js/formulario-ast.js
 */

import { APP_CONFIG, WEBHOOKS, EPP_PREDETERMINADOS, RIESGOS_POTENCIALES } from '../../config/app.config.js';
import { getCurrentDateTime, setCurrentDateTimeInElement } from '../../shared/utils/date-helpers.js';
import { setupSignaturePad, getSignatureImage, validateSignatures, isCanvasEmpty } from '../../shared/utils/signature-manager.js';
import { showMessage } from '../../shared/utils/validators.js';

// Variables globales del módulo
let firmaSupervisorPad = null;
let firmaAprPad = null;
let etapaCount = 0;
let eppAdicionalesCount = 0;
let documentosAdicionalesCount = 0;
let personalCount = 0;

/**
 * Inicialización del formulario AST
 */
export function initAST() {
  console.log('📋 Inicializando Formulario AST');
  
  // Establecer fecha y hora actual
  setCurrentDateTimeInElement('fechaHoraActual');
  
  // Configurar firmas
  firmaSupervisorPad = setupSignaturePad('signature-supervisor');
  firmaAprPad = setupSignaturePad('signature-apr');
  
  // Agregar una etapa inicial
  addEtapaRow();
  
  // Configurar event listeners
  setupEventListeners();
  
  console.log('✅ Formulario AST inicializado correctamente');
}

/**
 * Configurar todos los event listeners
 */
function setupEventListeners() {
  // Botón agregar documento
  const addDocBtn = document.getElementById('add-documento-button');
  if (addDocBtn) {
    addDocBtn.addEventListener('click', addDocumentoRow);
  }
  
  // Botón agregar EPP
  const addEppBtn = document.getElementById('add-epp-button');
  if (addEppBtn) {
    addEppBtn.addEventListener('click', addEppRow);
  }
  
  // Botón agregar etapa
  const addEtapaBtn = document.getElementById('add-etapa-button');
  if (addEtapaBtn) {
    addEtapaBtn.addEventListener('click', addEtapaRow);
  }
  
  // Botón agregar personal
  const addPersonalBtn = document.getElementById('add-personal-button');
  if (addPersonalBtn) {
    addPersonalBtn.addEventListener('click', addPersonal);
  }
  
  // Delegación de eventos para botones dinámicos
  document.addEventListener('click', (e) => {
    // Remover etapa
    if (e.target.classList.contains('remove-etapa-btn')) {
      e.target.closest('div[style*="margin-bottom"]').remove();
    }
    
    // Remover EPP
    if (e.target.classList.contains('remove-epp-btn')) {
      e.target.closest('div[style*="display: grid"]').remove();
    }
    
    // Remover documento
    if (e.target.classList.contains('remove-documento-btn')) {
      e.target.closest('div.form-grid').remove();
    }
  });
  
  // Envío del formulario
  const form = document.getElementById('astForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

/**
 * Agregar fila de documento adicional
 */
function addDocumentoRow() {
  documentosAdicionalesCount++;
  const container = document.getElementById('documentos-adicionales');
  
  const div = document.createElement('div');
  div.className = 'form-grid form-grid-2';
  div.style.marginTop = '1rem';
  div.style.padding = '1rem';
  div.style.border = '1px solid var(--neutral-200)';
  div.style.borderRadius = '8px';
  div.style.position = 'relative';
  
  div.innerHTML = `
    <div>
      <label class="form-label">Tipo de Documento</label>
      <select name="tipoDocumento_adicional_${documentosAdicionalesCount}" class="form-select">
        <option value="">Seleccione tipo...</option>
        <option value="procedimiento">Procedimiento</option>
        <option value="instructivo">Instructivo</option>
        <option value="otro">Otro</option>
      </select>
    </div>
    <div>
      <label class="form-label">Nombre o Código</label>
      <input type="text" name="nombreCodigo_adicional_${documentosAdicionalesCount}" class="form-input">
    </div>
    <button type="button" class="remove-documento-btn" style="position: absolute; top: 10px; right: 10px; background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 18px;">&times;</button>
  `;
  
  container.appendChild(div);
}

/**
 * Agregar fila de EPP adicional
 */
function addEppRow() {
  eppAdicionalesCount++;
  const container = document.getElementById('epp-adicionales');
  
  const div = document.createElement('div');
  div.style.cssText = 'display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; padding: 0.75rem; border: 1px solid var(--neutral-200); border-radius: 8px; margin-bottom: 0.5rem; position: relative;';
  
  div.innerHTML = `
    <input type="text" name="epp_adicional_${eppAdicionalesCount}" class="form-input" placeholder="Nombre del elemento adicional" style="margin: 0;">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <input type="checkbox" name="epp_adicional_check_${eppAdicionalesCount}" id="epp_adicional_check_${eppAdicionalesCount}" style="width: 20px; height: 20px;">
      <label for="epp_adicional_check_${eppAdicionalesCount}" style="margin: 0; font-size: 0.875rem;">Seleccionado</label>
    </div>
    <button type="button" class="remove-epp-btn" style="position: absolute; top: 8px; right: 8px; background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 16px;">&times;</button>
  `;
  
  container.appendChild(div);
}

/**
 * Agregar etapa de trabajo
 */
function addEtapaRow() {
  etapaCount++;
  const container = document.getElementById('etapas-container');
  
  const etapaDiv = document.createElement('div');
  etapaDiv.style.cssText = 'margin-bottom: 2rem; padding: 1.5rem; border: 1px solid var(--neutral-200); border-radius: 12px; background: white; box-shadow: var(--shadow-md); position: relative;';
  
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
        <div class="checkbox-group" style="max-height: 200px; overflow-y: auto;">
          ${RIESGOS_POTENCIALES.map((riesgo, index) => `
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
  
  container.appendChild(etapaDiv);
}

/**
 * Agregar personal participante con firma
 */
function addPersonal() {
  personalCount++;
  const container = document.getElementById('personal-container');
  
  const personalDiv = document.createElement('div');
  personalDiv.style.cssText = 'padding: 1.5rem; border: 1px solid var(--neutral-200); border-radius: 8px; margin-bottom: 1rem; background: var(--neutral-50); position: relative;';
  personalDiv.setAttribute('data-personal-id', personalCount);
  
  personalDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h5 style="font-weight: 600; color: var(--neutral-700); margin: 0;">Participante ${personalCount}</h5>
      <button type="button" onclick="removePersonalCard(${personalCount})" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 16px;">&times;</button>
    </div>
    <div class="form-grid form-grid-3" style="gap: 1rem; margin-bottom: 1rem;">
      <div>
        <label class="form-label required-field">Nombre Completo</label>
        <input type="text" name="personal_nombre_${personalCount}" class="form-input" required>
      </div>
      <div>
        <label class="form-label required-field">RUT</label>
        <input type="text" name="personal_rut_${personalCount}" class="form-input" placeholder="12.345.678-9" required>
      </div>
      <div>
        <label class="form-label required-field">Cargo</label>
        <input type="text" name="personal_cargo_${personalCount}" class="form-input" required>
      </div>
    </div>
    <div style="margin-top: 1rem;">
      <label class="form-label required-field">Firma del Trabajador</label>
      <div class="signature-pad-container">
        <canvas id="firma-personal-${personalCount}"></canvas>
        <button type="button" class="clear-btn" onclick="clearPersonalSignature(${personalCount})">Limpiar</button>
      </div>
    </div>
  `;
  
  container.appendChild(personalDiv);
  
  // Configurar firma para este trabajador y guardar referencia
  setTimeout(() => {
    const pad = setupSignaturePad(`firma-personal-${personalCount}`);
    window[`signaturePad_personal_${personalCount}`] = pad;
  }, 100);
}

/**
 * Función global para remover tarjeta de personal
 */
window.removePersonalCard = function(personalId) {
  const card = document.querySelector(`[data-personal-id="${personalId}"]`);
  if (card) {
    card.remove();
  }
};

/**
 * Función global para limpiar firma de personal
 */
window.clearPersonalSignature = function(personalId) {
  const signaturePad = window[`signaturePad_personal_${personalId}`];
  if (signaturePad) {
    signaturePad.clear();
  }
};

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
    // Validar firmas principales
    const signaturesValidation = validateSignatures(
      [firmaSupervisorPad, firmaAprPad],
      ['Firma del Supervisor', 'Firma del APR']
    );
    
    if (!signaturesValidation.isValid) {
      showMessage(`Faltan las siguientes firmas: ${signaturesValidation.missing.join(', ')}`, 'error');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    // Validar firmas de trabajadores
    const missingWorkerSignatures = [];
    for (let i = 1; i <= personalCount; i++) {
      const nombre = document.querySelector(`input[name="personal_nombre_${i}"]`);
      if (nombre && nombre.value) {
        const signaturePad = window[`signaturePad_personal_${i}`];
        if (!signaturePad || signaturePad.isEmpty()) {
          missingWorkerSignatures.push(`Firma del trabajador ${nombre.value}`);
        }
      }
    }
    
    if (missingWorkerSignatures.length > 0) {
      showMessage(`Faltan las siguientes firmas de trabajadores: ${missingWorkerSignatures.join(', ')}`, 'error');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    // Recolectar datos del formulario
    const astData = collectFormData(e.target);
    
    // Agregar firmas
    astData.firmaSupervisorImg = getSignatureImage(firmaSupervisorPad);
    astData.firmaAprImg = getSignatureImage(firmaAprPad);
    
    // Enviar a webhook
    const response = await fetch(WEBHOOKS.ast, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(astData)
    });
    
    if (response.ok) {
      showMessage('✅ AST enviado con éxito!', 'success');
      
      // Limpiar formulario después de 2 segundos
      setTimeout(() => {
        e.target.reset();
        if (firmaSupervisorPad) firmaSupervisorPad.clear();
        if (firmaAprPad) firmaAprPad.clear();
        
        // Limpiar firmas de trabajadores
        for (let i = 1; i <= personalCount; i++) {
          const signaturePad = window[`signaturePad_personal_${i}`];
          if (signaturePad) {
            signaturePad.clear();
          }
        }
        
        // Limpiar contenedores dinámicos
        document.getElementById('personal-container').innerHTML = '';
        document.getElementById('etapas-container').innerHTML = '';
        document.getElementById('epp-adicionales').innerHTML = '<h4 style="font-weight: 600; margin-bottom: 1rem; color: var(--neutral-700);">Elementos Adicionales</h4>';
        document.getElementById('documentos-adicionales').innerHTML = '';
        
        // Resetear contadores
        personalCount = 0;
        etapaCount = 0;
        eppAdicionalesCount = 0;
        documentosAdicionalesCount = 0;
        
        // Agregar una etapa inicial
        addEtapaRow();
        
        setCurrentDateTimeInElement('fechaHoraActual');
      }, 2000);
    } else {
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error enviando AST:', error);
    showMessage(`❌ Error al enviar: ${error.message}`, 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

/**
 * Recolectar todos los datos del formulario
 */
function collectFormData(form) {
  const formData = new FormData(form);
  
  const astData = {
    empresa: formData.get('empresa'),
    obra_area: formData.get('obra_area'),
    lugar: formData.get('lugar'),
    trabajo: formData.get('trabajo'),
    fechaHoraActual: document.getElementById('fechaHoraActual').textContent,
    documentos: [],
    epp_predeterminado: [],
    epp_adicional: [],
    etapas: [],
    personal: [],
    prevencionista: formData.get('prevencionista'),
    firmaSupervisorImg: '',
    firmaAprImg: ''
  };
  
  // Recolectar documentos
  const tipoDoc = formData.get('tipoDocumento');
  const nombreDoc = formData.get('nombreCodigo');
  if (tipoDoc || nombreDoc) {
    astData.documentos.push({ tipo: tipoDoc, nombre: nombreDoc });
  }
  
  for (let i = 1; i <= documentosAdicionalesCount; i++) {
    const tipo = formData.get(`tipoDocumento_adicional_${i}`);
    const nombre = formData.get(`nombreCodigo_adicional_${i}`);
    if (tipo || nombre) {
      astData.documentos.push({ tipo, nombre });
    }
  }
  
  // Recolectar EPP predeterminados
  const eppCheckboxes = document.querySelectorAll('input[name="epp_predeterminado"]:checked');
  eppCheckboxes.forEach(checkbox => {
    astData.epp_predeterminado.push(checkbox.value);
  });
  
  // Recolectar EPP adicionales
  for (let i = 1; i <= eppAdicionalesCount; i++) {
    const nombre = formData.get(`epp_adicional_${i}`);
    const seleccionado = formData.get(`epp_adicional_check_${i}`) === 'on';
    if (nombre) {
      astData.epp_adicional.push({ nombre, seleccionado });
    }
  }
  
  // Recolectar etapas
  for (let i = 1; i <= etapaCount; i++) {
    const descripcion = formData.get(`etapa_descripcion_${i}`);
    if (descripcion) {
      const riesgos = [];
      const riesgoCheckboxes = document.querySelectorAll(`input[name="etapa_riesgos_${i}"]:checked`);
      riesgoCheckboxes.forEach(checkbox => {
        riesgos.push(checkbox.value);
      });
      
      astData.etapas.push({
        descripcion,
        riesgos,
        medidas: formData.get(`etapa_medidas_${i}`)
      });
    }
  }
  
  // Recolectar personal
  for (let i = 1; i <= personalCount; i++) {
    const nombre = formData.get(`personal_nombre_${i}`);
    if (nombre) {
      // Obtener firma del trabajador
      const canvas = document.getElementById(`firma-personal-${i}`);
      let firmaImg = null;
      
      if (canvas) {
        const signaturePad = window[`signaturePad_personal_${i}`];
        if (signaturePad && !signaturePad.isEmpty()) {
          firmaImg = signaturePad.toDataURL('image/png');
        }
      }
      
      astData.personal.push({
        nombre,
        rut: formData.get(`personal_rut_${i}`),
        cargo: formData.get(`personal_cargo_${i}`),
        firmaImg: firmaImg  // ⬅️ CORREGIDO: Cambiar "firma" a "firmaImg" para coincidir con Pipedream
      });
    }
  }
  
  return astData;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initAST);