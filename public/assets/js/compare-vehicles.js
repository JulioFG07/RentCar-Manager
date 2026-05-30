import { checkAuth, logoutUser } from './auth.js';
import { getDocuments, COLLECTIONS } from './firestore.js';
import { showToast } from './ui.js';

// ── DOM ──
const loadingState      = document.getElementById('loadingState')
const vehiclesGrid      = document.getElementById('vehiclesGrid')
const emptyState        = document.getElementById('emptyState')
const compareContainer  = document.getElementById('compareContainer')
const compareTable      = document.getElementById('compareTable')
const clearCompareBtn   = document.getElementById('clearCompareBtn')
const selectedCount     = document.getElementById('selectedCount')

// Paginación
const paginationContainer = document.getElementById('paginationContainer')
const prevPageBtn         = document.getElementById('prevPageBtn')
const nextPageBtn         = document.getElementById('nextPageBtn')
const pageNumbers         = document.getElementById('pageNumbers')

let allVehicles     = []
let categories      = []
let selectedIds     = [] // máximo 2 vehículos
let currentUserName = null

// Paginación
let currentPage       = 1
const vehiclesPerPage = 6

// ── Navbar: nombre y logout ──
document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn')

    if (navUserName && currentUserName) {
        navUserName.textContent   = currentUserName
        navUserName.style.opacity = '1'
    }

    logoutBtn?.addEventListener('click', async () => {
        await logoutUser()
        window.location.href = '../login.html'
    })
})

const updateNavbarName = (name) => {
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName     = navbarContainer?.querySelector('#navUserName')
    if (navUserName && name) {
        navUserName.textContent   = name
        navUserName.style.opacity = '1'
    }
}

// ── Auth ──
checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return }

    const usersRes = await getDocuments(COLLECTIONS.USERS)
    const userData = usersRes.success ? usersRes.data.find(u => u.uid === user.uid) : null
    currentUserName = userData?.name || user.displayName || user.email?.split('@')[0] || 'Usuario'
    updateNavbarName(currentUserName)

    await loadData()
})

// ── Cargar datos ──
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

        if (allVehicles.length === 0) {
            emptyState.classList.remove('d-none')
        } else {
            currentPage = 1
            renderVehicles()
        }
    } catch (err) {
        console.error(err)
        loadingState.classList.add('d-none')
        emptyState.classList.remove('d-none')
    }
}

// ── Helper categoría ──
const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId)
    return cat ? cat.name : 'Sin categoría'
}

// ── Renderizar grid con paginación ──
const renderVehicles = () => {
    if (allVehicles.length === 0) {
        vehiclesGrid.classList.add('d-none')
        emptyState.classList.remove('d-none')
        if (paginationContainer) paginationContainer.classList.add('d-none')
        return
    }

    emptyState.classList.add('d-none')
    vehiclesGrid.classList.remove('d-none')

    const startIndex        = (currentPage - 1) * vehiclesPerPage
    const endIndex          = startIndex + vehiclesPerPage
    const paginatedVehicles = allVehicles.slice(startIndex, endIndex)

    vehiclesGrid.innerHTML = `
        <div class="row g-4">
            ${paginatedVehicles.map(v => `
                <div class="col-lg-4 col-md-6">
                    <div class="card vehicle-card h-100 ${selectedIds.includes(v.id) ? 'selected' : ''}" data-id="${v.id}">

                        <!-- Imagen del vehículo -->
                        ${v.imageUrl
                            ? `<img src="${v.imageUrl}" class="card-img-top" alt="${v.brand} ${v.model}"
                                style="height:190px;object-fit:cover;width:100%;">`
                            : `<div class="no-vehicle-img">
                                   <i class="bi bi-car-front text-secondary" style="font-size:3rem"></i>
                               </div>`
                        }

                        <div class="card-body p-4">
                            <!-- Badge categoría + seleccionado -->
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <span class="badge bg-primary-soft">${getCategoryName(v.categoryId)}</span>
                                ${selectedIds.includes(v.id)
                                    ? '<span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i>Seleccionado</span>'
                                    : ''
                                }
                            </div>

                            <!-- Nombre -->
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

    setupPaginationControls()
}

// ── Paginación ──
const setupPaginationControls = () => {
    const totalPages = Math.ceil(allVehicles.length / vehiclesPerPage)
    if (totalPages <= 1 || !paginationContainer) {
        if (paginationContainer) paginationContainer.classList.add('d-none')
        return
    }

    paginationContainer.classList.remove('d-none')
    pageNumbers.innerHTML = ''
    if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1)
    if (nextPageBtn) nextPageBtn.disabled = (currentPage === totalPages)

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button')
        btn.className = `btn btn-sm ${i === currentPage ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`
        btn.style.width = '36px'
        btn.textContent = i
        btn.addEventListener('click', () => {
            currentPage = i
            renderVehicles()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        })
        pageNumbers.appendChild(btn)
    }
}

