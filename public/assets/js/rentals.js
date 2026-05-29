import { checkAuth, logoutUser } from './auth.js';
import {
    getDocuments, getDocumentById, createDocument, updateDocument,
    getAvailableVehicles, getFavorites, addFavorite, removeFavorite,
    getVehicleReviews, getUserReviews, addReview,
    COLLECTIONS
} from './firestore.js';
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js';

// ── DOM ──
const searchInput      = document.getElementById('searchInput');
const filterCategory   = document.getElementById('filterCategory');
const loadingState     = document.getElementById('loadingState');
const emptyState       = document.getElementById('emptyState');
const rentarModalEl    = document.getElementById('rentarModal');
const rentarModal      = rentarModalEl ? bootstrap.Modal.getOrCreateInstance(rentarModalEl) : null;
const rentaForm        = document.getElementById('rentaForm');
const modalVehicleId   = document.getElementById('modalVehicleId');
const modalVehicleName = document.getElementById('modalVehicleName');
const modalStartDate   = document.getElementById('modalStartDate');
const modalEndDate     = document.getElementById('modalEndDate');
const modalTotalCost   = document.getElementById('modalTotalCost');
const confirmRentaBtn  = document.getElementById('confirmRentaBtn');

// Paginación
const paginationContainer = document.getElementById('paginationContainer');
const prevPageBtn         = document.getElementById('prevPageBtn');
const nextPageBtn         = document.getElementById('nextPageBtn');
const pageNumbers         = document.getElementById('pageNumbers');

// Modal detalle
const detalleModalEl      = document.getElementById('detalleModal');
const detalleModal        = detalleModalEl ? bootstrap.Modal.getOrCreateInstance(detalleModalEl) : null;
const detalleTitle        = document.getElementById('detalleTitle');
const detalleCategory     = document.getElementById('detalleCategory');
const detalleYear         = document.getElementById('detalleYear');
const detallePrice        = document.getElementById('detallePrice');
const detalleStatus       = document.getElementById('detalleStatus');
const detalleImgContainer = document.getElementById('detalleImgContainer');
const detalleRentarBtn    = document.getElementById('detalleRentarBtn');

// Modal reseña
const reviewModalEl   = document.getElementById('reviewModal');
const reviewModal     = reviewModalEl ? bootstrap.Modal.getOrCreateInstance(reviewModalEl) : null;
const reviewForm      = document.getElementById('reviewForm');
const reviewRentalId  = document.getElementById('reviewRentalId');
const reviewVehicleId = document.getElementById('reviewVehicleId');
const reviewComment   = document.getElementById('reviewComment');
const submitReviewBtn = document.getElementById('submitReviewBtn');

// Mis rentas
const rentasLoading          = document.getElementById('rentasLoading');
const activeRentaSection     = document.getElementById('activeRentaSection');
const historialRentasSection = document.getElementById('historialRentasSection');
const noRentasMsg            = document.getElementById('noRentasMsg');
const activeRentaBody        = document.getElementById('activeRentaBody');
const historialRentasBody    = document.getElementById('historialRentasBody');
const refreshRentasBtn       = document.getElementById('refreshRentasBtn');

// ── Estado ──
let allVehicles        = [];
let filteredVehicles   = [];
let categories         = [];
let vehicleRatings     = {};
let favoriteVehicleIds = new Set();
let reviewedRentalIds  = new Set();
let currentCustomerId  = null;
let currentDailyPrice  = 0;
let currentUser        = null;
let currentUserName    = null;
let currentRating      = 0;
let hasActiveRental    = false;

let currentPage       = 1;
const vehiclesPerPage = 6;

// ── Navbar ──
document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn')
    if (navUserName && currentUserName) navUserName.textContent = currentUserName
    logoutBtn?.addEventListener('click', async () => {
        await logoutUser();
        window.location.href = '../login.html';
    });
});

const updateNavbarName = (name) => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    if (navUserName && name) navUserName.textContent = name;
};

