// Configuración de la API
const API_URL_PARAM = 'http://localhost/Pro-Stock-Tool/database/parametros.php';

let parametros = [];
let parametroEditando = null;
let parametroParaEliminar = null;

// Elementos
const buscarParametro = document.getElementById('buscarParametro');
const tbodyParametros = document.getElementById('tbodyParametros');
const alertaNotificacion = document.getElementById('alertaNotificacion');

// Modal crear/editar
const modalOverlayParametro = document.getElementById('modalOverlayParametro');
const modalTitleParametro = document.getElementById('modalTitleParametro');
const formParametro = document.getElementById('formParametro');
const btnNuevoParametro = document.getElementById('btnNuevoParametro');
const btnCerrarModalParametro = document.getElementById('modalCloseParametro');
const btnCancelarParametro = document.getElementById('cancelBtnParametro');

const paramNombre = document.getElementById('paramNombre');
const paramDescripcion = document.getElementById('paramDescripcion');
const paramColor = document.getElementById('paramColor');
const paramColorPalette = document.getElementById('paramColorPalette');

// Modal eliminar
const modalEliminarParametro = document.getElementById('modalEliminarParametro');
const parametroNombreEliminar = document.getElementById('parametroNombreEliminar');
const btnCancelarEliminarParametro = document.getElementById('btnCancelarEliminarParametro');
const btnConfirmarEliminarParametro = document.getElementById('btnConfirmarEliminarParametro');
const btnCerrarModalEliminarParametro = document.getElementById('modalEliminarCloseParametro');

// Init
document.addEventListener('DOMContentLoaded', () => {
  cargarParametros();
  inicializarEventListeners();
});

function inicializarEventListeners() {
  btnNuevoParametro.addEventListener('click', abrirModalNuevoParametro);
  btnCerrarModalParametro.addEventListener('click', cerrarModalParametro);
  btnCancelarParametro.addEventListener('click', cerrarModalParametro);
  formParametro.addEventListener('submit', guardarParametro);

  btnCancelarEliminarParametro.addEventListener('click', cerrarModalEliminarParametro);
  btnCerrarModalEliminarParametro.addEventListener('click', cerrarModalEliminarParametro);
  btnConfirmarEliminarParametro.addEventListener('click', confirmarEliminacionParametro);

  buscarParametro.addEventListener('input', filtrarParametros);

  tbodyParametros.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.getAttribute('data-id'));
    if (Number.isNaN(id)) return;
    const action = btn.getAttribute('data-action');
    if (action === 'edit') {
      editarParametro(id);
    } else if (action === 'delete') {
      abrirModalEliminarParametro(id);
    }
  });

  // Inicializar paleta de colores
  initColorPalette();
}

