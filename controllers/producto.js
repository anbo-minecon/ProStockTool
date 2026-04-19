// =================================================================
//  producto.js  —  Módulo Gestión de Productos (ACTUALIZADO)
//  Añade soporte para Contexto de Bodega Activa:
//   - Lee la bodega activa desde BodegaContext
//   - Envía X-Bodega-ID en todas las peticiones
//   - Muestra banner contextual
//   - Controla permisos de edición/eliminación por bodega
// =================================================================

// ==================== CONFIGURACIÓN ====================
const API_URL_PRODUCTO   = '../database/producto.php';
const API_URL_PROVEEDOR  = '../database/proveedores.php';
const API_URL_BODEGA     = '../database/bodega.php?type=bodegas';
const API_URL_CATEGORIA  = '../database/categorias.php';
const API_URL_SUBCATEGORIA = '../database/subcategorias.php';
const API_URL_PARAMETRO  = '../database/parametros.php';

// ==================== VARIABLES GLOBALES ====================
let productos           = [];
let productosFiltrados  = [];
let proveedores         = [];
let bodegas             = [];
let categorias          = [];
let subcategorias       = [];
let estados             = [];
let sortColumn          = null;
let sortDirection       = 'asc';

// ==================== CONTEXTO DE BODEGA ====================
/**
 * Retorna los headers necesarios para peticiones contextuales.
 * Si BodegaContext está disponible, añade X-Bodega-ID.
 */
function _getContextHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (window.BodegaContext) {
    const id = BodegaContext.obtenerIdActivo();
    if (id) headers['X-Bodega-ID'] = String(id);
    const permiso = BodegaContext.obtenerPermiso();
    if (permiso) headers['X-Bodega-Permiso'] = permiso;
  }
  return headers;
}

/**
 * ¿Puede el usuario actual editar productos?
 */
function _puedeEditarProducto(producto) {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch(e){return{};} })();
  if (user.rol === 'admin') return true;
  if (user.rol !== 'jefe_bodega') return false;

  if (window.BodegaContext) {
    return BodegaContext.puedeEditar();
  }
  // Fallback: verificar permiso en el producto
  const perm = producto?.permiso_usuario;
  return perm === 'edicion' || perm === 'eliminacion';
}

/**
 * ¿Puede el usuario actual eliminar el producto?
 */
function _puedeEliminarProducto(producto) {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch(e){return{};} })();
  if (user.rol === 'admin') return true;
  if (user.rol !== 'jefe_bodega') return false;

  if (window.BodegaContext) {
    return BodegaContext.puedeEliminar();
  }
  return producto?.permiso_usuario === 'eliminacion';
}

// ==================== ELEMENTOS DEL DOM ====================
const tablaBody          = document.querySelector('#tablaProductos tbody');
const btnCrearProducto   = document.getElementById('btnCrearProducto');
const btnFiltros         = document.getElementById('btnFiltros');
const modalProducto      = document.getElementById('modalProducto');
const modalFiltros       = document.getElementById('modalFiltros');
const formProducto       = document.getElementById('formProducto');
const modalTitulo        = document.getElementById('modalTitulo');
const resultsCount       = document.getElementById('resultsCount');
const badgeCount         = document.getElementById('badgeCount');

// Filtros
const filtroNombre       = document.getElementById('filtroNombre');
const filtroProveedor    = document.getElementById('filtroProveedor');
const filtroBodega       = document.getElementById('filtroBodega');
const filtroCategoria    = document.getElementById('filtroCategoria');
const filtroEstado       = document.getElementById('filtroEstado');
const filtroStockMin     = document.getElementById('filtroStockMin');
const filtroStockMax     = document.getElementById('filtroStockMax');

