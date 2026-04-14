(function() {
    // Aplicar el tema lo antes posible para evitar el parpadeo (FOUC)
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Configurar Tailwind para que use clases ('class') en lugar de la media query
    window.tailwind = window.tailwind || {};
    window.tailwind.config = {
        darkMode: 'class'
    };
})();
