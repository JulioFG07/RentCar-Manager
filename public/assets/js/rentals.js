import { checkAuth, logoutUser } from './auth.js';
import { getDocuments, createDocument, updateDocument, getAvailableVehicles, COLLECTIONS} from './firestore.js';
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js';

// ── DOM ──
const searchInput      = document.getElementById('searchInput');
const filterCategory   = document.getElementById('filterCategory');
const loadingState     = document.getElementById('loadingState');
const emptyState       = document.getElementById('emptyState');

// Elementos de Paginación L
const paginationContainer = document.getElementById('paginationContainer');
const prevPageBtn         = document.getElementById('prevPageBtn');
const nextPageBtn         = document.getElementById('nextPageBtn');
const pageNumbers         = document.getElementById('pageNumbers');

// Modal Detalle
const detalleModalEl     = document.getElementById('detalleModal');
const detalleModal       = detalleModalEl ? bootstrap.Modal.getOrCreateInstance(detalleModalEl) : null;
const detalleTitle       = document.getElementById('detalleTitle');
const detalleCategory    = document.getElementById('detalleCategory');
const detalleYear        = document.getElementById('detalleYear');
const detallePrice       = document.getElementById('detallePrice');
const detalleStatus      = document.getElementById('detalleStatus');
const detalleImgContainer = document.getElementById('detalleImgContainer');
const detalleRentarBtn   = document.getElementById('detalleRentarBtn');

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

// ── VARIABLES DE CONTROL DE FLUJO ──
let allVehicles        = []; 
let filteredVehicles   = []; 
let categories         = [];
let currentCustomerId  = null;
let currentDailyPrice  = 0;
let currentUser        = null;
let currentUserName    = null;   
let hasActiveRental    = false;

// Estado de paginación local
let currentPage        = 1;
const vehiclesPerPage  = 6; 

// ── Navbar ──
document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn')

    if (navUserName && currentUserName) {
        navUserName.textContent = currentUserName;
    }

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

