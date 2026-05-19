import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, createDocument, updateDocument, deleteDocument, COLLECTIONS } from './firestore.js'
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js'
import { isEmpty, setFieldError, clearFieldError } from './validators.js'

// ── DOM ──
const navUserName   = document.getElementById('navUserName')
const logoutBtn     = document.getElementById('logoutBtn')
const searchInput   = document.getElementById('searchInput')
const loadingState  = document.getElementById('loadingState')
const emptyState    = document.getElementById('emptyState')
const tableContainer= document.getElementById('tableContainer')
const categoriesBody= document.getElementById('categoriesBody')

// Modal crear
const createForm    = document.getElementById('createCategoryForm')
const createName    = document.getElementById('createName')
const createDesc    = document.getElementById('createDescription')
const createBtn     = document.getElementById('createCategoryBtn')

// Modal editar
const editForm      = document.getElementById('editCategoryForm')
const editId        = document.getElementById('editCategoryId')
const editName      = document.getElementById('editName')
const editDesc      = document.getElementById('editDescription')
const editActive    = document.getElementById('editActive')
const saveBtn       = document.getElementById('saveCategoryBtn')

const createModalEl = document.getElementById('createCategoryModal')
const editModalEl   = document.getElementById('editCategoryModal')
const createModal   = createModalEl ? bootstrap.Modal.getOrCreateInstance(createModalEl) : null
const editModal     = editModalEl   ? bootstrap.Modal.getOrCreateInstance(editModalEl)   : null

let allCategories = []

// ── Proteger ruta ──
checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return }
    navUserName.textContent = user.displayName || user.email
    await loadCategories()
})

// ── Cargar ──
const loadCategories = async () => {
    try {
        const result = await getDocuments(COLLECTIONS.VEHICLE_CATEGORIES)
        if (!result.success) {
            showAlert('categoriesAlert', 'Error al cargar las categorías')
            loadingState.classList.add('d-none')
            return
        }
        allCategories = result.data
        loadingState.classList.add('d-none')
        renderTable(allCategories)
    } catch (err) {
        showAlert('categoriesAlert', 'Error inesperado')
        loadingState.classList.add('d-none')
        console.error(err)
    }
}

// ── Renderizar ──
const renderTable = (categories) => {
    if (categories.length === 0) {
        tableContainer.classList.add('d-none')
        emptyState.classList.remove('d-none')
        return
    }
    emptyState.classList.add('d-none')
    tableContainer.classList.remove('d-none')
    categoriesBody.innerHTML = categories.map(c => `
        <tr>
            <td class="ps-4 fw-semibold">${c.name}</td>
            <td class="text-secondary">${c.description || '<span class="text-muted fst-italic small">Sin descripción</span>'}</td>
            <td>
                <span class="badge bg-${c.active !== false ? 'success' : 'secondary'}">
                    ${c.active !== false ? 'Activa' : 'Inactiva'}
                </span>
            </td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-primary btn-sm" onclick="openEditCategory('${c.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-${c.active !== false ? 'warning' : 'success'} btn-sm"
                        onclick="toggleCategory('${c.id}', ${c.active !== false})"
                        title="${c.active !== false ? 'Desactivar' : 'Activar'}">
                        <i class="bi bi-${c.active !== false ? 'pause-circle' : 'play-circle'}"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteCategory('${c.id}', '${c.name}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('')
}

// ── Buscador ──
searchInput?.addEventListener('input', () => {
    const filter = searchInput.value.toLowerCase().trim()
    const filtered = allCategories.filter(c =>
        c.name.toLowerCase().includes(filter) ||
        (c.description || '').toLowerCase().includes(filter)
    )
    renderTable(filtered)
})

// ── Validar ──
const validateForm = (nameEl, id = '') => {
    let valid = true
    clearFieldError(nameEl)
    if (isEmpty(nameEl.value) || nameEl.value.trim().length < 2) {
        setFieldError(nameEl, 'El nombre debe tener al menos 2 caracteres')
        valid = false
    }
    // Verificar duplicados
    const dup = allCategories.find(c =>
        c.name.toLowerCase() === nameEl.value.trim().toLowerCase() && c.id !== id
    )
    if (dup) {
        setFieldError(nameEl, 'Ya existe una categoría con ese nombre')
        valid = false
    }
    return valid
}

// ── Crear ──
createForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideAlert('createAlert')
    if (!validateForm(createName)) return
    try {
        showButtonLoader(createBtn, 'Guardando...')
        const result = await createDocument(COLLECTIONS.VEHICLE_CATEGORIES, {
            name:        createName.value.trim(),
            description: createDesc.value.trim() || null,
            active:      true
        })
        if (!result.success) { showAlert('createAlert', 'No se pudo guardar'); return }
        showToast('Categoría creada correctamente', 'success')
        createForm.reset()
        createModal?.hide()
        await loadCategories()
    } catch (err) {
        showAlert('createAlert', 'Error inesperado')
        console.error(err)
    } finally {
        hideButtonLoader(createBtn)
    }
})

// ── Abrir editar ──
window.openEditCategory = (id) => {
    const c = allCategories.find(x => x.id === id)
    if (!c) return
    hideAlert('editAlert')
    editId.value    = c.id
    editName.value  = c.name        || ''
    editDesc.value  = c.description || ''
    editActive.checked = c.active !== false
    editModal?.show()
}

// ── Guardar edición ──
editForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideAlert('editAlert')
    if (!validateForm(editName, editId.value)) return
    try {
        showButtonLoader(saveBtn, 'Guardando...')
        const result = await updateDocument(COLLECTIONS.VEHICLE_CATEGORIES, editId.value, {
            name:        editName.value.trim(),
            description: editDesc.value.trim() || null,
            active:      editActive.checked
        })
        if (!result.success) { showAlert('editAlert', 'No se pudo actualizar'); return }
        showToast('Categoría actualizada', 'success')
        editModal?.hide()
        await loadCategories()
    } catch (err) {
        showAlert('editAlert', 'Error inesperado')
        console.error(err)
    } finally {
        hideButtonLoader(saveBtn)
    }
})

// ── Activar/desactivar ──
window.toggleCategory = async (id, currentActive) => {
    const accion = currentActive ? 'desactivar' : 'activar'
    if (!confirm(`¿Deseas ${accion} esta categoría?`)) return
    try {
        await updateDocument(COLLECTIONS.VEHICLE_CATEGORIES, id, { active: !currentActive })
        allCategories = allCategories.map(c => c.id === id ? { ...c, active: !currentActive } : c)
        renderTable(allCategories)
        showToast(`Categoría ${currentActive ? 'desactivada' : 'activada'}`, 'success')
    } catch (err) {
        showToast('Error al cambiar estado', 'danger')
    }
}

// ── Eliminar ──
window.deleteCategory = async (id, nombre) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?\nLos vehículos asociados quedarán sin categoría.`)) return
    try {
        const result = await deleteDocument(COLLECTIONS.VEHICLE_CATEGORIES, id)
        if (!result.success) { showToast('No se pudo eliminar', 'danger'); return }
        allCategories = allCategories.filter(c => c.id !== id)
        renderTable(allCategories)
        showToast(`"${nombre}" eliminada`, 'success')
    } catch (err) {
        showToast('Error inesperado', 'danger')
    }
}

// ── Logout ──
logoutBtn?.addEventListener('click', async () => {
    await logoutUser()
    window.location.href = '../login.html'
})
