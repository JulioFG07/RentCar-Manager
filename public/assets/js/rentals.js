import { checkAuth, logoutUser } from './auth.js';
import {
    getDocuments, getDocumentById, createDocument, updateDocument,
    getAvailableVehicles, COLLECTIONS
} from './firestore.js';
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js';

// ── DOM ──
const searchInput      = document.getElementById('searchInput');
const filterCategory   = document.getElementById('filterCategory');
const loadingState     = document.getElementById('loadingState');
const emptyState       = document.getElementById('emptyState');
const tableContainer   = document.getElementById('tableContainer');
const vehiclesBody     = document.getElementById('vehiclesBody');

// Modal renta
const rentarModalEl    = document.getElementById('rentarModal');
const rentarModal      = rentarModalEl ? bootstrap.Modal.getOrCreateInstance(rentarModalEl) : null;
const rentaForm        = document.getElementById('rentaForm');
const modalVehicleId   = document.getElementById('modalVehicleId');
const modalVehicleName = document.getElementById('modalVehicleName');
const modalStartDate   = document.getElementById('modalStartDate');
const modalEndDate     = document.getElementById('modalEndDate');
const modalTotalCost   = document.getElementById('modalTotalCost');
const confirmRentaBtn  = document.getElementById('confirmRentaBtn');

// Mis rentas
const rentasLoading          = document.getElementById('rentasLoading');
const activeRentaSection     = document.getElementById('activeRentaSection');
const historialRentasSection = document.getElementById('historialRentasSection');
const noRentasMsg            = document.getElementById('noRentasMsg');
const activeRentaBody        = document.getElementById('activeRentaBody');
const historialRentasBody    = document.getElementById('historialRentasBody');
const refreshRentasBtn       = document.getElementById('refreshRentasBtn');

let allVehicles       = [];
let categories        = [];
let currentCustomerId = null;
let currentDailyPrice = 0;
let currentUser       = null;
let currentUserName   = null;   // ← nombre del perfil en Firestore
let hasActiveRental   = false;

// ── Navbar: esperar a que cargue dinámicamente ──
document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn')

    // Si checkAuth ya terminó, ponemos el nombre; si no, se pondrá después
    if (navUserName && currentUserName) {
        navUserName.textContent = currentUserName
    }

    logoutBtn?.addEventListener('click', async () => {
        await logoutUser()
        window.location.href = '../login.html'
    })
})

// ── Helper: actualizar nombre en navbar ──
const updateNavbarName = (name) => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    if (navUserName && name) navUserName.textContent = name
}

// ── Obtener customerId desde COLLECTIONS.USERS usando uid ──
const getOrCreateCustomerId = async (user) => {
    const result = await getDocuments(COLLECTIONS.USERS);
    if (!result.success) throw new Error('No se pudieron cargar los usuarios');

    let customer = result.data.find(c => c.uid === user.uid);
    if (customer) {
        // Guardar el nombre del perfil para el navbar
        currentUserName = customer.name || user.displayName || user.email;
        return customer.id;
    }

    // Si no existe, crear en USERS
    const newCustomer = {
        uid:           user.uid,
        name:          user.displayName || user.email.split('@')[0] || 'Cliente',
        email:         user.email,
        phone:         null,
        licenseNumber: null,
        address:       null,
        role:          'user',
        active:        true
    };
    const createResult = await createDocument(COLLECTIONS.USERS, newCustomer);
    if (!createResult.success) throw new Error('No se pudo crear el perfil de cliente');
    currentUserName = newCustomer.name;
    return createResult.id;
};

// ── Cargar categorías para el filtro ──
const loadCategories = async () => {
    const result = await getDocuments(COLLECTIONS.VEHICLE_CATEGORIES);
    if (!result.success) return;
    categories = result.data.filter(c => c.active !== false);
    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (filterCategory) filterCategory.innerHTML = `<option value="">Todas las categorías</option>${options}`;
};

// ── Cargar vehículos disponibles ──
const loadVehicles = async () => {
    try {
        const result = await getAvailableVehicles();
        if (!result.success) {
            showAlert('rentalsAlert', 'Error al cargar vehículos: ' + result.error);
            loadingState.classList.add('d-none');
            return;
        }
        allVehicles = result.data;
        loadingState.classList.add('d-none');
        if (allVehicles.length === 0) {
            emptyState.classList.remove('d-none');
            document.getElementById('vehiclesGrid')?.classList.add('d-none');
        } else {
            renderTable(allVehicles);
        }
    } catch (err) {
        showAlert('rentalsAlert', 'Error inesperado: ' + err.message);
        loadingState.classList.add('d-none');
    }
};

// ── Renderizar tabla ──
const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Sin categoría';
};

