import { collection, addDoc, getDocs, getDoc, getDocFromServer, getDocsFromServer, updateDoc, setDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { db, auth } from "./firebase.js";

export const COLLECTIONS = {
    USERS: "users",
    VEHICLES: "vehicles",
    VEHICLE_CATEGORIES: "vehicle_categories",
    CUSTOMERS: "customers",
    RENTALS: "rentals",
    FAVORITES: "favorites",
    REVIEWS: "reviews",
    TIPS: "tips"
};

function createBaseData() {
    return {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        active: true
    };
}

function updateBaseData() {
    return {
        updatedAt: serverTimestamp()
    };
}

/* Crear documento */
export async function createDocument(collectionName, data) {
    try {
        const docRef = await addDoc(
            collection(db, collectionName),
            { ...data, ...createBaseData() }
        );
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error creating document:", error);
        return { success: false, error: error.message };
    }
}

/* Obtener todos los documentos */
export async function getDocuments(collectionName) {
    try {
        const querySnapshot = await getDocsFromServer(collection(db, collectionName));
        const documents = [];
        querySnapshot.forEach((docItem) => {
            documents.push({ id: docItem.id, ...docItem.data() });
        });
        return { success: true, data: documents };
    } catch (error) {
        console.error("Error getting documents:", error);
        return { success: false, error: error.message };
    }
}

/* Obtener documento por ID */
export async function getDocumentById(collectionName, id) {
    try {
        const docRef = doc(db, collectionName, id);
        const documentSnapshot = await getDoc(docRef);
        if (!documentSnapshot.exists()) {
            return { success: false, error: "Documento no encontrado" };
        }
        return { success: true, data: { id: documentSnapshot.id, ...documentSnapshot.data() } };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

/* Actualizar documento */
export async function updateDocument(collectionName, id, data) {
    try {
        const docRef = doc(db, collectionName, id);
        const payload = { ...data, ...updateBaseData() };
        try {
            await updateDoc(docRef, payload);
        } catch (e) {
            if (e.code === 'not-found') {
                await setDoc(docRef, payload);
            } else {
                throw e;
            }
        }
        return { success: true };
    } catch (error) {
        console.error("Error updating document:", error);
        return { success: false, error: error.message };
    }
}

/* Eliminar documento */
export async function deleteDocument(collectionName, id) {
    try {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

/* Verificar documento directo del servidor */
export async function getDocumentFromServer(collectionName, id) {
    try {
        const docRef = doc(db, collectionName, id);
        const documentSnapshot = await getDocFromServer(docRef);
        if (!documentSnapshot.exists()) {
            return { success: false, error: "Documento no encontrado en servidor" };
        }
        return { success: true, data: { id: documentSnapshot.id, ...documentSnapshot.data() } };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

/* Obtener vehículos disponibles */
export async function getAvailableVehicles() {
    try {
        const q = query(
            collection(db, COLLECTIONS.VEHICLES),
            where("status", "==", "available")
        );
        const querySnapshot = await getDocsFromServer(q);
        const vehicles = [];
        querySnapshot.forEach((docItem) => {
            vehicles.push({ id: docItem.id, ...docItem.data() });
        });
        return { success: true, data: vehicles };
    } catch (error) {
        console.error(error);
        return { success: false, error: error.message };
    }
}

/* ======================================================
   FAVORITOS
====================================================== */

/* Obtener favoritos de un cliente */
export async function getFavorites(customerId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.FAVORITES),
            where("customerId", "==", customerId),
            where("active", "==", true)
        )
        const querySnapshot = await getDocsFromServer(q)
        const favorites = []
        querySnapshot.forEach((docItem) => {
            favorites.push({ id: docItem.id, ...docItem.data() })
        })
        return { success: true, data: favorites }
    } catch (error) {
        console.error("Error getting favorites:", error)
        return { success: false, error: error.message }
    }
}

/* Agregar favorito */
export async function addFavorite(customerId, vehicleId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.FAVORITES),
            where("customerId", "==", customerId),
            where("vehicleId",  "==", vehicleId),
            where("active",     "==", true)
        )
        const existing = await getDocsFromServer(q)
        if (!existing.empty) {
            return { success: true, id: existing.docs[0].id, alreadyExists: true }
        }

        const docRef = await addDoc(
            collection(db, COLLECTIONS.FAVORITES),
            {
                customerId,
                vehicleId,
                ...createBaseData()
            }
        )
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error("Error adding favorite:", error)
        return { success: false, error: error.message }
    }
}

/* Quitar favorito */
export async function removeFavorite(customerId, vehicleId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.FAVORITES),
            where("customerId", "==", customerId),
            where("vehicleId",  "==", vehicleId),
            where("active",     "==", true)
        )
        const querySnapshot = await getDocsFromServer(q)
        if (querySnapshot.empty) return { success: true }

        const promises = []
        querySnapshot.forEach((docItem) => {
            promises.push(deleteDoc(doc(db, COLLECTIONS.FAVORITES, docItem.id)))
        })
        await Promise.all(promises)
        return { success: true }
    } catch (error) {
        console.error("Error removing favorite:", error)
        return { success: false, error: error.message }
    }
}

