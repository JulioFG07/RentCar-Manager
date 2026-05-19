import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, createDocument, updateDocument, deleteDocument, COLLECTIONS } from './firestore.js'
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js'
import { isEmpty, isValidYear, isValidPrice, setFieldError, clearFieldError } from './validators.js'

// ── DOM ──
const navUserName      = document.getElementById('navUserName')
const logoutBtn        = document.getElementById('logoutBtn')
const searchInput      = document.getElementById('searchInput')
const filterStatus     = document.getElementById('filterStatus')
const loadingState     = document.getElementById('loadingState')
const emptyState       = document.getElementById('emptyState')
const tableContainer   = document.getElementById('tableContainer')
const vehiclesBody     = document.getElementById('vehiclesBody')

// Modal crear
const createForm       = document.getElementById('createVehicleForm')
const createBrand      = document.getElementById('createBrand')
const createModel      = document.getElementById('createModel')
const createYear       = document.getElementById('createYear')
const createPlate      = document.getElementById('createPlate')
const createCategory   = document.getElementById('createCategory')
const createPrice      = document.getElementById('createDailyPrice')
const createBtn        = document.getElementById('createVehicleBtn')

// Modal editar
const editForm         = document.getElementById('editVehicleForm')
const editId           = document.getElementById('editVehicleId')
const editBrand        = document.getElementById('editBrand')
const editModel        = document.getElementById('editModel')
const editYear         = document.getElementById('editYear')
const editPlate        = document.getElementById('editPlate')
const editCategory     = document.getElementById('editCategory')
const editPrice        = document.getElementById('editDailyPrice')
const editStatus       = document.getElementById('editStatus')
const saveBtn          = document.getElementById('saveVehicleBtn')

const createModalEl    = document.getElementById('createVehicleModal')
const editModalEl      = document.getElementById('editVehicleModal')
const createModal      = createModalEl ? bootstrap.Modal.getOrCreateInstance(createModalEl) : null
const editModal        = editModalEl   ? bootstrap.Modal.getOrCreateInstance(editModalEl)   : null

let allVehicles = []
let categories  = []

// ── Proteger ruta ──
checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return }
    navUserName.textContent = user.displayName || user.email
    await Promise.all([loadCategories(), loadVehicles()])
})

// ── Cargar categorías para los selects ──
const loadCategories = async () => {
    const result = await getDocuments(COLLECTIONS.VEHICLE_CATEGORIES)
    if (!result.success) return
    categories = result.data.filter(c => c.active !== false)
    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    if (createCategory) createCategory.innerHTML = `<option value="">Seleccionar categoría</option>${options}`
    if (editCategory)   editCategory.innerHTML   = `<option value="">Seleccionar categoría</option>${options}`
}

// ── Cargar vehículos ──
const loadVehicles = async () => {
    try {
        const result = await getDocuments(COLLECTIONS.VEHICLES)
        if (!result.success) {
            showAlert('vehiclesAlert', 'Error al cargar los vehículos')
            loadingState.classList.add('d-none')
            return
        }
        allVehicles = result.data
        loadingState.classList.add('d-none')
        renderTable(allVehicles)
    } catch (err) {
        showAlert('vehiclesAlert', 'Ocurrió un error inesperado')
        loadingState.classList.add('d-none')
        console.error(err)
    }
}

// ── Renderizar tabla ──
const statusBadge = (status) => {
    const map = {
        available:   ['success', 'Disponible'],
        rented:      ['primary', 'Rentado'],
        maintenance: ['warning', 'Mantenimiento'],
        inactive:    ['secondary', 'Inactivo']
    }
    const [color, label] = map[status] || ['secondary', status]
    return `<span class="badge bg-${color}">${label}</span>`
}

const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id)
    return cat ? cat.name : '<span class="text-muted fst-italic small">Sin categoría</span>'
}

const renderTable = (vehicles) => {
    if (vehicles.length === 0) {
        tableContainer.classList.add('d-none')
        emptyState.classList.remove('d-none')
        return
    }
    emptyState.classList.add('d-none')
    tableContainer.classList.remove('d-none')
    vehiclesBody.innerHTML = vehicles.map(v => `
        <tr>
            <td class="ps-4 fw-semibold">${v.brand} ${v.model}</td>
            <td class="text-secondary">${v.year}</td>
            <td>${v.plate}</td>
            <td>${getCategoryName(v.categoryId)}</td>
            <td>$${Number(v.dailyPrice).toFixed(2)}</td>
            <td>${statusBadge(v.status)}</td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-primary btn-sm" onclick="openEditVehicle('${v.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteVehicle('${v.id}', '${v.brand} ${v.model}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('')
}

// ── Buscador + filtro ──
const applyFilters = () => {
    const search = searchInput?.value.toLowerCase().trim() || ''
    const status = filterStatus?.value || ''
    const filtered = allVehicles.filter(v => {
        const matchSearch = `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search)
        const matchStatus = !status || v.status === status
        return matchSearch && matchStatus
    })
    renderTable(filtered)
}
searchInput?.addEventListener('input', applyFilters)
filterStatus?.addEventListener('change', applyFilters)

