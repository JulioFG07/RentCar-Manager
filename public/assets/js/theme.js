/* ======================================================
   THEME MANAGER — Modo oscuro / claro
   Se carga antes que Bootstrap para evitar flash
====================================================== */

const THEME_KEY = 'rentcar-theme'

// Aplicar tema guardado inmediatamente al cargar
const savedTheme = localStorage.getItem(THEME_KEY) || 'light'
document.documentElement.setAttribute('data-bs-theme', savedTheme)

/* ======================================================
   Toggle entre claro y oscuro
====================================================== */
export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-bs-theme')
    const next    = current === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-bs-theme', next)
    localStorage.setItem(THEME_KEY, next)
    updateThemeButtons()
}

/* ======================================================
   Actualizar ícono y tooltip del botón
====================================================== */
export function updateThemeButtons() {
    const isDark  = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    const buttons = document.querySelectorAll('.theme-toggle-btn')

    buttons.forEach(btn => {
        const icon = btn.querySelector('i')
        if (icon) {
            icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill'
        }
        btn.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
    })
}

/* ======================================================
   Obtener tema actual
====================================================== */
export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-bs-theme') || 'light'
}

/* ======================================================
   Inicializar botones cuando el navbar ya esté en el DOM
====================================================== */
document.addEventListener('navbarLoaded', () => {
    updateThemeButtons()
})

// También actualizar si ya hay botones en el DOM al cargar
document.addEventListener('DOMContentLoaded', () => {
    updateThemeButtons()
})