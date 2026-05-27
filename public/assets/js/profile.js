import { checkAuth, logoutUser } from "./auth.js";
import { getDocuments, updateDocument, getAvailableVehicles, COLLECTIONS } from "./firestore.js";
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from "./ui.js";
import { isEmpty, isValidPhone } from "./validators.js";

/* ======================================================
   DOM ELEMENTS
   navUserName y logoutBtn se obtienen en navbarLoaded
   porque el navbar se carga dinámicamente
====================================================== */

const loadingState   = document.getElementById("loadingState");
const profileForm    = document.getElementById("profileForm");

const profileName    = document.getElementById("profileName");
const profileEmail   = document.getElementById("profileEmail");
const profilePhone   = document.getElementById("profilePhone");
const profileLicense = document.getElementById("profileLicense");
const profileAddress = document.getElementById("profileAddress");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const viewName    = document.getElementById("viewName");
const viewEmail   = document.getElementById("viewEmail");
const viewPhone   = document.getElementById("viewPhone");
const viewLicense = document.getElementById("viewLicense");
const viewAddress = document.getElementById("viewAddress");

/* ======================================================
   SESSION VARIABLES
====================================================== */

let currentUser    = null;
let currentProfile = null;
let isProcessing   = false;

/* ======================================================
   NAVBAR: esperar a que cargue dinámicamente
====================================================== */

document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn')

    if (navUserName && currentProfile) {
        navUserName.textContent = currentProfile.name || currentUser?.email
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logoutUser()
            window.location.href = './login.html'
        })
    }
})

/* ======================================================
   AUTH & INITIALIZATION
====================================================== */

checkAuth(async (user) => {

    if (isProcessing) return;
    isProcessing = true;

    if (!user) {
        window.location.href = "./login.html";
        return;
    }

    currentUser = user;

    try {

        const result = await getDocuments(COLLECTIONS.USERS);

        if (!result.success) {
            showAlert("profileAlert", "Error al conectar con el servidor de perfiles.");
            return;
        }

        const profile = result.data.find((u) => u.uid === user.uid);

        if (!profile) {
            showAlert("profileAlert", "No se encontró tu expediente en el sistema.");
            return;
        }

        currentProfile = profile;

        setupProfileForm(user, profile);

        // Si el navbar ya cargó antes que Firebase, poner el nombre aquí
        const navbarContainer = document.getElementById('navbarContainer')
        const navUserName = navbarContainer?.querySelector('#navUserName')
        if (navUserName) {
            navUserName.textContent = profile.name || user.email
        }

    } catch (error) {
        console.error(error);
        showAlert("profileAlert", "Ocurrió un error al cargar tus datos.");
    }
});

/* ======================================================
   FORM MANAGEMENT
====================================================== */

const setupProfileForm = (user, profile) => {

    profileName.value    = profile.name || "";
    profileEmail.value   = profile.email || user.email || "";
    profilePhone.value   = profile.phone || "";
    profileLicense.value = profile.licenseNumber || "";
    profileAddress.value = profile.address || "";

    if (viewName)    viewName.textContent    = profile.name || "—";
    if (viewEmail)   viewEmail.textContent   = profile.email || user.email || "—";
    if (viewPhone)   viewPhone.textContent   = profile.phone || "—";
    if (viewLicense) viewLicense.textContent = profile.licenseNumber || "—";
    if (viewAddress) viewAddress.textContent = profile.address || "—";

    if (loadingState) {
        loadingState.classList.add("d-none");
    }
};

/* ======================================================
   VALIDATION
====================================================== */

const validateProfile = () => {

    let valid = true;

    if (isEmpty(profileName.value)) {
        showAlert("profileAlert", "El nombre completo es obligatorio.");
        valid = false;
    }

    if (profilePhone.value && !isValidPhone(profilePhone.value)) {
        showAlert("profileAlert", "El teléfono debe contener exactamente 10 dígitos numéricos.");
        valid = false;
    }

    if (profileLicense.value && profileLicense.value.trim().length < 6) {
        showAlert("profileAlert", "La licencia de conducir debe tener al menos 6 caracteres.");
        valid = false;
    }

    return valid;
};

/* ======================================================
   SAVE CHANGES
====================================================== */

profileForm?.addEventListener("submit", async (e) => {

    e.preventDefault();
    hideAlert("profileAlert");

    if (!validateProfile()) return;

    try {

        showButtonLoader(saveProfileBtn, "Guardando cambios...");

        // Guardar con "name" para ser consistente con el registro
        const result = await updateDocument(COLLECTIONS.USERS, currentProfile.id, {
            name:          profileName.value.trim(),
            fullName:      profileName.value.trim(),   // sincronizar con dashboard
            phone:         profilePhone.value.trim() || null,
            licenseNumber: profileLicense.value.trim() || null,
            address:       profileAddress.value.trim() || null
        });

        if (!result.success) {
            showAlert("profileAlert", "No se pudieron actualizar tus datos en el sistema.");
            return;
        }

        // Actualizar currentProfile local
        currentProfile.name = profileName.value.trim();

        // Actualizar nombre en el navbar
        const navbarContainer = document.getElementById('navbarContainer')
        const navUserName = navbarContainer?.querySelector('#navUserName')
        if (navUserName) {
            navUserName.textContent = profileName.value.trim()
        }

        if (viewName)    viewName.textContent    = profileName.value.trim();
        if (viewPhone)   viewPhone.textContent   = profilePhone.value.trim() || "—";
        if (viewLicense) viewLicense.textContent = profileLicense.value.trim() || "—";
        if (viewAddress) viewAddress.textContent = profileAddress.value.trim() || "—";

        showToast("Tu perfil se ha actualizado correctamente.", "success");

        // Cerrar modo edición automáticamente al guardar
        const profileViewMode = document.getElementById("profileViewMode");
        const profileEditMode = document.getElementById("profileEditMode");
        const toggleEditBtn   = document.getElementById("toggleEditBtn");

        profileViewMode?.classList.remove("d-none");
        profileEditMode?.classList.add("d-none");
        toggleEditBtn?.classList.remove("d-none");

    } catch (error) {

        console.error(error);
        showAlert("profileAlert", "Ocurrió un error inesperado al procesar la actualización.");

    } finally {

        hideButtonLoader(saveProfileBtn);
    }
});