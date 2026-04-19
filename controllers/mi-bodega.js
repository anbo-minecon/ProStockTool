// =================================================================
//  mi-bodega.js  —  Módulo Mi Bodega (Jefe de Bodega) — MEJORADO
//  Ubicación: controllers/mi-bodega.js
// =================================================================
'use strict';

const API = '../database/mi_bodega.php';
const API_MOV = '../database/movimientos.php';

let state = {
  bodegaId: null,
  productos: [],
  compartidas: [],
  recibidas: [],
  enviadas: [],
  revocarId: null,
  jefeSelId: null,
  jefesDisp: [],
};

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof guardarAccesoPagina === 'function') guardarAccesoPagina();
  initTabs();
  initModales();
  await cargarTodo();
});

async function cargarTodo() {
  await cargarMiBodega();
  cargarCompartidas();
  cargarRecibidas();
  cargarEnviadas();
}

// ── TABS ──────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panelId = btn.dataset.tab + '-panel';
      document.getElementById(panelId)?.classList.add('active');
    });
  });
}

// ── MI BODEGA ─────────────────────────────────────────────────
async function cargarMiBodega() {
  try {
    const r = await fetch(`${API}?action=mi_bodega`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) {
      document.getElementById('listaProductos').innerHTML =
        `<div class="empty-state"><h4>Sin bodega asignada</h4><p>${d.error}</p></div>`;
      return;
    }
    const b = d.data;
    state.bodegaId = b.id;
    document.getElementById('bodegaTitulo').textContent = b.nombre;
    document.getElementById('bodegaSubtitulo').textContent = b.descripcion || 'Tu bodega asignada';

    await cargarProductosBodega(b.id);
    await cargarActividadBodega(b.id);
  } catch(e) {
    document.getElementById('listaProductos').innerHTML =
      `<div class="empty-state"><h4>Error de conexión</h4></div>`;
  }
}

async function cargarProductosBodega(bodegaId) {
  try {
    const r = await fetch(`${API}?action=detalle_bodega&bodega_id=${bodegaId}`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) return;

    state.productos = d.data.productos;
    actualizarStats();
    mostrarAlertasStock();
    renderTablaProductos(state.productos);

    // Filtros de la tabla
    document.getElementById('buscarProducto').addEventListener('input', function() {
      filtrarProductos();
    });
    document.getElementById('filtroEstado').addEventListener('change', function() {
      filtrarProductos();
    });
  } catch(e) {}
}

function filtrarProductos() {
  const q  = document.getElementById('buscarProducto').value.toLowerCase();
  const st = document.getElementById('filtroEstado').value;
  const filtrados = state.productos.filter(p => {
    const matchQ  = !q  || p.nombre.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q);
    const matchSt = !st || stockStatus(p.stock) === st;
    return matchQ && matchSt;
  });
  renderTablaProductos(filtrados);
}

