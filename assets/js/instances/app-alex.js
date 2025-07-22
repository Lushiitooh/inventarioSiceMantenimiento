// assets/js/instances/app-alex.js - CÓDIGO COMPLETO Y CORREGIDO
import { EPPManager } from '../core/epp-manager.js';
import { alexConfig, alexConfig } from '../configs/config-alex.js';

console.log(`🚀 Inicializando instancia de ${alexConfig.instanceName}...`);

// Crear instancia de EPPManager con la configuración de Firebase ya inicializada en el config
const eppManager = new EPPManager(alexConfig);

// --- SOLUCIÓN CLAVE ---
// Comprueba si el usuario ya estaba autenticado cuando se cargó el script.
// Si es así, inicia manualmente la carga de datos.
if (alexConfig.auth.currentUser) {
    console.log(`El usuario ya estaba autenticado. Forzando la carga de datos para ${alexConfig.instanceName}.`);
    eppManager.handleUserAuthenticated(alexConfig.auth.currentUser);
}

// Aplicar tema específico
document.documentElement.style.setProperty('--instance-primary', alexConfig.theme.primaryColor);
document.documentElement.style.setProperty('--instance-accent', alexConfig.theme.accentColor);

// Configurar nombre de instancia en el header
const instanceNameEl = document.getElementById('instanceName');
if (instanceNameEl) {
    instanceNameEl.textContent = `(${alexConfig.instanceName})`;
    console.log(`✅ Nombre de instancia configurado: ${alexConfig.instanceName}`);
}

// Configurar título de la página
const title = document.querySelector('title');
if (title) {
    title.textContent = `EPP ${alexConfig.instanceName} - Control de Inventario`;
    console.log(`✅ Título configurado para ${alexConfig.instanceName}`);
}

// Configurar estado inicial en la UI
if (window.updateAuthStatus) {
    window.updateAuthStatus('loading', `Iniciando ${alexConfig.instanceName}...`);
}

// Exponer instancia globalmente para debugging
window.EPPManagerInstance = eppManager;
window.AlexEPPManager = eppManager;
