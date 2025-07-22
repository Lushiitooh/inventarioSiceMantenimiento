// assets/js/navbar.js (Versión actualizada para template unificado)

document.addEventListener('DOMContentLoaded', function () {
    console.log("🧭 Inicializando navbar v2.0 - Template Unificado");

    // CONFIGURACIÓN ACTUALIZADA: Removemos páginas de inventario separadas
    const pageConfig = {
        'index.html': 'home',
        'personal.html': 'personal',
        'certificados.html': 'certificados',
        'checklist.html': 'checklist',
        'formulario-ast.html': 'formulario-ast'
        // inventario.html se maneja por separado con parámetros
    };

    // Función para obtener la ruta correcta a la navbar
    function getNavbarUrl() {
        const path = window.location.pathname;
        // Si la ruta incluye '/pages/', estamos en una subcarpeta
        return path.includes('/pages/') ? '../components/navbar.html' : './components/navbar.html';
    }
    
    // Función para obtener la ruta correcta para los enlaces de navegación
    function getLinkPath(href) {
        const isInSubfolder = window.location.pathname.includes('/pages/');
        if (href.startsWith('./pages')) {
            return isInSubfolder ? href.replace('./pages/', './') : href;
        }
        if (href === './index.html') {
            return isInSubfolder ? '../index.html' : './index.html';
        }
        return href;
    }

    async function initializeNavbar() {
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (!navbarPlaceholder) {
            console.warn("No se encontró el placeholder del navbar");
            return;
        }

        try {
            const response = await fetch(getNavbarUrl());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const html = await response.text();
            navbarPlaceholder.innerHTML = html;
            
            // Una vez cargado el HTML, inicializamos sus funciones
            initializeMobileMenu();
            adjustNavLinks();
            setActiveNavLink();

        } catch (error) {
            console.error('Error al cargar la navbar:', error);
            navbarPlaceholder.innerHTML = `
                <div class="bg-red-100 text-red-700 p-4 text-center">
                    Error al cargar el menú de navegación
                </div>
            `;
        }
    }

    function adjustNavLinks() {
        const navLinks = document.querySelectorAll('a[data-page]');
        navLinks.forEach(link => {
            const originalHref = link.getAttribute('href');
            if (originalHref) {
                link.href = getLinkPath(originalHref);
            }
        });
    }
    
    function initializeMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const closeMobileMenu = document.getElementById('close-mobile-menu');

        if (!mobileMenuButton || !mobileMenu || !mobileMenuOverlay) {
            console.warn("Elementos del menú móvil no encontrados");
            return;
        }

        // Abrir menú móvil
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.remove('-translate-x-full');
            mobileMenuOverlay.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        });

        // Cerrar menú móvil
        function closeMobileMenuHandler() {
            mobileMenu.classList.add('-translate-x-full');
            mobileMenuOverlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }

        if (closeMobileMenu) {
            closeMobileMenu.addEventListener('click', closeMobileMenuHandler);
        }

        // Cerrar al hacer clic en el overlay
        mobileMenuOverlay.addEventListener('click', closeMobileMenuHandler);

        // Cerrar al hacer clic en un enlace del menú móvil
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                setTimeout(closeMobileMenuHandler, 100);
            });
        });

        // Cerrar con la tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !mobileMenu.classList.contains('-translate-x-full')) {
                closeMobileMenuHandler();
            }
        });
    }

    // FUNCIÓN ACTUALIZADA: Detectar template unificado + instancia específica
    function setActiveNavLink() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        const urlParams = new URLSearchParams(window.location.search);
        const instance = urlParams.get('instance');
        
        let currentPageKey;
        
        // NUEVA LÓGICA: Detectar inventario.html con parámetros
        if (filename === 'inventario.html' && instance) {
            currentPageKey = `inventario-${instance}`;
        } else {
            currentPageKey = pageConfig[filename];
        }

        // Remover clases activas de todos los enlaces
        document.querySelectorAll('[data-page]').forEach(link => {
            link.classList.remove('bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/20', 'dark:text-blue-400');
            link.classList.remove('bg-purple-50', 'text-purple-600', 'dark:bg-purple-900/20', 'dark:text-purple-400');
        });

        // Añadir clases activas al enlace actual
        if (currentPageKey) {
            document.querySelectorAll(`[data-page="${currentPageKey}"]`).forEach(link => {
                // Color especial para Gestión de Personal
                if (currentPageKey === 'personal') {
                    link.classList.add('bg-purple-50', 'text-purple-600', 'dark:bg-purple-900/20', 'dark:text-purple-400');
                } else {
                    link.classList.add('bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/20', 'dark:text-blue-400');
                }
            });
        }
        
        // Log para debug
        console.log(`🎯 Navbar activo: ${filename}, Instancia: ${instance || 'ninguna'}, Clave: ${currentPageKey}`);
    }

    // NUEVA FUNCIÓN: Detectar instancia actual
    function getCurrentInstance() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('instance') || null;
    }

    // NUEVA FUNCIÓN: Generar URL de inventario
    function getInventoryUrl(instance) {
        const isInSubfolder = window.location.pathname.includes('/pages/');
        const basePath = isInSubfolder ? './inventario.html' : './pages/inventario.html';
        return `${basePath}?instance=${instance}`;
    }

    // NUEVA FUNCIÓN: Detectar cambios en URL (incluyendo parámetros)
    function handleUrlParameterChanges() {
        let currentUrl = window.location.href;
        
        // Detectar cambios en la URL (incluyendo parámetros)
        window.addEventListener('popstate', setActiveNavLink);
        
        // También detectar cambios programáticos en la URL
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(history, arguments);
            setTimeout(setActiveNavLink, 0);
        };
        
        history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            setTimeout(setActiveNavLink, 0);
        };
    }

    // API global MEJORADA para que otras partes de la aplicación puedan actualizar el navbar
    window.NavbarAPI = {
        refresh: setActiveNavLink,
        getCurrentInstance: getCurrentInstance,
        getInventoryUrl: getInventoryUrl,
        closeMobileMenu: () => {
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
            if (mobileMenu && mobileMenuOverlay) {
                mobileMenu.classList.add('-translate-x-full');
                mobileMenuOverlay.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }
        }
    };

    // Inicializar la navbar
    initializeNavbar().then(() => {
        // Una vez inicializada, configurar detectores de cambios de URL
        handleUrlParameterChanges();
        console.log("✅ Navbar inicializado con soporte para template unificado");
    });
});