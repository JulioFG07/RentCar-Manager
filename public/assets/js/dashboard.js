import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, getAvailableVehicles, updateDocument, COLLECTIONS } from './firestore.js'
import { showToast } from './ui.js'

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
        logoutBtn.dataset.logoutBound = 'true'   
        logoutBtn.addEventListener('click', async () => {
            await logoutUser()
            window.location.href = './login.html'
        })
    }
}

// ── Navbar: cuando cargue dinámicamente ──
document.addEventListener('navbarLoaded', () => {
    attachLogout()

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
        welcomeName.textContent = fullName.split(' ')[0] || fullName
    }

    // Actualizar navbar si ya cargó
    const navbarContainer = document.getElementById('navbarContainer')
    const navUserName = navbarContainer?.querySelector('#navUserName')
    if (navUserName) {
        navUserName.textContent = profile.name || profile.fullName || user.displayName || user.email
    }
    attachLogout()

    // Carga paralela de información en Dashboard
    await Promise.all([
        loadDashboardData(),
        loadUserHistory(user.uid, profile.id),
        loadAvailableVehicles()
    ])
}

const loadDashboardData = async () => {
    // Nota: Mapeo de categorías o contadores rápidos globales si son necesarios
    try {
        const result = await getDocuments(COLLECTIONS.VEHICLES);
        if (result.success) {
            const available = result.data.filter(v => v.status === 'available' && v.active !== false);
            const statAvailable = document.getElementById('statAvailable');
            if (statAvailable) statAvailable.textContent = available.length;
        }
    } catch (error) {
        console.error('Error en loadDashboardData:', error);
    }
}

/* ======================================================
   HISTORY, TABLES & CANCELATION MANAGEMENT
====================================================== */

const loadUserHistory = async (userId, profileId) => {
    try {
        const activeRentalsBody = document.getElementById("activeRentalsBody");
        const historyBody        = document.getElementById("historyBody");

        if (activeRentalsBody) {
            activeRentalsBody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-secondary"><div class="spinner-border spinner-border-sm me-2 text-primary"></div>Sincronizando operaciones...</td></tr>`;
        }
        if (historyBody) {
            historyBody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-secondary">Actualizando registros históricos...</td></tr>`;
        }

        const [rentalsResult, vehiclesResult] = await Promise.all([
            getDocuments(COLLECTIONS.RENTALS || "rentals"),
            getDocuments(COLLECTIONS.VEHICLES || "vehicles")
        ]);

        if (!rentalsResult.success) throw new Error("No se pudo cargar el historial");

        const vehicles = vehiclesResult.success ? vehiclesResult.data : [];

        // Filtrar rentas asociadas al cliente de forma segura
        const userRentals = rentalsResult.data.filter(rental =>
            rental.customerId === profileId ||
            rental.customerId === userId ||
            rental.userId === userId
        );

        // Actualizar contadores superiores del Dashboard
        updateStats(userRentals);
        
        // Renderizar las dos tablas separadas en el Panel de Control
        renderDashboardTables(userRentals, vehicles);

    } catch (error) {
        console.error("Error al cargar historial del panel:", error);
        const activeRentalsBody = document.getElementById("activeRentalsBody");
        const historyBody = document.getElementById("historyBody");
        
        if (activeRentalsBody) activeRentalsBody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-danger">Error de carga.</td></tr>`;
        if (historyBody) historyBody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-danger">Error de carga.</td></tr>`;
    }
};

