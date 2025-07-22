// assets/js/instances/app-javier.js
import { EPPManager } from '../core/epp-manager.js';
import { javierConfig } from '../configs/config-javier.js';

// Crear instancia específica
const eppManager = new EPPManager(javierConfig);

document.addEventListener('DOMContentLoaded', () => {
    // Aplicar tema específico
    document.documentElement.style.setProperty('--instance-primary', javierConfig.theme.primaryColor);
    document.documentElement.style.setProperty('--instance-accent', javierConfig.theme.accentColor);
    
    // Configurar nombre de instancia en el header
        const instanceNameEl = document.getElementById('instanceName');
        if (instanceNameEl) {
            instanceNameEl.textContent = `(${javierConfig.instanceName})`;
        }
    
        // Configurar título de la página
        const title = document.querySelector('title');
        if (title) {
            title.textContent = `EPP ${javierConfig.instanceName} - ${title.textContent}`;
        }
    
        // Inicializar la aplicación
        eppManager.initialize();
        console.log(`🚀 Sistema EPP de ${javierConfig.instanceName} inicializado correctamente`);
    });

window.EPPManagerInstance = eppManager;