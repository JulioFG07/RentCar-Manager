import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, getDocumentById, getDocumentFromServer, createDocument, updateDocument, deleteDocument, COLLECTIONS } from './firestore.js'
import { uploadVehicleImage, deleteVehicleImage } from './storage.js'
import { showToast, showButtonLoader, hideButtonLoader, showAlert, hideAlert } from './ui.js'
import { isEmpty, isValidYear, isValidPrice, setFieldError, clearFieldError } from './validators.js'

// ── DOM ──
const searchInput    = document.getElementById('searchInput')
const filterStatus   = document.getElementById('filterStatus')
const loadingState   = document.getElementById('loadingState')
const emptyState     = document.getElementById('emptyState')
const vehiclesGrid   = document.getElementById('vehiclesGrid')

// Modal crear
const createForm        = document.getElementById('createVehicleForm')
const createBrand       = document.getElementById('createBrand')
const createModel       = document.getElementById('createModel')
const createYear        = document.getElementById('createYear')
const createPlate       = document.getElementById('createPlate')
const createCategory    = document.getElementById('createCategory')
const createPrice       = document.getElementById('createDailyPrice')
const createBtn         = document.getElementById('createVehicleBtn')
const createImageInput  = document.getElementById('createImage')
const createPreviewEl   = document.getElementById('createImagePreview')
const createPreviewImg  = createPreviewEl?.querySelector('img')
const createDropZone    = document.getElementById('createDropZone')
const createRemoveBtn   = document.getElementById('createRemoveImg')

// Campos extra
const createTransmission = document.getElementById('createTransmission')
const createFuel         = document.getElementById('createFuel')
const createPassengers   = document.getElementById('createPassengers')
const createInsurance    = document.getElementById('createInsurance')
const createFuelPolicy   = document.getElementById('createFuelPolicy')
const createLargeBags    = document.getElementById('createLargeBags')
const createSmallBags    = document.getElementById('createSmallBags')

// Modal editar
const editForm          = document.getElementById('editVehicleForm')
const editId            = document.getElementById('editVehicleId')
const editBrand         = document.getElementById('editBrand')
const editModel         = document.getElementById('editModel')
const editYear          = document.getElementById('editYear')
const editPlate         = document.getElementById('editPlate')
const editCategory      = document.getElementById('editCategory')
const editPrice         = document.getElementById('editDailyPrice')
const editStatus        = document.getElementById('editStatus')
const saveBtn           = document.getElementById('saveVehicleBtn')
const editImageInput    = document.getElementById('editImage')
const editCurrentImg    = document.getElementById('editCurrentImg')
const editCurrentImgEl  = document.getElementById('editCurrentImgEl')
const editRemoveBtn     = document.getElementById('editRemoveImg')
const editPreviewEl     = document.getElementById('editImagePreview')
const editPreviewImg    = editPreviewEl?.querySelector('img')
const editCancelNewBtn  = document.getElementById('editCancelNewImg')
const editDropZone      = document.getElementById('editDropZone')
// Campos extra (compañero)
const editTransmission  = document.getElementById('editTransmission')
const editFuel          = document.getElementById('editFuel')
const editPassengers    = document.getElementById('editPassengers')
const editInsurance     = document.getElementById('editInsurance')
const editFuelPolicy    = document.getElementById('editFuelPolicy')
const editLargeBags     = document.getElementById('editLargeBags')
const editSmallBags     = document.getElementById('editSmallBags')

const createModalEl = document.getElementById('createVehicleModal')
const editModalEl   = document.getElementById('editVehicleModal')
const createModal   = createModalEl ? bootstrap.Modal.getOrCreateInstance(createModalEl) : null
const editModal     = editModalEl   ? bootstrap.Modal.getOrCreateInstance(editModalEl)   : null

let allVehicles     = []
let categories      = []
let currentUser     = null
let createImageFile = null
let editImageFile   = null
let editRemoveImage = false

