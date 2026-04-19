// ==================== CONFIGURACIÓN ====================
const API_PROV = '../database/proveedores.php';
const API_PARAM = '../database/parametros.php';

// ==================== VARIABLES GLOBALES ====================
let proveedores = [];
let proveedorEditando = null;
let parametrosEstados = [];

// ==================== ELEMENTOS DEL DOM ====================
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

// Campos del formulario
const provNif = document.getElementById('provNif');
const provEstado = document.getElementById('provEstado');
const provNombre = document.getElementById('provNombre');
const provContacto = document.getElementById('provContacto');
const provEmail = document.getElementById('provEmail');
const provTelefono = document.getElementById('provTelefono');
const provDireccion = document.getElementById('provDireccion');
const provCiudad = document.getElementById('provCiudad');
const provWeb = document.getElementById('provWeb');

// ==================== FUNCIONES DE MODAL ====================

function abrirModal() {
  if (!modalOverlayProveedor) return;
  modalOverlayProveedor.classList.add('active');
  modalOverlayProveedor.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  if (!modalOverlayProveedor) return;
  modalOverlayProveedor.classList.remove('active');
  modalOverlayProveedor.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (formProveedor) formProveedor.reset();
  proveedorEditando = null;
}

// ==================== INICIALIZACIÓN ====================

function inicializarEventos() {
  // Botón nuevo proveedor
  if (btnNuevoProveedor) {
    btnNuevoProveedor.addEventListener('click', abrirModalNuevoProveedor);
  }

  // Botones de cerrar modal
  if (btnCerrarModalProveedor) {
    btnCerrarModalProveedor.addEventListener('click', cerrarModal);
  }
  if (btnCancelarProveedor) {
    btnCancelarProveedor.addEventListener('click', cerrarModal);
  }

  // Formulario
  if (formProveedor) {
    formProveedor.addEventListener('submit', guardarProveedor);
  }

  // Buscador
  if (buscarProveedor) {
    buscarProveedor.addEventListener('input', filtrarProveedores);
  }

  // Cerrar modal al hacer click fuera
  if (modalOverlayProveedor) {
    modalOverlayProveedor.addEventListener('click', (e) => {
      if (e.target === modalOverlayProveedor) cerrarModal();
    });
  }

  // Event delegation para botones de editar/eliminar
  if (listaProveedores) {
    listaProveedores.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      
      const id = parseInt(btn.getAttribute('data-id'), 10);
      const action = btn.getAttribute('data-action');
      
      if (!id) {
        return;
      }
      
      if (action === 'edit') {
        editarProveedor(id);
      } else if (action === 'delete') {
        confirmarEliminacion(id);
      }
    });
  }

  // Cerrar modal con tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlayProveedor && modalOverlayProveedor.classList.contains('active')) {
      cerrarModal();
    }
  });
}

// Inicialización principal
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}

function inicializar() {

  cargarParametrosEstado();
  cargarProveedores();
  inicializarEventos();
}

// ==================== PARÁMETROS/ESTADOS ====================

