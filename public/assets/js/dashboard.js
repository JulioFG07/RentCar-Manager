import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, COLLECTIONS } from './firestore.js'
import { showButtonLoader, hideButtonLoader } from './ui.js'

// ── Variables de sesión ──
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
            loadingState.innerHTML = `<p class="text-danger">Error al cargar el perfil. <a href="./login.html">Volver al login</a></p>`
            return
        }

        const profile = result.data.find(u => u.uid === user.uid)

        if (!profile) {
            loadingState.innerHTML = `<p class="text-danger">No se encontró tu perfil. <a href="./login.html">Volver al login</a></p>`
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
// Agregar su código del dashboard aquí abajo
// =============================================================