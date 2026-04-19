// ==================== CONFIGURACIÓN ====================
const API_URL_BODEGA    = '../database/bodega.php?type=bodegas';
const API_URL_CONCEPTO  = '../database/bodega.php?type=conceptos';
const API_URL_PROD_BOD  = '../database/bodega.php?type=productos_bodega';

// ==================== VARIABLES GLOBALES ====================
let bodegas = [];
let conceptos = [];
let bodegaEditando = null;
let conceptoEditando = null;
let bodegaParaEliminar = null;
let conceptoParaEliminar = null;
let tabActiva = 'bodegas'; // Rastrear tab activa

// ==================== ELEMENTOS DEL DOM - BOTÓN UNIFICADO ====================
const btnAgregarItem = document.getElementById('btnAgregarItem');
const btnAgregarText = document.getElementById('btnAgregarText');

// ==================== ELEMENTOS DEL DOM - BODEGA ====================
const modalBodega = document.getElementById('modalBodega');
const modalTitleBodega = document.getElementById('modalTitleBodega');
const formBodega = document.getElementById('formBodega');
const modalCloseBodega = document.getElementById('modalCloseBodega');
const cancelBtnBodega = document.getElementById('cancelBtnBodega');

const bodegaNombre = document.getElementById('bodegaNombre');
const bodegaDescripcion = document.getElementById('bodegaDescripcion');

const modalEliminarBodega = document.getElementById('modalEliminarBodega');
const modalEliminarCloseBodega = document.getElementById('modalEliminarCloseBodega');
const btnCancelarEliminarBodega = document.getElementById('btnCancelarEliminarBodega');
const btnConfirmarEliminarBodega = document.getElementById('btnConfirmarEliminarBodega');
const bodegaNombreEliminar = document.getElementById('bodegaNombreEliminar');

// ==================== ELEMENTOS DEL DOM - CONCEPTO ====================
const modalConcepto = document.getElementById('modalConcepto');
const modalTitleConcepto = document.getElementById('modalTitleConcepto');
const formConcepto = document.getElementById('formConcepto');
const modalCloseConcepto = document.getElementById('modalCloseConcepto');
const cancelBtnConcepto = document.getElementById('cancelBtnConcepto');

const conceptoNombre = document.getElementById('conceptoNombre');
const conceptoDescripcion = document.getElementById('conceptoDescripcion');
const conceptoTipo = document.getElementById('conceptoTipo');

const modalEliminarConcepto = document.getElementById('modalEliminarConcepto');
const modalEliminarCloseConcepto = document.getElementById('modalEliminarCloseConcepto');
const btnCancelarEliminarConcepto = document.getElementById('btnCancelarEliminarConcepto');
const btnConfirmarEliminarConcepto = document.getElementById('btnConfirmarEliminarConcepto');
const conceptoNombreEliminar = document.getElementById('conceptoNombreEliminar');

// ==================== ELEMENTOS DEL DOM - GENERAL ====================
const buscarBodega = document.getElementById('buscarBodega');
const listaBodegas = document.getElementById('listaBodegas');
const listaConceptos = document.getElementById('listaConceptos');
const alertaNotificacion = document.getElementById('alertaNotificacion');
const totalBodegas = document.getElementById('totalBodegas');
const totalConceptos = document.getElementById('totalConceptos');

// ==================== INICIALIZACIÓN ====================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  cargarBodegas();
  cargarConceptos();
  inicializarEventListeners();
  inicializarTabs();
}