function renderTablaProductos(prods) {
  const cont = document.getElementById('listaProductos');
  if (!prods.length) {
    cont.innerHTML = `<div class="empty-state" style="padding:40px"><h4>Sin productos</h4><p>No hay productos con esos criterios.</p></div>`;
    return;
  }
  cont.innerHTML = `
    <div class="table-wrap">
      <table class="g-table">
        <thead>
          <tr><th>Producto</th><th>SKU</th><th>Categoría</th><th>Stock</th><th>Stock Mín.</th><th>Precio</th></tr>
        </thead>
        <tbody>
          ${prods.map(p => {
            const st = stockStatus(p.stock);
            const stLabel = { ok:`${p.stock} ✓`, low:`${p.stock} ⚠`, empty:'0 ✕' }[st];
            const stClass = `prod-stock-${st}`;
            return `<tr>
              <td><strong>${esc(p.nombre)}</strong></td>
              <td><code style="font-size:12px;color:var(--text-muted)">${esc(p.sku||'—')}</code></td>
              <td>${esc(p.categoria||'—')}</td>
              <td><span class="badge ${stClass}">${stLabel}</span></td>
              <td>${p.stock_min ?? '—'}</td>
              <td>${formatMoney(p.precio)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function actualizarStats() {
  const ps = state.productos;
  document.getElementById('sTotalProd').textContent  = ps.length;
  document.getElementById('sTotalStock').textContent = ps.reduce((a, p) => a + (parseInt(p.stock)||0), 0);
  document.getElementById('sStockBajo').textContent  = ps.filter(p => p.stock > 0 && p.stock < 10).length;
  document.getElementById('sSinStock').textContent   = ps.filter(p => !(p.stock > 0)).length;
}

function mostrarAlertasStock() {
  const sinStock   = state.productos.filter(p => !(p.stock > 0));
  const stockBajo  = state.productos.filter(p => p.stock > 0 && p.stock < 10);
  const alertas = document.getElementById('alertasStock');

  const items = [];
  if (sinStock.length) {
    items.push(`
      <div class="alerta-stock critica">
        <div class="alerta-stock-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
        <div>
          <p class="alerta-stock-titulo">🚨 ${sinStock.length} producto${sinStock.length>1?'s':''} sin stock</p>
          <p class="alerta-stock-desc">${sinStock.slice(0,3).map(p=>esc(p.nombre)).join(', ')}${sinStock.length>3?` y ${sinStock.length-3} más.`:''}</p>
        </div>
      </div>`);
  }
  if (stockBajo.length) {
    items.push(`
      <div class="alerta-stock">
        <div class="alerta-stock-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div>
          <p class="alerta-stock-titulo">⚠ ${stockBajo.length} producto${stockBajo.length>1?'s':''} con stock bajo</p>
          <p class="alerta-stock-desc">${stockBajo.slice(0,3).map(p=>`${esc(p.nombre)} (${p.stock})`).join(', ')}${stockBajo.length>3?` y ${stockBajo.length-3} más.`:''}</p>
        </div>
      </div>`);
  }

  if (items.length) {
    alertas.style.display = 'block';
    alertas.innerHTML = `<div class="alertas-list">${items.join('')}</div>`;
  }
}

// ── ACTIVIDAD RECIENTE ────────────────────────────────────────
async function cargarActividadBodega(bodegaId) {
  const cont = document.getElementById('listaActividad');
  try {
    // Cargamos transferencias y devoluciones recientes de esta bodega
    const r = await fetch(`${API_MOV}?action=recientes&bodega_id=${bodegaId}&limit=15`, { credentials: 'include' });
    const d = await r.json();

    if (!d.success || !d.data?.length) {
      cont.innerHTML = `<div class="empty-state" style="padding:40px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <h4>Sin actividad reciente</h4><p>Los movimientos aparecerán aquí.</p></div>`;
      return;
    }

    cont.innerHTML = d.data.map(m => {
      const tipo  = m.tipo || m.tipo_movimiento || 'entrada';
      const icons = {
        entrada:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="19 12 12 5 5 12"/><line x1="12" y1="19" x2="12" y2="5"/></svg>`,
        salida:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="5 12 12 19 19 12"/><line x1="12" y1="5" x2="12" y2="19"/></svg>`,
        transferencia:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
        devolucion:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.77"/></svg>`,
      };
      const signo = tipo === 'entrada' || tipo === 'transferencia' ? '+' : '-';
      const colorCant = tipo === 'entrada' ? 'var(--secondary-hover)' : '#dc2626';
      return `
        <div class="actividad-item">
          <div class="act-tipo-icon ${tipo}">${icons[tipo] || icons.entrada}</div>
          <div style="flex:1">
            <p class="act-desc">${esc(m.producto_nombre || m.descripcion || 'Movimiento')}</p>
            <p class="act-meta">${tipoLabel(tipo)} · ${esc(m.usuario_nombre || '—')} · ${formatFecha(m.fecha)}</p>
          </div>
          <span class="act-cantidad" style="color:${colorCant}">${signo}${m.cantidad ?? 0}</span>
        </div>`;
    }).join('');
  } catch(e) {
    cont.innerHTML = `<div class="empty-state" style="padding:40px"><h4>Error cargando actividad</h4></div>`;
  }
}

// ── BODEGAS COMPARTIDAS ───────────────────────────────────────
async function cargarCompartidas() {
  try {
    const r = await fetch(`${API}?action=bodegas_compartidas`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) return;
    state.compartidas = d.data;
    document.getElementById('sCompartidas').textContent = d.data.length;

    if (d.data.length) {
      const b = document.getElementById('badgeCompartidas');
      b.textContent = d.data.length;
      b.style.display = 'inline-flex';
    }
    renderCompartidas(d.data);
  } catch(e) {}
}

function renderCompartidas(lista) {
  const cont = document.getElementById('listaCompartidas');
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state" style="padding:60px 20px">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      <h4>Sin bodegas compartidas</h4><p>Aún no tienes acceso a bodegas de otros jefes.</p></div>`;
    return;
  }
  cont.innerHTML = `<div class="compartidas-grid">${lista.map(bc => `
    <div class="compartida-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px">
        <p class="compartida-titulo">${esc(bc.bodega_nombre)}</p>
        <span class="badge badge-${bc.nivel_permiso}">${nivelLabel(bc.nivel_permiso)}</span>
      </div>
      <p class="compartida-owner">👤 ${esc(bc.propietario_nombre)} — ${esc(bc.propietario_email)}</p>
      <div class="compartida-stats">
        <div><div class="cs-num">${bc.total_productos}</div><div class="cs-lbl">Productos</div></div>
        <div><div class="cs-num">${bc.total_stock}</div><div class="cs-lbl">Unidades</div></div>
      </div>
      <div class="compartida-footer">
        <span style="font-size:12px;color:var(--text-muted)">Desde ${formatFecha(bc.fecha_respuesta)}</span>
        <button class="btn btn-secondary btn-sm" onclick="verDetalle(${bc.bodega_id},'${esc(bc.bodega_nombre)}','${esc(bc.propietario_nombre)}')">Ver productos</button>
      </div>
    </div>`).join('')}</div>`;
}

// ── INVITACIONES ENVIADAS ─────────────────────────────────────
async function cargarEnviadas() {
  try {
    const r = await fetch(`${API}?action=invitaciones_enviadas`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) return;
    state.enviadas = d.data;

    const pendientes = d.data.filter(e => e.estado === 'pendiente').length;
    if (pendientes) {
      const b = document.getElementById('badgeEnviadas');
      b.textContent = pendientes; b.style.display = 'inline-flex';
    }
    renderEnviadas(d.data);
  } catch(e) {}
}

function renderEnviadas(lista) {
  const cont = document.getElementById('listaEnviadas');
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state" style="padding:60px 20px">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      <h4>Sin invitaciones enviadas</h4><p>Usa el botón "Compartir Bodega" para invitar a otros jefes.</p></div>`;
    return;
  }
  cont.innerHTML = lista.map(inv => `
    <div class="enviada-card">
      <div class="enviada-header">
        <div>
          <p class="enviada-nombre">${esc(inv.invitado_nombre)}</p>
          <p class="enviada-email">${esc(inv.invitado_email)}</p>
        </div>
        <span class="badge badge-${inv.estado}">${estadoLabel(inv.estado)}</span>
      </div>
      <p class="enviada-meta">
        <strong>Bodega:</strong> ${esc(inv.bodega_nombre)} &nbsp;|&nbsp;
        <strong>Permiso:</strong> <span class="badge badge-${inv.nivel_permiso}">${nivelLabel(inv.nivel_permiso)}</span>
      </p>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
        Enviada ${formatFecha(inv.fecha_invitacion)}
        ${inv.fecha_respuesta ? ` · Respondida ${formatFecha(inv.fecha_respuesta)}` : ''}
      </p>
      <div class="enviada-actions">
        ${inv.estado === 'aceptada' ? `
          <select class="permiso-select" onchange="actualizarPermiso(${inv.id}, this.value)">
            <option value="lectura"     ${inv.nivel_permiso==='lectura'    ?'selected':''}>Lectura</option>
            <option value="edicion"     ${inv.nivel_permiso==='edicion'    ?'selected':''}>Edición</option>
            <option value="eliminacion" ${inv.nivel_permiso==='eliminacion'?'selected':''}>Eliminación</option>
          </select>
          <button class="btn btn-danger btn-sm" onclick="confirmarRevocar(${inv.id}, '${esc(inv.invitado_nombre)}')">Revocar acceso</button>
        ` : inv.estado === 'pendiente' ? `
          <button class="btn btn-danger btn-sm" onclick="confirmarRevocar(${inv.id}, '${esc(inv.invitado_nombre)}')">Cancelar invitación</button>
        ` : `<span style="font-size:13px;color:var(--text-muted)">Invitación rechazada</span>`}
      </div>
    </div>`).join('');
}

