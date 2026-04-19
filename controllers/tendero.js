// =================================================================
//  tendero.js  —  Módulo Consulta de Inventario (Tendero)
//  Ubicación: controllers/tendero.js
// =================================================================
'use strict';

const API_PROD  = '../database/producto.php';
const API_CAT   = '../database/categorias.php';
const API_BOD   = '../database/bodega.php';

const POR_PAGINA = 24;

let state = {
  todos: [], filtrados: [],
  pagina: 1,
  vista: 'cards',        // 'cards' | 'tabla'
  busqueda: '',
  filtroCat: '',
  filtroBodega: '',
  filtroStock: '',
};

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Solo tendero puede entrar
  if (typeof guardarAccesoPagina === 'function') guardarAccesoPagina();

  document.body.classList.add('vista-cards');

  await Promise.all([cargarFiltros(), cargarProductos()]);
  initEventos();
});

// ── CARGA DE DATOS ────────────────────────────────────────────
async function cargarProductos() {
  mostrarSpinner();
  try {
    const r = await fetch(`${API_PROD}?action=listar&limit=9999`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) throw new Error(d.error);

    state.todos = d.data ?? d.productos ?? [];
    actualizarStats();
    filtrarYRenderizar();
  } catch(e) {
    document.getElementById('contenidoPrincipal').innerHTML = `
      <div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <h4>Error al cargar</h4><p>${e.message}</p></div>`;
  }
}

async function cargarFiltros() {
  try {
    const [rCat, rBod] = await Promise.all([
      fetch(`${API_CAT}?action=listar`, { credentials: 'include' }),
      fetch(`${API_BOD}?action=listar`, { credentials: 'include' }),
    ]);
    const dCat = await rCat.json();
    const dBod = await rBod.json();

    const selCat = document.getElementById('filtroCat');
    const selBod = document.getElementById('filtroBodega');

    if (dCat.success) {
      (dCat.data ?? dCat.categorias ?? []).forEach(c => {
        selCat.insertAdjacentHTML('beforeend', `<option value="${c.id}">${esc(c.nombre)}</option>`);
      });
    }
    if (dBod.success) {
      (dBod.data ?? dBod.bodegas ?? []).forEach(b => {
        selBod.insertAdjacentHTML('beforeend', `<option value="${b.id}">${esc(b.nombre)}</option>`);
      });
    }
  } catch(e) { /* silencioso */ }
}

// ── FILTRADO ──────────────────────────────────────────────────
function filtrarYRenderizar() {
  const q  = state.busqueda.toLowerCase().trim();
  const cId = state.filtroCat;
  const bId = state.filtroBodega;
  const st  = state.filtroStock;

  state.filtrados = state.todos.filter(p => {
    const matchQ = !q || [p.nombre, p.sku, p.categoria, p.descripcion].some(v => (v||'').toLowerCase().includes(q));
    const matchC = !cId || String(p.categoria_id) === String(cId);
    const matchB = !bId || String(p.bodega_id)    === String(bId);
    const matchS = !st  || calcStockStatus(p.stock) === st;
    return matchQ && matchC && matchB && matchS;
  });

  state.pagina = 1;
  renderPagina();
  actualizarInfoResultado();
}

function calcStockStatus(stock) {
  const s = parseInt(stock ?? 0);
  if (s <= 0)  return 'empty';
  if (s < 10)  return 'low';
  return 'ok';
}

function actualizarStats() {
  const todos = state.todos;
  document.getElementById('totalProd').textContent = todos.length;
  document.getElementById('conStock').textContent  = todos.filter(p => p.stock > 0).length;
  document.getElementById('stockBajo').textContent = todos.filter(p => p.stock > 0 && p.stock < 10).length;
  document.getElementById('sinStock').textContent  = todos.filter(p => !(p.stock > 0)).length;
}

function actualizarInfoResultado() {
  const el = document.getElementById('resultadoInfo');
  const total = state.filtrados.length;
  const hayFiltros = state.busqueda || state.filtroCat || state.filtroBodega || state.filtroStock;
  if (hayFiltros) {
    el.style.display = 'block';
    el.innerHTML = `Mostrando <strong>${total}</strong> resultado${total !== 1 ? 's' : ''} de ${state.todos.length} productos`;
  } else {
    el.style.display = 'none';
  }
}

