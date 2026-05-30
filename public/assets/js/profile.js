import { checkAuth, logoutUser } from "./auth.js";
import {
    getDocuments, updateDocument,
    getFavorites, removeFavorite,
    getUserReviews,
    COLLECTIONS
} from "./firestore.js";
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from "./ui.js";
import { isEmpty, isValidPhone } from "./validators.js";

// ── DOM ──
const loadingState   = document.getElementById("loadingState");
const profileForm    = document.getElementById("profileForm");
const profileName    = document.getElementById("profileName");
const profileEmail   = document.getElementById("profileEmail");
const profilePhone   = document.getElementById("profilePhone");
const profileLicense = document.getElementById("profileLicense");
const profileAddress = document.getElementById("profileAddress");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const viewName       = document.getElementById("viewName");
const viewEmail      = document.getElementById("viewEmail");
const viewPhone      = document.getElementById("viewPhone");
const viewLicense    = document.getElementById("viewLicense");
const viewAddress    = document.getElementById("viewAddress");

// ── Estado ──
let currentUser    = null;
let currentProfile = null;
let isProcessing   = false;
let allVehicles    = [];

// ── Navbar ──
document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn')
    if (navUserName && currentProfile) navUserName.textContent = currentProfile.name || currentUser?.email
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logoutUser()
            window.location.href = './login.html'
        })
    }
})

// ── Auth ──
checkAuth(async (user) => {
    if (isProcessing) return;
    isProcessing = true;
    if (!user) { window.location.href = "./login.html"; return; }
    currentUser = user;
    try {
        const [usersResult, vehiclesResult] = await Promise.all([
            getDocuments(COLLECTIONS.USERS),
            getDocuments(COLLECTIONS.VEHICLES)
        ]);

        if (!usersResult.success) {
            showAlert("profileAlert", "Error al conectar con el servidor de perfiles.");
            return;
        }

        const profile = usersResult.data.find((u) => u.uid === user.uid);
        if (!profile) {
            showAlert("profileAlert", "No se encontró tu expediente en el sistema.");
            return;
        }

        currentProfile = profile;
        allVehicles    = vehiclesResult.success ? vehiclesResult.data : [];

        setupProfileForm(user, profile);

        const navbarContainer = document.getElementById('navbarContainer')
        const navUserName = navbarContainer?.querySelector('#navUserName')
        if (navUserName) navUserName.textContent = profile.name || user.email

        // Cargar favoritos y reseñas en paralelo
        await Promise.all([
            loadFavoritesSection(profile.id),
            loadReviewsSection(profile.id),
            loadRentalsHistory(profile.id)
        ]);

    } catch (error) {
        console.error(error);
        showAlert("profileAlert", "Ocurrió un error al cargar tus datos.");
    }
});

// ── Setup formulario ──
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

    // Ocultar spinner dentro de la card y mostrar contenido
    if (loadingState) loadingState.classList.add("d-none");
    document.getElementById('profileContent')?.classList.remove('d-none');
};

// ── Validación ──
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

