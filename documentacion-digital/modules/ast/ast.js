// modules/ast/ast.js
/**
 * MÓDULO AST - Análisis Seguro de Trabajo
 * Módulo principal del formulario AST (versión modular ES6+)
 * Incluye autorrelleno desde actividades.json
 */

import { APP_CONFIG, WEBHOOKS, EPP_PREDETERMINADOS, RIESGOS_POTENCIALES } from '../../config/app.config.js';
import { getCurrentDateTime, setCurrentDateTimeInElement } from '../../shared/utils/date-helpers.js';
import { setupSignaturePad, getSignatureImage, validateSignatures, isCanvasEmpty } from '../../shared/utils/signature-manager.js';
import { showMessage } from '../../shared/utils/validators.js';

// ── Variables globales del módulo ──────────────────────────────────────────
let firmaSupervisorPad      = null;
let firmaAprPad             = null;
let etapaCount              = 0;
let eppAdicionalesCount     = 0;
let documentosAdicionalesCount = 0;
let personalCount           = 0;

// ── Variables del autorrelleno ─────────────────────────────────────────────
let actividadesData = null;

/**
 * Mapa: ID del EPP en el JSON → ID del checkbox en el HTML
 * Los que tienen null no tienen checkbox predefinido → se agregan como EPP adicional
 */
const EPP_ID_MAP = {
  casco:               'casco',
  lentes:              'lentes',
  zapatos:             'zapatos',
  guantes:             'guantes',
  linterna_casco:      'linterna_casco',
  guantes_hyflex:      'guantes_hyflex',
  guantes_cabritilla:  'guantes_cabritilla',
  protector_auditivo:  'protector_auditivo',
  protector_respiratorio: 'protector_respiratorio',
  arnes:               'arnes',
  cono:                'cono',
  taladro_inalambrico: 'taladro_inalambrico',
  // Sin checkbox predefinido:
  chaleco:             null,
  manga_larga:         null
};

/** Etiquetas legibles para EPP que se agregan como adicionales */
const EPP_LABELS_EXTRA = {
  chaleco:    'Chaleco reflectante',
  manga_larga: 'Ropa de manga larga'
};

// ═══════════════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

