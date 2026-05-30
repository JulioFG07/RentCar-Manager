// Firebase Authentication
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

import { auth } from "./firebase.js";

/* Registrar usuario */
export async function registerUser(userData) {

    try {

        const {
            fullName,
            email,
            password
        } = userData;

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        // Actualizar nombre usuario
        await updateProfile(userCredential.user, {
            displayName: fullName
        });

        return {
            success: true,
            user: userCredential.user
        };

    } catch (error) {

        console.error("Register Error:", error);

        return {
            success: false,
            error: getFirebaseAuthError(error.code)
        };
    }
}

/* Iniciar sesión */
export async function loginUser(email, password) {

    try {

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        return {
            success: true,
            user: userCredential.user
        };

    } catch (error) {

        console.error("Login Error:", error);

        return {
            success: false,
            error: getFirebaseAuthError(error.code)
        };
    }
}

/* Cerrar sesión */
export async function logoutUser() {

    try {

        await signOut(auth);

        return {
            success: true
        };

    } catch (error) {

        console.error("Logout Error:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* Verificar sesión activa */
export function checkAuth(callback) {

    onAuthStateChanged(auth, (user) => {

        callback(user);
    });
}

/* Proteger vistas privadas */
export function protectRoute() {

    checkAuth((user) => {

        if (!user) {

            window.location.href = "../login.html";
        }
    });
}

/* Redireccionar si ya inició sesión */
export function redirectIfAuthenticated() {

    checkAuth((user) => {

        if (user) {

            window.location.href = "dashboard.html";
        }
    });
}

/* Obtener usuario actual */
export function getCurrentUser() {

    return auth.currentUser;
}

/* Traducir errores Firebase Auth */
function getFirebaseAuthError(errorCode) {

    const errors = {

        "auth/email-already-in-use":
            "El correo ya está registrado",

        "auth/invalid-email":
            "Correo electrónico inválido",

        "auth/weak-password":
            "La contraseña debe tener al menos 6 caracteres",

        "auth/user-not-found":
            "Usuario no encontrado",

        "auth/wrong-password":
            "Contraseña incorrecta",

        "auth/invalid-credential":
            "Credenciales inválidas",

        "auth/too-many-requests":
            "Demasiados intentos. Intenta más tarde"
    };

    return errors[errorCode] || "Ocurrió un error inesperado";
}