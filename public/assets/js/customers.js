import { checkAuth, logoutUser } from './auth.js'
import { getDocuments, updateDocument, COLLECTIONS } from './firestore.js'
import { showAlert, hideAlert, showToast, showButtonLoader, hideButtonLoader } from './ui.js'
import { isEmpty, isValidPhone, setFieldError, clearFieldError } from './validators.js'

// ── Referencias DOM ──
const searchInput      = document.getElementById('searchInput')
const loadingState     = document.getElementById('loadingState')
const emptyState       = document.getElementById('emptyState')
const tableContainer   = document.getElementById('tableContainer')
const customersBody    = document.getElementById('customersBody')

// Modal crear (NUEVO)
const createCustomerForm = document.getElementById('createCustomerForm')
const createName         = document.getElementById('createName')
const createEmail        = document.getElementById('createEmail')
const createPhone        = document.getElementById('createPhone')
const createLicense      = document.getElementById('createLicense')
const createAddress      = document.getElementById('createAddress')
const createCustomerBtn  = document.getElementById('createCustomerBtn')

// Modal editar
const editCustomerForm = document.getElementById('editCustomerForm')
const editCustomerId   = document.getElementById('editCustomerId')
const editName         = document.getElementById('editName')
const editEmail        = document.getElementById('editEmail')
const editPhone        = document.getElementById('editPhone')
const editLicense      = document.getElementById('editLicense')
const editAddress      = document.getElementById('editAddress')
const saveCustomerBtn  = document.getElementById('saveCustomerBtn')

const createModalEl    = document.getElementById('createCustomerModal')
const editModalEl      = document.getElementById('editCustomerModal')
const editModal        = editModalEl ? bootstrap.Modal.getOrCreateInstance(editModalEl) : null

let allCustomers = []
let currentUser  = null

checkAuth(async (user) => {
    if (!user) {
        window.location.href = '../login.html'
        return
    }

    currentUser = user
    await loadCustomers()
})

// ── Inicializar navbar cuando esté cargado ──
document.addEventListener('navbarLoaded', () => {
    const navUserName = document.getElementById('navUserName')
    const logoutBtn   = document.getElementById('logoutBtn')

    if (navUserName && currentUser) {
        navUserName.textContent = currentUser.displayName || currentUser.email
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logoutUser()
            window.location.href = '../login.html'
        })
    }
})

// ── Cargar clientes (usuarios con role: "user") ──
const loadCustomers = async () => {
    try {
        const result = await getDocuments(COLLECTIONS.CUSTOMERS)

        if (!result.success) {
            showAlert('customersAlert', 'Error al cargar los clientes')
            loadingState.classList.add('d-none')
            return
        }

        allCustomers = result.data.filter(u => u.role === 'user')

        loadingState.classList.add('d-none')
        renderTable(allCustomers)

    } catch (error) {
        showAlert('customersAlert', 'Ocurrió un error inesperado')
        loadingState.classList.add('d-none')
        console.error(error)
    }
}

// ── Renderizar tabla ──
const renderTable = (customers) => {
    if (customers.length === 0) {
        tableContainer.classList.add('d-none')
        emptyState.classList.remove('d-none')
        return
    }

    emptyState.classList.add('d-none')
    tableContainer.classList.remove('d-none')

    customersBody.innerHTML = customers.map(customer => {

        const isActive = customer.active !== false

        const activeBadge = isActive
            ? `<span class="badge bg-success">Activo</span>`
            : `<span class="badge bg-secondary">Inactivo</span>`

        const actionBtn = isActive
            ? `<button
                class="btn btn-outline-danger btn-sm"
                onclick="deleteCustomer('${customer.id}', '${customer.name || 'este cliente'}')"
                title="Eliminar cliente"
               >
                   <i class="bi bi-trash"></i>
               </button>`
            : `<button
                class="btn btn-outline-success btn-sm"
                onclick="restoreCustomer('${customer.id}', '${customer.name || 'este cliente'}')"
                title="Restaurar cliente"
               >
                   <i class="bi bi-arrow-counterclockwise"></i>
               </button>`

        return `
            <tr class="${isActive ? '' : 'table-secondary opacity-75'}">
                <td class="ps-4 fw-semibold">
                    ${customer.name || '—'}
                    <div class="mt-1">${activeBadge}</div>
                </td>
                <td class="text-secondary">${customer.email || '—'}</td>
                <td>${customer.phone         || '<span class="text-muted fst-italic small">Sin datos</span>'}</td>
                <td>${customer.licenseNumber || '<span class="text-muted fst-italic small">Sin datos</span>'}</td>
                <td>${customer.address       || '<span class="text-muted fst-italic small">Sin datos</span>'}</td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button
                            class="btn btn-outline-primary btn-sm"
                            onclick="openEditModal('${customer.id}')"
                            title="Editar"
                        >
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${actionBtn}
                    </div>
                </td>
            </tr>
        `
    }).join('')
}

// ── Buscador ──
searchInput?.addEventListener('input', () => {
    const filter = searchInput.value.toLowerCase().trim()

    const filtered = allCustomers.filter(customer =>
        (customer.fullName  || '').toLowerCase().includes(filter) ||
        (customer.email || '').toLowerCase().includes(filter)
    )

    renderTable(filtered)
})


const isValidLicense = (license) => {
    return license && license.length >= 6
}

