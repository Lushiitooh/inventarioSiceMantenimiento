// assets/js/navbar.js (Corregido con rutas dinámicas)

document.addEventListener('DOMContentLoaded', function () {

    const pageConfig = {
        'index.html': 'home',
        'inventario-luis.html': 'inventario-luis',
        'certificados.html': 'certificados',
        'checklist.html': 'checklist',
        'formulario-ast.html': 'formulario-ast'
    };

    // Función para obtener la ruta correcta a la navbar.
    function getNavbarUrl() {
        const path = window.location.pathname;
        // Si la ruta incluye '/pages/', estamos en una subcarpeta.
        return path.includes('/pages/') ? '../components/navbar.html' : './components/navbar.html';
    }
    
    // Función para obtener la ruta correcta para los enlaces de navegación.
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
        if (!navbarPlaceholder) return;

        try {
            const response = await fetch(getNavbarUrl());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const html = await response.text();
            navbarPlaceholder.innerHTML = html;
            
            // Una vez cargado el HTML, inicializamos sus funciones.
            initializeMobileMenu();
            adjustNavLinks();
            setActiveNavLink();

        } catch (error) {
            console.error('Error al cargar la navbar:', error);
            navbarPlaceholder.innerHTML = `<div class="bg-red-100 text-red-700 p-4 text-center">Error al cargar el menú.</div>`;
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
        // Tu código existente para el menú móvil (sin cambios)
    }

    function setActiveNavLink() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        const currentPageKey = pageConfig[filename];

        document.querySelectorAll('[data-page]').forEach(link => {
            link.classList.remove('bg-blue-50', 'text-blue-600'); // Quita la clase activa
            if (link.dataset.page === currentPageKey) {
                link.classList.add('bg-blue-50', 'text-blue-600'); // Añade la clase activa
            }
        });
    }

    // API global para que el router pueda refrescar el estado activo
    window.NavbarAPI = {
        refresh: setActiveNavLink
    };

    initializeNavbar();
});