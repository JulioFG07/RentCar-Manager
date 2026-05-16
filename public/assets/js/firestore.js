import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { db, auth } from "./firebase.js";

export const COLLECTIONS = {
    USERS: "users",
    VEHICLES: "vehicles",
    VEHICLE_CATEGORIES: "vehicle_categories",
    CUSTOMERS: "customers",
    RENTALS: "rentals"
};

/* Crear timestamps base */
function createBaseData() {
    return {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null,
        active: true
    };
}

/* Actualizar timestamps */
function updateBaseData() {
    return {
        updatedAt: serverTimestamp()
    };
}

/* Crear documento */
export async function createDocument(collectionName, data) {
    try {

        const documentData = {
            ...data,
            ...createBaseData()
        };

        const docRef = await addDoc(
            collection(db, collectionName),
            documentData
        );

        return {
            success: true,
            id: docRef.id
        };

    } catch (error) {

        console.error("Error creating document:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* Obtener todos los documentos */
export async function getDocuments(collectionName) {
    try {

        const q = query(
            collection(db, collectionName),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);

        const documents = [];

        querySnapshot.forEach((docItem) => {
            documents.push({
                id: docItem.id,
                ...docItem.data()
            });
        });

        return {
            success: true,
            data: documents
        };

    } catch (error) {

        console.error("Error getting documents:", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* Obtener documento por ID */
export async function getDocumentById(collectionName, id) {

    try {

        const docRef = doc(db, collectionName, id);

        const documentSnapshot = await getDoc(docRef);

        if (!documentSnapshot.exists()) {
            return {
                success: false,
                error: "Documento no encontrado"
            };
        }

        return {
            success: true,
            data: {
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }
        };

    } catch (error) {

        console.error(error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* Actualizar documento */
export async function updateDocument(collectionName, id, data) {

    try {

        const docRef = doc(db, collectionName, id);

        await updateDoc(docRef, {
            ...data,
            ...updateBaseData()
        });

        return {
            success: true
        };

    } catch (error) {

        console.error(error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* Eliminar documento */
export async function deleteDocument(collectionName, id) {

    try {

        const docRef = doc(db, collectionName, id);

        await deleteDoc(docRef);

        return {
            success: true
        };

    } catch (error) {

        console.error(error);

        return {
            success: false,
            error: error.message
        };
    }
}

/* Obtener vehículos disponibles */
export async function getAvailableVehicles() {

    try {

        const q = query(
            collection(db, COLLECTIONS.VEHICLES),
            where("status", "==", "available"),
            where("active", "==", true)
        );

        const querySnapshot = await getDocs(q);

        const vehicles = [];

        querySnapshot.forEach((docItem) => {
            vehicles.push({
                id: docItem.id,
                ...docItem.data()
            });
        });

        return {
            success: true,
            data: vehicles
        };

    } catch (error) {

        console.error(error);

        return {
            success: false,
            error: error.message
        };
    }
}