export function initAST() {
  console.log('📋 Inicializando Formulario AST');

  setCurrentDateTimeInElement('fechaHoraActual');

  firmaSupervisorPad = setupSignaturePad('signature-supervisor');
  firmaAprPad        = setupSignaturePad('signature-apr');

  addEtapaRow();
  setupEventListeners();
  loadActividades();   // ← carga el catálogo de actividades

  console.log('✅ Formulario AST inicializado');
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUTORRELLENO — CARGA DEL CATÁLOGO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Carga actividades.json y puebla el selector de grupos
 * El path es relativo al documento HTML (documentacion-digital/), por eso ../
 */
async function loadActividades() {
  const grupoSelect  = document.getElementById('grupo_actividad');
  const actSelect    = document.getElementById('actividad_select');
  const btnAutorellenar = document.getElementById('btn-autorellenar');

  try {
    const response = await fetch('../actividades.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    actividadesData = await response.json();
    console.log(`📦 Catálogo cargado: ${actividadesData.grupos.length} grupos`);

    // Poblar selector de grupos
    if (grupoSelect) {
      grupoSelect.innerHTML = '<option value="">Seleccione tipo de intervención...</option>';
      actividadesData.grupos.forEach(grupo => {
        const opt = document.createElement('option');
        opt.value = grupo.id;
        opt.textContent = grupo.label;
        grupoSelect.appendChild(opt);
      });
    }

    // Event listener para cambio de grupo → actualizar actividades
    grupoSelect?.addEventListener('change', () => {
      populateActividadesSelect(grupoSelect.value);
      if (btnAutorellenar) btnAutorellenar.disabled = true;
    });

    // Event listener para cambio de actividad → habilitar botón
    actSelect?.addEventListener('change', () => {
      if (btnAutorellenar) {
        btnAutorellenar.disabled = !actSelect.value;
      }
    });

    // Event listener para botón autorellenar
    btnAutorellenar?.addEventListener('click', () => {
      if (actSelect?.value) {
        autofillFormulario(actSelect.value);
      }
    });

  } catch (err) {
    console.error('Error cargando actividades.json:', err);
    if (grupoSelect) {
      grupoSelect.innerHTML = '<option value="">⚠ No se pudo cargar el catálogo</option>';
    }
  }
}

/**
 * Pobla el selector de actividades según el grupo seleccionado
 */
function populateActividadesSelect(grupoId) {
  const actSelect = document.getElementById('actividad_select');
  if (!actSelect || !actividadesData) return;

  actSelect.innerHTML = '<option value="">Seleccione actividad...</option>';
  actSelect.disabled  = !grupoId;

  if (!grupoId) return;

  const grupo = actividadesData.grupos.find(g => g.id === grupoId);
  if (!grupo) return;

  grupo.actividades.forEach(act => {
    const opt = document.createElement('option');
    opt.value       = act.id;
    opt.textContent = act.titulo;
    actSelect.appendChild(opt);
  });
}

/**
 * Busca una actividad por su ID en todos los grupos
 */
function getActividadById(actividadId) {
  if (!actividadesData) return null;
  for (const grupo of actividadesData.grupos) {
    const act = grupo.actividades.find(a => a.id === actividadId);
    if (act) return act;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUTORRELLENO — LÓGICA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intenta emparejar un riesgo del JSON con uno de los RIESGOS_POTENCIALES del form.
 * Usa normalización de texto y un mapa de palabras clave ordenado por especificidad.
 *
 * Criterio de diseño: mapas más específicos primero para evitar falsos positivos.
 * Los riesgos tipo "Daño a componentes" o "Error de conexión" no tienen equivalente
 * en RIESGOS_POTENCIALES → se incluyen como nota en Medidas de Control (correcto).
 */
function matchRiesgo(jsonRiesgo) {
  const normalize = s =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const nr = normalize(jsonRiesgo);

  // 1. Coincidencia exacta (ignorando acentos y mayúsculas)
  const exactMatch = RIESGOS_POTENCIALES.find(r => normalize(r) === nr);
  if (exactMatch) return exactMatch;

  // 2. Mapa de palabras clave → riesgo predefinido
  //    Orden: más específico primero para evitar solapamientos
  const keywordMap = [
    // ── Caídas ──────────────────────────────────────────────────────────────
    [['caida al mismo nivel', 'caida mismo nivel', 'resbalamiento'],
                                                              'Caídas del mismo nivel'],
    [['caida distinto nivel', 'caida de altura', 'caida desde altura'],
                                                              'Caídas de distinto nivel'],

    // ── Electricidad ─────────────────────────────────────────────────────────
    [['electri', 'arco electrico', 'alta tension', 'tension electrica',
      'cortocircuito', 'componente electrico', 'descarga electrostatica',
      'inversion de polaridad'],                              'Contacto con electricidad'],

    // ── Químicos / temperatura ────────────────────────────────────────────────
    [['quimico', 'quimicos', 'producto quimico', 'lubricante',
      'alcohol', 'electrolito', 'sustancia quimica'],         'Contacto con producto químico'],
    [['quemadura', 'temperatura', 'caliente', 'resistencia termica'],
                                                              'Contacto con temperatura extrema'],

    // ── Cortes / proyecciones ────────────────────────────────────────────────
    [['corte', 'cortes', 'laceracion', 'lesion de', 'borde filoso', 'herramienta cortante',
      'bordes metalicos', 'bordes del disco', 'tira metalica', 'aspas'],
                                                              'Corte'],
    [['proyeccion', 'particula', 'esquirla'],                 'Proyección de partículas'],

    // ── Ergonomía ────────────────────────────────────────────────────────────
    [['sobreesfuerzo', 'ergon', 'postural', 'carga manual', 'manejo manual'],
                                                              'Ergonómico/Sobreesfuerzo'],

    // ── Ruido / vibraciones ──────────────────────────────────────────────────
    [['ruido', 'acustic'],                                    'Exposición a ruido'],
    [['vibracion'],                                           'Exposición a vibraciones'],

    // ── Golpes (amplio: golpe, golpes, pellizco, muelle proyectado…) ─────────
    [['golpe contra', 'choque contra', 'impacto contra'],     'Golpeado contra'],
    [['caida de objeto', 'caida de herramienta', 'caida de material',
      'caida del panel', 'caida de la pantalla', 'caida de la rampa',
      'caida de la cubierta', 'caida del cajon', 'caida del bloque',
      'caida del obstaculo', 'caida del pictograma', 'caida del componente',
      'caida del equipo', 'caida del motor', 'caida de tuercas',
      'proyeccion del muelle', 'pellizco'],                   'Golpeado por'],
    [['golpe', 'impacto'],                                    'Golpeado por'],

    // ── Atrapamiento ─────────────────────────────────────────────────────────
    [['atrap'],                                               'Atrapamiento'],

    // ── Incendio ─────────────────────────────────────────────────────────────
    [['incendio', 'fuego', 'llama'],                          'Incendio'],

    // ── Radiación ────────────────────────────────────────────────────────────
    [['radiacion', 'uv ', 'ultravioleta', 'inhala'],          'Radiación no ionizante'],

    // ── Atropello ────────────────────────────────────────────────────────────
    [['atropello', 'transito', 'vehiculo', 'tren', 'metro'],  'Atropello'],
  ];

  for (const [keywords, riesgo] of keywordMap) {
    if (keywords.some(kw => nr.includes(kw))) return riesgo;
  }

  return null; // Sin coincidencia → se incluirá en medidas de control como texto
}

/**
 * Función principal de autorrelleno.
 * Completa: trabajo, documento de respaldo, EPP y etapas del trabajo.
 * NO toca: lugar, personal participante, firmas.
 */
function autofillFormulario(actividadId) {
  const actividad = getActividadById(actividadId);
  if (!actividad) return;

  console.log(`⚡ Autorellenando con actividad: ${actividad.titulo}`);

  // ── 1. Trabajo a Realizar ────────────────────────────────────────────────
  const trabajoField = document.getElementById('trabajo');
  if (trabajoField) trabajoField.value = actividad.trabajo_descripcion;

  // ── 2. Documento de Respaldo (primer documento del JSON) ─────────────────
  if (actividad.documentos?.length > 0) {
    const doc = actividad.documentos[0];
    const tipoSelect  = document.getElementById('tipoDocumento');
    const nombreInput = document.getElementById('nombreCodigo');
    if (tipoSelect)  tipoSelect.value  = doc.tipo;
    if (nombreInput) nombreInput.value = doc.nombre;
  }

  // ── 3. EPP — desmarcar todos, luego marcar los del JSON ──────────────────
  document.querySelectorAll('input[name="epp_predeterminado"]')
    .forEach(cb => (cb.checked = false));

  // Limpiar EPP adicionales previos
  const eppAdicionalesContainer = document.getElementById('epp-adicionales');
  if (eppAdicionalesContainer) {
    eppAdicionalesContainer.innerHTML =
      '<h4 style="font-weight: 600; margin-bottom: 1rem; color: var(--neutral-700);">Elementos Adicionales</h4>';
    eppAdicionalesCount = 0;
  }

  // Combinar EPP obligatorio + condicional (el usuario puede desmarcar luego)
  const allEpp = [
    ...(actividad.epp             || []),
    ...(actividad.epp_condicional || [])
  ];

  const extraEpp = []; // EPP sin checkbox predefinido

  allEpp.forEach(eppId => {
    const checkboxId = EPP_ID_MAP[eppId];
    if (checkboxId !== undefined && checkboxId !== null) {
      const cb = document.getElementById(checkboxId);
      if (cb) cb.checked = true;
    } else if (EPP_LABELS_EXTRA[eppId]) {
      extraEpp.push(EPP_LABELS_EXTRA[eppId]);
    }
  });

  // Agregar EPP extra (chaleco, manga larga) como EPP adicionales
  extraEpp.forEach(label => addEppRowWithValue(label));

  // ── 4. Etapas del Trabajo ────────────────────────────────────────────────
  const etapasContainer = document.getElementById('etapas-container');
  if (etapasContainer) {
    etapasContainer.innerHTML = '';
    etapaCount = 0;
  }

  (actividad.secuencia || []).forEach(step => addEtapaRowWithData(step));

  // ── 5. Feedback visual ───────────────────────────────────────────────────
  const statusEl = document.getElementById('autofill-status');
  if (statusEl) {
    statusEl.textContent = `✅ Formulario completado con: "${actividad.titulo}"`;
    statusEl.style.color = '#16a34a';
    // Limpiar mensaje después de 5 segundos
    setTimeout(() => {
      statusEl.textContent = '';
    }, 5000);
  }

  // Scroll suave hacia la sección de Información General
  const seccion1 = document.querySelector('.form-section:nth-of-type(2)');
  if (seccion1) {
    setTimeout(() => seccion1.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUTORRELLENO — HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Agrega un EPP adicional con un valor pre-llenado y marcado como seleccionado
 */
function addEppRowWithValue(label) {
  eppAdicionalesCount++;
  const container = document.getElementById('epp-adicionales');
  if (!container) return;

  const div = document.createElement('div');
  div.style.cssText =
    'display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; ' +
    'padding: 0.75rem; border: 1px solid var(--neutral-200); border-radius: 8px; ' +
    'margin-bottom: 0.5rem; position: relative; background: #f0fdf4;';

  div.innerHTML = `
    <input type="text"
           name="epp_adicional_${eppAdicionalesCount}"
           class="form-input"
           value="${label}"
           style="margin: 0;">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <input type="checkbox"
             name="epp_adicional_check_${eppAdicionalesCount}"
             id="epp_adicional_check_${eppAdicionalesCount}"
             checked
             style="width: 20px; height: 20px;">
      <label for="epp_adicional_check_${eppAdicionalesCount}"
             style="margin: 0; font-size: 0.875rem;">Seleccionado</label>
    </div>
    <button type="button" class="remove-epp-btn"
            style="position: absolute; top: 8px; right: 8px; background: #ef4444;
                   color: white; border: none; border-radius: 4px;
                   padding: 4px 8px; cursor: pointer; font-size: 16px;">&times;</button>
  `;

  container.appendChild(div);
}

/**
 * Agrega una etapa de trabajo con datos del JSON pre-cargados.
 * Empareja los riesgos del JSON con los checkboxes del formulario.
 * Los riesgos sin coincidencia se incluyen en "Medidas de Control" como texto.
 */
function addEtapaRowWithData(step) {
  etapaCount++;
  const container = document.getElementById('etapas-container');
  if (!container) return;

  // Construir descripción: título + detalle
  const descripcion = step.etapa
    + (step.descripcion ? '\n\n' + step.descripcion : '');

  // Emparejar riesgos y separar los que no coinciden
  const riesgosMatcheados = [];
  const riesgosSinMatch   = [];

  (step.riesgos || []).forEach(r => {
    const matched = matchRiesgo(r);
    if (matched) {
      riesgosMatcheados.push(matched);
    } else {
      riesgosSinMatch.push(r);
    }
  });

  // Construir medidas: controles del JSON + riesgos no emparejados como nota
  let medidas = (step.controles || []).map(c => `• ${c}`).join('\n');
  if (riesgosSinMatch.length > 0) {
    medidas += `\n\nOtros riesgos a considerar:\n` +
               riesgosSinMatch.map(r => `• ${r}`).join('\n');
  }

  // Construir checkboxes de riesgos con los matcheados pre-seleccionados
  const checkboxesHTML = RIESGOS_POTENCIALES.map((riesgo, index) => {
    const isChecked = riesgosMatcheados.includes(riesgo) ? 'checked' : '';
    return `
      <div class="checkbox-item">
        <input type="checkbox"
               id="riesgo_${etapaCount}_${index}"
               name="etapa_riesgos_${etapaCount}"
               value="${riesgo}"
               ${isChecked}>
        <label for="riesgo_${etapaCount}_${index}">${riesgo}</label>
      </div>`;
  }).join('');

  const etapaDiv = document.createElement('div');
  etapaDiv.style.cssText =
    'margin-bottom: 2rem; padding: 1.5rem; border: 1px solid var(--neutral-200); ' +
    'border-radius: 12px; background: white; box-shadow: var(--shadow-md); position: relative;';

  etapaDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--primary-color); margin: 0;">
        Etapa ${etapaCount}
      </h4>
      <button type="button" class="btn btn-danger remove-etapa-btn"
              style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">&times;</button>
    </div>
    <div style="display: grid; gap: 1.5rem;">
      <div>
        <label class="form-label required-field">Descripción de la Etapa</label>
        <textarea name="etapa_descripcion_${etapaCount}"
                  class="form-textarea"
                  rows="4"
                  required>${descripcion}</textarea>
      </div>
      <div>
        <label class="form-label">Riesgos Potenciales (Seleccione todos los que apliquen)</label>
        <div class="checkbox-group" style="max-height: 200px; overflow-y: auto;">
          ${checkboxesHTML}
        </div>
      </div>
      <div>
        <label class="form-label required-field">Medidas de Control</label>
        <textarea name="etapa_medidas_${etapaCount}"
                  class="form-textarea"
                  rows="5"
                  required>${medidas}</textarea>
      </div>
    </div>
  `;

  container.appendChild(etapaDiv);
}

// ═══════════════════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

function setupEventListeners() {
  document.getElementById('add-documento-button')?.addEventListener('click', addDocumentoRow);
  document.getElementById('add-epp-button')?.addEventListener('click', addEppRow);
  document.getElementById('add-etapa-button')?.addEventListener('click', addEtapaRow);
  document.getElementById('add-personal-button')?.addEventListener('click', addPersonal);

  // Delegación para botones generados dinámicamente
  document.addEventListener('click', e => {
    if (e.target.classList.contains('remove-etapa-btn')) {
      e.target.closest('div[style*="margin-bottom"]').remove();
    }
    if (e.target.classList.contains('remove-epp-btn')) {
      e.target.closest('div[style*="display: grid"]').remove();
    }
    if (e.target.classList.contains('remove-documento-btn')) {
      e.target.closest('div.form-grid').remove();
    }
  });

  document.getElementById('astForm')?.addEventListener('submit', handleFormSubmit);
}

// ═══════════════════════════════════════════════════════════════════════════
//  FORMULARIO — AGREGAR FILAS (vacías)
// ═══════════════════════════════════════════════════════════════════════════

function addDocumentoRow() {
  documentosAdicionalesCount++;
  const container = document.getElementById('documentos-adicionales');

  const div = document.createElement('div');
  div.className = 'form-grid form-grid-2';
  div.style.cssText = 'margin-top: 1rem; padding: 1rem; border: 1px solid var(--neutral-200); border-radius: 8px; position: relative;';

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
    <button type="button" class="remove-documento-btn"
            style="position: absolute; top: 10px; right: 10px; background: #ef4444;
                   color: white; border: none; border-radius: 4px;
                   padding: 4px 8px; cursor: pointer; font-size: 18px;">&times;</button>
  `;

  container.appendChild(div);
}

function addEppRow() {
  eppAdicionalesCount++;
  const container = document.getElementById('epp-adicionales');

  const div = document.createElement('div');
  div.style.cssText =
    'display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; ' +
    'padding: 0.75rem; border: 1px solid var(--neutral-200); border-radius: 8px; ' +
    'margin-bottom: 0.5rem; position: relative;';

  div.innerHTML = `
    <input type="text" name="epp_adicional_${eppAdicionalesCount}"
           class="form-input" placeholder="Nombre del elemento adicional" style="margin: 0;">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <input type="checkbox"
             name="epp_adicional_check_${eppAdicionalesCount}"
             id="epp_adicional_check_${eppAdicionalesCount}"
             style="width: 20px; height: 20px;">
      <label for="epp_adicional_check_${eppAdicionalesCount}"
             style="margin: 0; font-size: 0.875rem;">Seleccionado</label>
    </div>
    <button type="button" class="remove-epp-btn"
            style="position: absolute; top: 8px; right: 8px; background: #ef4444;
                   color: white; border: none; border-radius: 4px;
                   padding: 4px 8px; cursor: pointer; font-size: 16px;">&times;</button>
  `;

  container.appendChild(div);
}

function addEtapaRow() {
  etapaCount++;
  const container = document.getElementById('etapas-container');

  const etapaDiv = document.createElement('div');
  etapaDiv.style.cssText =
    'margin-bottom: 2rem; padding: 1.5rem; border: 1px solid var(--neutral-200); ' +
    'border-radius: 12px; background: white; box-shadow: var(--shadow-md); position: relative;';

  etapaDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h4 style="font-size: 1.125rem; font-weight: 600; color: var(--primary-color); margin: 0;">
        Etapa ${etapaCount}
      </h4>
      <button type="button" class="btn btn-danger remove-etapa-btn"
              style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">&times;</button>
    </div>
    <div style="display: grid; gap: 1.5rem;">
      <div>
        <label class="form-label required-field">Descripción de la Etapa</label>
        <textarea name="etapa_descripcion_${etapaCount}" class="form-textarea"
                  placeholder="Describa detalladamente esta etapa del trabajo..." required></textarea>
      </div>
      <div>
        <label class="form-label">Riesgos Potenciales (Seleccione todos los que apliquen)</label>
        <div class="checkbox-group" style="max-height: 200px; overflow-y: auto;">
          ${RIESGOS_POTENCIALES.map((riesgo, index) => `
            <div class="checkbox-item">
              <input type="checkbox"
                     id="riesgo_${etapaCount}_${index}"
                     name="etapa_riesgos_${etapaCount}"
                     value="${riesgo}">
              <label for="riesgo_${etapaCount}_${index}">${riesgo}</label>
            </div>`).join('')}
        </div>
      </div>
      <div>
        <label class="form-label required-field">Medidas de Control</label>
        <textarea name="etapa_medidas_${etapaCount}" class="form-textarea"
                  placeholder="Describa las medidas de control para mitigar los riesgos..." required></textarea>
      </div>
    </div>
  `;

  container.appendChild(etapaDiv);
}

function addPersonal() {
  personalCount++;
  const container = document.getElementById('personal-container');

  const personalDiv = document.createElement('div');
  personalDiv.style.cssText =
    'padding: 1.5rem; border: 1px solid var(--neutral-200); border-radius: 8px; ' +
    'margin-bottom: 1rem; background: var(--neutral-50); position: relative;';
  personalDiv.setAttribute('data-personal-id', personalCount);

  personalDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h5 style="font-weight: 600; color: var(--neutral-700); margin: 0;">Participante ${personalCount}</h5>
      <button type="button" onclick="removePersonalCard(${personalCount})"
              style="background: #ef4444; color: white; border: none; border-radius: 4px;
                     padding: 4px 8px; cursor: pointer; font-size: 16px;">&times;</button>
    </div>
    <div class="form-grid form-grid-3" style="gap: 1rem; margin-bottom: 1rem;">
      <div>
        <label class="form-label required-field">Nombre Completo</label>
        <input type="text" name="personal_nombre_${personalCount}" class="form-input" required>
      </div>
      <div>
        <label class="form-label required-field">RUT</label>
        <input type="text" name="personal_rut_${personalCount}"
               class="form-input" placeholder="12.345.678-9" required>
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
        <button type="button" class="clear-btn"
                onclick="clearPersonalSignature(${personalCount})">Limpiar</button>
      </div>
    </div>
  `;

  container.appendChild(personalDiv);

  setTimeout(() => {
    const pad = setupSignaturePad(`firma-personal-${personalCount}`);
    window[`signaturePad_personal_${personalCount}`] = pad;
  }, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
//  FUNCIONES GLOBALES (accedidas desde HTML con onclick)
// ═══════════════════════════════════════════════════════════════════════════

window.removePersonalCard = function(personalId) {
  document.querySelector(`[data-personal-id="${personalId}"]`)?.remove();
};

window.clearPersonalSignature = function(personalId) {
  window[`signaturePad_personal_${personalId}`]?.clear();
};

// ═══════════════════════════════════════════════════════════════════════════
//  ENVÍO DEL FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn   = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled    = true;

  try {
    // Validar firmas principales
    const sigValidation = validateSignatures(
      [firmaSupervisorPad, firmaAprPad],
      ['Firma del Supervisor', 'Firma del APR']
    );
    if (!sigValidation.isValid) {
      showMessage(`Faltan las siguientes firmas: ${sigValidation.missing.join(', ')}`, 'error');
      return;
    }

    // Validar firmas de trabajadores
    const missingWorker = [];
    for (let i = 1; i <= personalCount; i++) {
      const nombre = document.querySelector(`input[name="personal_nombre_${i}"]`);
      if (nombre?.value) {
        const pad = window[`signaturePad_personal_${i}`];
        if (!pad || pad.isEmpty()) missingWorker.push(nombre.value);
      }
    }
    if (missingWorker.length > 0) {
      showMessage(`Faltan firmas de: ${missingWorker.join(', ')}`, 'error');
      return;
    }

    const astData = collectFormData(e.target);
    astData.firmaSupervisorImg = getSignatureImage(firmaSupervisorPad);
    astData.firmaAprImg        = getSignatureImage(firmaAprPad);

    const response = await fetch(WEBHOOKS.ast, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(astData)
    });

    if (response.ok) {
      showMessage('✅ AST enviado con éxito. El PDF se está generando.', 'success');
      setTimeout(() => resetForm(e.target), 2000);
    } else {
      throw new Error(`Error del servidor: ${response.status}`);
    }

  } catch (error) {
    console.error('Error enviando AST:', error);
    showMessage(`❌ Error al enviar: ${error.message}`, 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled    = false;
  }
}

function resetForm(form) {
  form.reset();
  firmaSupervisorPad?.clear();
  firmaAprPad?.clear();

  for (let i = 1; i <= personalCount; i++) {
    window[`signaturePad_personal_${i}`]?.clear();
  }

  document.getElementById('personal-container').innerHTML    = '';
  document.getElementById('etapas-container').innerHTML      = '';
  document.getElementById('epp-adicionales').innerHTML       =
    '<h4 style="font-weight: 600; margin-bottom: 1rem; color: var(--neutral-700);">Elementos Adicionales</h4>';
  document.getElementById('documentos-adicionales').innerHTML = '';

  personalCount           = 0;
  etapaCount              = 0;
  eppAdicionalesCount     = 0;
  documentosAdicionalesCount = 0;

  addEtapaRow();
  setCurrentDateTimeInElement('fechaHoraActual');

  // Resetear selector de autorrelleno
  const grupoSelect = document.getElementById('grupo_actividad');
  const actSelect   = document.getElementById('actividad_select');
  const btnAuto     = document.getElementById('btn-autorellenar');
  if (grupoSelect) grupoSelect.selectedIndex = 0;
  if (actSelect)  { actSelect.innerHTML = '<option value="">Primero seleccione tipo...</option>'; actSelect.disabled = true; }
  if (btnAuto)    btnAuto.disabled = true;
}

// ═══════════════════════════════════════════════════════════════════════════
//  RECOLECCIÓN DE DATOS DEL FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

function collectFormData(form) {
  const formData = new FormData(form);

  const astData = {
    empresa:          formData.get('empresa'),
    obra_area:        formData.get('obra_area'),
    lugar:            formData.get('lugar'),
    trabajo:          formData.get('trabajo'),
    fechaHoraActual:  document.getElementById('fechaHoraActual').textContent,
    documentos:       [],
    epp_predeterminado: [],
    epp_adicional:    [],
    etapas:           [],
    personal:         [],
    prevencionista:   formData.get('prevencionista'),
    firmaSupervisorImg: '',
    firmaAprImg:      ''
  };

  // Documento principal
  const tipoDoc  = formData.get('tipoDocumento');
  const nombreDoc = formData.get('nombreCodigo');
  if (tipoDoc || nombreDoc) astData.documentos.push({ tipo: tipoDoc, nombre: nombreDoc });

  // Documentos adicionales
  for (let i = 1; i <= documentosAdicionalesCount; i++) {
    const tipo   = formData.get(`tipoDocumento_adicional_${i}`);
    const nombre = formData.get(`nombreCodigo_adicional_${i}`);
    if (tipo || nombre) astData.documentos.push({ tipo, nombre });
  }

  // EPP predeterminados
  document.querySelectorAll('input[name="epp_predeterminado"]:checked')
    .forEach(cb => astData.epp_predeterminado.push(cb.value));

  // EPP adicionales
  for (let i = 1; i <= eppAdicionalesCount; i++) {
    const nombre = formData.get(`epp_adicional_${i}`);
    if (nombre) {
      astData.epp_adicional.push({
        nombre,
        seleccionado: formData.get(`epp_adicional_check_${i}`) === 'on'
      });
    }
  }

  // Etapas
  for (let i = 1; i <= etapaCount; i++) {
    const descripcion = formData.get(`etapa_descripcion_${i}`);
    if (descripcion) {
      const riesgos = [];
      document.querySelectorAll(`input[name="etapa_riesgos_${i}"]:checked`)
        .forEach(cb => riesgos.push(cb.value));
      astData.etapas.push({
        descripcion,
        riesgos,
        medidas: formData.get(`etapa_medidas_${i}`)
      });
    }
  }

  // Personal
  for (let i = 1; i <= personalCount; i++) {
    const nombre = formData.get(`personal_nombre_${i}`);
    if (nombre) {
      const pad = window[`signaturePad_personal_${i}`];
      astData.personal.push({
        nombre,
        rut:      formData.get(`personal_rut_${i}`),
        cargo:    formData.get(`personal_cargo_${i}`),
        firmaImg: (pad && !pad.isEmpty()) ? pad.toDataURL('image/png') : null
      });
    }
  }

  return astData;
}

// ── Inicializar cuando el DOM esté listo ───────────────────────────────────
document.addEventListener('DOMContentLoaded', initAST);
