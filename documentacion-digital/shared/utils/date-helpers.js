// shared/utils/date-helpers.js
/**
 * UTILIDADES DE FECHA
 * Migrado y mejorado desde el código original
 */

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Obtiene la fecha y hora actual formateada (DD/MM/YYYY HH:MM)
 * Usada en el formulario AST
 */
export function getCurrentDateTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Establece la fecha actual en un elemento HTML
 * @param {string} elementId - ID del elemento donde establecer la fecha
 */
export function setCurrentDateTimeInElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = getCurrentDateTime();
  } else {
    console.warn(`Elemento con ID "${elementId}" no encontrado`);
  }
}

/**
 * Establece la fecha actual en un input de tipo date
 * @param {string} inputId - ID del input
 */
export function setTodayInInput(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = getTodayDate();
  } else {
    console.warn(`Input con ID "${inputId}" no encontrado`);
  }
}

/**
 * Formatea una fecha de YYYY-MM-DD a DD/MM/YYYY
 */
export function formatDateToDMY(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Obtiene el nombre del mes actual en español
 */
export function getCurrentMonthName() {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[new Date().getMonth()];
}

/**
 * Obtiene el color del mes actual (para checklist)
 */
export function getCurrentMonthColor() {
  const colors = [
    '#FF6B6B', // Enero - Rojo
    '#4ECDC4', // Febrero - Turquesa
    '#95E1D3', // Marzo - Verde agua
    '#FFD93D', // Abril - Amarillo
    '#6BCB77', // Mayo - Verde
    '#4D96FF', // Junio - Azul
    '#9B59B6', // Julio - Morado
    '#E67E22', // Agosto - Naranja
    '#1ABC9C', // Septiembre - Verde azulado
    '#3498DB', // Octubre - Azul cielo
    '#E74C3C', // Noviembre - Rojo oscuro
    '#2ECC71'  // Diciembre - Verde brillante
  ];
  return colors[new Date().getMonth()];
}