// ── Proteger ruta ──
checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return }
    currentUser = user

    // Obtener nombre real desde Firestore y mostrarlo en el navbar
    const usersRes = await getDocuments(COLLECTIONS.USERS)
    const userData = usersRes.success ? usersRes.data.find(u => u.uid === user.uid) : null
    const nombre   = userData?.name || user.displayName || user.email?.split('@')[0] || 'Admin'
    window.setNavbarUser(nombre)

    await Promise.all([loadCategories(), loadVehicles()])
})

// ── Navbar: solo manejar logout ──
document.addEventListener('navbarLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn')
    logoutBtn?.addEventListener('click', async () => { await logoutUser(); window.location.href = '../login.html' })
})

/* ======================================================
   IMAGEN — preview local
====================================================== */

const showPreview = (file, previewEl, previewImg, dropZone) => {
    const url = URL.createObjectURL(file)
    previewImg.src = url
    previewEl.classList.remove('d-none')
    dropZone?.classList.add('d-none')
}


const handleCreateImage = (file) => {
    if (!file.type.startsWith('image/')) { showAlert('createAlert', 'El archivo debe ser una imagen'); return }
    createImageFile = file
    showPreview(file, createPreviewEl, createPreviewImg, createDropZone)
}
createImageInput?.addEventListener('change', (e) => { if (e.target.files[0]) handleCreateImage(e.target.files[0]) })
createDropZone?.addEventListener('dragover',  (e) => { e.preventDefault(); createDropZone.style.borderColor = '#0d6efd' })
createDropZone?.addEventListener('dragleave', ()  => { createDropZone.style.borderColor = '' })
createDropZone?.addEventListener('drop', (e) => {
    e.preventDefault(); createDropZone.style.borderColor = ''
    const file = e.dataTransfer.files[0]
    if (file) handleCreateImage(file)
})
createRemoveBtn?.addEventListener('click', () => {
    createImageFile = null
    createImageInput.value = ''
    createPreviewEl.classList.add('d-none')
    createDropZone.classList.remove('d-none')
})
createModalEl?.addEventListener('hidden.bs.modal', () => {
    createImageFile = null
    createImageInput.value = ''
    createPreviewEl?.classList.add('d-none')
    createDropZone?.classList.remove('d-none')
})

// Editar
const handleEditImage = (file) => {
    if (!file.type.startsWith('image/')) { showAlert('editAlert', 'El archivo debe ser una imagen'); return }
    editImageFile = file
    showPreview(file, editPreviewEl, editPreviewImg, null)
}
editImageInput?.addEventListener('change', (e) => { if (e.target.files[0]) handleEditImage(e.target.files[0]) })
editDropZone?.addEventListener('dragover',  (e) => { e.preventDefault(); editDropZone.style.borderColor = '#0d6efd' })
editDropZone?.addEventListener('dragleave', ()  => { editDropZone.style.borderColor = '' })
editDropZone?.addEventListener('drop', (e) => {
    e.preventDefault(); editDropZone.style.borderColor = ''
    const file = e.dataTransfer.files[0]
    if (file) handleEditImage(file)
})
editRemoveBtn?.addEventListener('click', () => {
    editRemoveImage = true
    editCurrentImg.classList.add('d-none')
})
editCancelNewBtn?.addEventListener('click', () => {
    editImageFile = null
    editImageInput.value = ''
    editPreviewEl.classList.add('d-none')
})
editModalEl?.addEventListener('hidden.bs.modal', () => {
    editImageFile   = null
    editRemoveImage = false
    editImageInput.value = ''
    editPreviewEl?.classList.add('d-none')
})

/* ======================================================
   CATEGORÍAS Y VEHÍCULOS
====================================================== */

const loadCategories = async () => {
    const result = await getDocuments(COLLECTIONS.VEHICLE_CATEGORIES)
    if (!result.success) return
    categories = result.data.filter(c => c.active !== false)
    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    if (createCategory) createCategory.innerHTML = `<option value="">Seleccionar categoría</option>${options}`
    if (editCategory)   editCategory.innerHTML   = `<option value="">Seleccionar categoría</option>${options}`
}

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
        renderGrid(allVehicles)
    } catch (err) {
        showAlert('vehiclesAlert', 'Ocurrió un error inesperado')
        loadingState.classList.add('d-none')
        console.error(err)
    }
}

