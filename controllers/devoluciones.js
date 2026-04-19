/* ================================================================
   controllers/devoluciones.js
   ================================================================ */

const API_DEV = '../database/devoluciones.php';

// ─── HELPERS ────────────────────────────────────────────────────
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
  setTimeout(() => el.remove(), 4200);
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
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}
function debounce(fn,ms) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }

// ─── CATÁLOGOS ──────────────────────────────────────────────────
async function cargarProductosDev() {
  const prods = await apiFetch(`${API_DEV}?action=productos`);
  const sel   = document.getElementById('devProducto');
  prods.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre} (Stock: ${Number(p.stock).toFixed(0)})`;
    sel.appendChild(opt);
  });
}

// ─── STATS ──────────────────────────────────────────────────────
async function cargarStats() {
  try {
    const s = await apiFetch(`${API_DEV}?action=stats`);
    document.getElementById('statTotal').textContent      = s.total;
    document.getElementById('statPendiente').textContent  = s.pendiente;
    document.getElementById('statClientes').textContent   = s.clientes;
    document.getElementById('statProveedores').textContent= s.proveedores;
  } catch(e) { /* silencioso */ }
}

// ─── TABLA ──────────────────────────────────────────────────────
async function cargarDevoluciones() {
  const buscar = document.getElementById('buscarDev').value;
  const estado = document.getElementById('filtroEstado').value;
  const tipo   = document.getElementById('filtroTipo').value;

  const params = new URLSearchParams({ action:'listar' });
  if (buscar) params.append('buscar', buscar);
  if (estado) params.append('estado', estado);
  if (tipo)   params.append('tipo',   tipo);

  try {
    const data = await apiFetch(`${API_DEV}?${params}`);
    renderTablaDev(data.devoluciones);
    document.getElementById('countDevText').textContent =
      `${data.total} devoluci${data.total === 1 ? 'ón' : 'ones'} encontrada${data.total === 1 ? '' : 's'}`;
  } catch(e) {
    toast('Error al cargar', e.message, 'error');
  }
}

function badgeEstadoDev(e) {
  const map = {
    'Pendiente': 'badge-pendiente', 'Aprobada':  'badge-aprobada',
    'Rechazada': 'badge-rechazada', 'Procesada': 'badge-procesada'
  };
  return `<span class="badge ${map[e]||'badge-pendiente'}">${e}</span>`;
}

function renderTablaDev(rows) {
  const tbody = document.getElementById('tbodyDev');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
      </svg><p>No hay devoluciones</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const tipoBadge = r.tipo === 'De Cliente'
      ? `<span class="badge badge-cliente">Cliente</span>`
      : `<span class="badge badge-proveedor">Proveedor</span>`;
    return `<tr>
      <td><div class="item-ref">${r.referencia}</div></td>
      <td>
        <div class="item-ref">${r.producto_nombre}</div>
        <div class="item-sub">${r.unidad_medida||''}</div>
      </td>
      <td>${Number(r.cantidad).toFixed(2)}</td>
      <td style="max-width:160px;font-size:12px;color:#6b7280">${r.motivo}</td>
      <td>${r.cliente_proveedor||'<span style="color:#9ca3af">—</span>'}</td>
      <td><span style="font-size:12px;color:#6b7280">${formatDate(r.fecha_creacion)}</span></td>
      <td>${tipoBadge}</td>
      <td>
        <select class="estado-select" onchange="cambiarEstadoDev(${r.id},this.value,this)">
          ${['Pendiente','Aprobada','Rechazada','Procesada'].map(s=>
            `<option value="${s}" ${r.estado===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-action btn-view" title="Ver detalle" onclick="verDetalleDev(${r.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="btn-action btn-cancel" title="Eliminar" onclick="eliminarDev(${r.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ─── CAMBIAR ESTADO INLINE ───────────────────────────────────────
async function cambiarEstadoDev(id, estado, selectEl) {
  const prev = selectEl.dataset.prev || selectEl.value;
  selectEl.dataset.prev = estado;
  try {
    await apiFetch(`${API_DEV}?action=cambiarEstado&id=${id}`, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ estado })
    });
    toast('Estado actualizado', `→ ${estado}`, 'success');
    cargarStats();
  } catch(e) {
    toast('Error', e.message, 'error');
    selectEl.value = prev;
  }
}

// ─── VER DETALLE ─────────────────────────────────────────────────
async function verDetalleDev(id) {
  try {
    const d = await apiFetch(`${API_DEV}?action=detalle&id=${id}`);
    document.getElementById('modalDevDetalleTitulo').textContent = `Devolución #${d.id}`;
    const tipoBadge = d.tipo === 'De Cliente'
      ? `<span class="badge badge-cliente">Cliente</span>`
      : `<span class="badge badge-proveedor">Proveedor</span>`;
    const estMap = {Pendiente:'badge-pendiente',Aprobada:'badge-aprobada',
                    Rechazada:'badge-rechazada',Procesada:'badge-procesada'};
    document.getElementById('modalDevDetalleBody').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Referencia</div>
             <div style="font-weight:700">${d.referencia}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Tipo</div>
             ${tipoBadge}</div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Producto</div>
             <div style="font-weight:600">${d.producto_nombre}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Cantidad</div>
             <div>${Number(d.cantidad).toFixed(2)} ${d.unidad_medida||''}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Cliente / Proveedor</div>
             <div>${d.cliente_proveedor||'—'}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Estado</div>
             <span class="badge ${estMap[d.estado]||''}">${d.estado}</span></div>
        <div style="grid-column:span 2">
             <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Motivo</div>
             <div>${d.motivo}</div></div>
        ${d.notas?`<div style="grid-column:span 2">
             <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Notas</div>
             <div style="background:#f9fafb;padding:10px 12px;border-radius:8px;font-size:13px">${d.notas}</div></div>`:''}
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Fecha</div>
             <div>${formatDate(d.fecha_creacion)}</div></div>
        <div><div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Registrado por</div>
             <div>${d.usuario_nombre||'—'}</div></div>
      </div>`;
    openModal('modalDevDetalle');
  } catch(e) {
    toast('Error', e.message, 'error');
  }
}

// ─── LIMPIAR MODAL ───────────────────────────────────────────────
function limpiarModalDev() {
  document.getElementById('devRef').value         = '';
  document.getElementById('devTipo').value        = 'De Cliente';
  document.getElementById('devProducto').value    = '';
  document.getElementById('devCantidad').value    = '1';
  document.getElementById('devEstado').value      = 'Pendiente';
  document.getElementById('devClienteProv').value = '';
  document.getElementById('devMotivo').value      = '';
  document.getElementById('devNotas').value       = '';
}

// ─── GUARDAR (con confirmación) ──────────────────────────────────
let devPendingGuardar = false;

async function ejecutarGuardarDev() {
  const btn = document.getElementById('btnGuardarDev');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Guardando…';
  btn.disabled  = true;

  try {
    const body = {
      referencia:         document.getElementById('devRef').value.trim(),
      tipo:               document.getElementById('devTipo').value,
      producto_id:        parseInt(document.getElementById('devProducto').value),
      cantidad:           parseFloat(document.getElementById('devCantidad').value),
      estado:             document.getElementById('devEstado').value,
      cliente_proveedor:  document.getElementById('devClienteProv').value.trim(),
      motivo:             document.getElementById('devMotivo').value.trim(),
      notas:              document.getElementById('devNotas').value.trim()
    };
    await apiFetch(`${API_DEV}?action=crear`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    closeModal('modalDev');
    toast('¡Registrada!', 'Devolución guardada correctamente.', 'success');
    cargarDevoluciones();
    cargarStats();
  } catch(e) {
    toast('Error', e.message, 'error');
  } finally {
    btn.innerHTML = orig;
    btn.disabled  = false;
  }
}

// ─── ELIMINAR ────────────────────────────────────────────────────
function eliminarDev(id) {
  document.getElementById('devEliminarId').value = id;
  openModal('modalDevEliminar');
}

// ─── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Botón nueva devolución
  document.getElementById('btnNuevaDev').addEventListener('click', () => {
    limpiarModalDev();
    document.getElementById('modalDevTitulo').textContent = 'Nueva Devolución';
    openModal('modalDev');
  });

  // Guardar → confirmar
  document.getElementById('btnGuardarDev').addEventListener('click', () => {
    const ref    = document.getElementById('devRef').value.trim();
    const prod   = document.getElementById('devProducto').value;
    const cant   = parseFloat(document.getElementById('devCantidad').value);
    const motivo = document.getElementById('devMotivo').value.trim();
    const cp     = document.getElementById('devClienteProv').value.trim();

    if (!ref)    { toast('Validación','Referencia requerida','warning'); return; }
    if (!prod)   { toast('Validación','Selecciona un producto','warning'); return; }
    if (cant<=0) { toast('Validación','Cantidad inválida','warning'); return; }
    if (!motivo) { toast('Validación','Motivo requerido','warning'); return; }
    if (!cp)     { toast('Validación','Nombre del cliente/proveedor requerido','warning'); return; }

    document.getElementById('devConfirmTitle').textContent = '¿Registrar devolución?';
    document.getElementById('devConfirmText').textContent  =
      `Se registrará la devolución "${ref}" por ${cant} unidades.`;
    devPendingGuardar = true;
    openModal('modalDevConfirmar');
  });

  document.getElementById('btnDevConfirmarOk').addEventListener('click', async () => {
    if (devPendingGuardar) {
      devPendingGuardar = false;
      closeModal('modalDevConfirmar');
      await ejecutarGuardarDev();
    }
  });

  // Eliminar confirmado
  document.getElementById('btnDevEliminarOk').addEventListener('click', async () => {
    const id  = document.getElementById('devEliminarId').value;
    const btn = document.getElementById('btnDevEliminarOk');
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled  = true;
    try {
      await apiFetch(`${API_DEV}?action=eliminar&id=${id}`, { method:'DELETE' });
      closeModal('modalDevEliminar');
      toast('Eliminada', 'Devolución eliminada correctamente.', 'warning');
      cargarDevoluciones();
      cargarStats();
    } catch(e) {
      toast('Error', e.message, 'error');
    } finally {
      btn.innerHTML = 'Sí, eliminar';
      btn.disabled  = false;
    }
  });

  // Exportar CSV básico
  document.getElementById('btnExportar').addEventListener('click', () => {
    toast('Exportar', 'Función disponible próximamente.', 'warning');
  });

  // Filtros
  const reload = debounce(() => cargarDevoluciones(), 380);
  document.getElementById('buscarDev').addEventListener('input', reload);
  document.getElementById('filtroEstado').addEventListener('change', () => cargarDevoluciones());
  document.getElementById('filtroTipo').addEventListener('change',   () => cargarDevoluciones());

  // Carga inicial
  setTimeout(async () => {
    try {
      await cargarProductosDev();
      await cargarStats();
      cargarDevoluciones();
    } catch(e) {
      toast('Error de inicio', e.message, 'error');
    }
  }, 350);
});