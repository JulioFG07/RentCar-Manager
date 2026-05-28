import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, createDocument, updateDocument, deleteDocument, COLLECTIONS } from './firestore.js'
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js'
import { isEmpty, setFieldError, clearFieldError } from './validators.js'

// ── DOM ──
const searchInput    = document.getElementById('searchInput')
const loadingState   = document.getElementById('loadingState')
const emptyState     = document.getElementById('emptyState')
const categoriesGrid = document.getElementById('categoriesGrid')

// Modal crear
const createForm = document.getElementById('createCategoryForm')
const createName = document.getElementById('createName')
const createDesc = document.getElementById('createDescription')
const createBtn  = document.getElementById('createCategoryBtn')

// Modal editar
const editForm   = document.getElementById('editCategoryForm')
const editId     = document.getElementById('editCategoryId')
const editName   = document.getElementById('editName')
const editDesc   = document.getElementById('editDescription')
const editActive = document.getElementById('editActive')
const saveBtn    = document.getElementById('saveCategoryBtn')

const createModalEl = document.getElementById('createCategoryModal')
const editModalEl   = document.getElementById('editCategoryModal')
const createModal   = createModalEl ? bootstrap.Modal.getOrCreateInstance(createModalEl) : null
const editModal     = editModalEl   ? bootstrap.Modal.getOrCreateInstance(editModalEl)   : null

let allCategories = []
let currentUser   = null

// ── Proteger ruta ──
checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return }
    currentUser = user

    // Obtener nombre real desde Firestore y mostrarlo en el navbar
    const usersRes = await getDocuments(COLLECTIONS.USERS)
    const userData = usersRes.success ? usersRes.data.find(u => u.uid === user.uid) : null
    const nombre   = userData?.name || user.displayName || user.email?.split('@')[0] || 'Admin'
    window.setNavbarUser(nombre)

    await loadCategories()
})

// ── Navbar: solo manejar logout ──
document.addEventListener('navbarLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logoutUser()
            window.location.href = '../login.html'
        })
    }
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
        renderGrid(allCategories)
    } catch (err) {
        showAlert('categoriesAlert', 'Error inesperado')
        loadingState.classList.add('d-none')
        console.error(err)
    }
}

/* ======================================================
   HELPERS — ícono y color por nombre de categoría
====================================================== */

const iconMap = {
    'deportivo':     { icon: 'bi-speedometer2',     color: 'icon-red'    },
    'pickup':        { icon: 'bi-truck',             color: 'icon-amber'  },
    'eléctrico':     { icon: 'bi-lightning-charge',  color: 'icon-teal'   },
    'electrico':     { icon: 'bi-lightning-charge',  color: 'icon-teal'   },
    'todoterreno':   { icon: 'bi-map',               color: 'icon-green'  },
    'sedán':         { icon: 'bi-car-front',         color: 'icon-blue'   },
    'sedan':         { icon: 'bi-car-front',         color: 'icon-blue'   },
    'minivan':       { icon: 'bi-people-fill',       color: 'icon-purple' },
    'suv':           { icon: 'bi-car-front-fill',    color: 'icon-indigo' },
    'híbrido':       { icon: 'bi-leaf',              color: 'icon-green'  },
    'hibrido':       { icon: 'bi-leaf',              color: 'icon-green'  },
    'compacto':      { icon: 'bi-box',               color: 'icon-pink'   },
    'luxury':        { icon: 'bi-gem',               color: 'icon-amber'  },
    'lujo':          { icon: 'bi-gem',               color: 'icon-amber'  },
    'hatchback':     { icon: 'bi-car-front',         color: 'icon-blue'   },
    'coupé':         { icon: 'bi-award',             color: 'icon-red'    },
    'coupe':         { icon: 'bi-award',             color: 'icon-red'    },
}

const colorPalette = [
    'icon-blue', 'icon-green', 'icon-amber', 'icon-purple',
    'icon-pink',  'icon-teal',  'icon-red',   'icon-indigo'
]