// ── RENDER ────────────────────────────────────────────────────
function renderPagina() {
  const inicio = (state.pagina - 1) * POR_PAGINA;
  const pagina = state.filtrados.slice(inicio, inicio + POR_PAGINA);
  const cont   = document.getElementById('contenidoPrincipal');

  if (!state.filtrados.length) {
    cont.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
      <h4>Sin resultados</h4>
      <p>Prueba con otros filtros o términos de búsqueda.</p>
    </div>`;
    return;
  }

  const paginacion = renderPaginacion();

  if (state.vista === 'cards') {
    cont.innerHTML = `
      <div class="cards-grid">
        ${pagina.map(p => cardHtml(p)).join('')}
      </div>
      ${paginacion}`;
    document.body.classList.add('vista-cards');
    document.body.classList.remove('vista-tabla');
  } else {
    cont.innerHTML = `
      <div class="tabla-view">
        <div class="table-wrap">
          <table class="g-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Categoría</th>
                <th>Bodega</th>
                <th>Stock</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              ${pagina.map(p => tablaFila(p)).join('')}
            </tbody>
          </table>
        </div>
        ${paginacion}
      </div>`;
    document.body.classList.add('vista-tabla');
    document.body.classList.remove('vista-cards');
  }

  // Click para ver detalle
  cont.querySelectorAll('[data-prod-id]').forEach(el => {
    el.addEventListener('click', () => abrirDetalle(el.dataset.prodId));
  });

  // Paginación
  cont.querySelectorAll('.pag-btn[data-pag]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.pagina = parseInt(btn.dataset.pag);
      renderPagina();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function cardHtml(p) {
  const status = calcStockStatus(p.stock);
  const statusLabel = { ok: `${p.stock} en stock`, low: `⚠ Solo ${p.stock}`, empty: 'Sin stock' }[status];
  return `
    <div class="prod-card" data-prod-id="${p.id}">
      <div class="prod-card-icon">${catEmoji(p.categoria)}</div>
      <p class="prod-card-nombre">${esc(p.nombre)}</p>
      <p class="prod-card-cat">${esc(p.categoria || 'Sin categoría')}</p>
      <div class="prod-card-footer">
        <span class="prod-card-precio">${formatMoney(p.precio)}</span>
        <span class="prod-card-stock ${status}">${statusLabel}</span>
      </div>
    </div>`;
}

function tablaFila(p) {
  const status = calcStockStatus(p.stock);
  const statusLabel = { ok: `${p.stock}`, low: `⚠ ${p.stock}`, empty: '0' }[status];
  return `
    <tr data-prod-id="${p.id}">
      <td><strong>${esc(p.nombre)}</strong></td>
      <td><code style="font-size:12px;color:var(--text-muted)">${esc(p.sku || '—')}</code></td>
      <td>${esc(p.categoria || '—')}</td>
      <td>${esc(p.bodega || p.bodega_nombre || '—')}</td>
      <td><span class="badge badge-${status === 'ok' ? 'green' : status === 'low' ? 'orange' : 'red'}">${statusLabel}</span></td>
      <td><strong>${formatMoney(p.precio)}</strong></td>
    </tr>`;
}

function renderPaginacion() {
  const total  = state.filtrados.length;
  const paginas = Math.ceil(total / POR_PAGINA);
  if (paginas <= 1) return '';

  const inicio = (state.pagina - 1) * POR_PAGINA + 1;
  const fin    = Math.min(state.pagina * POR_PAGINA, total);

  let btns = '';
  for (let i = 1; i <= paginas; i++) {
    if (paginas > 7 && Math.abs(i - state.pagina) > 2 && i !== 1 && i !== paginas) {
      if (i === 2 || i === paginas - 1) btns += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
      continue;
    }
    btns += `<button class="pag-btn ${i === state.pagina ? 'active' : ''}" data-pag="${i}">${i}</button>`;
  }

  return `<div class="paginacion">
    <span class="pag-info">${inicio}–${fin} de ${total} productos</span>
    <div class="pag-btns">
      <button class="pag-btn" data-pag="${state.pagina - 1}" ${state.pagina === 1 ? 'disabled' : ''}>‹</button>
      ${btns}
      <button class="pag-btn" data-pag="${state.pagina + 1}" ${state.pagina === paginas ? 'disabled' : ''}>›</button>
    </div>
  </div>`;
}

// ── DETALLE PRODUCTO ──────────────────────────────────────────
async function abrirDetalle(id) {
  const p = state.todos.find(x => String(x.id) === String(id));
  if (!p) return;

  document.getElementById('modalProdNombre').textContent = p.nombre;
  document.getElementById('modalProdSku').textContent    = p.sku ? `SKU: ${p.sku}` : '';
  document.getElementById('modalProdBody').innerHTML = renderDetalle(p);
  document.getElementById('modalProducto').classList.add('show');
  document.getElementById('modalProducto').removeAttribute('aria-hidden');
}

function renderDetalle(p) {
  const status   = calcStockStatus(p.stock);
  const maxStock = Math.max(parseInt(p.stock_max ?? 100), parseInt(p.stock ?? 0), 1);
  const pct      = Math.min(100, Math.round((parseInt(p.stock ?? 0) / maxStock) * 100));

  return `
    <div class="prod-detail-grid">
      <div class="prod-detail-section">
        <h4>Información General</h4>
        ${fila('Categoría',    p.categoria || '—')}
        ${fila('Bodega',       p.bodega || p.bodega_nombre || '—')}
        ${fila('Proveedor',    p.proveedor || '—')}
        ${fila('Descripción',  p.descripcion || 'Sin descripción')}
      </div>
      <div class="prod-detail-section">
        <h4>Precios y Stock</h4>
        ${fila('Precio venta',  formatMoney(p.precio))}
        ${fila('Precio compra', formatMoney(p.precio_compra))}
        ${fila('Unidad',        p.unidad || 'Unidad')}
        <div class="stock-bar-wrap">
          <div class="stock-bar-labels">
            <span>Stock actual: <strong>${p.stock ?? 0}</strong></span>
            <span>Mín: ${p.stock_min ?? 0}</span>
          </div>
          <div class="stock-bar-bg">
            <div class="stock-bar-fill ${status}" style="width:${pct}%"></div>
          </div>
          <div style="text-align:right;margin-top:5px">
            <span class="badge badge-${status === 'ok' ? 'green' : status === 'low' ? 'orange' : 'red'}">
              ${ status === 'ok' ? '✓ Disponible' : status === 'low' ? '⚠ Stock bajo' : '✕ Sin stock' }
            </span>
          </div>
        </div>
      </div>
    </div>
    ${p.descripcion ? `<p style="margin-top:18px;font-size:14px;color:var(--text-muted);line-height:1.6">${esc(p.descripcion)}</p>` : ''}`;
}

function fila(lbl, val) {
  return `<div class="prod-detail-row"><span class="lbl">${lbl}</span><span class="val">${esc(String(val))}</span></div>`;
}

// ── EVENTOS ───────────────────────────────────────────────────
function initEventos() {
  // Búsqueda con debounce
  let timer;
  document.getElementById('busquedaGlobal').addEventListener('input', function() {
    clearTimeout(timer);
    timer = setTimeout(() => { state.busqueda = this.value; filtrarYRenderizar(); }, 280);
  });

  // Filtros select
  document.getElementById('filtroCat').addEventListener('change', function() {
    state.filtroCat = this.value; filtrarYRenderizar();
  });
  document.getElementById('filtroBodega').addEventListener('change', function() {
    state.filtroBodega = this.value; filtrarYRenderizar();
  });
  document.getElementById('filtroStock').addEventListener('change', function() {
    state.filtroStock = this.value; filtrarYRenderizar();
  });

  // Toggle vista
  document.getElementById('btnVista').addEventListener('click', function() {
    state.vista = state.vista === 'cards' ? 'tabla' : 'cards';
    this.innerHTML = state.vista === 'cards'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> Vista Cards`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> Vista Tabla`;
    renderPagina();
  });

  // Limpiar filtros
  document.getElementById('btnLimpiar').addEventListener('click', () => {
    state.busqueda = ''; state.filtroCat = ''; state.filtroBodega = ''; state.filtroStock = '';
    document.getElementById('busquedaGlobal').value = '';
    document.getElementById('filtroCat').value = '';
    document.getElementById('filtroBodega').value = '';
    document.getElementById('filtroStock').value = '';
    filtrarYRenderizar();
  });

  // Modal cierre
  document.getElementById('modalProdClose').addEventListener('click', cerrarModal);
  document.getElementById('btnCerrarProd').addEventListener('click',  cerrarModal);
  document.getElementById('modalProducto').addEventListener('click', e => {
    if (e.target === e.currentTarget) cerrarModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });
}

function cerrarModal() {
  document.getElementById('modalProducto').classList.remove('show');
  document.getElementById('modalProducto').setAttribute('aria-hidden', 'true');
}

function mostrarSpinner() {
  document.getElementById('contenidoPrincipal').innerHTML =
    `<div class="spinner-wrap"><div class="spinner"></div><p>Cargando inventario...</p></div>`;
}

// ── HELPERS ───────────────────────────────────────────────────
function catEmoji(cat) {
  if (!cat) return '📦';
  const c = cat.toLowerCase();
  if (c.includes('herr')) return '🔧';
  if (c.includes('elect')) return '⚡';
  if (c.includes('plom')) return '🔩';
  if (c.includes('pint')) return '🎨';
  if (c.includes('made') || c.includes('madera')) return '🪵';
  if (c.includes('jardín') || c.includes('jard')) return '🌿';
  if (c.includes('seg')) return '🔒';
  return '📦';
}

function formatMoney(v) {
  return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v || 0);
}

function esc(t) {
  return String(t ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
