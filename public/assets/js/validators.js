/* ======================================================
   EMPTY VALUES
====================================================== */

/**
 * Validar campo vacío
 */
export function isEmpty(value) {

    return (
        value === null ||
        value === undefined ||
        value.toString().trim() === ""
    );
}

/* ======================================================
   EMAIL VALIDATION
====================================================== */

/**
 * Validar correo electrónico
 */
export function isValidEmail(email) {

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email);
}

/* ======================================================
   PASSWORD VALIDATION
====================================================== */

/**
 * Validar longitud mínima contraseña
 */
export function isValidPassword(
    password,
    minLength = 6
) {

    return password.length >= minLength;
}

/**
 * Validar coincidencia contraseñas
 */
export function passwordsMatch(
    password,
    confirmPassword
) {

    return password === confirmPassword;
}

/* ======================================================
   NUMBER VALIDATION
====================================================== */

/**
 * Validar número positivo
 */
export function isPositiveNumber(value) {

    return Number(value) > 0;
}

/**
 * Validar año válido
 */
export function isValidYear(year) {

    const currentYear =
        new Date().getFullYear();

    return (
        Number(year) >= 1900 &&
        Number(year) <= currentYear + 1
    );
}

/**
 * Validar precio válido
 */
export function isValidPrice(price) {

    return (
        !isNaN(price) &&
        Number(price) > 0
    );
}

/* ======================================================
   DATE VALIDATION
====================================================== */

/**
 * Validar fecha válida
 */
export function isValidDate(date) {

    return !isNaN(new Date(date).getTime());
}

/**
 * Validar rango fechas renta
 */
export function isValidRentalDates(
    startDate,
    endDate
) {

    const start =
        new Date(startDate);

    const end =
        new Date(endDate);

    return end >= start;
}

/* ======================================================
   STRING VALIDATION
====================================================== */

/**
 * Validar longitud mínima
 */
export function minLength(
    value,
    length
) {

    return value.trim().length >= length;
}

/**
 * Validar longitud máxima
 */
export function maxLength(
    value,
    length
) {

    return value.trim().length <= length;
}

/* ======================================================
   PHONE VALIDATION
====================================================== */

/**
 * Validar teléfono
 */
export function isValidPhone(phone) {

    const phoneRegex =
        /^[0-9]{10}$/;

    return phoneRegex.test(phone);
}

/* ======================================================
   VEHICLE VALIDATION
====================================================== */

/**
 * Validar placa vehículo
 */
export function isValidPlate(plate) {

    const plateRegex =
        /^[A-Z0-9-]{5,10}$/i;

    return plateRegex.test(plate);
}

/* ======================================================
   LICENSE VALIDATION
====================================================== */

/**
 * Validar licencia conducir
 */
export function isValidLicense(
    license
) {

    return minLength(license, 6);
}

/* ======================================================
   FORM VALIDATION
====================================================== */

/**
 * Mostrar error campo
 */
export function setFieldError(
    inputElement,
    message = "Campo inválido"
) {

    inputElement.classList.add(
        "is-invalid"
    );

    const feedback =
        inputElement.nextElementSibling;

    if (
        feedback &&
        feedback.classList.contains(
            "invalid-feedback"
        )
    ) {

        feedback.textContent = message;
    }
}

/**
 * Limpiar error campo
 */
export function clearFieldError(
    inputElement
) {

    inputElement.classList.remove(
        "is-invalid"
    );
}

/**
 * Validar formulario vacío
 */
export function validateRequiredFields(
    fields
) {

    let isValid = true;

    fields.forEach((field) => {

        clearFieldError(field);

        if (isEmpty(field.value)) {

            setFieldError(
                field,
                "Este campo es obligatorio"
            );

            isValid = false;
        }
    });

    return isValid;
}