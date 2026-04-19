// =============================================================
//  permisos.js  —  Utilidades de Roles y Permisos (Cliente)
//  Ubicación: controllers/permisos.js
//  Uso: <script src="../controllers/permisos.js"></script>
//  Cargar ANTES de los scripts de cada módulo.
// =============================================================

/**
 * Devuelve el objeto usuario almacenado en localStorage.
 */
function obtenerUsuarioActual() {
    try {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : { nombre: 'Usuario', email: '', rol: 'tendero' };
    } catch (e) {
        return { nombre: 'Usuario', email: '', rol: 'tendero' };
    }
}

/** Devuelve el rol del usuario actual. */
function obtenerRolUsuario() {
    return obtenerUsuarioActual().rol || 'tendero';
}

/** Comprueba si el usuario es administrador. */
function esAdmin() {
    return obtenerRolUsuario() === 'admin';
}

/** Comprueba si el usuario es jefe de bodega. */
function esJefeBodega() {
    return obtenerRolUsuario() === 'jefe_bodega';
}

/** Comprueba si el usuario es tendero. */
function esTendero() {
    return obtenerRolUsuario() === 'tendero';
}

// ──────────────────────────────────────────────────────────────
//  PERMISOS POR MÓDULO
// ──────────────────────────────────────────────────────────────

/**
 * ¿Puede el usuario crear, editar o eliminar registros?
 * Solo el admin puede escribir en los módulos globales.
 */
function puedeEscribir() {
    return esAdmin();
}

/** ¿Puede el usuario eliminar registros? */
function puedeEliminar() {
    return esAdmin();
}

/**
 * ¿Puede el usuario ver el módulo de movimientos del tipo dado?
 * - admin:       ve todos (entrada, salida, transferencias, devoluciones)
 * - jefe_bodega: solo transferencias y devoluciones
 * - tendero:     ninguno por ahora (se definirá en fases siguientes)
 *
 * @param {'entrada'|'salida'|'transferencias'|'devoluciones'} tipo
 */
function puedeVerMovimiento(tipo) {
    if (esAdmin()) return true;
    if (esJefeBodega()) return ['transferencias', 'devoluciones'].includes(tipo);
    return false;
}

/**
 * ¿Puede el usuario acceder a la página indicada?
 * @param {string} pagina  Nombre del archivo HTML (ej: 'parametros.html')
 */
function puedeAccederPagina(pagina) {
    const rol = obtenerRolUsuario();

    const accesoPorRol = {
        admin: [
            'index.html','productos.html','categoria.html','proveedores.html',
            'bodega.html','movimientos.html','devoluciones.html','transferencias.html',
            'parametros.html','reportes.html','perfil.html','usuarios.html'
        ],
        jefe_bodega: [
            'index.html','productos.html','categoria.html','proveedores.html',
            'bodega.html','transferencias.html','devoluciones.html',
            'reportes.html','perfil.html','mi-bodega.html'
        ],
        tendero: [
            'index.html','perfil.html'
            // Se ampliará en fases posteriores
        ]
    };

    return (accesoPorRol[rol] || []).includes(pagina);
}

// ──────────────────────────────────────────────────────────────
//  MODO SOLO LECTURA — Aplicar en cada página
// ──────────────────────────────────────────────────────────────

/**
 * Oculta todos los botones y controles de escritura para usuarios
 * que no tengan permiso de escritura.
 * Llama esta función al final del DOMContentLoaded de cada módulo.
 */
function aplicarModoSoloLectura() {
    if (puedeEscribir()) return; // Admin: nada que ocultar

    // ── Ocultar botones de creación / acción ────────────────
    const selectoresOcultar = [
        // Botones genéricos de agregar / nuevo
        '.btn-agregar',
        '.btn-nuevo',
        '.btn-crear',
        '.btn-add',
        '.btn-primary[onclick]',
        // Íconos de acción en tablas
        '.action-btn',
        '.btn-editar',
        '.btn-eliminar',
        '.btn-edit',
        '.btn-delete',
        // Atributos data-action
        '[data-action="crear"]',
        '[data-action="editar"]',
        '[data-action="eliminar"]',
        // Columna de acciones en tablas (último th/td cuando tiene botones)
        'td.acciones',
        'th.acciones',
        'td.col-acciones',
        'th.col-acciones',
        // Formularios flotantes / modales de edición
        '.modal-form',
        '.form-actions',
        // FAB (Floating Action Button)
        '.fab-btn',
        '.fab'
    ];

    selectoresOcultar.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.style.display = 'none';
        });
    });

    // ── Deshabilitar inputs dentro de formularios ────────────
    document.querySelectorAll(
        'form input:not([type="search"]):not([type="text"].filter-input), form select, form textarea'
    ).forEach(el => {
        el.disabled = true;
        el.setAttribute('readonly', 'readonly');
    });

    // ── Badge visual de "Solo lectura" en el título ──────────
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle && !pageTitle.querySelector('.badge-readonly')) {
        const badge = document.createElement('span');
        badge.className = 'badge-readonly';
        badge.textContent = '👁 Solo lectura';
        badge.style.cssText = [
            'margin-left:10px',
            'font-size:11px',
            'background:var(--color-warning,#f0ad4e)',
            'color:#fff',
            'padding:3px 10px',
            'border-radius:20px',
            'vertical-align:middle',
            'font-weight:600',
            'letter-spacing:.4px'
        ].join(';');
        pageTitle.appendChild(badge);
    }
}

// ──────────────────────────────────────────────────────────────
//  GUARD DE PÁGINA — Redirigir si no tiene acceso
// ──────────────────────────────────────────────────────────────

/**
 * Verifica si el usuario puede acceder a la página actual.
 * Si no, lo redirige al dashboard con un aviso.
 * Llama esta función al inicio del DOMContentLoaded.
 */
function guardarAccesoPagina() {
    const pagina = window.location.pathname.split('/').pop() || 'index.html';
    if (!puedeAccederPagina(pagina)) {
        // Redirigir sin alert para no interrumpir; usamos sessionStorage para mostrar toast
        try {
            sessionStorage.setItem(
                'acceso_denegado',
                `No tienes permiso para acceder a "${pagina}".`
            );
        } catch(e) {}
        window.location.href = '../view/index.html';
    }
}

/**
 * Si se redirigió por acceso denegado, muestra un toast en el dashboard.
 * Llamar en index.html / dashboard.
 */
function mostrarAvisoDenegado() {
    try {
        const msg = sessionStorage.getItem('acceso_denegado');
        if (msg) {
            sessionStorage.removeItem('acceso_denegado');
            mostrarToastPermiso(msg);
        }
    } catch(e) {}
}

/** Muestra un toast de advertencia de permisos. */
function mostrarToastPermiso(mensaje) {
    const toast = document.createElement('div');
    toast.textContent = mensaje;
    toast.style.cssText = [
        'position:fixed',
        'bottom:20px',
        'right:20px',
        'background:#e74c3c',
        'color:#fff',
        'padding:12px 20px',
        'border-radius:8px',
        'font-size:14px',
        'z-index:9999',
        'box-shadow:0 4px 12px rgba(0,0,0,.2)',
        'animation:slideInRight .3s ease'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}