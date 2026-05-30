import { checkAuth, logoutUser } from './auth.js';
import { getDocuments, COLLECTIONS } from './firestore.js';

const TIPS_COLLECTION = 'tips';

document.addEventListener('navbarLoaded', () => {
    const navbarContainer = document.getElementById('navbarContainer');
    const logoutBtn       = navbarContainer?.querySelector('#logoutBtn');
    
    // Resaltar en el menú superior
    const activeLink = document.querySelector('[data-page="blog"]');
    if (activeLink) activeLink.classList.add('active', 'fw-semibold');

    logoutBtn?.addEventListener('click', async () => {
        await logoutUser();
        window.location.href = './login.html';
    });
});

checkAuth(async (user) => {
    if (!user) { window.location.href = './login.html'; return; }

    try {
        const usersRes = await getDocuments(COLLECTIONS.USERS);
        if (usersRes.success) {
            const userData = usersRes.data.find(u => u.uid === user.uid);
            const currentUserName = userData?.name || user.displayName || user.email?.split('@')[0] || 'Cliente';
            
            const navUserName = document.getElementById('navUserName');
            if (navUserName) navUserName.textContent = currentUserName;
        }

        // Descargar e inyectar tips dinámicamente
        const tipsRes = await getDocuments(TIPS_COLLECTION);
        if (tipsRes.success) {
            renderTips(tipsRes.data.filter(t => t.active !== false));
        } else {
            renderTips([]);
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        renderTips([]);
    }
});

function renderTips(tips) {
    const travelTips = tips.filter(t => t.type === 'viaje');

    const renderCard = (tip) => `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100 blog-card p-2">
            <div class="card-body d-flex flex-column">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <div class="blog-icon-wrap bg-${tip.color} bg-opacity-10 text-${tip.color}">
                  <i class="bi ${tip.icon}"></i>
                </div>
                <span class="badge bg-light text-secondary border">${tip.tag}</span>
              </div>
              <h5 class="fw-bold mb-2">${tip.title}</h5>
              <p class="text-secondary small mb-4 flex-grow-1">${tip.description}</p>
              <div class="mt-auto">
                <a href="${tip.url}" target="_blank" class="btn btn-outline-${tip.color} w-100 fw-semibold btn-sm">
                  Abrir Enlace <i class="bi bi-box-arrow-up-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
    `;

    document.getElementById('tipsViajeGrid').innerHTML = travelTips.length > 0 
        ? travelTips.map(renderCard).join('') 
        : '<div class="col-12 text-center text-muted py-4"><i class="bi bi-inbox fs-2"></i><p class="mt-2">No hay tips de viaje registrados.</p></div>';
}