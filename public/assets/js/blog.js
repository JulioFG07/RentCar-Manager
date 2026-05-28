import { checkAuth, logoutUser } from './auth.js';
import { getDocuments, COLLECTIONS } from './firestore.js';

let currentUser = null;
let currentUserName = null;

// 1. Escuchar cuando el navbar dinámico esté listo en el DOM
document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer');
    const navUserName     = navbarContainer?.querySelector('#navUserName');
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn');

    // Colocar el nombre si ya se obtuvo de Firebase
    if (navUserName && currentUserName) {
        navUserName.textContent = currentUserName;
    }

    // Darle vida al botón de cerrar sesión
    logoutBtn?.addEventListener('click', async () => {
        await logoutUser();
        window.location.href = './login.html';
    });
});

// 2. Proteger la ruta y obtener los datos del usuario
checkAuth(async (user) => {
    // Si no hay sesión, expulsar al login
    if (!user) {
        window.location.href = './login.html';
        return;
    }
    
    currentUser = user;

    try {
        // Consultar el nombre real del usuario en Firestore
        const usersRes = await getDocuments(COLLECTIONS.USERS);
        if (usersRes.success) {
            const userData = usersRes.data.find(u => u.uid === user.uid);
            currentUserName = userData?.name || user.displayName || user.email?.split('@')[0] || 'Cliente';

            // Si el navbar ya cargó, actualizamos el nombre inmediatamente
            const navUserName = document.getElementById('navUserName');
            if (navUserName) {
                navUserName.textContent = currentUserName;
            }
        }
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
    }
});