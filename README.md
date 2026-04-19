# DOCUMENTACIÓN COMPLETA - PRO STOCK TOOL

**Pro-Stock-Tool** es un sistema web integral de gestión de inventarios y bodegas, desarrollado con PHP, JavaScript, MySQL y CSS. Está diseñado para ejecutarse en un entorno XAMPP (Apache + PHP + MySQL) con una clara separación entre la autenticación, lógica de negocio, acceso a datos y vistas del cliente.

---

## 📋 TABLA DE CONTENIDOS

1. [Descripción del Sistema](#descripción-del-sistema)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Roles y Funciones](#roles-y-funciones)
4. [Tablas de Base de Datos](#tablas-de-base-de-datos)
5. [Arquitectura Técnica](#arquitectura-técnica)

---

## DESCRIPCIÓN DEL SISTEMA

### Resumen Ejecutivo

Pro-Stock-Tool es una plataforma web que permite a las empresas (especialmente ferreterías) gestionar:

- **Inventarios** por bodegas o almacenes
- **Productos** con categorías, subcategorías y especificaciones
- **Proveedores** y gestión de compras
- **Movimientos de inventario** (entradas, salidas, transferencias)
- **Devoluciones** de clientes y proveedores
- **Reportes y análisis** del inventario
- **Usuarios con permisos** diferenciados por rol
- **Control de acceso** a bodegas compartidas

### Características Principales

✅ **Gestión multiusuario** con 3 niveles de rol
✅ **Control de bodegas compartidas** con permisos granulares
✅ **Seguimiento de movimientos** con auditoría completa
✅ **Notificaciones** de invitaciones y cambios
✅ **Reportes en PDF y Excel**
✅ **Sistema de categorías y parámetros** personalizables
✅ **Búsqueda avanzada** de productos
✅ **Interfaz responsiva** para escritorio y mobile

---

## ESTRUCTURA DE ARCHIVOS

### 📁 Carpeta Raíz

```
Pro-Stock-Tool/
├── base.sql                    # Script SQL de BD (-creación e inicialización)
├── login.html                  # Página pública de autenticación
├── README.md                   # Documentación breve
├── NOTIFICACIONES.md           # Especificación del sistema de notificaciones
├── DOCUMENTACION_COMPLETA.md   # Este archivo
```

### 📁 Carpeta `/auth` - Autenticación y Sesiones

| Archivo | Función |
|---------|---------|
| **conexion.php** | Conexión a BD para módulo de autenticación |
| **login.php** | Endpoint para iniciar sesión (valida credenciales) |
| **logout.php** | Endpoint para cerrar sesión |
| **registro.php** | Endpoint para registrar nuevos usuarios |
| **verificar_sesion.php** | Verifica si sesión activa es válida; devuelve datos del usuario |

**Flujo de Autenticación:**
1. Usuario accede a `login.html`
2. Envía credenciales a `/auth/login.php`
3. Se valida email y password contra tabla `usuarios`
4. Se crea sesión PHP y se almacena `user_id` y `rol`
5. En cada página se llama a `verificar_sesion.php` para confirmar validez

---

### 📁 Carpeta `/database` - Endpoints PHP (API CRUD)

Estos archivos son endpoints que operan directamente sobre la base de datos. Reciben parámetros GET/POST y devuelven JSON.

| Archivo | Operaciones | Tabla BD |
|---------|------------|---------|
| **bodega.php** | CRUD bodegas, conceptos de inventario | `bodegas`, `conceptos_inventario` |
| **categorias.php** | CRUD categorías de productos | `categorias` |
| **producto.php** | CRUD productos, búsqueda avanzada | `productos` |
| **proveedores.php** | CRUD proveedores | `proveedores` |
| **subcategorias.php** | CRUD subcategorías | `subcategorias` |
| **movimientos.php** | CRUD movimientos y detalles | `movimientos`, `movimientos_detalle` |
| **devoluciones.php** | CRUD devoluciones | `devoluciones` |
| **transferencias.php** | CRUD transferencias entre bodegas | `transferencias` |
| **usuarios.php** | CRUD usuarios, bodegas compartidas, permisos | `usuarios`, `bodegas_compartidas` |
| **parametros.php** | CRUD parámetros (estados de productos) | `parametros` |
| **reportes.php** | Consultas agregadas para análisis | Múltiples tablas |
| **reporte_pdf.php** | Generación de reportes en PDF | Múltiples tablas |
| **perfil.php** | Actualización de perfil de usuario | `usuarios` |
| **mi_bodega.php** | Operaciones específicas de la bodega del jefe | `productos`, `movimientos` |
| **search.php** | Búsqueda global rápida | `productos` |
| **conexion.php** | Configuración de conexión a BD | - |
| **verificar_rol.php** | Valida permisos según rol del usuario | - |

**Convención de Llamadas:**
```javascript
// Ejemplos de uso típico
fetch('../database/producto.php?action=listar&bodega_id=5')
fetch('../database/movimientos.php', { 
  method: 'POST', 
  body: JSON.stringify({...}) 
})
```

---

### 📁 Carpeta `/controllers` - Lógica de Negocio en JavaScript

Los controladores JavaScript manejan la lógica del lado cliente (interacción UI, validaciones, gestión de estado).

| Archivo | Responsabilidad | Módulo | Descripción |
|---------|-----------------|--------|-------------|
| **bodega.js** | Gestión de bodegas | Parámetros | CRUD de bodegas y conceptos de inventario |
| **categorias.js** | Gestión de categorías | Parámetros | CRUD de categorías y subcategorías |
| **producto.js** | Gestión de productos | Productos | CRUD productos, filtros, búsqueda avanzada |
| **proveedores.js** | Gestión de proveedores | Proveedores | CRUD proveedores, búsqueda |
| **movimientos.js** | Gestión de movimientos | Movimientos | Crear movimientos, visualizar, detalles |
| **devoluciones.js** | Gestión de devoluciones | Devoluciones | CRUD devoluciones, cambio de estado |
| **transferencias.js** | Transferencias entre bodegas | Transferencias | Crear transferencias, rastreo |
| **usuarios.js** | Gestión de usuarios | Usuarios | CRUD usuarios, filtros por rol, estados |
| **perfil.js** | Edición de perfil | Perfil | Actualizar datos personales, foto |
| **permisos.js** | Gestión de permisos de bodegas | Mi Bodega | Compartir bodega, actualizar permisos |
| **mi-bodega.js** | Operaciones de jefe de bodega | Mi Bodega | Vista personalizada de bodega propia |
| **tendero.js** | Consulta de inventario | Tendero | Búsqueda y visualización de productos |
| **reportes.js** | Análisis y reportes | Reportes | Gráficos, filtros, exportación |
| **header-footer.js** | Componentes comunes | General | Menú, notificaciones, usuario |
| **registro.js** | Registro de nuevos usuarios | Login | Validación de registro pública |
| **notifications.js** | Sistema de notificaciones | Sistema | Sistema base global de notificaciones |
| **notificaciones-bodega.js** | Notificaciones especializadas | Mi Bodega | Notificaciones de invitaciones y permisos |

**Patrón Típico de Controlador:**
```javascript
// 1. Configuración y variables globales
const API_URL = '../database/modulo.php';
let state = { items: [], editandoId: null };

// 2. Inicialización
document.addEventListener('DOMContentLoaded', init);

// 3. Funciones CRUD
async function cargarItems() { /* fetch */ }
async function crearItem(datos) { /* POST */ }
async function editarItem(id, datos) { /* PUT */ }
async function eliminarItem(id) { /* DELETE */ }

// 4. Funciones de UI
function renderItems() { /* renderizar HTML */ }
function abrirModal() { /* mostrar modal */ }
```

---

### 📁 Carpeta `/view` - Vistas HTML (Páginas de la Aplicación)

| Archivo | Rol | Descripción |
|---------|-----|-------------|
| **index.html** | Admin | Dashboard principal con estadísticas generales |
| **bodega.html** | Admin | CRUD de bodegas y conceptos de inventario |
| **categoria.html** | Admin | CRUD de categorías y subcategorías |
| **productos.html** | Admin, Jefe | Gestión completa de productos |
| **proveedores.html** | Admin | CRUD de proveedores |
| **movimientos.html** | Admin, Jefe | Crear y visualizar movimientos |
| **devoluciones.html** | Admin, Jefe | Gestión de devoluciones |
| **transferencias.html** | Admin, Jefe | Transferencias entre bodegas |
| **usuarios.html** | Admin | CRUD de usuarios, asignación de roles |
| **reportes.html** | Admin | Reportes con gráficos y exportación |
| **parametros.html** | Admin | Gestión de parámetros (estados) |
| **perfil.html** | Todos | Edición de perfil personal |
| **mi-bodega.html** | Jefe Bodega | Vista especial para jefe: sus productos, movimientos, invitaciones |
| **tendero.html** | Tendero | Consulta solo lectura de inventario |

**Estructura Típica de una Vista:**
```html
<!DOCTYPE html>
<html>
<head>
  <link>styles globales y módulo</link>
</head>
<body>
  <main>
    <!-- Header con título y acciones -->
    <div class="mod-header">...</div>
    
    <!-- Contenido principal -->
    <div class="content">...</div>
    
    <!-- Modales, formularios, tablas -->
  </main>
  
  <script src="../controllers/modulo.js"></script>
  <script src="../controllers/header-footer.js"></script>
</body>
</html>
```

---

### 📁 Carpeta `/styles` - Estilos CSS

| Archivo | Descripción |
|---------|-------------|
| **global.css** | Estilos base: tipografía, colores, espaciado, components |
| **header-footer.css** | Estilos de encabezado, menú, pie de página |
| **index.css** | Estilos para dashboard principal |
| **login.css** | Estilos para página de autenticación |
| **bodega.css** | Estilos para módulo de bodegas |
| **categorias.css** | Estilos para módulo de categorías |
| **productos.css** | Estilos para módulo de productos |
| **proveedores.css** | Estilos para módulo de proveedores |
| **movimientos.css** | Estilos para módulo de movimientos |
| **devoluciones.css** | Estilos para módulo de devoluciones |
| **transferencias.css** | Estilos para módulo de transferencias |
| **usuarios.css** | Estilos para módulo de usuarios |
| **parametros.css** | Estilos para módulo de parámetros |
| **reportes.css** | Estilos para módulo de reportes |
| **tendero.css** | Estilos para vista de tendero |
| **mi-bodega.css** | Estilos para vista de jefe de bodega |
| **perfil.css** | Estilos para perfil personal |

---

### 📁 Carpeta `/uploads` - Archivos Subidos

| Subcarpeta | Descripción |
|-----------|-------------|
| **perfil/** | Fotos de perfil de usuarios (uploads/perfil/perfil_ID.jpg) |

---

### 📁 Carpeta `/vendor` - Dependencias Externas

| Carpeta | Descripción |
|---------|-------------|
| **fpdf186/** | Librería FPDF para generación de PDF |

---

### 📁 Carpeta `/img` - Imágenes Estáticas

Contiene íconos, logos y gráficos del sistema.

---

## ROLES Y FUNCIONES

El sistema tiene 3 roles con permisos jerárquicos:

### 👤 ROL: **ADMIN** (Administrador)

**Datos en BD:** `usuarios.rol = 'admin'`

**Acceso:**
- Todas las módulos del sistema
- Panel de administración completo

#### Funciones:

| Módulo | Funciones |
|--------|-----------|
| **Usuarios** | ✅ Crear nuevos usuarios ✅ Editar datos de usuarios ✅ Asignar roles (admin, jefe, tendero) ✅ Cambiar estado (activo, inactivo, suspendido) ✅ Asignar bodega ✅ Eliminar usuarios ✅ Ver último acceso ✅ Gestionar intentos fallidos |
| **Bodegas** | ✅ Crear bodegas ✅ Editar detalles de bodega ✅ Eliminar bodegas ✅ Ver todas las bodegas del sistema |
| **Productos** | ✅ CRUD completo de productos ✅ Asignar a bodegas ✅ Establecer stock mín/máx ✅ Establecer precios ✅ Definir categoría/subcategoría ✅ Marcar fecha de vencimiento ✅ Búsqueda avanzada ✅ Filtros complejos |
| **Categorías** | ✅ CRUD de categorías y subcategorías ✅ Asignar colores ✅ Cambiar estado (activo/inactivo) |
| **Proveedores** | ✅ CRUD de proveedores ✅ Gestionar datos de contacto |
| **Movimientos** | ✅ Ver todos los movimientos del sistema ✅ Crear movimientos (compras, ventas, ajustes) ✅ Cambiar estado ✅ Cancelar movimientos ✅ Ver detalles |
| **Devoluciones** | ✅ CRUD de devoluciones ✅ Cambiar estado (pendiente, aprobada, procesada) |
| **Transferencias** | ✅ CRUD de transferencias entre bodegas ✅ Rastrear transferencias |
| **Parámetros** | ✅ Crear parámetros (estados de producto) ✅ Editar parámetros ✅ Eliminar parámetros |
| **Reportes** | ✅ Ver reportes agregados del sistema ✅ Filtrar por bodega, categoría, fechas ✅ Exportar PDF ✅ Exportar Excel ✅ Ver gráficos de tendencias |
| **Perfil** | ✅ Editar perfil personal ✅ Cambiar contraseña ✅ Actualizar foto |

---

### 🏭 ROL: **JEFE BODEGA** (Jefe de Bodega)

**Datos en BD:** `usuarios.rol = 'jefe_bodega'`

**Acceso:**
- Módulo "Mi Bodega" (vista especial para su bodega asignada)
- Parámetros (solo lectura de categorías)
- Perfil personal
- Módulos limitados para su bodega

#### Funciones:

| Módulo | Funciones |
|--------|-----------|
| **Mi Bodega** | ✅ Ver todos los productos de su bodega ✅ Crear movimientos (compras, devoluciones) ✅ Ver movimientos propios ✅ Transferir productos a otras bodegas ✅ Ver notificaciones de invitaciones ✅ Compartir bodega con otros jefes ✅ Actualizar permisos de jefes invitados ✅ Revocar acceso a bodega ✅ Ver bodegas compartidas con él |
| **Productos** | ✅ Ver productos de su bodega ✅ Crear productos en su bodega ✅ Editar productos propios (stock, precio) ✅ Eliminar productos propios ✅ NO puede ver productos de otras bodegas |
| **Movimientos** | ✅ Crear movimientos (entrada, salida) ✅ Ver movimientos de su bodega ✅ Cambiar estado ✅ NO puede ver movimientos de otras bodegas |
| **Devoluciones** | ✅ Crear devoluciones ✅ Ver devoluciones de su bodega ✅ Cambiar estado |
| **Transferencias** | ✅ Crear transferencias de su bodega a otras ✅ Ver transferencias donde es origen |
| **Reportes** | ✅ Ver reportes de su bodega ✅ Filtros limitados a su bodega |
| **Compartir Bodega** | ✅ Invitar a otros jefes a colaborar ✅ Asignar permisos (lectura, edición, eliminación) ✅ Actualizar permisos existentes ✅ Revocar acceso a colaboradores ✅ Ver historial de invitaciones |
| **Perfil** | ✅ Editar perfil personal ✅ Cambiar contraseña ✅ Actualizar foto |

---

### 🏪 ROL: **TENDERO** (Vendedor/Consultor)

**Datos en BD:** `usuarios.rol = 'tendero'`

**Acceso:**
- Módulo "Consulta de Inventario" (solo lectura)
- Perfil personal

#### Funciones:

| Módulo | Funciones |
|--------|-----------|
| **Consulta de Inventario** | ✅ Buscar productos por nombre, SKU, categoría ✅ Ver stock disponible ✅ Ver precios ✅ Ver categoría y subcategoría ✅ Ver si está próximo a vencer ✅ Ver bodega donde se encuentra ✅ Filtrar por categoría ✅ Ver estadísticas de productos (total, con stock, sin stock) ✅ NO puede modificar nada |
| **Perfil** | ✅ Editar perfil personal ✅ Cambiar contraseña ✅ Actualizar foto |

**Limitaciones:**
- ❌ No puede ver módulo de administración
- ❌ No puede crear, editar ni eliminar
- ❌ No puede ver reportes
- ❌ No puede acceder a parámetros

---

## COMPARATIVA DE PERMISOS POR ROL

| Función | Admin | Jefe Bodega | Tendero |
|---------|:-----:|:-----------:|:-------:|
| Crear usuarios | ✅ | ❌ | ❌ |
| Gestionar bodegas | ✅ | ❌ | ❌ |
| Crear productos | ✅ | ✅ (su bodega) | ❌ |
| Ver todos productos | ✅ | ❌ (solo su bodega) | ✅ (lectura) |
| Editar productos | ✅ | ✅ (su bodega) | ❌ |
| Crear movimientos | ✅ | ✅ (su bodega) | ❌ |
| Ver reportes | ✅ | ✅ (su bodega) | ❌ |
| Compartir bodega | ❌ | ✅ | ❌ |
| Gestionar parámetros | ✅ | ❌ | ❌ |
| Editar perfil | ✅ | ✅ | ✅ |

---

## TABLAS DE BASE DE DATOS

### Tabla: `usuarios`

Almacena información de usuarios del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `email` | VARCHAR(255) | Email único del usuario |
| `nombre` | VARCHAR(100) | Nombre completo |
| `identidad` | VARCHAR(20) | Documento de identidad |
| `password` | VARCHAR(255) | Hash bcrypt de contraseña |
| `rol` | ENUM | 'admin' \| 'jefe_bodega' \| 'tendero' |
| `estado` | ENUM | 'activo' \| 'inactivo' \| 'suspendido' |
| `foto_perfil` | VARCHAR(255) | Ruta a imagen de perfil |
| `telefono` | VARCHAR(20) | Número de teléfono |
| `direccion` | TEXT | Dirección del usuario |
| `ultimo_acceso` | DATETIME | Última vez que accedió |
| `intentos_fallidos` | INT | Contador de login fallidos |
| `bloqueado_hasta` | DATETIME | Bloqueo temporal por intentos fallidos |
| `creado_en` | DATETIME | Fecha de creación |
| `actualizado_en` | DATETIME | Última actualización |
| `bodega_asignada_id` | INT | FK a bodegas (para jefe) |

---

### Tabla: `bodegas`

Almacena información de almacenes/bodegas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `nombre` | VARCHAR(100) | Nombre de la bodega (único) |
| `descripcion` | TEXT | Descripción de la bodega |
| `fecha_creacion` | DATETIME | Fecha de creación |
| `fecha_actualizacion` | DATETIME | Última actualización |

---

### Tabla: `bodegas_compartidas`

Relación para compartir bodegas entre jefes con permisos específicos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `bodega_id` | INT | FK a bodegas |
| `propietario_id` | INT | FK a usuarios (jefe dueño) |
| `invitado_id` | INT | FK a usuarios (jefe invitado) |
| `nivel_permiso` | ENUM | 'lectura' \| 'edicion' \| 'eliminacion' |
| `estado` | ENUM | 'pendiente' \| 'aceptada' \| 'rechazada' |
| `fecha_invitacion` | DATETIME | Cuándo se envió la invitación |
| `fecha_respuesta` | DATETIME | Cuándo se respondió |

---

### Tabla: `productos`

Almacena información de productos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `nombre` | VARCHAR(200) | Nombre del producto |
| `proveedor_id` | INT | FK a proveedores |
| `unidad_medida` | VARCHAR(50) | Unidad (pieza, metro, kg, etc) |
| `nit` | VARCHAR(50) | NIT del proveedor |
| `bodega_id` | INT | FK a bodegas |
| `categoria_id` | INT | FK a categorias |
| `subcategoria_id` | INT | FK a subcategorias |
| `stock` | DECIMAL(12,3) | Cantidad actual |
| `stock_min` | DECIMAL(12,3) | Stock mínimo |
| `stock_max` | DECIMAL(12,3) | Stock máximo |
| `precio` | DECIMAL(14,2) | Precio unitario |
| `fecha_vencimiento` | DATE | Fecha de vencimiento |
| `estado_id` | INT | FK a parametros (estado) |
| `fecha_creacion` | DATETIME | Fecha de creación |
| `fecha_actualizacion` | DATETIME | Última actualización |

---

### Tabla: `categorias`

Categorías principales de productos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `nombre` | VARCHAR(50) | Nombre único |
| `descripcion` | VARCHAR(200) | Descripción |
| `color` | VARCHAR(7) | Color hex (#2e6df6) |
| `estado` | ENUM | 'ACTIVO' \| 'INACTIVO' |
| `fecha_creacion` | TIMESTAMP | Fecha creación |
| `fecha_actualizacion` | TIMESTAMP | Última actualización |

---

### Tabla: `subcategorias`

Subcategorías (relación con categorías).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `categoria_id` | INT | FK a categorias |
| `nombre` | VARCHAR(50) | Nombre único |
| `descripcion` | VARCHAR(200) | Descripción |
| `color` | VARCHAR(7) | Color hex |
| `estado` | ENUM | 'ACTIVO' \| 'INACTIVO' |
| `fecha_creacion` | TIMESTAMP | Fecha creación |
| `fecha_actualizacion` | TIMESTAMP | Última actualización |

---

### Tabla: `proveedores`

Información de proveedores.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `nombre` | VARCHAR(150) | Nombre del proveedor |
| `contacto` | VARCHAR(100) | Persona de contacto |
| `telefono` | VARCHAR(20) | Teléfono |
| `email` | VARCHAR(100) | Email |
| `direccion` | TEXT | Dirección |
| `ciudad` | VARCHAR(100) | Ciudad |
| `nit` | VARCHAR(50) | NIT |
| `fecha_creacion` | DATETIME | Fecha creación |
| `fecha_actualizacion` | DATETIME | Última actualización |

---

### Tabla: `movimientos`

Registra movimientos de inventario (entradas y salidas).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `tipo` | ENUM | 'entrada' \| 'salida' |
| `referencia` | VARCHAR(100) | Número de referencia (PO, factura) |
| `tipo_detalle` | VARCHAR(80) | 'Compra', 'Devolución', 'Venta', 'Ajuste', etc |
| `proveedor_id` | INT | FK a proveedores (solo para entrada) |
| `cliente` | VARCHAR(150) | Nombre del cliente (solo para salida) |
| `notas` | TEXT | Notas adicionales |
| `total` | DECIMAL(14,2) | Total del movimiento |
| `usuario_id` | INT | FK a usuarios (quién creó) |
| `estado` | ENUM | 'pendiente' \| 'confirmado' \| 'anulado' |
| `fecha_creacion` | DATETIME | Fecha de creación |
| `fecha_actualizacion` | DATETIME | Última actualización |

---

### Tabla: `movimientos_detalle`

Detalle de movimientos (productos individuales).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `movimiento_id` | INT | FK a movimientos |
| `producto_id` | INT | FK a productos |
| `cantidad` | DECIMAL(12,3) | Cantidad movida |
| `precio_unit` | DECIMAL(14,2) | Precio unitario en momento |
| `subtotal` | DECIMAL(14,2) | Cantidad × Precio |

---

### Tabla: `devoluciones`

Registra devoluciones de clientes y proveedores.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `referencia` | VARCHAR(100) | Número de referencia |
| `tipo` | ENUM | 'De Cliente' \| 'A Proveedor' |
| `producto_id` | INT | FK a productos |
| `cantidad` | DECIMAL(12,3) | Cantidad devuelta |
| `estado` | ENUM | 'Pendiente' \| 'Aprobada' \| 'Rechazada' \| 'Procesada' |
| `cliente_proveedor` | VARCHAR(150) | Nombre del cliente/proveedor |
| `motivo` | TEXT | Razón de devolución |
| `notas` | TEXT | Notas adicionales |
| `usuario_id` | INT | FK a usuarios |
| `fecha_creacion` | DATETIME | Fecha creación |
| `fecha_actualizacion` | DATETIME | Última actualización |

---

### Tabla: `transferencias`

Registra transferencias de productos entre bodegas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `bodega_origen_id` | INT | FK a bodegas (origen) |
| `bodega_destino_id` | INT | FK a bodegas (destino) |
| `producto_id` | INT | FK a productos |
| `cantidad` | DECIMAL(12,3) | Cantidad transferida |
| `usuario_id` | INT | FK a usuarios (quién realizó) |
| `estado` | ENUM | 'pendiente' \| 'completada' \| 'cancelada' |
| `notas` | TEXT | Notas |
| `fecha_creacion` | DATETIME | Fecha creación |
| `fecha_actualizacion` | DATETIME | Última actualización |

---

### Tabla: `conceptos_inventario`

Conceptos para clasificar movimientos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `nombre` | VARCHAR(100) | Nombre del concepto |
| `descripcion` | TEXT | Descripción |
| `tipo` | ENUM | 'entrada' \| 'salida' \| 'ajuste' |
| `fecha_creacion` | TIMESTAMP | Fecha creación |
| `fecha_actualizacion` | TIMESTAMP | Última actualización |

**Ejemplos:**
- "Entrada de Mercancía" (entrada)
- "Devolución de Cliente" (salida)
- "Ajuste de Inventario" (ajuste)
- "Merma" (salida)

---

### Tabla: `parametros`

Parámetros personalizables (estados de producto, colores, etc).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `codigo` | VARCHAR(10) | Código único (001, 002, etc) |
| `nombre` | VARCHAR(50) | Nombre (Activo, Inactivo, Roto) |
| `descripcion` | TEXT | Descripción |
| `color` | CHAR(7) | Color hex |
| `fecha_creacion` | DATETIME | Fecha creación |
| `fecha_actualizacion` | DATETIME | Última actualización |

**Ejemplos:**
- Código 001: "Activo" (color verde)
- Código 002: "Inactivo" (color naranja)
- Código 003: "Roto" (color rojo)

---

### Tabla: `notificaciones`

Notificaciones del sistema para usuarios.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `usuario_id` | INT | FK a usuarios |
| `tipo` | VARCHAR(50) | Tipo de notificación |
| `titulo` | VARCHAR(150) | Título corto |
| `mensaje` | TEXT | Contenido completo |
| `referencia_id` | INT | ID relacionado (ej: bodegas_compartidas.id) |
| `leida` | TINYINT(1) | 0 = no leída, 1 = leída |
| `fecha` | DATETIME | Cuándo se creó |

---

### Tabla: `auditoria`

Registro de todas las acciones del sistema (auditoría).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT | Identificador único |
| `usuario_id` | INT | FK a usuarios (quién hizo) |
| `accion` | VARCHAR(100) | Tipo de acción ('login', 'logout', 'crear', 'editar', 'eliminar') |
| `tabla_afectada` | VARCHAR(100) | Tabla modificada |
| `registro_id` | INT | ID del registro afectado |
| `datos_anteriores` | JSON | Datos antes del cambio |
| `datos_nuevos` | JSON | Datos después del cambio |
| `ip_address` | VARCHAR(45) | IP del usuario |
| `user_agent` | TEXT | Navegador/cliente |
| `creado_en` | DATETIME | Cuándo ocurrió |

---

## ARQUITECTURA TÉCNICA

### Flujo de Datos

```

┌─────────────────────────────────────────┐
│  CLIENTE (Navegador)                    │
│  HTML + CSS + JavaScript                │
│  - view/*.html (páginas)                │
│  - controllers/*.js (lógica)            │
│  - styles/*.css (estilos)               │
└──────┬──────────────────────────────────┘
       │
       │ AJAX/Fetch JSON
       │
       ▼
┌─────────────────────────────────────────┐
│  SERVIDOR WEB (Apache en XAMPP)         │
│  PHP 7.4+                               │
│  - auth/*.php (autenticación)           │
│  - database/*.php (CRUD endpoints)      │
└──────┬──────────────────────────────────┘
       │
       │ Consultas SQL
       │
       ▼
┌─────────────────────────────────────────┐
│  BASE DE DATOS (MySQL/MariaDB)          │
│  tables:                                │
│  - usuarios                             │
│  - bodegas                              │
│  - productos                            │
│  - movimientos                          │
│  - etc.                                 │
└─────────────────────────────────────────┘

```

### Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla ES6) |
| **Backend** | PHP 7.4+ |
| **Base de Datos** | MySQL 5.7+ / MariaDB 10.4+ |
| **Servidor Web** | Apache 2.4 (XAMPP) |
| **Librerías** | FPDF186 (PDF) |

### Convenciones de Código

#### Endpoints PHP

```php
// Esquema típico en /database/*.php
<?php
require '../auth/verificar_sesion.php';
require '../auth/conexion.php';

$action = $_GET['action'] ?? '';

switch($action) {
  case 'listar':
    $sql = "SELECT * FROM tabla";
    // ...
    echo json_encode(['success' => true, 'data' => $data]);
    break;
    
  case 'crear':
    // Validar permisos
    verificarRol(['admin', 'jefe_bodega']);
    // Insertar
    echo json_encode(['success' => true, 'id' => $id]);
    break;
}
?>
```

#### Llamadas AJAX desde JavaScript

```javascript
// Patrón de fetch típico
async function cargarDatos() {
  try {
    const response = await fetch(
      '../database/modulo.php?action=listar',
      { credentials: 'include' }  // Mantener sesión
    );
    const data = await response.json();
    
    if (!data.success) {
      mostrarError(data.message);
      return;
    }
    
    estado.items = data.data;
    renderizar();
  } catch(error) {
    console.error('Error:', error);
  }
}
```

### Consideraciones de Seguridad

✅ **Autenticación:**
- Sesiones PHP seguras (`session_start()`)
- Passwords hasheadas con bcrypt
- Validación de sesión en cada request

✅ **Autorización:**
- Verificación de rol en cada endpoint
- Restricción de datos por bodega asignada
- Función `verificarRol()` en `/database/verificar_rol.php`

✅ **Datos:**
- Prepared statements en consultas SQL (previene SQL injection)
- Validación de entrada en frontend y backend
- Sanitización de datos

✅ **Auditoría:**
- Tabla `auditoria` registra todas las acciones
- Incluye IP, navegador, datos anteriores/nuevos

---

## REQUISITOS DE INSTALACIÓN

### Requisitos Mínimos

- **OS:** Windows 10+ (configurado para XAMPP)
- **Servidor Web:** Apache 2.4+
- **PHP:** 7.4+ (recomendado 8.0+)
- **BD:** MySQL 5.7+ o MariaDB 10.4+
- **Navegador:** Chrome, Firefox, Safari, Edge (ES6 compatible)

### Pasos de Instalación

1. **Copiar archivos a XAMPP:**
   ```bash
   cp -r Pro-Stock-Tool/ c:\xampp\htdocs\
   ```

2. **Importar base de datos:**
   ```bash
   mysql -u root -p < base.sql
   ```

3. **Configurar credenciales BD:**
   - Editar `auth/conexion.php`
   - Editar `database/conexion.php`

4. **Iniciar servicios:**
   - Apache: Abrir XAMPP y click en "Start" para Apache
   - MySQL: Click en "Start" para MySQL

5. **Acceder:**
   - Abrir navegador en `http://localhost/Pro-Stock-Tool/login.html`

### Credenciales de Prueba

**Usuario Admin:**
- Email: `nombre@soy.sena.edu.co`
- Contraseña: Verificar en BD (hasheada)

**Usuario Jefe Bodega:**
- Email: `jefe@ferreteria.com`

**Usuario Tendero:**
- Email: `tendero@ferreteria.com`

---

## MANTENIMIENTO Y EXTENSIÓN

### Cómo Agregar un Nuevo Módulo

#### 1. Crear tabla en BD
```sql
CREATE TABLE nuevo_modulo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Crear endpoint en `/database/nuevo_modulo.php`
```php
<?php
require '../auth/verificar_sesion.php';
// ... lógica CRUD
?>
```

#### 3. Crear controlador en `/controllers/nuevo_modulo.js`
```javascript
const API = '../database/nuevo_modulo.php';
async function cargar() { /* fetch */ }
// ... funciones
```

#### 4. Crear vista en `/view/nuevo_modulo.html`
```html
<script src="../controllers/nuevo_modulo.js"></script>
```

#### 5. Agregar al menú en `/view/index.html`

---

## SOPORTE Y CONTACTO

Para preguntas o reportar bugs:
- Revisar logs en navegador (F12 > Console)
- Revisar BD directamente con phpMyAdmin
- Verificar permisos en tabla `usuarios`

---

**Última actualización:** 9 de marzo de 2026
**Versión:** 1.0
