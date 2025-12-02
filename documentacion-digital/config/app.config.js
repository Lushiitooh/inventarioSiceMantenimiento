// config/app.config.js
/**
 * CONFIGURACIÓN CENTRALIZADA - Documentación Digital SICE
 * Migrado desde el proyecto original
 * Todas las constantes en un solo lugar para fácil mantenimiento
 */

export const APP_CONFIG = {
  // Información de la empresa (extraído de tu código actual)
  empresa: {
    nombre: 'SICE AGENCIA CHILE S.A',
    proyecto: 'Suministro de Puertas Bidireccionales de Control en 7 Estaciones de la Red de Metro',
    estaciones: [
      'Estacion Universidad de Chile',
      'Estacion San Pablo',
      'Estacion Departamental',
      'Estacion Santa Julia',
      'Estacion San Ramon',
      'Estacion San Joaquin',
      'Estacion La Granja'
    ]
  },

  // Trabajadores registrados (extraído de checklist)
  trabajadores: [
    'Nestor Flores',
    'Ronald Cancino',
    'Nicolas Jara',
    'Juan Carlos Valenzuela',
    'Avelino Troncoso',
    'Ronald Rodriguez'
  ],

  // Prevencionistas (extraído de formulario AST)
  prevencionistas: [
    'Luis Sepúlveda',
    'Valeria Huichipan'
  ],

  // Códigos de formularios
  formularios: {
    ast: {
      codigo: 'FTO-AL10195-01',
      version: '01',
      nombre: 'Análisis de Seguridad en el Trabajo'
    },
    checklist: {
      codigo: 'FTO-AL10195-24',
      version: '03',
      nombre: 'Inspección de Herramientas Manuales'
    }
  },

  // ⚠️ IMPORTANTE: Actualizar estas URLs con tus webhooks reales
  webhooks: {
    // Reemplazar con tu webhook de AST de Pipedream
    ast: 'https://eo55cuzv9unsqdf.m.pipedream.net',
    
    // Reemplazar con tu webhook de Checklist de Pipedream
    checklist: 'https://eo4hxb3eilspbb0.m.pipedream.net'  // Este ya lo tenías
  },

  // EPP predeterminados para AST (extraído de tu formulario actual)
  epp: {
    predeterminados: [
      { id: 'casco', label: 'Casco' },
      { id: 'linterna_casco', label: 'Linterna Adosable al Casco' },
      { id: 'lentes', label: 'Lentes de seguridad' },
      { id: 'zapatos', label: 'Zapatos de seguridad' },
      { id: 'guantes', label: 'Guantes' },
      { id: 'guantes_hyflex', label: 'Guantes Hyflex' },
      { id: 'guantes_cabritilla', label: 'Guantes Cabritilla' },
      { id: 'protector_auditivo', label: 'Protector auditivo' },
      { id: 'protector_respiratorio', label: 'Protector respiratorio' },
      { id: 'arnes', label: 'Arnés de seguridad' },
      { id: 'cono', label: 'Cono' },
      { id: 'taladro_inalambrico', label: 'Taladro Inalámbrico' }
    ]
  },

  // Herramientas predeterminadas para Checklist (extraído de tu código)
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

  // Riesgos potenciales para AST (extraído de tu código)
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

  // Tipos de documentos de respaldo (extraído de tu código)
  documentos: {
    tipos: [
      'procedimiento',
      'instructivo',
      'otro',
      'no_requiere'
    ],
    labels: {
      'procedimiento': 'Procedimiento',
      'instructivo': 'Instructivo',
      'otro': 'Otro',
      'no_requiere': 'No requiere'
    }
  }
};

// Exportar para fácil acceso
export const EMPRESA = APP_CONFIG.empresa;
export const TRABAJADORES = APP_CONFIG.trabajadores;
export const PREVENCIONISTAS = APP_CONFIG.prevencionistas;
export const FORMULARIOS = APP_CONFIG.formularios;
export const WEBHOOKS = APP_CONFIG.webhooks;
export const EPP_PREDETERMINADOS = APP_CONFIG.epp.predeterminados;
export const HERRAMIENTAS_PREDETERMINADAS = APP_CONFIG.herramientas.predeterminadas;
export const RIESGOS_POTENCIALES = APP_CONFIG.riesgos.potenciales;
export const TIPOS_DOCUMENTOS = APP_CONFIG.documentos.tipos;
export const LABELS_DOCUMENTOS = APP_CONFIG.documentos.labels;
