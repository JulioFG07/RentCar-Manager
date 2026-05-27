// keepfilters.js - Persistencia de filtros
const STORAGE_KEY = 'rentcar_filters';

function saveFilters() {
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('filterCategory');
    if (!searchInput || !categorySelect) return;
    const filters = {
        search: searchInput.value,
        category: categorySelect.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

function restoreFilters() {
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('filterCategory');
    if (!searchInput || !categorySelect) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
        const filters = JSON.parse(stored);
        let changed = false;
        if (filters.search !== undefined && searchInput.value !== filters.search) {
            searchInput.value = filters.search;
            changed = true;
        }
        if (filters.category !== undefined && categorySelect.value !== filters.category) {
            categorySelect.value = filters.category;
            changed = true;
        }
        if (changed) {
            // Dar tiempo a que rentals.js haya inicializado sus eventos
            setTimeout(() => {
                searchInput.dispatchEvent(new Event('input'));
                categorySelect.dispatchEvent(new Event('change'));
            }, 200);
        }
    } catch (e) {
        console.warn('Error restaurando filtros:', e);
    }
}

function initKeepFilters() {
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('filterCategory');
    if (!searchInput || !categorySelect) return;

    let timeout;
    const debouncedSave = () => {
        clearTimeout(timeout);
        timeout = setTimeout(saveFilters, 500);
    };
    searchInput.addEventListener('input', debouncedSave);
    categorySelect.addEventListener('change', saveFilters);

    // Esperar a que el DOM y rentals.js estén listos
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(restoreFilters, 300));
    } else {
        setTimeout(restoreFilters, 800);
    }
}

initKeepFilters();