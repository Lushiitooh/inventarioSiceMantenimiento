// shared/utils/validators.js
/**
 * UTILIDADES DE VALIDACIÓN
 * Para formularios AST y Checklist
 */

/**
 * Valida que un campo no esté vacío
 */
export function isNotEmpty(value) {
  return value && value.trim().length > 0;
}

/**
 * Valida formato de fecha (YYYY-MM-DD)
 */
export function isValidDate(date) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
}

/**
 * Muestra un mensaje de error temporal
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 */
export function showMessage(message, type = 'info') {
  // Crear o obtener contenedor de mensajes
  let container = document.getElementById('message-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'message-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }
  
  // Crear mensaje
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    padding: 15px 20px;
    margin-bottom: 10px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-family: Inter, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  
  // Colores según tipo
  const colors = {
    success: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
    error: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
    warning: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    info: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' }
  };
  
  const color = colors[type] || colors.info;
  messageDiv.style.backgroundColor = color.bg;
  messageDiv.style.color = color.text;
  messageDiv.style.borderLeft = `4px solid ${color.border}`;
  messageDiv.textContent = message;
  
  container.appendChild(messageDiv);
  
  // Auto-remover después de 4 segundos
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      messageDiv.remove();
    }, 300);
  }, 4000);
}

/**
 * Muestra un modal de confirmación
 * @param {string} message - Mensaje a mostrar
 * @returns {Promise<boolean>} - true si el usuario confirma
 */
export function confirmAction(message) {
  return new Promise((resolve) => {
    if (confirm(message)) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

// Agregar estilos de animación si no existen
if (!document.getElementById('validator-styles')) {
  const style = document.createElement('style');
  style.id = 'validator-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