const loadAvailableVehicles = async () => {
    try {
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

    const activeCount = rentals.filter(r => r.status === 'active').length;
    const totalSpent  = rentals.reduce((sum, r) => sum + (Number(r.totalCost) || Number(r.total) || 0), 0);

    if (statActiveRentals) statActiveRentals.textContent = activeCount;
    if (statTotalRentals)  statTotalRentals.textContent  = rentals.length;
    if (statTotalSpent)    statTotalSpent.textContent    = `$${totalSpent.toFixed(2)}`;
};

const formatTimestamp = (value) => {
    if (!value) return "—";
    try {
        if (typeof value.toDate === "function") return value.toDate().toLocaleDateString("es-MX");
        if (value instanceof Date) return value.toLocaleDateString("es-MX");
        return new Date(value).toLocaleDateString("es-MX");
    } catch {
        return "—";
    }
};

// ── Lógica de renderizado inteligente de Tablas del Dashboard ──
const renderDashboardTables = (rentals, vehicles = []) => {
    const activeRentalsBody = document.getElementById("activeRentalsBody");
    const historyBody        = document.getElementById("historyBody");

    if (!activeRentalsBody || !historyBody) return;

    // Separar colecciones según su estado de vigencia u operación concluida
    const activeList  = rentals.filter(r => r.status === 'active');
    const historyList = rentals.filter(r => r.status === 'completed' || r.status === 'cancelled');

    // 1. Render de Reservaciones y Rentas Vigentes
    if (activeList.length === 0) {
        activeRentalsBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-info-circle me-1"></i>No tienes reservaciones vigentes registradas.</td></tr>`;
    } else {
        const hoy = new Date();
        hoy.setHours(0,0,0,0);

        activeRentalsBody.innerHTML = activeList.map(r => {
            const vehicle     = vehicles.find(v => v.id === r.vehicleId);
            const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : "Vehículo Desconocido";
            const placa       = vehicle ? `(${vehicle.plate})` : "";
            
            const startJS     = r.startDate.toDate ? r.startDate.toDate() : new Date(r.startDate);
            const startCompare = new Date(startJS);
            startCompare.setHours(0,0,0,0);

            const esApartadoFuturo = startCompare > hoy;
            
            const badge = esApartadoFuturo
                ? `<span class="badge bg-info-subtle text-info border border-info-subtle"><i class="bi bi-clock me-1"></i>Apartado Futuro</span>`
                : `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-play-circle me-1"></i>En Curso</span>`;

            // Renderizado del botón dinámico de acción directa
            const actionBtn = esApartadoFuturo
                ? `<button class="btn btn-sm btn-outline-danger px-2 btn-cancelar-dashboard" data-id="${r.id}" data-vehicle-id="${r.vehicleId}">
                     <i class="bi bi-x-circle"></i> Cancelar Apartado
                   </button>`
                : `<button class="btn btn-sm btn-light px-2 border" disabled style="cursor: not-allowed;">
                     <i class="bi bi-lock-fill text-muted"></i> En curso
                   </button>`;

            return `
            <tr>
                <td class="fw-bold text-dark">${vehicleName} <small class="text-secondary fw-normal ms-1">${placa}</small></td>
                <td>${badge}</td>
                <td>${formatTimestamp(r.startDate)}</td>
                <td>${formatTimestamp(r.endDate)}</td>
                <td class="fw-semibold text-dark">$${(Number(r.totalCost) || 0).toFixed(2)}</td>
                <td class="text-end pe-3">${actionBtn}</td>
            </tr>`;
        }).join("");

        // Agregar Event Listeners a los botones de cancelación asíncronos generados
        document.querySelectorAll('.btn-cancelar-dashboard').forEach(btn => {
            btn.addEventListener('click', async () => {
                const rentalId  = btn.dataset.id;
                const vehicleId = btn.dataset.vehicleId;

                if (confirm('¿Seguro que deseas cancelar este apartado? El vehículo volverá a estar disponible de inmediato.')) {
                    try {
                        btn.disabled = true;
                        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;

                        // Transacción simulada: Cancelar renta y liberar auto a disponible en Firestore
                        await updateDocument(COLLECTIONS.RENTALS, rentalId, { status: 'cancelled', returnDate: new Date() });
                        await updateDocument(COLLECTIONS.VEHICLES, vehicleId, { status: 'available' });

                        showToast('Apartado cancelado de forma exitosa.', 'warning');
                        
                        // Recargar todo el Dashboard de forma limpia
                        if (currentUser && currentProfile) {
                            await loadUserHistory(currentUser.uid, currentProfile.id);
                            await loadAvailableVehicles();
                        }
                    } catch (err) {
                        console.error("Error al cancelar desde panel:", err);
                        showToast('Error al procesar la cancelación.', 'danger');
                        btn.disabled = false;
                    }
                }
            });
        });
    }

    // 2. Render de Historial Completo de Actividad (Devueltos / Cancelados)
    if (historyList.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No registras movimientos cerrados en tu historial.</td></tr>`;
        return;
    }

    historyBody.innerHTML = historyList.map(rental => {
        const vehicle     = vehicles.find(v => v.id === rental.vehicleId);
        const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : "Vehículo";
        const inicio      = formatTimestamp(rental.startDate);
        const fin         = formatTimestamp(rental.endDate);
        const finalizado  = rental.returnDate ? formatTimestamp(rental.returnDate) : fin;

        let badge = `<span class="badge bg-success-subtle text-success border border-success-subtle">Devuelto</span>`;
        if (rental.status === 'cancelled') {
            badge = `<span class="badge bg-secondary-subtle text-secondary border">Cancelado</span>`;
        }

        return `
        <tr>
            <td class="fw-medium text-dark">${vehicleName}</td>
            <td>${badge}</td>
            <td>${inicio}</td>
            <td>${fin}</td>
            <td class="fw-semibold text-dark">$${(Number(rental.totalCost) || 0).toFixed(2)}</td>
            <td class="text-end pe-3 text-secondary">${finalizado}</td>
        </tr>`;
    }).join("");
};

/* ======================================================
   REFRESH CONTROL INTERFACES
====================================================== */

document.getElementById("refreshHistoryBtn")?.addEventListener("click", async () => {
    if (!currentUser || !currentProfile) return;
    await loadUserHistory(currentUser.uid, currentProfile.id);
    await loadAvailableVehicles();
    showToast('Panel de control actualizado correctamente.', 'success');
});