// config/app.config.js
/**
 * CONFIGURACIÓN GLOBAL - Documentación Digital SICE
 *
 * Este archivo contiene SOLO datos que son comunes a TODOS los contratos:
 * EPP predeterminados, riesgos potenciales, herramientas, webhooks, etc.
 *
 * Los datos específicos por contrato (estaciones, supervisores, trabajadores,
 * prevencionistas, procedimientos) viven en:
 *   data/contratos/{id}/contrato.json       ← metadata y personal
 *   data/contratos/{id}/actividades.json    ← procedimientos y actividades
 *
 * Para agregar un nuevo contrato ver: data/contratos/index.json
 */

export const APP_CONFIG = {

  // ── Empresa ───────────────────────────────────────────────────────────────
  empresa: {
    nombre: 'SICE AGENCIA CHILE S.A'
  },

  // ── Webhooks Pipedream ────────────────────────────────────────────────────
  // Actualizar con las URLs reales de cada webhook
  webhooks: {
    ast:      'https://eo55cuzv9unsqdf.m.pipedream.net',
    checklist: 'https://eo4hxb3eilspbb0.m.pipedream.net'
  },

  // ── EPP predeterminados (comunes a todos los contratos) ───────────────────
  epp: {
    predeterminados: [
      { id: 'casco',                  label: 'Casco' },
      { id: 'linterna_casco',         label: 'Linterna Adosable al Casco' },
      { id: 'lentes',                 label: 'Lentes de seguridad' },
      { id: 'zapatos',                label: 'Zapatos de seguridad' },
      { id: 'guantes',                label: 'Guantes' },
      { id: 'guantes_hyflex',         label: 'Guantes Hyflex' },
      { id: 'guantes_cabritilla',     label: 'Guantes Cabritilla' },
      { id: 'protector_auditivo',     label: 'Protector auditivo' },
      { id: 'protector_respiratorio', label: 'Protector respiratorio' },
      { id: 'arnes',                  label: 'Arnés de seguridad' },
      { id: 'cono',                   label: 'Cono' },
      { id: 'taladro_inalambrico',    label: 'Taladro Inalámbrico' }
    ]
  },

  // ── Herramientas predeterminadas para Checklist ───────────────────────────
  herramientas: {
    predeterminadas: [
      'Caja Herramientas negra',
      'Juego de Dados 36 piezas',
      'Alicate Universal',
      'Alicate Punta',
      'Alicate Cortante',
      'Caiman',
      'Flexometro',
      'Juego de dados',
      'Atornillador de Paleta aislado 1,2x6,5x150mm',
      'Atornillador de Paleta aislado 1,0x5,5x125mm',
      'Atornillador de Paleta aislado 0,8x4,0x100mm',
      'Atornillador de Paleta aislado 0,4x2,5x75mm',
      'Atornillador de cruz aislado PH2x100mm',
      'Atornillador de cruz aislado PH1x80mm',
      'Atornillador de cruz aislado PH0x75mm',
      'Crimpeadora',
      'Ventosa para pisos tecnicos',
      'Martillo'
    ]
  },

  // ── Riesgos potenciales AST (comunes a todos los contratos) ───────────────
  riesgos: {
    potenciales: [
      'Atrapamiento',
      'Atropello',
      'Caídas de distinto nivel',
      'Caídas del mismo nivel',
      'Contacto con electricidad',
      'Contacto con temperatura extrema',
      'Contacto con producto químico',
      'Corte',
      'Ergonómico/Sobreesfuerzo',
      'Exposición a ruido',
      'Exposición a vibraciones',
      'Golpeado contra',
      'Golpeado por',
      'Incendio',
      'Proyección de partículas',
      'Radiación no ionizante',
      'Otros (especificar)'
    ]
  },

  // ── Tipos de documentos de respaldo ──────────────────────────────────────
  documentos: {
    tipos: ['procedimiento', 'instructivo', 'otro', 'no_requiere'],
    labels: {
      procedimiento: 'Procedimiento',
      instructivo:   'Instructivo',
      otro:          'Otro',
      no_requiere:   'No requiere'
    }
  }
};

// ── Exports nombrados para uso directo ────────────────────────────────────
export const EMPRESA                  = APP_CONFIG.empresa;
export const WEBHOOKS                 = APP_CONFIG.webhooks;
export const EPP_PREDETERMINADOS      = APP_CONFIG.epp.predeterminados;
export const HERRAMIENTAS_PREDETERMINADAS = APP_CONFIG.herramientas.predeterminadas;
export const RIESGOS_POTENCIALES      = APP_CONFIG.riesgos.potenciales;
export const TIPOS_DOCUMENTOS         = APP_CONFIG.documentos.tipos;
export const LABELS_DOCUMENTOS        = APP_CONFIG.documentos.labels;