// ── Obtener customerId ──
const getOrCreateCustomerId = async (user) => {
    const result = await getDocuments(COLLECTIONS.USERS);
    if (!result.success) throw new Error('No se pudieron cargar los usuarios');
    let customer = result.data.find(c => c.uid === user.uid);
    if (customer) {
        currentUserName = customer.name || user.displayName || user.email;
        return customer.id;
    }
    const newCustomer = {
        uid: user.uid, name: user.displayName || user.email.split('@')[0] || 'Cliente',
        email: user.email, phone: null, licenseNumber: null, address: null,
        role: 'user', active: true
    };
    const createResult = await createDocument(COLLECTIONS.USERS, newCustomer);
    if (!createResult.success) throw new Error('No se pudo crear el perfil de cliente');
    currentUserName = newCustomer.name;
    return createResult.id;
};

// ── Cargar categorías ──
const loadCategories = async () => {
    const result = await getDocuments(COLLECTIONS.VEHICLE_CATEGORIES);
    if (!result.success) return;
    categories = result.data.filter(c => c.active !== false);
    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (filterCategory) filterCategory.innerHTML = `<option value="">Todas las categorías</option>${options}`;
};

// ── Cargar favoritos ──
const loadFavorites = async () => {
    if (!currentCustomerId) return
    try {
        const result = await getFavorites(currentCustomerId)
        if (result.success) favoriteVehicleIds = new Set(result.data.map(f => f.vehicleId))
    } catch (err) { console.error('Error cargando favoritos:', err) }
}

// ── Cargar ratings de todos los vehículos ──
const loadAllRatings = async () => {
    try {
        const result = await getDocuments(COLLECTIONS.REVIEWS)
        if (!result.success) return
        const grouped = {}
        result.data.forEach(r => {
            if (!grouped[r.vehicleId]) grouped[r.vehicleId] = []
            grouped[r.vehicleId].push(r.rating)
        })
        Object.entries(grouped).forEach(([vid, ratings]) => {
            const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
            vehicleRatings[vid] = { avg: avg.toFixed(1), count: ratings.length }
        })
    } catch (err) { console.error('Error cargando ratings:', err) }
}

// ── Cargar reseñas del usuario ──
const loadUserReviews = async () => {
    if (!currentCustomerId) return
    try {
        const result = await getUserReviews(currentCustomerId)
        if (result.success) reviewedRentalIds = new Set(result.data.map(r => r.rentalId))
    } catch (err) { console.error('Error cargando reseñas del usuario:', err) }
}

// ── Cargar vehículos ──
const loadVehicles = async () => {
    try {
        const result = await getAvailableVehicles();
        if (!result.success) {
            showAlert('rentalsAlert', 'Error al cargar vehículos: ' + result.error);
            loadingState.classList.add('d-none');
            return;
        }
        allVehicles      = result.data;
        filteredVehicles = [...allVehicles]; // paginación
        loadingState.classList.add('d-none');
        
        if (allVehicles.length === 0) {
            emptyState.classList.remove('d-none');
            document.getElementById('vehiclesGrid')?.classList.add('d-none');
            if (paginationContainer) paginationContainer.classList.add('d-none');
        } else {
            currentPage = 1;
            renderTable();
        }
    } catch (err) {
        showAlert('rentalsAlert', 'Error inesperado: ' + err.message);
        loadingState.classList.add('d-none');
    }
};

// ── Helpers ──
const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Sin categoría';
};

const renderStars = (avg, count) => {
    if (!avg) return ''
    const full  = Math.floor(avg)
    const half  = avg - full >= 0.5 ? 1 : 0
    const empty = 5 - full - half
    const stars = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty)
    return `<div class="d-flex align-items-center gap-1 mt-1">
                <span style="color:#f59e0b;font-size:.8rem">${stars}</span>
                <small class="text-secondary">${avg} (${count})</small>
            </div>`
}

