// =================================================================
//  usuarios.js  —  Módulo Gestión de Usuarios (Administrador)
//  Ubicación: controllers/usuarios.js
// =================================================================
'use strict';

const API = '../database/usuarios.php';

let state = {
  usuarios: [],
  bodegas: [],
  editandoId: null,
  eliminandoId: null,
  filtroRol: 'todos',
};

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof guardarAccesoPagina === 'function') guardarAccesoPagina();
  initModales();
  initFiltros();
  initPasswordToggle();
  await cargarTodo();
});

async function cargarTodo() {
  await cargarBodegas();
  await cargarUsuarios();
}

// ── CARGAR USUARIOS ───────────────────────────────────────────
async function cargarUsuarios() {
  mostrarLoading();
  try {
    const r = await fetch(`${API}?action=listar`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) { mostrarError('Error al cargar usuarios'); return; }
    state.usuarios = d.data;
    actualizarStats(d.data);
    renderUsuarios(filtrarPorRol(d.data));

    // Búsqueda
    const inp = document.getElementById('buscarUsuario');
    if (inp) {
      inp.addEventListener('input', function() {
        const q = this.value.toLowerCase();
        const base = filtrarPorRol(state.usuarios);
        renderUsuarios(base.filter(u =>
          u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        ));
      });
    }
  } catch(e) {
    console.error(e);
    mostrarError('Error de conexión al cargar usuarios');
  }
}

// ── CARGAR BODEGAS ────────────────────────────────────────────
async function cargarBodegas() {
  try {
    const r = await fetch(`${API}?action=bodegas`, { credentials: 'include' });
    const d = await r.json();
    if (!d.success) return;
    state.bodegas = d.data;
    const select = document.getElementById('usuarioBodega');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar bodega...</option>';
    d.data.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id; opt.textContent = b.nombre;
      select.appendChild(opt);
    });
  } catch(e) { console.error(e); }
}

// ── STATS ─────────────────────────────────────────────────────
function actualizarStats(usuarios) {
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('numTotal',   usuarios.length);
  set('numAdmin',   usuarios.filter(u => u.rol === 'admin').length);
  set('numJefe',    usuarios.filter(u => u.rol === 'jefe_bodega').length);
  set('numTendero', usuarios.filter(u => u.rol === 'tendero').length);
  set('numActivo',  usuarios.filter(u => u.estado === 'activo').length);
}

// ── FILTROS POR ROL ───────────────────────────────────────────
function initFiltros() {
  document.querySelectorAll('.usr-filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.usr-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      state.filtroRol = this.dataset.filter;

      const q = (document.getElementById('buscarUsuario')?.value || '').toLowerCase();
      let lista = filtrarPorRol(state.usuarios);
      if (q) lista = lista.filter(u => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      renderUsuarios(lista);
    });
  });
}

function filtrarPorRol(lista) {
  if (state.filtroRol === 'todos') return lista;
  return lista.filter(u => u.rol === state.filtroRol);
}