async function cargarParametrosEstado() {
  try {
    const url = `${API_PARAM}?_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    const data = await resp.json();
    if (data.success && Array.isArray(data.data)) {
      parametrosEstados = data.data;
      poblarSelectEstados();
    }
  } catch (e) {
    console.error('Error al cargar parámetros:', e);
  }
}

function poblarSelectEstados() {
  if (!provEstado || !Array.isArray(parametrosEstados)) return;
  provEstado.innerHTML = '<option value="">Seleccionar estado...</option>' + 
    parametrosEstados.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

// ==================== API - PROVEEDORES ====================

async function cargarProveedores() {
  try {
    const url = `${API_PROV}?_=${Date.now()}`;
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const data = await resp.json();
    if (data.success && Array.isArray(data.data)) {
      proveedores = data.data;
      renderProveedores(proveedores);
    } else {
      mostrarAlerta(data.error || 'Error al cargar proveedores', 'error');
    }
  } catch (err) {
    console.error('Error al cargar proveedores:', err);
    mostrarAlerta('Error al conectar con el servidor', 'error');
  }
}

async function crearProveedor(body) {
  const resp = await fetch(API_PROV, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  });
  return resp.json();
}

async function actualizarProveedor(id, body) {
  const resp = await fetch(API_PROV, { 
    method: 'PUT', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ id, ...body }) 
  });
  return resp.json();
}

async function eliminarProveedorAPI(id) {
  const resp = await fetch(API_PROV, { 
    method: 'DELETE', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ id }) 
  });
  return resp.json();
}

// ==================== RENDERIZADO ====================

function renderProveedores(items) {
  if (!items || items.length === 0) {
    listaProveedores.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p>No hay proveedores registrados</p>
      </div>
    `;
    return;
  }

  listaProveedores.innerHTML = items.map(p => {
    const badgeName = p.estado_nombre || 'Activo';
    const badgeClass = (p.estado_nombre || '').toLowerCase().includes('inactivo') ? 'inactivo' : 'activo';
    
    return `
      <div class="card-proveedor">
        <div class="card-actions">
          <button type="button" class="btn-icon" title="Editar proveedor" data-action="edit" data-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button type="button" class="btn-icon" title="Eliminar proveedor" data-action="delete" data-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
        
        <div class="card-header">
          <div class="card-logo-title">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Base Color Palette for Pixel Art -->
              <!-- Main Building Blue: #3b82f6 -->
              <!-- Shadow Blue: #2563eb -->
              <!-- Highlight Blue: #60a5fa -->
              <!-- Window Light: #bfdbfe -->
              <!-- Window Reflection: #e0f2fe -->

              <!-- Ground / Base -->
              <rect x="5" y="22" width="14" height="2" fill="#2563eb"/>
              <rect x="6" y="21" width="12" height="1" fill="#3b82f6"/>

              <!-- Building Structure -->
              <!-- Main front face of the building -->
              <rect x="7" y="7" width="10" height="14" fill="#3b82f6"/>

              <!-- Left side of the building (shadowed) -->
              <rect x="6" y="8" width="1" height="13" fill="#2563eb"/>
              <rect x="7" y="7" width="1" height="1" fill="#2563eb"/> <!-- Top-left corner shadow -->

              <!-- Right side of the building (highlighted) -->
              <rect x="17" y="8" width="1" height="13" fill="#60a5fa"/>
              <rect x="16" y="7" width="1" height="1" fill="#60a5fa"/> <!-- Top-right corner highlight -->

              <!-- Roof / Top structure -->
              <!-- Top edge of the front face -->
              <rect x="7" y="6" width="10" height="1" fill="#2563eb"/>

              <!-- Main roof block -->
              <rect x="8" y="5" width="8" height="1" fill="#3b82f6"/>
              <!-- Roof details / antenna base -->
              <rect x="9" y="4" width="6" height="1" fill="#2563eb"/>
              <rect x="10" y="3" width="4" height="1" fill="#3b82f6"/>
              <!-- Antenna tip -->
              <rect x="11" y="2" width="2" height="1" fill="#60a5fa"/>
              <rect x="12" y="1" width="1" height="1" fill="#bfdbfe"/> <!-- Small light on top of antenna -->

              <!-- Windows (5 floors, 3 windows per floor) -->
              <!-- Each window is 2x2 pixels, with a 1-pixel reflection line on top -->

              <!-- Floor 1 (bottom-most floor, y=19) -->
              <rect x="8" y="19" width="2" height="2" fill="#bfdbfe"/> <rect x="8" y="19" width="2" height="1" fill="#e0f2fe"/>
              <rect x="11" y="19" width="2" height="2" fill="#bfdbfe"/> <rect x="11" y="19" width="2" height="1" fill="#e0f2fe"/>
              <rect x="14" y="19" width="2" height="2" fill="#bfdbfe"/> <rect x="14" y="19" width="2" height="1" fill="#e0f2fe"/>

              <!-- Floor 2 (y=16) -->
              <rect x="8" y="16" width="2" height="2" fill="#bfdbfe"/> <rect x="8" y="16" width="2" height="1" fill="#e0f2fe"/>
              <rect x="11" y="16" width="2" height="2" fill="#bfdbfe"/> <rect x="11" y="16" width="2" height="1" fill="#e0f2fe"/>
              <rect x="14" y="16" width="2" height="2" fill="#bfdbfe"/> <rect x="14" y="16" width="2" height="1" fill="#e0f2fe"/>

              <!-- Floor 3 (y=13) -->
              <rect x="8" y="13" width="2" height="2" fill="#bfdbfe"/> <rect x="8" y="13" width="2" height="1" fill="#e0f2fe"/>
              <rect x="11" y="13" width="2" height="2" fill="#bfdbfe"/> <rect x="11" y="13" width="2" height="1" fill="#e0f2fe"/>
              <rect x="14" y="13" width="2" height="2" fill="#bfdbfe"/> <rect x="14" y="13" width="2" height="1" fill="#e0f2fe"/>

              <!-- Floor 4 (y=10) -->
              <rect x="8" y="10" width="2" height="2" fill="#bfdbfe"/> <rect x="8" y="10" width="2" height="1" fill="#e0f2fe"/>
              <rect x="11" y="10" width="2" height="2" fill="#bfdbfe"/> <rect x="11" y="10" width="2" height="1" fill="#e0f2fe"/>
              <rect x="14" y="10" width="2" height="2" fill="#bfdbfe"/> <rect x="14" y="10" width="2" height="1" fill="#e0f2fe"/>

              <!-- Floor 5 (top-most floor, y=7) -->
              <rect x="8" y="7" width="2" height="2" fill="#bfdbfe"/> <rect x="8" y="7" width="2" height="1" fill="#e0f2fe"/>
              <rect x="11" y="7" width="2" height="2" fill="#bfdbfe"/> <rect x="11" y="7" width="2" height="1" fill="#e0f2fe"/>
              <rect x="14" y="7" width="2" height="2" fill="#bfdbfe"/> <rect x="14" y="7" width="2" height="1" fill="#e0f2fe"/>

              <!-- Entrance / Door detail -->
              <rect x="11" y="20" width="2" height="1" fill="#2563eb"/>
              <rect x="11" y="20.5" width="2" height="0.5" fill="#60a5fa"/> <!-- Small highlight on door -->

              <!-- Additional structural lines/details for depth -->
              <!-- Horizontal lines on the main body (subtle floor separation) -->
              <rect x="7" y="18" width="10" height="1" fill="#3b82f6" opacity="0.2"/>
              <rect x="7" y="15" width="10" height="1" fill="#3b82f6" opacity="0.2"/>
              <rect x="7" y="12" width="10" height="1" fill="#3b82f6" opacity="0.2"/>
              <rect x="7" y="9" width="10" height="1" fill="#3b82f6" opacity="0.2"/>

              <!-- Vertical lines on the main body, between window columns -->
              <rect x="10" y="7" width="1" height="14" fill="#3b82f6" opacity="0.2"/>
              <rect x="13" y="7" width="1" height="14" fill="#3b82f6" opacity="0.2"/>

              <!-- Left side details (subtle horizontal lines for texture) -->
              <rect x="6" y="19" width="1" height="1" fill="#2563eb" opacity="0.5"/>
              <rect x="6" y="16" width="1" height="1" fill="#2563eb" opacity="0.5"/>
              <rect x="6" y="13" width="1" height="1" fill="#2563eb" opacity="0.5"/>
              <rect x="6" y="10" width="1" height="1" fill="#2563eb" opacity="0.5"/>

              <!-- Right side details (subtle horizontal lines for texture) -->
              <rect x="17" y="19" width="1" height="1" fill="#60a5fa" opacity="0.5"/>
              <rect x="17" y="16" width="1" height="1" fill="#60a5fa" opacity="0.5"/>
              <rect x="17" y="13" width="1" height="1" fill="#60a5fa" opacity="0.5"/>
              <rect x="17" y="10" width="1" height="1" fill="#60a5fa" opacity="0.5"/>

              <!-- Subtle shadow for the building from the top-left, adding depth to the roof edge -->
              <rect x="17" y="7" width="1" height="1" fill="#2563eb" opacity="0.2"/>
              <rect x="17" y="6" width="1" height="1" fill="#2563eb" opacity="0.2"/>
              <rect x="16" y="6" width="1" height="1" fill="#2563eb" opacity="0.2"/>
              <rect x="15" y="5" width="1" height="1" fill="#2563eb" opacity="0.2"/>
            </svg>
            <div class="card-title">${escapeHtml(p.nombre || '')}</div>
          </div>
          <span class="badge-status ${badgeClass}">${escapeHtml(badgeName)}</span>
        </div>

        <div class="card-body">
          ${p.nif ? `<div class="meta"><b>NIF/RUC:</b> <span class="meta-value">${escapeHtml(p.nif)}</span></div>` : ''}
          ${p.contacto ? `<div class="meta"><b>Contacto:</b> <span class="meta-value">${escapeHtml(p.contacto)}</span></div>` : ''}
          ${p.email ? `<div class="meta"><b>Email:</b> <span class="meta-value">${escapeHtml(p.email)}</span></div>` : ''}
          ${p.telefono ? `<div class="meta"><b>Teléfono:</b> <span class="meta-value">${escapeHtml(p.telefono)}</span></div>` : ''}
          ${p.ciudad ? `<div class="meta"><b>Ciudad:</b> <span class="meta-value">${escapeHtml(p.ciudad)}</span></div>` : ''}
          ${p.web ? `<div class="meta"><b>Web:</b> <span class="meta-value"><a href="${escapeHtml(p.web)}" target="_blank" rel="noopener">Ver sitio</a></span></div>` : ''}
        </div>

        <div class="card-footer">Creado: ${formatearFecha(p.fecha_creacion)}</div>
      </div>
    `;
  }).join('');
}

