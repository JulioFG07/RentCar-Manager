import { checkAuth, logoutUser } from './auth.js';
import { 
    getDocuments, getDocumentById, createDocument, updateDocument, 
    getAvailableVehicles, COLLECTIONS 
} from './firestore.js';
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js';

// ── DOM ──
const navUserName      = document.getElementById('navUserName');
const logoutBtn        = document.getElementById('logoutBtn');
const searchInput      = document.getElementById('searchInput');
const filterCategory   = document.getElementById('filterCategory');
const loadingState     = document.getElementById('loadingState');
const emptyState       = document.getElementById('emptyState');
const tableContainer   = document.getElementById('tableContainer');
const vehiclesBody     = document.getElementById('vehiclesBody');

// Modal renta
const rentarModalEl = document.getElementById('rentarModal');
const rentarModal   = rentarModalEl ? bootstrap.Modal.getOrCreateInstance(rentarModalEl) : null;
const rentaForm     = document.getElementById('rentaForm');
const modalVehicleId   = document.getElementById('modalVehicleId');
const modalVehicleName = document.getElementById('modalVehicleName');
const modalStartDate   = document.getElementById('modalStartDate');
const modalEndDate     = document.getElementById('modalEndDate');
const modalTotalCost   = document.getElementById('modalTotalCost');
const confirmRentaBtn  = document.getElementById('confirmRentaBtn');

// Mis rentas
const rentasLoading      = document.getElementById('rentasLoading');
const activeRentaSection = document.getElementById('activeRentaSection');
const historialRentasSection = document.getElementById('historialRentasSection');
const noRentasMsg        = document.getElementById('noRentasMsg');
const activeRentaBody    = document.getElementById('activeRentaBody');
const historialRentasBody= document.getElementById('historialRentasBody');
const refreshRentasBtn   = document.getElementById('refreshRentasBtn');

let allVehicles = [];
let categories  = [];
let currentCustomerId = null;
let currentDailyPrice = 0;
let hasActiveRental = false;   // para evitar múltiples rentas activas

// ── Obtener o crear customerId a partir del UID ──
const getOrCreateCustomerId = async (user) => {
    // 1. Buscar cliente existente por userId
    const result = await getDocuments(COLLECTIONS.CUSTOMERS);
    if (!result.success) throw new Error('No se pudieron cargar clientes');
    
    let customer = result.data.find(c => c.userId === user.uid);
    if (customer) return customer.id;
    
    // 2. No existe: crear nuevo cliente
    const newCustomer = {
        userId: user.uid,
        name: user.displayName || user.email.split('@')[0] || 'Cliente',
        email: user.email,
        phone: '',
        licenseNumber: '',
        address: '',
        active: true
    };
    const createResult = await createDocument(COLLECTIONS.CUSTOMERS, newCustomer);
    if (!createResult.success) throw new Error('No se pudo crear el perfil de cliente');
    console.log('✅ Cliente creado automáticamente:', createResult.id);
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
        console.log("Cargando vehículos disponibles...");
        const result = await getAvailableVehicles();
        console.log("Resultado getAvailableVehicles:", result);
        if (!result.success) {
            showAlert('rentalsAlert', 'Error al cargar vehículos: ' + result.error);
            loadingState.classList.add('d-none');
            return;
        }
        allVehicles = result.data;
        console.log("Vehículos encontrados:", allVehicles.length);
        loadingState.classList.add('d-none');
        if (allVehicles.length === 0) {
            emptyState.classList.remove('d-none');
            tableContainer.classList.add('d-none');
        } else {
            renderTable(allVehicles);
        }
    } catch (err) {
        console.error("Excepción en loadVehicles:", err);
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
    if (vehicles.length === 0) {
        tableContainer.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');
    tableContainer.classList.remove('d-none');
    vehiclesBody.innerHTML = vehicles.map(v => `
        <tr>
            <td class="ps-4 fw-semibold">${v.brand} ${v.model}</td>
            <td>${v.year}</td>
            <td>${v.plate}</td>
            <td>${getCategoryName(v.categoryId)}</td>
            <td>$${Number(v.dailyPrice).toFixed(2)}</td>
            <td class="text-end pe-4">
                <button class="btn btn-primary btn-sm rentar-btn" 
                    data-id="${v.id}" 
                    data-name="${v.brand} ${v.model} (${v.plate})" 
                    data-price="${v.dailyPrice}">
                    <i class="bi bi-calendar-plus"></i> Rentar
                </button>
            </td>
        </tr>
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
    const catId = filterCategory?.value || '';
    const filtered = allVehicles.filter(v => {
        const matchSearch = `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search);
        const matchCat = !catId || v.categoryId === catId;
        return matchSearch && matchCat;
    });
    renderTable(filtered);
};
searchInput?.addEventListener('input', applyFilters);
filterCategory?.addEventListener('change', applyFilters);