const renderTable = () => {
    const grid = document.getElementById('vehiclesGrid');
    if (filteredVehicles.length === 0) {
        if (grid) grid.classList.add('d-none');
        emptyState.classList.remove('d-none');
        if (paginationContainer) paginationContainer.classList.add('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    if (grid) grid.classList.remove('d-none');

    const startIndex        = (currentPage - 1) * vehiclesPerPage;
    const endIndex          = startIndex + vehiclesPerPage;
    const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);

    grid.innerHTML = paginatedVehicles.map(v => {
        const isFav  = favoriteVehicleIds.has(v.id)
        const rating = vehicleRatings[v.id]
        return `
        <div class="col-sm-6 col-lg-4">
            <div class="vehicle-card card h-100">
                <div style="position:relative">
                    ${v.imageUrl
                        ? `<img src="${v.imageUrl}" class="card-img-top" alt="${v.brand} ${v.model}">`
                        : `<div class="no-img"><i class="bi bi-car-front text-secondary" style="font-size:3rem"></i></div>`
                    }
                    <button
                        class="btn btn-sm fav-btn ${isFav ? 'fav-active' : ''}"
                        data-vehicle-id="${v.id}"
                        onclick="toggleFavorite('${v.id}')"
                        title="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
                        style="position:absolute;top:8px;right:8px;width:36px;height:36px;border-radius:50%;
                               background:rgba(0,0,0,.45);border:none;display:flex;align-items:center;
                               justify-content:center;backdrop-filter:blur(4px);transition:all .2s;padding:0;"
                    >
                        <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"
                           style="color:${isFav ? '#ef4444' : '#fff'};font-size:.95rem;"></i>
                    </button>
                </div>
                <div class="card-body d-flex flex-column gap-2">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="fw-bold mb-0">${v.brand} ${v.model}</h6>
                            <small class="text-secondary">${v.year} · ${v.plate}</small>
                            ${rating ? renderStars(rating.avg, rating.count) : '<small class="text-muted">Sin reseñas aún</small>'}
                        </div>
                        <span class="price-badge">$${Number(v.dailyPrice).toFixed(2)}<span class="fw-normal" style="font-size:.75rem">/día</span></span>
                    </div>
                    <div>
                        <span class="badge bg-light text-secondary border">
                            <i class="bi bi-tag me-1"></i>${getCategoryName(v.categoryId)}
                        </span>
                    </div>
                    <div class="d-flex gap-2 mt-auto">
                        <button class="btn btn-outline-secondary btn-sm w-50 ver-detalle-btn" data-id="${v.id}">
                            <i class="bi bi-info-circle me-1"></i>Detalles
                        </button>
                        <button class="btn btn-primary btn-sm w-50 rentar-btn"
                            data-id="${v.id}"
                            data-name="${v.brand} ${v.model} (${v.plate})"
                            data-price="${v.dailyPrice}">
                            <i class="bi bi-calendar-plus me-1"></i>Rentar
                        </button>
                    </div>
                </div>
            </div>
        </div>`
    }).join('');

    document.querySelectorAll('.rentar-btn').forEach(btn => {
        btn.addEventListener('click', () => openRentalModal(btn.dataset.id, btn.dataset.name, btn.dataset.price));
    });
    document.querySelectorAll('.ver-detalle-btn').forEach(btn => {
        btn.addEventListener('click', () => openDetailModal(btn.dataset.id));
    });

    setupPaginationControls();
};

const setupPaginationControls = () => {
    const totalPages = Math.ceil(filteredVehicles.length / vehiclesPerPage);
    if (totalPages <= 1 || !paginationContainer) {
        if (paginationContainer) paginationContainer.classList.add('d-none');
        return;
    }
    paginationContainer.classList.remove('d-none');
    pageNumbers.innerHTML = '';
    if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
    if (nextPageBtn) nextPageBtn.disabled = (currentPage === totalPages);
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${i === currentPage ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`;
        btn.style.width = '36px';
        btn.textContent = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            renderTable();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        pageNumbers.appendChild(btn);
    }
};

prevPageBtn?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
nextPageBtn?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredVehicles.length / vehiclesPerPage);
    if (currentPage < totalPages) { currentPage++; renderTable(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});

// ── Toggle favorito ──
window.toggleFavorite = async (vehicleId) => {
    if (!currentCustomerId) { showToast('Debes iniciar sesión para guardar favoritos', 'warning'); return; }
    const isFav = favoriteVehicleIds.has(vehicleId)
    const btn   = document.querySelector(`.fav-btn[data-vehicle-id="${vehicleId}"]`)
    const icon  = btn?.querySelector('i')
    try {
        if (isFav) {
            await removeFavorite(currentCustomerId, vehicleId)
            favoriteVehicleIds.delete(vehicleId)
            if (icon) { icon.className = 'bi bi-heart'; icon.style.color = '#fff' }
            if (btn)  { btn.classList.remove('fav-active'); btn.title = 'Agregar a favoritos' }
            showToast('Eliminado de favoritos', 'warning')
        } else {
            await addFavorite(currentCustomerId, vehicleId)
            favoriteVehicleIds.add(vehicleId)
            if (icon) { icon.className = 'bi bi-heart-fill'; icon.style.color = '#ef4444' }
            if (btn)  { btn.classList.add('fav-active'); btn.title = 'Quitar de favoritos' }
            showToast('Agregado a favoritos ❤️', 'success')
        }
    } catch (err) { showToast('Error al actualizar favoritos', 'danger'); console.error(err) }
}

// ── Filtros ──
const applyFilters = () => {
    const search = searchInput?.value.toLowerCase().trim() || '';
    const catId  = filterCategory?.value || '';
    filteredVehicles = allVehicles.filter(v => {
        const matchSearch = `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search);
        const matchCat    = !catId || v.categoryId === catId;
        return matchSearch && matchCat;
    });
    currentPage = 1;
    renderTable();
};
searchInput?.addEventListener('input', applyFilters);
filterCategory?.addEventListener('change', applyFilters);