// ── Guardar cambios ──
profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert("profileAlert");
    if (!validateProfile()) return;
    try {
        showButtonLoader(saveProfileBtn, "Guardando cambios...");
        const result = await updateDocument(COLLECTIONS.USERS, currentProfile.id, {
            name:          profileName.value.trim(),
            fullName:      profileName.value.trim(),
            phone:         profilePhone.value.trim() || null,
            licenseNumber: profileLicense.value.trim() || null,
            address:       profileAddress.value.trim() || null
        });
        if (!result.success) {
            showAlert("profileAlert", "No se pudieron actualizar tus datos en el sistema.");
            return;
        }
        currentProfile.name = profileName.value.trim();

        const navbarContainer = document.getElementById('navbarContainer')
        const navUserName = navbarContainer?.querySelector('#navUserName')
        if (navUserName) navUserName.textContent = profileName.value.trim()

        if (viewName)    viewName.textContent    = profileName.value.trim();
        if (viewPhone)   viewPhone.textContent   = profilePhone.value.trim() || "—";
        if (viewLicense) viewLicense.textContent = profileLicense.value.trim() || "—";
        if (viewAddress) viewAddress.textContent = profileAddress.value.trim() || "—";

        showToast("Tu perfil se ha actualizado correctamente.", "success");

        // Alert de éxito temporal dentro de la card
        const successAlert = document.getElementById("profileAlert")
        if (successAlert) {
            successAlert.className = "alert alert-success d-flex align-items-center gap-2"
            successAlert.innerHTML = `<i class="bi bi-check-circle-fill fs-5"></i><span><strong>¡Guardado exitosamente!</strong> Tu información personal ha sido actualizada.</span>`
            setTimeout(() => {
                successAlert.classList.add("d-none")
                successAlert.className = "alert alert-danger d-none"
            }, 4000)
        }

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

/* ======================================================
   MODAL DE CONFIRMACIÓN (reemplaza confirm() nativo)
====================================================== */

function showConfirmModal({ title, body, confirmText, confirmClass = 'btn-danger', headerClass = 'bg-danger text-white' }) {
    return new Promise((resolve) => {
        const modalEl    = document.getElementById('confirmModal')
        const header     = document.getElementById('confirmModalHeader')
        const titleEl    = document.getElementById('confirmModalTitle')
        const bodyEl     = document.getElementById('confirmModalBody')
        const confirmBtn = document.getElementById('confirmModalConfirmBtn')
        const cancelBtn  = document.getElementById('confirmModalCancelBtn')
        const closeBtn   = document.getElementById('confirmModalCloseBtn')
        const modal      = bootstrap.Modal.getOrCreateInstance(modalEl)

        header.className       = `modal-header border-0 rounded-top ${headerClass}`
        closeBtn.className     = headerClass.includes('text-white') ? 'btn-close btn-close-white' : 'btn-close'
        titleEl.innerHTML      = title
        bodyEl.innerHTML       = body
        confirmBtn.className   = `btn fw-semibold px-4 ${confirmClass}`
        confirmBtn.textContent = confirmText

        let confirmed = false
        confirmBtn.addEventListener('click', () => { confirmed = true; modal.hide() }, { once: true })
        cancelBtn.addEventListener('click',  () => { modal.hide() }, { once: true })
        closeBtn.addEventListener('click',   () => { modal.hide() }, { once: true })
        modalEl.addEventListener('hidden.bs.modal', () => resolve(confirmed), { once: true })
        modal.show()
    })
}

/* ======================================================
   SECCIÓN DE FAVORITOS
====================================================== */

const loadFavoritesSection = async (profileId) => {
    const section = document.getElementById('favoritesSection')
    const loading = document.getElementById('favoritesLoading')
    const empty   = document.getElementById('favoritesEmpty')
    const grid    = document.getElementById('favoritesGrid')
    if (!section) return
    section.classList.remove('d-none')
    try {
        const result = await getFavorites(profileId)
        if (loading) loading.classList.add('d-none')
        if (!result.success || result.data.length === 0) {
            if (empty) empty.classList.remove('d-none')
            return
        }
        if (grid) {
            grid.classList.remove('d-none')
            grid.innerHTML = result.data.map(fav => {
                const vehicle = allVehicles.find(v => v.id === fav.vehicleId)
                if (!vehicle) return ''
                return `
                    <div class="col" id="fav-card-${fav.id}">
                        <div class="card border-0 shadow-sm h-100" style="border-radius:12px;overflow:hidden;">
                            ${vehicle.imageUrl
                                ? `<img src="${vehicle.imageUrl}" style="height:120px;object-fit:cover;width:100%" alt="${vehicle.brand}">`
                                : `<div class="no-vehicle-img" style="height:120px;">
                                       <i class="bi bi-car-front text-secondary" style="font-size:2rem"></i>
                                   </div>`
                            }
                            <div class="card-body p-2">
                                <h6 class="fw-bold mb-0 small">${vehicle.brand} ${vehicle.model}</h6>
                                <small class="text-secondary" style="font-size:.7rem">${vehicle.year} · ${vehicle.plate}</small>
                                <div class="d-flex justify-content-between align-items-center mt-2">
                                    <span class="fw-bold text-primary small">$${Number(vehicle.dailyPrice).toFixed(2)}<small class="text-secondary fw-normal">/día</small></span>
                                    <button class="btn btn-sm btn-outline-danger py-0 px-1" style="font-size:.7rem"
                                        onclick="removeFav('${fav.id}', '${fav.vehicleId}', '${vehicle.brand} ${vehicle.model}')">
                                        <i class="bi bi-heart-fill me-1"></i>Quitar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>`
            }).filter(Boolean).join('')
            if (grid.innerHTML.trim() === '') {
                grid.classList.add('d-none')
                if (empty) empty.classList.remove('d-none')
            }
        }
    } catch (error) {
        console.error('Error cargando favoritos:', error)
        if (loading) loading.classList.add('d-none')
        if (empty)   empty.classList.remove('d-none')
    }
}

window.removeFav = async (favId, vehicleId, vehicleName) => {
    const confirmed = await showConfirmModal({
        title:        '<i class="bi bi-heart-fill text-danger me-2"></i>Quitar de favoritos',
        body:         `<p class="text-secondary mb-0">¿Quitar <strong>"${vehicleName}"</strong> de tus favoritos?</p>`,
        confirmText:  'Quitar',
        confirmClass: 'btn-danger',
        headerClass:  'bg-danger text-white'
    })
    if (!confirmed) return
    try {
        await removeFavorite(currentProfile.id, vehicleId)
        const card = document.getElementById(`fav-card-${favId}`)
        if (card) card.remove()
        const grid = document.getElementById('favoritesGrid')
        if (grid && grid.children.length === 0) {
            grid.classList.add('d-none')
            document.getElementById('favoritesEmpty')?.classList.remove('d-none')
        }
        showToast(`"${vehicleName}" quitado de favoritos`, 'warning')
    } catch (err) {
        showToast('Error al quitar el favorito', 'danger')
        console.error(err)
    }
}

/* ======================================================
   SECCIÓN DE RESEÑAS
====================================================== */

const renderStarsReadonly = (rating) => {
    let stars = ''
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating
            ? '<i class="bi bi-star-fill" style="color:#f59e0b;font-size:.85rem"></i>'
            : '<i class="bi bi-star"      style="color:#d1d5db;font-size:.85rem"></i>'
    }
    return stars
}

