/* ======================================================
   VEHICLE CATEGORIES
====================================================== */

export const vehicleCategories = [

    {
        id: "cat001",
        name: "Sedán",
        description: "Vehículos compactos y cómodos",
        active: true
    },

    {
        id: "cat002",
        name: "SUV",
        description: "Vehículos deportivos utilitarios",
        active: true
    },

    {
        id: "cat003",
        name: "Pickup",
        description: "Vehículos de carga y trabajo",
        active: true
    },

    {
        id: "cat004",
        name: "Deportivo",
        description: "Vehículos de alto rendimiento",
        active: true
    }
];

/* ======================================================
   VEHICLES
====================================================== */

export const vehicles = [

    {
        id: "veh001",
        brand: "Toyota",
        model: "Corolla",
        year: 2023,
        plate: "ABC-123",
        categoryId: "cat001",
        dailyPrice: 45,
        status: "available",
        active: true
    },

    {
        id: "veh002",
        brand: "Honda",
        model: "Civic",
        year: 2022,
        plate: "XYZ-456",
        categoryId: "cat001",
        dailyPrice: 50,
        status: "rented",
        active: true
    },

    {
        id: "veh003",
        brand: "Hyundai",
        model: "Tucson",
        year: 2024,
        plate: "SUV-789",
        categoryId: "cat002",
        dailyPrice: 80,
        status: "available",
        active: true
    },

    {
        id: "veh004",
        brand: "Ford",
        model: "Ranger",
        year: 2023,
        plate: "PIC-321",
        categoryId: "cat003",
        dailyPrice: 95,
        status: "maintenance",
        active: true
    }
];

/* ======================================================
   CUSTOMERS
====================================================== */

export const customers = [

    {
        id: "cus001",
        fullName: "Juan Pérez",
        email: "juan@example.com",
        phone: "88887777",
        licenseNumber: "LIC12345",
        address: "San José, Costa Rica",
        active: true
    },

    {
        id: "cus002",
        fullName: "María González",
        email: "maria@example.com",
        phone: "88996655",
        licenseNumber: "LIC54321",
        address: "Heredia, Costa Rica",
        active: true
    },

    {
        id: "cus003",
        fullName: "Carlos Ramírez",
        email: "carlos@example.com",
        phone: "88775544",
        licenseNumber: "LIC98765",
        address: "Alajuela, Costa Rica",
        active: true
    }
];

/* ======================================================
   RENTALS
====================================================== */

export const rentals = [

    {
        id: "ren001",
        customerId: "cus001",
        vehicleId: "veh002",
        startDate: "2025-05-20",
        endDate: "2025-05-25",
        days: 5,
        dailyPrice: 50,
        total: 250,
        status: "active",
        active: true
    },

    {
        id: "ren002",
        customerId: "cus002",
        vehicleId: "veh003",
        startDate: "2025-05-10",
        endDate: "2025-05-12",
        days: 2,
        dailyPrice: 80,
        total: 160,
        status: "completed",
        active: true
    }
];

/* ======================================================
   DASHBOARD MOCK DATA
====================================================== */

export const dashboardStats = {

    availableVehicles: 2,

    rentedVehicles: 1,

    maintenanceVehicles: 1,

    activeRentals: 1,

    totalCustomers: 3,

    estimatedIncome: 410
};