// ── Abrir modal renta (con validación de renta activa) ──
function openRentalModal(vehicleId, vehicleName, dailyPrice) {
    if (hasActiveRental) {
        showAlert('rentalsAlert', 'Ya tienes una renta activa. Debes liberar el vehículo actual antes de rentar otro.');
        return;
    }
    hideAlert('rentarAlert');
    modalVehicleId.value = vehicleId;
    modalVehicleName.value = vehicleName;
    currentDailyPrice = parseFloat(dailyPrice);
    modalStartDate.value = '';
    modalEndDate.value = '';
    modalTotalCost.textContent = '$0.00';
    rentarModal?.show();
}

// ── Calcular costo ──
function updateTotalCost() {
    const start = modalStartDate.value;
    const end = modalEndDate.value;
    if (!start || !end || !currentDailyPrice) {
        modalTotalCost.textContent = '$0.00';
        return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate <= startDate) {
        modalTotalCost.textContent = 'Fecha inválida';
        return;
    }
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
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
    const vehicleId = modalVehicleId.value;
    const start = modalStartDate.value;
    const end = modalEndDate.value;
    const totalCostText = modalTotalCost.textContent;
    if (!vehicleId || !start || !end || totalCostText === 'Fecha inválida') {
        showAlert('rentarAlert', 'Completa las fechas correctamente');
        return;
    }
    const totalCost = parseFloat(totalCostText.replace('$', ''));
    try {
        showButtonLoader(confirmRentaBtn, 'Guardando...');
        // 1. Crear renta
        const rentalResult = await createDocument(COLLECTIONS.RENTALS, {
            customerId: currentCustomerId,
            vehicleId: vehicleId,
            startDate: new Date(start),
            endDate: new Date(end),
            totalCost: totalCost,
            status: 'active'
        });
        if (!rentalResult.success) throw new Error('Error al guardar la renta');
        // 2. Actualizar estado del vehículo a 'rented'
        const updateResult = await updateDocument(COLLECTIONS.VEHICLES, vehicleId, { status: 'rented' });
        if (!updateResult.success) throw new Error('Error al actualizar el vehículo');
        
        showToast('Renta creada exitosamente', 'success');
        rentarModal?.hide();
        // Recargar datos
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
            status: 'completed',
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
        const active = myRentals.filter(r => r.status === 'active');
        const history = myRentals.filter(r => r.status === 'completed');
        hasActiveRental = active.length > 0;
        
        // Renta activa
        activeRentaBody.innerHTML = '';
        for (const rental of active) {
            const vehResult = await getDocumentById(COLLECTIONS.VEHICLES, rental.vehicleId);
            const plate = vehResult.success ? vehResult.data.plate : 'Desconocido';
            const start = rental.startDate.toDate().toLocaleDateString();
            const end = rental.endDate.toDate().toLocaleDateString();
            const row = activeRentaBody.insertRow();
            row.insertCell(0).textContent = plate;
            row.insertCell(1).textContent = start;
            row.insertCell(2).textContent = end;
            row.insertCell(3).textContent = `$${rental.totalCost.toFixed(2)}`;
            const btnCell = row.insertCell(4);
            const liberarBtn = document.createElement('button');
            liberarBtn.className = 'btn btn-sm btn-danger';
            liberarBtn.innerHTML = '<i class="bi bi-car-front"></i> Liberar';
            liberarBtn.onclick = () => completeRental(rental.id, rental.vehicleId);
            btnCell.appendChild(liberarBtn);
        }
        
        // Historial
        historialRentasBody.innerHTML = '';
        for (const rental of history) {
            const vehResult = await getDocumentById(COLLECTIONS.VEHICLES, rental.vehicleId);
            const plate = vehResult.success ? vehResult.data.plate : 'Desconocido';
            const start = rental.startDate.toDate().toLocaleDateString();
            const end = rental.endDate.toDate().toLocaleDateString();
            const returnDate = rental.returnDate ? rental.returnDate.toDate().toLocaleDateString() : '-';
            const row = historialRentasBody.insertRow();
            row.insertCell(0).textContent = plate;
            row.insertCell(1).textContent = start;
            row.insertCell(2).textContent = end;
            row.insertCell(3).textContent = `$${rental.totalCost.toFixed(2)}`;
            row.insertCell(4).textContent = returnDate;
        }
        
        if (active.length) activeRentaSection.classList.remove('d-none');
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
    navUserName.textContent = user.displayName || user.email;
    try {
        currentCustomerId = await getOrCreateCustomerId(user);
        await Promise.all([loadCategories(), loadVehicles(), loadMyRentals()]);
    } catch (err) {
        console.error(err);
        showAlert('rentalsAlert', 'Error al configurar tu perfil. Contacta al administrador.');
    }
});

refreshRentasBtn?.addEventListener('click', loadMyRentals);
logoutBtn?.addEventListener('click', async () => { await logoutUser(); window.location.href = '../login.html'; });