function inicializarEventListeners() {
  // ==================== BOTÓN UNIFICADO ====================
  if (btnAgregarItem) {
    btnAgregarItem.addEventListener('click', () => {
      if (tabActiva === 'conceptos') {
        abrirModalNuevoConcepto();
      } else {
        abrirModalNuevoBodega();
      }
    });
  }

  // ==================== BODEGA ====================
  if (modalCloseBodega) modalCloseBodega.addEventListener('click', cerrarModalBodega);
  if (cancelBtnBodega) cancelBtnBodega.addEventListener('click', cerrarModalBodega);
  if (formBodega) formBodega.addEventListener('submit', guardarBodega);

  if (modalEliminarCloseBodega) modalEliminarCloseBodega.addEventListener('click', cerrarModalEliminarBodega);
  if (btnCancelarEliminarBodega) btnCancelarEliminarBodega.addEventListener('click', cerrarModalEliminarBodega);
  if (btnConfirmarEliminarBodega) btnConfirmarEliminarBodega.addEventListener('click', confirmarEliminacionBodega);

  // ==================== CONCEPTO ====================
  if (modalCloseConcepto) modalCloseConcepto.addEventListener('click', cerrarModalConcepto);
  if (cancelBtnConcepto) cancelBtnConcepto.addEventListener('click', cerrarModalConcepto);
  if (formConcepto) formConcepto.addEventListener('submit', guardarConcepto);

  if (modalEliminarCloseConcepto) modalEliminarCloseConcepto.addEventListener('click', cerrarModalEliminarConcepto);
  if (btnCancelarEliminarConcepto) btnCancelarEliminarConcepto.addEventListener('click', cerrarModalEliminarConcepto);
  if (btnConfirmarEliminarConcepto) btnConfirmarEliminarConcepto.addEventListener('click', confirmarEliminacionConcepto);

  // ==================== BÚSQUEDA ====================
  if (buscarBodega) buscarBodega.addEventListener('input', filtrarBodegas);

  // ==================== DELEGACIÓN DE EVENTOS ====================
  if (listaBodegas) {
    listaBodegas.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      if (Number.isNaN(id)) return;
      const action = btn.getAttribute('data-action');
      
      if (action === 'view')   abrirModalProductosBodega(id, btn.getAttribute('data-nombre'));
      if (action === 'edit')   editarBodega(id);
      if (action === 'delete') abrirModalEliminarBodega(id);
    });
  }

  if (listaConceptos) {
    listaConceptos.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      if (Number.isNaN(id)) return;
      const action = btn.getAttribute('data-action');
      
      if (action === 'edit') editarConcepto(id);
      if (action === 'delete') abrirModalEliminarConcepto(id);
    });
  }

  // ==================== CERRAR MODALES AL HACER CLICK FUERA ====================
  if (modalBodega) {
    modalBodega.addEventListener('click', (e) => {
      if (e.target === modalBodega) cerrarModalBodega();
    });
  }

  if (modalConcepto) {
    modalConcepto.addEventListener('click', (e) => {
      if (e.target === modalConcepto) cerrarModalConcepto();
    });
  }

  if (modalEliminarBodega) {
    modalEliminarBodega.addEventListener('click', (e) => {
      if (e.target === modalEliminarBodega) cerrarModalEliminarBodega();
    });
  }

  if (modalEliminarConcepto) {
    modalEliminarConcepto.addEventListener('click', (e) => {
      if (e.target === modalEliminarConcepto) cerrarModalEliminarConcepto();
    });
  }

  // ==================== CERRAR CON ESC ====================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalBodega && modalBodega.classList.contains('active')) cerrarModalBodega();
      if (modalConcepto && modalConcepto.classList.contains('active')) cerrarModalConcepto();
      if (modalEliminarBodega && modalEliminarBodega.classList.contains('active')) cerrarModalEliminarBodega();
      if (modalEliminarConcepto && modalEliminarConcepto.classList.contains('active')) cerrarModalEliminarConcepto();
    }
  });
}

function inicializarTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      tabActiva = tabName; // Actualizar tab activa
      
      // Cambiar texto del botón
      if (btnAgregarText) {
        if (tabName === 'conceptos') {
          btnAgregarText.textContent = 'Nuevo Concepto';
        } else {
          btnAgregarText.textContent = 'Nueva Bodega';
        }
      }
      
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      btn.classList.add('active');
      const tabContent = document.getElementById(`${tabName}-tab`);
      if (tabContent) tabContent.classList.add('active');
    });
  });
}

// ==================== API - BODEGAS ====================

