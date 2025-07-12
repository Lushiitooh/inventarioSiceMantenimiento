// assets/js/navbar.js (Corregido)
document.addEventListener('DOMContentLoaded', function () {
    const pageConfig = {
        'index.html': 'inventario',
        'inventario-luis.html': 'inventario-luis',
        'certificados.html': 'certificados',
        'checklist.html': 'checklist',
        'formulario-ast.html': 'formulario-ast'
    };

    function getNavbarPath() {
        // Asumimos que la estructura del sitio es /index.html y /pages/*.html
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            return '../components/navbar.html';
        }
        return './components/navbar.html';
    }

    async function loadNavbarHTML() {
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (!navbarPlaceholder) {
            console.warn('No se encontró el elemento #navbar-placeholder.');
            return;
        }

        try {
            const navbarUrl = getNavbarPath();
            const response = await fetch(navbarUrl);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const html = await response.text();
            navbarPlaceholder.innerHTML = html;
        } catch (error) {
            console.error('Error al cargar la navbar:', error);
            navbarPlaceholder.innerHTML = `<div style="color:red; text-align:center; padding:1rem;">Error al cargar menú.</div>`;
        }
    }

    function initializeMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const closeMobileMenuButton = document.getElementById('close-mobile-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

        if (!mobileMenuButton || !closeMobileMenuButton || !mobileMenu || !mobileMenuOverlay) {
            return;
        }

        const toggleMenu = (open) => {
            mobileMenu.style.transform = open ? 'translateX(0)' : 'translateX(-100%)';
            mobileMenuOverlay.classList.toggle('hidden', !open);
            document.body.style.overflow = open ? 'hidden' : '';
        };

        mobileMenuButton.addEventListener('click', () => toggleMenu(true));
        closeMobileMenuButton.addEventListener('click', () => toggleMenu(false));
        mobileMenuOverlay.addEventListener('click', () => toggleMenu(false));
        document.addEventListener('keydown', (e) => e.key === 'Escape' && toggleMenu(false));
    }

    function setActiveNavLink() {
        const path = window.location.pathname;
        const currentPageFile = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        const currentPageKey = pageConfig[currentPageFile];

        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
            link.classList.remove('text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
            link.classList.add('text-gray-600', 'dark:text-gray-300');

            if (link.dataset.page === currentPageKey) {
                link.classList.add('text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
            }
        });
    }
    
    // --- Rutas del Navbar ---
    function adjustNavPaths() {
        const isInSubfolder = window.location.pathname.includes('/pages/');
        const prefix = isInSubfolder ? '../' : './';
        
        document.querySelectorAll('a[href^="./"]').forEach(link => {
            const originalHref = link.getAttribute('href');
            if (originalHref.startsWith('./pages')) { // Link a una subpagina
                 link.setAttribute('href', isInSubfolder ? originalHref : originalHref);
            } else { // Link a la raiz (index)
                 link.setAttribute('href', `${prefix}index.html`);
            }
        });
    }

    async function init() {
        await loadNavbarHTML();
        initializeMobileMenu();
        adjustNavPaths();
        setActiveNavLink();
    }

    init();
});