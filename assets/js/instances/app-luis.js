// assets/js/instances/app-luis.js
import { EPPManager } from '../core/epp-manager.js';
import { luisConfig } from '../configs/config-luis.js';

// Crear instancia específica
const eppManager = new EPPManager(luisConfig);

document.addEventListener('DOMContentLoaded', () => {
    // Aplicar tema específico
    document.documentElement.style.setProperty('--instance-primary', luisConfig.theme.primaryColor);
    document.documentElement.style.setProperty('--instance-accent', luisConfig.theme.accentColor);
    
    // Configurar nombre de instancia en el header
    const instanceNameEl = document.getElementById('instanceName');
    if (instanceNameEl) {
        instanceNameEl.textContent = `(${luisConfig.instanceName})`;
    }

    // Configurar título de la página
    const title = document.querySelector('title');
    if (title) {
        title.textContent = `EPP ${luisConfig.instanceName} - ${title.textContent}`;
    }

    // Inicializar la aplicación
    eppManager.initialize();
    console.log(`🚀 Sistema EPP de ${luisConfig.instanceName} inicializado correctamente`);
});

window.EPPManagerInstance = eppManager;