const validateCreateForm = () => {
    let valid = true
    const fields = [
        [createName,    'El nombre es obligatorio',          !isEmpty(createName.value)],
        [createEmail,   'Ingresa un correo válido',          isValidEmail(createEmail.value)],
        [createPhone,   'El teléfono debe tener 10 dígitos', !createPhone.value || isValidPhone(createPhone.value)],
        [createLicense, 'La licencia debe tener al menos 6 caracteres', !createLicense.value || isValidLicense(createLicense.value)]
    ]
    fields.forEach(([el, msg, ok]) => {
        if (!el) return
        clearFieldError(el)
        if (!ok) { setFieldError(el, msg); valid = false }
    })
    return valid
}

createCustomerForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideAlert('createAlert')

    if (!validateCreateForm()) return

    try {
        showButtonLoader(createCustomerBtn, 'Guardando...')
        
        const result = await createDocument(COLLECTIONS.CUSTOMERS, {
            name:          createName.value.trim(),
            email:         createEmail.value.trim().toLowerCase(),
            phone:         createPhone.value.trim()   || null,
            licenseNumber: createLicense.value.trim() || null,
            address:       createAddress.value.trim() || null,
        })

        if (!result.success) { 
            showAlert('createAlert', 'No se pudo registrar el cliente')
            return 
        }

        showToast('Cliente registrado correctamente', 'success')
        createCustomerForm.reset()
        createModal?.hide()
        await loadCustomers()

    } catch (err) {
        showAlert('createAlert', 'Error inesperado')
        console.error(err)
    } finally {
        hideButtonLoader(createCustomerBtn)
    }
})

// ── Abrir modal editar ──
window.openEditModal = (customerId) => {
    const customer = allCustomers.find(c => c.id === customerId)
    if (!customer) return

    hideAlert('editAlert')
    hideAlert('editSuccess')

    editCustomerId.value = customer.id
    editName.value       = customer.fullName          || ''
    editEmail.value      = customer.email         || ''
    editPhone.value      = customer.phone         || ''
    editLicense.value    = customer.licenseNumber || ''
    editAddress.value    = customer.address       || ''

    editModal?.show()
}

// ── Guardar cambios del cliente ──
editCustomerForm?.addEventListener('submit', async (e) => {
    e.preventDefault()

    hideAlert('editAlert')
    hideAlert('editSuccess')

    const fullNname    = editName.value.trim()
    const phone   = editPhone.value.trim()
    const license = editLicense.value.trim()
    const address = editAddress.value.trim()

    if (isEmpty(fullName)) {
        showAlert('editAlert', 'El nombre es obligatorio')
        return
    }

    try {
        showButtonLoader(saveCustomerBtn, 'Guardando...')

        const result = await updateDocument(
            COLLECTIONS.CUSTOMERS,
            editCustomerId.value,
            {
                fullName,
                phone:         phone   || null,
                licenseNumber: license || null,
                address:       address || null
            }
        )

        if (!result.success) {
            showAlert('editAlert', 'No se pudo actualizar el cliente')
            return
        }

        const index = allCustomers.findIndex(c => c.id === editCustomerId.value)
        if (index !== -1) {
            allCustomers[index] = {
                ...allCustomers[index],
                fullName,
                phone:         phone   || null,
                licenseNumber: license || null,
                address:       address || null
            }
        }

        renderTable(allCustomers)
        showToast('Cliente actualizado correctamente', 'success')

        setTimeout(() => {
            editModal?.hide()
        }, 800)

    } catch (error) {
        showAlert('editAlert', 'Ocurrió un error inesperado')
        console.error(error)
    } finally {
        hideButtonLoader(saveCustomerBtn)
    }
})

// ── Eliminar cliente (eliminación lógica) ──
window.deleteCustomer = async (customerId, customerName) => {
    const confirmed = confirm(`¿Estás seguro de que deseas eliminar a "${customerName}"?`)
    if (!confirmed) return

    try {
        const result = await updateDocument(
            COLLECTIONS.USERS,
            customerId,
            { active: false }
        )

        if (!result.success) {
            showToast('No se pudo eliminar el cliente', 'danger')
            return
        }

        const index = allCustomers.findIndex(c => c.id === customerId)
        if (index !== -1) {
            allCustomers[index] = { ...allCustomers[index], active: false }
        }

        renderTable(allCustomers)
        showToast(`"${customerName}" eliminado correctamente`, 'warning')

    } catch (error) {
        showToast('Ocurrió un error inesperado', 'danger')
        console.error(error)
    }
}

// ── Restaurar cliente ──
window.restoreCustomer = async (customerId, customerName) => {
    const confirmed = confirm(`¿Deseas restaurar a "${customerName}"?`)
    if (!confirmed) return

    try {
        const result = await updateDocument(
            COLLECTIONS.USERS,
            customerId,
            { active: true }
        )

        if (!result.success) {
            showToast('No se pudo restaurar el cliente', 'danger')
            return
        }

        const index = allCustomers.findIndex(c => c.id === customerId)
        if (index !== -1) {
            allCustomers[index] = { ...allCustomers[index], active: true }
        }

        renderTable(allCustomers)
        showToast(`"${customerName}" restaurado correctamente`, 'success')

    } catch (error) {
        showToast('Ocurrió un error inesperado', 'danger')
        console.error(error)
    }
}
