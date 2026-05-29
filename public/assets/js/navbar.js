/* ======================================================
   NAVBAR LOADER
   Carga el navbar desde un archivo HTML compartido
   y resalta automáticamente la página actual
====================================================== */

let _navbarReady = false
const _pendingUser = { name: null }

// Cargar el navbar al inicio
const loadNavbar = async () => {

    const navbarContainer = document.getElementById('navbarContainer')
    if (!navbarContainer) return

    try {
        const response = await fetch('../assets/components/navbar.html')
        if (!response.ok) { console.error('No se pudo cargar el navbar'); return }

        const html = await response.text()
        navbarContainer.innerHTML = html

        setActiveLink()

        _navbarReady = true

        // Si ya había un nombre pendiente de mostrar, aplicarlo ahora
        if (_pendingUser.name) {
            const navUserName = document.getElementById('navUserName')
            if (navUserName) {
                navUserName.textContent  = _pendingUser.name
                navUserName.style.opacity = '1'
            }
        }

        document.dispatchEvent(new CustomEvent('navbarLoaded'))

    } catch (error) {
        console.error('Error cargando navbar:', error)
    }
}

// Detectar página actual y resaltar el link correspondiente
const setActiveLink = () => {
    const currentPage = window.location.pathname
        .split('/')
        .pop()
        .replace('.html', '')

    const activeLink = document.querySelector(`[data-page="${currentPage}"]`)
    if (activeLink) activeLink.classList.add('active', 'fw-semibold')
}

// ── API pública: llamar desde cada módulo con el nombre ya resuelto ──
window.setNavbarUser = (name) => {
    const navUserName = document.getElementById('navUserName')
    if (navUserName) {
        // El navbar ya está en el DOM
        navUserName.textContent   = name
        navUserName.style.opacity = '1'
    } else {
        // El navbar aún no terminó de cargar, guardar para después
        _pendingUser.name = name
    }
}

document.addEventListener('DOMContentLoaded', loadNavbar)