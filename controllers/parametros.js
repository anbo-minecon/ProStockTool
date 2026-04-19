// ==================== CONFIGURACIÓN ====================
const API_URL_PARAM = '../database/parametros.php';

// ==================== VARIABLES GLOBALES ====================
let parametros = [];
let parametroEditando = null;
let parametroParaEliminar = null;

// ==================== ELEMENTOS DEL DOM ====================
const buscarParametro = document.getElementById('buscarParametro');
const listaParametros = document.getElementById('listaParametros');
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

// ==================== PALETA DE COLOR ====================
const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];

// ==================== INICIALIZACIÓN ====================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  cargarParametros();
  inicializarEventListeners();
  initColorPalette();
}

function inicializarEventListeners() {
  if (btnNuevoParametro) btnNuevoParametro.addEventListener('click', abrirModalNuevoParametro);
  if (btnCerrarModalParametro) btnCerrarModalParametro.addEventListener('click', cerrarModalParametro);
  if (btnCancelarParametro) btnCancelarParametro.addEventListener('click', cerrarModalParametro);
  if (formParametro) formParametro.addEventListener('submit', guardarParametro);

  if (btnCancelarEliminarParametro) btnCancelarEliminarParametro.addEventListener('click', cerrarModalEliminarParametro);
  if (btnCerrarModalEliminarParametro) btnCerrarModalEliminarParametro.addEventListener('click', cerrarModalEliminarParametro);
  if (btnConfirmarEliminarParametro) btnConfirmarEliminarParametro.addEventListener('click', confirmarEliminacionParametro);

  if (buscarParametro) buscarParametro.addEventListener('input', filtrarParametros);

  // Cerrar modales al hacer click fuera
  if (modalOverlayParametro) {
    modalOverlayParametro.addEventListener('click', (e) => {
      if (e.target === modalOverlayParametro) cerrarModalParametro();
    });
  }

  if (modalEliminarParametro) {
    modalEliminarParametro.addEventListener('click', (e) => {
      if (e.target === modalEliminarParametro) cerrarModalEliminarParametro();
    });
  }

  // Event delegation para editar/eliminar
  if (listaParametros) {
    listaParametros.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      if (Number.isNaN(id)) return;
      const action = btn.getAttribute('data-action');
      if (action === 'edit') editarParametro(id);
      if (action === 'delete') abrirModalEliminarParametro(id);
    });
  }

  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOverlayParametro && modalOverlayParametro.classList.contains('active')) {
        cerrarModalParametro();
      }
      if (modalEliminarParametro && modalEliminarParametro.classList.contains('active')) {
        cerrarModalEliminarParametro();
      }
    }
  });
}

// ==================== API ====================

async function cargarParametros() {
  try {
    const url = `${API_URL_PARAM}?_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const data = await resp.json();
    if (data.success && Array.isArray(data.data)) {
      parametros = data.data;
      renderParametros(parametros);
    } else {
      mostrarAlerta(data.error || 'Error al cargar parámetros', 'error');
    }
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error al conectar con el servidor', 'error');
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

async function eliminarParametroAPI(id) {
  const resp = await fetch(API_URL_PARAM, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  return resp.json();
}

// ==================== RENDERIZADO ====================

function renderParametros(items) {
  if (!items || items.length === 0) {
    listaParametros.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><path d="M9 15a3 3 0 0 1 6 0"/>
        </svg>
        <p>No hay estados registrados</p>
      </div>
    `;
    return;
  }

  listaParametros.innerHTML = items.map(p => `
    <div class="card-parametro" style="--color: ${safeColor(p.color)};">
      <style>
        .card-parametro[style*="--color: ${safeColor(p.color)}"]::before {
          background: linear-gradient(90deg, ${safeColor(p.color)}, ${lightenColor(safeColor(p.color), 20)});
        }
      </style>

      <!-- SVG Grande de Fondo -->
      <div class="card-icon-background">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.4 1 .4 2.1 0 3.1a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </div>

      <!-- Contenido de la Tarjeta -->
      <div class="card-content">
        <div class="card-actions">
          <button type="button" class="btn-icon" title="Editar estado" data-action="edit" data-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button type="button" class="btn-icon btn-delete" title="Eliminar estado" data-action="delete" data-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>

        <div class="color-indicator">
          <div class="color-dot" style="background-color: ${safeColor(p.color)};"></div>
          <div style="flex: 1;">
            <h3 class="param-name">${escapeHtml(p.nombre || '')}</h3>
            ${p.descripcion ? `<p class="param-description">${escapeHtml(p.descripcion)}</p>` : ''}
          </div>
        </div>

        ${p.codigo ? `<span class="param-code">${escapeHtml(p.codigo)}</span>` : ''}

        <div class="card-footer">${p.productos_count ?? 0} producto(s) asociado(s)</div>
      </div>
    </div>
  `).join('');
}

