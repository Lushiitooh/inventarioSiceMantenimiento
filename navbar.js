// navbar.js - Sistema de navegación modular
document.addEventListener('DOMContentLoaded', function() {
    
    // --- Configuración de páginas ---
    const pageConfig = {
        'index.html': 'inventario',
        'certificados.html': 'certificados', 
        'checklist.html': 'checklist',
        'formulario-ast.html': 'formulario-ast'
    };

    // --- Función principal para inicializar la navbar ---
    function initializeNavbar() {
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        
        if (!navbarPlaceholder) {
            console.warn('No se encontró el elemento #navbar-placeholder. La navbar no se cargará.');
            return;
        }

        loadNavbarHTML()
            .then(() => {
                initializeMobileMenu();
                setActiveNavLink();
            })
            .catch(error => {
                console.error('Error al cargar la navbar:', error);
                showNavbarError(navbarPlaceholder);
            });
    }

    // --- Cargar HTML de la navbar ---
    async function loadNavbarHTML() {
        try {
            const response = await fetch('./navbar.html');
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            
            const html = await response.text();
            const navbarPlaceholder = document.getElementById('navbar-placeholder');
            navbarPlaceholder.innerHTML = html;
            
        } catch (error) {
            console.error('Error al cargar navbar.html:', error);
            throw error;
        }
    }

    // --- Inicializar menú móvil ---
    function initializeMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const closeMobileMenuButton = document.getElementById('close-mobile-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        
        // Verificar que todos los elementos existen
        if (!mobileMenuButton || !closeMobileMenuButton || !mobileMenu || !mobileMenuOverlay) {
            console.error('Faltan elementos del menú móvil en navbar.html');
            return;
        }

        // Función para alternar el menú
        function toggleMenu(open) {
            if (open) {
                mobileMenu.style.transform = 'translateX(0)';
                mobileMenuOverlay.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            } else {
                mobileMenu.style.transform = 'translateX(-100%)';
                mobileMenuOverlay.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        // Event listeners
        mobileMenuButton.addEventListener('click', () => toggleMenu(true));
        closeMobileMenuButton.addEventListener('click', () => toggleMenu(false));
        mobileMenuOverlay.addEventListener('click', () => toggleMenu(false));

        // Cerrar menú al hacer click en enlaces móviles
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => toggleMenu(false));
        });

        // Cerrar menú con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                toggleMenu(false);
            }
        });
    }

    // --- Marcar enlace activo ---
    function setActiveNavLink() {
        const currentPage = getCurrentPageName();
        const currentPageKey = pageConfig[currentPage];

        if (!currentPageKey) {
            console.warn(`Página no reconocida: ${currentPage}`);
            return;
        }

        // Obtener todos los enlaces de navegación
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

        navLinks.forEach(link => {
            const linkPage = link.getAttribute('data-page');
            
            // Remover clases activas existentes
            link.classList.remove(
                'text-blue-600', 'dark:text-blue-400', 
                'bg-blue-50', 'dark:bg-blue-900/20'
            );
            
            // Añadir clases por defecto
            link.classList.add(
                'text-gray-600', 'dark:text-gray-300',
                'hover:text-blue-600', 'dark:hover:text-blue-400',
                'hover:bg-gray-100', 'dark:hover:bg-gray-700'
            );

            // Si es la página actual, marcar como activo
            if (linkPage === currentPageKey) {
                link.classList.remove(
                    'text-gray-600', 'dark:text-gray-300',
                    'hover:bg-gray-100', 'dark:hover:bg-gray-700'
                );
                link.classList.add(
                    'text-blue-600', 'dark:text-blue-400',
                    'bg-blue-50', 'dark:bg-blue-900/20'
                );
            }
        });
    }

    // --- Obtener nombre de la página actual ---
    function getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        
        // Si está en la raíz o es una página vacía, asumir index.html
        return filename || 'index.html';
    }

    // --- Mostrar error en la navbar ---
    function showNavbarError(container) {
        container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Error:</strong>
                <span class="block sm:inline">No se pudo cargar el menú de navegación.</span>
            </div>
        `;
    }

    // --- Función para añadir nuevas páginas dinámicamente ---
    window.addNavbarPage = function(filename, pageKey, displayName, icon = '📄') {
        pageConfig[filename] = pageKey;
        
        // Si la navbar ya está cargada, actualizar los enlaces
        if (document.getElementById('mobile-menu')) {
            addNavLinkToExistingNavbar(filename, pageKey, displayName, icon);
        }
    };

    // --- Añadir enlace a navbar existente ---
    function addNavLinkToExistingNavbar(filename, pageKey, displayName, icon) {
        // Añadir a navegación desktop
        const desktopNav = document.querySelector('.hidden.md\\:flex');
        if (desktopNav) {
            const desktopLink = document.createElement('a');
            desktopLink.href = `./${filename}`;
            desktopLink.className = 'nav-link px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700';
            desktopLink.setAttribute('data-page', pageKey);
            desktopLink.innerHTML = `${icon} ${displayName}`;
            desktopNav.appendChild(desktopLink);
        }

        // Añadir a navegación móvil
        const mobileNav = document.querySelector('.flex-1.px-4.py-6.space-y-1');
        if (mobileNav) {
            const mobileLink = document.createElement('a');
            mobileLink.href = `./${filename}`;
            mobileLink.className = 'mobile-nav-link flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400';
            mobileLink.setAttribute('data-page', pageKey);
            mobileLink.innerHTML = `<span class="mr-3 text-xl">${icon}</span> ${displayName}`;
            mobileNav.appendChild(mobileLink);
        }

        // Reinicializar eventos
        initializeMobileMenu();
        setActiveNavLink();
    }

    // --- Inicializar todo ---
    initializeNavbar();
});

// --- API pública para uso externo ---
window.NavbarAPI = {
    // Refrescar el estado activo de la navbar
    refresh: function() {
        const setActiveNavLink = () => {
            // Reimplementar la lógica de setActiveNavLink aquí si es necesario
            console.log('Navbar refreshed');
        };
        setActiveNavLink();
    },
    
    // Añadir nueva página
    addPage: function(filename, pageKey, displayName, icon) {
        if (window.addNavbarPage) {
            window.addNavbarPage(filename, pageKey, displayName, icon);
        }
    }
};