// ── INVITACIONES RECIBIDAS ────────────────────────────────────
async function cargarRecibidas() {
  try {
    const r = await fetch(`${API}?action=invitaciones_recibidas`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) return;
    state.recibidas = d.data;

    const pendientes = d.data.length;
    if (pendientes) {
      const b = document.getElementById('badgeRecibidas');
      b.textContent = pendientes; b.style.display = 'inline-flex';
    }
    renderRecibidas(d.data);
  } catch(e) {}
}

function renderRecibidas(lista) {
  const cont = document.getElementById('listaRecibidas');
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state" style="padding:60px 20px">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <h4>Sin invitaciones pendientes</h4><p>Aquí aparecerán las invitaciones de otros jefes para compartir su bodega.</p></div>`;
    return;
  }
  cont.innerHTML = lista.map(inv => `
    <div class="recibida-card" data-id="${inv.id}" data-propietario="${esc(inv.propietario_nombre)}" data-bodega="${esc(inv.bodega_nombre)}">
      <div class="recibida-header">
        <div>
          <p class="recibida-nombre">${esc(inv.propietario_nombre)}</p>
          <p class="recibida-email">${esc(inv.propietario_email)}</p>
        </div>
        <span class="badge badge-info">Pendiente</span>
      </div>
      <p class="recibida-meta">
        <strong>Bodega:</strong> ${esc(inv.bodega_nombre)} &nbsp;|&nbsp;
        <strong>Permiso:</strong> <span class="badge badge-${inv.nivel_permiso}">${nivelLabel(inv.nivel_permiso)}</span>
      </p>
      <p class="recibida-details">
        📦 ${inv.total_productos} productos &nbsp; | &nbsp; 📊 ${inv.total_stock} unidades
      </p>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
        Invitación recibida ${formatFecha(inv.fecha_invitacion)}
      </p>
      <div class="recibida-actions">
        <button class="btn btn-success btn-sm btn-aceptar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Aceptar
        </button>
        <button class="btn btn-danger btn-sm btn-rechazar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Rechazar
        </button>
      </div>
    </div>`).join('');

  // Event listeners
  document.querySelectorAll('.recibida-card .btn-aceptar').forEach(btn => {
    btn.addEventListener('click', async function() {
      const card = this.closest('.recibida-card');
      const id = parseInt(card.dataset.id);
      const propietario = card.dataset.propietario;
      const bodega = card.dataset.bodega;
      await aceptarInvitacion(id, propietario, bodega);
    });
  });

  document.querySelectorAll('.recibida-card .btn-rechazar').forEach(btn => {
    btn.addEventListener('click', async function() {
      const card = this.closest('.recibida-card');
      const id = parseInt(card.dataset.id);
      const propietario = card.dataset.propietario;
      const bodega = card.dataset.bodega;
      await rechazarInvitacion(id, propietario, bodega);
    });
  });
}

