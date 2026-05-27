/* ======================================================
   NAVBAR LOADER
   Carga el navbar desde un archivo HTML compartido
   y resalta automáticamente la página actual
====================================================== */

// Cargar el navbar al inicio
const loadNavbar = async () => {

    const navbarContainer = document.getElementById('navbarContainer')

    if (!navbarContainer) return

    try {

        const response = await fetch('../assets/components/navbar.html')

        if (!response.ok) {
            console.error('No se pudo cargar el navbar')
            return
        }

        const html = await response.text()

        navbarContainer.innerHTML = html

        // Marcar el link activo según la página actual
        setActiveLink()

        // Disparar evento para avisar que el navbar está listo
        document.dispatchEvent(new CustomEvent('navbarLoaded'))

    } catch (error) {
        console.error('Error cargando navbar:', error)
    }
}

// Detectar página actual y resaltar el link correspondiente
const setActiveLink = () => {

    // Obtener el nombre del archivo actual (ej: "customers.html" → "customers")
    const currentPage = window.location.pathname
        .split('/')
        .pop()
        .replace('.html', '')

    // Buscar el link con el data-page correspondiente
    const activeLink = document.querySelector(`[data-page="${currentPage}"]`)

    if (activeLink) {
        activeLink.classList.add('active', 'fw-semibold')
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', loadNavbar)