function openDetailModal(vehicleId) {
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    if (detalleTitle)    detalleTitle.textContent  = `${vehicle.brand} ${vehicle.model}`;
    if (detalleCategory) detalleCategory.innerHTML = `<i class="bi bi-tag me-1"></i>${getCategoryName(vehicle.categoryId)}`;
    if (detalleYear)     detalleYear.textContent   = vehicle.year;
    if (detallePrice)    detallePrice.textContent  = `$${Number(vehicle.dailyPrice).toFixed(2)}`;

    const specPassengers   = document.getElementById('specPassengers');
    const specTransmission = document.getElementById('specTransmission');
    const specFuel         = document.getElementById('specFuel');
    const detalleInsurance  = document.getElementById('detalleInsurance');
    const detalleFuelPolicy = document.getElementById('detalleFuelPolicy');
    const detalleLargeBags  = document.getElementById('detalleLargeBags');
    const detalleSmallBags  = document.getElementById('detalleSmallBags');

    if (specPassengers)   specPassengers.textContent   = vehicle.passengers  ? `${vehicle.passengers} pas.` : '5 pas.';
    if (specTransmission) specTransmission.textContent = vehicle.transmission || 'Automática';
    if (specFuel)         specFuel.textContent         = vehicle.fuel         || 'Gasolina';
    if (detalleInsurance)  detalleInsurance.textContent  = vehicle.insurance  || 'Básico incluido';
    if (detalleFuelPolicy) detalleFuelPolicy.textContent = vehicle.fuelPolicy  || 'Lleno a Lleno';
    if (detalleLargeBags)  detalleLargeBags.textContent  = vehicle.largeBags !== undefined ? `${vehicle.largeBags} maleta(s)` : '2 maleta(s)';
    if (detalleSmallBags)  detalleSmallBags.textContent  = vehicle.smallBags !== undefined ? `${vehicle.smallBags} maleta(s)` : '2 maleta(s)';

    if (detalleStatus) {
        detalleStatus.innerHTML = vehicle.status === 'available'
            ? `<span class="badge bg-success-subtle text-success border border-success-subtle">Disponible</span>`
            : `<span class="badge bg-warning-subtle text-warning border border-warning-subtle">${vehicle.status}</span>`;
    }

    if (detalleImgContainer) {
        detalleImgContainer.innerHTML = vehicle.imageUrl
            ? `<img src="${vehicle.imageUrl}" class="img-fluid rounded" style="max-height:220px;object-fit:contain" alt="${vehicle.brand}">`
            : `<i class="bi bi-car-front text-secondary" style="font-size:4rem"></i>`;
    }

    if (detalleRentarBtn) {
        detalleRentarBtn.onclick = () => {
            detalleModal?.hide();
            setTimeout(() => openRentalModal(vehicle.id, `${vehicle.brand} ${vehicle.model} (${vehicle.year})`, vehicle.dailyPrice), 350);
        };
    }

    detalleModal?.show();
}

