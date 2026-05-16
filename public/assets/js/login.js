import { hideAlert, showAlert, setButtonLoading, loginUser, observeAuth, getFirebaseErrorMessage } from "./auth.js"

const form = document.getElementById('loginForm')
const emailInput = document.getElementById('loginEmail')
const passwordInput = document.getElementById('loginPassword')
const loginBtn = document.getElementById('loginBtn')

observeAuth((user) => {
    if (user) {
        window.location.href = './dashboard.html'
    }
})

form?.addEventListener('submit', async (e) => {
    e.preventDefault()

    hideAlert('loginAlert')

    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()

    if (!email || !password) {
        showAlert('loginAlert', 'Por favor, completa todos los campos')
        return
    }

    try {
        setButtonLoading(loginBtn, true, '<i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión', 'Iniciando Sesión')
        await loginUser({ email, password })
        window.location.href = './dashboard.html'
    } catch (error) {
        showAlert('loginAlert', getFirebaseErrorMessage(error))
    } finally {
        setButtonLoading(loginBtn, false, '<i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión')
    }
})

// Atajo oculto para acceso administrativo: Ctrl + Shift + A

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        window.location.href = './admin-register.html'
    }
})