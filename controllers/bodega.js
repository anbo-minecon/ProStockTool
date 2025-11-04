// Configuración de la API
const API_URL = 'http://localhost/Pro-Stock-Tool/database/bodega.php';

// Variables globales
let bodegas = [];
let bodegaEditando = null;
let bodegaParaEliminar = null;

// Elementos DOM - Modal Principal
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const formBodega = document.getElementById('formBodega');
const btnNuevaBodega = document.getElementById('btnNuevaBodega');
const btnCancelar = document.getElementById('cancelBtn');
const btnCerrarModal = document.getElementById('modalClose');

// Elementos DOM - Modal Eliminar
const modalEliminar = document.getElementById('modalEliminar');
const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');
const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
const btnCerrarModalEliminar = document.getElementById('modalEliminarClose');
const bodegaNombreEliminar = document.getElementById('bodegaNombreEliminar');

// Otros elementos
const buscarBodega = document.getElementById('buscarBodega');
const listaBodegas = document.getElementById('listaBodegas');
const alertaNotificacion = document.getElementById('alertaNotificacion');

// Campos del formulario
const bodegaNombre = document.getElementById('bodegaNombre');
const bodegaDescripcion = document.getElementById('bodegaDescripcion');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    cargarBodegas();
    inicializarEventListeners();
});

function inicializarEventListeners() {
    // Modal principal
    btnNuevaBodega.addEventListener('click', abrirModalNuevo);
    btnCancelar.addEventListener('click', cerrarModal);
    btnCerrarModal.addEventListener('click', cerrarModal);
    formBodega.addEventListener('submit', guardarBodega);
    
    // Modal eliminar
    btnCancelarEliminar.addEventListener('click', cerrarModalEliminar);
    btnCerrarModalEliminar.addEventListener('click', cerrarModalEliminar);
    btnConfirmarEliminar.addEventListener('click', confirmarEliminacion);
    
    // Búsqueda
    buscarBodega.addEventListener('input', filtrarBodegas);
    
    // Delegación de eventos para botones de acción
    listaBodegas.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const id = Number(btn.getAttribute('data-id'));
        if (Number.isNaN(id)) return;
        
        const action = btn.getAttribute('data-action');
        
        if (action === 'edit') {
            editarBodega(id);
        } else if (action === 'delete') {
            abrirModalEliminar(id);
        }
    });
    
    // Cerrar modales al hacer clic fuera
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            cerrarModal();
        }
    });
    
    modalEliminar.addEventListener('click', (e) => {
        if (e.target === modalEliminar) {
            cerrarModalEliminar();
        }
    });
}

// ==================== FUNCIONES DE API ====================

async function cargarBodegas() {
    try {
        const url = `${API_URL}?_=${Date.now()}`;
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();
        
        if (data.success) {
            bodegas = data.data;
            renderizarBodegas(bodegas);
            actualizarEstadisticas();
        } else {
            mostrarAlerta('Error al cargar bodegas: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión al cargar bodegas', 'error');
    }
}

async function crearBodega(datos) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datos)
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarAlerta(data.message || 'Bodega creada exitosamente', 'success');
            cargarBodegas();
            cerrarModal();
        } else {
            mostrarAlerta(data.error || 'Error al crear bodega', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión al crear bodega', 'error');
    }
}

async function actualizarBodega(id, datos) {
    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...datos, id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarAlerta(data.message || 'Bodega actualizada exitosamente', 'success');
            cargarBodegas();
            cerrarModal();
        } else {
            mostrarAlerta(data.error || 'Error al actualizar bodega', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión al actualizar bodega', 'error');
    }
}