const getOrCreateCustomerId = async (user) => {
    const result = await getDocuments(COLLECTIONS.USERS);
    if (!result.success) throw new Error('No se pudieron cargar los usuarios');

    let customer = result.data.find(c => c.uid === user.uid);
    if (customer) {
        currentUserName = customer.name || user.displayName || user.email;
        return customer.id;
    }

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

const loadCategories = async () => {
    const result = await getDocuments(COLLECTIONS.VEHICLE_CATEGORIES);
    if (!result.success) return;
    categories = result.data.filter(c => c.active !== false);
    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (filterCategory) filterCategory.innerHTML = `<option value="">Todas las categorías</option>${options}`;
};

const loadVehicles = async () => {
    try {
        const result = await getAvailableVehicles();
        if (!result.success) {
            showAlert('rentalsAlert', 'Error al cargar vehículos: ' + result.error);
            loadingState.classList.add('d-none');
            return;
        }
        allVehicles = result.data;
        filteredVehicles = [...allVehicles]; 
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

const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Sin categoría';
};


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

    const startIndex = (currentPage - 1) * vehiclesPerPage;
    const endIndex   = startIndex + vehiclesPerPage;
    const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);

    grid.innerHTML = paginatedVehicles.map(v => `
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
                            <small class="text-secondary">${v.year} · ${v.transmission || 'Automático'}</small>
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
                            data-name="${v.brand} ${v.model} (${v.year})"
                            data-price="${v.dailyPrice}">
                            <i class="bi bi-calendar-plus me-1"></i>Rentar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.rentar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openRentalModal(btn.dataset.id, btn.dataset.name, btn.dataset.price);
        });
    });

    document.querySelectorAll('.ver-detalle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openDetailModal(btn.dataset.id);
        });
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
    if (currentPage > 1) {
        currentPage--;
        renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

nextPageBtn?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredVehicles.length / vehiclesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

const applyFilters = () => {
    const search = searchInput?.value.toLowerCase().trim() || '';
    const catId  = filterCategory?.value || '';
    
    filteredVehicles = allVehicles.filter(v => {
        const matchSearch = `${v.brand} ${v.model}`.toLowerCase().includes(search);
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

    detalleTitle.textContent = `${vehicle.brand} ${vehicle.model}`;
    detalleCategory.innerHTML = `<i class="bi bi-tag me-1"></i>${getCategoryName(vehicle.categoryId)}`;
    detalleYear.textContent = vehicle.year;
    detallePrice.textContent = `$${Number(vehicle.dailyPrice).toFixed(2)}`;
    
    document.getElementById('specPassengers').textContent   = vehicle.passengers ? `${vehicle.passengers} pas.` : '5 pas.';
    document.getElementById('specTransmission').textContent = vehicle.transmission || 'Automática';
    document.getElementById('specFuel').textContent         = vehicle.fuel || 'Gasolina';
    document.getElementById('detalleInsurance').textContent = vehicle.insurance || 'Básico incluido';
    document.getElementById('detalleFuelPolicy').textContent = vehicle.fuelPolicy || 'Lleno a Lleno';
    document.getElementById('detalleLargeBags').textContent  = vehicle.largeBags !== undefined ? `${vehicle.largeBags} maleta(s)` : '2 maleta(s)';
    document.getElementById('detalleSmallBags').textContent  = vehicle.smallBags !== undefined ? `${vehicle.smallBags} maleta(s)` : '2 maleta(s)';

    if (vehicle.status === 'available') {
        detalleStatus.innerHTML = `<span class="badge bg-success-subtle text-success border border-success-subtle">Disponible</span>`;
    } else {
        detalleStatus.innerHTML = `<span class="badge bg-warning-subtle text-warning border border-warning-subtle">${vehicle.status}</span>`;
    }

    if (vehicle.imageUrl) {
        detalleImgContainer.innerHTML = `<img src="${vehicle.imageUrl}" class="img-fluid rounded" style="max-height: 220px; object-fit: contain;" alt="${vehicle.brand}">`;
    } else {
        detalleImgContainer.innerHTML = `<i class="bi bi-car-front text-secondary" style="font-size:4rem"></i>`;
    }

    detalleRentarBtn.onclick = () => {
        detalleModal?.hide();
        setTimeout(() => {
            openRentalModal(vehicle.id, `${vehicle.brand} ${vehicle.model} (${vehicle.year})`, vehicle.dailyPrice);
        }, 350);
    };

    detalleModal?.show();
}

function openRentalModal(vehicleId, vehicleName, dailyPrice) {
    checkUserActiveRentals().then((hasRental) => {
        if (hasRental) {
            showToast('Ya cuentas con una reservación o renta activa en tu perfil.', 'danger');
            return;
        }
        hideAlert('rentarAlert');
        modalVehicleId.value       = vehicleId;
        modalVehicleName.value     = vehicleName;
        currentDailyPrice          = parseFloat(dailyPrice);
        modalStartDate.value       = '';
        modalEndDate.value         = '';
        modalTotalCost.textContent = '$0.00';
        
        const termsError = document.getElementById('termsError');
        const termsCheckEl = document.getElementById('termsCheck');
        if(termsError) termsError.classList.add('d-none');
        if(termsCheckEl) {
            termsCheckEl.checked = false;
            termsCheckEl.classList.remove('is-invalid');
        }

        const hoy = new Date().toISOString().split('T')[0];
        modalStartDate.min = hoy;
        modalEndDate.min   = hoy;

        rentarModal?.show();
    });
}

async function checkUserActiveRentals() {
    if (!currentCustomerId) return false;
    const result = await getDocuments(COLLECTIONS.RENTALS);
    if (!result.success) return false;
    const active = result.data.find(r => r.customerId === currentCustomerId && r.status === 'active');
    hasActiveRental = !!active;
    return hasActiveRental;
}

function updateTotalCost() {
    const start = modalStartDate.value;
    const end   = modalEndDate.value;
    if (!start) return;

    modalEndDate.min = start;

    if (!end || !currentDailyPrice) {
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

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'termsCheck') {
        const termsError = document.getElementById('termsError');
        const termsCheckEl = document.getElementById('termsCheck');
        if (termsCheckEl && termsCheckEl.checked) {
            if (termsError) termsError.classList.add('d-none');
            termsCheckEl.classList.remove('is-invalid');
        }
    }
});

rentaForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('rentarAlert');
    
    const termsError = document.getElementById('termsError');
    const termsCheckEl = document.getElementById('termsCheck');
    
    if (termsCheckEl && !termsCheckEl.checked) {
        if (termsError) termsError.classList.remove('d-none');
        if (termsCheckEl) termsCheckEl.classList.add('is-invalid');
        return;
    }

    if (!currentCustomerId) {
        showAlert('rentalsAlert', 'Debes iniciar sesión para rentar.');
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
        showButtonLoader(confirmRentaBtn, 'Procesando...');
        const rentalResult = await createDocument(COLLECTIONS.RENTALS, {
            customerId: currentCustomerId,
            vehicleId:  vehicleId,
            startDate:  new Date(start + 'T00:00:00'), 
            endDate:    new Date(end + 'T00:00:00'),
            totalCost:  totalCost,
            status:     'active'
        });
        if (!rentalResult.success) throw new Error('Error al guardar la renta');
        const updateResult = await updateDocument(COLLECTIONS.VEHICLES, vehicleId, { status: 'rented' });
        if (!updateResult.success) throw new Error('Error al actualizar el vehículo');
        showToast('Reservación creada exitosamente', 'success');
        rentarModal?.hide();
        await loadVehicles();
    } catch (err) {
        showAlert('rentarAlert', err.message);
    } finally {
        hideButtonLoader(confirmRentaBtn);
    }
});

checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return; }
    currentUser = user;
    try {
        currentCustomerId = await getOrCreateCustomerId(user);
        updateNavbarName(currentUserName);
        await Promise.all([loadCategories(), loadVehicles()]);
    } catch (err) {
        console.error(err);
        showAlert('rentalsAlert', 'Error al configurar tu perfil.');
    }
});