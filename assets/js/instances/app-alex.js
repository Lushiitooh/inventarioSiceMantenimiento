// assets/js/instances/app-alex.js - VERSIÓN CORREGIDA
import { EPPManager } from '../core/epp-manager.js';
import { alexConfig } from '../configs/config-alex.js';

// Crear instancia específica
const eppManager = new EPPManager(alexConfig);

document.addEventListener('DOMContentLoaded', () => {
    console.log(`🚀 Inicializando instancia de ${alexConfig.instanceName}...`);
    
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

    // Inicializar la aplicación
    try {
        eppManager.initialize();
        console.log(`✅ Sistema EPP de ${alexConfig.instanceName} inicializado correctamente`);
        
        // Configurar estado inicial
        if (window.updateAuthStatus) {
            window.updateAuthStatus('loading', `Iniciando ${alexConfig.instanceName}...`);
        }
    } catch (error) {
        console.error(`❌ Error inicializando ${alexConfig.instanceName}:`, error);
        if (window.updateAuthStatus) {
            window.updateAuthStatus('error', 'Error de inicialización');
        }
    }
});

// Exponer instancia globalmente para debugging
window.EPPManagerInstance = eppManager;
window.AlexEPPManager = eppManager;