// ── Validar formulario ──
const isValidPlate = (plate) => {
    return plate && plate.length >= 5 && plate.length <= 10 && /^[A-Z0-9-]+$/.test(plate.toUpperCase())
}

const validateVehicleForm = (brand, model, year, plate, categoryId, price) => {
    let valid = true
    const fields = [
        [brand,      'La marca es obligatoria', !isEmpty(brand.value)],
        [model,      'El modelo es obligatorio', !isEmpty(model.value)],
        [year,       'Año inválido (1900 - año actual)', isValidYear(year.value)],
        [plate,      'Placa inválida (5-10 caracteres alfanuméricos)', isValidPlate(plate.value)],
        [categoryId, 'Selecciona una categoría', !isEmpty(categoryId.value)],
        [price,      'El precio debe ser mayor a 0', isValidPrice(price.value)]
    ]
    fields.forEach(([el, msg, ok]) => {
        if (!el) return
        clearFieldError(el)
        if (!ok) { setFieldError(el, msg); valid = false }
    })
    return valid
}

// ── Crear vehículo ──
createForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideAlert('createAlert')

    const ok = validateVehicleForm(createBrand, createModel, createYear, createPlate, createCategory, createPrice)
    if (!ok) return

    try {
        showButtonLoader(createBtn, 'Guardando...')
        const result = await createDocument(COLLECTIONS.VEHICLES, {
            brand:      createBrand.value.trim(),
            model:      createModel.value.trim(),
            year:       Number(createYear.value),
            plate:      createPlate.value.trim().toUpperCase(),
            categoryId: createCategory.value,
            dailyPrice: Number(createPrice.value),
            status:     'available'
        })
        if (!result.success) { showAlert('createAlert', 'No se pudo guardar el vehículo'); return }
        showToast('Vehículo registrado correctamente', 'success')
        createForm.reset()
        createModal?.hide()
        await loadVehicles()
    } catch (err) {
        showAlert('createAlert', 'Ocurrió un error inesperado')
        console.error(err)
    } finally {
        hideButtonLoader(createBtn)
    }
})

// ── Abrir modal editar ──
window.openEditVehicle = (id) => {
    const v = allVehicles.find(x => x.id === id)
    if (!v) return
    hideAlert('editAlert')
    editId.value            = v.id
    editBrand.value         = v.brand       || ''
    editModel.value         = v.model       || ''
    editYear.value          = v.year        || ''
    editPlate.value         = v.plate       || ''
    editPrice.value         = v.dailyPrice  || ''
    editStatus.value        = v.status      || 'available'
    if (editCategory) editCategory.value = v.categoryId || ''
    editModal?.show()
}

// ── Guardar edición ──
editForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideAlert('editAlert')

    const ok = validateVehicleForm(editBrand, editModel, editYear, editPlate, editCategory, editPrice)
    if (!ok) return

    try {
        showButtonLoader(saveBtn, 'Guardando...')
        const result = await updateDocument(COLLECTIONS.VEHICLES, editId.value, {
            brand:      editBrand.value.trim(),
            model:      editModel.value.trim(),
            year:       Number(editYear.value),
            plate:      editPlate.value.trim().toUpperCase(),
            categoryId: editCategory.value,
            dailyPrice: Number(editPrice.value),
            status:     editStatus.value
        })
        if (!result.success) { showAlert('editAlert', 'No se pudo actualizar'); return }
        showToast('Vehículo actualizado', 'success')
        editModal?.hide()
        await loadVehicles()
    } catch (err) {
        showAlert('editAlert', 'Ocurrió un error inesperado')
        console.error(err)
    } finally {
        hideButtonLoader(saveBtn)
    }
})

// ── Eliminar ──
window.deleteVehicle = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?\nEsta acción no se puede deshacer.`)) return
    try {
        const result = await deleteDocument(COLLECTIONS.VEHICLES, id)
        if (!result.success) { showToast('No se pudo eliminar', 'danger'); return }
        allVehicles = allVehicles.filter(v => v.id !== id)
        renderTable(allVehicles)
        showToast(`"${nombre}" eliminado`, 'success')
    } catch (err) {
        showToast('Error inesperado', 'danger')
        console.error(err)
    }
}

// ── Logout ──
logoutBtn?.addEventListener('click', async () => {
    await logoutUser()
    window.location.href = '../login.html'
})
