// ======================================================
// NOTIFICACIONES - RENTAS PRÓXIMAS A CONCLUIR (CON LOGS)
// ======================================================
import { checkAuth } from './auth.js';
import { getDocuments, COLLECTIONS } from './firestore.js';

const HOURS_THRESHOLD = 24;
let currentCustomerId = null;
let currentUser = null;
let notificationInterval = null;
let notificationBtn = null;
let notificationBadge = null;
let dropdown = null;

//('🚀 notifications.js cargado');

// ── Crear el botón ──
function createNotificationButton() {
    //('📦 Creando botón de notificaciones');
    const btn = document.createElement('button');
    btn.id = 'notificationBtn';
    btn.className = 'btn btn-outline-light btn-sm position-relative';
    btn.title = 'Notificaciones';
    btn.innerHTML = `
        <i class="bi bi-bell"></i>
        <span id="notificationBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display: none; font-size: 0.65rem; margin-top: -2px;">0</span>
    `;
    btn.style.cursor = 'pointer';
    
    dropdown = document.createElement('div');
    dropdown.id = 'notificationDropdown';
    dropdown.className = 'notification-dropdown';
    dropdown.style.display = 'none';
    dropdown.innerHTML = `
        <div class="dropdown-header">
            <strong>🚗 Rentas por concluir</strong>
            <small class="text-muted">próximas ${HOURS_THRESHOLD} horas</small>
        </div>
        <div id="notificationList" class="notification-list">
            <div class="text-muted text-center p-2">Cargando...</div>
        </div>
    `;
    btn.appendChild(dropdown);
    return btn;
}

// ── Actualizar notificaciones ──
async function updateNotifications() {
    //('🔄 updateNotifications() ejecutándose. customerId:', currentCustomerId);
    if (!currentCustomerId) {
        console.warn('⚠️ No hay customerId, ocultando badge');
        if (notificationBadge) notificationBadge.style.display = 'none';
        if (dropdown) {
            const list = dropdown.querySelector('#notificationList');
            if (list) list.innerHTML = '<div class="text-muted text-center p-2">Inicia sesión para ver notificaciones</div>';
        }
        return;
    }

    try {
        const now = new Date();
        const limitDate = new Date(now.getTime() + HOURS_THRESHOLD * 60 * 60 * 1000);
        //(`📅 Buscando rentas entre ${now.toISOString()} y ${limitDate.toISOString()}`);
        
        const rentalsResult = await getDocuments(COLLECTIONS.RENTALS);
        if (!rentalsResult.success) throw new Error('Error al cargar rentas');
        //(`✅ Se obtuvieron ${rentalsResult.data.length} rentas totales`);
        
        const endingRentals = rentalsResult.data.filter(rental => 
            rental.customerId === currentCustomerId &&
            rental.status === 'active' &&
            rental.endDate &&
            rental.endDate.toDate() <= limitDate &&
            rental.endDate.toDate() >= now
        );
        
        //(`🔔 Rentas próximas a concluir: ${endingRentals.length}`);
        endingRentals.forEach(r => (`  - ${r.id}: termina ${r.endDate.toDate().toLocaleString()}`));
        
        const count = endingRentals.length;
        if (count > 0) {
            notificationBadge.textContent = count;
            notificationBadge.style.display = 'inline-block';
            //(`🔴 Badge actualizado a ${count}`);
        } else {
            notificationBadge.style.display = 'none';
            //('⚪ Badge oculto (sin rentas próximas)');
        }
        
        const listContainer = dropdown?.querySelector('#notificationList');
        if (!listContainer) return;
        
        if (count === 0) {
            listContainer.innerHTML = '<div class="text-muted text-center p-2">✅ No hay rentas próximas a concluir</div>';
            return;
        }
        
        const vehiclesResult = await getDocuments(COLLECTIONS.VEHICLES);
        const vehicles = vehiclesResult.success ? vehiclesResult.data : [];
        
        listContainer.innerHTML = endingRentals.map(rental => {
            const vehicle = vehicles.find(v => v.id === rental.vehicleId);
            const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'Vehículo desconocido';
            const endDateStr = rental.endDate.toDate().toLocaleString();
            return `
                <div class="notification-item">
                    <div class="fw-bold">🚙 ${vehicleName}</div>
                    <div class="small">Termina: ${endDateStr}</div>
                    <div class="small text-danger">⚠️ Por concluir en menos de ${HOURS_THRESHOLD} horas</div>
                </div>
            `;
        }).join('');
        //('📋 Dropdown actualizado');
        
    } catch (error) {
        console.error('❌ Error actualizando notificaciones:', error);
        const listContainer = dropdown?.querySelector('#notificationList');
        if (listContainer) listContainer.innerHTML = '<div class="text-danger text-center p-2">Error al cargar notificaciones</div>';
    }
}

