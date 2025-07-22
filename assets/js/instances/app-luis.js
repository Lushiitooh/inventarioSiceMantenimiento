// assets/js/instances/app-luis.js - VERSIÓN CORREGIDA
import { EPPManager } from '../core/epp-manager.js';
import { luisConfig } from '../configs/config-luis.js';

// Crear instancia específica
const eppManager = new EPPManager(luisConfig);

document.addEventListener('DOMContentLoaded', () => {
    console.log(`🚀 Inicializando instancia de ${luisConfig.instanceName}...`);
    
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

    // Inicializar la aplicación
    try {
        eppManager.initialize();
        console.log(`✅ Sistema EPP de ${luisConfig.instanceName} inicializado correctamente`);
        
        // Configurar estado inicial
        if (window.updateAuthStatus) {
            window.updateAuthStatus('loading', `Iniciando ${luisConfig.instanceName}...`);
        }
    } catch (error) {
        console.error(`❌ Error inicializando ${luisConfig.instanceName}:`, error);
        if (window.updateAuthStatus) {
            window.updateAuthStatus('error', 'Error de inicialización');
        }
    }
});

// Exponer instancia globalmente para debugging
window.EPPManagerInstance = eppManager;
window.LuisEPPManager = eppManager;