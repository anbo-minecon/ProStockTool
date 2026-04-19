/* ================================================================
   controllers/movimientos.js — sin lotes, stock directo
   ================================================================ */

const API = '../database/movimientos.php';

let catalogoProductos   = [];
let catalogoProveedores = [];
let pendingAction       = null;
let prodSalidaIdx       = 0;

// ── HELPERS ──────────────────────────────────────────────────────
function toast(title, msg = '', type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function openModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

document.querySelectorAll('[data-close]').forEach(btn =>
  btn.addEventListener('click', () => closeModal(btn.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(overlay =>
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); }));

async function apiFetch(url, opts = {}) {
  const res  = await fetch(url, { credentials: 'include', ...opts });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Error desconocido');
  return data.data;
}

function formatMoney(v) {
  return '$' + Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDateFull(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ── TABS ─────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Actualizar botones
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Actualizar paneles
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-' + tabName).classList.add('active');
      
      // Cargar datos del tab seleccionado (lazy loading)
      cargarMovimientos(tabName);
    });
  });
  
  // Cargar solo el tab inicial (entrada)
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab) {
    cargarMovimientos(activeTab.dataset.tab);
  }
}

// ── CATÁLOGOS ─────────────────────────────────────────────────────
async function cargarCatalogos() {
  const [prods, provs] = await Promise.all([
    apiFetch(`${API}?action=productos`),
    apiFetch(`${API}?action=proveedores`)
  ]);
  catalogoProductos   = prods;
  catalogoProveedores = provs;

  // Llenar proveedor en modal entrada
  const selProv = document.getElementById('entradaProveedor');
  provs.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    selProv.appendChild(opt);
  });

  // Llenar producto en modal entrada
  const selProd = document.getElementById('entradaProducto');
  prods.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre} (Stock: ${Number(p.stock || 0).toFixed(0)})`;
    selProd.appendChild(opt);
  });
}

async function recargarCatalogos() {
  try {
    const prods = await apiFetch(`${API}?action=productos`);
    catalogoProductos = prods;
    const sel = document.getElementById('entradaProducto');
    const cur = sel.value;
    sel.innerHTML = '<option value="">Seleccionar producto</option>';
    prods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nombre} (Stock: ${Number(p.stock || 0).toFixed(0)})`;
      sel.appendChild(opt);
    });
    if (cur) sel.value = cur;
  } catch(e) {}
}

// ── TABLA DE MOVIMIENTOS ──────────────────────────────────────────
async function cargarMovimientos(tipo) {
  const buscar = document.getElementById(`buscar${cap(tipo)}`).value;
  const desde  = document.getElementById(`desde${cap(tipo)}`).value;
  const hasta  = document.getElementById(`hasta${cap(tipo)}`).value;
  const params = new URLSearchParams({ action: 'listar', tipo });
  if (buscar) params.append('buscar', buscar);
  if (desde)  params.append('desde',  desde);
  if (hasta)  params.append('hasta',  hasta);
  try {
    const data = await apiFetch(`${API}?${params}`);
    renderTabla(tipo, data.movimientos);
    document.getElementById(`count${cap(tipo)}`).textContent = data.total;
  } catch(e) {
    toast('Error al cargar', e.message, 'error');
  }
}

