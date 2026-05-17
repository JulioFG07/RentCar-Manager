import { registerUser, logoutUser } from "./auth.js"
import { createDocument, COLLECTIONS } from "./firestore.js"
import { showAlert, hideAlert, showButtonLoader, hideButtonLoader } from "./ui.js"
import { isEmpty, isValidEmail, isValidPassword, passwordsMatch } from "./validators.js"

const form            = document.getElementById('registerForm')
const nameInput       = document.getElementById('name')
const emailInput      = document.getElementById('email')
const passwordInput   = document.getElementById('password')
const confirmInput    = document.getElementById('confirmPassword')
const registerBtn     = document.getElementById('registerBtn')
const successBox      = document.getElementById('registerSuccess')

form?.addEventListener('submit', async (e) => {
    e.preventDefault()

    hideAlert('registerAlert')
    successBox.classList.add('d-none')
    successBox.textContent = ''

    const name            = nameInput.value.trim()
    const email           = emailInput.value.trim()
    const password        = passwordInput.value.trim()
    const confirmPassword = confirmInput.value.trim()

    if (isEmpty(name) || isEmpty(email) || isEmpty(password) || isEmpty(confirmPassword)) {
        showAlert('registerAlert', 'Todos los datos son obligatorios')
        return
    }

    if (!isValidEmail(email)) {
        showAlert('registerAlert', 'Ingresa un correo electrónico válido')
        return
    }

    if (!isValidPassword(password)) {
        showAlert('registerAlert', 'La contraseña debe tener al menos 6 caracteres')
        return
    }

    if (!passwordsMatch(password, confirmPassword)) {
        showAlert('registerAlert', 'Las contraseñas no son iguales')
        return
    }

    try {
        showButtonLoader(registerBtn, 'Creando cuenta...')

        // 1. Crear usuario en Firebase Auth
        const result = await registerUser({ fullName: name, email, password })

        if (!result.success) {
            showAlert('registerAlert', result.error)
            return
        }

        // 2. Guardar perfil en Firestore con rol "user"
        await createDocument(COLLECTIONS.USERS, {
            uid:  result.user.uid,
            name,
            email,
            role: 'user'
        })

        // 3. Cerrar sesión para regresar al login
        await logoutUser()

        successBox.textContent = 'Cuenta creada correctamente'
        successBox.classList.remove('d-none')

        setTimeout(() => {
            window.location.href = './login.html'
        }, 1200)

    } catch (error) {
        showAlert('registerAlert', 'Ocurrió un error inesperado')
        console.error(error)
    } finally {
        hideButtonLoader(registerBtn)
    }
})