function filtrarParametros() {
  const q = (buscarParametro.value || '').toLowerCase().trim();
  if (!q) return renderParametros(parametros);
  
  const filtrados = parametros.filter(p =>
    (p.nombre && p.nombre.toLowerCase().includes(q)) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
    (p.codigo && p.codigo.toLowerCase().includes(q))
  );
  renderParametros(filtrados);
}

// ==================== MODAL CREAR/EDITAR ====================

function abrirModalNuevoParametro() {
  parametroEditando = null;
  if (modalTitleParametro) modalTitleParametro.textContent = 'Nuevo Estado';
  if (formParametro) formParametro.reset();
  
  const defaultColor = PALETTE[0];
  if (paramColor) paramColor.value = defaultColor;
  selectPaletteColor(defaultColor);
  
  if (modalOverlayParametro) modalOverlayParametro.classList.add('active');
  if (paramNombre) setTimeout(() => paramNombre.focus(), 100);
}

function editarParametro(id) {
  const p = parametros.find(x => Number(x.id) === Number(id));
  if (!p) {
    mostrarAlerta('Parámetro no encontrado', 'error');
    return;
  }
  
  parametroEditando = p;
  if (modalTitleParametro) modalTitleParametro.textContent = 'Editar Estado';
  
  if (paramNombre) paramNombre.value = p.nombre || '';
  if (paramDescripcion) paramDescripcion.value = p.descripcion || '';
  if (paramColor && p.color) {
    paramColor.value = p.color;
    selectPaletteColor(p.color);
  }
  
  if (modalOverlayParametro) modalOverlayParametro.classList.add('active');
  if (paramNombre) setTimeout(() => paramNombre.focus(), 100);
}

function cerrarModalParametro() {
  if (modalOverlayParametro) modalOverlayParametro.classList.remove('active');
  if (formParametro) formParametro.reset();
  parametroEditando = null;
}

function guardarParametro(e) {
  e.preventDefault();
  
  const body = {
    nombre: (paramNombre && paramNombre.value || '').trim(),
    descripcion: (paramDescripcion && paramDescripcion.value || '').trim(),
    color: (paramColor && paramColor.value || PALETTE[0]).trim(),
  };

  if (!body.nombre) {
    mostrarAlerta('El nombre del estado es obligatorio', 'error');
    if (paramNombre) paramNombre.focus();
    return;
  }

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

// ==================== MODAL ELIMINAR ====================

function abrirModalEliminarParametro(id) {
  const p = parametros.find(x => Number(x.id) === Number(id));
  if (!p) {
    mostrarAlerta('Parámetro no encontrado', 'error');
    return;
  }
  
  parametroParaEliminar = p;
  if (parametroNombreEliminar) parametroNombreEliminar.textContent = p.nombre;
  if (modalEliminarParametro) modalEliminarParametro.classList.add('active');
}

function cerrarModalEliminarParametro() {
  if (modalEliminarParametro) modalEliminarParametro.classList.remove('active');
  parametroParaEliminar = null;
}

function confirmarEliminacionParametro() {
  if (!parametroParaEliminar) return;
  
  eliminarParametroAPI(parametroParaEliminar.id)
    .then((data) => {
      if (data.success) {
        mostrarAlerta(data.message || 'Estado eliminado correctamente', 'success');
        cerrarModalEliminarParametro();
        cargarParametros();
      } else {
        mostrarAlerta(data.error || 'No se pudo eliminar', 'error');
      }
    })
    .catch(() => mostrarAlerta('Error de conexión', 'error'));
}

// ==================== PALETA DE COLOR ====================

function initColorPalette() {
  if (!paramColorPalette) return;
  paramColorPalette.innerHTML = PALETTE.map(c => 
    `<button type="button" class="color-swatch" data-color="${c}" style="background-color: ${c};"></button>`
  ).join('');
  
  paramColorPalette.addEventListener('click', (e) => {
    const btn = e.target.closest('.color-swatch');
    if (!btn) return;
    const color = btn.getAttribute('data-color');
    if (paramColor) paramColor.value = color;
    selectPaletteColor(color);
  });
  
  selectPaletteColor((paramColor && paramColor.value) || PALETTE[0]);
}

function selectPaletteColor(color) {
  if (!paramColorPalette) return;
  [...paramColorPalette.querySelectorAll('.color-swatch')].forEach(el => {
    const c = el.getAttribute('data-color');
    el.classList.toggle('selected', c && c.toUpperCase() === (color || '').toUpperCase());
  });
}

// ==================== UTILIDADES ====================

function safeColor(color) {
  const hex = (color || '').toString();
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : PALETTE[0];
}

function lightenColor(color, percent) {
  const hex = color.replace('#', '');
  const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + percent);
  const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + percent);
  const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + percent);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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