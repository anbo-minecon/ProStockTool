document.addEventListener("DOMContentLoaded", async () => {
    await verificarSesionActiva();
    // ── CONTEXTO DE BODEGA ACTIVA (solo para jefe_bodega) ──────
    // Cargar scripts de contexto si el rol es jefe_bodega
    const usuarioActual = obtenerUsuario();
    if (usuarioActual.rol === 'jefe_bodega') {
        // Cargar bodega-context.js dinámicamente si no está cargado
        if (!window.BodegaContext) {
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = '../controllers/bodega-context.js';
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }
        // Cargar bodega-selector.js dinámicamente si no está cargado
        if (!window.BodegaSelector) {
            await new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = '../controllers/bodega-selector.js';
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }
        // Inicializar el selector (inyecta en el header automáticamente)
        await BodegaSelector.inicializar();
    }

    // Inicializar tema (clase en <body>) según preferencia guardada
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    } catch (e) {}

    const config = {
        "index.html":         { titulo: "Panel Principal" },
        "productos.html":     { titulo: "Productos" },
        "categoria.html":     { titulo: "Categorías" },
        "bodega.html":        { titulo: "Bodegas" },
        "usuarios.html":      { titulo: "Gestión de Usuarios" },
        "parametros.html":    { titulo: "Parámetros" },
        "proveedores.html":   { titulo: "Proveedores" },
        "movimientos.html":   { titulo: "Movimientos" },
        "devoluciones.html":  { titulo: "Devoluciones" },
        "transferencias.html":{ titulo: "Transferencias" },
        "reportes.html":      { titulo: "Reportes y Gráficos" },
        "perfil.html":        { titulo: "Mi Perfil" } 
    };

    function getBasePath() {
        return window.location.pathname.includes('/view/') ? '../' : './';
    }

    const basePath = getBasePath();
    const page     = window.location.pathname.split("/").pop() || "index.html";
    const titulo   = config[page]?.titulo || "Pro Stock Tool";

    let usuario = obtenerUsuario();

    // Title + Favicon
    document.title = titulo + " - Pro Stock Tool";
    document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
    const fav = document.createElement("link");
    fav.rel  = "icon"; fav.type = "image/svg+xml";
    fav.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M20 4L4 12L20 20L36 12L20 4Z' fill='%234a90e2'/%3E%3Cpath d='M4 20L20 28L36 20' stroke='%234a90e2' stroke-width='2'/%3E%3Cpath d='M4 28L20 36L36 28' stroke='%234a90e2' stroke-width='2'/%3E%3C/svg%3E";
    document.head.appendChild(fav);

    // Páginas del módulo Movimientos (para mantener sub-nav expandido)
    const movPages = ['movimientos.html','devoluciones.html','transferencias.html'];
    const isMovPage = movPages.includes(page);

    // ──────────────────────────────────────────
    // HEADER
    // ──────────────────────────────────────────
    const header = `
    <header>
        <div class="header-left">
            <button class="menu-toggle mobile-only"  id="mobileMenuToggle"  aria-label="Toggle menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="6"  x2="21" y2="6"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>
            <button class="menu-toggle desktop-only" id="desktopMenuToggle" aria-label="Toggle sidebar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="6"  x2="21" y2="6"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>
            <a href="${basePath}view/index.html" class="logo">
                <svg class="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4L4 12L20 20L36 12L20 4Z" fill="#4a90e2"/>
                    <path d="M4 20L20 28L36 20" stroke="#4a90e2" stroke-width="2"/>
                    <path d="M4 28L20 36L36 28" stroke="#4a90e2" stroke-width="2"/>
                </svg>
                <div class="logo-text-container">
                    <span class="logo-text">PRO</span>
                    <span class="logo-text">STOCK</span>
                    <span class="logo-text">TOOL</span>
                </div>
            </a>
            <h1 class="page-title">${titulo}</h1>
        </div>
        <div class="header-right">
            <div class="search-box">
                <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" class="search-input" placeholder="Buscar un producto...">
            </div>
            <button class="notification-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
            </button>
            <button class="theme-toggle" id="themeToggle" title="Cambiar tema" aria-label="Alternar modo oscuro" style="background:none;border:none;padding:8px;border-radius:6px;">
                <svg id="themeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            </button>
            <div class="user-info" id="userInfo">
                <div class="user-details">
                    <div class="user-name">${usuario.nombre || 'Usuario'}</div>
                    <div class="user-role">${usuario.email || 'email@example.com'}</div>
                    <div class="user-role-sub">${traducirRol(usuario.rol)}</div>
                </div>
                <div class="user-avatar">${obtenerIniciales(usuario.nombre)}</div>
            </div>
        </div>
    </header>

    <div class="user-dropdown" id="userDropdown">
        <div class="user-dropdown-header">
            <div class="user-avatar-large">${obtenerIniciales(usuario.nombre)}</div>
            <div>
                <div class="user-dropdown-name">${usuario.nombre || 'Usuario'}</div>
                <div class="user-dropdown-email">${usuario.email || 'email@example.com'}</div>
            </div>
        </div>
        <div class="user-dropdown-divider"></div>
        <a href="../view/perfil.html" class="user-dropdown-item" id="miPerfil">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            Mi Perfil
        </a>
        <a href="#" class="user-dropdown-item" id="configuracion">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 18.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 14a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3.68a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.4 1 .4 2.1 0 3.1a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Configuración
        </a>
        <div class="user-dropdown-divider"></div>
        <a href="#" class="user-dropdown-item user-dropdown-logout" id="cerrarSesion">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar Sesión
        </a>
    </div>`;

    // ──────────────────────────────────────────
    // NAV
    // ──────────────────────────────────────────

    // Helper para sub-item activo en movimientos.html según ?tab=
    function isActiveSub(subPage, tab) {
        if (page === 'movimientos.html' && subPage === 'movimientos.html') {
            const urlTab = new URLSearchParams(window.location.search).get('tab') || 'entrada';
            return urlTab === tab;
        }
        return page === subPage;
    }

    // ── Construcción dinámica del nav según rol ──────────────
    const rol = usuario.rol || 'tendero';
    const isAdmin      = rol === 'admin';
    const isJefeBodega = rol === 'jefe_bodega';

    // ── Items de nav compartidos (helpers) ──────────────────
    const navItem = (href, pageKey, title, iconSvg, label, badgeSoloLectura = false) => `
        <a href="${basePath}view/${href}"
           class="nav-item ${page===pageKey?'active':''}" title="${title}">
            <span class="nav-icon">${iconSvg}</span>
            <span class="nav-text">${label}${badgeSoloLectura && isJefeBodega
                ? ' <span class="nav-badge-ro" title="Solo lectura">👁</span>'
                : ''
            }</span>
        </a>`;

    const svgDashboard = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`;
    const svgProductos = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
    const svgCategorias = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
    const svgProveedores = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    const svgBodega = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`;
    const svgMovimientos = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
    const svgParametros = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 18.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 14a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3.68a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.4 1 .4 2.1 0 3.1a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    const svgReportes = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
    const svgMiBodega = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    const svgUsuarios = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

    // ── Sub-items de Movimientos según rol ──────────────────
    const subMovAdmin = `
        <a href="../view/movimientos.html?tab=entrada"
           class="sub-nav-item ${isActiveSub('movimientos.html','entrada')?'active-sub':''}" title="Entrada de Productos">
            <span style="display:inline-flex;align-items:center;gap:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                Entrada de Productos
            </span>
        </a>
        <a href="../view/movimientos.html?tab=salida"
           class="sub-nav-item ${isActiveSub('movimientos.html','salida')?'active-sub':''}" title="Salida de Productos">
            <span style="display:inline-flex;align-items:center;gap:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="8 7 12 3 16 7"/><line x1="12" y1="21" x2="12" y2="3"/></svg>
                Salida de Productos
            </span>
        </a>`;

    const subMovDevoluciones = `
        <a href="../view/devoluciones.html"
           class="sub-nav-item ${page==='devoluciones.html'?'active-sub':''}" title="Devoluciones">
            <span style="display:inline-flex;align-items:center;gap:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.6"/></svg>
                Devoluciones
            </span>
        </a>`;

    const subMovTransferencias = `
        <a href="../view/transferencias.html"
           class="sub-nav-item ${page==='transferencias.html'?'active-sub':''}" title="Transferencias">
            <span style="display:inline-flex;align-items:center;gap:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                Transferencias
            </span>
        </a>`;

    // Sub-items visibles según rol
    const subMovItems = isAdmin
        ? subMovAdmin + subMovDevoluciones + subMovTransferencias
        : isJefeBodega
            ? subMovDevoluciones + subMovTransferencias   // solo lectura
            : '';                                         // tendero: sin movimientos

    const blockMovimientos = (isAdmin || isJefeBodega) ? `
        <div class="nav-item-expandable">
            <div class="nav-item ${isMovPage?'active':''}"
                 id="navMovimientos" data-toggle="movimientos"
                 title="Movimientos" style="cursor:pointer;">
                <span class="nav-icon">${svgMovimientos}</span>
                <span class="nav-text">Movimientos</span>
                <span class="expand-icon" id="expandMovimientos">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </span>
            </div>
            <div class="sub-nav ${isMovPage?'expanded':''}" id="subNavMovimientos">
                ${subMovItems}
            </div>
        </div>` : '';

    // ── Nav exclusivo Jefe de Bodega: Mi Bodega ─────────────
    const blockMiBodega = isJefeBodega ? `
        <a href="../view/mi-bodega.html"
           class="nav-item ${page==='mi-bodega.html'?'active':''} nav-item-mibodega" title="Mi Bodega">
            <span class="nav-icon">${svgMiBodega}</span>
            <span class="nav-text">Mi Bodega
                <span class="nav-badge-exclusive" title="Exclusivo para Jefe de Bodega">★</span>
            </span>
        </a>` : '';

    // ── Nav exclusivo Admin: Gestión de Usuarios ─────────────
    const blockUsuarios = isAdmin ? `
        <a href="../view/usuarios.html"
           class="nav-item ${page==='usuarios.html'?'active':''} nav-item-usuarios" title="Gestión de Usuarios">
            <span class="nav-icon">${svgUsuarios}</span>
            <span class="nav-text">Gestión de Usuarios
                <span class="nav-badge-exclusive" title="Exclusivo para Administrador">★</span>
            </span>
        </a>` : '';

    const nav = `
    <nav id="sidebar">

        <!-- Dashboard — visible para todos -->
        ${navItem('index.html', 'index.html', 'Panel Principal', svgDashboard, 'Panel principal')}

        <!-- Productos — admin (R/W) y jefe_bodega (R) -->
        ${(isAdmin || isJefeBodega) ? navItem('productos.html','productos.html','Productos',svgProductos,'Productos',true) : ''}

        <!-- Categorías — admin (R/W) y jefe_bodega (R) -->
        ${(isAdmin || isJefeBodega) ? navItem('categoria.html','categoria.html','Categorías',svgCategorias,'Categorías',true) : ''}

        <!-- Proveedores — admin (R/W) y jefe_bodega (R) -->
        ${(isAdmin || isJefeBodega) ? navItem('proveedores.html','proveedores.html','Proveedores',svgProveedores,'Proveedores',true) : ''}

        <!-- Bodegas — admin (R/W) y jefe_bodega (R) -->
        ${(isAdmin || isJefeBodega) ? navItem('bodega.html','bodega.html','Gestión de Bodegas',svgBodega,'Gestión de Bodegas',true) : ''}

        <!-- Movimientos (expandible) — según rol -->
        ${blockMovimientos}

        <!-- Parámetros — solo admin -->
        ${isAdmin ? navItem('parametros.html','parametros.html','Parámetros',svgParametros,'Parámetros') : ''}

        <!-- Reportes — admin (R/W) y jefe_bodega (R) -->
        ${(isAdmin || isJefeBodega) ? navItem('reportes.html','reportes.html','Reportes y Gráficos',svgReportes,'Reportes',true) : ''}

        <!-- Mi Bodega — exclusivo jefe_bodega -->
        ${blockMiBodega}

        <!-- Gestión de Usuarios — exclusivo admin -->
        ${blockUsuarios}

    </nav>`;

    const overlay = `<div class="sidebar-overlay" id="sidebarOverlay"></div>`;

    document.body.insertAdjacentHTML("afterbegin", header);
    document.body.insertAdjacentHTML("beforeend", nav);
    document.body.insertAdjacentHTML("beforeend", overlay);

    // ── Estilos para badges de rol en nav ──
    const roleStyles = `
    <style id="role-nav-styles">
        .nav-badge-ro {
            font-size: 11px;
            opacity: .65;
            margin-left: 4px;
            vertical-align: middle;
        }
        .nav-badge-exclusive {
            font-size: 11px;
            color: #f0ad4e;
            margin-left: 4px;
            vertical-align: middle;
        }
        .nav-item-mibodega {
            border-top: 1px solid var(--border-color, rgba(255,255,255,.1));
            margin-top: 6px;
            padding-top: 10px;
        }
        .nav-item-usuarios {
            border-top: 1px solid var(--border-color, rgba(255,255,255,.1));
            margin-top: 6px;
            padding-top: 10px;
        }
        .badge-readonly {
            display: inline-block;
            margin-left: 10px;
            font-size: 11px;
            background: #f0ad4e;
            color: #fff;
            padding: 3px 10px;
            border-radius: 20px;
            vertical-align: middle;
            font-weight: 600;
            letter-spacing: .4px;
        }
    </style>`;
    document.head.insertAdjacentHTML('beforeend', roleStyles);

    // ── Guard: verificar acceso a la página actual ──
    // (solo si permisos.js está cargado)
    if (typeof guardarAccesoPagina === 'function') {
        guardarAccesoPagina();
    }

    // ----- Global search overlay setup -----
    const searchOverlayHtml = `
    <div id="searchOverlay" class="search-overlay">
        <div class="search-modal">
            <input type="text" id="overlaySearchInput" class="search-input" placeholder="Buscar productos...">
            <div id="searchResults" class="search-results"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', searchOverlayHtml);

    const headerSearchInput = document.querySelector('.search-box .search-input');
    const overlaySearchInput = document.getElementById('overlaySearchInput');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchResults = document.getElementById('searchResults');

    // Synchronize inputs and show overlay
    function openSearchOverlay() {
        if (!searchOverlay) return;
        searchOverlay.classList.add('active');
        overlaySearchInput.value = headerSearchInput.value;
        overlaySearchInput.focus();
        performSearch(overlaySearchInput.value);
    }

    function closeSearchOverlay() {
        if (!searchOverlay) return;
        searchOverlay.classList.remove('active');
        searchResults.innerHTML = '';
    }

    function renderSearchResults(items) {
        if (!searchResults) return;
        if (items.length === 0) {
            searchResults.innerHTML = '<p>No se encontraron productos.</p>';
            return;
        }
        searchResults.innerHTML = items.map(i => 
            `<div class="search-result-item" data-id="${i.id}">
                <span class="result-name">${escapeHtml(i.nombre)}</span>
                <span class="result-sub">SKU: ${escapeHtml(i.sku||'')} - Bodega: ${escapeHtml(i.bodega)} - Cat: ${escapeHtml(i.categoria)}</span>
            </div>`
        ).join('');
        searchResults.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const name = el.querySelector('.result-name')?.textContent || '';
                window.location.href = basePath + 'view/productos.html?search=' + encodeURIComponent(name.trim());
            });
        });
    }

    let searchTimeout;
    function performSearch(q) {
        q = q.trim();
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            if (!q) { searchResults.innerHTML = ''; return; }
            try {
                const resp = await fetch('../database/search.php?q=' + encodeURIComponent(q));
                const data = await resp.json();
                if (data.success) renderSearchResults(data.data || []);
                else searchResults.innerHTML = '<p>Error en la búsqueda</p>';
            } catch(e) {
                console.error('Search error', e);
                searchResults.innerHTML = '<p>Error al conectar</p>';
            }
        }, 300);
    }

    if (headerSearchInput) {
        headerSearchInput.addEventListener('focus', openSearchOverlay);
        headerSearchInput.addEventListener('input', () => openSearchOverlay());
    }
    if (overlaySearchInput) {
        overlaySearchInput.addEventListener('input', () => {
            headerSearchInput.value = overlaySearchInput.value;
            performSearch(overlaySearchInput.value);
        });
        overlaySearchInput.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeSearchOverlay();
                headerSearchInput.blur();
            }
        });
    }
    if (searchOverlay) {
        searchOverlay.addEventListener('click', e => {
            if (e.target === searchOverlay) {
                closeSearchOverlay();
                headerSearchInput.blur();
            }
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
                closeSearchOverlay();
                headerSearchInput.blur();
            }
        });
    }

    // Listener para toggle de tema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            try { localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); } catch(e) {}
            // Actualizar icono (opcional simple swap)
            const icon = document.getElementById('themeIcon');
            if (icon) {
                if (document.body.classList.contains('dark-mode')) {
                    icon.innerHTML = '<path d="M12 3v1M12 20v1M4.2 4.2l.7.7M18.1 18.1l.7.7M1 12h1M22 12h1M4.2 19.8l.7-.7M18.1 5.9l.7-.7" /><circle cx="12" cy="12" r="4" />';
                    icon.setAttribute('stroke', '#f5f5f5');
                } else {
                    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />';
                    icon.setAttribute('stroke', '#666');
                }
            }
        });
    }

    // Inicializar icono según el tema actual
    const themeIconInit = document.getElementById('themeIcon');
    if (themeIconInit) {
        if (document.body.classList.contains('dark-mode')) {
            themeIconInit.innerHTML = '<path d="M12 3v1M12 20v1M4.2 4.2l.7.7M18.1 18.1l.7.7M1 12h1M22 12h1M4.2 19.8l.7-.7M18.1 5.9l.7-.7" /><circle cx="12" cy="12" r="4" />';
            themeIconInit.setAttribute('stroke', '#f5f5f5');
        } else {
            themeIconInit.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />';
            themeIconInit.setAttribute('stroke', '#666');
        }
    }

    // ── Dropdown usuario ──
    const userInfo     = document.getElementById('userInfo');
    const userDropdown = document.getElementById('userDropdown');
    userInfo.addEventListener('click', e => { e.stopPropagation(); userDropdown.classList.toggle('show'); });
    document.addEventListener('click', () => userDropdown.classList.remove('show'));
    userDropdown.addEventListener('click', e => e.stopPropagation());
    document.getElementById('cerrarSesion').addEventListener('click', async e => {
        e.preventDefault(); await cerrarSesionUsuario();
    });

    // ── Sidebar toggles ──
    const sidebar        = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    document.getElementById('desktopMenuToggle').addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed');
    });
    document.getElementById('mobileMenuToggle').addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        sidebarOverlay.classList.toggle('active');
    });
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('active');
    });

    // ── Sub-nav Movimientos ──
    const navMov    = document.getElementById('navMovimientos');
    const subNav    = document.getElementById('subNavMovimientos');
    const expandIcon= document.getElementById('expandMovimientos');

    if (isMovPage) expandIcon.style.transform = 'rotate(180deg)';

    navMov.addEventListener('click', () => {
        const open = subNav.classList.toggle('expanded');
        expandIcon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
            document.body.classList.remove('sidebar-collapsed');
        }
    });
});

// ── Funciones auxiliares ────────────────────────────────────────
function obtenerIniciales(nombre) {
    if (!nombre) return 'U';
    const p = nombre.trim().split(' ');
    return p.length === 1 ? p[0][0].toUpperCase()
                          : (p[0][0] + p[p.length-1][0]).toUpperCase();
}
function traducirRol(rol) {
    return {
        admin:        'Administrador',
        jefe_bodega:  'Jefe de Bodega',
        tendero:      'Tendero',
        // Roles legacy (por compatibilidad)
        usuario:      'Usuario',
        supervisor:   'Supervisor'
    }[rol] || 'Usuario';
}

// Escapar texto para HTML (protege contra XSS en renderizado dinámico)
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function obtenerUsuario() {
    try { const u = localStorage.getItem('user'); if (u) return JSON.parse(u); }
    catch(e) {}
    return { nombre:'Usuario', email:'email@example.com', rol:'usuario' };
}
async function verificarSesionActiva() {
    try {
        const r = await fetch('../database/verificar_sesion.php', { method:'GET', credentials:'include' });
        const d = await r.json();
        if (!d.authenticated) {
            localStorage.removeItem('user');
            window.location.href = '../login.html';
            return;
        }
        // Actualizar datos de usuario (incluye rol actualizado desde el servidor)
        if (d.user) {
            localStorage.setItem('user', JSON.stringify(d.user));
        }
    } catch(e) {
        localStorage.removeItem('user');
        window.location.href = '../login.html';
    }
}
async function cerrarSesionUsuario() {
    try {
        const r = await fetch('../auth/logout.php', { method:'POST', credentials:'include' });
        const d = await r.json();
        if (d.success) { localStorage.removeItem('user'); alert('Sesión cerrada'); window.location.href='../login.html'; }
        else alert('Error: ' + d.error);
    } catch(e) { alert('Error de conexión'); }
}