function filtrarProveedores() {
  const q = (buscarProveedor.value || '').toLowerCase().trim();
  if (!q) return renderProveedores(proveedores);
  
  const filtrados = proveedores.filter(p =>
    (p.nombre && p.nombre.toLowerCase().includes(q)) ||
    (p.nif && p.nif.toLowerCase().includes(q)) ||
    (p.email && p.email.toLowerCase().includes(q)) ||
    (p.ciudad && p.ciudad.toLowerCase().includes(q)) ||
    (p.contacto && p.contacto.toLowerCase().includes(q))
  );
  renderProveedores(filtrados);
}

// ==================== ACCIONES DE MODAL ====================

function abrirModalNuevoProveedor() {
  proveedorEditando = null;
  
  if (modalTitleProveedor) {
    modalTitleProveedor.textContent = 'Nuevo Proveedor';
  }
  
  if (formProveedor) {
    formProveedor.reset();
  }
  
  poblarSelectEstados();
  abrirModal();
  
  if (provNombre) {
    setTimeout(() => provNombre.focus(), 100);
  }
}

function editarProveedor(id) {
  // Convertir ID a número
  const idNumerico = Number(id);
  
  // Buscar con comparación numérica
  const p = proveedores.find(x => Number(x.id) === idNumerico);
  
  if (!p) {
    mostrarAlerta('Proveedor no encontrado', 'error');
    return;
  }
  
  proveedorEditando = p;
  
  if (modalTitleProveedor) {
    modalTitleProveedor.textContent = 'Editar Proveedor';
  }
  
  // Llenar campos del formulario
  if (provNif) provNif.value = p.nif || '';
  if (provNombre) provNombre.value = p.nombre || '';
  if (provContacto) provContacto.value = p.contacto || '';
  if (provEmail) provEmail.value = p.email || '';
  if (provTelefono) provTelefono.value = p.telefono || '';
  if (provDireccion) provDireccion.value = p.direccion || '';
  if (provCiudad) provCiudad.value = p.ciudad || '';
  if (provWeb) provWeb.value = p.web || '';
  
  poblarSelectEstados();
  if (p.parametro_id && provEstado) {
    provEstado.value = String(p.parametro_id);
  }

  abrirModal();
  
  if (provNombre) {
    setTimeout(() => provNombre.focus(), 100);
  }
}

