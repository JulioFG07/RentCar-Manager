import { registerUser, logoutUser } from "./auth.js"
import { createDocument, COLLECTIONS } from "./firestore.js"
import { showAlert, hideAlert, showButtonLoader, hideButtonLoader } from "./ui.js"
import { isEmpty, isValidEmail, isValidPassword, passwordsMatch } from "./validators.js"

// Clave secreta para registrar admins
const ADMIN_SECRET_KEY = 'rentcar2026admin'

const form           = document.getElementById('adminRegisterForm')
const nameInput      = document.getElementById('adminName')
const emailInput     = document.getElementById('adminEmail')
const passwordInput  = document.getElementById('adminPassword')
const confirmInput   = document.getElementById('adminConfirmPassword')
const secretKeyInput = document.getElementById('adminSecretKey')
const registerBtn    = document.getElementById('adminRegisterBtn')
const successBox     = document.getElementById('adminSuccess')

form?.addEventListener('submit', async (e) => {
    e.preventDefault()

    hideAlert('adminAlert')
    successBox.classList.add('d-none')
    successBox.textContent = ''

    const name            = nameInput.value.trim()
    const email           = emailInput.value.trim()
    const password        = passwordInput.value.trim()
    const confirmPassword = confirmInput.value.trim()
    const secretKey       = secretKeyInput.value.trim()

    if (isEmpty(name) || isEmpty(email) || isEmpty(password) || isEmpty(confirmPassword) || isEmpty(secretKey)) {
        showAlert('adminAlert', 'Todos los datos son obligatorios')
        return
    }

    // Validación de la clave secreta
    if (secretKey !== ADMIN_SECRET_KEY) {
        showAlert('adminAlert', 'La clave de acceso del sistema es incorrecta')
        return
    }

    if (!isValidEmail(email)) {
        showAlert('adminAlert', 'Ingresa un correo electrónico válido')
        return
    }

    if (!isValidPassword(password)) {
        showAlert('adminAlert', 'La contraseña debe tener al menos 6 caracteres')
        return
    }

    if (!passwordsMatch(password, confirmPassword)) {
        showAlert('adminAlert', 'Las contraseñas no son iguales')
        return
    }

    try {
        showButtonLoader(registerBtn, 'Registrando...')

        // 1. Crear usuario en Firebase Auth
        const result = await registerUser({ fullName: name, email, password })

        if (!result.success) {
            showAlert('adminAlert', result.error)
            return
        }

        // 2. Guardar perfil en Firestore con rol "admin"
        await createDocument(COLLECTIONS.USERS, {
            uid:  result.user.uid,
            name,
            email,
            role: 'admin'
        })

        // 3. Cerrar sesión para regresar al login
        await logoutUser()

        successBox.textContent = 'Administrador registrado correctamente'
        successBox.classList.remove('d-none')

        setTimeout(() => {
            window.location.href = './login.html'
        }, 1500)

    } catch (error) {
        showAlert('adminAlert', 'Ocurrió un error inesperado')
        console.error(error)
    } finally {
        hideButtonLoader(registerBtn)
    }
})