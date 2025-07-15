// assets/js/pwa-install.js
// Manejador universal de instalación PWA para Android e iOS

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isIOS = this.detectIOS();
        this.isAndroid = this.detectAndroid();
        this.isStandalone = this.detectStandalone();
        this.installButton = null;
        this.modal = null;
        
        this.init();
    }

    // Detectar iOS
    detectIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    // Detectar Android
    detectAndroid() {
        return /Android/.test(navigator.userAgent);
    }

    // Detectar si ya está instalada como PWA
    detectStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone || 
               document.referrer.includes('android-app://');
    }

    // Detectar Safari en iOS
    detectIOSSafari() {
        return this.isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
    }

    init() {
        // Si ya está instalada, no mostrar nada
        if (this.isStandalone) {
            console.log('PWA ya está instalada');
            return;
        }

        this.createInstallButton();
        this.setupEventListeners();
        
        // Mostrar el botón después de un breve delay
        setTimeout(() => {
            this.showInstallPrompt();
        }, 3000);
    }

    createInstallButton() {
        // Crear botón de instalación
        this.installButton = document.createElement('div');
        this.installButton.id = 'pwa-install-button';
        this.installButton.className = 'pwa-install-btn hidden';
        
        const iconSvg = this.isIOS ? 
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>` :
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>`;
        
        this.installButton.innerHTML = `
            <div class="pwa-install-content">
                ${iconSvg}
                <span>Instalar App</span>
            </div>
            <button class="pwa-close-btn" aria-label="Cerrar">×</button>
        `;

        // Crear modal para iOS
        this.createIOSModal();
        
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
                    <h3>Instalar Control EPP</h3>
                    <button class="ios-modal-close" aria-label="Cerrar">×</button>
                </div>
                <div class="ios-modal-body">
                    <div class="ios-instruction">
                        <div class="ios-step">
                            <div class="ios-step-number">1</div>
                            <div class="ios-step-content">
                                <p>Presiona el botón <strong>Compartir</strong></p>
                                <div class="ios-share-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.18176 15.0124 5.36077 15.0363 5.53598L5.5 10.5C5.5 10.5 5.5 10.5 5.5 10.5C5.18176 10.5 5 10.6818 5 11V13C5 13.3182 5.18176 13.5 5.5 13.5C5.5 13.5 5.5 13.5 5.5 13.5L15.0363 18.464C15.0124 18.6392 15 18.8182 15 19C15 20.6569 16.3431 22 18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C17.8182 16 17.6392 16.0124 17.464 16.0363L8 11.0711C8.31824 10.7529 8.5 10.3182 8.5 9.84315V9.15685C8.5 8.68176 8.31824 8.24706 8 7.92888L17.464 2.96374C17.6392 2.98765 17.8182 3 18 3Z" fill="currentColor"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="ios-step">
                            <div class="ios-step-number">2</div>
                            <div class="ios-step-content">
                                <p>Selecciona <strong>"Añadir a la pantalla de inicio"</strong></p>
                                <div class="ios-add-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 6V18M6 12H18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="ios-step">
                            <div class="ios-step-number">3</div>
                            <div class="ios-step-content">
                                <p>Confirma presionando <strong>"Añadir"</strong></p>
                                <p class="ios-step-note">La app aparecerá en tu pantalla de inicio</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }

    setupEventListeners() {
        // Event listener para Android (beforeinstallprompt)
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('beforeinstallprompt disparado');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
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

        // Detectar cuando la app se instala
        window.addEventListener('appinstalled', () => {
            console.log('PWA instalada exitosamente');
            this.hideInstallPrompt();
            this.deferredPrompt = null;
        });
    }

    handleInstallClick() {
        if (this.isIOS && this.detectIOSSafari()) {
            // Mostrar instrucciones para iOS Safari
            this.showIOSModal();
        } else if (this.deferredPrompt) {
            // Usar prompt nativo de Android
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Usuario aceptó instalar la PWA');
                } else {
                    console.log('Usuario rechazó instalar la PWA');
                }
                this.deferredPrompt = null;
            });
        } else {
            // Fallback para otros navegadores
            this.showGenericInstructions();
        }
    }

    showInstallPrompt() {
        // Solo mostrar si es un navegador compatible
        if (this.shouldShowPrompt()) {
            this.installButton.classList.remove('hidden');
            this.installButton.classList.add('show');
        }
    }

    hideInstallPrompt() {
        this.installButton.classList.remove('show');
        this.installButton.classList.add('hidden');
        
        // Guardar preferencia del usuario
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }

    showIOSModal() {
        this.modal.classList.remove('hidden');
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideIOSModal() {
        this.modal.classList.remove('show');
        this.modal.classList.add('hidden');
        document.body.style.overflow = '';
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

        // Mostrar solo en navegadores principales
        if (this.isIOS && this.detectIOSSafari()) {
            return true;
        }
        
        if (this.isAndroid && (this.deferredPrompt || /Chrome/.test(navigator.userAgent))) {
            return true;
        }

        return false;
    }

    showGenericInstructions() {
        alert('Para instalar esta aplicación:\n\n' +
              '• En Chrome: Menú > Instalar aplicación\n' +
              '• En Safari: Compartir > Añadir a pantalla de inicio\n' +
              '• En Firefox: Menú > Instalar');
    }
}

// Estilos CSS para el instalador
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
    min-width: 140px;
    transition: all 0.3s ease;
    transform: translateY(100px);
    opacity: 0;
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
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.pwa-install-content {
    display: flex;
    align-items: center;
    gap: 8px;
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
    font-size: 16px;
    cursor: pointer;
    margin-left: 8px;
    transition: background 0.2s ease;
}

.pwa-close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
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
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
}

.ios-modal-content {
    background: white;
    border-radius: 16px;
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.ios-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e5e7eb;
}

.ios-modal-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0;
}

.ios-modal-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #6b7280;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
}

.ios-modal-close:hover {
    background: #f3f4f6;
}

.ios-modal-body {
    padding: 24px;
}

.ios-instruction {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.ios-step {
    display: flex;
    gap: 16px;
    align-items: flex-start;
}

.ios-step-number {
    width: 32px;
    height: 32px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
}

.ios-step-content {
    flex: 1;
}

.ios-step-content p {
    margin: 0 0 8px 0;
    color: #374151;
    line-height: 1.5;
}

.ios-step-note {
    font-size: 12px;
    color: #6b7280;
    margin-top: 4px;
}

.ios-share-icon,
.ios-add-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #f3f4f6;
    border-radius: 8px;
    margin-top: 8px;
    color: #3b82f6;
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
    }
    
    .ios-modal-header,
    .ios-modal-body {
        padding: 20px;
    }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    .ios-modal-content {
        background: #1f2937;
    }
    
    .ios-modal-header {
        border-color: #374151;
    }
    
    .ios-modal-header h3 {
        color: #f9fafb;
    }
    
    .ios-modal-close {
        color: #9ca3af;
    }
    
    .ios-modal-close:hover {
        background: #374151;
    }
    
    .ios-step-content p {
        color: #d1d5db;
    }
    
    .ios-step-note {
        color: #9ca3af;
    }
    
    .ios-share-icon,
    .ios-add-icon {
        background: #374151;
    }
}
</style>
`;

// Insertar estilos
document.head.insertAdjacentHTML('beforeend', PWA_STYLES);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PWAInstaller();
});

// Exportar para uso manual si es necesario
window.PWAInstaller = PWAInstaller;