prevPageBtn?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderVehicles(); window.scrollTo({ top: 0, behavior: 'smooth' }) }
})
nextPageBtn?.addEventListener('click', () => {
    const totalPages = Math.ceil(allVehicles.length / vehiclesPerPage)
    if (currentPage < totalPages) { currentPage++; renderVehicles(); window.scrollTo({ top: 0, behavior: 'smooth' }) }
})

// ── Toggle vehículo ──
window.toggleVehicle = (id) => {
    if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(vid => vid !== id)
        showToast('Vehículo quitado de la comparación', 'info')
    } else {
        if (selectedIds.length >= 2) {
            showToast('Solo puedes comparar 2 vehículos a la vez', 'warning')
            return
        }
        selectedIds.push(id)
        showToast('Vehículo agregado para comparar', 'success')
    }
    renderVehicles()
    updateCompareTable()
}

// ── Tabla comparativa ──
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
                        <th class="ps-4" style="width:30%">Característica</th>
                        ${vehicles.map(v => `
                            <th class="text-center" style="width:${70 / vehicles.length}%">
                                <div class="compare-header">
                                    ${v.imageUrl
                                        ? `<img src="${v.imageUrl}" alt="${v.brand} ${v.model}"
                                            class="rounded mb-2"
                                            style="width:100%;height:100px;object-fit:cover;">`
                                        : `<div class="no-vehicle-img-sm rounded mb-2">
                                               <i class="bi bi-car-front text-secondary fs-3"></i>
                                           </div>`
                                    }
                                    <h6 class="fw-bold mb-1">${v.brand} ${v.model}</h6>
                                    <span class="badge bg-primary-soft">${getCategoryName(v.categoryId)}</span>
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-currency-dollar text-primary me-2"></i>Precio por día
                        </td>
                        ${vehicles.map(v => {
                            const prices   = vehicles.map(x => Number(x.dailyPrice))
                            const minPrice = Math.min(...prices)
                            const isMin    = Number(v.dailyPrice) === minPrice
                            return `
                                <td class="text-center">
                                    <span class="fw-bold ${isMin ? 'text-success' : ''}" style="font-size:1.1rem">
                                        $${Number(v.dailyPrice).toFixed(2)}
                                    </span>
                                    ${isMin && vehicles.length > 1 ? '<span class="badge bg-success-soft ms-2">Mejor precio</span>' : ''}
                                </td>`
                        }).join('')}
                    </tr>
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-calendar3 text-primary me-2"></i>Año
                        </td>
                        ${vehicles.map(v => {
                            const years    = vehicles.map(x => x.year)
                            const maxYear  = Math.max(...years)
                            const isNewest = v.year === maxYear
                            return `
                                <td class="text-center">
                                    <span class="${isNewest ? 'fw-bold text-success' : ''}">${v.year}</span>
                                    ${isNewest && vehicles.length > 1 ? '<span class="badge bg-success-soft ms-2">Más nuevo</span>' : ''}
                                </td>`
                        }).join('')}
                    </tr>
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-credit-card text-primary me-2"></i>Placa
                        </td>
                        ${vehicles.map(v => `
                            <td class="text-center">
                                <code class="bg-light px-2 py-1 rounded">${v.plate}</code>
                            </td>
                        `).join('')}
                    </tr>
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-tag text-primary me-2"></i>Categoría
                        </td>
                        ${vehicles.map(v => `
                            <td class="text-center">
                                <span class="badge bg-primary-soft">${getCategoryName(v.categoryId)}</span>
                            </td>
                        `).join('')}
                    </tr>
                    <tr>
                        <td class="ps-4 fw-semibold">
                            <i class="bi bi-info-circle text-primary me-2"></i>Estado
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
        <div class="p-4 border-top compare-cta">
            <div class="text-center">
                <p class="text-secondary small mb-3">
                    <i class="bi bi-info-circle me-1"></i>
                    Selecciona el vehículo que más te convenga y procede con la renta
                </p>
                <a href="./rentals.html" class="btn btn-primary btn-lg">
                    <i class="bi bi-car-front me-2"></i>Ir a rentar vehículo
                </a>
            </div>
        </div>
    `
}

// ── Limpiar comparación ──
clearCompareBtn?.addEventListener('click', () => {
    selectedIds = []
    renderVehicles()
    updateCompareTable()
    showToast('Comparación limpiada', 'info')
})