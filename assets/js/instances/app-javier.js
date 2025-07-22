// assets/js/instances/app-javier.js - VERSIÓN CORREGIDA
import { EPPManager } from '../core/epp-manager.js';
import { javierConfig } from '../configs/config-javier.js';

// Crear instancia específica
const eppManager = new EPPManager(javierConfig);

document.addEventListener('DOMContentLoaded', () => {
    console.log(`🚀 Inicializando instancia de ${javierConfig.instanceName}...`);
    
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

    // Inicializar la aplicación
    try {
        eppManager.initialize();
        console.log(`✅ Sistema EPP de ${javierConfig.instanceName} inicializado correctamente`);
        
        // Configurar estado inicial
        if (window.updateAuthStatus) {
            window.updateAuthStatus('loading', `Iniciando ${javierConfig.instanceName}...`);
        }
    } catch (error) {
        console.error(`❌ Error inicializando ${javierConfig.instanceName}:`, error);
        if (window.updateAuthStatus) {
            window.updateAuthStatus('error', 'Error de inicialización');
        }
    }
});

// Exponer instancia globalmente para debugging
window.EPPManagerInstance = eppManager;
window.JavierEPPManager = eppManager;