// assets/js/router.js (Versión actualizada - compatible con template unificado)
console.log("🚀 Router Simple v2.0 - Template Unificado");

// Manejar la navegación entre páginas de forma tradicional
// En lugar de cargar contenido dinámicamente, redirigimos a las páginas reales

function initializeRouter() {
    // Solo interceptamos clics para añadir transiciones suaves si queremos
    document.addEventListener('click', e => {
        const link = e.target.closest('a[href]');
        
        // Solo procesar enlaces internos que no abran en nueva pestaña
        if (link && 
            link.target !== '_blank' && 
            link.href.startsWith(window.location.origin) && 
            !link.hasAttribute('data-no-route')) {
            
            // Para este proyecto, permitimos la navegación normal
            // Opcional: agregar transición suave
            if (link.getAttribute('href') !== window.location.pathname + window.location.search) {
                document.body.classList.add('transitioning');
            }
        }
    });
}

// Función para actualizar el estado activo del navbar
function updateActiveNavLink() {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    const urlParams = new URLSearchParams(window.location.search);
    const instance = urlParams.get('instance');
    
    // CONFIGURACIÓN ACTUALIZADA: Detectar template unificado + instancia específica
    const pageConfig = {
        'index.html': 'home',
        'certificados.html': 'certificados',
        'checklist.html': 'checklist',
        'formulario-ast.html': 'formulario-ast',
        'personal.html': 'personal',
        'inventario.html':'inventario'
    };
    
    let currentPageKey;
    
    // LÓGICA NUEVA: Detectar inventario.html con parámetros
    if (filename === 'inventario.html' && instance) {
        currentPageKey = `inventario-${instance}`;
    } else {
        currentPageKey = pageConfig[filename];
    }

    // Actualizar clases activas en el navbar
    document.querySelectorAll('[data-page]').forEach(link => {
        link.classList.remove('bg-blue-50', 'text-blue-600', 'active-link');
        if (link.dataset.page === currentPageKey) {
            link.classList.add('bg-blue-50', 'text-blue-600', 'active-link');
        }
    });
    
    // Log para debug
    console.log(`📍 Página detectada: ${filename}, Instancia: ${instance || 'ninguna'}, Clave: ${currentPageKey}`);
}

// Función adicional para detectar instancia actual (útil para otras funciones)
function getCurrentInstance() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('instance') || null;
}

// Función para generar URL de inventario
function getInventoryUrl(instance) {
    return `./pages/inventario.html?instance=${instance}`;
}

// API global para compatibilidad
window.NavbarAPI = {
    refresh: updateActiveNavLink,
    getCurrentInstance: getCurrentInstance,
    getInventoryUrl: getInventoryUrl
};

// API global para compatibilidad con páginas existentes
window.registerPageCleanup = (cleanupFunction) => {
    console.log("registerPageCleanup llamado, pero no necesario en navegación tradicional");
};

// NUEVA FUNCIÓN: Detectar cambios en parámetros URL (para template unificado)
function handleUrlParameterChanges() {
    let currentUrl = window.location.href;
    
    // Detectar cambios en la URL (incluyendo parámetros)
    const observer = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            updateActiveNavLink();
        }
    });
    
    // Observar cambios en el historial
    window.addEventListener('popstate', updateActiveNavLink);
    
    // También detectar cambios programáticos en la URL
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
        originalPushState.apply(history, arguments);
        setTimeout(updateActiveNavLink, 0);
    };
    
    history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        setTimeout(updateActiveNavLink, 0);
    };
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeRouter();
    updateActiveNavLink();
    handleUrlParameterChanges();
    
    console.log("✅ Router inicializado con soporte para template unificado");
});

// Actualizar enlace activo cuando se navega con botones del navegador
window.addEventListener('popstate', updateActiveNavLink);

// EXPORTAR para uso en otros módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateActiveNavLink,
        getCurrentInstance,
        getInventoryUrl
    };
}