// ── RENDERIZAR ────────────────────────────────────────────────
function renderUsuarios(usuarios) {
  const tbody = document.getElementById('listaUsuarios');
  const count = document.getElementById('usr-count');
  if (!tbody) return;

  if (count) count.textContent = `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''}`;

  if (!usuarios.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="usr-empty">
        <div class="usr-empty-icon">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h4>Sin usuarios</h4>
        <p>No hay usuarios con estos criterios.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = usuarios.map(u => {
    const iniciales = u.nombre.trim().split(' ')
      .filter(Boolean)
      .map(p => p[0].toUpperCase())
      .slice(0, 2).join('');

    const avatarClass = {
      admin:       'usr-avatar--admin',
      jefe_bodega: 'usr-avatar--jefe',
      tendero:     'usr-avatar--tendero',
    }[u.rol] || 'usr-avatar--default';

    const rolLabel  = { admin:'Administrador', jefe_bodega:'Jefe Bodega', tendero:'Tendero' }[u.rol] || u.rol;
    const rolClass  = { admin:'usr-rol--admin', jefe_bodega:'usr-rol--jefe', tendero:'usr-rol--tendero' }[u.rol] || '';
    const estClass  = { activo:'usr-estado--activo', inactivo:'usr-estado--inactivo', suspendido:'usr-estado--suspendido' }[u.estado] || '';

    const fecha = u.creado_en
      ? new Date(u.creado_en).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })
      : '—';

    return `<tr>
      <td>
        <div class="usr-avatar-cell">
          <div class="usr-avatar ${avatarClass}">${iniciales}</div>
          <div>
            <div class="usr-user-name">${esc(u.nombre)}</div>
            <div class="usr-user-email">${esc(u.email)}</div>
            <div class="usr-user-id">#${u.id}</div>
          </div>
        </div>
      </td>
      <td><span style="font-size:13px;font-family:monospace;color:#64748b">${esc(u.identidad || '—')}</span></td>
      <td><span class="usr-rol ${rolClass}">${rolLabel}</span></td>
      <td>
        <div class="usr-bodega">
          ${u.bodega_nombre
            ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>${esc(u.bodega_nombre)}`
            : '<span style="color:#cbd5e1">—</span>'}
        </div>
      </td>
      <td><span class="usr-estado ${estClass}">${u.estado}</span></td>
      <td class="usr-fecha">${fecha}</td>
      <td>
        <div class="usr-row-actions">
          <button class="usr-row-btn" title="Editar" onclick="abrirEditar(${u.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="usr-row-btn del" title="Eliminar" onclick="confirmarEliminar(${u.id},'${esc(u.nombre)}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function mostrarLoading() {
  const tbody = document.getElementById('listaUsuarios');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7">
    <div class="usr-spinner-wrap"><span class="usr-spinner"></span> Cargando usuarios...</div>
  </td></tr>`;
}

// ── PASSWORD TOGGLE ───────────────────────────────────────────
function initPasswordToggle() {
  const btn = document.getElementById('btnTogglePass');
  const inp = document.getElementById('usuarioPassword');
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    document.getElementById('eyeIcon').innerHTML = show
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });
}

// ── MODALES ───────────────────────────────────────────────────
function initModales() {
  document.getElementById('btnAgregarUsuario')?.addEventListener('click', abrirNuevo);
  document.getElementById('modalUsuarioClose')?.addEventListener('click', () => cerrarModal('modalUsuario'));
  document.getElementById('btnCancelarUsuario')?.addEventListener('click', () => cerrarModal('modalUsuario'));
  document.getElementById('btnGuardarUsuario')?.addEventListener('click', guardarUsuario);

  document.getElementById('modalEliminarClose')?.addEventListener('click', () => cerrarModal('modalEliminar'));
  document.getElementById('btnCancelarEliminar')?.addEventListener('click', () => cerrarModal('modalEliminar'));
  document.getElementById('btnConfirmarEliminar')?.addEventListener('click', ejecutarEliminar);

  // Cambio de rol → mostrar/ocultar bodega
  document.getElementById('usuarioRol')?.addEventListener('change', function() {
    const gb = document.getElementById('grupoBodega');
    const sb = document.getElementById('usuarioBodega');
    if (!gb || !sb) return;
    if (this.value === 'jefe_bodega') {
      gb.style.display = 'flex'; sb.required = true;
    } else {
      gb.style.display = 'none'; sb.required = false; sb.value = '';
    }
  });

  // Cerrar con Esc o click fuera
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cerrarModal('modalUsuario'); cerrarModal('modalEliminar'); }
  });
  document.addEventListener('click', e => {
    if (e.target.classList.contains('usr-modal-overlay')) {
      e.target.classList.remove('show');
      e.target.setAttribute('aria-hidden', 'true');
    }
  });
}

function abrirNuevo() {
  state.editandoId = null;
  document.getElementById('modalTag').textContent = 'NUEVO';
  document.getElementById('modalUsuarioTitle').textContent = 'Nuevo Usuario';
  document.getElementById('formUsuario').reset();
  document.getElementById('passReq').style.display = '';
  document.getElementById('passHint').style.display = 'none';
  document.getElementById('usuarioPassword').required = true;
  document.getElementById('grupoBodega').style.display = 'none';
  abrirModal('modalUsuario');
}

function abrirEditar(id) {
  const u = state.usuarios.find(x => x.id === id);
  if (!u) return;
  state.editandoId = id;
  document.getElementById('modalTag').textContent = 'EDITAR';
  document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuario';
  document.getElementById('usuarioNombre').value    = u.nombre;
  document.getElementById('usuarioEmail').value     = u.email;
  document.getElementById('usuarioIdentidad').value = u.identidad || '';
  document.getElementById('usuarioPassword').value  = '';
  document.getElementById('usuarioPassword').required = false;
  document.getElementById('passReq').style.display  = 'none';
  document.getElementById('passHint').style.display = '';
  document.getElementById('usuarioRol').value    = u.rol;
  document.getElementById('usuarioEstado').value = u.estado;

  const gb = document.getElementById('grupoBodega');
  if (u.rol === 'jefe_bodega') {
    gb.style.display = 'flex';
    document.getElementById('usuarioBodega').required = true;
    document.getElementById('usuarioBodega').value = u.bodega_asignada_id || '';
  } else {
    gb.style.display = 'none';
    document.getElementById('usuarioBodega').required = false;
  }
  abrirModal('modalUsuario');
}

function confirmarEliminar(id, nombre) {
  state.eliminandoId = id;
  const msg = document.getElementById('confirmEliminarMsg');
  if (msg) msg.innerHTML = `¿Deseas eliminar a <strong>${esc(nombre)}</strong>?`;
  abrirModal('modalEliminar');
}

function abrirModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('show');
  m.setAttribute('aria-hidden', 'false');
}

function cerrarModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('show');
  m.setAttribute('aria-hidden', 'true');
}

// ── GUARDAR ───────────────────────────────────────────────────
async function guardarUsuario() {
  const nombre    = document.getElementById('usuarioNombre').value.trim();
  const email     = document.getElementById('usuarioEmail').value.trim();
  const identidad = document.getElementById('usuarioIdentidad').value.trim();
  const password  = document.getElementById('usuarioPassword').value.trim();
  const rol       = document.getElementById('usuarioRol').value;
  const bodegaId  = document.getElementById('usuarioBodega').value;
  const estado    = document.getElementById('usuarioEstado').value;

  if (!nombre || !email || !identidad || !rol || !estado) {
    mostrarError('Completa todos los campos requeridos'); return;
  }
  if (rol === 'jefe_bodega' && !bodegaId) {
    mostrarError('Debes asignar una bodega al Jefe de Bodega'); return;
  }
  if (!state.editandoId && !password) {
    mostrarError('La contraseña es requerida para nuevos usuarios'); return;
  }
  if (password && password.length < 8) {
    mostrarError('La contraseña debe tener mínimo 8 caracteres'); return;
  }

  const btn = document.getElementById('btnGuardarUsuario');
  btn.disabled = true;
  btn.innerHTML = `<span class="usr-spinner" style="width:15px;height:15px;border-width:2px"></span> Guardando...`;

  try {
    const body = { nombre, email, identidad, rol, estado,
      bodega_asignada_id: rol === 'jefe_bodega' ? bodegaId : null };
    if (password) body.password = password;

    const method = state.editandoId ? 'PUT' : 'POST';
    const url    = state.editandoId ? `${API}?id=${state.editandoId}` : API;

    const r = await fetch(url, {
      method, credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json();

    if (!d.success) { mostrarError(d.error || 'Error al guardar'); return; }

    mostrarNotificacion(d.message || 'Usuario guardado correctamente', 'success');
    cerrarModal('modalUsuario');
    await cargarUsuarios();
  } catch(e) {
    console.error(e); mostrarError('Error de conexión');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Guardar Usuario`;
  }
}