// Campos del formulario
const prodId             = document.getElementById('productoId');
const nombreInput        = document.getElementById('productoNombre');
const proveedorInput     = document.getElementById('productoProveedor');
const unidadInput        = document.getElementById('productoUnidad');
const nitInput           = document.getElementById('productoNit');
const bodegaInput        = document.getElementById('productoBodega');
const categoriaInput     = document.getElementById('productoCategoria');
const subcategoriaInput  = document.getElementById('productoSubcategoria');
const stockInput         = document.getElementById('productoStock');
const stockMinInput      = document.getElementById('productoStockMin');
const stockMaxInput      = document.getElementById('productoStockMax');
const precioInput        = document.getElementById('productoPrecio');
const fechaVencInput     = document.getElementById('productoFechaVenc');
const estadoInput        = document.getElementById('productoEstado');

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
  await _inicializarContextoBodega();
  await inicializarApp();
  inicializarEventos();

  // Aplicar filtro de búsqueda desde URL
  const params = new URLSearchParams(window.location.search);
  const searchTerm = params.get('search');
  if (searchTerm && filtroNombre) {
    filtroNombre.value = searchTerm;
    aplicarFiltros();
  }

  // Suscribirse a cambios de bodega activa
  if (window.BodegaContext) {
    BodegaContext.onChange(async () => {
      await cargarProductos();
    });
  }
});

async function _inicializarContextoBodega() {
  if (!window.BodegaSelector) return;
  // El selector ya se inicializa en header-footer.js
  // Insertar banner contextual
  const container = document.querySelector('.container');
  if (container && window.BodegaSelector) {
    const user = (() => { try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch(e){return{};} })();
    if (user.rol === 'jefe_bodega') {
      BodegaSelector.insertarBanner(container);
    }
  }
}

async function inicializarApp() {
  await Promise.all([
    cargarProductos(),
    cargarProveedores(),
    cargarBodegas(),
    cargarCategorias(),
    cargarSubcategorias(),
    cargarEstados()
  ]);
  poblarSelectsFiltros();
  poblarSelectsFormulario();

  // Ocultar/mostrar botón crear según permisos
  _actualizarVisibilidadCrear();
}

function _actualizarVisibilidadCrear() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch(e){return{};} })();
  if (btnCrearProducto) {
    if (user.rol === 'admin') {
      btnCrearProducto.style.display = '';
    } else if (user.rol === 'jefe_bodega') {
      // Mostrar solo si tiene permiso de edición o mayor
      const puedeCrear = window.BodegaContext ? BodegaContext.puedeEditar() : false;
      btnCrearProducto.style.display = puedeCrear ? '' : 'none';
    } else {
      btnCrearProducto.style.display = 'none';
    }
  }
}

function inicializarEventos() {
  if (btnCrearProducto) btnCrearProducto.addEventListener('click', abrirModalNuevoProducto);
  if (btnFiltros) btnFiltros.addEventListener('click', abrirModalFiltros);

  const btnReset = document.getElementById('btnResetFilters');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      limpiarFiltros();
      const headerSearch = document.querySelector('.search-box .search-input');
      if (headerSearch) headerSearch.value = '';
      const overlay = document.getElementById('searchOverlay');
      if (overlay) overlay.classList.remove('active');
    });
  }

  if (formProducto) formProducto.addEventListener('submit', guardarProducto);

  if (modalProducto) {
    modalProducto.addEventListener('click', (e) => {
      if (e.target === modalProducto) cerrarModal();
    });
  }

  if (modalFiltros) {
    modalFiltros.addEventListener('click', (e) => {
      if (e.target === modalFiltros) cerrarModalFiltros();
    });
  }

  if (filtroNombre)    filtroNombre.addEventListener('input', aplicarFiltros);
  if (filtroProveedor) filtroProveedor.addEventListener('change', aplicarFiltros);
  if (filtroBodega)    filtroBodega.addEventListener('change', aplicarFiltros);
  if (filtroCategoria) filtroCategoria.addEventListener('change', aplicarFiltros);
  if (filtroEstado)    filtroEstado.addEventListener('change', aplicarFiltros);
  if (filtroStockMin)  filtroStockMin.addEventListener('input', aplicarFiltros);
  if (filtroStockMax)  filtroStockMax.addEventListener('input', aplicarFiltros);

  if (categoriaInput) categoriaInput.addEventListener('change', cargarSubcategoriasPorCategoria);

  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => ordenarTabla(th.dataset.column));
  });
}

// ==================== FUNCIONES DE MODALES ====================
function abrirModalFiltros()    { modalFiltros?.classList.add('active'); }
function cerrarModalFiltros()   { modalFiltros?.classList.remove('active'); }
function aplicarYCerrarFiltros(){ aplicarFiltros(); cerrarModalFiltros(); }
function cerrarModal()          { modalProducto?.classList.remove('active'); }

