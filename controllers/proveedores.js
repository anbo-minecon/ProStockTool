// API config
const API_PROV = 'http://localhost/Pro-Stock-Tool/database/proveedores.php';
const API_PARAM = 'http://localhost/Pro-Stock-Tool/database/parametros.php';

let proveedores = [];
let proveedorEditando = null;
let parametrosEstados = [];

// Elements
const buscarProveedor = document.getElementById('buscarProveedor');
const listaProveedores = document.getElementById('listaProveedores');
const alertaNotificacion = document.getElementById('alertaNotificacion');

// Modal
const modalOverlayProveedor = document.getElementById('modalOverlayProveedor');
const modalTitleProveedor = document.getElementById('modalTitleProveedor');
const formProveedor = document.getElementById('formProveedor');
const btnNuevoProveedor = document.getElementById('btnNuevoProveedor');
const btnCerrarModalProveedor = document.getElementById('modalCloseProveedor');
const btnCancelarProveedor = document.getElementById('cancelBtnProveedor');

// Fields
const provNif = document.getElementById('provNif');
const provEstado = document.getElementById('provEstado');
const provNombre = document.getElementById('provNombre');
const provContacto = document.getElementById('provContacto');
const provEmail = document.getElementById('provEmail');
const provTelefono = document.getElementById('provTelefono');
const provDireccion = document.getElementById('provDireccion');
const provCiudad = document.getElementById('provCiudad');
const provWeb = document.getElementById('provWeb');
const provTerminos = document.getElementById('provTerminos');

// Init
document.addEventListener('DOMContentLoaded', () => {
  Promise.all([cargarParametrosEstado(), cargarProveedores()]);
  initEvents();
});

function initEvents(){
  if (btnNuevoProveedor) btnNuevoProveedor.addEventListener('click', abrirModalNuevoProveedor);
  if (btnCerrarModalProveedor) btnCerrarModalProveedor.addEventListener('click', cerrarModalProveedor);
  if (btnCancelarProveedor) btnCancelarProveedor.addEventListener('click', cerrarModalProveedor);
  if (formProveedor) formProveedor.addEventListener('submit', guardarProveedor);
  if (buscarProveedor) buscarProveedor.addEventListener('input', filtrarProveedores);

  // Delegation for edit/delete
  if (listaProveedores) {
    listaProveedores.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = parseInt(btn.getAttribute('data-id'), 10);
      if (!id) return;
      const action = btn.getAttribute('data-action');
      if (action === 'edit') editarProveedor(id);
      if (action === 'delete') eliminarProveedor(id);
    });
  }
}

async function cargarParametrosEstado(){
  try{
    const url = `${API_PARAM}?_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    const data = await resp.json();
    if (data.success){
      parametrosEstados = data.data;
      poblarSelectEstados();
    }
  }catch(e){ /* silencioso */ }
}

function poblarSelectEstados(){
  if (!provEstado || !Array.isArray(parametrosEstados)) return;
  provEstado.innerHTML = parametrosEstados.map(p => `<option value="${p.id}" data-color="${p.color}">${p.nombre}</option>`).join('');
}

// API
async function cargarProveedores(){
  try{
    const url = `${API_PROV}?_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    const data = await resp.json();
    if (data.success){
      proveedores = data.data;
      renderProveedores(proveedores);
    } else {
      mostrarAlerta(data.error || 'Error al cargar proveedores', 'error');
    }
  }catch(err){
    console.error(err);
    mostrarAlerta('Error de conexión', 'error');
  }
}

async function crearProveedor(body){
  const resp = await fetch(API_PROV, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  return resp.json();
}

async function actualizarProveedor(id, body){
  const resp = await fetch(API_PROV, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, ...body })});
  return resp.json();
}

async function eliminarProveedor(id){
  if (!confirm('¿Seguro que deseas eliminar este proveedor?')) return;
  try{
    const resp = await fetch(API_PROV, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id })});
    const data = await resp.json();
    if (data.success){
      mostrarAlerta(data.message || 'Proveedor eliminado', 'success');
      cargarProveedores();
    } else {
      mostrarAlerta(data.error || 'No se pudo eliminar', 'error');
    }
  }catch(err){
    console.error(err);
    mostrarAlerta('Error de conexión', 'error');
  }
}