function guardarProveedor(e) {
  e.preventDefault();
  
  const body = {
    nif: (provNif && provNif.value || '').trim(),
    nombre: (provNombre && provNombre.value || '').trim(),
    contacto: (provContacto && provContacto.value || '').trim(),
    email: (provEmail && provEmail.value || '').trim(),
    telefono: (provTelefono && provTelefono.value || '').trim(),
    direccion: (provDireccion && provDireccion.value || '').trim(),
    ciudad: (provCiudad && provCiudad.value || '').trim(),
    web: (provWeb && provWeb.value || '').trim(),
    parametro_id: provEstado && provEstado.value ? parseInt(provEstado.value, 10) : null,
  };

  // Validaciones
  if (!body.nombre) {
    mostrarAlerta('El nombre de la empresa es obligatorio', 'error');
    if (provNombre) provNombre.focus();
    return;
  }

  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) {
    mostrarAlerta('Correo electrónico inválido', 'error');
    if (provEmail) provEmail.focus();
    return;
  }

  // Guardar
  const operacion = proveedorEditando
    ? actualizarProveedor(proveedorEditando.id, body)
    : crearProveedor(body);

  operacion
    .then((data) => {
      if (data.success) {
        mostrarAlerta(data.message || 'Guardado correctamente', 'success');
        cerrarModal();
        cargarProveedores();
      } else {
        mostrarAlerta(data.error || 'Error al guardar', 'error');
      }
    })
    .catch((err) => {
      console.error('Error al guardar:', err);
      mostrarAlerta('Error de conexión', 'error');
    });
}