async function checkUserActiveRentals() {
    if (!currentCustomerId) return false;
    const result = await getDocuments(COLLECTIONS.RENTALS);
    if (!result.success) return false;
    const active = result.data.find(r => r.customerId === currentCustomerId && r.status === 'active');
    hasActiveRental = !!active;
    return hasActiveRental;
}

// ── Abrir modal renta ──
function openRentalModal(vehicleId, vehicleName, dailyPrice) {
    checkUserActiveRentals().then((hasRental) => {
        if (hasRental) {
            showAlert('rentalsAlert', 'Ya tienes una renta activa. Debes liberar el vehículo actual antes de rentar otro.');
            return;
        }
        hideAlert('rentarAlert');
        modalVehicleId.value       = vehicleId;
        modalVehicleName.value     = vehicleName;
        currentDailyPrice          = parseFloat(dailyPrice);
        modalStartDate.value       = '';
        modalEndDate.value         = '';
        modalTotalCost.textContent = '$0.00';

        // Reset términos (compañero)
        const termsError   = document.getElementById('termsError');
        const termsCheckEl = document.getElementById('termsCheck');
        if (termsError)   termsError.classList.add('d-none');
        if (termsCheckEl) { termsCheckEl.checked = false; termsCheckEl.classList.remove('is-invalid'); }

        // Min date (compañero)
        const hoy = new Date().toISOString().split('T')[0];
        modalStartDate.min = hoy;
        modalEndDate.min   = hoy;

        rentarModal?.show();
    });
}

function updateTotalCost() {
    const start = modalStartDate.value;
    const end   = modalEndDate.value;
    if (!start) return;
    modalEndDate.min = start; // compañero: evitar fechas inválidas
    if (!end || !currentDailyPrice) { modalTotalCost.textContent = '$0.00'; return; }
    const startDate = new Date(start);
    const endDate   = new Date(end);
    if (endDate <= startDate) { modalTotalCost.textContent = 'Fecha inválida'; return; }
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    modalTotalCost.textContent = `$${(days * currentDailyPrice).toFixed(2)}`;
}
modalStartDate.addEventListener('change', updateTotalCost);
modalEndDate.addEventListener('change', updateTotalCost);

document.addEventListener('change', (e) => {
    if (e.target?.id === 'termsCheck') {
        const termsError   = document.getElementById('termsError');
        const termsCheckEl = document.getElementById('termsCheck');
        if (termsCheckEl?.checked) {
            if (termsError) termsError.classList.add('d-none');
            termsCheckEl.classList.remove('is-invalid');
        }
    }
});

// ── Crear renta ──
rentaForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('rentarAlert');

    // Validar términos (compañero)
    const termsError   = document.getElementById('termsError');
    const termsCheckEl = document.getElementById('termsCheck');
    if (termsCheckEl && !termsCheckEl.checked) {
        if (termsError)   termsError.classList.remove('d-none');
        if (termsCheckEl) termsCheckEl.classList.add('is-invalid');
        return;
    }

    if (!currentCustomerId) { showAlert('rentarAlert', 'Debes iniciar sesión'); return; }
    if (hasActiveRental) { showAlert('rentarAlert', 'Ya tienes una renta activa. Libera el vehículo actual primero.'); return; }
    const vehicleId     = modalVehicleId.value;
    const start         = modalStartDate.value;
    const end           = modalEndDate.value;
    const totalCostText = modalTotalCost.textContent;
    if (!vehicleId || !start || !end || totalCostText === 'Fecha inválida') {
        showAlert('rentarAlert', 'Completa las fechas correctamente'); return;
    }
    const totalCost = parseFloat(totalCostText.replace('$', ''));
    try {
        showButtonLoader(confirmRentaBtn, 'Procesando...');
        const rentalResult = await createDocument(COLLECTIONS.RENTALS, {
            customerId: currentCustomerId, vehicleId,
            startDate: new Date(start), endDate: new Date(end),
            totalCost, status: 'active'
        });
        if (!rentalResult.success) throw new Error('Error al guardar la renta');
        await updateDocument(COLLECTIONS.VEHICLES, vehicleId, { status: 'rented' });
        showToast('Renta creada exitosamente', 'success');
        rentarModal?.hide();
        await loadVehicles();
    } catch (err) {
        showAlert('rentarAlert', err.message);
    } finally {
        hideButtonLoader(confirmRentaBtn);
    }
});

