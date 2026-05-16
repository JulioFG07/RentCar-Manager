import { hideAlert, showAlert, setButtonLoading, registerAdmin, getFirebaseErrorMessage, logoutUser } from "./auth.js"

// Clave secreta para registrar admins

const ADMIN_SECRET_KEY = 'rentcar2026admin'

const form = document.getElementById('adminRegisterForm')
const nameInput = document.getElementById('adminName')
const emailInput = document.getElementById('adminEmail')
const passwordInput = document.getElementById('adminPassword')
const confirmPasswordInput = document.getElementById('adminConfirmPassword')
const secretKeyInput = document.getElementById('adminSecretKey')
const registerBtn = document.getElementById('adminRegisterBtn')
const successBox = document.getElementById('adminSuccess')

form?.addEventListener('submit', async (e) => {

    e.preventDefault()

    hideAlert('adminAlert')
    successBox.classList.add('d-none')
    successBox.textContent = ''

    const name = nameInput.value.trim()
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()
    const confirmPassword = confirmPasswordInput.value.trim()
    const secretKey = secretKeyInput.value.trim()

    if (!name || !email || !password || !confirmPassword || !secretKey) {
        showAlert('adminAlert', 'Todos los datos son obligatorios')
        return
    }

    //Validación de la clave secreta

    if (secretKey !== ADMIN_SECRET_KEY) {
        showAlert('adminAlert', 'La clave de acceso del sistema es incorrecta')
        return
    }

    //Validación de contraseña menor a 6 caracteres
    
    if (password.length < 6) {
        showAlert('adminAlert', 'La contraseña debe tener al menos 6 caracteres')
        return
    }

    if (password !== confirmPassword) {
        showAlert('adminAlert', 'Las contraseñas no son iguales')
        return
    }

    try {
        setButtonLoading(registerBtn, true, '<i class="bi bi-shield-check me-2"></i>Registrar Administrador', 'Registrando...')
        await registerAdmin({ name, email, password })
        await logoutUser()

        successBox.textContent = 'Administrador registrado correctamente'
        successBox.classList.remove('d-none')

        setTimeout(() => {
            window.location.href = './login.html'
        }, 1500)
    } catch (error) {
        showAlert('adminAlert', getFirebaseErrorMessage(error))
    } finally {
        setButtonLoading(registerBtn, false, '<i class="bi bi-shield-check me-2"></i>Registrar Administrador')
    }
})