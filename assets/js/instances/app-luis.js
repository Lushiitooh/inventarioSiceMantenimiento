// assets/js/instances/app-luis.js - CÓDIGO COMPLETO Y CORREGIDO
import { EPPManager } from '../core/epp-manager.js';
import { luisConfig } from '../configs/config-luis.js';

console.log(`🚀 Inicializando instancia de ${luisConfig.instanceName}...`);

// Crear instancia de EPPManager con la configuración de Firebase ya inicializada en el config
const eppManager = new EPPManager(luisConfig);

// --- SOLUCIÓN CLAVE ---
// Comprueba si el usuario ya estaba autenticado cuando se cargó el script.
// Si es así, inicia manualmente la carga de datos.
if (luisConfig.auth.currentUser) {
    console.log(`El usuario ya estaba autenticado. Forzando la carga de datos para ${luisConfig.instanceName}.`);
    eppManager.handleUserAuthenticated(luisConfig.auth.currentUser);
}

// Aplicar tema específico
document.documentElement.style.setProperty('--instance-primary', luisConfig.theme.primaryColor);
document.documentElement.style.setProperty('--instance-accent', luisConfig.theme.accentColor);

// Configurar nombre de instancia en el header
const instanceNameEl = document.getElementById('instanceName');
if (instanceNameEl) {
    instanceNameEl.textContent = `(${luisConfig.instanceName})`;
    console.log(`✅ Nombre de instancia configurado: ${luisConfig.instanceName}`);
}

// Configurar título de la página
const title = document.querySelector('title');
if (title) {
    title.textContent = `EPP ${luisConfig.instanceName} - Control de Inventario`;
    console.log(`✅ Título configurado para ${luisConfig.instanceName}`);
}

// Configurar estado inicial en la UI
if (window.updateAuthStatus) {
    window.updateAuthStatus('loading', `Iniciando ${luisConfig.instanceName}...`);
}

// Exponer instancia globalmente para debugging
window.EPPManagerInstance = eppManager;
window.LuisEPPManager = eppManager;
