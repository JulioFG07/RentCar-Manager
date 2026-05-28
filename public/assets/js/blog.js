import { checkAuth, logoutUser } from './auth.js';
import { getDocuments, COLLECTIONS } from './firestore.js';

let currentUserName = null;

document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer');
    const navUserName     = navbarContainer?.querySelector('#navUserName');
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn');

    if (navUserName && currentUserName) {
        navUserName.textContent = currentUserName;
    }

    logoutBtn?.addEventListener('click', async () => {
        await logoutUser();
        window.location.href = './login.html';
    });

    const activeLink = document.querySelector('[data-page="blog"]');
    if (activeLink) activeLink.classList.add('active', 'fw-semibold');
});

checkAuth(async (user) => {

    if (!user) {
        window.location.href = './login.html';
        return;
    }

    try {
        const usersRes = await getDocuments(COLLECTIONS.USERS);
        if (usersRes.success) {
            const userData = usersRes.data.find(u => u.uid === user.uid);
            
            currentUserName = userData?.name || user.displayName || user.email?.split('@')[0] || 'Cliente';

            const navUserName = document.getElementById('navUserName');
            if (navUserName) {
                navUserName.textContent = currentUserName;
            }
        }
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
});