/* ======================================================
   DETECCIÓN Y ACTUALIZACIÓN DE RENTAS VENCIDAS
====================================================== */
export async function updateExpiredRentals() {
    try {
        const result = await getDocuments(COLLECTIONS.RENTALS)
        if (!result.success) return { success: false, expired: [] }

        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const activeRentals = result.data.filter(r => r.status === 'active')
        const expiredRentals = []

        for (const rental of activeRentals) {
            try {
                let endDate = null
                if (rental.endDate?.toDate) {
                    endDate = rental.endDate.toDate()
                } else if (rental.endDate) {
                    endDate = new Date(rental.endDate)
                }

                if (!endDate) continue

                endDate.setHours(0, 0, 0, 0)

                if (endDate < hoy) {
                    await updateDocument(COLLECTIONS.RENTALS, rental.id, { status: 'late' })
                    expiredRentals.push({ ...rental, status: 'late' })
                }
            } catch (err) {
                console.error(`Error procesando renta ${rental.id}:`, err)
            }
        }

        return { success: true, expired: expiredRentals }

    } catch (error) {
        console.error('Error en updateExpiredRentals:', error)
        return { success: false, expired: [] }
    }
}

/* ======================================================
   RESEÑAS
====================================================== */

/* Obtener reseñas de un vehículo */
export async function getVehicleReviews(vehicleId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.REVIEWS),
            where("vehicleId", "==", vehicleId),
            where("active",    "==", true)
        )
        const querySnapshot = await getDocsFromServer(q)
        const reviews = []
        querySnapshot.forEach((docItem) => {
            reviews.push({ id: docItem.id, ...docItem.data() })
        })
        return { success: true, data: reviews }
    } catch (error) {
        console.error("Error getting vehicle reviews:", error)
        return { success: false, error: error.message }
    }
}

/* Obtener reseñas de un cliente */
export async function getUserReviews(customerId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.REVIEWS),
            where("customerId", "==", customerId),
            where("active",     "==", true)
        )
        const querySnapshot = await getDocsFromServer(q)
        const reviews = []
        querySnapshot.forEach((docItem) => {
            reviews.push({ id: docItem.id, ...docItem.data() })
        })
        return { success: true, data: reviews }
    } catch (error) {
        console.error("Error getting user reviews:", error)
        return { success: false, error: error.message }
    }
}

/* Agregar reseña */
export async function addReview(data) {
    try {
        const q = query(
            collection(db, COLLECTIONS.REVIEWS),
            where("rentalId",   "==", data.rentalId),
            where("customerId", "==", data.customerId),
            where("active",     "==", true)
        )
        const existing = await getDocsFromServer(q)
        if (!existing.empty) {
            return { success: false, error: "Ya dejaste una reseña para esta renta" }
        }

        const docRef = await addDoc(
            collection(db, COLLECTIONS.REVIEWS),
            { ...data, ...createBaseData() }
        )
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error("Error adding review:", error)
        return { success: false, error: error.message }
    }
}