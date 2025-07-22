// assets/js/instances/app-javier.js - CÓDIGO COMPLETO Y CORREGIDO
import { EPPManager } from '../core/epp-manager.js';
import { javierConfig, javierConfig } from '../configs/config-javier.js';

console.log(`🚀 Inicializando instancia de ${javierConfig.instanceName}...`);

// Crear instancia de EPPManager con la configuración de Firebase ya inicializada en el config
const eppManager = new EPPManager(javierConfig);

// --- SOLUCIÓN CLAVE ---
// Comprueba si el usuario ya estaba autenticado cuando se cargó el script.
// Si es así, inicia manualmente la carga de datos.
if (javierConfig.auth.currentUser) {
    console.log(`El usuario ya estaba autenticado. Forzando la carga de datos para ${javierConfig.instanceName}.`);
    eppManager.handleUserAuthenticated(javierConfig.auth.currentUser);
}

// Aplicar tema específico
document.documentElement.style.setProperty('--instance-primary', javierConfig.theme.primaryColor);
document.documentElement.style.setProperty('--instance-accent', javierConfig.theme.accentColor);

// Configurar nombre de instancia en el header
const instanceNameEl = document.getElementById('instanceName');
if (instanceNameEl) {
    instanceNameEl.textContent = `(${javierConfig.instanceName})`;
    console.log(`✅ Nombre de instancia configurado: ${javierConfig.instanceName}`);
}

// Configurar título de la página
const title = document.querySelector('title');
if (title) {
    title.textContent = `EPP ${javierConfig.instanceName} - Control de Inventario`;
    console.log(`✅ Título configurado para ${javierConfig.instanceName}`);
}

// Configurar estado inicial en la UI
if (window.updateAuthStatus) {
    window.updateAuthStatus('loading', `Iniciando ${javierConfig.instanceName}...`);
}

// Exponer instancia globalmente para debugging
window.EPPManagerInstance = eppManager;
window.JavierEPPManager = eppManager;