const getCategoryStyle = (name, index) => {
    if (!name) return {
        icon:  'bi-tag-fill',
        color: colorPalette[index % colorPalette.length]
    }
    const key = name.toLowerCase().trim()
    if (iconMap[key]) return iconMap[key]
    return {
        icon:  'bi-tag-fill',
        color: colorPalette[index % colorPalette.length]
    }
}

/* ======================================================
   RENDER — GRID DE TARJETAS
====================================================== */

const renderGrid = (categories) => {
    if (categories.length === 0) {
        categoriesGrid.classList.add('d-none')
        emptyState.classList.remove('d-none')
        return
    }

    emptyState.classList.add('d-none')
    categoriesGrid.classList.remove('d-none')

    categoriesGrid.innerHTML = categories.map((c, index) => {

        const isActive        = c.active !== false
        const { icon, color } = getCategoryStyle(c.name, index)

        const statusBadge = isActive
            ? `<span class="badge bg-success">Activa</span>`
            : `<span class="badge bg-secondary">Inactiva</span>`

        const toggleBtn = isActive
            ? `<button
                class="btn btn-outline-warning btn-sm flex-grow-1"
                onclick="toggleCategory('${c.id}', true)"
                title="Desactivar"
               >
                   <i class="bi bi-pause-circle me-1"></i>Desactivar
               </button>`
            : `<button
                class="btn btn-outline-success btn-sm flex-grow-1"
                onclick="toggleCategory('${c.id}', false)"
                title="Activar"
               >
                   <i class="bi bi-play-circle me-1"></i>Activar
               </button>`

        return `
            <div class="col-sm-6 col-md-4 col-lg-3">
                <div class="card category-card h-100 shadow-sm ${isActive ? '' : 'inactive'}">

                    <div class="category-icon-wrap ${color}">
                        <i class="bi ${icon}"></i>
                    </div>

                    <div class="card-body pt-0 pb-2 px-3 d-flex flex-column gap-1">
                        <div class="d-flex align-items-center justify-content-between gap-2">
                            <h6 class="fw-bold mb-0">${c.name}</h6>
                            ${statusBadge}
                        </div>
                        <p class="text-secondary small mb-0" style="min-height:2.4em;line-height:1.4">
                            ${c.description || '<span class="fst-italic text-muted">Sin descripción</span>'}
                        </p>
                    </div>

                    <div class="card-actions">
                        <button
                            class="btn btn-outline-primary btn-sm flex-grow-1"
                            onclick="openEditCategory('${c.id}')"
                            title="Editar"
                        >
                            <i class="bi bi-pencil me-1"></i>Editar
                        </button>
                        ${toggleBtn}
                        <button
                            class="btn btn-outline-danger btn-sm"
                            onclick="deleteCategory('${c.id}', '${c.name}')"
                            title="Eliminar"
                        >
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>

                </div>
            </div>
        `
    }).join('')
}

// ── Buscador ──
searchInput?.addEventListener('input', () => {
    const filter = searchInput.value.toLowerCase().trim()
    const filtered = allCategories.filter(c =>
        (c.name || '').toLowerCase().includes(filter) ||
        (c.description || '').toLowerCase().includes(filter)
    )
    renderGrid(filtered)
})

// ── Validar ──
const validateForm = (nameEl, id = '') => {
    let valid = true
    clearFieldError(nameEl)
    if (isEmpty(nameEl.value) || nameEl.value.trim().length < 2) {
        setFieldError(nameEl, 'El nombre debe tener al menos 2 caracteres')
        valid = false
    }
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
    editId.value       = c.id
    editName.value     = c.name        || ''
    editDesc.value     = c.description || ''
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

// ── Activar / desactivar ──
window.toggleCategory = async (id, currentActive) => {
    const accion = currentActive ? 'desactivar' : 'activar'
    if (!confirm(`¿Deseas ${accion} esta categoría?`)) return
    try {
        await updateDocument(COLLECTIONS.VEHICLE_CATEGORIES, id, { active: !currentActive })
        allCategories = allCategories.map(c =>
            c.id === id ? { ...c, active: !currentActive } : c
        )
        renderGrid(allCategories)
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
        renderGrid(allCategories)
        showToast(`"${nombre}" eliminada`, 'success')
    } catch (err) {
        showToast('Error inesperado', 'danger')
    }
}