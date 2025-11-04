document.addEventListener("DOMContentLoaded", () => {
    // Configuración de títulos, descripciones e iconos por página
    const config = {
        "index.html": {
            titulo: "Panel Principal",
            descripcion: "Bienvenido a Pro Stock Tool",
            menuTitulo: "Panel Principal",
            icono: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4L4 12L20 20L36 12L20 4Z" fill="#4a90e2"/>
                <path d="M4 20L20 28L36 20" stroke="#4a90e2" stroke-width="2"/>
                <path d="M4 28L20 36L36 28" stroke="#4a90e2" stroke-width="2"/>
            </svg>`
        },
        "productos.html": {
            titulo: "Productos",
            descripcion: "Gestiona tu inventario de productos",
            menuTitulo: "Productos",
            icono: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4a90e2" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>`
        },
        "categorias.html": {
            titulo: "Categorías",
            descripcion: "Gestiona las categorías de productos",
            menuTitulo: "Categorías",
            icono: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4a90e2" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>`
        },

        "bodegas.html": {
            titulo: "Bodegas",
            descripcion: "Gestiona las bodegas de almacenamiento",
            menuTitulo: "Bodegas",
            icono: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4a90e2" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>`
        },
        "parametros.html": {
            titulo: "Parámetros",
            descripcion: "Configura los parámetros del sistema",
            menuTitulo: "Parámetros",
            icono: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4a90e2" stroke-width="2">
                <line x1="4" y1="21" x2="4" y2="14"/>
                <line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/>
                <line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/>
                <line x1="9" y1="8" x2="15" y2="8"/>
                <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>`
        },
        "reportes.html": {
            titulo: "Reportes",
            descripcion: "Consulta reportes y estadísticas",
            menuTitulo: "Reportes",
            icono: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4a90e2" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>`
        }
    };

    // Función para obtener la ruta base correcta
    function getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/view/')) {
            return '../';
        }
        return './';
    }

    const basePath = getBasePath();

    // Detecta la página actual
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";
    const pageConfig = config[page] || {
        titulo: "Pro Stock Tool",
        descripcion: "Sistema de gestión",
        menuTitulo: "Sistema",
        icono: config["index.html"].icono
    };

    // ====== AGREGA <title> Y FAVICON AUTOMÁTICOS ======
    document.title = pageConfig.titulo + " - Pro Stock Tool";
    
    // Eliminar favicons existentes si los hay
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach(el => el.remove());
    
    // SVG Favicon
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/svg+xml";
    favicon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M20 4L4 12L20 20L36 12L20 4Z' fill='%234a90e2'/%3E%3Cpath d='M4 20L20 28L36 20' stroke='%234a90e2' stroke-width='2'/%3E%3Cpath d='M4 28L20 36L36 28' stroke='%234a90e2' stroke-width='2'/%3E%3C/svg%3E";
    document.head.appendChild(favicon);

    // HTML del header
    const header = `
    <header>
        <div class="header-left">
            <a href="${basePath}index.html" class="logo">
                <svg class="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4L4 12L20 20L36 12L20 4Z" fill="#4a90e2"/>
                    <path d="M4 20L20 28L36 20" stroke="#4a90e2" stroke-width="2"/>
                    <path d="M4 28L20 36L36 28" stroke="#4a90e2" stroke-width="2"/>
                </svg>
                <span class="logo-text">Pro Stock Tool</span>
            </a>
            <h1 class="page-title">${pageConfig.titulo}</h1>
        </div>
        <div class="header-right">
            <div class="search-box">
                <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" class="search-input" placeholder="Buscar un producto...">
            </div>
            <div class="notification-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
            </div>
            <div class="user-info">
                <div class="user-avatar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <title>Usuarios</title>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                </div>
                <div class="user-details">
                    <div class="user-name">Anbo Minecon</div>
                    <div class="user-role">Administrador</div>
                </div>
            </div>
        </div>
    </header>
    `;

    // HTML del nav
    const nav = `
    <nav>
        <a href="../view/index.html" class="nav-item ${page === 'index.html' ? 'active' : ''}">
            <span class="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <title>Inicio</title>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
            </span>
            <span>Panel principal</span>
        </a>
        <a href="../view/productos.html" class="nav-item ${page === 'productos.html' ? 'active' : ''}">
            <span class="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <title>Productos</title>
                    <path d="M20 7h-4V5l-2-2H6L4 5v2H0v14h20V7zM6 5h6v2H6V5zm12 14H2V9h16v10z"/>
                </svg>
            </span>
            <span>Productos</span>
        </a>
        <a href="../view/bodega.html" class="nav-item ${page === 'bodegas.html' ? 'active' : ''}">
            <span class="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <title>Bodegas</title>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <path d="M3 9h18M9 21V9"/>
                </svg>
            </span>
            <span>Gestionar</span>
        </a>
        <a href="../view/categoria.html" class="nav-item ${page === 'categorias.html' ? 'active' : ''}">
            <span class="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <title>Categorías</title>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
            </span>
            <span>Categorías</span>
        </a>
        <a href="../view/parametros.html" class="nav-item ${page === 'parametros.html' ? 'active' : ''}">
            <span class="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <title>Parámetros</title>
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.4 1 .4 2.1 0 3.1a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
            </span>
            <span>Parámetros</span>
        </a>
        <a href="../view/proveedores.html" class="nav-item">
            <span class="nav-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <title>Proveedores</title>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
            </span>
            <span>Proveedores</span>
        </a>
        <div class="nav-item-expandable">
            <a href="#" class="nav-item" data-toggle="movimiento">
                <span class="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                    <title>Configuración</title>
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.4 1 .4 2.1 0 3.1"/>
                </svg>
                </span>
                <span>Movimiento</span>
                <span class="expand-icon">⊕</span>
            </a>
        </div>
        <div class="nav-item-expandable">
            <a href="#" class="nav-item" data-toggle="reportes">
                <span class="nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                        <title>Reportes</title>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <line x1="10" y1="9" x2="8" y2="9"/>
                    </svg>
                </span>
                <span>Reportes</span>
                <span class="expand-icon">⊕</span>
            </a>
            <div class="sub-nav" id="reportes-sub">
                <a href="#" class="sub-nav-item">Informes de Productos</a>
                <a href="#" class="sub-nav-item">Informes de Transac...</a>
                <a href="#" class="sub-nav-item">Informes de Devoluc...</a>
            </div>
        </div>
    </nav>
    `;

    // Inserta el header y nav
    document.body.insertAdjacentHTML("afterbegin", header);
    document.body.insertAdjacentHTML("beforeend", nav);

    // ===== FUNCIONALIDAD DE SUBMENÚS =====
    function toggleSubNav(e) {
        e.preventDefault();
        const parent = e.currentTarget.parentElement;
        const subNav = parent.querySelector('.sub-nav');
        const expandIcon = e.currentTarget.querySelector('.expand-icon');
        
        if (subNav) {
            subNav.classList.toggle('expanded');
            expandIcon.textContent = subNav.classList.contains('expanded') ? '⊖' : '⊕';
        }
    }

    // Event listeners para items expandibles
    document.querySelectorAll('.nav-item[data-toggle]').forEach(item => {
        item.addEventListener('click', toggleSubNav);
    });

    // Active nav item functionality (solo para items normales)
    document.querySelectorAll('.nav-item').forEach(item => {
        if (!item.hasAttribute('data-toggle')) {
            item.addEventListener('click', function() {
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
            });
        }
    });
});