/* ======================================================
   HELPERS DE ESTADO Y CATEGORÍA
====================================================== */

const statusConfig = (status) => {
    const map = {
        available:   { color: 'success',   label: 'Disponible' },
        rented:      { color: 'primary',   label: 'Rentado' },
        maintenance: { color: 'warning',   label: 'Mantenimiento' },
        inactive:    { color: 'secondary', label: 'Inactivo' }
    }
    return map[status] || { color: 'secondary', label: status }
}

const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id)
    return cat ? cat.name : 'Sin categoría'
}

/* ======================================================
   RENDER — GRID DE TARJETAS
====================================================== */

const renderGrid = (vehicles) => {
    if (vehicles.length === 0) {
        vehiclesGrid.classList.add('d-none')
        emptyState.classList.remove('d-none')
        return
    }

    emptyState.classList.add('d-none')
    vehiclesGrid.classList.remove('d-none')

    vehiclesGrid.innerHTML = vehicles.map(v => {

        const { color, label } = statusConfig(v.status)

        const imgHtml = v.imageUrl
            ? `<img src="${v.imageUrl}" class="card-img-top" alt="${v.brand} ${v.model}">`
            : `<div class="no-img">
                   <i class="bi bi-car-front text-secondary" style="font-size:3rem"></i>
               </div>`

        return `
            <div class="col-sm-6 col-lg-4 col-xl-3">
                <div class="card vehicle-admin-card h-100 shadow-sm">

                    ${imgHtml}

                    <div class="card-body p-3 d-flex flex-column gap-2">

                        <!-- Nombre + precio -->
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div>
                                <h6 class="fw-bold mb-0">${v.brand} ${v.model}</h6>
                                <small class="text-secondary">${v.year} · ${v.plate}</small>
                            </div>
                            <span class="price-tag flex-shrink-0">
                                $${Number(v.dailyPrice).toFixed(2)}
                                <span style="font-weight:400;font-size:.75rem">/día</span>
                            </span>
                        </div>

                        <!-- Categoría + estado -->
                        <div class="d-flex flex-wrap gap-2 align-items-center">
                            <span class="badge bg-light text-secondary border">
                                <i class="bi bi-tag me-1"></i>${getCategoryName(v.categoryId)}
                            </span>
                            <span class="badge bg-${color} status-pill">${label}</span>
                        </div>

                    </div>

                    <!-- Acciones -->
                    <div class="card-actions">
                        <button
                            class="btn btn-outline-primary btn-sm flex-grow-1"
                            onclick="openEditVehicle('${v.id}')"
                            title="Editar"
                        >
                            <i class="bi bi-pencil me-1"></i>Editar
                        </button>
                        <button
                            class="btn btn-outline-danger btn-sm flex-grow-1"
                            onclick="deleteVehicle('${v.id}', '${v.brand} ${v.model}')"
                            title="Eliminar"
                        >
                            <i class="bi bi-trash me-1"></i>Eliminar
                        </button>
                    </div>

                </div>
            </div>
        `
    }).join('')
}

/* ======================================================
   FILTROS
====================================================== */