// ── Liberar vehículo ──
async function completeRental(rentalId, vehicleId) {
    if (!confirm('¿Registrar la devolución del vehículo?')) return;
    try {
        await updateDocument(COLLECTIONS.RENTALS, rentalId, { status: 'completed', returnDate: new Date() });
        await updateDocument(COLLECTIONS.VEHICLES, vehicleId, { status: 'available' });
        showToast('Vehículo liberado correctamente', 'success');
        await loadVehicles();
        await loadMyRentals();
    } catch (err) { showToast('Error al liberar el vehículo', 'danger'); console.error(err); }
}

/* ======================================================
   MODAL DE RESEÑA — estrellas interactivas
====================================================== */

const setupStars = () => {
    const stars = document.querySelectorAll('.star-btn')
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => highlightStars(Number(star.dataset.value)))
        star.addEventListener('mouseleave', () => highlightStars(currentRating))
        star.addEventListener('click',      () => {
            currentRating = Number(star.dataset.value)
            highlightStars(currentRating)
        })
    })
}

const highlightStars = (value) => {
    document.querySelectorAll('.star-btn').forEach(star => {
        const v = Number(star.dataset.value)
        star.innerHTML = v <= value
            ? '<i class="bi bi-star-fill" style="color:#f59e0b"></i>'
            : '<i class="bi bi-star"      style="color:#d1d5db"></i>'
    })
}

window.openReviewModal = (rentalId, vehicleId, vehicleName) => {
    hideAlert('reviewAlert')
    reviewRentalId.value  = rentalId
    reviewVehicleId.value = vehicleId
    document.getElementById('reviewVehicleName').textContent = vehicleName
    reviewComment.value   = ''
    currentRating         = 0
    highlightStars(0)
    reviewModal?.show()
}

reviewForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideAlert('reviewAlert')

    if (currentRating === 0) {
        showAlert('reviewAlert', 'Selecciona una calificación de 1 a 5 estrellas')
        return
    }

    try {
        showButtonLoader(submitReviewBtn, 'Guardando...')

        const result = await addReview({
            rentalId:     reviewRentalId.value,
            vehicleId:    reviewVehicleId.value,
            customerId:   currentCustomerId,
            customerName: currentUserName || 'Cliente',
            rating:       currentRating,
            comment:      reviewComment.value.trim() || null
        })

        if (!result.success) {
            showAlert('reviewAlert', result.error || 'No se pudo guardar la reseña')
            return
        }

        reviewedRentalIds.add(reviewRentalId.value)
        showToast('¡Reseña enviada correctamente! ⭐', 'success')
        reviewModal?.hide()

        // Actualizar ratings y re-renderizar tarjetas
        await loadAllRatings()
        renderTable()

        // Actualizar botón en historial
        const btn = document.getElementById(`review-btn-${reviewRentalId.value}`)
        if (btn) {
            btn.outerHTML = `<span class="badge bg-warning text-dark">
                <i class="bi bi-star-fill me-1"></i>${currentRating} estrellas
            </span>`
        }

    } catch (err) {
        showAlert('reviewAlert', 'Ocurrió un error inesperado')
        console.error(err)
    } finally {
        hideButtonLoader(submitReviewBtn)
    }
})

