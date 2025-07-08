// navbar.js - Sistema de navegación modular UNIVERSAL
document.addEventListener('DOMContentLoaded', function() {
    
    // --- Configuración de páginas ---
    const pageConfig = {
        'index.html': 'inventario',
        'certificados.html': 'certificados', 
        'checklist.html': 'checklist',
        'formulario-ast.html': 'formulario-ast'
    };

    // --- Generar timestamp para evitar cache ---
    function getCacheBreaker() {
        return Math.floor(Date.now() / (1000 * 60 * 10)); // Cada 10 minutos
    }

    // --- Detectar si es uso externo ---
    function isExternalUsage() {
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src && script.src.includes('jsdelivr.net')) {
                return true;
            }
        }
        return false;
    }

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
            let navbarUrl;
            
            // Si es uso externo, cargar desde jsDelivr CDN
            if (isExternalUsage()) {
                const cacheBreaker = getCacheBreaker();
                navbarUrl = `https://cdn.jsdelivr.net/gh/Lushiitooh/inventarioSiceMantenimiento@main/navbar.html?cb=${cacheBreaker}`;
            } else {
                const isInSubfolder = window.location.pathname.includes('/pages/');
				navbarUrl = isInSubfolder ? '../components/navbar.html' : './components/navbar.html';
            }
            
            const response = await fetch(navbarUrl);
            
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
        
        if (!mobileMenuButton || !closeMobileMenuButton || !mobileMenu || !mobileMenuOverlay) {
            console.error('Faltan elementos del menú móvil en navbar.html');
            return;
        }

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

        mobileMenuButton.addEventListener('click', () => toggleMenu(true));
        closeMobileMenuButton.addEventListener('click', () => toggleMenu(false));
        mobileMenuOverlay.addEventListener('click', () => toggleMenu(false));

        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => toggleMenu(false));
        });

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

        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

        navLinks.forEach(link => {
            const linkPage = link.getAttribute('data-page');
            
            link.classList.remove(
                'text-blue-600', 'dark:text-blue-400', 
                'bg-blue-50', 'dark:bg-blue-900/20'
            );
            
            link.classList.add(
                'text-gray-600', 'dark:text-gray-300',
                'hover:text-blue-600', 'dark:hover:text-blue-400',
                'hover:bg-gray-100', 'dark:hover:bg-gray-700'
            );

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

    function getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        return filename || 'index.html';
    }

    function showNavbarError(container) {
        container.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Error:</strong>
                <span class="block sm:inline">No se pudo cargar el menú de navegación.</span>
            </div>
        `;
    }

    window.addNavbarPage = function(filename, pageKey, displayName, icon = '📄') {
        pageConfig[filename] = pageKey;
        
        if (document.getElementById('mobile-menu')) {
            addNavLinkToExistingNavbar(filename, pageKey, displayName, icon);
        }
    };

    function addNavLinkToExistingNavbar(filename, pageKey, displayName, icon) {
        const desktopNav = document.querySelector('.hidden.md\\:flex');
        if (desktopNav) {
            const desktopLink = document.createElement('a');
            desktopLink.href = `./${filename}`;
            desktopLink.className = 'nav-link px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700';
            desktopLink.setAttribute('data-page', pageKey);
            desktopLink.innerHTML = `${icon} ${displayName}`;
            desktopNav.appendChild(desktopLink);
        }

        const mobileNav = document.querySelector('.flex-1.px-4.py-6.space-y-1');
        if (mobileNav) {
            const mobileLink = document.createElement('a');
            mobileLink.href = `./${filename}`;
            mobileLink.className = 'mobile-nav-link flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400';
            mobileLink.setAttribute('data-page', pageKey);
            mobileLink.innerHTML = `<span class="mr-3 text-xl">${icon}</span> ${displayName}`;
            mobileNav.appendChild(mobileLink);
        }

        initializeMobileMenu();
        setActiveNavLink();
    }

    initializeNavbar();
});

window.NavbarAPI = {
    refresh: function() {
        const setActiveNavLink = () => {
            console.log('Navbar refreshed');
        };
        setActiveNavLink();
    },
    
    addPage: function(filename, pageKey, displayName, icon) {
        if (window.addNavbarPage) {
            window.addNavbarPage(filename, pageKey, displayName, icon);
        }
    }
};
