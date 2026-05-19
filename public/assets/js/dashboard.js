import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, COLLECTIONS } from './firestore.js'
import { showButtonLoader, hideButtonLoader } from './ui.js'

// ─────────────────────────────────────
// ELEMENTOS DEL DOM
// ─────────────────────────────────────

const navUserName   = document.getElementById('navUserName')
const logoutBtn     = document.getElementById('logoutBtn')

const statAvailable = document.getElementById('statAvailable')
const statRented    = document.getElementById('statRented')
const statCustomers = document.getElementById('statCustomers')
const statIncome    = document.getElementById('statIncome')

const historyBody   = document.getElementById('historyBody')

// ─────────────────────────────────────
// VARIABLES DE SESIÓN
// ─────────────────────────────────────

let currentUser    = null
let currentProfile = null
let isProcessing   = false

// =============================================================
// ⚠️ ZONA PROTEGIDA — MÓDULO DE AUTH (Sebastián)
// No modificar este bloque. Contiene la lógica de verificación
// de sesión, redirección por rol y protección de rutas.
// Cualquier cambio aquí puede romper el login y el acceso al
// módulo de clientes del admin.
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
            loadingState.innerHTML = `
                <p class="text-danger">
                    Error al cargar el perfil.
                    <a href="./login.html">Volver al login</a>
                </p>
            `
            return
        }

        const profile = result.data.find(u => u.uid === user.uid)

        if (!profile) {
            loadingState.innerHTML = `
                <p class="text-danger">
                    No se encontró tu perfil.
                    <a href="./login.html">Volver al login</a>
                </p>
            `
            return
        }

        currentProfile = profile

        // Redirección admins
        if (profile.role === 'admin') {
            window.location.href = './modules/customers.html'
            return
        }

        // Dashboard usuario
        renderUserDashboard(user, profile)

        // Dashboard general
        navUserName.textContent = profile.name || user.email

        await loadFullDashboard()

    } catch (error) {
        console.error(error)
    }
})

// =============================================================
// ✅ FIN ZONA PROTEGIDA
// Código dashboard
// =============================================================

// ─────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────

const loadFullDashboard = async () => {

    try {

        const [vehiclesRes, usersRes, rentalsRes] = await Promise.all([
            getDocuments(COLLECTIONS.VEHICLES),
            getDocuments(COLLECTIONS.USERS),
            getDocuments(COLLECTIONS.RENTALS)
        ])

        // VEHÍCULOS

        if (vehiclesRes.success) {

            const available = vehiclesRes.data.filter(
                v => v.status === 'available'
            ).length

            const rented = vehiclesRes.data.filter(
                v => v.status === 'rented'
            ).length

            statAvailable.textContent = available
            statRented.textContent = rented
        }

        // CLIENTES

        if (usersRes.success) {

            const customers = usersRes.data.filter(
                u => u.role === 'user'
            ).length

            statCustomers.textContent = customers
        }

        // RENTAS

        if (rentalsRes.success) {

            calculateIncomeAndHistory(rentalsRes.data)

        } else {

            historyBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        No hay rentas registradas
                    </td>
                </tr>
            `

            statIncome.textContent = '$0.00'
        }

    } catch (error) {
        console.error(error)
    }
}

// ─────────────────────────────────────
// INGRESOS E HISTORIAL
// ─────────────────────────────────────

const calculateIncomeAndHistory = (rentals) => {

    const currentMonth = new Date().getMonth()
    const currentYear  = new Date().getFullYear()

    let monthlyIncome = 0

    const recentRentals = rentals.slice(0, 10)

    rentals.forEach(rental => {

        let rentalDate = new Date()

        if (rental.createdAt && rental.createdAt.toDate) {
            rentalDate = rental.createdAt.toDate()
        } else if (rental.date) {
            rentalDate = new Date(rental.date)
        }

        if (
            rentalDate.getMonth() === currentMonth &&
            rentalDate.getFullYear() === currentYear
        ) {

            monthlyIncome += Number(
                rental.totalPrice || rental.total || 0
            )
        }
    })

    statIncome.textContent = `$${monthlyIncome.toFixed(2)}`

    // HISTORIAL VACÍO

    if (recentRentals.length === 0) {

        historyBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    Aún no hay transacciones
                </td>
            </tr>
        `

        return
    }

    // HISTORIAL

    historyBody.innerHTML = recentRentals.map(rental => {

        let dateStr = 'N/A'

        if (rental.createdAt && rental.createdAt.toDate) {
            dateStr = rental.createdAt.toDate().toLocaleDateString()
        }

        const statusColors = {
            active: 'primary',
            completed: 'success',
            cancelled: 'danger'
        }

        const badgeColor = statusColors[rental.status] || 'secondary'

        const statusLabel = rental.status
            ? rental.status.charAt(0).toUpperCase() + rental.status.slice(1)
            : 'Pendiente'

        const price = Number(
            rental.totalPrice || rental.total || 0
        ).toFixed(2)

        return `
            <tr>
                <td class="ps-4 text-secondary">${dateStr}</td>

                <td class="fw-medium">
                    ${rental.customerName || 'Desconocido'}
                </td>

                <td>
                    ${rental.vehicleBrand || 'Vehículo'}
                    ${rental.vehicleModel || ''}
                </td>

                <td>
                    <span class="badge bg-${badgeColor} bg-opacity-10 text-${badgeColor}">
                        ${statusLabel}
                    </span>
                </td>

                <td class="text-end pe-4 fw-bold text-success">
                    $${price}
                </td>
            </tr>
        `
    }).join('')
}

// ─────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────

logoutBtn?.addEventListener('click', async () => {

    await logoutUser()

    window.location.href = './login.html'
})