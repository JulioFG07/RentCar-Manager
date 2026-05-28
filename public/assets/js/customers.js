import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, updateDocument, updateExpiredRentals, COLLECTIONS } from './firestore.js'
import { showAlert, showToast } from './ui.js'

// ── DOM ──
const searchInput    = document.getElementById('searchInput')
const loadingState   = document.getElementById('loadingState')
const emptyState     = document.getElementById('emptyState')
const tableContainer = document.getElementById('tableContainer')
const customersBody  = document.getElementById('customersBody')

// Modal detalle
const detailModalEl        = document.getElementById('detailCustomerModal')
const detailModal          = detailModalEl ? bootstrap.Modal.getOrCreateInstance(detailModalEl) : null
const detailCustomerName   = document.getElementById('detailCustomerName')
const detailCustomerEmail  = document.getElementById('detailCustomerEmail')
const detailPhone          = document.getElementById('detailPhone')
const detailLicense        = document.getElementById('detailLicense')
const detailAddress        = document.getElementById('detailAddress')
const detailTotalRentals   = document.getElementById('detailTotalRentals')
const detailActiveRentals  = document.getElementById('detailActiveRentals')
const detailTotalSpent     = document.getElementById('detailTotalSpent')
const detailRentalsLoading = document.getElementById('detailRentalsLoading')
const detailRentalsEmpty   = document.getElementById('detailRentalsEmpty')
const detailRentalsList    = document.getElementById('detailRentalsList')
const detailRentalsBody    = document.getElementById('detailRentalsBody')
const toggleAccountBtn     = document.getElementById('toggleAccountBtn')

// ── Estado local ──
let allCustomers     = []
let allRentals       = []
let allVehicles      = []
let currentUser      = null
let selectedCustomer = null

// ── Auth ──
checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return }
    currentUser = user
    await loadCustomers()
})

// ── Navbar: solo manejar logout ──
document.addEventListener('navbarLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logoutUser()
            window.location.href = '../login.html'
        })
    }
})

// ── Cargar clientes y datos auxiliares ──
const loadCustomers = async () => {
    try {
        await updateExpiredRentals()

        const [usersRes, rentalsRes, vehiclesRes] = await Promise.all([
            getDocuments(COLLECTIONS.USERS),
            getDocuments(COLLECTIONS.RENTALS),
            getDocuments(COLLECTIONS.VEHICLES)
        ])

        if (!usersRes.success) {
            showAlert('customersAlert', 'Error al cargar los clientes')
            loadingState.classList.add('d-none')
            return
        }

        allCustomers = usersRes.data.filter(u => u.role === 'user')
        allRentals   = rentalsRes.success  ? rentalsRes.data  : []
        allVehicles  = vehiclesRes.success ? vehiclesRes.data : []

        // Mostrar nombre real del admin en el navbar
        const adminData = usersRes.data.find(u => u.uid === currentUser?.uid)
        const nombre    = adminData?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'
        window.setNavbarUser(nombre)

        loadingState.classList.add('d-none')
        renderTable(allCustomers)

    } catch (error) {
        showAlert('customersAlert', 'Ocurrió un error inesperado')
        loadingState.classList.add('d-none')
        console.error(error)
    }
}

// ── Helpers ──
const formatDate = (value) => {
    if (!value) return '—'
    try {
        if (typeof value.toDate === 'function') return value.toDate().toLocaleDateString('es-MX')
        return new Date(value).toLocaleDateString('es-MX')
    } catch { return '—' }
}

const statusBadge = (status) => {
    const map = {
        active:    ['primary',           'Activa'],
        completed: ['success',           'Completada'],
        cancelled: ['danger',            'Cancelada'],
        late:      ['warning text-dark', 'Vencida']
    }
    const [color, label] = map[status] || ['secondary', status || '—']
    return `<span class="badge bg-${color}">${label}</span>`
}

const rentalRowClass = (status) => {
    const map = {
        active:    'active-rental',
        completed: 'completed-rental',
        cancelled: 'cancelled-rental',
        late:      'late-rental'
    }
    return map[status] || ''
}

const countRentals     = (customerId) => allRentals.filter(r => r.customerId === customerId).length
const hasLateRentals   = (customerId) => allRentals.some(r => r.customerId === customerId && r.status === 'late')
const hasActiveRentals = (customerId) => allRentals.some(r => r.customerId === customerId && r.status === 'active')

