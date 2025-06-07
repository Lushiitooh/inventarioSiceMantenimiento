import { db, auth, storage, ADMIN_UID, appIdForPath } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, doc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// --- Variables y Elementos del DOM ---
let allCerts = [];
let currentLoggedInUser = null;
const certsCollectionRef = collection(db, `artifacts/${appIdForPath}/users/${ADMIN_UID}/epp_certificates`);

const authStatus = document.getElementById('authStatus');
const addCertFormSection = document.getElementById('addCertFormSection');
const addCertForm = document.getElementById('addCertForm');
const certEppNameInput = document.getElementById('certEppName');
const certVigenciaInput = document.getElementById('certVigencia');
const certFileInput = document.getElementById('certFile');
const uploadButton = document.getElementById('uploadButton');
const uploadProgress = document.getElementById('uploadProgress');

const searchCertInput = document.getElementById('searchCertInput');
const certsTableBody = document.getElementById('certsTableBody');
const loadingIndicator = document.getElementById('loadingIndicator');
const mainContent = document.getElementById('mainContent');

// --- Lógica Principal ---

// 1. Monitorizar estado de autenticación
onAuthStateChanged(auth, (user) => {
    currentLoggedInUser = user;
    const isAdmin = user && user.uid === ADMIN_UID;
    
    authStatus.textContent = user ? `Autenticado como: ${user.email}` : "No autenticado (vista pública)";
    
    if (isAdmin) {
        addCertFormSection.classList.remove('hidden');
    } else {
        addCertFormSection.classList.add('hidden');
    }
    
    // Ajustar visibilidad de columnas de admin en la tabla
    document.querySelectorAll('.admin-col').forEach(col => {
        col.style.display = isAdmin ? '' : 'none';
    });
    
    loadCertificates(); // Cargar certificados para todos
    mainContent.classList.remove('hidden');
    loadingIndicator.classList.add('hidden');
});

// 2. Cargar y mostrar certificados desde Firestore
function loadCertificates() {
    onSnapshot(query(certsCollectionRef), (snapshot) => {
        allCerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCerts.sort((a, b) => a.eppName.localeCompare(b.eppName));
        displayFilteredCerts();
    }, (error) => {
        console.error("Error al cargar certificados:", error);
        certsTableBody.innerHTML = `<tr><td colspan="5">Error al cargar datos.</td></tr>`;
    });
}

// 3. Filtrar y mostrar certificados en la tabla
function displayFilteredCerts() {
    const searchTerm = searchCertInput.value.toLowerCase().trim();
    const filteredCerts = searchTerm 
        ? allCerts.filter(cert => cert.eppName.toLowerCase().includes(searchTerm))
        : allCerts;
        
    certsTableBody.innerHTML = '';
    const isAdminView = currentLoggedInUser && currentLoggedInUser.uid === ADMIN_UID;
    const colCount = isAdminView ? 5 : 4;

    if (filteredCerts.length === 0) {
        certsTableBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center py-4">No hay certificados que coincidan.</td></tr>`;
        return;
    }

    filteredCerts.forEach(cert => {
        const tr = document.createElement('tr');
        tr.className = 'border-b dark:border-gray-700';

        const vigenciaDate = cert.vigencia.toDate();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Normalizar para comparar solo fechas

        let estado = '<span class="font-semibold text-green-500">Vigente</span>';
        if (vigenciaDate < hoy) {
            estado = '<span class="font-semibold text-red-500">Vencido</span>';
        }

        const adminCol = isAdminView ? `
            <td class="py-4 px-6 text-center">
                <button data-id="${cert.id}" data-storage-path="${cert.storagePath}" class="delete-cert-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Eliminar</button>
            </td>` : '';

        tr.innerHTML = `
            <td class="py-4 px-6 font-medium">${cert.eppName}</td>
            <td class="py-4 px-6 text-center">${vigenciaDate.toLocaleDateString()}</td>
            <td class="py-4 px-6 text-center">${estado}</td>
            <td class="py-4 px-6 text-center">
                <a href="${cert.downloadURL}" target="_blank" class="text-blue-500 hover:underline">Descargar</a>
            </td>
            ${adminCol}
        `;
        certsTableBody.appendChild(tr);
    });
}

// 4. Manejar subida de formulario
addCertForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const eppName = certEppNameInput.value.trim();
    const vigencia = certVigenciaInput.value;
    const file = certFileInput.files[0];

    if (!eppName || !vigencia || !file) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    uploadButton.disabled = true;
    uploadButton.textContent = "Subiendo...";

    const storagePath = `certificates/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadProgress.textContent = `Progreso: ${Math.round(progress)}%`;
        },
        (error) => {
            console.error("Error al subir archivo:", error);
            alert("Error al subir el archivo.");
            uploadButton.disabled = false;
            uploadButton.textContent = "Subir Certificado";
        },
        async () => {
            // Subida completada, obtener URL y guardar en Firestore
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(certsCollectionRef, {
                eppName: eppName,
                vigencia: Timestamp.fromDate(new Date(vigencia)),
                fileName: file.name,
                storagePath: storagePath,
                downloadURL: downloadURL,
                uploadedAt: Timestamp.now()
            });
            
            addCertForm.reset();
            uploadProgress.textContent = "";
            uploadButton.disabled = false;
            uploadButton.textContent = "Subir Certificado";
            alert("¡Certificado subido con éxito!");
        }
    );
});


// 5. Manejar eliminación
certsTableBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-cert-btn')) {
        const certId = e.target.dataset.id;
        const storagePath = e.target.dataset.storagePath;

        if (confirm("¿Estás seguro de que quieres eliminar este certificado? Esta acción no se puede deshacer.")) {
            try {
                // 1. Eliminar archivo de Storage
                const fileRef = ref(storage, storagePath);
                await deleteObject(fileRef);

                // 2. Eliminar documento de Firestore
                await deleteDoc(doc(certsCollectionRef, certId));
                
                alert("Certificado eliminado.");
            } catch (error) {
                console.error("Error al eliminar certificado:", error);
                alert("Hubo un error al eliminar el certificado.");
            }
        }
    }
});

// 6. Event listener para el filtro de búsqueda
searchCertInput.addEventListener('input', displayFilteredCerts);