// ==================== CARGA DE DATOS ====================
async function cargarProductos() {
  try {
    const headers = _getContextHeaders();
    delete headers['Content-Type']; // GET no necesita Content-Type
    const resp = await fetch(API_URL_PRODUCTO + '?_=' + Date.now(), {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    const data = await resp.json();

    if (data.success) {
      productos = data.data || [];
      productosFiltrados = [...productos];
      aplicarFiltros();

      // Actualizar visibilidad del botón crear tras cambio de contexto
      _actualizarVisibilidadCrear();
    } else {
      notificarError(data.error || 'Error al cargar productos');
    }
  } catch (e) {
    notificarError('Error de conexión con el servidor');
  }
}

async function cargarProveedores() {
  try {
    const resp = await fetch(API_URL_PROVEEDOR + '?_=' + Date.now(), {
      credentials: 'include'
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.data)) proveedores = data.data;
    }
  } catch(e) {}
}

async function cargarBodegas() {
  try {
    const resp = await fetch(API_URL_BODEGA + '&_=' + Date.now(), {
      credentials: 'include'
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.data)) bodegas = data.data;
    }
  } catch(e) {}
}

async function cargarCategorias() {
  try {
    const resp = await fetch(API_URL_CATEGORIA + '?_=' + Date.now(), {
      credentials: 'include'
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.data)) categorias = data.data;
    }
  } catch(e) {}
}

async function cargarSubcategorias() {
  try {
    const resp = await fetch(API_URL_SUBCATEGORIA + '?_=' + Date.now(), {
      credentials: 'include'
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.data)) subcategorias = data.data;
    }
  } catch(e) {}
}

function cargarSubcategoriasPorCategoria() {
  const categoriaId = categoriaInput.value;
  if (!categoriaId) {
    subcategoriaInput.innerHTML = '<option value="">Seleccionar subcategoría...</option>';
    return;
  }
  const subcatsFiltr = subcategorias.filter(s => s.categoria_id == categoriaId);
  subcategoriaInput.innerHTML = '<option value="">Seleccionar subcategoría...</option>' +
    subcatsFiltr.map(s => `<option value="${s.id}">${escapeHtml(s.nombre)}</option>`).join('');
}

async function cargarEstados() {
  try {
    const resp = await fetch(API_URL_PARAMETRO + '?_=' + Date.now(), {
      credentials: 'include'
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.data)) estados = data.data;
    }
  } catch(e) {}
}

// ==================== POBLAR SELECTS ====================
function poblarSelectsFiltros() {
  if (filtroProveedor && proveedores.length > 0) {
    filtroProveedor.innerHTML = '<option value="">Todos los proveedores</option>' +
      proveedores.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
  }
  if (filtroBodega && bodegas.length > 0) {
    filtroBodega.innerHTML = '<option value="">Todas las bodegas</option>' +
      bodegas.map(b => `<option value="${b.id}">${escapeHtml(b.nombre)}</option>`).join('');
  }
  if (filtroCategoria && categorias.length > 0) {
    filtroCategoria.innerHTML = '<option value="">Todas las categorías</option>' +
      categorias.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('');
  }
  if (filtroEstado && estados.length > 0) {
    filtroEstado.innerHTML = '<option value="">Todos los estados</option>' +
      estados.map(e => `<option value="${e.id}">${escapeHtml(e.nombre)}</option>`).join('');
  }
}

