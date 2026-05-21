import { collection, addDoc, getDocs, getDoc, getDocFromServer, getDocsFromServer, updateDoc, setDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { db, auth } from "./firebase.js";

export const COLLECTIONS = {
    USERS: "users",
    VEHICLES: "vehicles",
    VEHICLE_CATEGORIES: "vehicle_categories",
    CUSTOMERS: "customers",
    RENTALS: "rentals"
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

/* Obtener todos los documentos — siempre desde servidor, sin orderBy para incluir todos */
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
            // updateDoc es más confiable para documentos existentes
            await updateDoc(docRef, payload);
        } catch (e) {
            if (e.code === 'not-found') {
                // Si no existe, crearlo con setDoc
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

/* Verificar documento directo del servidor (sin caché) */
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

/* Obtener vehículos disponibles — siempre desde servidor para tener imageUrl actualizado */
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