// ── ELIMINAR ──────────────────────────────────────────────────
async function ejecutarEliminar() {
  if (!state.eliminandoId) return;
  const btn = document.getElementById('btnConfirmarEliminar');
  btn.disabled = true;
  btn.innerHTML = `<span class="usr-spinner" style="width:15px;height:15px;border-width:2px"></span> Eliminando...`;
  try {
    const r = await fetch(`${API}?id=${state.eliminandoId}`, { method:'DELETE', credentials:'include' });
    const d = await r.json();
    if (!d.success) { mostrarError(d.error || 'Error al eliminar'); return; }
    mostrarNotificacion(d.message || 'Usuario eliminado', 'success');
    cerrarModal('modalEliminar');
    await cargarUsuarios();
  } catch(e) {
    console.error(e); mostrarError('Error de conexión');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg> Eliminar`;
  }
}

// ── HELPERS ───────────────────────────────────────────────────
function esc(txt) {
  const d = document.createElement('div');
  d.textContent = String(txt ?? '');
  return d.innerHTML;
}

function mostrarError(msg) { mostrarNotificacion(msg, 'error'); }

function mostrarNotificacion(msg, tipo = 'info') {
  const n = document.createElement('div');
  n.className = `notificacion notificacion-${tipo}`;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 4000);
}

// Exponer para onclick inline en HTML
window.abrirEditar       = abrirEditar;
window.confirmarEliminar = confirmarEliminar;