async function cargarBodegas() {
  try {
    const url = `${API_URL_BODEGA}&_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const data = await resp.json();
    if (data.success && Array.isArray(data.data)) {
      bodegas = data.data;
      renderBodegas(bodegas);
      actualizarStats();
    } else {
      const errMsg = data.error || 'Error al cargar bodegas';
      console.error('[Bodegas] Error al cargar:', errMsg, data.debug || '');
      mostrarAlerta(errMsg, 'error');
    }
  } catch (err) {
    console.error('[Bodegas] Error de conexión:', err);
    mostrarAlerta('Error de conexión al cargar bodegas', 'error');
  }
}

async function crearBodega(datos) {
  const resp = await fetch(API_URL_BODEGA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return resp.json();
}

async function actualizarBodega(id, datos) {
  const resp = await fetch(API_URL_BODEGA, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...datos })
  });
  return resp.json();
}

async function eliminarBodegaAPI(id) {
  const resp = await fetch(API_URL_BODEGA, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  return resp.json();
}

// ==================== API - CONCEPTOS ====================

async function cargarConceptos() {
  try {
    const url = `${API_URL_CONCEPTO}&_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const data = await resp.json();
    if (data.success && Array.isArray(data.data)) {
      conceptos = data.data;
      renderConceptos(conceptos);
      actualizarStats();
    } else {
      mostrarAlerta(data.error || 'Error al cargar conceptos', 'error');
    }
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error de conexión al cargar conceptos', 'error');
  }
}

async function crearConcepto(datos) {
  const resp = await fetch(API_URL_CONCEPTO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return resp.json();
}

async function actualizarConcepto(id, datos) {
  const resp = await fetch(API_URL_CONCEPTO, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...datos })
  });
  return resp.json();
}

