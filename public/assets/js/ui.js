/* ======================================================
   TOAST NOTIFICATIONS
====================================================== */

/**
 * Mostrar toast notification
 */
export function showToast(message, type = "success") {

    const toastContainer = document.getElementById("toastContainer");

    if (!toastContainer) return;

    const toastId = `toast-${Date.now()}`;

    const toastColors = {
        success: "bg-success",
        danger: "bg-danger",
        warning: "bg-warning",
        info: "bg-primary"
    };

    const toastHTML = `
        <div 
            id="${toastId}"
            class="toast align-items-center text-white ${toastColors[type]} border-0"
            role="alert"
        >
            <div class="d-flex">

                <div class="toast-body">
                    ${message}
                </div>

                <button 
                    type="button"
                    class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast"
                ></button>

            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML(
        "beforeend",
        toastHTML
    );

    const toastElement = document.getElementById(toastId);

    const toast = new bootstrap.Toast(toastElement, {
        delay: 3000
    });

    toast.show();

    toastElement.addEventListener("hidden.bs.toast", () => {
        toastElement.remove();
    });
}

/* ======================================================
   ALERTS
====================================================== */

/**
 * Mostrar alerta
 */
export function showAlert(
    elementId,
    message,
    type = "danger"
) {

    const alertElement = document.getElementById(elementId);

    if (!alertElement) return;

    alertElement.className = `alert alert-${type}`;
    alertElement.textContent = message;
    alertElement.classList.remove("d-none");
}

/**
 * Ocultar alerta
 */
export function hideAlert(elementId) {

    const alertElement = document.getElementById(elementId);

    if (!alertElement) return;

    alertElement.classList.add("d-none");
}

/* ======================================================
   BUTTON LOADERS
====================================================== */

/**
 * Mostrar loading button
 */
export function showButtonLoader(
    buttonElement,
    loadingText = "Cargando..."
) {

    if (!buttonElement) return;

    buttonElement.disabled = true;

    buttonElement.dataset.originalText =
        buttonElement.innerHTML;

    buttonElement.innerHTML = `
        <span 
            class="spinner-border spinner-border-sm"
            role="status"
        ></span>

        ${loadingText}
    `;
}

/**
 * Restaurar botón
 */
export function hideButtonLoader(buttonElement) {

    if (!buttonElement) return;

    buttonElement.disabled = false;

    buttonElement.innerHTML =
        buttonElement.dataset.originalText;
}

/* ======================================================
   CONFIRM DELETE
====================================================== */

/**
 * Confirmar eliminación
 */
export function confirmDelete(
    message = "¿Deseas eliminar este registro?"
) {

    return confirm(message);
}

/* ======================================================
   SIDEBAR
====================================================== */

/**
 * Toggle sidebar
 */
export function toggleSidebar() {

    const sidebar = document.getElementById("sidebar");

    if (!sidebar) return;

    sidebar.classList.toggle("active");
}

/**
 * Inicializar sidebar
 */
export function initializeSidebar() {

    const sidebarToggle =
        document.getElementById("sidebarToggle");

    if (!sidebarToggle) return;

    sidebarToggle.addEventListener(
        "click",
        toggleSidebar
    );
}

/* ======================================================
   ACTIVE NAV LINKS
====================================================== */

/**
 * Activar link actual sidebar
 */
export function setActiveNavLink() {

    const currentPath = window.location.pathname;

    const navLinks = document.querySelectorAll(
        ".sidebar .nav-link"
    );

    navLinks.forEach((link) => {

        const href = link.getAttribute("href");

        if (
            currentPath.includes(href)
        ) {

            link.classList.add("active");

        } else {

            link.classList.remove("active");
        }
    });
}

/* ======================================================
   EMPTY STATES
====================================================== */

/**
 * Mostrar estado vacío
 */
export function showEmptyState(
    containerId,
    message = "No hay registros disponibles"
) {

    const container =
        document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-5">

            <i class="bi bi-inbox fs-1 text-muted"></i>

            <p class="text-muted mt-3">
                ${message}
            </p>

        </div>
    `;
}

/* ======================================================
   TABLE SEARCH
====================================================== */

/**
 * Buscar en tabla
 */
export function searchTable(
    inputId,
    tableId
) {

    const input =
        document.getElementById(inputId);

    const table =
        document.getElementById(tableId);

    if (!input || !table) return;

    input.addEventListener("keyup", () => {

        const filter =
            input.value.toLowerCase();

        const rows =
            table.querySelectorAll("tbody tr");

        rows.forEach((row) => {

            const text =
                row.textContent.toLowerCase();

            row.style.display =
                text.includes(filter)
                    ? ""
                    : "none";
        });
    });
}

/* ======================================================
   MODALS
====================================================== */

/**
 * Abrir modal
 */
export function openModal(modalId) {

    const modalElement =
        document.getElementById(modalId);

    if (!modalElement) return;

    const modal =
        new bootstrap.Modal(modalElement);

    modal.show();
}

/**
 * Cerrar modal
 */
export function closeModal(modalId) {

    const modalElement =
        document.getElementById(modalId);

    if (!modalElement) return;

    const modal =
        bootstrap.Modal.getInstance(modalElement);

    if (modal) {
        modal.hide();
    }
}

/* ======================================================
   FORM RESET
====================================================== */

/**
 * Limpiar formulario
 */
export function resetForm(formId) {

    const form =
        document.getElementById(formId);

    if (!form) return;

    form.reset();

    const invalidFields =
        form.querySelectorAll(".is-invalid");

    invalidFields.forEach((field) => {
        field.classList.remove("is-invalid");
    });
}

/* ======================================================
   INITIALIZE UI
====================================================== */

/**
 * Inicializar UI
 */
export function initializeUI() {

    initializeSidebar();

    setActiveNavLink();
}