const formatDate = (value) => {
    if (!value) return '—'
    try {
        if (typeof value.toDate === 'function') return value.toDate().toLocaleDateString('es-MX')
        return new Date(value).toLocaleDateString('es-MX')
    } catch { return '—' }
}

const loadReviewsSection = async (profileId) => {
    const section = document.getElementById('reviewsSection')
    const loading = document.getElementById('reviewsLoading')
    const empty   = document.getElementById('reviewsEmpty')
    const list    = document.getElementById('reviewsList')
    if (!section) return
    section.classList.remove('d-none')

    try {
        const result = await getUserReviews(profileId)
        if (loading) loading.classList.add('d-none')

        if (!result.success || result.data.length === 0) {
            if (empty) empty.classList.remove('d-none')
            return
        }

        if (list) {
            list.classList.remove('d-none')

            const sorted = [...result.data].sort((a, b) => {
                const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
                const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
                return db - da
            })

            list.innerHTML = sorted.map(review => {
                const vehicle = allVehicles.find(v => v.id === review.vehicleId)
                const vehicleName = vehicle
                    ? `${vehicle.brand} ${vehicle.model}`
                    : 'Vehículo no disponible'
                const vehicleImg = vehicle?.imageUrl || null

                return `
                    <div class="d-flex gap-2 p-3 rounded-3 mb-3"
                         style="background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.15)">

                        <div class="flex-shrink-0">
                            ${vehicleImg
                                ? `<img src="${vehicleImg}" style="width:56px;height:44px;object-fit:cover;border-radius:8px" alt="${vehicleName}">`
                                : `<div style="width:56px;height:44px;border-radius:8px;background:rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;">
                                       <i class="bi bi-car-front text-secondary" style="font-size:.9rem"></i>
                                   </div>`
                            }
                        </div>

                        <div class="flex-grow-1 min-width-0">
                            <div class="d-flex justify-content-between align-items-start flex-wrap gap-1">
                                <h6 class="fw-bold mb-0 small">${vehicleName}</h6>
                                <small class="text-secondary" style="font-size:.7rem">${formatDate(review.createdAt)}</small>
                            </div>
                            <div class="d-flex gap-1 my-1">
                                ${renderStarsReadonly(review.rating)}
                                <small class="text-secondary ms-1" style="font-size:.75rem">${review.rating}/5</small>
                            </div>
                            ${review.comment
                                ? `<p class="text-secondary small mb-0 fst-italic" style="font-size:.78rem">"${review.comment}"</p>`
                                : `<p class="text-muted small mb-0 fst-italic" style="font-size:.78rem">Sin comentario</p>`
                            }
                        </div>

                    </div>
                `
            }).join('')
        }

    } catch (error) {
        console.error('Error cargando reseñas:', error)
        if (loading) loading.classList.add('d-none')
        if (empty)   empty.classList.remove('d-none')
    }
}