const renderTable = (vehicles) => {
    const grid = document.getElementById('vehiclesGrid');
    if (vehicles.length === 0) {
        if (grid) grid.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');
    if (grid) grid.classList.remove('d-none');

    grid.innerHTML = vehicles.map(v => `
        <div class="col-sm-6 col-lg-4">
            <div class="vehicle-card card h-100">
                ${v.imageUrl
                    ? `<img src="${v.imageUrl}" class="card-img-top" alt="${v.brand} ${v.model}">`
                    : `<div class="no-img"><i class="bi bi-car-front text-secondary" style="font-size:3rem"></i></div>`
                }
                <div class="card-body d-flex flex-column gap-2">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="fw-bold mb-0">${v.brand} ${v.model}</h6>
                            <small class="text-secondary">${v.year} · ${v.plate}</small>
                        </div>
                        <span class="price-badge">$${Number(v.dailyPrice).toFixed(2)}<span class="fw-normal" style="font-size:.75rem">/día</span></span>
                    </div>
                    <div>
                        <span class="badge bg-light text-secondary border">
                            <i class="bi bi-tag me-1"></i>${getCategoryName(v.categoryId)}
                        </span>
                    </div>
                    <button class="btn btn-primary btn-sm mt-auto rentar-btn"
                        data-id="${v.id}"
                        data-name="${v.brand} ${v.model} (${v.plate})"
                        data-price="${v.dailyPrice}">
                        <i class="bi bi-calendar-plus me-1"></i>Rentar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.rentar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openRentalModal(btn.dataset.id, btn.dataset.name, btn.dataset.price);
        });
    });
};

// ── Filtros ──
const applyFilters = () => {
    const search = searchInput?.value.toLowerCase().trim() || '';
    const catId  = filterCategory?.value || '';
    const filtered = allVehicles.filter(v => {
        const matchSearch = `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search);
        const matchCat    = !catId || v.categoryId === catId;
        return matchSearch && matchCat;
    });
    renderTable(filtered);
};
searchInput?.addEventListener('input', applyFilters);
filterCategory?.addEventListener('change', applyFilters);

// ── Abrir modal renta ──
function openRentalModal(vehicleId, vehicleName, dailyPrice) {
    if (hasActiveRental) {
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
    rentarModal?.show();
}

// ── Calcular costo ──
function updateTotalCost() {
    const start = modalStartDate.value;
    const end   = modalEndDate.value;
    if (!start || !end || !currentDailyPrice) {
        modalTotalCost.textContent = '$0.00';
        return;
    }
    const startDate = new Date(start);
    const endDate   = new Date(end);
    if (endDate <= startDate) {
        modalTotalCost.textContent = 'Fecha inválida';
        return;
    }
    const days  = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const total = days * currentDailyPrice;
    modalTotalCost.textContent = `$${total.toFixed(2)}`;
}
modalStartDate.addEventListener('change', updateTotalCost);
modalEndDate.addEventListener('change', updateTotalCost);

// ── Crear renta ──
rentaForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('rentarAlert');
    if (!currentCustomerId) {
        showAlert('rentarAlert', 'Debes iniciar sesión');
        return;
    }
    if (hasActiveRental) {
        showAlert('rentarAlert', 'Ya tienes una renta activa. Libera el vehículo actual primero.');
        return;
    }
    const vehicleId     = modalVehicleId.value;
    const start         = modalStartDate.value;
    const end           = modalEndDate.value;
    const totalCostText = modalTotalCost.textContent;
    if (!vehicleId || !start || !end || totalCostText === 'Fecha inválida') {
        showAlert('rentarAlert', 'Completa las fechas correctamente');
        return;
    }
    const totalCost = parseFloat(totalCostText.replace('$', ''));
    try {
        showButtonLoader(confirmRentaBtn, 'Guardando...');
        const rentalResult = await createDocument(COLLECTIONS.RENTALS, {
            customerId: currentCustomerId,
            vehicleId:  vehicleId,
            startDate:  new Date(start),
            endDate:    new Date(end),
            totalCost:  totalCost,
            status:     'active'
        });
        if (!rentalResult.success) throw new Error('Error al guardar la renta');
        const updateResult = await updateDocument(COLLECTIONS.VEHICLES, vehicleId, { status: 'rented' });
        if (!updateResult.success) throw new Error('Error al actualizar el vehículo');
        showToast('Renta creada exitosamente', 'success');
        rentarModal?.hide();
        await loadVehicles();
        await loadMyRentals();
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
        await updateDocument(COLLECTIONS.RENTALS, rentalId, {
            status:     'completed',
            returnDate: new Date()
        });
        await updateDocument(COLLECTIONS.VEHICLES, vehicleId, { status: 'available' });
        showToast('Vehículo liberado correctamente', 'success');
        await loadVehicles();
        await loadMyRentals();
    } catch (err) {
        showToast('Error al liberar el vehículo', 'danger');
        console.error(err);
    }
}

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

        // Historial
        historialRentasBody.innerHTML = '';
        for (const rental of history) {
            const vehResult  = await getDocumentById(COLLECTIONS.VEHICLES, rental.vehicleId);
            const plate      = vehResult.success ? vehResult.data.plate : 'Desconocido';
            const start      = rental.startDate.toDate().toLocaleDateString();
            const end        = rental.endDate.toDate().toLocaleDateString();
            const returnDate = rental.returnDate ? rental.returnDate.toDate().toLocaleDateString() : '-';
            const row        = historialRentasBody.insertRow();
            row.insertCell(0).textContent = plate;
            row.insertCell(1).textContent = start;
            row.insertCell(2).textContent = end;
            row.insertCell(3).textContent = `$${rental.totalCost.toFixed(2)}`;
            row.insertCell(4).textContent = returnDate;
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

        // Actualizar nombre en navbar (por si navbarLoaded ya se disparó antes)
        updateNavbarName(currentUserName);

        await Promise.all([loadCategories(), loadVehicles(), loadMyRentals()]);
    } catch (err) {
        console.error(err);
        showAlert('rentalsAlert', 'Error al configurar tu perfil. Contacta al administrador.');
    }
});

refreshRentasBtn?.addEventListener('click', loadMyRentals);