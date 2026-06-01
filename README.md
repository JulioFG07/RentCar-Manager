# RentCar Manager

Sistema web administrativo para la gestión de renta de vehículos desarrollado con HTML, CSS, Bootstrap, JavaScript Vanilla y Firebase.

---

# Descripción

RentCar Manager es una plataforma administrativa que permite gestionar vehículos, clientes y rentas dentro de una agencia de alquiler de automóviles.

El sistema incluye autenticación con Firebase, dashboard administrativo, CRUDs completos y una interfaz responsive estilo SaaS moderno.

---

# Objetivo del Proyecto

Desarrollar una aplicación web funcional que permita:

- Registrar vehículos
- Administrar clientes
- Gestionar rentas
- Validar disponibilidad de vehículos
- Calcular costos de renta
- Mostrar estadísticas administrativas
- Aplicar autenticación y Firestore

---

# Tecnologías Utilizadas

## Frontend

- HTML5
- CSS3
- Bootstrap 5
- JavaScript Vanilla

## Base de Datos

- Firebase Authentication
- Cloud Firestore
- Firebase Storage

---

# Estructura del Proyecto

```plaintext
rentcar-manager/
│
├── public/
│   ├── admin-register.html
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   ├── profile.html
│   ├── register.html
│   │
│   ├── modules/
│   │   ├── customers.html
│   │   ├── rentals.html
│   │   ├── vehicles-categories.html
│   │   └── vehicles.html
│   │
│   └── assets/
│       ├── components/
│       │   └── navbar-user.html
│       │   └── navbar.html
│       │
│       ├── css/
│       │   └── styles.css
│       │
│       └── js/
│           ├── admin-register.js
│           ├── auth.js
│           ├── customers.js
│           ├── dashboard.js
│           ├── data.js
│           ├── firebase.js
│           ├── firestore.js
│           ├── login.js
│           ├── main.js
│           ├── navbar-user.js
│           ├── navbar.js
│           ├── profile.js
│           ├── register.js
│           ├── rentals.js
│           ├── storage.js
│           ├── ui.js
│           ├── validators.js
│           ├── vehicles-categories.js
│           └── vehicles.js
│
├── README.md
└── .gitignore
```
---
# Funcionalidades Principales

## Autenticación

- Registro de usuarios
- Inicio de sesión
- Cierre de sesión
- Protección de vistas privadas

---

## Vehículos

- Registrar vehículos
- Editar vehículos
- Eliminar vehículos
- Filtrar por estado
- Validar disponibilidad

---

## Clientes

- Registrar clientes
- Editar clientes
- Eliminar clientes
- Buscar clientes

---

## Rentas

- Crear rentas
- Calcular total automáticamente
- Validar disponibilidad del vehículo
- Finalizar rentas
- Liberar vehículos

---

## Dashboard

- Vehículos disponibles
- Vehículos rentados
- Rentas activas
- Ingresos estimados

---

# Configuración Firebase

El proyecto utiliza Firebase para:

- Authentication
- Firestore Database
- Storage

La configuración se encuentra en:

```plaintext
public/assets/js/firebase.js
```

---

# Licencia

Proyecto académico universitario.