// ── Inyección del botón (basado en el botón de tema) ──
function injectNotificationButton() {
    //('🔍 Intentando inyectar botón de notificaciones...');
    const navbarContainer = document.getElementById('navbarContainer');
    if (!navbarContainer) {
        console.warn('⚠️ navbarContainer no encontrado');
        return false;
    }
    //('✅ navbarContainer existe');
    
    const themeBtn = navbarContainer.querySelector('.theme-toggle-btn');
    if (!themeBtn) {
        console.warn('⚠️ No se encontró .theme-toggle-btn. Buscando botón con clase btn-outline-light...');
        const possible = navbarContainer.querySelector('button[class*="outline-light"]');
        if (possible); //('Posible alternativo:', possible);
    } else {
        //('✅ Botón de tema encontrado:', themeBtn);
    }
    
    if (!themeBtn) {
        console.error('❌ No se pudo localizar el botón de modo oscuro. Abortando inyección.');
        return false;
    }
    
    if (document.getElementById('notificationBtn')) {
        //('ℹ️ El botón de notificaciones ya existe');
        return true;
    }
    
    notificationBtn = createNotificationButton();
    themeBtn.parentNode.insertBefore(notificationBtn, themeBtn);
    //('✅ Botón de notificaciones insertado antes del botón de tema');
    
    notificationBadge = document.getElementById('notificationBadge');
    
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        //('🖱️ Click en botón notificaciones, dropdown:', dropdown?.style.display);
    });
    
    document.addEventListener('click', (event) => {
        if (dropdown && notificationBtn && !notificationBtn.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    return true;
}

// ── Esperar a que el navbar cargue usando MutationObserver ──
function waitForNavbarAndInject() {
    //('⌛ Esperando que el navbar esté disponible...');
    if (injectNotificationButton()) {
        //('🎉 Inyección exitosa inmediata');
        return;
    }
    
    const observer = new MutationObserver(() => {
        if (injectNotificationButton()) {
            observer.disconnect();
            //('🎉 Inyección exitosa mediante MutationObserver');
            if (currentCustomerId) updateNotifications();
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    //('👀 MutationObserver activado');
    
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (injectNotificationButton()) {
            clearInterval(interval);
            //('🎉 Inyección exitosa por interval');
            if (currentCustomerId) updateNotifications();
        } else if (attempts > 10) {
            clearInterval(interval);
            console.error('❌ No se pudo inyectar el botón después de 10 intentos');
        }
    }, 1000);
    
    document.addEventListener('navbarLoaded', () => {
        //('📢 Evento navbarLoaded detectado');
        injectNotificationButton();
        if (currentCustomerId) updateNotifications();
    });
}

// ── Obtener customerId a partir del usuario autenticado ──
async function setCustomerId(user) {
    //('🔐 setCustomerId llamado con user:', user?.uid);
    if (!user) {
        currentCustomerId = null;
        return;
    }
    try {
        const usersResult = await getDocuments(COLLECTIONS.USERS);
        if (usersResult.success) {
            const customer = usersResult.data.find(u => u.uid === user.uid);
            currentCustomerId = customer ? customer.id : null;
            //(`👤 customerId obtenido: ${currentCustomerId}`);
        } else {
            console.error('❌ No se pudieron obtener usuarios');
            currentCustomerId = null;
        }
    } catch (err) {
        console.error('❌ Error obteniendo customerId:', err);
        currentCustomerId = null;
    }
}

// ── Inicialización principal ──
checkAuth(async (user) => {
    //('📡 checkAuth ejecutado. user:', user?.uid);
    currentUser = user;
    await setCustomerId(user);
    
    if (user && currentCustomerId) {
        //('✅ Usuario autenticado y customerId válido. Actualizando notificaciones...');
        await updateNotifications();
        if (notificationInterval) clearInterval(notificationInterval);
        notificationInterval = setInterval(updateNotifications, 5 * 60 * 1000);
        //('⏲️ Intervalo de actualización configurado (5 min)');
    } else {
        console.warn('⚠️ No hay usuario o customerId. Notificaciones desactivadas.');
        if (notificationBadge) notificationBadge.style.display = 'none';
        if (dropdown) {
            const list = dropdown.querySelector('#notificationList');
            if (list) list.innerHTML = '<div class="text-muted text-center p-2">Inicia sesión para ver notificaciones</div>';
        }
        if (notificationInterval) clearInterval(notificationInterval);
    }
});

// Iniciar la espera para inyectar el botón
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForNavbarAndInject);
} else {
    waitForNavbarAndInject();
}