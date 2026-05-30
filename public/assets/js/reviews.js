import { checkAuth, logoutUser } from './auth.js';
import {
    getDocuments,
    getDocumentById,
    COLLECTIONS
} from './firestore.js';
import { showToast } from './ui.js';

// ── DOM ──
const reviewsGrid      = document.getElementById('reviewsGrid');
const reviewsGrouped   = document.getElementById('reviewsGrouped');
const loadingState     = document.getElementById('loadingState');
const emptyState       = document.getElementById('emptyState');
const searchInput      = document.getElementById('searchInput');
const filterRating     = document.getElementById('filterRating');
const filterVehicle    = document.getElementById('filterVehicle');
const sortOrder        = document.getElementById('sortOrder');
const totalReviewsEl   = document.getElementById('totalReviews');
const avgRatingEl      = document.getElementById('avgRating');
const avgStarsEl       = document.getElementById('avgStars');
const bestVehicleEl    = document.getElementById('bestVehicle');
const distBarsEl       = document.getElementById('distributionBars');
const resultsCountEl   = document.getElementById('resultsCount');
const viewIndividualBtn = document.getElementById('viewIndividual');
const viewGroupedBtn   = document.getElementById('viewGrouped');

let allReviews   = [];
let vehicleCache = {};
let currentView  = 'individual'; // 'individual' | 'grouped'

// ── Logout ──
document.addEventListener('click', async (e) => {
    if (e.target.closest('#logoutBtn')) {
        await logoutUser();
        window.location.href = '../login.html';
    }
});

// ── Navbar activo ──
document.addEventListener('navbarLoaded', () => {
    document.querySelectorAll('[data-page]').forEach(link => {
        if (link.dataset.page === 'reviews') link.classList.add('active');
    });
});

// ── Helpers ──
const renderStarsFull = (rating, size = '') => {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= rating
            ? `<i class="bi bi-star-fill${size ? ' ' + size : ''}" style="color:#f59e0b"></i>`
            : `<i class="bi bi-star${size ? ' ' + size : ''}" style="color:#d1d5db"></i>`;
    }
    return html;
};

const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return '—'; }
};

const getVehicle = async (vehicleId) => {
    if (vehicleCache[vehicleId]) return vehicleCache[vehicleId];
    const result = await getDocumentById(COLLECTIONS.VEHICLES, vehicleId);
    if (result.success) {
        vehicleCache[vehicleId] = result.data;
        return result.data;
    }
    return null;
};

// ── Cargar reseñas ──
const loadReviews = async () => {
    loadingState.classList.remove('d-none');
    reviewsGrid.classList.add('d-none');
    reviewsGrouped.classList.add('d-none');
    emptyState.classList.add('d-none');

    try {
        const result = await getDocuments(COLLECTIONS.REVIEWS);
        if (!result.success) throw new Error('Error al cargar reseñas');

        allReviews = result.data
            .filter(r => r.active !== false)
            .sort((a, b) => {
                const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return db_ - da;
            });

        const uniqueVehicleIds = [...new Set(allReviews.map(r => r.vehicleId).filter(Boolean))];
        await Promise.all(uniqueVehicleIds.map(id => getVehicle(id)));

        populateVehicleFilter(uniqueVehicleIds);

        loadingState.classList.add('d-none');
        updateStats(allReviews);
        applyFilters();
    } catch (err) {
        console.error(err);
        loadingState.classList.add('d-none');
        showToast('Error al cargar las reseñas', 'danger');
    }
};

// ── Poblar select de vehículos ──
const populateVehicleFilter = (vehicleIds) => {
    if (!filterVehicle) return;
    filterVehicle.innerHTML = '<option value="">Todos los vehículos</option>';
    vehicleIds.forEach(id => {
        const v = vehicleCache[id];
        if (v) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `${v.brand} ${v.model}${v.year ? ' ' + v.year : ''}`;
            filterVehicle.appendChild(opt);
        }
    });
};

