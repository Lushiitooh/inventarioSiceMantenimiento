/**
 * riohs.js - Lógica del formulario de Recepción RIOHS
 * SICE AGENCIA CHILE S.A. - Sistema de Gestión SST
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PIPEDREAM_WEBHOOK_RIOHS = "https://REEMPLAZA_CON_TU_URL_PIPEDREAM";

// Colección Firestore para este documento
const FIRESTORE_COLLECTION = "riohs_firmas";

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let signaturePad = null;
let currentStep = 1;

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    initFechas();
    initSignaturePad();
    initRutValidation();
});

function initFechas() {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaLarga = ahora.toLocaleDateString('es-CL', opciones);
    const fechaCorta = ahora.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

    // Header
    const fechaDisplay = document.getElementById('fechaDisplay');
    if (fechaDisplay) fechaDisplay.textContent = fechaLarga;

    // Documento preview
    const fechaDoc = document.getElementById('fechaDocumento');
    if (fechaDoc) fechaDoc.textContent = fechaCorta;

    // Resumen paso 3
    const summaryFecha = document.getElementById('summaryFecha');
    if (summaryFecha) summaryFecha.textContent = fechaLarga;
}

function initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;

    // Ajustar tamaño del canvas al contenedor
    function resizeCanvas() {
        const container = canvas.parentElement;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = container.offsetWidth * ratio;
        canvas.height = 200 * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        canvas.style.width = container.offsetWidth + "px";
        canvas.style.height = "200px";
        if (signaturePad) signaturePad.clear();
    }

    signaturePad = new SignaturePad(canvas, {
        minWidth: 1.5,
        maxWidth: 3,
        penColor: '#1e293b',
        backgroundColor: 'rgba(248, 250, 252, 0)'
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    signaturePad.addEventListener('beginStroke', () => {
        const hint = document.getElementById('signatureHint');
        if (hint) hint.textContent = '✍️ Firma en progreso...';
        const errEl = document.getElementById('signatureError');
        if (errEl) errEl.classList.add('hidden');
        toggleSubmitButton();
    });

    signaturePad.addEventListener('endStroke', () => {
        const hint = document.getElementById('signatureHint');
        if (hint) hint.textContent = '✅ Firma capturada';
        toggleSubmitButton();
    });
}

function initRutValidation() {
    const inputRut = document.getElementById('inputRut');
    if (!inputRut) return;

    inputRut.addEventListener('blur', function () {
        const rut = this.value.trim();
        if (!rut) return;

        const valid = validarRutChileno(rut);
        const validEl = document.getElementById('rutValidation');
        if (validEl) {
            validEl.classList.remove('hidden');
            if (valid) {
                validEl.textContent = '✅ RUT válido';
                validEl.className = 'text-xs mt-1 text-green-600';
            } else {
                validEl.textContent = '❌ RUT inválido, verifica el formato y dígito verificador';
                validEl.className = 'text-xs mt-1 text-red-500';
            }
        }
        checkStep2Validity();
    });
}

// ============================================================
// NAVEGACIÓN ENTRE PASOS
// ============================================================
function goToStep1() {
    showStep(1);
}

function goToStep2() {
    showStep(2);
}

function goToStep3() {
    const nombre = document.getElementById('inputNombre').value.trim();
    const rut = document.getElementById('inputRut').value.trim();

    if (!nombre || nombre.length < 3) {
        showFieldError('inputNombre', 'Ingresa tu nombre completo');
        return;
    }
    if (!rut || !validarRutChileno(rut)) {
        showFieldError('inputRut', 'Ingresa un RUT válido (Ej: 12.345.678-9)');
        return;
    }

    // Actualizar resumen paso 3
    document.getElementById('summaryNombre').textContent = nombre;
    document.getElementById('summaryRut').textContent = rut;

    showStep(3);
}

function showStep(step) {
    currentStep = step;

    // Ocultar todos los pasos
    ['step1', 'step2', 'step3'].forEach((id, idx) => {
        document.getElementById(id).classList.add('hidden');
        const circle = document.getElementById(`step${idx + 1}Circle`);
        const textEl = document.getElementById(`step${idx + 1}Text`);

        if (idx + 1 < step) {
            circle.className = 'step-circle step-done';
            circle.textContent = '✓';
            if (textEl) textEl.className = 'text-xs font-medium text-green-600 ml-1 hidden sm:block';
        } else if (idx + 1 === step) {
            circle.className = 'step-circle step-active';
            circle.textContent = idx + 1;
            if (textEl) textEl.className = 'text-xs font-medium text-blue-600 ml-1 hidden sm:block';
        } else {
            circle.className = 'step-circle step-pending';
            circle.textContent = idx + 1;
            if (textEl) textEl.className = 'text-xs font-medium text-gray-400 ml-1 hidden sm:block';
        }
    });

    // Líneas de progreso
    const line12 = document.getElementById('line12');
    const line23 = document.getElementById('line23');
    if (line12) line12.className = `step-line${step >= 2 ? ' step-line-done' : ''}`;
    if (line23) line23.className = `step-line${step >= 3 ? ' step-line-done' : ''}`;

    document.getElementById(`step${step}`).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// PREVIEW EN TIEMPO REAL (Paso 1 → Paso 2)
// ============================================================
function updatePreview() {
    const nombre = document.getElementById('inputNombre')?.value.trim() || '';
    const rut = document.getElementById('inputRut')?.value.trim() || '';

    // Preview paso 1 (doc visible)
    const prevNombre = document.getElementById('previewNombre');
    const prevRut = document.getElementById('previewRut');
    if (prevNombre) prevNombre.textContent = nombre || '___________________________';
    if (prevRut) prevRut.textContent = rut || '_______________';

    // Preview pequeño paso 2
    const prevNSmall = document.getElementById('prevNombreSmall');
    const prevRSmall = document.getElementById('prevRutSmall');
    if (prevNSmall) prevNSmall.textContent = nombre || '_______________';
    if (prevRSmall) prevRSmall.textContent = rut || '_______________';

    checkStep2Validity();
}

function checkStep2Validity() {
    const nombre = document.getElementById('inputNombre')?.value.trim() || '';
    const rut = document.getElementById('inputRut')?.value.trim() || '';
    const rutOk = nombre.length >= 3 && validarRutChileno(rut);
    const btn = document.getElementById('btnContinueToSign');
    if (btn) btn.disabled = !rutOk;
}

function toggleSubmitButton() {
    const check = document.getElementById('confirmCheck');
    const btn = document.getElementById('btnSubmit');
    if (!btn || !check) return;
    const firmaOk = signaturePad && !signaturePad.isEmpty();
    btn.disabled = !(check.checked && firmaOk);
}

// ============================================================
// FIRMA
// ============================================================
function clearSignature() {
    if (signaturePad) {
        signaturePad.clear();
        const hint = document.getElementById('signatureHint');
        if (hint) hint.textContent = '← Dibuja tu firma aquí';
        toggleSubmitButton();
    }
}

// ============================================================
// ENVÍO DEL FORMULARIO
// ============================================================
async function submitForm() {
    // Validaciones finales
    if (!signaturePad || signaturePad.isEmpty()) {
        const errEl = document.getElementById('signatureError');
        if (errEl) errEl.classList.remove('hidden');
        return;
    }

    const nombre = document.getElementById('inputNombre').value.trim();
    const rut = document.getElementById('inputRut').value.trim();
    if (!nombre || !validarRutChileno(rut)) {
        alert('Por favor verifica los datos antes de enviar.');
        return;
    }

    // Verificar si ya firmó hoy
    const yaFirmo = await verificarFirmaExistente(rut);
    if (yaFirmo) {
        alert(`⚠️ El trabajador con RUT ${rut} ya tiene una firma registrada para este documento.`);
        return;
    }

    // Mostrar loading
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) loadingEl.classList.add('show');

    try {
        const firmaBase64 = signaturePad.toDataURL('image/png');
        const ahora = new Date();

        // Datos a guardar
        const datos = {
            nombreCompleto: nombre,
            rut: rut,
            firmaBase64: firmaBase64,
            documento: "RIOHS - Reglamento Interno de Orden, Higiene y Seguridad",
            version: "Octubre 2025",
            empresa: "SICE AGENCIA CHILE S.A.",
            fechaFirma: ahora.toLocaleDateString('es-CL', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            }),
            fechaFirmaISO: ahora.toISOString(),
            estado: "firmado",
            pdfGenerado: false,
            timestamp: window.firestoreServerTimestamp ? window.firestoreServerTimestamp() : ahora
        };

        // 1. Guardar en Firebase
        let docId = null;
        if (window.db && window.firestoreAdd && window.firestoreCollection) {
            const docRef = await window.firestoreAdd(
                window.firestoreCollection(window.db, FIRESTORE_COLLECTION),
                datos
            );
            docId = docRef.id;
            console.log("✅ Guardado en Firestore:", docId);
        }

        // 2. Enviar a Pipedream para generar PDF
        const payload = { ...datos, firestoreId: docId };
        // Eliminar timestamp de Firestore (no serializable)
        delete payload.timestamp;

        const response = await fetch(PIPEDREAM_WEBHOOK_RIOHS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Pipedream respondió con status ${response.status}`);
        }

        console.log("✅ Enviado a Pipedream para generación de PDF");

        // 3. Mostrar éxito
        if (loadingEl) loadingEl.classList.remove('show');
        const successTimestamp = document.getElementById('successTimestamp');
        if (successTimestamp) successTimestamp.textContent = `${nombre} · ${rut} · ${ahora.toLocaleString('es-CL')}`;
        const successOverlay = document.getElementById('successOverlay');
        if (successOverlay) successOverlay.classList.add('show');

    } catch (error) {
        console.error("❌ Error al enviar:", error);
        if (loadingEl) loadingEl.classList.remove('show');
        alert(`❌ Error al registrar la firma:\n${error.message}\n\nRevisa la conexión e intenta nuevamente.`);
    }
}

// ============================================================
// VERIFICAR FIRMA EXISTENTE (por RUT)
// ============================================================
async function verificarFirmaExistente(rut) {
    if (!window.db || !window.firestoreQuery || !window.firestoreCollection) return false;
    try {
        const q = window.firestoreQuery(
            window.firestoreCollection(window.db, FIRESTORE_COLLECTION),
            window.firestoreWhere("rut", "==", rut)
        );
        const snap = await window.firestoreGetDocs(q);
        return !snap.empty;
    } catch (e) {
        console.warn("No se pudo verificar firma existente:", e);
        return false;
    }
}

// ============================================================
// RESET DEL FORMULARIO
// ============================================================
function resetForm() {
    const successOverlay = document.getElementById('successOverlay');
    if (successOverlay) successOverlay.classList.remove('show');

    document.getElementById('inputNombre').value = '';
    document.getElementById('inputRut').value = '';
    document.getElementById('confirmCheck').checked = false;
    clearSignature();
    updatePreview();

    const rutValidEl = document.getElementById('rutValidation');
    if (rutValidEl) rutValidEl.classList.add('hidden');

    goToStep1();
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Valida RUT chileno (12.345.678-9 o 12345678-9)
 */
function validarRutChileno(rut) {
    if (!rut || typeof rut !== 'string') return false;
    const cleanRut = rut.replace(/[.\-\s]/g, '').toUpperCase();
    if (cleanRut.length < 8 || cleanRut.length > 9) return false;

    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);
    if (!/^\d+$/.test(body)) return false;

    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const expectedDv = 11 - (sum % 11);
    let expectedDvStr;
    if (expectedDv === 11) expectedDvStr = '0';
    else if (expectedDv === 10) expectedDvStr = 'K';
    else expectedDvStr = String(expectedDv);

    return dv === expectedDvStr;
}

/**
 * Formatea el RUT automáticamente mientras se escribe
 */
function formatRut(input) {
    let value = input.value.replace(/[^\dkK]/g, '').toUpperCase();
    if (value.length > 1) {
        const dv = value.slice(-1);
        const body = value.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        value = `${body}-${dv}`;
    }
    input.value = value;
}

/**
 * Muestra error en un campo de input
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('border-red-400', 'ring-1', 'ring-red-400');
    field.focus();
    setTimeout(() => field.classList.remove('border-red-400', 'ring-1', 'ring-red-400'), 3000);
}