async function aceptarInvitacion(compartidaId, propietarioNombre, bodegaNombre) {
  try {
    const r = await fetch(`${API}?action=aceptar_invitacion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ compartida_id: compartidaId })
    });
    const d = await r.json();
    if (d.success) {
      if (typeof NotificacionesBodega !== 'undefined' && NotificacionesBodega.invitacionAceptada) {
        NotificacionesBodega.invitacionAceptada(bodegaNombre);
      } else {
        mostrarNotificacion(`¡Excelente! Ahora tienes acceso a "${bodegaNombre}"`, 'success');
      }
      await cargarRecibidas();
      await cargarCompartidas();
      const tab = document.querySelector('[data-tab="recibidas"]');
      if (tab && !state.recibidas.length) {
        document.querySelector('[data-tab="compartidas"]').click();
      }
    } else {
      mostrarNotificacion(d.error || 'Error al aceptar invitación', 'error');
    }
  } catch(e) {
    mostrarNotificacion('Error de conexión', 'error');
  }
}

async function rechazarInvitacion(compartidaId, propietarioNombre, bodegaNombre) {
  try {
    const r = await fetch(`${API}?action=rechazar_invitacion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ compartida_id: compartidaId })
    });
    const d = await r.json();
    if (d.success) {
      if (typeof NotificacionesBodega !== 'undefined' && NotificacionesBodega.invitacionRechazada) {
        NotificacionesBodega.invitacionRechazada(propietarioNombre);
      } else {
        mostrarNotificacion(`Invitación de "${bodegaNombre}" rechazada`, 'info');
      }
      await cargarRecibidas();
    } else {
      mostrarNotificacion(d.error || 'Error al rechazar invitación', 'error');
    }
  } catch(e) {
    mostrarNotificacion('Error de conexión', 'error');
  }
}

