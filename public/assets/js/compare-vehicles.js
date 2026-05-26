import { checkAuth, loginUser, logoutUser } from './auth.js';
import { getDocuments, COLLECTIONS } from './firestore.js';
import { showToast } from './ui.js';

const navUserName = document.getElementById('navUserName')
const logoutBtn = document.getElementById('logoutBtn')
const loadingState = document.getElementById('loadingState')
const vehiclesGrid = document.getElementById('vehiclesGrid')
const emptyState = document.getElementById('emptyState')
const compareContainer = document.getElementById('compareContainer')
const compareTable = document.getElementById('compareTable')
const clearCompareBtn = document.getElementById('clearCompareBtn')
const selectedCount = document.getElementById('selectedCount')

let allVehicles = []
let categories = []
let selectedIds = [] //maximo 2 vehiculos

checkAuth(async (user) => {
    if (!user) {
        window.location.href = '../login.html'
        return
    }
    navUserName.textContent = user.displayName || user.email
    await loadData()
})

const loadData = async () => {
    try {
        const [catResult, vehResult] = await Promise.all([
            getDocuments(COLLECTIONS.VEHICLE_CATEGORIES),
            getDocuments(COLLECTIONS.VEHICLES)
        ])
        if (catResult.success) {
            categories = catResult.data.filter(c => c.active !== false)
        }
        if (!vehResult.success) {
            emptyState.classList.remove('d-none')
            loadingState.classList.add('d-none')
            return 
        }

        allVehicles = vehResult.data.filter(v => v.status === 'available')

        loadingState.classList.add('d-none')

        if(allVehicles.length === 0) {
            emptyState.classList.remove('d-none')
        } else {
            renderVehicles(allVehicles)
        }
    } catch (err) {
        console.error(err)
        loadingState.classList.add('d-none')
        emptyState.classList.remove('d-none')
    }
}

const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId)
    return cat ? cat.name : 'Sin categoría'
}

