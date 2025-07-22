// assets/js/instances/app-alex.js
import { EPPManager } from '../core/epp-manager.js';
import { alexConfig } from '../configs/config-alex.js';

// Crear instancia específica
const eppManager = new EPPManager(alexConfig);

document.addEventListener('DOMContentLoaded', () => {
    // Aplicar tema específico
    document.documentElement.style.setProperty('--instance-primary', alexConfig.theme.primaryColor);
    document.documentElement.style.setProperty('--instance-accent', alexConfig.theme.accentColor);
    
    // Configurar nombre de instancia en el header
        const instanceNameEl = document.getElementById('instanceName');
        if (instanceNameEl) {
            instanceNameEl.textContent = `(${alexConfig.instanceName})`;
        }

        // Configurar título de la página
        const title = document.querySelector('title');
        if (title) {
            title.textContent = `EPP ${alexConfig.instanceName} - ${title.textContent}`;
        }    
    // Inicializar la aplicación
    eppManager.initialize();
    console.log(`🚀 Sistema EPP de ${alexConfig.instanceName} inicializado correctamente`);
    
});

window.EPPManagerInstance = eppManager;