function poblarSelectsFormulario() {
  if (proveedorInput && proveedores.length > 0) {
    proveedorInput.innerHTML = '<option value="">Seleccionar proveedor...</option>' +
      proveedores.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
  }
  if (bodegaInput && bodegas.length > 0) {
    const user = (() => { try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch(e){return{};} })();
    let bodegasFiltradas = bodegas;

    // Para jefe de bodega, filtrar a sus bodegas accesibles
    if (user.rol === 'jefe_bodega' && window.BodegaContext) {
      const accesibles = BodegaContext.obtenerLista().map(b => b.id);
      if (accesibles.length) {
        bodegasFiltradas = bodegas.filter(b => accesibles.includes(b.id));
      }
    }

    bodegaInput.innerHTML = '<option value="">Seleccionar bodega...</option>' +
      bodegasFiltradas.map(b => `<option value="${b.id}">${escapeHtml(b.nombre)}</option>`).join('');

    // Pre-seleccionar bodega activa para jefe
    if (user.rol === 'jefe_bodega' && window.BodegaContext) {
      const idActivo = BodegaContext.obtenerIdActivo();
      if (idActivo) bodegaInput.value = String(idActivo);
    }
  }
  if (categoriaInput && categorias.length > 0) {
    categoriaInput.innerHTML = '<option value="">Seleccionar categoría...</option>' +
      categorias.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('');
  }
  if (subcategoriaInput) {
    subcategoriaInput.innerHTML = '<option value="">Seleccionar subcategoría...</option>';
  }
  if (estadoInput && estados.length > 0) {
    estadoInput.innerHTML = '<option value="">Seleccionar estado...</option>' +
      estados.map(e => `<option value="${e.id}">${escapeHtml(e.nombre)}</option>`).join('');
  }
}

// ==================== FILTRADO ====================
function aplicarFiltros() {
  const nombreFiltro    = (filtroNombre?.value || '').toLowerCase().trim();
  const proveedorFiltro = filtroProveedor?.value || '';
  const bodegaFiltro    = filtroBodega?.value || '';
  const categoriaFiltro = filtroCategoria?.value || '';
  const estadoFiltro    = filtroEstado?.value || '';
  const stockMinFiltro  = parseFloat(filtroStockMin?.value || 0);
  const stockMaxFiltro  = parseFloat(filtroStockMax?.value || Infinity);

  productosFiltrados = productos.filter(p => {
    if (nombreFiltro    && !p.nombre.toLowerCase().includes(nombreFiltro))         return false;
    if (proveedorFiltro && p.proveedor_id != proveedorFiltro)                      return false;
    if (bodegaFiltro    && p.bodega_id    != bodegaFiltro)                         return false;
    if (categoriaFiltro && p.categoria_id != categoriaFiltro)                      return false;
    if (estadoFiltro    && p.estado_id    != estadoFiltro)                         return false;
    const stock = parseFloat(p.stock || 0);
    if (stock < stockMinFiltro || stock > stockMaxFiltro)                          return false;
    return true;
  });

  renderProductos(productosFiltrados);
  actualizarContadores();
}

function limpiarFiltros() {
  if (filtroNombre)    filtroNombre.value    = '';
  if (filtroProveedor) filtroProveedor.value = '';
  if (filtroBodega)    filtroBodega.value    = '';
  if (filtroCategoria) filtroCategoria.value = '';
  if (filtroEstado)    filtroEstado.value    = '';
  if (filtroStockMin)  filtroStockMin.value  = '';
  if (filtroStockMax)  filtroStockMax.value  = '';
  productosFiltrados = [...productos];
  renderProductos(productosFiltrados);
  actualizarContadores();
}

// ==================== ORDENAMIENTO ====================
function ordenarTabla(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn    = column;
    sortDirection = 'asc';
  }
  productosFiltrados.sort((a, b) => {
    let aVal = a[column], bVal = b[column];
    if (column === 'stock' || column === 'precio') { aVal = parseFloat(aVal||0); bVal = parseFloat(bVal||0); }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ?  1 : -1;
    return 0;
  });
  document.querySelectorAll('.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.column === column) th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
  });
  renderProductos(productosFiltrados);
}

