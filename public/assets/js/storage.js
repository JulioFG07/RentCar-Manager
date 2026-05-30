/* ======================================================
   CLOUDINARY — subida de imágenes sin backend
   Configura CLOUD_NAME y UPLOAD_PRESET con los tuyos
====================================================== */

const CLOUD_NAME    = "dtw2dcdqm";      // ← reemplaza con el tuyo
const UPLOAD_PRESET = "rentcar_vehicles";   // ← el nombre del preset que creaste

/* ======================================================
   Subir imagen de vehículo
====================================================== */
export async function uploadVehicleImage(vehicleId, file) {
    try {
        const formData = new FormData();
        formData.append("file",           file);
        formData.append("upload_preset",  UPLOAD_PRESET);
        formData.append("folder",         `rentcar/vehicles/${vehicleId}`);
        formData.append("resource_type",  "image");

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            { method: "POST", body: formData }
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Error al subir imagen");
        }

        const data = await response.json();
        return { success: true, url: data.secure_url };

    } catch (error) {
        console.error("Error subiendo imagen a Cloudinary:", error);
        return { success: false, error: error.message };
    }
}

/* ======================================================
   Eliminar imagen
   Nota: Cloudinary no permite borrar desde el frontend
   sin exponer credenciales — las imágenes huérfanas se
   pueden limpiar manualmente desde el dashboard de Cloudinary.
====================================================== */
export async function deleteVehicleImage(imageUrl) {
    // No-op en frontend con Cloudinary unsigned
    // Las imágenes se pueden gestionar desde cloudinary.com/console
    console.info("Imagen a limpiar en Cloudinary:", imageUrl);
}