// assets/js/pwa-install.js - Versión Corregida y Simplificada

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isIOS = this.detectIOS();
        this.isAndroid = this.detectAndroid();
        this.isStandalone = this.detectStandalone();
        this.isIOSSafari = this.detectIOSSafari();
        this.installButton = null;
        this.modal = null;
        this.hasShownPrompt = false;
        
        // Debug info
        this.logDeviceInfo();
        
        this.init();
    }

    // Detectar iOS con más precisión
    detectIOS() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    }

    // Detectar Android
    detectAndroid() {
        return /Android/.test(navigator.userAgent);
    }

    // Detectar si ya está instalada como PWA
    detectStandalone() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true ||
            document.referrer.includes('android-app://') ||
            window.location.search.includes('utm_source=web_app_manifest')
        );
    }

    // Detectar Safari en iOS específicamente
    detectIOSSafari() {
        if (!this.isIOS) return false;
        
        const userAgent = navigator.userAgent;
        return /Safari/.test(userAgent) && 
               !/CriOS|FxiOS|OPiOS|mercury|Edge/.test(userAgent);
    }

    // Verificar si la instalación es posible
    canInstall() {
        // Si ya está instalada, no mostrar
        if (this.isStandalone) {
            return { possible: false, method: 'already-installed' };
        }

        // Android con prompt disponible
        if (this.isAndroid && this.deferredPrompt) {
            return { possible: true, method: 'native' };
        }
        
        // iOS Safari con capacidades PWA
        if (this.isIOSSafari) {
            return { possible: true, method: 'manual' };
        }
        
        // Chrome/Edge en escritorio con prompt
        if (this.deferredPrompt) {
            return { possible: true, method: 'native' };
        }
        
        return { possible: false, method: 'none' };
    }

    logDeviceInfo() {
        console.log('🔍 PWA Installer - Info del dispositivo:');
        console.log('- iOS:', this.isIOS);
        console.log('- Android:', this.isAndroid);
        console.log('- iOS Safari:', this.isIOSSafari);
        console.log('- Ya instalada:', this.isStandalone);
        console.log('- User Agent:', navigator.userAgent);
        console.log('- Display mode:', window.matchMedia('(display-mode: standalone)').matches);
    }

    init() {
        // Si ya está instalada, no hacer nada
        if (this.isStandalone) {
            console.log('✅ PWA ya está instalada');
            return;
        }

        // Esperar un poco antes de verificar si es posible instalar
        setTimeout(() => {
            const installCheck = this.canInstall();
            if (!installCheck.possible) {
                console.log(`❌ Instalación PWA no disponible: ${installCheck.method}`);
                return;
            }

            console.log(`✅ Instalación PWA disponible (${installCheck.method})`);
            
            this.createInstallButton();
            this.setupEventListeners();
            
            // Mostrar el botón después de un delay para mejor UX
            setTimeout(() => {
                this.showInstallPrompt();
            }, 3000);
        }, 1000);
    }

    createInstallButton() {
        this.installButton = document.createElement('div');
        this.installButton.id = 'pwa-install-button';
        this.installButton.className = 'pwa-install-btn hidden';
        
        const buttonText = this.isIOSSafari ? 'Instalar App' : 'Instalar App';
        const iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>`;
        
        this.installButton.innerHTML = `
            <div class="pwa-install-content">
                ${iconSvg}
                <span>${buttonText}</span>
            </div>
            <button class="pwa-close-btn" aria-label="Cerrar">×</button>
        `;

        if (this.isIOSSafari) {
            this.createIOSModal();
        }
        
        document.body.appendChild(this.installButton);
    }

    createIOSModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'ios-install-modal';
        this.modal.className = 'ios-install-modal hidden';
        
        this.modal.innerHTML = `
            <div class="ios-modal-overlay"></div>
            <div class="ios-modal-content">
                <div class="ios-modal-header">
                    <h3>📱 Instalar Control EPP</h3>
                    <button class="ios-modal-close" aria-label="Cerrar">×</button>
                </div>
                <div class="ios-modal-body">
                    <div class="ios-intro">
                        <p>Para instalar esta app en tu iPhone:</p>
                    </div>
                    
                    <div class="ios-instruction">
                        <div class="ios-step">
                            <div class="ios-step-number">1</div>
                            <div class="ios-step-content">
                                <p><strong>Toca el botón "Compartir"</strong> en la barra inferior de Safari</p>
                                <div class="ios-share-demo">
                                    <div class="safari-bar">
                                        <div class="safari-icons">
                                            <div class="safari-icon inactive">↩️</div>
                                            <div class="safari-icon inactive">↪️</div>
                                            <div class="safari-icon active">📤</div>
                                            <div class="safari-icon inactive">📖</div>
                                            <div class="safari-icon inactive">⭐</div>
                                        </div>
                                    </div>
                                    <div class="arrow-point">👆 Toca aquí</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ios-step">
                            <div class="ios-step-number">2</div>
                            <div class="ios-step-content">
                                <p><strong>Busca y toca "Añadir a pantalla de inicio"</strong></p>
                                <div class="ios-action-demo">
                                    <div class="ios-option">
                                        <span class="ios-option-icon">📱</span>
                                        <span class="ios-option-text">Añadir a pantalla de inicio</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ios-step">
                            <div class="ios-step-number">3</div>
                            <div class="ios-step-content">
                                <p><strong>Confirma tocando "Añadir"</strong></p>
                                <div class="ios-result">
                                    <p class="ios-success">✅ ¡Listo! La app aparecerá en tu pantalla de inicio</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ios-footer">
                        <button class="ios-understand-btn" onclick="this.closest('.ios-install-modal').classList.add('hidden')">
                            Entendido
                        </button>
                        <p class="ios-note">💡 Una vez instalada, funcionará como cualquier app nativa</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }

    setupEventListeners() {
        // Event listener para Android (beforeinstallprompt)
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('🚀 beforeinstallprompt detectado');
            e.preventDefault();
            this.deferredPrompt = e;
            
            if (!this.hasShownPrompt) {
                this.showInstallPrompt();
            }
        });

        // Click en el botón principal
        this.installButton.addEventListener('click', (e) => {
            if (e.target.classList.contains('pwa-close-btn')) {
                this.hideInstallPrompt();
                return;
            }
            this.handleInstallClick();
        });

        // Event listeners para el modal de iOS
        if (this.modal) {
            this.modal.querySelector('.ios-modal-close').addEventListener('click', () => {
                this.hideIOSModal();
            });
            
            this.modal.querySelector('.ios-modal-overlay').addEventListener('click', () => {
                this.hideIOSModal();
            });
        }

        // Detectar cuando la app se instala exitosamente
        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA instalada exitosamente');
            this.onInstallSuccess();
        });

        // Detectar cambios en display-mode (útil para iOS)
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        mediaQuery.addListener((e) => {
            if (e.matches) {
                console.log('📱 App ejecutándose en modo standalone');
                this.onInstallSuccess();
            }
        });
    }

    handleInstallClick() {
        if (this.isIOSSafari) {
            // Mostrar instrucciones para iOS Safari
            this.showIOSModal();
        } else if (this.deferredPrompt) {
            // Usar prompt nativo de Android/Chrome
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('✅ Usuario aceptó instalar la PWA');
                    this.onInstallSuccess();
                } else {
                    console.log('❌ Usuario rechazó instalar la PWA');
                }
                this.deferredPrompt = null;
            });
        } else {
            // Fallback para otros navegadores
            this.showGenericInstructions();
        }
    }

    showInstallPrompt() {
        const installCheck = this.canInstall();
        if (installCheck.possible && !this.hasShownPrompt) {
            this.installButton.classList.remove('hidden');
            this.installButton.classList.add('show');
            this.hasShownPrompt = true;
            
            console.log(`📋 Mostrando prompt de instalación (${installCheck.method})`);
        }
    }

    hideInstallPrompt() {
        this.installButton.classList.remove('show');
        this.installButton.classList.add('hidden');
        
        // Guardar preferencia del usuario por 24 horas
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        console.log('❌ Prompt de instalación ocultado');
    }

    showIOSModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            console.log('📱 Mostrando modal de instrucciones iOS');
        }
    }

    hideIOSModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
            console.log('📱 Ocultando modal de instrucciones iOS');
        }
    }

    onInstallSuccess() {
        console.log('🎉 Instalación exitosa detectada');
        this.hideInstallPrompt();
        this.hideIOSModal();
        
        // Mostrar mensaje de éxito
        this.showSuccessMessage();
        
        // Limpiar referencias
        this.deferredPrompt = null;
        
        // Guardar estado de instalación
        localStorage.setItem('pwa-installed', 'true');
    }

    showSuccessMessage() {
        const successDiv = document.createElement('div');
        successDiv.className = 'pwa-success-message';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">🎉</span>
                <span>¡App instalada correctamente!</span>
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            successDiv.remove();
        }, 4000);
    }

    showGenericInstructions() {
        const instructions = {
            'Chrome': 'Menú (⋮) → "Instalar aplicación"',
            'Firefox': 'Menú (≡) → "Instalar"',
            'Edge': 'Menú (⋯) → "Aplicaciones" → "Instalar este sitio como aplicación"',
            'Safari': 'Compartir (📤) → "Añadir a pantalla de inicio"'
        };
        
        let browserInstructions = 'Busca la opción de "Instalar aplicación" en el menú de tu navegador.';
        
        for (const [browser, instruction] of Object.entries(instructions)) {
            if (navigator.userAgent.includes(browser)) {
                browserInstructions = instruction;
                break;
            }
        }
        
        alert(`Para instalar esta aplicación:\n\n${browserInstructions}`);
    }

    shouldShowPrompt() {
        // No mostrar si ya fue rechazado recientemente (24 horas)
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const now = Date.now();
            const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60);
            if (hoursSinceDismissed < 24) {
                return false;
            }
        }

        // No mostrar si ya está instalada
        if (localStorage.getItem('pwa-installed') === 'true') {
            return false;
        }

        return this.canInstall().possible;
    }
}