// UI
function renderProveedores(items){
  if (!items.length){
    listaProveedores.innerHTML = '<div class="empty-state">No hay proveedores registrados</div>';
    return;
  }

  listaProveedores.innerHTML = items.map(p => {
    const badgeName = p.estado_nombre || p.estado || 'ACTIVO';
    const badgeColor = safeColor(p.estado_color);
    return `
    <div class="card-proveedor">
      <div class="card-actions">
        <button type="button" class="btn-icon" title="Editar" data-action="edit" data-id="${p.id}">✏️</button>
        <button type="button" class="btn-icon" title="Eliminar" data-action="delete" data-id="${p.id}">🗑️</button>
      </div>
      <div class="card-header">
        <div class="card-title">${escapeHtml(p.nombre || '')}</div>
        <span class="badge-status" style="background:${badgeBG(badgeColor)}; color:${badgeFG(badgeColor)}">${escapeHtml(badgeName)}</span>
      </div>
      <div class="card-body">
        <div class="meta"><b>NIF:</b> ${escapeHtml(p.nif || '-')}</div>
        <div class="meta"><b>Contacto:</b> ${escapeHtml(p.contacto || '-')}</div>
        <div class="meta"><b>Email:</b> ${escapeHtml(p.email || '-')}</div>
        <div class="meta"><b>Teléfono:</b> ${escapeHtml(p.telefono || '-')}</div>
        <div class="meta"><b>Web:</b> ${escapeHtml(p.web || '-')}</div>
        <div class="meta"><b>Ciudad:</b> ${escapeHtml(p.ciudad || '-')}</div>
        <div class="meta"><b>Dirección:</b> ${escapeHtml(p.direccion || '-')}</div>
        <div class="meta"><b>Términos:</b> ${p.terminos ? `${p.terminos} días` : '-'}</div>
      </div>
      <div class="card-footer">${p.productos_count ?? 0} Productos</div>
    </div>
  `}).join('');
}

function filtrarProveedores(){
  const q = (buscarProveedor.value || '').toLowerCase().trim();
  if (!q) return renderProveedores(proveedores);
  const f = proveedores.filter(p =>
    (p.nombre && p.nombre.toLowerCase().includes(q)) ||
    (p.nif && p.nif.toLowerCase().includes(q)) ||
    (p.email && p.email.toLowerCase().includes(q)) ||
    (p.ciudad && p.ciudad.toLowerCase().includes(q))
  );
  renderProveedores(f);
}

// Modal ops
function abrirModalNuevoProveedor(){
  proveedorEditando = null;
  modalTitleProveedor.textContent = 'Nuevo Proveedor';
  formProveedor.reset();
  if (parametrosEstados.length){
    poblarSelectEstados();
  }
  modalOverlayProveedor.classList.add('active');
  provNombre.focus();
}

function editarProveedor(id){
  const p = proveedores.find(x => x.id === id);
  if (!p) return;
  proveedorEditando = p;
  modalTitleProveedor.textContent = 'Editar Proveedor';
  provNif.value = p.nif || '';
  if (parametrosEstados.length){
    poblarSelectEstados();
    if (p.parametro_id) provEstado.value = String(p.parametro_id);
  }
  provNombre.value = p.nombre || '';
  provContacto.value = p.contacto || '';
  provEmail.value = p.email || '';
  provTelefono.value = p.telefono || '';
  provDireccion.value = p.direccion || '';
  provCiudad.value = p.ciudad || '';
  provWeb.value = p.web || '';
  provTerminos.value = p.terminos || '';
  modalOverlayProveedor.classList.add('active');
}

function cerrarModalProveedor(){
  modalOverlayProveedor.classList.remove('active');
  formProveedor.reset();
  proveedorEditando = null;
}

function guardarProveedor(e){
  e.preventDefault();
  const body = {
    nif: (provNif.value || '').trim(),
    nombre: (provNombre.value || '').trim(),
    contacto: (provContacto.value || '').trim(),
    email: (provEmail.value || '').trim(),
    telefono: (provTelefono.value || '').trim(),
    direccion: (provDireccion.value || '').trim(),
    ciudad: (provCiudad.value || '').trim(),
    web: (provWeb.value || '').trim(),
    terminos: provTerminos.value ? parseInt(provTerminos.value,10) : null,
    parametro_id: provEstado && provEstado.value ? parseInt(provEstado.value,10) : null,
  };

  if (!body.nombre){ mostrarAlerta('El nombre es obligatorio', 'error'); provNombre.focus(); return; }
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)){ mostrarAlerta('Correo inválido', 'error'); return; }

  (proveedorEditando
    ? actualizarProveedor(proveedorEditando.id, body)
    : crearProveedor(body)
  ).then((data) => {
    if (data.success){
      mostrarAlerta(data.message || 'Guardado correctamente', 'success');
      cerrarModalProveedor();
      cargarProveedores();
    } else {
      mostrarAlerta(data.error || 'Error al guardar', 'error');
    }
  }).catch(() => mostrarAlerta('Error de conexión', 'error'));
}

// Alerts
function mostrarAlerta(msg, type='success'){
  const alerta = document.getElementById('alertaNotificacion');
  alerta.textContent = msg;
  alerta.className = `alerta-notificacion ${type}`;
  alerta.style.display = 'block';
  setTimeout(() => alerta.style.display = 'none', 3500);
}

function escapeHtml(text){
  const s = String(text || '');
  return s.replace(/[&<>"]+/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

function safeColor(color){
  const hex = (color || '').toString();
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#10B981';
}

function badgeBG(hex){ return hex; }
function badgeFG(hex){
  // simple luminance to decide text color
  const c = hex.replace('#','');
  const r = parseInt(c.substr(0,2),16), g=parseInt(c.substr(2,2),16), b=parseInt(c.substr(4,2),16);
  const l = (0.299*r+0.587*g+0.114*b)/255;
  return l > 0.6 ? '#111827' : '#ffffff';
}