// ── Badge de estado de cuenta del cliente ──
const getAccountStatusBadge = (customer) => {
    if (customer.active === false) {
        return `<span class="badge bg-secondary">
                    <i class="bi bi-slash-circle me-1"></i>Desactivado
                </span>`
    }
    if (hasLateRentals(customer.id)) {
        return `<span class="badge bg-danger">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i>Renta vencida
                </span>`
    }
    if (hasActiveRentals(customer.id)) {
        return `<span class="badge bg-primary">
                    <i class="bi bi-car-front-fill me-1"></i>En renta
                </span>`
    }
    return `<span class="badge bg-light text-secondary border">
                <i class="bi bi-check-circle me-1"></i>Sin actividad
            </span>`
}

// ── Renderizar tabla ──
const renderTable = (customers) => {
    if (customers.length === 0) {
        tableContainer.classList.add('d-none')
        emptyState.classList.remove('d-none')
        return
    }

    emptyState.classList.add('d-none')
    tableContainer.classList.remove('d-none')

    customersBody.innerHTML = customers.map(customer => {
        const isActive     = customer.active !== false
        const rentaCount   = countRentals(customer.id)
        const registroDate = formatDate(customer.createdAt)

        const activeBadge = isActive
            ? `<span class="badge bg-success">Activo</span>`
            : `<span class="badge bg-secondary">Inactivo</span>`

        return `
            <tr class="${isActive ? '' : 'table-secondary opacity-75'}">
                <td class="ps-4 fw-semibold">
                    ${customer.name || '—'}
                    <div class="mt-1">${activeBadge}</div>
                </td>
                <td class="text-secondary">${customer.email || '—'}</td>
                <td>${customer.phone || '<span class="text-muted fst-italic small">Sin datos</span>'}</td>
                <td>
                    <span class="badge bg-light text-dark border">
                        <i class="bi bi-journal-bookmark me-1"></i>${rentaCount}
                    </span>
                </td>
                <td>${getAccountStatusBadge(customer)}</td>
                <td class="text-secondary small">${registroDate}</td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button
                            class="btn btn-outline-primary btn-sm"
                            onclick="openDetailModal('${customer.id}')"
                            title="Ver detalle"
                        >
                            <i class="bi bi-eye me-1"></i>Ver detalle
                        </button>
                        ${isActive
                            ? `<button class="btn btn-outline-danger btn-sm"
                                onclick="toggleAccount('${customer.id}', '${customer.name || 'este cliente'}', true)"
                                title="Desactivar cuenta">
                                <i class="bi bi-person-slash"></i>
                               </button>`
                            : `<button class="btn btn-outline-success btn-sm"
                                onclick="toggleAccount('${customer.id}', '${customer.name || 'este cliente'}', false)"
                                title="Activar cuenta">
                                <i class="bi bi-person-check"></i>
                               </button>`
                        }
                    </div>
                </td>
            </tr>
        `
    }).join('')
}

// ── Buscador ──
searchInput?.addEventListener('input', () => {
    const filter = searchInput.value.toLowerCase().trim()
    const filtered = allCustomers.filter(c =>
        (c.name  || '').toLowerCase().includes(filter) ||
        (c.email || '').toLowerCase().includes(filter)
    )
    renderTable(filtered)
})

