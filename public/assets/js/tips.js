import { checkAuth, logoutUser } from './auth.js';
import { getDocuments, createDocument, updateDocument, deleteDocument, COLLECTIONS } from './firestore.js';
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js';

const TIPS_COLLECTION = 'tips'; // Referencia directa a la colección
const tipsGrid = document.getElementById('tipsGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const tipForm = document.getElementById('tipForm');
const saveBtn = document.getElementById('saveTipBtn');
const tipModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('tipModal'));

let allTips = [];

checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return; }
    
    const usersRes = await getDocuments(COLLECTIONS.USERS);
    const userData = usersRes.success ? usersRes.data.find(u => u.uid === user.uid) : null;
    
    // Verificación estricta de administrador
    if (userData?.role !== 'admin') {
        window.location.href = '../dashboard.html';
        return;
    }
    
    const nombre = userData?.name || user.displayName || user.email?.split('@')[0] || 'Admin';
    window.setNavbarUser(nombre);
    
    await loadTips();
});

document.addEventListener('navbarLoaded', () => {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await logoutUser();
        window.location.href = '../login.html';
    });
});

const loadTips = async () => {
    loadingState.classList.remove('d-none');
    try {
        const result = await getDocuments(TIPS_COLLECTION);
        if (!result.success) throw new Error('Error al cargar la base de datos');
        
        allTips = result.data;
        renderGrid();
    } catch (error) {
        showAlert('tipsAlert', 'Ocurrió un error al cargar los artículos.');
    } finally {
        loadingState.classList.add('d-none');
    }
};

const renderGrid = () => {
    if (allTips.length === 0) {
        tipsGrid.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');
    tipsGrid.classList.remove('d-none');

    tipsGrid.innerHTML = allTips.map(tip => `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100 p-3" style="background-color: var(--bs-body-bg);">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="bg-${tip.color} bg-opacity-10 text-${tip.color} rounded-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; font-size: 1.5rem;">
                <i class="bi ${tip.icon}"></i>
              </div>
              <div class="text-end">
                  <span class="badge bg-light text-secondary border d-block mb-1">${tip.tag}</span>
                  <span class="badge bg-secondary bg-opacity-25 text-body">${tip.type === 'renta' ? 'Tip de Renta' : 'Tip de Viaje'}</span>
              </div>
            </div>
            <h5 class="fw-bold mb-2">${tip.title}</h5>
            <p class="text-secondary small mb-4 flex-grow-1">${tip.description}</p>
            
            <div class="mt-auto pt-3 border-top d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="editTip('${tip.id}')">
                <i class="bi bi-pencil me-1"></i> Editar
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="removeTip('${tip.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
    `).join('');
};

document.getElementById('btnNewTip').addEventListener('click', () => {
    tipForm.reset();
    document.getElementById('tipId').value = '';
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-plus-circle me-2 text-primary"></i>Nuevo Tip';
});

tipForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('tipsAlert');
    
    const id = document.getElementById('tipId').value;
    const tipData = {
        type: document.getElementById('tipType').value,
        tag: document.getElementById('tipTag').value.trim(),
        color: document.getElementById('tipColor').value,
        icon: document.getElementById('tipIcon').value.trim(),
        title: document.getElementById('tipTitle').value.trim(),
        description: document.getElementById('tipDescription').value.trim(),
        url: document.getElementById('tipUrl').value.trim(),
        active: true
    };

    try {
        showButtonLoader(saveBtn, 'Guardando...');
        if (id) {
            await updateDocument(TIPS_COLLECTION, id, tipData);
            showToast('Artículo actualizado correctamente', 'success');
        } else {
            await createDocument(TIPS_COLLECTION, tipData);
            showToast('Artículo creado correctamente', 'success');
        }
        tipModal.hide();
        await loadTips();
    } catch (error) {
        showToast('Error al guardar el artículo', 'danger');
    } finally {
        hideButtonLoader(saveBtn);
    }
});

window.editTip = (id) => {
    const tip = allTips.find(t => t.id === id);
    if (!tip) return;
    
    document.getElementById('tipId').value = tip.id;
    document.getElementById('tipType').value = tip.type;
    document.getElementById('tipTag').value = tip.tag;
    document.getElementById('tipColor').value = tip.color;
    document.getElementById('tipIcon').value = tip.icon;
    document.getElementById('tipTitle').value = tip.title;
    document.getElementById('tipDescription').value = tip.description;
    document.getElementById('tipUrl').value = tip.url;
    
    document.getElementById('modalTitle').innerHTML = '<i class="bi bi-pencil-square me-2 text-primary"></i>Editar Tip';
    tipModal.show();
};

window.removeTip = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este artículo permanentemente?')) return;
    try {
        await deleteDocument(TIPS_COLLECTION, id);
        showToast('Artículo eliminado', 'success');
        await loadTips();
    } catch (error) {
        showToast('Error al eliminar', 'danger');
    }
};