/* ======================================================
   SECCIÓN DE HISTORIAL DE RENTAS
====================================================== */

const loadRentalsHistory = async (profileId) => {
    const section = document.getElementById('rentalsHistorySection');
    const loading = document.getElementById('rentalsHistoryLoading');
    const empty   = document.getElementById('rentalsHistoryEmpty');
    const list    = document.getElementById('rentalsHistoryList');
    if (!section) return;

    section.classList.remove('d-none');

    try {
        const rentalsResult = await getDocuments(COLLECTIONS.RENTALS);
        if (!rentalsResult.success) throw new Error('Error al cargar rentas');

        const myRentals = rentalsResult.data.filter(r => r.customerId === profileId);
        if (loading) loading.classList.add('d-none');

        if (myRentals.length === 0) {
            if (empty) empty.classList.remove('d-none');
            return;
        }

        // Ordenar por fecha de inicio descendente (más reciente primero)
        myRentals.sort((a, b) => b.startDate.toDate() - a.startDate.toDate());

        // Usamos allVehicles que ya está cargado globalmente
        const vehiclesMap = new Map(allVehicles.map(v => [v.id, v]));

        if (list) {
            list.classList.remove('d-none');
            list.innerHTML = myRentals.map(rental => {
                const vehicle = vehiclesMap.get(rental.vehicleId);
                const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo no disponible';
                const plate = vehicle ? vehicle.plate : '---';
                const startDate = rental.startDate.toDate().toLocaleDateString();
                const endDate = rental.endDate.toDate().toLocaleDateString();
                const totalCost = rental.totalCost?.toFixed(2) || '0.00';

                let statusBadge = '';
                if (rental.status === 'active') {
                    statusBadge = '<span class="badge bg-success">🟢 Activa</span>';
                } else if (rental.status === 'completed') {
                    statusBadge = '<span class="badge bg-secondary">✅ Completada</span>';
                } else {
                    statusBadge = `<span class="badge bg-light text-dark">${rental.status}</span>`;
                }

                return `
                    <div class="p-3 border-bottom">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="fw-bold mb-1">${vehicleName}</h6>
                                <div class="small text-secondary">Placa: ${plate}</div>
                                <div class="small text-secondary">📅 ${startDate} → ${endDate}</div>
                                <div class="small fw-semibold mt-1">💰 $${totalCost}</div>
                                <div class="mt-1">${statusBadge}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

    } catch (error) {
        console.error('Error cargando historial de rentas:', error);
        if (loading) loading.classList.add('d-none');
        if (empty) empty.classList.remove('d-none');
        if (empty) empty.innerHTML = '<div class="text-danger text-center py-4">Error al cargar el historial</div>';
    }
};