// ── Abrir modal detalle ──
window.openDetailModal = (customerId) => {
    const customer = allCustomers.find(c => c.id === customerId)
    if (!customer) return

    selectedCustomer = customer

    detailCustomerName.textContent  = customer.name  || '—'
    detailCustomerEmail.textContent = customer.email || '—'
    detailPhone.textContent         = customer.phone          || '—'
    detailLicense.textContent       = customer.licenseNumber  || '—'
    detailAddress.textContent       = customer.address        || '—'

    const clientRentals = allRentals.filter(r => r.customerId === customerId)
    const activeCount   = clientRentals.filter(r => r.status === 'active').length
    const lateCount     = clientRentals.filter(r => r.status === 'late').length
    const totalSpent    = clientRentals
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (Number(r.totalCost) || Number(r.total) || 0), 0)

    detailTotalRentals.textContent  = clientRentals.length
    detailActiveRentals.textContent = activeCount + lateCount
    detailTotalSpent.textContent    = `$${totalSpent.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

    const activeStatBox = detailActiveRentals.closest('.detail-stat-box')
    if (activeStatBox) {
        if (lateCount > 0) {
            detailActiveRentals.classList.remove('text-primary')
            detailActiveRentals.classList.add('text-danger')
            activeStatBox.style.background = 'rgba(239,68,68,.06)'
        } else {
            detailActiveRentals.classList.remove('text-danger')
            detailActiveRentals.classList.add('text-primary')
            activeStatBox.style.background = ''
        }
    }

    const isActive = customer.active !== false
    toggleAccountBtn.className = `btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline-success'}`
    toggleAccountBtn.innerHTML = isActive
        ? `<i class="bi bi-person-slash me-1"></i>Desactivar cuenta`
        : `<i class="bi bi-person-check me-1"></i>Activar cuenta`
    toggleAccountBtn.onclick = () => toggleAccount(customer.id, customer.name, isActive, true)

    detailRentalsLoading.classList.remove('d-none')
    detailRentalsEmpty.classList.add('d-none')
    detailRentalsList.classList.add('d-none')

    detailModal?.show()

    setTimeout(() => {
        detailRentalsLoading.classList.add('d-none')

        if (clientRentals.length === 0) {
            detailRentalsEmpty.classList.remove('d-none')
            return
        }

        detailRentalsList.classList.remove('d-none')

        const sorted = [...clientRentals].sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
            return dateB - dateA
        })

        detailRentalsBody.innerHTML = sorted.map(rental => {
            const vehicle     = allVehicles.find(v => v.id === rental.vehicleId)
            const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : '—'
            const cost        = Number(rental.totalCost) || Number(rental.total) || 0

            return `
                <tr class="rental-row ${rentalRowClass(rental.status)}">
                    <td class="ps-3 fw-medium">${vehicleName}</td>
                    <td class="text-secondary small">${formatDate(rental.startDate)}</td>
                    <td class="text-secondary small">${formatDate(rental.endDate)}</td>
                    <td>${statusBadge(rental.status)}</td>
                    <td class="text-end pe-3 fw-semibold">$${cost.toFixed(2)}</td>
                </tr>
            `
        }).join('')
    }, 300)
}

// ── Activar / desactivar cuenta ──
window.toggleAccount = async (customerId, customerName, currentActive, fromModal = false) => {
    const accion = currentActive ? 'desactivar' : 'activar'
    if (!confirm(`¿Deseas ${accion} la cuenta de "${customerName}"?`)) return

    try {
        const result = await updateDocument(COLLECTIONS.USERS, customerId, { active: !currentActive })

        if (!result.success) {
            showToast('No se pudo actualizar la cuenta', 'danger')
            return
        }

        const index = allCustomers.findIndex(c => c.id === customerId)
        if (index !== -1) {
            allCustomers[index] = { ...allCustomers[index], active: !currentActive }
        }

        renderTable(allCustomers)
        showToast(
            `Cuenta ${currentActive ? 'desactivada' : 'activada'} correctamente`,
            currentActive ? 'warning' : 'success'
        )

        if (fromModal) detailModal?.hide()

    } catch (error) {
        showToast('Ocurrió un error inesperado', 'danger')
        console.error(error)
    }
}

// ═══════════════════════════════════════════════════════════
// ESTADÍSTICAS DEL ADMIN
// ═══════════════════════════════════════════════════════════

const loadAdminStats = async () => {
    try {
        const [vehiclesRes, rentalsRes] = await Promise.all([
            getDocuments(COLLECTIONS.VEHICLES),
            getDocuments(COLLECTIONS.RENTALS)
        ])

        if (vehiclesRes.success) {
            const available = vehiclesRes.data.filter(v => v.status === 'available' && v.active !== false).length
            const rented    = vehiclesRes.data.filter(v => v.status === 'rented').length
            const elAvail   = document.getElementById('statVehiclesAvailable')
            const elRented  = document.getElementById('statVehiclesRented')
            if (elAvail)  elAvail.textContent  = available
            if (elRented) elRented.textContent = rented
        }

        if (rentalsRes.success) {
            const activeRentals = rentalsRes.data.filter(r => r.status === 'active').length
            const totalIncome   = rentalsRes.data
                .filter(r => r.status === 'completed')
                .reduce((sum, r) => sum + (Number(r.totalCost) || Number(r.total) || 0), 0)

            const elActive = document.getElementById('statActiveRentals')
            const elIncome = document.getElementById('statTotalIncome')
            if (elActive) elActive.textContent = activeRentals
            if (elIncome) elIncome.textContent = `$${totalIncome.toLocaleString('es-MX', {
                minimumFractionDigits: 2, maximumFractionDigits: 2
            })}`
        }

    } catch (error) {
        console.error('Error cargando estadísticas del admin:', error)
        ;['statVehiclesAvailable','statVehiclesRented','statActiveRentals','statTotalIncome']
            .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—' })
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (currentUser) loadAdminStats() }, 500)
})