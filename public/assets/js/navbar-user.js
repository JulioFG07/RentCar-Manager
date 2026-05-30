/* ======================================================
   NAVBAR-USER LOADER
   Carga el navbar exclusivo para usuarios normales
   y resalta automáticamente la página actual
====================================================== */

const loadUserNavbar = async () => {

    const navbarContainer = document.getElementById('navbarContainer')

    if (!navbarContainer) return

    try {

        // Detectar si estamos en /modules/ para ajustar el path
        const isInModules = window.location.pathname.includes('/modules/')
        const basePath = isInModules ? '../' : './'

        const response = await fetch(`${basePath}assets/components/navbar-user.html`)

        if (!response.ok) {
            console.error('No se pudo cargar el navbar de usuario')
            return
        }

        const html = await response.text()

        navbarContainer.innerHTML = html

        // Si estamos en /modules/, corregir todos los links del navbar
        if (isInModules) {
            const links = navbarContainer.querySelectorAll('a[href]')
            links.forEach(link => {
                const href = link.getAttribute('href')
                if (href && href.startsWith('./')) {
                    link.setAttribute('href', '../' + href.slice(2))
                }
            })
        }

        // Marcar el link activo según la página actual
        setActiveUserLink()

        // Cargar notificaciones automáticamente en todas las páginas
        const notifScript = document.createElement('script')
        notifScript.type = 'module'
        notifScript.src = `${basePath}assets/js/notifications.js`
        document.head.appendChild(notifScript)

        // Disparar evento para avisar que el navbar está listo
        document.dispatchEvent(new CustomEvent('navbarLoaded'))

    } catch (error) {
        console.error('Error cargando navbar de usuario:', error)
    }
}

const setActiveUserLink = () => {

    const currentPage = window.location.pathname
        .split('/')
        .pop()
        .replace('.html', '')

    const activeLink = document.querySelector(`[data-page="${currentPage}"]`)

    if (activeLink) {
        activeLink.classList.add('active', 'fw-semibold')
    }
}

document.addEventListener('DOMContentLoaded', loadUserNavbar)