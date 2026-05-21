import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, COLLECTIONS } from './firestore.js'

let currentUser    = null
let currentProfile = null
let isProcessing   = false

// =============================================================
// ⚠️ ZONA PROTEGIDA — MÓDULO DE AUTH (Sebastián)
// =============================================================

checkAuth(async (user) => {

    if (isProcessing) return
    isProcessing = true

    if (!user) {
        window.location.href = './login.html'
        return
    }

    currentUser = user

    try {
        const result = await getDocuments(COLLECTIONS.USERS)

        if (!result.success) {
            document.getElementById('loadingState').innerHTML =
                `<p class="text-danger">Error al cargar el perfil. <a href="./login.html">Volver al login</a></p>`
            return
        }

        const profile = result.data.find(u => u.uid === user.uid)

        if (!profile) {
            document.getElementById('loadingState').innerHTML =
                `<p class="text-danger">No se encontró tu perfil. <a href="./login.html">Volver al login</a></p>`
            return
        }

        currentProfile = profile

        if (profile.role === 'admin') {
            window.location.href = './modules/customers.html'
            return
        }

        renderUserDashboard(user, profile)

    } catch (error) {
        console.error(error)
    }
})

// =============================================================
// ✅ FIN ZONA PROTEGIDA
// =============================================================

// ── Helper: adjuntar logout a cualquier botón que ya esté en el DOM ──
const attachLogout = () => {
    const navbarContainer = document.getElementById('navbarContainer')
    const logoutBtn = navbarContainer?.querySelector('#logoutBtn')
    if (logoutBtn && !logoutBtn.dataset.logoutBound) {
        logoutBtn.dataset.logoutBound = 'true'   // evitar duplicar el listener
        logoutBtn.addEventListener('click', async () => {
            await logoutUser()
            window.location.href = './login.html'
        })
    }
}

// ── Navbar: cuando cargue dinámicamente ──
document.addEventListener('navbarLoaded', () => {
    attachLogout()

    // Si checkAuth ya terminó, poner el nombre ahora
    if (currentProfile) {
        const navbarContainer = document.getElementById('navbarContainer')
        const navUserName = navbarContainer?.querySelector('#navUserName')
        if (navUserName) {
            navUserName.textContent = currentProfile.fullName || currentProfile.name || currentUser?.displayName || currentUser?.email
        }
    }
})

const renderUserDashboard = async (user, profile) => {

    // Ocultar loading y mostrar contenido
    document.getElementById('loadingState').classList.add('d-none')
    document.getElementById('dashboardContent').classList.remove('d-none')

    // Nombre de bienvenida
    const welcomeName = document.getElementById('welcomeName')
    if (welcomeName) {
        const fullName = profile.name || profile.fullName || user.displayName || user.email
        // En el dashboard mostrar solo el primer nombre para evitar desbordamiento
        welcomeName.textContent = fullName.split(' ')[0] || fullName
    }

    // Actualizar navbar si ya cargó (checkAuth llegó después de navbarLoaded)
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName = navbarContainer?.querySelector('#navUserName')
    if (navUserName) {
        navUserName.textContent = profile.name || profile.fullName || user.displayName || user.email
    }
    attachLogout()

    await loadDashboardData()
}

const loadDashboardData = async () => {

    try {
        const [vehiclesRes, categoriesRes] = await Promise.all([
            getDocuments(COLLECTIONS.VEHICLES),
            getDocuments(COLLECTIONS.VEHICLE_CATEGORIES)
        ])

        // Stats rápidas
        if (vehiclesRes.success) {
            const available = vehiclesRes.data.filter(v => v.status === 'available' && v.active !== false)
            const rented    = vehiclesRes.data.filter(v => v.status === 'rented')

            const statAvailable = document.getElementById('statAvailable')
            const statRented    = document.getElementById('statRented')
            if (statAvailable) statAvailable.textContent = available.length
            if (statRented)    statRented.textContent    = rented.length

            // Vehículos destacados (máximo 6)
            renderVehiclesGrid(available.slice(0, 6), categoriesRes.data || [])
        }

        if (categoriesRes.success) {
            const statCategories = document.getElementById('statCategories')
            if (statCategories) {
                statCategories.textContent = categoriesRes.data.filter(c => c.active !== false).length
            }
        }

    } catch (error) {
        console.error('Error cargando dashboard:', error)
    }
}

const renderVehiclesGrid = (vehicles, categories) => {
    return // Dashboard rediseñado — vehículos no se muestran aquí

    const loading = document.getElementById('vehiclesLoading')
    const grid    = document.getElementById('vehiclesGrid')
    const empty   = document.getElementById('vehiclesEmpty')

    if (loading) loading.classList.add('d-none')

    if (vehicles.length === 0) {
        if (empty) empty.classList.remove('d-none')
        return
    }

    const getCategoryName = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId)
        return cat ? cat.name : 'Sin categoría'
    }

    // grid.classList.remove('d-none')  // Oculto en nuevo diseño del dashboard
    grid.innerHTML = vehicles.map(v => `
        <div class="col-md-4 col-sm-6">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-3">
                        <div class="bg-primary bg-opacity-10 text-primary p-2 rounded-circle me-3">
                            <i class="bi bi-car-front-fill fs-5"></i>
                        </div>
                        <div>
                            <h6 class="fw-bold mb-0">${v.brand} ${v.model}</h6>
                            <small class="text-secondary">${v.year}</small>
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge bg-light text-secondary border">
                            <i class="bi bi-tag me-1"></i>${getCategoryName(v.categoryId)}
                        </span>
                        <span class="badge bg-success bg-opacity-10 text-success">
                            <i class="bi bi-check-circle me-1"></i>Disponible
                        </span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="fw-bold text-primary fs-5">$${Number(v.dailyPrice).toFixed(2)}</span>
                            <small class="text-secondary"> / día</small>
                        </div>
                        <a href="./modules/rentals.html" class="btn btn-primary btn-sm px-3">
                            <i class="bi bi-calendar-plus me-1"></i>Rentar
                        </a>
                    </div>
                    <div class="mt-2">
                        <small class="text-muted">
                            <i class="bi bi-credit-card me-1"></i>Placa: ${v.plate}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `).join('')
}