// ==================== RENDERIZADO ====================
function renderProductos(items) {
  if (!tablaBody) return;
  tablaBody.innerHTML = '';

  if (!items.length) {
    tablaBody.innerHTML = `
      <tr><td colspan="11" style="text-align:center;padding:60px 40px;">
        <div class="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <p>No se encontraron productos</p>
        </div>
      </td></tr>`;
    return;
  }

  items.forEach(p => {
    const tr = document.createElement('tr');
    const precioFormateado = Number(p.precio||0).toLocaleString('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0});
    const fechaVenc = p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString('es-CO') : 'N/A';
    const stock = parseFloat(p.stock||0);
    const stockMin = parseFloat(p.stock_min||0);
    let stockClass = stock <= stockMin ? 'stock-low' : stock <= (stockMin*1.5) ? 'stock-warning' : 'stock-ok';

    const canEdit   = _puedeEditarProducto(p);
    const canDelete = _puedeEliminarProducto(p);

    // Badge de permiso para jefe
    const user = (() => { try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch(e){return{};} })();
    const permBadge = user.rol === 'jefe_bodega' && p.permiso_usuario
      ? `<span class="bc-permiso ${p.permiso_usuario}" style="font-size:9px;vertical-align:middle;margin-left:4px">${{eliminacion:'✦',edicion:'✎',lectura:'👁'}[p.permiso_usuario]||''}</span>`
      : '';

    tr.innerHTML = `
      <td>
        <span class="item-title">${escapeHtml(p.nombre||'Sin nombre')}${permBadge}</span>
        <span class="small">${escapeHtml(p.proveedor_nombre||'N/A')}</span>
      </td>
      <td>${escapeHtml(p.unidad_medida||'N/A')}</td>
      <td><span class="small">${escapeHtml(p.nit||'N/A')}</span></td>
      <td>${escapeHtml(p.bodega_nombre||'N/A')}</td>
      <td><span class="badge blue">${escapeHtml(p.categoria_nombre||'N/A')}</span></td>
      <td><span class="badge purple">${escapeHtml(p.subcategoria_nombre||'N/A')}</span></td>
      <td><span class="stock-cell ${stockClass}">${stock.toFixed(2)}</span></td>
      <td><strong>${precioFormateado}</strong></td>
      <td>${fechaVenc}</td>
      <td>
        ${p.estado_color
          ? `<span class="badge" style="background:${p.estado_color}20;color:${p.estado_color};border:1px solid ${p.estado_color}40">${escapeHtml(p.estado_nombre||'N/A')}</span>`
          : `<span class="badge green">${escapeHtml(p.estado_nombre||'Activo')}</span>`}
      </td>
      <td>
        <div class="actions-cell">
          ${canEdit ? `<button class="btn-edit" data-id="${p.id}" title="Editar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>` : ''}
          ${canDelete ? `<button class="btn-delete" data-id="${p.id}" title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>` : ''}
          ${!canEdit && !canDelete ? `<span style="font-size:11px;color:#9ca3af">👁 Solo lectura</span>` : ''}
        </div>
      </td>`;

    tablaBody.appendChild(tr);
  });

  tablaBody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => editarProducto(e.target.closest('button').dataset.id));
  });
  tablaBody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => eliminarProductoConfirm(e.target.closest('button').dataset.id));
  });
}

function actualizarContadores() {
  if (resultsCount) resultsCount.textContent = `${productosFiltrados.length} productos`;
  if (badgeCount)   badgeCount.textContent   = String(productos.length);
}

// ==================== CRUD ====================
function abrirModalNuevoProducto() {
  if (!formProducto) return;
  formProducto.reset();
  if (prodId) prodId.value = '';
  if (modalTitulo) modalTitulo.textContent = 'Crear Producto';
  if (stockInput)   stockInput.value   = '0';
  if (stockMinInput) stockMinInput.value = '0';
  if (stockMaxInput) stockMaxInput.value = '0';
  if (precioInput)  precioInput.value  = '0';
  if (subcategoriaInput) subcategoriaInput.innerHTML = '<option value="">Seleccionar subcategoría...</option>';

  // Pre-seleccionar bodega activa
  if (bodegaInput && window.BodegaContext) {
    const idActivo = BodegaContext.obtenerIdActivo();
    if (idActivo) bodegaInput.value = String(idActivo);
  }

  modalProducto?.classList.add('active');
  setTimeout(() => nombreInput?.focus(), 100);
}

function editarProducto(id) {
  const p = productos.find(x => Number(x.id) === Number(id));
  if (!p) { notificarError('Producto no encontrado'); return; }

  if (prodId)          prodId.value          = p.id;
  if (modalTitulo)     modalTitulo.textContent= 'Editar Producto';
  if (nombreInput)     nombreInput.value      = p.nombre || '';
  if (proveedorInput)  proveedorInput.value   = p.proveedor_id || '';
  if (unidadInput)     unidadInput.value      = p.unidad_medida || '';
  if (nitInput)        nitInput.value         = p.nit || '';
  if (bodegaInput)     bodegaInput.value      = p.bodega_id || '';
  if (categoriaInput)  categoriaInput.value   = p.categoria_id || '';

  if (p.categoria_id) {
    cargarSubcategoriasPorCategoria();
    setTimeout(() => { if (subcategoriaInput && p.subcategoria_id) subcategoriaInput.value = p.subcategoria_id; }, 100);
  }

  if (stockInput)     stockInput.value    = p.stock    || 0;
  if (stockMinInput)  stockMinInput.value = p.stock_min|| 0;
  if (stockMaxInput)  stockMaxInput.value = p.stock_max|| 0;
  if (precioInput)    precioInput.value   = p.precio   || 0;
  if (fechaVencInput) fechaVencInput.value= p.fecha_vencimiento || '';
  if (estadoInput)    estadoInput.value   = p.estado_id|| '';

  modalProducto?.classList.add('active');
  setTimeout(() => nombreInput?.focus(), 100);
}

async function guardarProducto(e) {
  e.preventDefault();
  const esEdicion = prodId && prodId.value;

  const nombre = (nombreInput?.value||'').trim();
  if (!nombre) { notificarError('El nombre del producto es obligatorio'); return; }

  const payload = {
    nombre,
    proveedor_id:   proveedorInput?.value  ? Number(proveedorInput.value)  : null,
    unidad_medida:  (unidadInput?.value||'').trim(),
    nit:            (nitInput?.value||'').trim(),
    bodega_id:      bodegaInput?.value     ? Number(bodegaInput.value)     : null,
    categoria_id:   categoriaInput?.value  ? Number(categoriaInput.value)  : null,
    subcategoria_id:subcategoriaInput?.value? Number(subcategoriaInput.value):null,
    stock:          parseFloat(stockInput?.value||0),
    stock_min:      parseFloat(stockMinInput?.value||0),
    stock_max:      parseFloat(stockMaxInput?.value||0),
    precio:         parseFloat(precioInput?.value||0),
    fecha_vencimiento: fechaVencInput?.value || null,
    estado_id:      estadoInput?.value     ? Number(estadoInput.value)     : null
  };

  if (esEdicion) payload.id = Number(prodId.value);

  try {
    const method = esEdicion ? 'PUT' : 'POST';
    const resp = await fetch(API_URL_PRODUCTO, {
      method,
      headers: _getContextHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    const data = await resp.json();

    if (data.success) {
      notificarExito(data.message || 'Producto guardado correctamente');
      cerrarModal();
      await cargarProductos();
    } else {
      notificarError(data.error || 'Error al guardar el producto');
    }
  } catch(err) {
    notificarError('Error de conexión al guardar el producto');
  }
}

function eliminarProductoConfirm(id) {
  const p = productos.find(x => Number(x.id) === Number(id));
  const nombreProducto = p ? p.nombre : 'este producto';
  if (!confirm(`¿Eliminar "${nombreProducto}"?\n\nEsta acción no se puede deshacer.`)) return;
  eliminarProductoAPI(id);
}

async function eliminarProductoAPI(id) {
  try {
    const resp = await fetch(API_URL_PRODUCTO, {
      method: 'DELETE',
      headers: _getContextHeaders(),
      credentials: 'include',
      body: JSON.stringify({ id: Number(id) })
    });
    const data = await resp.json();
    if (data.success) {
      notificarExito(data.message || 'Producto eliminado correctamente');
      await cargarProductos();
    } else {
      notificarError(data.error || 'Error al eliminar el producto');
    }
  } catch(e) {
    notificarError('Error de conexión al eliminar el producto');
  }
}

// ==================== UTILIDADES ====================
function escapeHtml(text) {
  const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' };
  return String(text||'').replace(/[&<>"']/g, m => map[m]);
}

function notificarExito(msg) {
  _toast(msg, 'success');
}

function notificarError(msg) {
  console.error(msg);
  _toast(msg, 'error');
}

function _toast(msg, tipo) {
  const colors = { success:'#10b981', error:'#ef4444' };
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:20px;right:20px;background:${colors[tipo]};color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2);max-width:320px;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// Exponer funciones globales
window.cerrarModal             = cerrarModal;
window.cerrarModalFiltros      = cerrarModalFiltros;
window.aplicarYCerrarFiltros   = aplicarYCerrarFiltros;
window.limpiarFiltros          = limpiarFiltros;