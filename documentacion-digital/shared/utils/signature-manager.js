// shared/utils/signature-manager.js
/**
 * GESTOR DE FIRMAS DIGITALES
 * Migrado y mejorado desde el código original
 * Compatible con SignaturePad library
 */

/**
 * Configura un pad de firma
 * @param {string} canvasId - ID del canvas
 * @returns {Object} - Objeto SignaturePad o null
 */
export function setupSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  
  if (!canvas) {
    console.error(`Canvas "${canvasId}" no encontrado`);
    return null;
  }

  // Verificar que SignaturePad esté disponible
  if (typeof SignaturePad === 'undefined') {
    console.error('SignaturePad library no está cargada');
    return null;
  }

  // Ajustar el tamaño del canvas
  function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
  }

  resizeCanvas();

  // Crear SignaturePad
  const signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)',
    penColor: 'rgb(0, 0, 0)',
    minWidth: 0.5,
    maxWidth: 2.5
  });

  // Configurar botón de limpiar
  const clearButton = canvas.parentElement.querySelector('.clear-btn, [data-target="' + canvasId + '"]');
  if (clearButton) {
    clearButton.addEventListener('click', (e) => {
      e.preventDefault();
      signaturePad.clear();
    });
  }

  // Manejar redimensionamiento de ventana
  window.addEventListener('resize', () => {
    const data = signaturePad.toData();
    resizeCanvas();
    signaturePad.fromData(data);
  });

  console.log(`✅ SignaturePad configurado: ${canvasId}`);
  return signaturePad;
}

/**
 * Verifica si un canvas de firma está vacío
 * @param {HTMLCanvasElement} canvas - Canvas a verificar
 * @returns {boolean}
 */
export function isCanvasEmpty(canvas) {
  if (!canvas) return true;
  
  const context = canvas.getContext('2d');
  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );
  
  return !pixelBuffer.some(color => color !== 0);
}

/**
 * Obtiene la imagen de una firma en base64
 * @param {Object} signaturePad - Instancia de SignaturePad
 * @returns {string|null} - Imagen en base64 o null si está vacía
 */
export function getSignatureImage(signaturePad) {
  if (!signaturePad) return null;
  
  if (signaturePad.isEmpty()) {
    console.warn('La firma está vacía');
    return null;
  }
  
  return signaturePad.toDataURL('image/png');
}

/**
 * Limpia un pad de firma
 * @param {Object} signaturePad - Instancia de SignaturePad
 */
export function clearSignature(signaturePad) {
  if (signaturePad) {
    signaturePad.clear();
  }
}

/**
 * Valida que todas las firmas requeridas estén completas
 * @param {Array<Object>} signaturePads - Array de instancias de SignaturePad
 * @param {Array<string>} names - Nombres de las firmas (para mensajes de error)
 * @returns {Object} - {isValid: boolean, missing: Array}
 */
export function validateSignatures(signaturePads, names = []) {
  const missing = [];
  
  signaturePads.forEach((pad, index) => {
    if (!pad || pad.isEmpty()) {
      const name = names[index] || `Firma ${index + 1}`;
      missing.push(name);
    }
  });
  
  return {
    isValid: missing.length === 0,
    missing
  };
}