const applyFilters = () => {
    const search = searchInput?.value.toLowerCase().trim() || ''
    const status = filterStatus?.value || ''
    const filtered = allVehicles.filter(v => {
        const matchSearch = `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search)
        const matchStatus = !status || v.status === status
        return matchSearch && matchStatus
    })
    renderGrid(filtered)
}
searchInput?.addEventListener('input', applyFilters)
filterStatus?.addEventListener('change', applyFilters)

/* ======================================================
   VALIDACIÓN
====================================================== */

const isValidPlate = (plate) =>
    plate && plate.length >= 5 && plate.length <= 10 && /^[A-Z0-9-]+$/.test(plate.toUpperCase())

const validateVehicleForm = (brand, model, year, plate, categoryId, price) => {
    let valid = true
    const fields = [
        [brand,      'La marca es obligatoria',                       !isEmpty(brand.value)],
        [model,      'El modelo es obligatorio',                      !isEmpty(model.value)],
        [year,       'Año inválido (1900 - año actual)',               isValidYear(year.value)],
        [plate,      'Placa inválida (5-10 caracteres alfanuméricos)', isValidPlate(plate.value)],
        [categoryId, 'Selecciona una categoría',                      !isEmpty(categoryId.value)],
        [price,      'El precio debe ser mayor a 0',                  isValidPrice(price.value)],
    ]
    fields.forEach(([el, msg, ok]) => {
        if (!el) return
        clearFieldError(el)
        if (!ok) { setFieldError(el, msg); valid = false }
    })
    return valid
}

/* ======================================================
   CREAR
====================================================== */

createForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideAlert('createAlert')
    if (!validateVehicleForm(createBrand, createModel, createYear, createPlate, createCategory, createPrice)) return
    try {
        showButtonLoader(createBtn, 'Guardando...')

        const transmissionVal = createTransmission?.value || 'Automática'
        const fuelVal         = createFuel?.value         || 'Gasolina'
        const passengersVal   = createPassengers?.value   ? Number(createPassengers.value) : 5
        const insuranceVal    = createInsurance?.value?.trim() || 'Básico incluido'
        const fuelPolicyVal   = createFuelPolicy?.value   || 'Lleno a Lleno'
        const largeBagsVal    = createLargeBags?.value    ? Number(createLargeBags.value) : 2
        const smallBagsVal    = createSmallBags?.value    ? Number(createSmallBags.value) : 2

        const result = await createDocument(COLLECTIONS.VEHICLES, {
            brand:        createBrand.value.trim(),
            model:        createModel.value.trim(),
            year:         Number(createYear.value),
            plate:        createPlate.value.trim().toUpperCase(),
            categoryId:   createCategory.value,
            dailyPrice:   Number(createPrice.value),
            status:       'available',
            transmission: transmissionVal,
            fuel:         fuelVal,
            passengers:   passengersVal,
            insurance:    insuranceVal,
            fuelPolicy:   fuelPolicyVal,
            largeBags:    largeBagsVal,
            smallBags:    smallBagsVal,
            imageUrl:     null
        })
        if (!result.success) { showAlert('createAlert', 'No se pudo guardar el vehículo'); return }

        if (createImageFile) {
            const uploadResult = await uploadVehicleImage(result.id, createImageFile)
            if (uploadResult.success && uploadResult.url) {
                await updateDocument(COLLECTIONS.VEHICLES, result.id, { imageUrl: uploadResult.url })
            } else {
                showToast('Vehículo guardado pero la foto no se pudo subir', 'warning')
            }
        }

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

/* ======================================================
   EDITAR
====================================================== */

window.openEditVehicle = (id) => {
    const v = allVehicles.find(x => x.id === id)
    if (!v) return
    hideAlert('editAlert')
    editImageFile   = null
    editRemoveImage = false
    editId.value       = v.id
    editBrand.value    = v.brand      || ''
    editModel.value    = v.model      || ''
    editYear.value     = v.year       || ''
    editPlate.value    = v.plate      || ''
    editPrice.value    = v.dailyPrice || ''
    editStatus.value   = v.status     || 'available'
    if (editCategory) editCategory.value = v.categoryId || ''

    // Campos extra (compañero)
    if (editTransmission) editTransmission.value = v.transmission || 'Automática'
    if (editFuel)         editFuel.value         = v.fuel         || 'Gasolina'
    if (editPassengers)   editPassengers.value   = v.passengers   || 5
    if (editInsurance)    editInsurance.value    = v.insurance    || 'Básico incluido'
    if (editFuelPolicy)   editFuelPolicy.value   = v.fuelPolicy   || 'Lleno a Lleno'
    if (editLargeBags)    editLargeBags.value    = v.largeBags !== undefined ? v.largeBags : 2
    if (editSmallBags)    editSmallBags.value    = v.smallBags !== undefined ? v.smallBags : 2

    if (v.imageUrl && !v.imageUrl.startsWith('data:')) {
        editCurrentImgEl.src = v.imageUrl
        editCurrentImg.classList.remove('d-none')
    } else {
        editCurrentImg.classList.add('d-none')
    }
    editPreviewEl.classList.add('d-none')
    editImageInput.value = ''
    editModal?.show()
}

editForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideAlert('editAlert')
    if (!validateVehicleForm(editBrand, editModel, editYear, editPlate, editCategory, editPrice)) return
    try {
        showButtonLoader(saveBtn, 'Guardando...')

        const currentVehicle = allVehicles.find(v => v.id === editId.value)
        let imageUrl = currentVehicle?.imageUrl || null

        if (imageUrl && imageUrl.startsWith('data:')) {
            imageUrl = null
            if (!editImageFile) {
                showToast('La foto anterior era muy grande. Por favor vuelve a subir la imagen.', 'warning')
            }
        }

        if (editImageFile) {
            const uploadResult = await uploadVehicleImage(editId.value, editImageFile)
            if (uploadResult.success && uploadResult.url) {
                imageUrl = uploadResult.url
            } else {
                showToast('Los datos se guardarán pero la foto no se pudo subir', 'warning')
            }
        } else if (editRemoveImage) {
            imageUrl = null
        }

        // Campos extra (compañero)
        const transmissionVal = editTransmission?.value || 'Automática'
        const fuelVal         = editFuel?.value         || 'Gasolina'
        const passengersVal   = editPassengers?.value   ? Number(editPassengers.value) : 5
        const insuranceVal    = editInsurance?.value?.trim() || 'Básico incluido'
        const fuelPolicyVal   = editFuelPolicy?.value   || 'Lleno a Lleno'
        const largeBagsVal    = editLargeBags?.value    ? Number(editLargeBags.value) : 2
        const smallBagsVal    = editSmallBags?.value    ? Number(editSmallBags.value) : 2

        const dataToSave = {
            brand:        editBrand.value.trim(),
            model:        editModel.value.trim(),
            year:         Number(editYear.value),
            plate:        editPlate.value.trim().toUpperCase(),
            categoryId:   editCategory.value,
            dailyPrice:   Number(editPrice.value),
            status:       editStatus.value,
            transmission: transmissionVal,
            fuel:         fuelVal,
            passengers:   passengersVal,
            insurance:    insuranceVal,
            fuelPolicy:   fuelPolicyVal,
            largeBags:    largeBagsVal,
            smallBags:    smallBagsVal,
            imageUrl:     imageUrl || null
        }

        const result = await updateDocument(COLLECTIONS.VEHICLES, editId.value, dataToSave)
        if (!result.success) { showAlert('editAlert', 'No se pudo actualizar: ' + result.error); return }

        const verify = await getDocumentFromServer(COLLECTIONS.VEHICLES, editId.value)
        console.log('✅ Verificación SERVIDOR — imageUrl:', verify.data?.imageUrl || '❌ NULL')

        allVehicles = allVehicles.map(v =>
            v.id === editId.value ? { ...v, ...dataToSave } : v
        )
        renderGrid(allVehicles)

        showToast('Vehículo actualizado', 'success')
        editModal?.hide()
    } catch (err) {
        showAlert('editAlert', 'Ocurrió un error inesperado')
        console.error(err)
    } finally {
        hideButtonLoader(saveBtn)
    }
})

/* ======================================================
   ELIMINAR
====================================================== */

window.deleteVehicle = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?\nEsta acción no se puede deshacer.`)) return
    try {
        const vehicle = allVehicles.find(v => v.id === id)
        if (vehicle?.imageUrl) await deleteVehicleImage(vehicle.imageUrl)
        const result = await deleteDocument(COLLECTIONS.VEHICLES, id)
        if (!result.success) { showToast('No se pudo eliminar', 'danger'); return }
        allVehicles = allVehicles.filter(v => v.id !== id)
        renderGrid(allVehicles)
        showToast(`"${nombre}" eliminado`, 'success')
    } catch (err) {
        showToast('Error inesperado', 'danger')
        console.error(err)
    }
}