// ── MODAL COMPARTIR ───────────────────────────────────────────
function initModales() {
  // Compartir
  document.getElementById('btnCompartir').addEventListener('click', () => {
    abrirModal('modalCompartir'); cargarJefes();
  });
  document.getElementById('modalCompartirClose').addEventListener('click', () => cerrarModal('modalCompartir'));
  document.getElementById('btnCancelarCompartir').addEventListener('click', () => cerrarModal('modalCompartir'));
  document.getElementById('btnEnviarInvitacion').addEventListener('click', enviarInvitacion);
  document.getElementById('btnDeseleccionarJefe').addEventListener('click', deseleccionarJefe);

  document.getElementById('buscarJefe').addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.jefe-item').forEach(i => {
      i.style.display = i.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // Detalle
  document.getElementById('modalDetalleClose').addEventListener('click', () => cerrarModal('modalDetalle'));
  document.getElementById('btnCerrarDetalle').addEventListener('click',  () => cerrarModal('modalDetalle'));

  // Revocar
  document.getElementById('modalRevocarClose').addEventListener('click',   () => cerrarModal('modalRevocar'));
  document.getElementById('btnCancelarRevocar').addEventListener('click',  () => cerrarModal('modalRevocar'));
  document.getElementById('btnConfirmarRevocar').addEventListener('click', ejecutarRevocar);

  // Esc y click fuera
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') ['modalCompartir','modalDetalle','modalRevocar'].forEach(id => cerrarModal(id));
  });
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('show'); e.target.setAttribute('aria-hidden','true');
    }
  });
}

async function cargarJefes() {
  const lista = document.getElementById('listaJefes');
  lista.innerHTML = `<div class="spinner-wrap" style="padding:20px"><div class="spinner"></div></div>`;
  try {
    const r = await fetch(`${API}?action=jefes_disponibles`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success || !d.data.length) {
      lista.innerHTML = `<div class="empty-state" style="padding:20px"><h4>Sin usuarios disponibles</h4></div>`;
      return;
    }
    state.jefesDisp = d.data;
    lista.innerHTML = d.data.map(j => `
      <div class="jefe-item" data-id="${j.id}" onclick="seleccionarJefe(${j.id},'${esc(j.nombre)}')">
        <div class="jefe-avatar">${iniciales(j.nombre)}</div>
        <div>
          <div class="jefe-nombre">${esc(j.nombre)}</div>
          <div class="jefe-email">${esc(j.email)}</div>
          ${j.bodega_nombre ? `<div class="jefe-bodega">📦 ${esc(j.bodega_nombre)}</div>` : ''}
        </div>
      </div>`).join('');
  } catch(e) {
    lista.innerHTML = `<div class="empty-state" style="padding:20px"><h4>Error de conexión</h4></div>`;
  }
}

function seleccionarJefe(id, nombre) {
  state.jefeSelId = id;
  document.querySelectorAll('.jefe-item').forEach(i => i.classList.toggle('selected', parseInt(i.dataset.id) === id));
  document.getElementById('jefeChipNombre').textContent = nombre;
  document.getElementById('jefeSeleccionado').style.display = 'inline-flex';
  document.getElementById('grupoPermiso').style.display = 'block';
  document.getElementById('btnEnviarInvitacion').disabled = false;
}

function deseleccionarJefe() {
  state.jefeSelId = null;
  document.querySelectorAll('.jefe-item').forEach(i => i.classList.remove('selected'));
  document.getElementById('jefeSeleccionado').style.display = 'none';
  document.getElementById('grupoPermiso').style.display = 'none';
  document.getElementById('btnEnviarInvitacion').disabled = true;
}

