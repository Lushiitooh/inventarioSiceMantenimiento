// Sistema de Autenticación de Prueba
class AuthManagerTest {
    constructor() {
        this.pipedreamAuthUrl = "https://eoii4q628us7o5q.m.pipedream.net"; // ← Cambiarás esta URL
        this.init();
    }

    init() {
        // Verificar si ya está autenticado al cargar la página
        if (this.isAuthenticated()) {
            // Redirigir al dashboard si ya está logueado
            window.location.href = 'dashboard-test.html';
        }

        // Configurar el formulario de login
        this.setupLoginForm();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e);
        });
    }

    async handleLogin(event) {
        const loginBtn = document.getElementById('loginBtn');
        const statusMessage = document.getElementById('statusMessage');
        
        // Obtener datos del formulario
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');

        // Deshabilitar botón y mostrar estado de carga
        loginBtn.disabled = true;
        loginBtn.textContent = 'Verificando...';
        this.showMessage('Verificando credenciales...', 'info');

        try {
            // Llamar a Pipedream para autenticación
            const response = await fetch(this.pipedreamAuthUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    action: 'login'
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Guardar datos de autenticación
                this.saveAuthData(result);
                
                // Mostrar éxito
                this.showMessage(`¡Bienvenido ${result.user.nombre}!`, 'success');
                
                // Redirigir al dashboard después de 1 segundo
                setTimeout(() => {
                    window.location.href = 'dashboard-test.html';
                }, 1000);

            } else {
                // Mostrar error
                this.showMessage(result.error || 'Error de autenticación', 'error');
            }

        } catch (error) {
            console.error('Error de autenticación:', error);
            this.showMessage('Error de conexión. Intenta nuevamente.', 'error');
        } finally {
            // Rehabilitar botón
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar Sesión';
        }
    }

    saveAuthData(authResult) {
        // Guardar en localStorage
        localStorage.setItem('auth_token_test', authResult.token);
        localStorage.setItem('user_data_test', JSON.stringify(authResult.user));
        localStorage.setItem('auth_timestamp_test', Date.now().toString());
    }

    isAuthenticated() {
        const token = localStorage.getItem('auth_token_test');
        const timestamp = localStorage.getItem('auth_timestamp_test');
        
        if (!token || !timestamp) return false;

        // Verificar si el token no ha expirado (24 horas)
        const now = Date.now();
        const authTime = parseInt(timestamp);
        const hoursElapsed = (now - authTime) / (1000 * 60 * 60);
        
        if (hoursElapsed > 24) {
            this.logout();
            return false;
        }

        return true;
    }

    getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        
        const userData = localStorage.getItem('user_data_test');
        return userData ? JSON.parse(userData) : null;
    }

    getAuthToken() {
        if (!this.isAuthenticated()) return null;
        return localStorage.getItem('auth_token_test');
    }

    logout() {
        // Limpiar datos de autenticación
        localStorage.removeItem('auth_token_test');
        localStorage.removeItem('user_data_test');
        localStorage.removeItem('auth_timestamp_test');
        
        // Redirigir al login
        window.location.href = 'login-test.html';
    }

    showMessage(message, type = 'info') {
        const statusMessage = document.getElementById('statusMessage');
        if (!statusMessage) return;

        // Configurar estilos según el tipo
        let bgColor, textColor, icon;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-100';
                textColor = 'text-green-800';
                icon = '✅';
                break;
            case 'error':
                bgColor = 'bg-red-100';
                textColor = 'text-red-800';
                icon = '❌';
                break;
            case 'info':
            default:
                bgColor = 'bg-blue-100';
                textColor = 'text-blue-800';
                icon = 'ℹ️';
                break;
        }

        // Mostrar mensaje
        statusMessage.className = `mt-4 p-3 rounded-lg ${bgColor} ${textColor} text-sm`;
        statusMessage.innerHTML = `${icon} ${message}`;
        statusMessage.classList.remove('hidden');

        // Ocultar después de 5 segundos si es info o success
        if (type !== 'error') {
            setTimeout(() => {
                statusMessage.classList.add('hidden');
            }, 5000);
        }
    }

    // Método para verificar autenticación antes de hacer llamadas a APIs
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('No autenticado');
        }

        const token = this.getAuthToken();
        
        // Agregar token a las headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        return fetch(url, {
            ...options,
            headers
        });
    }
}

// Crear instancia global
const authManager = new AuthManagerTest();

// Hacer disponible globalmente para otros scripts
window.authManagerTest = authManager;

// Función para proteger páginas que requieren autenticación
window.requireAuth = function() {
    if (!authManager.isAuthenticated()) {
        window.location.href = 'login-test.html';
        return false;
    }
    return true;
};

// Función para logout disponible globalmente
window.logoutTest = function() {
    authManager.logout();
};

console.log("✅ Sistema de autenticación de prueba cargado");