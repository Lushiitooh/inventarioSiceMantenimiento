// modules/ast/ast.js
/**
 * MÓDULO AST - Análisis Seguro de Trabajo
 * Arquitectura multi-contrato: cada contrato tiene su propio config + actividades.
 * Para agregar un nuevo contrato: crear carpeta en data/contratos/{id}/,
 * agregar contrato.json y actividades.json, luego registrar en data/contratos/index.json.
 */

import { WEBHOOKS, RIESGOS_POTENCIALES } from '../../config/app.config.js';
import { setCurrentDateTimeInElement } from '../../shared/utils/date-helpers.js';
import { setupSignaturePad, getSignatureImage, validateSignatures } from '../../shared/utils/signature-manager.js';
import { showMessage } from '../../shared/utils/validators.js';

// ── Variables globales del módulo ──────────────────────────────────────────
let firmaSupervisorPad         = null;
let firmaAprPad                = null;
let etapaCount                 = 0;
let eppAdicionalesCount        = 0;
let documentosAdicionalesCount = 0;
let personalCount              = 0;

// ── Estado del contrato activo ─────────────────────────────────────────────
let contratoActual    = null;   // objeto completo del contrato seleccionado
let actividadesData   = null;   // actividades.json del contrato activo

/**
 * Mapa: ID del EPP en el JSON → ID del checkbox en el HTML
 * null = sin checkbox predefinido → se agrega como EPP adicional
 */
const EPP_ID_MAP = {
  casco:                  'casco',
  lentes:                 'lentes',
  zapatos:                'zapatos',
  guantes:                'guantes',
  linterna_casco:         'linterna_casco',
  guantes_hyflex:         'guantes_hyflex',
  guantes_cabritilla:     'guantes_cabritilla',
  protector_auditivo:     'protector_auditivo',
  protector_respiratorio: 'protector_respiratorio',
  arnes:                  'arnes',
  cono:                   'cono',
  taladro_inalambrico:    'taladro_inalambrico',
  chaleco:                null,
  manga_larga:            null
};

const EPP_LABELS_EXTRA = {
  chaleco:    'Chaleco reflectante',
  manga_larga: 'Ropa de manga larga'
};

// ═══════════════════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

export function initAST() {
  console.log('📋 Inicializando Formulario AST v2 (multi-contrato)');

  setCurrentDateTimeInElement('fechaHoraActual');

  firmaSupervisorPad = setupSignaturePad('signature-supervisor');
  firmaAprPad        = setupSignaturePad('signature-apr');

  addEtapaRow();
  setupEventListeners();
  setupAutoResizeTextareas();
  loadContratos();   // Primer paso: cargar lista de contratos

  console.log('✅ Formulario AST inicializado');
}

// ═══════════════════════════════════════════════════════════════════════════
//  UTILIDAD — TEXTAREA AUTO-RESIZE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ajusta la altura de un textarea a su contenido.
 */
function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.max(textarea.scrollHeight, 80) + 'px';
}

/**
 * Activa auto-resize en todos los textareas con clase .auto-resize
 * y en los que se agreguen dinámicamente (delegación en document).
 */
function setupAutoResizeTextareas() {
  // Textareas estáticos existentes
  document.querySelectorAll('textarea.auto-resize').forEach(ta => {
    ta.addEventListener('input', () => autoResize(ta));
    autoResize(ta); // tamaño inicial
  });

  // Delegación para textareas generados dinámicamente (etapas, etc.)
  document.addEventListener('input', e => {
    if (e.target.tagName === 'TEXTAREA') autoResize(e.target);
  });
}

/**
 * Aplica auto-resize a todos los textareas del DOM (útil post-autofill).
 */
function resizeAllTextareas() {
  document.querySelectorAll('textarea').forEach(ta => autoResize(ta));
}

// ═══════════════════════════════════════════════════════════════════════════
//  GESTIÓN DE CONTRATOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Carga la lista maestra de contratos desde data/contratos/index.json
 * y puebla el selector de contrato.
 */