function confirmarEliminacion(id) {
  // Convertir ID a número
  const idNumerico = Number(id);
  const p = proveedores.find(x => Number(x.id) === idNumerico);
  
  if (!p) {
    mostrarAlerta('Proveedor no encontrado', 'error');
    return;
  }
  
  const mensaje = `¿Deseas eliminar el proveedor "${p.nombre}"?\n\nEsta acción no se puede deshacer.`;
  
  if (confirm(mensaje)) {
    eliminarProveedorAPI(idNumerico)
      .then((data) => {
        if (data.success) {
          mostrarAlerta(data.message || 'Proveedor eliminado correctamente', 'success');
          cargarProveedores();
        } else {
          mostrarAlerta(data.error || 'No se pudo eliminar', 'error');
        }
      })
      .catch((err) => {
        console.error('Error al eliminar:', err);
        mostrarAlerta('Error de conexión', 'error');
      });
  }
}

// ==================== UTILIDADES ====================

function mostrarAlerta(msg, tipo = 'success') {
  if (!alertaNotificacion) return;
  alertaNotificacion.textContent = msg;
  alertaNotificacion.className = `alerta-notificacion ${tipo}`;
  alertaNotificacion.style.display = 'block';
  
  setTimeout(() => {
    alertaNotificacion.style.display = 'none';
  }, 4000);
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

function formatearFecha(fecha) {
  if (!fecha) return 'N/A';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}