async function enviarInvitacion() {
  if (!state.jefeSelId) return;
  const nivel = document.querySelector('input[name="nivelPermiso"]:checked')?.value || 'lectura';
  const jefeNombre = state.jefesDisp.find(j => j.id === state.jefeSelId)?.nombre || 'Usuario';
  const btn   = document.getElementById('btnEnviarInvitacion');
  btn.disabled = true; btn.textContent = 'Enviando...';
  try {
    const r = await fetch(`${API}?action=invitar`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitado_id: state.jefeSelId, nivel_permiso: nivel })
    });
    const d = await r.json();
    if (d.success) {
      cerrarModal('modalCompartir');
      NotificacionesBodega.invitacionEnviada(jefeNombre);
      deseleccionarJefe();
      cargarEnviadas();
    } else {
      NotificacionesBodega.errorEnviarInvitacion(d.error || 'Error desconocido');
    }
  } catch(e) { 
    NotificacionesBodega.errorConexion();
  }
  finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Invitación`;
  }
}

async function verDetalle(bodegaId, nombre, propietario) {
  document.getElementById('modalDetalleTitulo').textContent  = nombre;
  document.getElementById('modalDetalleSubtitulo').textContent = `Propietario: ${propietario}`;
  document.getElementById('modalDetalleBody').innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  abrirModal('modalDetalle');
  try {
    const r = await fetch(`${API}?action=detalle_bodega&bodega_id=${bodegaId}`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) { document.getElementById('modalDetalleBody').innerHTML = `<div class="empty-state"><h4>${d.error}</h4></div>`; return; }
    const ps = d.data.productos;
    document.getElementById('modalDetalleBody').innerHTML = ps.length
      ? `<div class="table-wrap"><table class="g-table">
          <thead><tr><th>Producto</th><th>SKU</th><th>Stock</th><th>Precio</th></tr></thead>
          <tbody>${ps.map(p => {
            const st = stockStatus(p.stock);
            return `<tr><td><strong>${esc(p.nombre)}</strong></td><td><code style="font-size:12px">${esc(p.sku||'—')}</code></td>
              <td><span class="badge badge-${st==='ok'?'green':st==='low'?'orange':'red'}">${p.stock}</span></td>
              <td>${formatMoney(p.precio)}</td></tr>`;
          }).join('')}</tbody>
        </table></div>`
      : `<div class="empty-state"><h4>Sin productos</h4></div>`;
  } catch(e) { document.getElementById('modalDetalleBody').innerHTML = `<div class="empty-state"><h4>Error de conexión</h4></div>`; }
}

function confirmarRevocar(id, nombre) {
  state.revocarId = id;
  document.getElementById('revocarNombre').textContent = nombre;
  abrirModal('modalRevocar');
}

async function ejecutarRevocar() {
  if (!state.revocarId) return;
  const nombreJefe = document.getElementById('revocarNombre').textContent;
  try {
    const r = await fetch(`${API}?id=${state.revocarId}`, { method: 'DELETE', credentials: 'include' });
    const d = await r.json();
    if (d.success) { 
      cerrarModal('modalRevocar'); 
      NotificacionesBodega.accesoRevocado(nombreJefe); 
      cargarEnviadas(); 
    }
    else NotificacionesBodega.errorRevocar(d.error || 'Error desconocido');
  } catch(e) { NotificacionesBodega.errorConexion(); }
}

async function actualizarPermiso(compartidaId, nivel) {
  try {
    const r = await fetch(`${API}?action=actualizar_permiso`, {
      method:'PUT', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ compartida_id: compartidaId, nivel_permiso: nivel })
    });
    const d = await r.json();
    if (d.success) {
      NotificacionesBodega.permisoActualizado(nivel);
    } else {
      NotificacionesBodega.errorActualizarPermiso(d.error || 'Error desconocido');
    }
  } catch(e) { NotificacionesBodega.errorConexion(); }
}

// ── HELPERS ───────────────────────────────────────────────────
function abrirModal(id)  { const m=document.getElementById(id); m?.classList.add('show'); m?.removeAttribute('aria-hidden'); }
function cerrarModal(id) { const m=document.getElementById(id); m?.classList.remove('show'); m?.setAttribute('aria-hidden','true'); }
function stockStatus(s)  { s = parseInt(s||0); return s<=0?'empty':s<10?'low':'ok'; }
function nivelLabel(n)   { return {lectura:'Lectura',edicion:'Edición',eliminacion:'Eliminación'}[n]||n; }
function estadoLabel(e)  { return {pendiente:'Pendiente',aceptada:'Aceptada',rechazada:'Rechazada'}[e]||e; }
function tipoLabel(t)    { return {entrada:'Entrada',salida:'Salida',transferencia:'Transferencia',devolucion:'Devolución'}[t]||t; }
function iniciales(n)    { if(!n)return'U'; const p=n.trim().split(' '); return p.length===1?p[0][0].toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase(); }
function formatMoney(v)  { return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v||0); }
function formatFecha(f)  { if(!f)return'—'; return new Date(f).toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'}); }
function esc(t)          { return String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// Exponer para onclick en HTML
window.seleccionarJefe    = seleccionarJefe;
window.verDetalle         = verDetalle;
window.confirmarRevocar   = confirmarRevocar;
window.actualizarPermiso  = actualizarPermiso;
