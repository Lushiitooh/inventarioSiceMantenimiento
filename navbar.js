// Este script se ejecuta cuando el contenido del DOM ha sido completamente cargado.
document.addEventListener('DOMContentLoaded', function() {

    // --- Lógica para cargar e inicializar la barra de navegación ---
    // Busca el contenedor de la navbar. Si no lo encuentra, no hace nada.
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (!navbarPlaceholder) {
        console.error('No se encontró el elemento #navbar-placeholder. La barra de navegación no se cargará.');
        return;
    }

    // Carga el HTML de la barra de navegación desde el archivo 'navbar.html'
    fetch('navbar.html')
        .then(response => {
            // Revisa si la petición fue exitosa
            if (!response.ok) {
                throw new Error('No se pudo cargar navbar.html. Estado: ' + response.status);
            }
            return response.text(); // Convierte la respuesta a texto
        })
        .then(html => {
            // Inserta el HTML cargado en el placeholder
            navbarPlaceholder.innerHTML = html;
            // Una vez cargado el HTML, inicializa los eventos del menú móvil
            initializeMobileMenu();
            // Marca el enlace activo basado en la página actual
            setActiveNavLink();
        })
        .catch(error => {
            // Muestra un error en la consola si algo falla
            console.error('Error al cargar la barra de navegación:', error);
            navbarPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error al cargar el menú de navegación.</p>';
        });

    // --- Función para inicializar los eventos del menú móvil ---
    function initializeMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const closeMobileMenuButton = document.getElementById('close-mobile-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        
        // Si no se encuentran los elementos del menú, no se puede continuar.
        if (!mobileMenuButton || !closeMobileMenuButton || !mobileMenu || !mobileMenuOverlay) {
            console.error('Faltan elementos del menú móvil en navbar.html');
            return;
        }

        // Función para abrir o cerrar el menú
        function toggleMenu(open) {
            mobileMenu.classList.toggle('hidden', !open);
            mobileMenu.classList.toggle('-translate-x-full', !open);
            mobileMenuOverlay.classList.toggle('hidden', !open);
        }

        // Asigna los eventos a los botones y al overlay
        mobileMenuButton.addEventListener('click', () => toggleMenu(true));
        closeMobileMenuButton.addEventListener('click', () => toggleMenu(false));
        mobileMenuOverlay.addEventListener('click', () => toggleMenu(false));
    }

    // --- Función para marcar el enlace activo ---
    function setActiveNavLink() {
        // Obtiene el nombre del archivo de la URL actual (ej. "index.html")
        const currentPage = window.location.pathname.split('/').pop();
        
        // Busca todos los enlaces de navegación
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href').split('/').pop();

            // Compara la página actual con el href del enlace
            if (linkPage === currentPage) {
                // Añade una clase para resaltar el enlace activo
                link.classList.add('bg-blue-100', 'dark:bg-blue-900', 'font-bold');
            }
        });
    }
});