// ── Estadísticas globales ──
const updateStats = (reviews) => {
    if (totalReviewsEl) totalReviewsEl.textContent = reviews.length;

    if (reviews.length === 0) {
        if (avgRatingEl)   avgRatingEl.textContent = '—';
        if (avgStarsEl)    avgStarsEl.innerHTML = '';
        if (bestVehicleEl) bestVehicleEl.textContent = '—';
        if (distBarsEl)    distBarsEl.innerHTML = '';
        return;
    }

    const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
    if (avgRatingEl) avgRatingEl.textContent = avg.toFixed(1);
    if (avgStarsEl)  avgStarsEl.innerHTML = renderStarsFull(Math.round(avg));

    const byVehicle = groupByVehicle(reviews);
    let best = null;
    byVehicle.forEach(group => {
        if (!best || group.avg > best.avg) best = group;
    });
    if (bestVehicleEl && best) {
        bestVehicleEl.innerHTML = `
            <span class="text-warning fw-bold">${best.avg.toFixed(1)} ⭐</span><br>
            <small>${best.vehicleName}</small>
        `;
    }

    if (distBarsEl) {
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++; });
        const max = Math.max(...Object.values(dist), 1);
        distBarsEl.innerHTML = [5, 4, 3, 2, 1].map(star => `
            <div class="dist-bar-wrap">
                <span class="dist-label text-secondary">${star}</span>
                <div class="dist-bar-bg">
                    <div class="dist-bar-fill" style="width:${(dist[star] / max * 100).toFixed(0)}%"></div>
                </div>
                <span class="dist-count">${dist[star]}</span>
            </div>
        `).join('');
    }
};

// ── Agrupar reseñas por vehículo ──
const groupByVehicle = (reviews) => {
    const map = new Map();
    reviews.forEach(r => {
        const vid = r.vehicleId || '__unknown__';
        if (!map.has(vid)) map.set(vid, []);
        map.get(vid).push(r);
    });

    const groups = [];
    map.forEach((revs, vid) => {
        const vehicle = vehicleCache[vid];
        const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo desconocido';
        const avg = revs.reduce((s, r) => s + (r.rating || 0), 0) / revs.length;
        groups.push({ vehicleId: vid, vehicle, vehicleName, reviews: revs, avg, count: revs.length });
    });

    return groups;
};

// ── Ordenar lista de reseñas ──
const sortReviews = (reviews) => {
    const order = sortOrder?.value || 'date_desc';
    return [...reviews].sort((a, b) => {
        if (order === 'date_desc') {
            const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return db_ - da;
        }
        if (order === 'date_asc') {
            const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return da - db_;
        }
        if (order === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
        if (order === 'rating_asc')  return (a.rating || 0) - (b.rating || 0);
        return 0;
    });
};

// ── Ordenar grupos de vehículos ──
const sortGroups = (groups) => {
    const order = sortOrder?.value || 'date_desc';
    return [...groups].sort((a, b) => {
        if (order === 'rating_desc') return b.avg - a.avg;
        if (order === 'rating_asc')  return a.avg - b.avg;
        const latestDate = (group) => {
            const dates = group.reviews.map(r =>
                r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0)
            );
            return Math.max(...dates.map(d => d.getTime()));
        };
        if (order === 'date_asc') return latestDate(a) - latestDate(b);
        return latestDate(b) - latestDate(a);
    });
};