// API
async function cargarParametros() {
  try {
    const url = `${API_URL_PARAM}?_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    const data = await resp.json();
    if (data.success) {
      parametros = data.data;
      renderParametros(parametros);
    } else {
      mostrarAlerta(data.error || 'Error al cargar parámetros', 'error');
    }
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error de conexión al cargar parámetros', 'error');
  }
}

async function crearParametro(body) {
  const resp = await fetch(API_URL_PARAM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return resp.json();
}

async function actualizarParametro(id, body) {
  const resp = await fetch(API_URL_PARAM, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...body })
  });
  return resp.json();
}

async function eliminarParametro() {
  if (!parametroParaEliminar) return;
  const resp = await fetch(API_URL_PARAM, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: parametroParaEliminar.id })
  });
  const data = await resp.json();
  if (data.success) {
    mostrarAlerta(data.message || 'Parámetro eliminado', 'success');
    cerrarModalEliminarParametro();
    cargarParametros();
  } else {
    mostrarAlerta(data.error || 'No se pudo eliminar', 'error');
  }
}

// UI
function renderParametros(items) {
  if (!items.length) {
    tbodyParametros.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#6b7280; padding:20px;">No hay parámetros registrados</td></tr>`;
    return;
  }
  tbodyParametros.innerHTML = items.map(p => `
    <tr>
      <td>${p.codigo}</td>
      <td><span class="badge" style="background:${safeColor(p.color)}; color:#fff;">${p.nombre}</span></td>
      <td>${p.descripcion || ''}</td>
      <td>${p.productos_count ?? 0}</td>
      <td class="actions">
        <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${p.id}">Editar</button>
        <button type="button" class="btn-action btn-delete" data-action="delete" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function badgeClass(nombre) {
  const n = (nombre || '').toUpperCase();
  if (n.includes('ACTIVO')) return 'badge-success';
  if (n.includes('INACTIVO')) return 'badge-danger';
  return 'badge-info';
}

function filtrarParametros() {
  const q = buscarParametro.value.toLowerCase().trim();
  if (!q) return renderParametros(parametros);
  const f = parametros.filter(p =>
    (p.codigo && p.codigo.toLowerCase().includes(q)) ||
    (p.nombre && p.nombre.toLowerCase().includes(q)) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(q))
  );
  renderParametros(f);
}

// Modal
function abrirModalNuevoParametro() {
  parametroEditando = null;
  modalTitleParametro.textContent = 'Nuevo Parámetro';
  formParametro.reset();
  // valor por defecto
  const defaultColor = '#3B82F6';
  paramColor.value = defaultColor;
  selectPaletteColor(defaultColor);
  modalOverlayParametro.classList.add('active');
  paramNombre.focus();
}

function editarParametro(id) {
  const p = parametros.find(x => Number(x.id) === Number(id));
  if (!p) return;
  parametroEditando = p;
  modalTitleParametro.textContent = 'Editar Parámetro';
  paramNombre.value = p.nombre || '';
  paramDescripcion.value = p.descripcion || '';
  if (p.color) {
    paramColor.value = p.color;
    selectPaletteColor(p.color);
  }
  modalOverlayParametro.classList.add('active');
}

function cerrarModalParametro() {
  modalOverlayParametro.classList.remove('active');
  formParametro.reset();
  parametroEditando = null;
}

function guardarParametro(e) {
  e.preventDefault();
  const body = {
    nombre: paramNombre.value.trim(),
    descripcion: paramDescripcion.value.trim(),
    color: (paramColor.value || '#4a90e2').trim(),
  };
  if (!body.nombre) { mostrarAlerta('El estado es obligatorio', 'error'); return; }

  (parametroEditando
    ? actualizarParametro(parametroEditando.id, body)
    : crearParametro(body)
  ).then((data) => {
    if (data.success) {
      mostrarAlerta(data.message || 'Guardado correctamente', 'success');
      cerrarModalParametro();
      cargarParametros();
    } else {
      mostrarAlerta(data.error || 'Error al guardar', 'error');
    }
  }).catch(() => mostrarAlerta('Error de conexión', 'error'));
}

// Eliminar
function abrirModalEliminarParametro(id) {
  const p = parametros.find(x => Number(x.id) === Number(id));
  if (!p) return;
  parametroParaEliminar = p;
  parametroNombreEliminar.textContent = p.nombre;
  modalEliminarParametro.classList.add('active');
}

function cerrarModalEliminarParametro() {
  modalEliminarParametro.classList.remove('active');
  parametroParaEliminar = null;
}

function confirmarEliminacionParametro() {
  eliminarParametro();
}

// Alertas
function mostrarAlerta(mensaje, tipo = 'success') {
  alertaNotificacion.textContent = mensaje;
  alertaNotificacion.className = `alerta-notificacion ${tipo} show`;
  setTimeout(() => alertaNotificacion.classList.remove('show'), 3000);
}

// ==================== PALETA DE COLOR ====================
const PALETTE = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#84CC16','#F97316','#EC4899','#6366F1'];

function initColorPalette() {
  if (!paramColorPalette) return;
  paramColorPalette.innerHTML = PALETTE.map(c => `<button type="button" class="color-swatch" data-color="${c}" style="background:${c}"></button>`).join('');
  paramColorPalette.addEventListener('click', (e) => {
    const btn = e.target.closest('.color-swatch');
    if (!btn) return;
    const color = btn.getAttribute('data-color');
    paramColor.value = color;
    selectPaletteColor(color);
  });
  // seleccionar inicial
  selectPaletteColor(paramColor.value || PALETTE[0]);
}

function selectPaletteColor(color) {
  if (!paramColorPalette) return;
  [...paramColorPalette.querySelectorAll('.color-swatch')].forEach(el => {
    const c = el.getAttribute('data-color');
    el.classList.toggle('selected', c && c.toUpperCase() === (color || '').toUpperCase());
  });
}

function safeColor(color) {
  const hex = (color || '').toString();
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#3B82F6';
}