async function loadContratos() {
  const contratoSelect = document.getElementById('contrato_select');
  const statusEl       = document.getElementById('contrato-status');

  try {
    const response = await fetch('../data/contratos/index.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    console.log(`📦 ${data.contratos.length} contratos cargados`);

    contratoSelect.innerHTML = '<option value="">Seleccione un contrato...</option>';
    data.contratos.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.id;
      opt.textContent = `${c.nombre} (${c.codigo_interno})`;
      contratoSelect.appendChild(opt);
    });

    contratoSelect.addEventListener('change', () => {
      if (contratoSelect.value) {
        loadContrato(contratoSelect.value);
      } else {
        resetContratoFields();
      }
    });

  } catch (err) {
    console.error('Error cargando contratos:', err);
    contratoSelect.innerHTML = '<option value="">⚠ No se pudo cargar la lista de contratos</option>';
    if (statusEl) statusEl.textContent = `Error: ${err.message}`;
  }
}

/**
 * Carga el contrato seleccionado: puebla campos del formulario y carga
 * las actividades específicas del contrato.
 *
 * @param {string} contratoId - ID de la carpeta del contrato
 */
async function loadContrato(contratoId) {
  const statusEl = document.getElementById('contrato-status');
  if (statusEl) {
    statusEl.textContent = 'Cargando contrato...';
    statusEl.style.color = '#6b7280';
  }

  try {
    const response = await fetch(`../data/contratos/${contratoId}/contrato.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    contratoActual = await response.json();
    console.log(`✅ Contrato cargado: ${contratoActual.nombre}`);

    // ── Código de formulario en cabecera ──────────────────────────────────
    const codigoEl = document.getElementById('codigo-formulario');
    if (codigoEl) {
      codigoEl.textContent = contratoActual.formularios?.ast?.codigo || '—';
    }

    // ── Obra / Área ───────────────────────────────────────────────────────
    const obraInput = document.getElementById('obra_area');
    if (obraInput) obraInput.value = contratoActual.obra_area;

    // ── Lugares específicos ───────────────────────────────────────────────
    const lugarSelect = document.getElementById('lugar');
    if (lugarSelect) {
      lugarSelect.innerHTML = '<option value="">Seleccione una estación...</option>';
      (contratoActual.lugares || []).forEach(lugar => {
        const opt = document.createElement('option');
        opt.value       = lugar;
        opt.textContent = lugar;
        lugarSelect.appendChild(opt);
      });
    }

    // ── Prevencionistas ───────────────────────────────────────────────────
    const prevSelect = document.getElementById('prevencionista_select');
    if (prevSelect) {
      prevSelect.innerHTML = '<option value="">Seleccione...</option>';
      (contratoActual.prevencionistas || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value       = p;
        opt.textContent = p;
        prevSelect.appendChild(opt);
      });
    }

    // ── Habilitar sección de autorrelleno ─────────────────────────────────
    const autofillSection = document.getElementById('autofill-section');
    if (autofillSection) autofillSection.classList.remove('section-disabled');

    // ── Cargar actividades del contrato ───────────────────────────────────
    await loadActividades(contratoId);

    if (statusEl) {
      statusEl.textContent = `✅ ${contratoActual.nombre} — ${contratoActual.codigo_interno}`;
      statusEl.style.color = '#16a34a';
    }

  } catch (err) {
    console.error('Error cargando contrato:', err);
    if (statusEl) {
      statusEl.textContent = `❌ Error al cargar contrato: ${err.message}`;
      statusEl.style.color = '#dc2626';
    }
  }
}

/**
 * Limpia los campos dependientes del contrato cuando se deselecciona.
 */
function resetContratoFields() {
  contratoActual  = null;
  actividadesData = null;

  document.getElementById('obra_area').value        = '';
  document.getElementById('lugar').innerHTML        = '<option value="">Seleccione contrato primero...</option>';
  document.getElementById('prevencionista_select').innerHTML = '<option value="">Seleccione contrato primero...</option>';
  document.getElementById('codigo-formulario').textContent   = '—';

  const grupoSelect = document.getElementById('grupo_actividad');
  const actSelect   = document.getElementById('actividad_select');
  const btnAuto     = document.getElementById('btn-autorellenar');
  if (grupoSelect) grupoSelect.innerHTML = '<option value="">Primero seleccione contrato...</option>';
  if (actSelect)   { actSelect.innerHTML = '<option value="">Primero seleccione tipo...</option>'; actSelect.disabled = true; }
  if (btnAuto)     btnAuto.disabled = true;

  document.getElementById('autofill-section')?.classList.add('section-disabled');
  const statusEl = document.getElementById('contrato-status');
  if (statusEl) statusEl.textContent = '';
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUTORRELLENO — CARGA DEL CATÁLOGO DE ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Carga actividades.json del contrato y puebla el selector de grupos.
 * Path relativo al documento HTML: ../data/contratos/{id}/actividades.json
 *
 * @param {string} contratoId
 */
async function loadActividades(contratoId) {
  const grupoSelect     = document.getElementById('grupo_actividad');
  const actSelect       = document.getElementById('actividad_select');
  const btnAutorellenar = document.getElementById('btn-autorellenar');

  // Resetear selectores mientras carga
  if (grupoSelect) grupoSelect.innerHTML = '<option value="">Cargando catálogo...</option>';
  if (actSelect)   { actSelect.innerHTML = '<option value="">Primero seleccione tipo...</option>'; actSelect.disabled = true; }
  if (btnAutorellenar) btnAutorellenar.disabled = true;

  try {
    const response = await fetch(`../data/contratos/${contratoId}/actividades.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    actividadesData = await response.json();

    if (!actividadesData.grupos || actividadesData.grupos.length === 0) {
      // Contrato sin actividades cargadas aún
      if (grupoSelect) {
        grupoSelect.innerHTML = '<option value="">Sin actividades para este contrato</option>';
      }
      console.log(`ℹ️ Contrato ${contratoId}: catálogo de actividades vacío`);
      return;
    }

    console.log(`📦 Catálogo cargado: ${actividadesData.grupos.length} grupos`);

    // Poblar selector de grupos
    if (grupoSelect) {
      grupoSelect.innerHTML = '<option value="">Seleccione tipo de intervención...</option>';
      actividadesData.grupos.forEach(grupo => {
        const opt = document.createElement('option');
        opt.value       = grupo.id;
        opt.textContent = grupo.label;
        grupoSelect.appendChild(opt);
      });
    }

    // Remover listeners previos clonando el elemento
    const nuevoGrupoSelect = grupoSelect.cloneNode(true);
    grupoSelect.parentNode.replaceChild(nuevoGrupoSelect, grupoSelect);
    const nuevoActSelect = actSelect.cloneNode(true);
    actSelect.parentNode.replaceChild(nuevoActSelect, actSelect);

    // Nuevos event listeners
    nuevoGrupoSelect.addEventListener('change', () => {
      populateActividadesSelect(nuevoGrupoSelect.value);
      document.getElementById('btn-autorellenar').disabled = true;
    });

    nuevoActSelect.addEventListener('change', () => {
      document.getElementById('btn-autorellenar').disabled = !nuevoActSelect.value;
    });

    btnAutorellenar?.addEventListener('click', () => {
      const val = document.getElementById('actividad_select')?.value;
      if (val) autofillFormulario(val);
    });

  } catch (err) {
    console.error('Error cargando actividades:', err);
    if (grupoSelect) {
      grupoSelect.innerHTML = '<option value="">⚠ Error al cargar actividades</option>';
    }
  }
}

/**
 * Pobla el selector de actividades según el grupo seleccionado.
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
 * Busca una actividad por ID en todos los grupos del catálogo activo.
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
//  AUTORRELLENO — MATCHING DE RIESGOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intenta emparejar un riesgo del JSON con uno de los RIESGOS_POTENCIALES del form.
 * Orden: más específico primero para evitar falsos positivos.
 * Riesgos sin coincidencia (daños a equipos, errores de procedimiento) van a notas.
 */
function matchRiesgo(jsonRiesgo) {
  const normalize = s =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const nr = normalize(jsonRiesgo);

  // 1. Coincidencia exacta (sin acentos, sin mayúsculas)
  const exactMatch = RIESGOS_POTENCIALES.find(r => normalize(r) === nr);
  if (exactMatch) return exactMatch;

  // 2. Mapa de palabras clave → riesgo predefinido
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
    [['corte', 'cortes', 'laceracion', 'lesion de', 'borde filoso',
      'herramienta cortante', 'bordes metalicos', 'bordes del disco',
      'tira metalica', 'aspas'],                              'Corte'],
    [['proyeccion', 'particula', 'esquirla'],                 'Proyección de partículas'],
    // ── Ergonomía ────────────────────────────────────────────────────────────
    [['sobreesfuerzo', 'ergon', 'postural', 'carga manual', 'manejo manual'],
                                                              'Ergonómico/Sobreesfuerzo'],
    // ── Ruido / vibraciones ──────────────────────────────────────────────────
    [['ruido', 'acustic'],                                    'Exposición a ruido'],
    [['vibracion'],                                           'Exposición a vibraciones'],
    // ── Golpes (más específico primero) ──────────────────────────────────────
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
    // ── Radiación / inhalación ───────────────────────────────────────────────
    [['radiacion', 'uv ', 'ultravioleta', 'inhala'],          'Radiación no ionizante'],
    // ── Atropello ────────────────────────────────────────────────────────────
    [['atropello', 'transito', 'vehiculo', 'tren', 'metro'],  'Atropello'],
  ];

  for (const [keywords, riesgo] of keywordMap) {
    if (keywords.some(kw => nr.includes(kw))) return riesgo;
  }

  return null; // Sin coincidencia → va a notas en Medidas de Control
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUTORRELLENO — LÓGICA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Completa el formulario con los datos de la actividad seleccionada.
 * NO toca: lugar, personal participante, firmas, ni el selector de contrato.
 */
function autofillFormulario(actividadId) {
  const actividad = getActividadById(actividadId);
  if (!actividad) return;

  console.log(`⚡ Autorellenando: ${actividad.titulo}`);

  // ── 1. Trabajo a Realizar ─────────────────────────────────────────────────
  const trabajoField = document.getElementById('trabajo');
  if (trabajoField) {
    trabajoField.value = actividad.trabajo_descripcion;
    autoResize(trabajoField);
  }

  // ── 2. Documento de Respaldo ──────────────────────────────────────────────
  if (actividad.documentos?.length > 0) {
    const doc = actividad.documentos[0];
    const tipoSelect  = document.getElementById('tipoDocumento');
    const nombreInput = document.getElementById('nombreCodigo');
    if (tipoSelect)  tipoSelect.value  = doc.tipo;
    if (nombreInput) nombreInput.value = doc.nombre;
  }

  // ── 3. EPP ────────────────────────────────────────────────────────────────
  document.querySelectorAll('input[name="epp_predeterminado"]')
    .forEach(cb => (cb.checked = false));

  const eppAdicionalesContainer = document.getElementById('epp-adicionales');
  if (eppAdicionalesContainer) {
    eppAdicionalesContainer.innerHTML =
      '<h4 style="font-weight: 600; margin-bottom: 1rem; color: var(--neutral-700);">Elementos Adicionales</h4>';
    eppAdicionalesCount = 0;
  }

  const allEpp   = [...(actividad.epp || []), ...(actividad.epp_condicional || [])];
  const extraEpp = [];

  allEpp.forEach(eppId => {
    const checkboxId = EPP_ID_MAP[eppId];
    if (checkboxId !== undefined && checkboxId !== null) {
      const cb = document.getElementById(checkboxId);
      if (cb) cb.checked = true;
    } else if (EPP_LABELS_EXTRA[eppId]) {
      extraEpp.push(EPP_LABELS_EXTRA[eppId]);
    }
  });

  extraEpp.forEach(label => addEppRowWithValue(label));

  // ── 4. Etapas del Trabajo ─────────────────────────────────────────────────
  const etapasContainer = document.getElementById('etapas-container');
  if (etapasContainer) {
    etapasContainer.innerHTML = '';
    etapaCount = 0;
  }

  (actividad.secuencia || []).forEach(step => addEtapaRowWithData(step));

  // Aplicar auto-resize a todos los textareas recién creados
  setTimeout(resizeAllTextareas, 50);

  // ── 5. Feedback visual ────────────────────────────────────────────────────
  const statusEl = document.getElementById('autofill-status');
  if (statusEl) {
    statusEl.textContent = `✅ Formulario completado con: "${actividad.titulo}"`;
    statusEl.style.color = '#16a34a';
    setTimeout(() => { statusEl.textContent = ''; }, 5000);
  }

  // Scroll a la sección de información general
  const seccion1 = document.querySelector('#astForm .form-section:nth-of-type(3)');
  if (seccion1) {
    setTimeout(() => seccion1.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUTORRELLENO — HELPERS DE FILA
// ═══════════════════════════════════════════════════════════════════════════

/** Agrega un EPP adicional pre-llenado y marcado (fondo verde). */
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
 * Empareja riesgos del JSON con checkboxes; los sin coincidencia van a notas.
 */
function addEtapaRowWithData(step) {
  etapaCount++;
  const container = document.getElementById('etapas-container');
  if (!container) return;

  const descripcion = step.etapa + (step.descripcion ? '\n\n' + step.descripcion : '');

  const riesgosMatcheados = [];
  const riesgosSinMatch   = [];

  (step.riesgos || []).forEach(r => {
    const matched = matchRiesgo(r);
    if (matched) riesgosMatcheados.push(matched);
    else         riesgosSinMatch.push(r);
  });

  let medidas = (step.controles || []).map(c => `• ${c}`).join('\n');
  if (riesgosSinMatch.length > 0) {
    medidas += `\n\nOtros riesgos a considerar:\n` +
               riesgosSinMatch.map(r => `• ${r}`).join('\n');
  }

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
      e.target.closest('div[style*="margin-bottom"]')?.remove();
    }
    if (e.target.classList.contains('remove-epp-btn')) {
      e.target.closest('div[style*="display: grid"]')?.remove();
    }
    if (e.target.classList.contains('remove-documento-btn')) {
      e.target.closest('div.form-grid')?.remove();
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

  if (!contratoActual) {
    showMessage('Debes seleccionar un contrato antes de enviar el formulario.', 'error');
    return;
  }

  const submitBtn    = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enviando...';
  submitBtn.disabled    = true;

  try {
    const sigValidation = validateSignatures(
      [firmaSupervisorPad, firmaAprPad],
      ['Firma del Supervisor', 'Firma del APR']
    );
    if (!sigValidation.isValid) {
      showMessage(`Faltan las siguientes firmas: ${sigValidation.missing.join(', ')}`, 'error');
      return;
    }

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
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(astData)
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

  personalCount              = 0;
  etapaCount                 = 0;
  eppAdicionalesCount        = 0;
  documentosAdicionalesCount = 0;

  addEtapaRow();
  setCurrentDateTimeInElement('fechaHoraActual');

  // Resetear también los selectores de autorrelleno (pero NO el contrato)
  const grupoSelect = document.getElementById('grupo_actividad');
  const actSelect   = document.getElementById('actividad_select');
  const btnAuto     = document.getElementById('btn-autorellenar');
  const statusEl    = document.getElementById('autofill-status');

  if (grupoSelect && actividadesData?.grupos?.length > 0) {
    // Solo resetear la selección, mantener las opciones del contrato activo
    grupoSelect.selectedIndex = 0;
  }
  if (actSelect) {
    actSelect.innerHTML = '<option value="">Primero seleccione tipo...</option>';
    actSelect.disabled  = true;
  }
  if (btnAuto)  btnAuto.disabled = true;
  if (statusEl) statusEl.textContent = '';
}

// ═══════════════════════════════════════════════════════════════════════════
//  RECOLECCIÓN DE DATOS DEL FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

function collectFormData(form) {
  const formData = new FormData(form);

  const astData = {
    // Datos del contrato
    contrato_id:      contratoActual?.id            || '',
    contrato_nombre:  contratoActual?.nombre         || '',
    codigo_interno:   contratoActual?.codigo_interno || '',
    codigo_mandante:  contratoActual?.codigo_mandante || '',
    codigo_formulario: contratoActual?.formularios?.ast?.codigo || '',

    // Datos del formulario
    empresa:         formData.get('empresa'),
    obra_area:       formData.get('obra_area'),
    lugar:           formData.get('lugar'),
    trabajo:         formData.get('trabajo'),
    fechaHoraActual: document.getElementById('fechaHoraActual').textContent,

    documentos:          [],
    epp_predeterminado:  [],
    epp_adicional:       [],
    etapas:              [],
    personal:            [],
    prevencionista:      formData.get('prevencionista'),
    firmaSupervisorImg:  '',
    firmaAprImg:         ''
  };

  // Documento principal
  const tipoDoc   = formData.get('tipoDocumento');
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