const renderVehicles = (vehicles) => {
    vehiclesGrid.classList.remove('d-none')
    vehiclesGrid.innerHTML = `
        <div class="row g-4">
            ${vehicles.map(v => `
                <div class="col-lg-4 col-md-6">
                    <div class="card vehicle-card h-100 ${selectedIds.includes(v.id) ? 'selected' : ''}" data-id="${v.id}">
                        <div class="card-body p-4">
                            <!-- Badge de categoría -->
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <span class="badge bg-primary-soft">${getCategoryName(v.categoryId)}</span>
                                ${selectedIds.includes(v.id) ? 
                                    '<span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i>Seleccionado</span>' 
                                    : ''
                                }
                            </div>

                            <!-- Nombre del vehículo -->
                            <h5 class="fw-bold mb-2">${v.brand} ${v.model}</h5>
                            
                            <!-- Detalles -->
                            <div class="vehicle-details mb-3">
                                <div class="detail-item">
                                    <i class="bi bi-calendar3 text-secondary me-2"></i>
                                    <span class="text-secondary small">Año ${v.year}</span>
                                </div>
                                <div class="detail-item">
                                    <i class="bi bi-credit-card text-secondary me-2"></i>
                                    <span class="text-secondary small">${v.plate}</span>
                                </div>
                            </div>

                            <!-- Precio -->
                            <div class="price-tag mb-3">
                                <span class="price-amount">$${Number(v.dailyPrice).toFixed(2)}</span>
                                <span class="price-period">/día</span>
                            </div>

                            <!-- Botón comparar -->
                            <button 
                                class="btn ${selectedIds.includes(v.id) ? 'btn-danger' : 'btn-primary'} w-100 compare-btn"
                                onclick="toggleVehicle('${v.id}')"
                                ${selectedIds.length >= 2 && !selectedIds.includes(v.id) ? 'disabled' : ''}>
                                <i class="bi ${selectedIds.includes(v.id) ? 'bi-x-circle' : 'bi-plus-circle'} me-2"></i>
                                ${selectedIds.includes(v.id) ? 'Quitar' : 'Comparar'}
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `
}

window.toggleVehicle = (id) => {
    if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(vid => vid !== id)
        showToast('Vehiculo quitado de la comparacion', 'info')
    } else {
        // agregar (max 2)
        if (selectedIds.length >= 2) {
            showToast('Solo puedes comparar 2 vehiculos a la vez', 'warning')
            return
        }
        selectedIds.push(id)
        showToast('Vehiculo agregado para comparar', 'success')
    }

    renderVehicles(allVehicles)
    updateCompareTable()
}

// actualizar tabla comparativa
const updateCompareTable = () => {
    selectedCount.textContent = selectedIds.length

    if (selectedIds.length === 0) {
        compareContainer.classList.add('d-none')
        return 
    }

    compareContainer.classList.remove('d-none')

    const vehicles = selectedIds.map(id => allVehicles.find(v => v.id === id)).filter(Boolean)

    if (vehicles.length === 0) return

    compareTable.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th class="ps-4" style="width: 30%">Característica</th>
                        ${vehicles.map(v => `
                            <th class="text-center" style="width: ${70 / vehicles.length}%">
                                <div class="compare-header">
                                    <h6 class="fw-bold mb-1">${v.brand} ${v.model}</h6>
                                    <span class="badge bg-primary-soft">${getCategoryName(v.categoryId)}</span>
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    <!-- Precio por día -->
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-currency-dollar text-primary me-2"></i>
                            Precio por día
                        </td>
                        ${vehicles.map(v => {
                            const prices = vehicles.map(x => Number(x.dailyPrice))
                            const minPrice = Math.min(...prices)
                            const isMin = Number(v.dailyPrice) === minPrice
                            return `
                                <td class="text-center">
                                    <span class="fw-bold ${isMin ? 'text-success' : ''}" style="font-size: 1.1rem">
                                        $${Number(v.dailyPrice).toFixed(2)}
                                    </span>
                                    ${isMin && vehicles.length > 1 ? '<span class="badge bg-success-soft ms-2">Mejor precio</span>' : ''}
                                </td>
                            `
                        }).join('')}
                    </tr>

                    <!-- Año -->
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-calendar3 text-primary me-2"></i>
                            Año
                        </td>
                        ${vehicles.map(v => {
                            const years = vehicles.map(x => x.year)
                            const maxYear = Math.max(...years)
                            const isNewest = v.year === maxYear
                            return `
                                <td class="text-center">
                                    <span class="${isNewest ? 'fw-bold text-success' : ''}">${v.year}</span>
                                    ${isNewest && vehicles.length > 1 ? '<span class="badge bg-success-soft ms-2">Más nuevo</span>' : ''}
                                </td>
                            `
                        }).join('')}
                    </tr>

                    <!-- Placa -->
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-credit-card text-primary me-2"></i>
                            Placa
                        </td>
                        ${vehicles.map(v => `
                            <td class="text-center">
                                <code class="bg-light px-2 py-1 rounded">${v.plate}</code>
                            </td>
                        `).join('')}
                    </tr>

                    <!-- Categoría -->
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-tag text-primary me-2"></i>
                            Categoría
                        </td>
                        ${vehicles.map(v => `
                            <td class="text-center">
                                <span class="badge bg-primary-soft">${getCategoryName(v.categoryId)}</span>
                            </td>
                        `).join('')}
                    </tr>

                    <!-- Estado -->
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-info-circle text-primary me-2"></i>
                            Estado
                        </td>
                        ${vehicles.map(v => `
                            <td class="text-center">
                                <span class="badge bg-success">Disponible</span>
                            </td>
                        `).join('')}
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Botón rentar -->
        <div class="p-4 bg-light border-top">
            <div class="text-center">
                <p class="text-secondary small mb-3">
                    <i class="bi bi-info-circle me-1"></i>
                    Selecciona el vehículo que más te convenga y procede con la renta
                </p>
                <a href="./rentals.html" class="btn btn-primary btn-lg">
                    <i class="bi bi-car-front me-2"></i>
                    Ir a rentar vehículo
                </a>
            </div>
        </div>
    `
}

//limpiar comparacion
clearCompareBtn?.addEventListener('click', () => {
    selectedIds = []
    renderVehicles(allVehicles)
    updateCompareTable()
    showToast('Comparacion limpiada','info')
})

logoutBtn?.addEventListener('click', async () => {
    await logoutUser()
    window.location.href = '../login.html'
})