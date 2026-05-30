import { loginUser, checkAuth } from './auth.js'
import { showAlert, hideAlert, showButtonLoader, hideButtonLoader } from './ui.js'
import { isEmpty, isValidEmail } from './validators.js'

const form          = document.getElementById('loginForm')
const emailInput    = document.getElementById('loginEmail')
const passwordInput = document.getElementById('loginPassword')
const loginBtn      = document.getElementById('loginBtn')

// Redirigir si ya hay sesión activa (bandera para evitar bucle)
let redirected = false

checkAuth((user) => {
    if (user && !redirected) {
        redirected = true
        window.location.href = './dashboard.html'
    }
})

form?.addEventListener('submit', async (e) => {
    e.preventDefault()

    hideAlert('loginAlert')

    const email    = emailInput.value.trim()
    const password = passwordInput.value.trim()

    if (isEmpty(email) || isEmpty(password)) {
        showAlert('loginAlert', 'Por favor, completa todos los campos')
        return
    }

    if (!isValidEmail(email)) {
        showAlert('loginAlert', 'Ingresa un correo electrónico válido')
        return
    }

    try {
        showButtonLoader(loginBtn, 'Iniciando sesión...')

        const result = await loginUser(email, password)

        if (!result.success) {
            showAlert('loginAlert', result.error)
            return
        }

        redirected = true
        window.location.href = './dashboard.html'

    } catch (error) {
        showAlert('loginAlert', 'Ocurrió un error inesperado')
        console.error(error)
    } finally {
        hideButtonLoader(loginBtn)
    }
})

// Atajo oculto para acceso administrativo: Ctrl + Shift + A
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        window.location.href = './admin-register.html'
    }
})