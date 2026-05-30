/* ======================================================
   THEME INIT — se ejecuta antes que todo
   Aplica el tema guardado para evitar flash de modo incorrecto
   y expone __toggleTheme globalmente para los navbars dinámicos
====================================================== */

;(function () {
    const THEME_KEY = 'rentcar-theme'

    // 1. Aplicar tema guardado inmediatamente
    const saved = localStorage.getItem(THEME_KEY) || 'light'
    document.documentElement.setAttribute('data-bs-theme', saved)

    // 2. Exponer toggle global para que el navbar dinámico pueda llamarlo
    window.__toggleTheme = function () {
        const current = document.documentElement.getAttribute('data-bs-theme')
        const next    = current === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-bs-theme', next)
        localStorage.setItem(THEME_KEY, next)

        // Actualizar todos los botones del navbar
        document.querySelectorAll('.theme-toggle-btn i').forEach(icon => {
            icon.className = next === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill'
        })
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.title = next === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
        })
    }

    // 3. Actualizar íconos cuando el navbar dinámico cargue
    document.addEventListener('navbarLoaded', function () {
        const isDark  = document.documentElement.getAttribute('data-bs-theme') === 'dark'
        document.querySelectorAll('.theme-toggle-btn i').forEach(icon => {
            icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill'
        })
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
        })
    })
})()