// Estilos CSS mejorados y más simples
const PWA_STYLES = `
<style>
.pwa-install-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 160px;
    transition: all 0.3s ease;
    transform: translateY(100px);
    opacity: 0;
    border: 2px solid rgba(255, 255, 255, 0.2);
    font-family: 'Inter', sans-serif;
}

.pwa-install-btn.show {
    transform: translateY(0);
    opacity: 1;
}

.pwa-install-btn.hidden {
    transform: translateY(100px);
    opacity: 0;
    pointer-events: none;
}

.pwa-install-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
}

.pwa-install-content {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 14px;
}

.pwa-close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
    margin-left: 12px;
    transition: all 0.2s ease;
}

.pwa-close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

/* Modal para iOS */
.ios-install-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    font-family: 'Inter', sans-serif;
}

.ios-install-modal.show {
    opacity: 1;
    visibility: visible;
}

.ios-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
}

.ios-modal-content {
    background: white;
    border-radius: 20px;
    max-width: 420px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.ios-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 16px;
    border-bottom: 1px solid #e5e7eb;
}

.ios-modal-header h3 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
}

.ios-modal-close {
    background: #f3f4f6;
    border: none;
    font-size: 20px;
    color: #6b7280;
    cursor: pointer;
    padding: 8px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
}

.ios-modal-close:hover {
    background: #e5e7eb;
    color: #374151;
}

.ios-modal-body {
    padding: 24px;
}

.ios-intro {
    background: #f0f9ff;
    border-left: 4px solid #0ea5e9;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 24px;
}

.ios-intro p {
    margin: 0;
    color: #0c4a6e;
    font-weight: 500;
}

.ios-instruction {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.ios-step {
    display: flex;
    gap: 16px;
    align-items: flex-start;
}

.ios-step-number {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    flex-shrink: 0;
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.ios-step-content {
    flex: 1;
}

.ios-step-content p {
    margin: 0 0 12px 0;
    color: #374151;
    line-height: 1.6;
    font-size: 15px;
}

.ios-share-demo {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    margin-top: 12px;
    text-align: center;
}

.safari-bar {
    background: #000;
    border-radius: 20px;
    padding: 12px 16px;
    margin-bottom: 8px;
}

.safari-icons {
    display: flex;
    justify-content: space-around;
    align-items: center;
}

.safari-icon {
    font-size: 20px;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.safari-icon.active {
    background: #007AFF;
    animation: pulse 2s infinite;
}

.safari-icon.inactive {
    opacity: 0.6;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.arrow-point {
    color: #3b82f6;
    font-weight: 600;
    font-size: 14px;
}

.ios-action-demo {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    margin-top: 12px;
}

.ios-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ios-option-icon {
    font-size: 20px;
}

.ios-option-text {
    font-weight: 600;
    color: #1f2937;
}

.ios-result {
    background: #f0fdf4;
    border: 2px solid #bbf7d0;
    border-radius: 12px;
    padding: 16px;
    margin-top: 12px;
    text-align: center;
}

.ios-success {
    margin: 0;
    color: #166534;
    font-weight: 600;
}

.ios-footer {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
}

.ios-understand-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.ios-understand-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.ios-note {
    margin: 16px 0 0 0;
    font-size: 13px;
    color: #6b7280;
    line-height: 1.5;
}

/* Mensaje de éxito */
.pwa-success-message {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
    z-index: 10001;
    opacity: 0;
    transition: all 0.4s ease;
    font-family: 'Inter', sans-serif;
}

.pwa-success-message.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}

.success-content {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
}

.success-icon {
    font-size: 20px;
}

/* Responsive */
@media (max-width: 480px) {
    .pwa-install-btn {
        bottom: 16px;
        right: 16px;
        left: 16px;
        min-width: auto;
        justify-content: center;
    }
    
    .ios-install-modal {
        padding: 16px;
    }
    
    .ios-modal-content {
        max-height: 85vh;
        border-radius: 16px;
    }
    
    .ios-modal-header,
    .ios-modal-body {
        padding: 20px;
    }
    
    .ios-step {
        gap: 12px;
    }
    
    .ios-step-number {
        width: 32px;
        height: 32px;
        font-size: 14px;
    }
}
</style>
`;

// Insertar estilos en el head
document.head.insertAdjacentHTML('beforeend', PWA_STYLES);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando PWA Installer corregido...');
    new PWAInstaller();
});

// Exportar para uso manual si es necesario
window.PWAInstaller = PWAInstaller;