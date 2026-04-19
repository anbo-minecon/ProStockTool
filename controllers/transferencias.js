/* ================================================================
   controllers/transferencias.js — sin lotes, cantidad directa
   ================================================================ */

const API_TRF = '../database/transferencias.php';

let bodegasCatalogo   = [];
let trfPendingGuardar = false;

// ── HELPERS ──────────────────────────────────────────────────────
function toast(title, msg='', type='success') {
  const icons = { success:'✅', error:'❌', warning:'⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg?`<div class="toast-msg">${msg}</div>`:''}
    </div>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
function openModal(id)  { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

document.querySelectorAll('[data-close]').forEach(btn =>
  btn.addEventListener('click', () => closeModal(btn.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(o =>
  o.addEventListener('click', e => { if (e.target===o) closeModal(o.id); }));

async function apiFetch(url, opts={}) {
  const res  = await fetch(url, { credentials:'include', ...opts });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Error desconocido');
  return data.data;
}
function formatDateFull(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function debounce(fn,ms) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }

// ── CATÁLOGOS ─────────────────────────────────────────────────────
async function cargarCatalogosTrf() {
  const [prods, bodegas] = await Promise.all([
    apiFetch(`${API_TRF}?action=productos`),
    apiFetch(`${API_TRF}?action=bodegas`)
  ]);
  bodegasCatalogo = bodegas;

  const selProd = document.getElementById('trfProducto');
  prods.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.dataset.stock    = p.stock ?? 0;
    opt.dataset.bodegaId = p.bodega_id ?? '';
    opt.textContent = `${p.nombre} (Stock: ${Number(p.stock ?? 0).toFixed(0)})`;
    selProd.appendChild(opt);
  });

  const selOrigen  = document.getElementById('trfOrigen');
  const selDestino = document.getElementById('trfDestino');
  bodegas.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.nombre;
    selOrigen.appendChild(opt.cloneNode(true));
    selDestino.appendChild(opt.cloneNode(true));
  });
}

// ── STATS ─────────────────────────────────────────────────────────
async function cargarStatsTrf() {
  try {
    const s = await apiFetch(`${API_TRF}?action=stats`);
    document.getElementById('trfStatTotal').textContent     = s.total;
    document.getElementById('trfStatPendiente').textContent = s.pendiente;
    document.getElementById('trfStatTransito').textContent  = s.transito;
    document.getElementById('trfStatCompleta').textContent  = s.completada;
  } catch(e) {}
}

// ── TABLA ─────────────────────────────────────────────────────────
async function cargarTransferencias() {
  const buscar = document.getElementById('buscarTrf').value;
  const estado = document.getElementById('filtroEstadoTrf').value;
  const params = new URLSearchParams({ action:'listar' });
  if (buscar) params.append('buscar', buscar);
  if (estado) params.append('estado', estado);
  try {
    const data = await apiFetch(`${API_TRF}?${params}`);
    renderTablaTrf(data.transferencias);
    document.getElementById('countTrfText').textContent =
      `${data.total} transferencia${data.total===1?'':'s'} encontrada${data.total===1?'':'s'}`;
  } catch(e) {
    toast('Error al cargar', e.message, 'error');
  }
}

function renderTablaTrf(rows) {
  const tbody = document.getElementById('tbodyTrf');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
      </svg><p>No hay transferencias</p></div></td></tr>`;
    return;
  }
  const map = {'Pendiente':'badge-pendiente','En Tránsito':'badge-transito','Completada':'badge-completada','Cancelada':'badge-cancelada'};
  tbody.innerHTML = rows.map(r => `<tr>
    <td><div class="item-ref">${r.referencia}</div></td>
    <td>
      <div class="item-ref">${r.producto_nombre}</div>
      <div class="item-sub">${r.descripcion||''}</div>
    </td>
    <td><span class="bodega-chip">${r.origen_nombre}</span></td>
    <td><span class="bodega-chip destino">${r.destino_nombre}</span></td>
    <td>${Number(r.cantidad).toFixed(3)} ${r.unidad_medida||''}</td>
    <td><span style="font-size:12px;color:#6b7280">${formatDateFull(r.fecha_creacion)}</span></td>
    <td>
      <select class="estado-select" onchange="cambiarEstadoTrf(${r.id},this.value,this)" data-prev="${r.estado}">
        ${['Pendiente','En Tránsito','Completada','Cancelada'].map(s=>
          `<option value="${s}" ${r.estado===s?'selected':''}>${s}</option>`
        ).join('')}
      </select>
    </td>
    <td>
      <div class="actions-cell">
        <button class="btn-action btn-view" title="Ver detalle" onclick="verDetalleTrf(${r.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        ${r.estado!=='Completada'?`
        <button class="btn-action btn-cancel" title="Eliminar" onclick="eliminarTrf(${r.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>`:''}
      </div>
    </td>
  </tr>`).join('');
}

// ── PREVIEW RUTA ──────────────────────────────────────────────────
function actualizarPreviewRuta() {
  const origenVal  = document.getElementById('trfOrigen').value;
  const destinoVal = document.getElementById('trfDestino').value;
  const preview    = document.getElementById('trfPreviewRuta');
  if (origenVal && destinoVal) {
    const orig = bodegasCatalogo.find(b => b.id == origenVal);
    const dest = bodegasCatalogo.find(b => b.id == destinoVal);
    document.getElementById('trfPreviewOrigen').textContent  = orig?.nombre || '—';
    document.getElementById('trfPreviewDestino').textContent = dest?.nombre || '—';
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

// ── CAMBIAR ESTADO INLINE ─────────────────────────────────────────
async function cambiarEstadoTrf(id, estado, selectEl) {
  const prev = selectEl.dataset.prev || selectEl.value;
  selectEl.dataset.prev = estado;
  if (estado === 'Completada') {
    if (!confirm(`¿Marcar como Completada? Esto descontará el stock y actualizará la bodega del producto.`)) {
      selectEl.value = prev;
      return;
    }
  }
  try {
    await apiFetch(`${API_TRF}?id=${id}`, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ estado })
    });
    toast('Estado actualizado', `→ ${estado}`, 'success');
    cargarStatsTrf();
    cargarTransferencias();
  } catch(e) {
    toast('Error', e.message, 'error');
    selectEl.value = prev;
  }
}

// ── VER DETALLE ───────────────────────────────────────────────────
async function verDetalleTrf(id) {
  try {
    const d   = await apiFetch(`${API_TRF}?action=detalle&id=${id}`);
    const map = {'Pendiente':'badge-pendiente','En Tránsito':'badge-transito','Completada':'badge-completada','Cancelada':'badge-cancelada'};

    document.getElementById('modalTrfDetalleTitulo').textContent = `Transferencia #${d.id}`;
    document.getElementById('modalTrfDetalleBody').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:6px;">
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Referencia</div>
             <div style="font-weight:700">${d.referencia}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Estado</div>
             <span class="badge ${map[d.estado]||''}">${d.estado}</span></div>
        <div style="grid-column:span 2">
          <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Producto</div>
          <div style="font-weight:600">${d.producto_nombre} — ${Number(d.cantidad).toFixed(3)} ${d.unidad_medida||''}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:6px">Ruta</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="bodega-chip">${d.origen_nombre}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0369a1" stroke-width="2.2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
            <span class="bodega-chip destino">${d.destino_nombre}</span>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Fecha</div>
          <div>${formatDateFull(d.fecha_creacion)}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Registrado por</div>
          <div>${d.usuario_nombre||'—'}</div>
        </div>
        ${d.descripcion?`<div style="grid-column:span 2">
          <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Descripción</div>
          <div style="background:#f9fafb;padding:10px 12px;border-radius:8px;font-size:13px">${d.descripcion}</div>
        </div>`:''}
      </div>`;
    openModal('modalTrfDetalle');
  } catch(e) {
    toast('Error', e.message, 'error');
  }
}

// ── LIMPIAR MODAL ─────────────────────────────────────────────────
function limpiarModalTrf() {
  document.getElementById('trfRef').value      = '';
  document.getElementById('trfProducto').value = '';
  document.getElementById('trfCantidad').value = '';
  document.getElementById('trfOrigen').value   = '';
  document.getElementById('trfDestino').value  = '';
  document.getElementById('trfEstado').value   = 'Pendiente';
  document.getElementById('trfDesc').value     = '';
  document.getElementById('trfPreviewRuta').style.display = 'none';
}

// ── GUARDAR TRANSFERENCIA ─────────────────────────────────────────
async function ejecutarGuardarTrf() {
  const btn  = document.getElementById('btnGuardarTrf');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Guardando…';
  btn.disabled  = true;

  try {
    const body = {
      referencia:     document.getElementById('trfRef').value.trim(),
      producto_id:    parseInt(document.getElementById('trfProducto').value),
      cantidad:       parseFloat(document.getElementById('trfCantidad').value) || 0,
      bodega_origen:  parseInt(document.getElementById('trfOrigen').value),
      bodega_destino: parseInt(document.getElementById('trfDestino').value),
      estado:         document.getElementById('trfEstado').value,
      descripcion:    document.getElementById('trfDesc').value.trim()
    };

    await apiFetch(`${API_TRF}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    closeModal('modalTrf');
    toast('¡Registrada!', 'Transferencia guardada correctamente.', 'success');
    cargarTransferencias();
    cargarStatsTrf();
  } catch(e) {
    toast('Error', e.message, 'error');
  } finally {
    btn.innerHTML = orig;
    btn.disabled  = false;
  }
}

// ── ELIMINAR ──────────────────────────────────────────────────────
function eliminarTrf(id) {
  document.getElementById('trfEliminarId').value = id;
  openModal('modalTrfEliminar');
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('btnNuevaTrf').addEventListener('click', () => {
    limpiarModalTrf();
    openModal('modalTrf');
  });

  document.getElementById('trfOrigen').addEventListener('change',  actualizarPreviewRuta);
  document.getElementById('trfDestino').addEventListener('change', actualizarPreviewRuta);

  document.getElementById('btnGuardarTrf').addEventListener('click', () => {
    const ref      = document.getElementById('trfRef').value.trim();
    const prod     = document.getElementById('trfProducto').value;
    const cantidad = parseFloat(document.getElementById('trfCantidad').value) || 0;
    const origen   = document.getElementById('trfOrigen').value;
    const dest     = document.getElementById('trfDestino').value;

    if (!ref)           { toast('Validación','Referencia requerida','warning');        return; }
    if (!prod)          { toast('Validación','Selecciona un producto','warning');       return; }
    if (cantidad <= 0)  { toast('Validación','La cantidad debe ser mayor a 0','warning'); return; }
    if (!origen)        { toast('Validación','Selecciona bodega origen','warning');     return; }
    if (!dest)          { toast('Validación','Selecciona bodega destino','warning');    return; }
    if (origen === dest){ toast('Validación','Origen y destino no pueden ser iguales','warning'); return; }

    const origNombre = bodegasCatalogo.find(b=>b.id==origen)?.nombre || origen;
    const destNombre = bodegasCatalogo.find(b=>b.id==dest)?.nombre   || dest;

    document.getElementById('trfConfirmTitle').textContent = '¿Registrar transferencia?';
    document.getElementById('trfConfirmText').textContent  =
      `"${origNombre}" → "${destNombre}" · ${cantidad.toFixed(3)} unidades`;
    trfPendingGuardar = true;
    openModal('modalTrfConfirmar');
  });

  document.getElementById('btnTrfConfirmarOk').addEventListener('click', async () => {
    if (trfPendingGuardar) {
      trfPendingGuardar = false;
      closeModal('modalTrfConfirmar');
      await ejecutarGuardarTrf();
    }
  });

  document.getElementById('btnTrfEliminarOk').addEventListener('click', async () => {
    const id  = document.getElementById('trfEliminarId').value;
    const btn = document.getElementById('btnTrfEliminarOk');
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled  = true;
    try {
      await apiFetch(`${API_TRF}?id=${id}`, { method:'DELETE' });
      closeModal('modalTrfEliminar');
      toast('Eliminada', 'Transferencia eliminada.', 'warning');
      cargarTransferencias();
      cargarStatsTrf();
    } catch(e) {
      toast('Error', e.message, 'error');
    } finally {
      btn.innerHTML = 'Sí, eliminar';
      btn.disabled  = false;
    }
  });

  document.getElementById('btnExportarTrf').addEventListener('click', () => {
    toast('Exportar', 'Función disponible próximamente.', 'warning');
  });

  const reload = debounce(() => cargarTransferencias(), 380);
  document.getElementById('buscarTrf').addEventListener('input', reload);
  document.getElementById('filtroEstadoTrf').addEventListener('change', () => cargarTransferencias());

  setTimeout(async () => {
    try {
      await cargarCatalogosTrf();
      await cargarStatsTrf();
      cargarTransferencias();
    } catch(e) {
      toast('Error de inicio', e.message, 'error');
    }
  }, 350);
});