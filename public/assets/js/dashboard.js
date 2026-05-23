import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, getAvailableVehicles, COLLECTIONS } from './firestore.js'

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

    await Promise.all([
    loadDashboardData(),
    loadUserHistory(user.uid, profile.id),
    loadAvailableVehicles()
])
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

/* ======================================================
HISTORY & STATS MANAGEMENT
====================================================== */

const loadUserHistory = async (userId, profileId) => {

    try {

        const [rentalsResult, vehiclesResult] = await Promise.all([
            getDocuments(COLLECTIONS.RENTALS || "rentals"),
            getDocuments(COLLECTIONS.VEHICLES || "vehicles")
        ]);

        if (!rentalsResult.success) throw new Error("No se pudo cargar el historial");

        const vehicles    = vehiclesResult.success ? vehiclesResult.data : [];

        const userRentals = rentalsResult.data.filter(rental =>
            rental.customerId === profileId ||
            rental.customerId === userId ||
            rental.userId === userId
        );

        updateStats(userRentals);
        renderHistoryTable(userRentals, vehicles);

    } catch (error) {

        console.error("Error al cargar historial:", error);

        const historyBody = document.getElementById("historyBody");

        if (historyBody) {
            historyBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar el historial.</td></tr>`;
        }
    }
};

const loadAvailableVehicles = async () => {

    try {

        // Usamos getAvailableVehicles de firestore.js que filtra status === "available" y active === true
        const result = await getAvailableVehicles();

        if (!result.success) return;

        const statAvailable = document.getElementById("statAvailable");
        if (statAvailable) statAvailable.textContent = result.data.length;

    } catch (error) {
        console.error("Error al cargar vehículos disponibles:", error);
    }
};

const updateStats = (rentals) => {

    const statActiveRentals = document.getElementById("statActiveRentals");
    const statTotalRentals  = document.getElementById("statTotalRentals");
    const statTotalSpent    = document.getElementById("statTotalSpent");

    const activeRentals = rentals.filter(r =>
        r.status === 'active' || r.status === 'Activa' || r.status === 'En curso'
    ).length;
    const totalSpent = rentals.reduce((sum, r) => sum + (Number(r.totalCost) || Number(r.total) || 0), 0);

    if (statActiveRentals) statActiveRentals.textContent = activeRentals;
    if (statTotalRentals)  statTotalRentals.textContent  = rentals.length;
    if (statTotalSpent)    statTotalSpent.textContent    = `$${totalSpent.toFixed(2)}`;
};

const formatTimestamp = (value) => {
    if (!value) return "—";
    try {
        // Firestore Timestamp
        if (typeof value.toDate === "function") return value.toDate().toLocaleDateString("es-MX");
        // Date object
        if (value instanceof Date) return value.toLocaleDateString("es-MX");
        // String
        return new Date(value).toLocaleDateString("es-MX");
    } catch {
        return "—";
    }
};

const statusLabel = (status) => {
    const map = { active: "Activa", completed: "Completada", cancelled: "Cancelada" };
    return map[status] || status || "—";
};

const statusColor = (status) => {
    const map = { active: "bg-success", completed: "bg-secondary", cancelled: "bg-danger" };
    return map[status] || "bg-secondary";
};

const renderHistoryTable = (rentals, vehicles = []) => {

    const historyBody = document.getElementById("historyBody");

    if (!historyBody) return;

    if (rentals.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No tienes rentas registradas aún.</td></tr>`;
        return;
    }

    historyBody.innerHTML = rentals.map(rental => {
        const vehicle     = vehicles.find(v => v.id === rental.vehicleId);
        const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : (rental.vehicleName || "—");
        const fecha       = formatTimestamp(rental.startDate);
        const inicio      = formatTimestamp(rental.startDate);
        const fin         = formatTimestamp(rental.endDate);

        return `
        <tr>
            <td class="ps-4">${fecha}</td>
            <td>${vehicleName}</td>
            <td>${inicio}</td>
            <td>${fin}</td>
            <td><span class="badge ${statusColor(rental.status)}">${statusLabel(rental.status)}</span></td>
            <td class="text-end pe-4">$${(Number(rental.totalCost) || Number(rental.total) || 0).toFixed(2)}</td>
        </tr>`;
    }).join("");
};


/* ======================================================
   REFRESH HISTORY BUTTON
====================================================== */

document.getElementById("refreshHistoryBtn")?.addEventListener("click", async () => {
    if (!currentUser || !currentProfile) return;
    const historyBody = document.getElementById("historyBody");
    if (historyBody) {
        historyBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Actualizando...</td></tr>`;
    }
    await loadUserHistory(currentUser.uid, currentProfile.id);
    await loadAvailableVehicles();
});