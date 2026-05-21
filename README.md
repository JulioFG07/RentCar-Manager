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
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   │
│   ├── modules/
│   │   ├── vehicles.html
│   │   ├── customers.html
│   │   ├── rentals.html
│   │   └── vehicles-categories.html
│   │
│   └── assets/
│       ├── css/
│       │   └── styles.css
│       │
│       └── js/
│           ├── firebase.js
│           ├── firestore.js
│           ├── auth.js
│           ├── validators.js
│           ├── ui.js
│           └── main.js
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