// ── Renderizar vista individual ──
const renderIndividual = (reviews) => {
    if (reviews.length === 0) {
        reviewsGrid.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');
    reviewsGrid.classList.remove('d-none');

    const sorted = sortReviews(reviews);
    reviewsGrid.innerHTML = sorted.map(review => {
        const vehicle  = vehicleCache[review.vehicleId];
        const vehName  = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehículo desconocido';
        const vehPlate = vehicle?.plate ? `· ${vehicle.plate}` : '';
        const imageUrl = vehicle?.imageUrl || null;
        const initials = (review.customerName || 'U').slice(0, 2).toUpperCase();

        return `
        <div class="col-sm-6 col-xl-4">
            <div class="card review-card h-100 shadow-sm border-0">
                <div class="review-vehicle-img">
                    ${imageUrl
                        ? `<img src="${imageUrl}" alt="${vehName}" class="vehicle-photo">`
                        : `<div class="no-vehicle-img"><i class="bi bi-car-front-fill"></i></div>`
                    }
                    <span class="rating-badge">
                        <i class="bi bi-star-fill me-1" style="color:#f59e0b;font-size:.75rem"></i>
                        ${review.rating}/5
                    </span>
                </div>
                <div class="card-body d-flex flex-column gap-2 p-3">
                    <div>
                        <h6 class="fw-bold mb-0">${vehName}</h6>
                        <small class="text-secondary">${vehicle?.year || ''}${vehPlate}</small>
                    </div>
                    <div class="d-flex gap-1">${renderStarsFull(review.rating)}</div>
                    <p class="review-comment mb-0">
                        ${review.comment
                            ? `<i class="bi bi-chat-quote me-1 text-secondary"></i>${review.comment}`
                            : `<span class="text-muted fst-italic">Sin comentario</span>`
                        }
                    </p>
                    <div class="d-flex align-items-center justify-content-between mt-auto pt-2 border-top">
                        <div class="d-flex align-items-center gap-2">
                            <div class="user-avatar">${initials}</div>
                            <span class="fw-semibold" style="font-size:.85rem">${review.customerName || 'Usuario'}</span>
                        </div>
                        <small class="text-secondary">
                            <i class="bi bi-calendar3 me-1"></i>${formatDate(review.createdAt)}
                        </small>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
};

// ── Renderizar vista agrupada por vehículo ──
const renderGrouped = (reviews) => {
    const groups = groupByVehicle(reviews);
    const sorted = sortGroups(groups);

    if (sorted.length === 0) {
        reviewsGrouped.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');
    reviewsGrouped.classList.remove('d-none');

    reviewsGrouped.innerHTML = sorted.map((group, gIdx) => {
        const { vehicle, vehicleName, reviews: revs, avg, count } = group;
        const imageUrl = vehicle?.imageUrl || null;
        const vehPlate = vehicle?.plate ? ` · ${vehicle.plate}` : '';
        const collapseId = `collapse-vehicle-${gIdx}`;

        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        revs.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++; });
        const maxDist = Math.max(...Object.values(dist), 1);

        const distHTML = [5, 4, 3, 2, 1].map(star => `
            <div class="dist-bar-wrap">
                <span class="dist-label text-secondary" style="font-size:.7rem">${star}</span>
                <div class="dist-bar-bg">
                    <div class="dist-bar-fill" style="width:${(dist[star] / maxDist * 100).toFixed(0)}%"></div>
                </div>
                <span class="dist-count">${dist[star]}</span>
            </div>
        `).join('');

        const sortedRevs = sortReviews(revs);

        return `
        <div class="card vehicle-card shadow-sm border-0 mb-3">
            <div class="row g-0">
                <div class="col-md-3 col-lg-2">
                    <div style="height:100%;min-height:160px;position:relative;overflow:hidden;border-radius:14px 0 0 14px;">
                        ${imageUrl
                            ? `<img src="${imageUrl}" alt="${vehicleName}"
                                style="width:100%;height:100%;object-fit:cover;min-height:160px;">`
                            : `<div class="no-vehicle-img" style="height:100%;min-height:160px;border-radius:14px 0 0 14px;">
                                   <i class="bi bi-car-front-fill"></i>
                               </div>`
                        }
                    </div>
                </div>
                <div class="col-md-9 col-lg-10">
                    <div class="card-body p-3">
                        <div class="row g-3 align-items-center">
                            <div class="col-sm-4">
                                <h5 class="fw-bold mb-1">${vehicleName}</h5>
                                <small class="text-secondary">${vehicle?.year || ''}${vehPlate}</small>
                                <div class="mt-2">
                                    <span class="badge bg-secondary bg-opacity-25 text-body">
                                        <i class="bi bi-chat-left-text me-1"></i>${count} reseña${count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                            <div class="col-sm-4 text-center">
                                <div class="vehicle-avg-rating">${avg.toFixed(1)}</div>
                                <div class="d-flex justify-content-center gap-1 my-1">
                                    ${renderStarsFull(Math.round(avg))}
                                </div>
                                <small class="text-secondary">Promedio de ${count} reseña${count !== 1 ? 's' : ''}</small>
                            </div>
                            <div class="col-sm-4">
                                ${distHTML}
                            </div>
                        </div>
                        <div class="mt-3 pt-2 border-top expand-btn d-flex align-items-center justify-content-between"
                             data-bs-toggle="collapse"
                             data-bs-target="#${collapseId}"
                             aria-expanded="false">
                            <small class="text-primary fw-semibold">
                                <i class="bi bi-chevron-down me-1"></i>Ver reseñas individuales
                            </small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="collapse vehicle-reviews-collapse" id="${collapseId}">
                <div class="px-3 pb-3">
                    ${sortedRevs.map(review => {
                        const initials = (review.customerName || 'U').slice(0, 2).toUpperCase();
                        return `
                        <div class="sub-review-item">
                            <div class="d-flex align-items-start gap-3">
                                <div class="user-avatar flex-shrink-0">${initials}</div>
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-1">
                                        <span class="fw-semibold" style="font-size:.875rem">${review.customerName || 'Usuario'}</span>
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="d-flex gap-1" style="font-size:.8rem">${renderStarsFull(review.rating)}</div>
                                            <small class="text-secondary">
                                                <i class="bi bi-calendar3 me-1"></i>${formatDate(review.createdAt)}
                                            </small>
                                        </div>
                                    </div>
                                    <p class="mb-0 mt-1" style="font-size:.875rem;color:var(--bs-body-color)">
                                        ${review.comment
                                            ? `<i class="bi bi-chat-quote me-1 text-secondary"></i>${review.comment}`
                                            : `<span class="text-muted fst-italic">Sin comentario</span>`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }).join('');
};

// ── Aplicar filtros y renderizar ──
const applyFilters = () => {
    const search    = searchInput?.value.toLowerCase().trim() || '';
    const rating    = filterRating?.value ? parseInt(filterRating.value) : 0;
    const vehicleId = filterVehicle?.value || '';

    const filtered = allReviews.filter(r => {
        const vehicle  = vehicleCache[r.vehicleId];
        const vehName  = vehicle ? `${vehicle.brand} ${vehicle.model}`.toLowerCase() : '';
        const customer = (r.customerName || '').toLowerCase();
        const comment  = (r.comment || '').toLowerCase();

        const matchSearch  = !search || vehName.includes(search) || customer.includes(search) || comment.includes(search);
        const matchRating  = !rating || r.rating === rating;
        const matchVehicle = !vehicleId || r.vehicleId === vehicleId;

        return matchSearch && matchRating && matchVehicle;
    });

    if (resultsCountEl) resultsCountEl.textContent = `${filtered.length} reseña${filtered.length !== 1 ? 's' : ''}`;

    updateStats(filtered);

    if (currentView === 'individual') {
        reviewsGrouped.classList.add('d-none');
        renderIndividual(filtered);
    } else {
        reviewsGrid.classList.add('d-none');
        renderGrouped(filtered);
    }
};

// ── Toggle de vistas ──
viewIndividualBtn?.addEventListener('click', () => {
    currentView = 'individual';
    viewIndividualBtn.classList.add('active');
    viewGroupedBtn.classList.remove('active');
    applyFilters();
});

viewGroupedBtn?.addEventListener('click', () => {
    currentView = 'grouped';
    viewGroupedBtn.classList.add('active');
    viewIndividualBtn.classList.remove('active');
    applyFilters();
});

// ── Event listeners de filtros ──
searchInput?.addEventListener('input', applyFilters);
filterRating?.addEventListener('change', applyFilters);
filterVehicle?.addEventListener('change', applyFilters);
sortOrder?.addEventListener('change', applyFilters);

// ── Cargar navbar según rol ──
const loadNavbar = async (user) => {
    const result   = await getDocuments(COLLECTIONS.USERS);
    const userData = result.success ? result.data.find(u => u.uid === user.uid) : null;
    const isAdmin  = userData?.role === 'admin';
    const nombre   = userData?.name || user.displayName || user.email?.split('@')[0] || 'Usuario';

    const navbarFile = isAdmin
        ? '../assets/components/navbar.html'
        : '../assets/components/navbar-user.html';

    const res  = await fetch(navbarFile);
    const html = await res.text();
    document.getElementById('navbarContainer').innerHTML = html;

    if (!isAdmin) {
        const fixMap = {
            './dashboard.html':                  '../dashboard.html',
            './modules/rentals.html':            './rentals.html',
            './modules/compare-vehicles.html':   './compare-vehicles.html',
            './modules/reviews.html':            './reviews.html',
            './profile.html':                    '../profile.html',
            './blog.html':                       '../blog.html'
        };
        document.getElementById('navbarContainer').querySelectorAll('a[href]').forEach(a => {
            const fixed = fixMap[a.getAttribute('href')];
            if (fixed) a.setAttribute('href', fixed);
        });

        // Inyectar notificaciones
        const notifScript = document.createElement('script')
        notifScript.type = 'module'
        notifScript.src = '../assets/js/notifications.js'
        document.head.appendChild(notifScript)
    }

    document.dispatchEvent(new Event('navbarLoaded'));

    const navUserName = document.getElementById('navUserName');
    if (navUserName) {
        navUserName.textContent   = nombre;
        navUserName.style.opacity = '1';
    }
};

// ── Init ──
checkAuth(async (user) => {
    if (!user) { window.location.href = '../login.html'; return; }
    await loadNavbar(user);
    await loadReviews();
});