// ── Cargar mis rentas ──
async function loadMyRentals() {
    if (!currentCustomerId) return;
    rentasLoading.classList.remove('d-none');
    activeRentaSection.classList.add('d-none');
    historialRentasSection.classList.add('d-none');
    noRentasMsg.classList.add('d-none');
    try {
        const result = await getDocuments(COLLECTIONS.RENTALS);
        if (!result.success) throw new Error('Error al cargar rentas');
        const myRentals = result.data.filter(r => r.customerId === currentCustomerId);
        if (myRentals.length === 0) {
            noRentasMsg.classList.remove('d-none');
            rentasLoading.classList.add('d-none');
            hasActiveRental = false;
            return;
        }
        const active  = myRentals.filter(r => r.status === 'active');
        const history = myRentals.filter(r => r.status === 'completed');
        hasActiveRental = active.length > 0;

        // Renta activa
        activeRentaBody.innerHTML = '';
        for (const rental of active) {
            const vehResult = await getDocumentById(COLLECTIONS.VEHICLES, rental.vehicleId);
            const plate     = vehResult.success ? vehResult.data.plate : 'Desconocido';
            const vehName   = vehResult.success ? `${vehResult.data.brand} ${vehResult.data.model}` : plate;
            const start     = rental.startDate.toDate().toLocaleDateString();
            const end       = rental.endDate.toDate().toLocaleDateString();
            const row       = activeRentaBody.insertRow();
            row.insertCell(0).textContent = plate;
            row.insertCell(1).textContent = start;
            row.insertCell(2).textContent = end;
            row.insertCell(3).textContent = `$${rental.totalCost.toFixed(2)}`;
            const btnCell    = row.insertCell(4);
            const liberarBtn = document.createElement('button');
            liberarBtn.className = 'btn btn-sm btn-danger';
            liberarBtn.innerHTML = '<i class="bi bi-car-front"></i> Liberar';
            liberarBtn.onclick   = () => completeRental(rental.id, rental.vehicleId);
            btnCell.appendChild(liberarBtn);
        }

        // Historial con botón de reseña
        historialRentasBody.innerHTML = '';
        for (const rental of history) {
            const vehResult  = await getDocumentById(COLLECTIONS.VEHICLES, rental.vehicleId);
            const plate      = vehResult.success ? vehResult.data.plate : 'Desconocido';
            const vehName    = vehResult.success ? `${vehResult.data.brand} ${vehResult.data.model}` : plate;
            const start      = rental.startDate.toDate().toLocaleDateString();
            const end        = rental.endDate.toDate().toLocaleDateString();
            const returnDate = rental.returnDate ? rental.returnDate.toDate().toLocaleDateString() : '-';
            const alreadyReviewed = reviewedRentalIds.has(rental.id);

            const row = historialRentasBody.insertRow();
            row.insertCell(0).textContent = plate;
            row.insertCell(1).textContent = start;
            row.insertCell(2).textContent = end;
            row.insertCell(3).textContent = `$${rental.totalCost.toFixed(2)}`;
            row.insertCell(4).textContent = returnDate;

            const reviewCell = row.insertCell(5);
            if (alreadyReviewed) {
                reviewCell.innerHTML = `<span class="badge bg-warning text-dark">
                    <i class="bi bi-star-fill me-1"></i>Reseñado
                </span>`
            } else {
                reviewCell.innerHTML = `<button
                    id="review-btn-${rental.id}"
                    class="btn btn-sm btn-outline-warning"
                    onclick="openReviewModal('${rental.id}', '${rental.vehicleId}', '${vehName}')"
                >
                    <i class="bi bi-star me-1"></i>Reseñar
                </button>`
            }
        }

        if (active.length)  activeRentaSection.classList.remove('d-none');
        if (history.length) historialRentasSection.classList.remove('d-none');
        rentasLoading.classList.add('d-none');
    } catch (err) {
        console.error(err);
        rentasLoading.classList.add('d-none');
        showAlert('rentalsAlert', 'Error al cargar tus rentas');
    }
}

// ── Inicializar ──
checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return; }
    currentUser = user;
    try {
        currentCustomerId = await getOrCreateCustomerId(user);
        updateNavbarName(currentUserName);
        await Promise.all([
            loadCategories(),
            loadFavorites(),
            loadAllRatings(),
            loadUserReviews(),
            loadVehicles(),
            loadMyRentals()
        ]);
        setupStars();
    } catch (err) {
        console.error(err);
        showAlert('rentalsAlert', 'Error al configurar tu perfil.');
    }
});