async function eliminarConceptoAPI(id) {
  const resp = await fetch(API_URL_CONCEPTO, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  return resp.json();
}

// ==================== RENDERIZADO ====================

function renderBodegas(items) {
  if (!items || items.length === 0) {
    listaBodegas.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <p>No hay bodegas registradas</p>
      </div>
    `;
    return;
  }

  listaBodegas.innerHTML = items.map(b => {
    const totalProductos = Number(b.total_productos) || 0;
    const productosMuestra = Array.isArray(b.productos_muestra) ? b.productos_muestra : [];
    const tieneJefe = b.jefe_nombre && b.jefe_nombre.trim() !== '';

    const productosHtml = totalProductos === 0
      ? `<span class="bodega-field-empty">Sin productos asignados</span>`
      : `<span class="bodega-productos-count">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
             <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
             <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
           </svg>
           ${totalProductos} producto${totalProductos !== 1 ? 's' : ''} registrado${totalProductos !== 1 ? 's' : ''}
         </span>
         ${productosMuestra.length > 0 ? `
           <p class="bodega-productos-lista">
             ${escapeHtml(productosMuestra.join(', '))}${totalProductos > 5 ? ` <span class="bodega-mas">y ${totalProductos - 5} más...</span>` : ''}
           </p>` : ''}`;

    const jefeHtml = tieneJefe
      ? `<span class="bodega-jefe-nombre">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
             <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
             <circle cx="12" cy="7" r="4"/>
           </svg>
           ${escapeHtml(b.jefe_nombre)}
         </span>`
      : `<span class="bodega-field-empty">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <circle cx="12" cy="12" r="10"/>
             <line x1="12" y1="8" x2="12" y2="12"/>
             <line x1="12" y1="16" x2="12.01" y2="16"/>
           </svg>
           No hay jefe de bodega asignado actualmente
         </span>`;

    return `
    <div class="bodega-card">
      <div class="bodega-card-header">
        <div class="bodega-card-title-group">
          <div class="bodega-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <h3 class="bodega-nombre">${escapeHtml(b.nombre || '')}</h3>
            <span class="bodega-id-label">ID #${b.id}</span>
          </div>
        </div>
        <div class="bodega-card-actions">
          <button type="button" class="btn-action-view" title="Ver productos de la bodega" data-action="view" data-id="${b.id}" data-nombre="${escapeHtml(b.nombre || '')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Ver productos
          </button>
          <button type="button" class="btn-action-edit" title="Editar bodega" data-action="edit" data-id="${b.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </button>
          <button type="button" class="btn-action-delete" title="Eliminar bodega" data-action="delete" data-id="${b.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Eliminar
          </button>
        </div>
      </div>

      <div class="bodega-card-body">
        <div class="bodega-field">
          <span class="bodega-field-label">Descripción</span>
          <span class="bodega-field-value">
            ${b.descripcion ? escapeHtml(b.descripcion) : '<span class="bodega-field-empty">Sin descripción</span>'}
          </span>
        </div>
        <div class="bodega-field">
          <span class="bodega-field-label">Jefe de Bodega</span>
          <span class="bodega-field-value">${jefeHtml}</span>
        </div>
        <div class="bodega-field bodega-field--productos">
          <span class="bodega-field-label">Productos</span>
          <div class="bodega-field-value">${productosHtml}</div>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function renderConceptos(items) {
  if (!items || items.length === 0) {
    listaConceptos.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <p>No hay conceptos registrados</p>
      </div>
    `;
    return;
  }

  listaConceptos.innerHTML = items.map(c => {
    const tipoColors = {
      'entrada': '#10b981',
      'salida': '#ef4444',
      'ajuste': '#f59e0b'
    };
    const tipoLabel = {
      'entrada': 'Entrada',
      'salida': 'Salida',
      'ajuste': 'Ajuste'
    };
    
    return `
      <div class="item-card">
        <div class="item-card-header">
          <div class="item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <h3 class="item-title">${escapeHtml(c.nombre || '')}</h3>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span class="badge-tipo" style="background: ${tipoColors[c.tipo] || '#6b7280'}; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
            ${tipoLabel[c.tipo] || c.tipo}
          </span>
        </div>

        ${c.descripcion ? `
          <p class="item-description">${escapeHtml(c.descripcion)}</p>
        ` : ''}

        <div class="item-actions">
          <button type="button" class="btn-icon" title="Editar" data-action="edit" data-id="${c.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </button>
          <button type="button" class="btn-icon" title="Eliminar" data-action="delete" data-id="${c.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            Eliminar
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarBodegas() {
  const q = (buscarBodega.value || '').toLowerCase().trim();
  if (!q) return renderBodegas(bodegas);
  
  const filtrados = bodegas.filter(b =>
    (b.nombre && b.nombre.toLowerCase().includes(q)) ||
    (b.descripcion && b.descripcion.toLowerCase().includes(q)) ||
    (b.jefe_nombre && b.jefe_nombre.toLowerCase().includes(q))
  );
  renderBodegas(filtrados);
}

function actualizarStats() {
  if (totalBodegas) totalBodegas.textContent = bodegas.length;
  if (totalConceptos) totalConceptos.textContent = conceptos.length;
}

// ==================== MODAL BODEGA ====================

function abrirModalNuevoBodega() {
  bodegaEditando = null;
  if (modalTitleBodega) modalTitleBodega.textContent = 'Nueva Bodega';
  if (formBodega) formBodega.reset();
  if (modalBodega) modalBodega.classList.add('active');
  if (bodegaNombre) setTimeout(() => bodegaNombre.focus(), 100);
}

function editarBodega(id) {
  const b = bodegas.find(x => Number(x.id) === Number(id));
  if (!b) {
    mostrarAlerta('Bodega no encontrada', 'error');
    return;
  }
  
  bodegaEditando = b;
  if (modalTitleBodega) modalTitleBodega.textContent = 'Editar Bodega';
  if (bodegaNombre) bodegaNombre.value = b.nombre || '';
  if (bodegaDescripcion) bodegaDescripcion.value = b.descripcion || '';
  
  if (modalBodega) modalBodega.classList.add('active');
  if (bodegaNombre) setTimeout(() => bodegaNombre.focus(), 100);
}

function cerrarModalBodega() {
  if (modalBodega) modalBodega.classList.remove('active');
  if (formBodega) formBodega.reset();
  bodegaEditando = null;
}

function guardarBodega(e) {
  e.preventDefault();
  
  const datos = {
    nombre: (bodegaNombre && bodegaNombre.value || '').trim(),
    descripcion: (bodegaDescripcion && bodegaDescripcion.value || '').trim(),
  };

  if (!datos.nombre) {
    mostrarAlerta('El nombre de la bodega es obligatorio', 'error');
    if (bodegaNombre) bodegaNombre.focus();
    return;
  }

  (bodegaEditando
    ? actualizarBodega(bodegaEditando.id, datos)
    : crearBodega(datos)
  ).then((data) => {
    if (data.success) {
      mostrarAlerta(data.message || 'Guardado correctamente', 'success');
      cerrarModalBodega();
      cargarBodegas();
    } else {
      const errMsg = data.error || 'Error al guardar';
      console.error('[Bodegas] Error al guardar bodega:', errMsg, data.debug || '');
      mostrarAlerta(errMsg, 'error');
    }
  }).catch((err) => {
    console.error('[Bodegas] Error de conexión al guardar:', err);
    mostrarAlerta('Error de conexión', 'error');
  });
}

function abrirModalEliminarBodega(id) {
  const b = bodegas.find(x => Number(x.id) === Number(id));
  if (!b) {
    mostrarAlerta('Bodega no encontrada', 'error');
    return;
  }
  
  bodegaParaEliminar = b;
  if (bodegaNombreEliminar) bodegaNombreEliminar.textContent = b.nombre;
  if (modalEliminarBodega) modalEliminarBodega.classList.add('active');
}

function cerrarModalEliminarBodega() {
  if (modalEliminarBodega) modalEliminarBodega.classList.remove('active');
  bodegaParaEliminar = null;
}

function confirmarEliminacionBodega() {
  if (!bodegaParaEliminar) return;
  
  eliminarBodegaAPI(bodegaParaEliminar.id)
    .then((data) => {
      if (data.success) {
        mostrarAlerta(data.message || 'Bodega eliminada correctamente', 'success');
        cerrarModalEliminarBodega();
        cargarBodegas();
      } else {
        const errMsg = data.error || 'No se pudo eliminar';
        console.error('[Bodegas] Error al eliminar bodega:', errMsg, data.debug || '');
        mostrarAlerta(errMsg, 'error');
      }
    })
    .catch((err) => {
      console.error('[Bodegas] Error de conexión al eliminar:', err);
      mostrarAlerta('Error de conexión', 'error');
    });
}

// ==================== MODAL CONCEPTO ====================

function abrirModalNuevoConcepto() {
  conceptoEditando = null;
  if (modalTitleConcepto) modalTitleConcepto.textContent = 'Nuevo Concepto';
  if (formConcepto) formConcepto.reset();
  if (modalConcepto) modalConcepto.classList.add('active');
  if (conceptoNombre) setTimeout(() => conceptoNombre.focus(), 100);
}

function editarConcepto(id) {
  const c = conceptos.find(x => Number(x.id) === Number(id));
  if (!c) {
    mostrarAlerta('Concepto no encontrado', 'error');
    return;
  }
  
  conceptoEditando = c;
  if (modalTitleConcepto) modalTitleConcepto.textContent = 'Editar Concepto';
  if (conceptoNombre) conceptoNombre.value = c.nombre || '';
  if (conceptoDescripcion) conceptoDescripcion.value = c.descripcion || '';
  if (conceptoTipo) conceptoTipo.value = c.tipo || 'entrada';
  
  if (modalConcepto) modalConcepto.classList.add('active');
  if (conceptoNombre) setTimeout(() => conceptoNombre.focus(), 100);
}

function cerrarModalConcepto() {
  if (modalConcepto) modalConcepto.classList.remove('active');
  if (formConcepto) formConcepto.reset();
  conceptoEditando = null;
}

function guardarConcepto(e) {
  e.preventDefault();
  
  const datos = {
    nombre: (conceptoNombre && conceptoNombre.value || '').trim(),
    descripcion: (conceptoDescripcion && conceptoDescripcion.value || '').trim(),
    tipo: (conceptoTipo && conceptoTipo.value || 'entrada'),
  };

  if (!datos.nombre) {
    mostrarAlerta('El nombre del concepto es obligatorio', 'error');
    if (conceptoNombre) conceptoNombre.focus();
    return;
  }

  (conceptoEditando
    ? actualizarConcepto(conceptoEditando.id, datos)
    : crearConcepto(datos)
  ).then((data) => {
    if (data.success) {
      mostrarAlerta(data.message || 'Guardado correctamente', 'success');
      cerrarModalConcepto();
      cargarConceptos();
    } else {
      mostrarAlerta(data.error || 'Error al guardar', 'error');
    }
  }).catch(() => mostrarAlerta('Error de conexión', 'error'));
}

function abrirModalEliminarConcepto(id) {
  const c = conceptos.find(x => Number(x.id) === Number(id));
  if (!c) {
    mostrarAlerta('Concepto no encontrado', 'error');
    return;
  }
  
  conceptoParaEliminar = c;
  if (conceptoNombreEliminar) conceptoNombreEliminar.textContent = c.nombre;
  if (modalEliminarConcepto) modalEliminarConcepto.classList.add('active');
}

function cerrarModalEliminarConcepto() {
  if (modalEliminarConcepto) modalEliminarConcepto.classList.remove('active');
  conceptoParaEliminar = null;
}

function confirmarEliminacionConcepto() {
  if (!conceptoParaEliminar) return;
  
  eliminarConceptoAPI(conceptoParaEliminar.id)
    .then((data) => {
      if (data.success) {
        mostrarAlerta(data.message || 'Concepto eliminado correctamente', 'success');
        cerrarModalEliminarConcepto();
        cargarConceptos();
      } else {
        mostrarAlerta(data.error || 'No se pudo eliminar', 'error');
      }
    })
    .catch(() => mostrarAlerta('Error de conexión', 'error'));
}


// ==================== MODAL PRODUCTOS DE BODEGA ====================

let modalProductosBodega = null;

function crearModalProductosBodega() {
  if (document.getElementById('modalProductosBodega')) return;

  const overlay = document.createElement('div');
  overlay.id = 'modalProductosBodega';
  overlay.className = 'modal-overlay modal-productos-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  overlay.innerHTML = `
    <div class="modal-content modal-productos-content">
      <div class="modal-header modal-header-productos">
        <div class="modal-header-info">
          <div class="modal-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <div>
            <h2 id="modalProductosTitulo">Productos de la bodega</h2>
            <p id="modalProductosSubtitulo" class="modal-productos-subtitulo"></p>
          </div>
        </div>
        <button type="button" class="modal-close" id="modalProductosClose" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body modal-productos-body">
        <div id="modalProductosSearchWrap" class="modal-productos-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="modal-productos-search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="modalProductosBuscar" class="modal-productos-search" placeholder="Buscar producto en esta bodega...">
        </div>
        <div id="modalProductosContenido" class="modal-productos-contenido">
          <div class="modal-productos-loading">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <p>Cargando productos...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  modalProductosBodega = overlay;

  // Solo cierra con el botón X — NO al hacer clic fuera
  document.getElementById('modalProductosClose').addEventListener('click', cerrarModalProductosBodega);

  // Filtro en tiempo real dentro del modal
  document.getElementById('modalProductosBuscar').addEventListener('input', filtrarProductosModal);
}

let _productosBodegaActuales = [];

async function abrirModalProductosBodega(bodegaId, bodegaNombre) {
  crearModalProductosBodega();

  const overlay   = document.getElementById('modalProductosBodega');
  const titulo    = document.getElementById('modalProductosTitulo');
  const subtitulo = document.getElementById('modalProductosSubtitulo');
  const contenido = document.getElementById('modalProductosContenido');
  const buscar    = document.getElementById('modalProductosBuscar');

  titulo.textContent    = `Productos — ${bodegaNombre}`;
  subtitulo.textContent = 'Consultando inventario...';
  contenido.innerHTML   = `
    <div class="modal-productos-loading">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <p>Cargando productos...</p>
    </div>`;
  buscar.value = '';
  _productosBodegaActuales = [];

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');

  try {
    const url  = `${API_URL_PROD_BOD}&bodega_id=${bodegaId}&_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (data.success && Array.isArray(data.data)) {
      _productosBodegaActuales = data.data;
      subtitulo.textContent = `${data.data.length} producto${data.data.length !== 1 ? 's' : ''} encontrado${data.data.length !== 1 ? 's' : ''}`;
      renderTablaProductosBodega(_productosBodegaActuales);
    } else {
      const err = data.error || 'Error al cargar productos';
      console.error('[Bodegas] Error al cargar productos del modal:', err, data.debug || '');
      contenido.innerHTML = `<div class="modal-productos-empty"><p class="modal-productos-empty-msg error-msg">${escapeHtml(err)}</p></div>`;
    }
  } catch (err) {
    console.error('[Bodegas] Error de conexión al cargar productos:', err);
    contenido.innerHTML = `<div class="modal-productos-empty"><p class="modal-productos-empty-msg error-msg">Error de conexión al cargar productos.</p></div>`;
  }
}

function cerrarModalProductosBodega() {
  const overlay = document.getElementById('modalProductosBodega');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }
  _productosBodegaActuales = [];
}

function filtrarProductosModal() {
  const q = (document.getElementById('modalProductosBuscar').value || '').toLowerCase().trim();
  const filtrados = q
    ? _productosBodegaActuales.filter(p =>
        (p.nombre    && p.nombre.toLowerCase().includes(q)) ||
        (p.categoria && p.categoria.toLowerCase().includes(q)) ||
        (p.estado    && p.estado.toLowerCase().includes(q))
      )
    : _productosBodegaActuales;
  renderTablaProductosBodega(filtrados);
}

function renderTablaProductosBodega(items) {
  const contenido  = document.getElementById('modalProductosContenido');
  const subtitulo  = document.getElementById('modalProductosSubtitulo');
  const totalReal  = _productosBodegaActuales.length;
  const mostrando  = items.length;

  subtitulo.textContent = mostrando === totalReal
    ? `${totalReal} producto${totalReal !== 1 ? 's' : ''} encontrado${totalReal !== 1 ? 's' : ''}`
    : `Mostrando ${mostrando} de ${totalReal} producto${totalReal !== 1 ? 's' : ''}`;

  if (!items || items.length === 0) {
    contenido.innerHTML = `
      <div class="modal-productos-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <p class="modal-productos-empty-msg">No se encontraron productos</p>
      </div>`;
    return;
  }

  const fmt = (n) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
  const fmtPrecio = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const filas = items.map(p => {
    const stockCls = p.stock_min > 0 && p.stock <= p.stock_min ? 'stock-bajo' :
                     p.stock_max > 0 && p.stock >= p.stock_max ? 'stock-alto' : '';
    const estadoBadge = p.estado
      ? `<span class="prod-estado-badge" style="background:${escapeHtml(p.estado_color || '#6b7280')}20;color:${escapeHtml(p.estado_color || '#6b7280')};border:1px solid ${escapeHtml(p.estado_color || '#6b7280')}40">${escapeHtml(p.estado)}</span>`
      : '<span class="prod-estado-badge" style="background:#f3f4f6;color:#9ca3af;">—</span>';
    return `
      <tr>
        <td class="prod-col-nombre"><span class="prod-nombre">${escapeHtml(p.nombre || '—')}</span></td>
        <td>${escapeHtml(p.categoria || '—')}</td>
        <td class="prod-col-num ${stockCls}">${fmt(p.stock)}${p.unidad_medida ? ' ' + escapeHtml(p.unidad_medida) : ''}</td>
        <td class="prod-col-num">${p.precio > 0 ? fmtPrecio(p.precio) : '—'}</td>
        <td>${estadoBadge}</td>
      </tr>`;
  }).join('');

  contenido.innerHTML = `
    <table class="prod-tabla">
      <thead>
        <tr>
          <th class="prod-col-nombre">Producto</th>
          <th>Categoría</th>
          <th class="prod-col-num">Stock</th>
          <th class="prod-col-num">Precio</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`;
}

// ==================== UTILIDADES ====================

function escapeHtml(text) {
  const s = String(text || '');
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function mostrarAlerta(msg, tipo = 'success') {
  if (!alertaNotificacion) return;
  alertaNotificacion.textContent = msg;
  alertaNotificacion.className = `alerta-notificacion ${tipo}`;
  alertaNotificacion.style.display = 'block';
  setTimeout(() => { alertaNotificacion.style.display = 'none'; }, 4000);
}