async function eliminarBodega() {
    if (!bodegaParaEliminar) return;
    
    try {
        const response = await fetch(API_URL, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: bodegaParaEliminar.id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarAlerta(data.message || 'Bodega eliminada exitosamente', 'success');
            cerrarModalEliminar();
            cargarBodegas();
        } else {
            mostrarAlerta(data.error || 'Error al eliminar bodega', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión al eliminar bodega', 'error');
    }
}

// ==================== FUNCIONES DE UI ====================

function renderizarBodegas(bodegasArray) {
    if (bodegasArray.length === 0) {
        listaBodegas.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <h3>No hay bodegas registradas</h3>
                <p>Comienza creando tu primera bodega</p>
            </div>
        `;
        return;
    }
    
    listaBodegas.innerHTML = bodegasArray.map(bodega => `
        <div class="bodega-card">
            <div class="bodega-header">
                <div class="bodega-info">
                    <h3>${bodega.nombre}</h3>
                </div>
            </div>
            <div class="bodega-details">
                ${bodega.descripcion ? `
                    <div class="detail-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        <span>${bodega.descripcion}</span>
                    </div>
                ` : ''}
            </div>
            <div class="bodega-actions">
                <button type="button" class="btn-action btn-edit" data-action="edit" data-id="${bodega.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                </button>
                <button type="button" class="btn-action btn-delete" data-action="delete" data-id="${bodega.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

function actualizarEstadisticas() {
    const total = bodegas.length;
    document.getElementById('totalBodegas').textContent = total;
}

function filtrarBodegas() {
    const busqueda = buscarBodega.value.toLowerCase().trim();
    
    if (busqueda === '') {
        renderizarBodegas(bodegas);
        return;
    }
    
    const bodegasFiltradas = bodegas.filter(bodega => {
        return bodega.nombre.toLowerCase().includes(busqueda) ||
               (bodega.descripcion && bodega.descripcion.toLowerCase().includes(busqueda));
    });
    
    renderizarBodegas(bodegasFiltradas);
}

// ==================== MODAL PRINCIPAL ====================

function abrirModalNuevo() {
    bodegaEditando = null;
    modalTitle.textContent = 'Nueva Bodega';
    formBodega.reset();
    modalOverlay.classList.add('active');
    bodegaNombre.focus();
}

function editarBodega(id) {
    const bodega = bodegas.find(b => Number(b.id) === Number(id));
    if (!bodega) return;
    
    bodegaEditando = bodega;
    modalTitle.textContent = 'Editar Bodega';
    
    bodegaNombre.value = bodega.nombre || '';
    bodegaDescripcion.value = bodega.descripcion || '';
    
    modalOverlay.classList.add('active');
    bodegaNombre.focus();
}

function cerrarModal() {
    modalOverlay.classList.remove('active');
    formBodega.reset();
    bodegaEditando = null;
}

function guardarBodega(e) {
    e.preventDefault();
    
    const datos = {
        nombre: bodegaNombre.value.trim(),
        descripcion: bodegaDescripcion.value.trim()
    };
    
    // Validaciones
    if (!datos.nombre) {
        mostrarAlerta('El nombre es obligatorio', 'error');
        bodegaNombre.focus();
        return;
    }
    
    if (bodegaEditando) {
        actualizarBodega(bodegaEditando.id, datos);
    } else {
        crearBodega(datos);
    }
}

// ==================== MODAL ELIMINAR ====================

function abrirModalEliminar(id) {
    const bodega = bodegas.find(b => Number(b.id) === Number(id));
    if (!bodega) return;
    
    bodegaParaEliminar = bodega;
    bodegaNombreEliminar.textContent = bodega.nombre;
    modalEliminar.classList.add('active');
}

function cerrarModalEliminar() {
    modalEliminar.classList.remove('active');
    bodegaParaEliminar = null;
}

function confirmarEliminacion() {
    eliminarBodega();
}

// ==================== SISTEMA DE ALERTAS ====================

function mostrarAlerta(mensaje, tipo = 'success') {
    alertaNotificacion.textContent = mensaje;
    alertaNotificacion.className = `alerta-notificacion ${tipo} show`;
    
    setTimeout(() => {
        alertaNotificacion.classList.remove('show');
    }, 3000);
}