function renderTabla(tipo, rows) {
  const tbody = document.getElementById(`tbody${cap(tipo)}`);
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
      </svg><p>No hay registros</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const badgeClass = r.estado === 'confirmado' ? 'badge-confirmado'
                     : r.estado === 'anulado'    ? 'badge-anulado' : 'badge-pendiente';
    const tercera = tipo === 'entrada'
      ? `<td>${r.proveedor_nombre ?? '<span style="color:#9ca3af">—</span>'}</td>`
      : `<td>${r.cliente          || '<span style="color:#9ca3af">—</span>'}</td>`;
    return `<tr>
      <td><div class="item-ref">${r.referencia}</div></td>
      <td><div class="item-sub">${r.tipo_detalle}</div></td>
      ${tercera}
      <td>${r.num_productos ?? 0}</td>
      <td>${Number(r.cantidad_total ?? 0).toFixed(2)}</td>
      <td class="price-cell">${formatMoney(r.total)}</td>
      <td><span class="badge ${badgeClass}">${r.estado}</span></td>
      <td><span style="font-size:12px;color:#6b7280">${formatDateFull(r.fecha_creacion)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-action btn-view" title="Ver detalle" onclick="verDetalle(${r.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          ${r.estado !== 'anulado' ? `
          <button class="btn-action btn-cancel" title="Anular" onclick="confirmarAnular(${r.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── MODAL ENTRADA — sin lotes, un campo cantidad ─────────────────
function actualizarResumenEntrada() {
  const cant   = parseFloat(document.getElementById('entradaCantidad')?.value) || 0;
  const precio = parseFloat(document.getElementById('entradaPrecio')?.value)   || 0;
  const total  = cant * precio;
  const totalEl = document.getElementById('sumTotalEntrada');
  if (totalEl) totalEl.textContent = formatMoney(total);
}

function limpiarModalEntrada() {
  document.getElementById('entradaProveedor').value  = '';
  document.getElementById('entradaReferencia').value = '';
  document.getElementById('entradaTipo').value       = 'Compra';
  document.getElementById('entradaProducto').value   = '';
  document.getElementById('entradaCantidad').value   = '';
  document.getElementById('entradaPrecio').value     = '0';
  document.getElementById('entradaNotas').value      = '';
  actualizarResumenEntrada();
}

async function ejecutarRegistroEntrada() {
  const btn    = document.getElementById('btnRegistrarEntrada');
  const origH  = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Guardando…';
  btn.disabled  = true;
  try {
    const ref      = document.getElementById('entradaReferencia').value.trim();
    const tipoDet  = document.getElementById('entradaTipo').value;
    const notas    = document.getElementById('entradaNotas').value;
    const prodId   = parseInt(document.getElementById('entradaProducto').value);
    const cantidad = parseFloat(document.getElementById('entradaCantidad').value) || 0;
    const precio   = parseFloat(document.getElementById('entradaPrecio').value)   || 0;
    const prov     = document.getElementById('entradaProveedor').value;

    const body = { tipo: 'entrada', referencia: ref, tipo_detalle: tipoDet, notas, producto_id: prodId, cantidad, precio };
    if (prov) body.proveedor_id = parseInt(prov);

    await apiFetch(`${API}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    closeModal('modalEntrada');
    toast('¡Registrado!', 'Entrada guardada y stock actualizado.', 'success');
    await recargarCatalogos();
    cargarMovimientos('entrada');
  } catch(e) {
    toast('Error', e.message, 'error');
  } finally {
    btn.innerHTML = origH;
    btn.disabled  = false;
  }
}

// ── MODAL SALIDA — multi-producto simplificado ───────────────────
function agregarProductoSalida() {
  const container = document.getElementById('salidaProductosContainer');
  const empty     = document.getElementById('salidaEmpty');
  if (empty) empty.remove();

  const idx     = ++prodSalidaIdx;
  const opciones = catalogoProductos.map(p =>
    `<option value="${p.id}" data-precio="${p.precio||0}" data-stock="${p.stock||0}">${p.nombre} (Stock: ${Number(p.stock||0).toFixed(0)})</option>`
  ).join('');

  const card = document.createElement('div');
  card.className = 'lote-row';
  card.id        = `prod-salida-${idx}`;
  card.style.cssText = 'grid-template-columns:1fr 130px 130px auto;';
  card.innerHTML = `
    <div class="form-group">
      <label>Producto</label>
      <select class="form-control item-producto-salida" data-idx="${idx}"
              onchange="onProductoSalidaChange(${idx},this)">
        <option value="">Seleccionar…</option>${opciones}
      </select>
    </div>
    <div class="form-group">
      <label>Cantidad</label>
      <input type="number" class="form-control item-cantidad-salida" min="0.001" step="0.001"
             placeholder="0" data-idx="${idx}"/>
    </div>
    <div class="form-group">
      <label>Precio unit. ($)</label>
      <input type="number" class="form-control item-precio-salida" min="0" step="0.01"
             placeholder="0.00" data-idx="${idx}"/>
    </div>
    <button class="btn-remove-lote" onclick="eliminarProductoSalida(${idx})" title="Quitar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;
  container.appendChild(card);
}

function onProductoSalidaChange(idx, sel) {
  const opt    = sel.options[sel.selectedIndex];
  const precio = parseFloat(opt.dataset.precio || 0);
  const card   = document.getElementById(`prod-salida-${idx}`);
  if (card) {
    const precioInput = card.querySelector('.item-precio-salida');
    if (precioInput && precio > 0) precioInput.value = precio.toFixed(2);
  }
}

function eliminarProductoSalida(idx) {
  document.getElementById(`prod-salida-${idx}`)?.remove();
  const container = document.getElementById('salidaProductosContainer');
  if (!container.querySelector('.lote-row')) {
    container.innerHTML = `<div class="lotes-empty" id="salidaEmpty">No hay productos. Haz clic en "Agregar Producto" para comenzar.</div>`;
  }
}

function recogerItemsSalida() {
  const cards = document.querySelectorAll('#salidaProductosContainer .lote-row');
  if (!cards.length) { toast('Validación', 'Agrega al menos un producto', 'warning'); return null; }

  const items = [];
  for (const card of cards) {
    const selProd  = card.querySelector('.item-producto-salida');
    const inpCant  = card.querySelector('.item-cantidad-salida');
    const inpPrecio= card.querySelector('.item-precio-salida');

    const prodId   = parseInt(selProd?.value);
    const cantidad = parseFloat(inpCant?.value)   || 0;
    const precio   = parseFloat(inpPrecio?.value)  || 0;

    if (!prodId)    { toast('Validación', 'Selecciona un producto en cada fila', 'warning');   return null; }
    if (cantidad <= 0) { toast('Validación', 'La cantidad debe ser mayor a 0', 'warning');     return null; }

    // Verificar stock localmente
    const prodData = catalogoProductos.find(p => p.id == prodId);
    if (prodData && cantidad > parseFloat(prodData.stock || 0))
      { toast('Validación', `Stock insuficiente en "${prodData.nombre}" (disponible: ${prodData.stock})`, 'warning'); return null; }

    items.push({ producto_id: prodId, cantidad, precio });
  }
  return items;
}

function limpiarModalSalida() {
  document.getElementById('salidaCliente').value    = '';
  document.getElementById('salidaReferencia').value = '';
  document.getElementById('salidaTipo').value       = 'Venta';
  document.getElementById('salidaNotas').value      = '';
  document.getElementById('salidaProductosContainer').innerHTML =
    `<div class="lotes-empty" id="salidaEmpty">No hay productos. Haz clic en "Agregar Producto" para comenzar.</div>`;
  prodSalidaIdx = 0;
}

async function ejecutarRegistroSalida() {
  const btn    = document.getElementById('btnRegistrarSalida');
  const origH  = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Guardando…';
  btn.disabled  = true;
  try {
    const ref     = document.getElementById('salidaReferencia').value.trim();
    const tipoDet = document.getElementById('salidaTipo').value;
    const notas   = document.getElementById('salidaNotas').value;
    const cliente = document.getElementById('salidaCliente').value.trim();
    const items   = recogerItemsSalida();
    if (!items) { btn.innerHTML = origH; btn.disabled = false; return; }

    const body = { tipo: 'salida', referencia: ref, tipo_detalle: tipoDet, notas, cliente, items };
    await apiFetch(`${API}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    closeModal('modalSalida');
    toast('¡Registrado!', 'Salida guardada y stock descontado.', 'success');
    await recargarCatalogos();
    cargarMovimientos('salida');
  } catch(e) {
    toast('Error', e.message, 'error');
  } finally {
    btn.innerHTML = origH;
    btn.disabled  = false;
  }
}

// ── VER DETALLE ───────────────────────────────────────────────────
async function verDetalle(id) {
  try {
    const d = await apiFetch(`${API}?action=detalle&id=${id}`);
    document.getElementById('modalDetalleTitulo').textContent = `Movimiento #${d.id} — ${d.tipo.toUpperCase()}`;
    const badgeClass = d.estado === 'confirmado' ? 'badge-confirmado'
                     : d.estado === 'anulado'    ? 'badge-anulado' : 'badge-pendiente';

    const rows = d.detalle.map(l => `<tr>
      <td>${l.producto_nombre}</td>
      <td>${l.unidad_medida ?? '—'}</td>
      <td>${Number(l.cantidad).toFixed(3)}</td>
      <td>${formatMoney(l.precio_unit)}</td>
      <td>${formatMoney(l.subtotal)}</td>
    </tr>`).join('');

    document.getElementById('modalDetalleBody').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px;">
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Referencia</div>
             <div style="font-weight:700;color:#111827">${d.referencia}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Tipo</div>
             <div>${d.tipo_detalle}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Estado</div>
             <span class="badge ${badgeClass}">${d.estado}</span></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">
               ${d.tipo === 'entrada' ? 'Proveedor' : 'Cliente'}</div>
             <div>${d.tipo === 'entrada' ? (d.proveedor_nombre || '—') : (d.cliente || '—')}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Fecha</div>
             <div>${formatDateFull(d.fecha_creacion)}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Registrado por</div>
             <div>${d.usuario_nombre || '—'}</div></div>
      </div>
      ${d.notas ? `<div style="padding:10px 14px;background:#f9fafb;border-radius:8px;font-size:13px;margin-bottom:16px;color:#4b5563">${d.notas}</div>` : ''}
      <div class="items-table-wrap" style="overflow-x:auto;">
        <table class="items-table" style="min-width:500px;">
          <thead>
            <tr>
              <th>Producto</th><th>Unidad</th>
              <th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="summary-box" style="margin-top:12px;">
        <div class="summary-inner">
          <div class="summary-row total"><span>Total:</span><span>${formatMoney(d.total)}</span></div>
        </div>
      </div>`;
    openModal('modalDetalle');
  } catch(e) {
    toast('Error', e.message, 'error');
  }
}

// ── ANULAR ────────────────────────────────────────────────────────
function confirmarAnular(id) {
  document.getElementById('anularId').value = id;
  openModal('modalAnular');
}

// ── CONFIRMACIÓN INTERMEDIA ───────────────────────────────────────
function mostrarConfirmacion(titulo, texto, tipo, accion) {
  document.getElementById('modalConfirmarTitulo').textContent = titulo;
  document.getElementById('confirmTitle').textContent = titulo;
  document.getElementById('confirmText').textContent  = texto;
  const icon = document.getElementById('confirmIcon');
  icon.className = `confirm-icon ${tipo === 'danger' ? 'danger' : 'success'}`;
  pendingAction  = accion;
  openModal('modalConfirmar');
}

// ── INICIALIZACIÓN ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  initTabs();

  document.getElementById('btnNuevaEntrada').addEventListener('click', () => {
    limpiarModalEntrada();
    openModal('modalEntrada');
  });
  document.getElementById('btnNuevaSalida').addEventListener('click', () => {
    limpiarModalSalida();
    openModal('modalSalida');
  });

  // Actualizar resumen en tiempo real
  ['entradaCantidad','entradaPrecio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', actualizarResumenEntrada);
  });

  document.getElementById('btnAgregarProdSalida').addEventListener('click', () => agregarProductoSalida());

  document.getElementById('btnRegistrarEntrada').addEventListener('click', () => {
    const ref     = document.getElementById('entradaReferencia').value.trim();
    const prodId  = document.getElementById('entradaProducto').value;
    const cantidad= parseFloat(document.getElementById('entradaCantidad').value) || 0;
    if (!ref)       { toast('Validación', 'La referencia es obligatoria', 'warning'); return; }
    if (!prodId)    { toast('Validación', 'Selecciona un producto', 'warning');       return; }
    if (cantidad<=0){ toast('Validación', 'La cantidad debe ser mayor a 0', 'warning'); return; }
    mostrarConfirmacion(
      '¿Registrar entrada?',
      `Se sumará ${cantidad} unidades al stock del producto seleccionado.`,
      'success',
      ejecutarRegistroEntrada
    );
  });

  document.getElementById('btnRegistrarSalida').addEventListener('click', () => {
    const ref   = document.getElementById('salidaReferencia').value.trim();
    const items = recogerItemsSalida();
    if (!ref)   { toast('Validación', 'La referencia es obligatoria', 'warning'); return; }
    if (!items) return;
    mostrarConfirmacion(
      '¿Registrar salida?',
      `Se registrará una salida de ${items.length} producto(s). El stock será descontado.`,
      'danger',
      ejecutarRegistroSalida
    );
  });

  document.getElementById('btnConfirmarAceptar').addEventListener('click', async () => {
    if (typeof pendingAction === 'function') {
      closeModal('modalConfirmar');
      await pendingAction();
      pendingAction = null;
    }
  });

  document.getElementById('btnConfirmarAnular').addEventListener('click', async () => {
    const id  = document.getElementById('anularId').value;
    const btn = document.getElementById('btnConfirmarAnular');
    btn.innerHTML = '<span class="spinner"></span> Anulando…';
    btn.disabled  = true;
    try {
      await apiFetch(`${API}?id=${id}`, { method: 'DELETE' });
      closeModal('modalAnular');
      toast('Anulado', 'El movimiento fue anulado y el stock revertido.', 'warning');
      cargarMovimientos('entrada');
      cargarMovimientos('salida');
    } catch(e) {
      toast('Error', e.message, 'error');
    } finally {
      btn.innerHTML = 'Sí, anular';
      btn.disabled  = false;
    }
  });

  // Filtros con debounce
  ['entrada', 'salida'].forEach(tipo => {
    const buscar  = document.getElementById(`buscar${cap(tipo)}`);
    const desde   = document.getElementById(`desde${cap(tipo)}`);
    const hasta   = document.getElementById(`hasta${cap(tipo)}`);
    const limpiar = document.getElementById(`btnLimpiar${cap(tipo)}`);

    const reload = debounce(() => cargarMovimientos(tipo), 400);
    buscar.addEventListener('input',  reload);
    desde.addEventListener('change',  () => cargarMovimientos(tipo));
    hasta.addEventListener('change',  () => cargarMovimientos(tipo));
    limpiar.addEventListener('click', () => {
      buscar.value = ''; desde.value = ''; hasta.value = '';
      cargarMovimientos(tipo);
    });
  });

  setTimeout(async () => {
    try {
      await cargarCatalogos();
      // No cargar ambos tabs aquí - initTabs() ya carga el activo
    } catch(e) {
      toast('Error de inicio', e.message, 'error');
    }
  }, 350);
});